/**
 * FT Prime – Cloudflare Worker
 *
 * Required environment bindings (set in Cloudflare dashboard or wrangler.toml):
 *   DISCORD_CLIENT_ID     – your Discord application client ID
 *   DISCORD_CLIENT_SECRET – your Discord application client secret
 *   DISCORD_BOT_TOKEN     – bot token used to read guild membership
 *   DISCORD_GUILD_ID      – Discord server that contains the Prime role
 *   DISCORD_PRIME_ROLE_ID – role ID granted by the Ko-fi Discord integration
 *   SESSIONS              – KV namespace binding for session storage
 *
 * Endpoints:
 *   GET  /oauth/login     → redirect to Discord OAuth
 *   GET  /oauth/callback  → exchange Discord code for session, redirect to prime home
 *   GET  /verify    → validate session token, return user info + prime status
 *   POST /logout    → delete session from KV
 *
 * OAuth redirect URI architecture:
 *   Discord sends the authorization code to REDIRECT_URI (auth.html).
 *   auth.html verifies the CSRF state token, then forwards the code to this
 *   worker's /oauth/callback endpoint.  The REDIRECT_URI constant below is used
 *   only in the token-exchange POST body — Discord requires it to exactly
 *   match the URI used in the original authorization request.
 *
 * Prime access:
 *   Prime is granted when the authenticated Discord account is a member of the
 *   configured guild and has the configured Prime role. Ko-fi is expected to
 *   manage that role assignment.
 */

const DISCORD_API    = "https://discord.com/api/v10";
const REDIRECT_URI   = "https://ftgames.xyz/prime/auth.html";
const PRIME_HOME     = "https://ftgames.xyz/prime/index.html";
const LOGIN_PAGE     = "https://ftgames.xyz/prime/login.html";
const SUBSCRIBE_PAGE = "https://ftgames.xyz/prime/subscribe.html";
const ALLOWED_ORIGIN = "https://ftgames.xyz";
const STATE_COOKIE   = "ftprime_oauth_state";

// ── Helpers ──────────────────────────────────────────────────────────────────

function corsHeaders(origin) {
  const allow = origin === ALLOWED_ORIGIN ? origin : ALLOWED_ORIGIN;
  return {
    "Access-Control-Allow-Origin":  allow,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
  };
}

function jsonResponse(data, status = 200, origin = "") {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders(origin),
    },
  });
}

function generateSessionId() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Extract a session token from an Authorization header (with or without "Bearer " prefix). */
function extractToken(authHeader = "") {
  return authHeader.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : authHeader.trim();
}

function normalizePathname(pathname) {
  if (pathname === "/prime") return "/";
  if (pathname.startsWith("/prime/")) return pathname.slice("/prime".length);
  return pathname;
}

function readCookie(cookieHeader = "", name) {
  const needle = `${name}=`;
  const cookie = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(needle));

  if (!cookie) return "";

  try {
    return decodeURIComponent(cookie.slice(needle.length));
  } catch {
    return "";
  }
}

function redirectWithCookieClear(target, status = 302) {
  return new Response(null, {
    status,
    headers: {
      Location: target,
      "Set-Cookie": `${STATE_COOKIE}=; Path=/prime; Max-Age=0; HttpOnly; Secure; SameSite=Strict`,
    },
  });
}

function isValidOAuthState(state = "") {
  // login.html creates 16 random bytes and hex-encodes them into 32 chars.
  return /^[a-f0-9]{32}$/.test(state);
}

async function fetchPrimeMember(userId, env) {
  if (!env.DISCORD_BOT_TOKEN || !env.DISCORD_GUILD_ID || !env.DISCORD_PRIME_ROLE_ID) {
    throw new Error("Missing Discord Prime role bindings");
  }

  const memberRes = await fetch(
    `${DISCORD_API}/guilds/${env.DISCORD_GUILD_ID}/members/${userId}`,
    {
      headers: {
        Authorization: `Bot ${env.DISCORD_BOT_TOKEN}`,
      },
    }
  );

  if (memberRes.status === 404) {
    return null;
  }

  if (!memberRes.ok) {
    throw new Error(`Guild member lookup failed with status ${memberRes.status}`);
  }

  return memberRes.json();
}

async function checkPrimeRole(userId, env) {
  const member = await fetchPrimeMember(userId, env);

  if (!member || !Array.isArray(member.roles)) {
    return false;
  }

  return member.roles.includes(env.DISCORD_PRIME_ROLE_ID);
}

// ── Route handlers ────────────────────────────────────────────────────────────

/** GET /oauth/login?state=…  – set state cookie and redirect to Discord OAuth. */
function handleLogin(request, env) {
  const url = new URL(request.url);
  const state = url.searchParams.get("state") || "";

  if (!isValidOAuthState(state)) {
    return Response.redirect(`${LOGIN_PAGE}?error=oauth_state`, 302);
  }

  const params = new URLSearchParams({
    client_id:     env.DISCORD_CLIENT_ID,
    response_type: "code",
    redirect_uri:  REDIRECT_URI,
    scope:         "identify",
    state,
  });
  return new Response(null, {
    status: 302,
    headers: {
      Location: `https://discord.com/oauth2/authorize?${params}`,
      "Set-Cookie": `${STATE_COOKIE}=${encodeURIComponent(state)}; Path=/prime/oauth; Max-Age=600; HttpOnly; Secure; SameSite=Strict`,
    },
  });
}

/** GET /oauth/callback?code=…  – exchange code → access token → user → session. */
async function handleCallback(request, env) {
  const url   = new URL(request.url);
  const code  = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  const cookieState = readCookie(request.headers.get("Cookie") || "", STATE_COOKIE);

  if (error || !code) {
    return redirectWithCookieClear(`${LOGIN_PAGE}?error=oauth_denied`, 302);
  }
  if (!state || !cookieState || state !== cookieState) {
    return redirectWithCookieClear(`${LOGIN_PAGE}?error=oauth_state`, 302);
  }

  // 1. Exchange authorization code for Discord access token
  const tokenRes = await fetch(`${DISCORD_API}/oauth2/token`, {
    method:  "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body:    new URLSearchParams({
      client_id:     env.DISCORD_CLIENT_ID,
      client_secret: env.DISCORD_CLIENT_SECRET,
      grant_type:    "authorization_code",
      code,
      redirect_uri:  REDIRECT_URI,
    }),
  });

  if (!tokenRes.ok) {
    console.error("Token exchange failed:", await tokenRes.text());
    return redirectWithCookieClear(`${LOGIN_PAGE}?error=token_exchange`, 302);
  }

  const tokens      = await tokenRes.json();
  const accessToken = tokens.access_token;

  // 2. Fetch Discord user profile
  const userRes = await fetch(`${DISCORD_API}/users/@me`, {
    headers: { Authorization: "Bearer " + accessToken },
  });

  if (!userRes.ok) {
    console.error("User fetch failed:", await userRes.text());
    return redirectWithCookieClear(`${LOGIN_PAGE}?error=user_fetch`, 302);
  }

  const user = await userRes.json();

  // 3. Determine prime status from the subscriber Discord role.
  let isPrime = false;
  try {
    isPrime = await checkPrimeRole(user.id, env);
  } catch (error) {
    console.error("Prime role lookup failed:", error);
    return redirectWithCookieClear(`${LOGIN_PAGE}?error=role_check`, 302);
  }

  // 4. Create a secure random session and persist it (7-day TTL)
  const sessionId   = generateSessionId();
  const sessionData = JSON.stringify({
    userId:    user.id,
    username:  user.username,
    avatar:    user.avatar,
    createdAt: Date.now(),
  });

  await env.SESSIONS.put(`session:${sessionId}`, sessionData, {
    expirationTtl: 604800, // 7 days in seconds
  });

  // 5. Send the session token to the client via a redirect.
  //    We use a URL fragment (#session=…) instead of a query string (?session=…)
  //    because fragments are never sent over the network — they are processed
  //    entirely by the browser.  This means the token never appears in server
  //    access logs or Cloudflare request logs.
  //    index.html reads location.hash, stores the token in localStorage, then
  //    strips the fragment from the address bar with history.replaceState.
  const redirectTarget = isPrime
    ? `${PRIME_HOME}#session=${sessionId}`
    : `${SUBSCRIBE_PAGE}?status=not_subscribed#session=${sessionId}`;

  return redirectWithCookieClear(redirectTarget, 302);
}

/** GET /verify  – validate session and return user info. */
async function handleVerify(request, env) {
  const origin    = request.headers.get("Origin") || "";
  const sessionId = extractToken(
    request.headers.get("Authorization") || ""
  );

  if (!sessionId) {
    return jsonResponse(
      { loggedIn: false, error: "No session token provided" },
      401,
      origin
    );
  }

  const raw = await env.SESSIONS.get(`session:${sessionId}`);

  if (!raw) {
    return jsonResponse(
      { loggedIn: false, error: "Session not found or expired" },
      401,
      origin
    );
  }

  let session;
  try {
    session = JSON.parse(raw);
  } catch {
    return jsonResponse(
      { loggedIn: false, error: "Corrupt session data" },
      500,
      origin
    );
  }

  let isPrime = false;
  try {
    isPrime = await checkPrimeRole(session.userId, env);
  } catch (error) {
    console.error("Prime role re-check failed:", error);
    return jsonResponse(
      { loggedIn: true, error: "role_check_failed" },
      503,
      origin
    );
  }

  return jsonResponse(
    {
      loggedIn:  true,
      prime:     isPrime,
      userId:    session.userId,
      username:  session.username,
      avatar:    session.avatar,
    },
    200,
    origin
  );
}

/** POST /logout  – delete session from KV. */
async function handleLogout(request, env) {
  const origin    = request.headers.get("Origin") || "";
  const sessionId = extractToken(
    request.headers.get("Authorization") || ""
  );

  if (sessionId) {
    try {
      await env.SESSIONS.delete(`session:${sessionId}`);
    } catch {
      /* best-effort */
    }
  }

  return jsonResponse({ ok: true }, 200, origin);
}

// ── Entry point ───────────────────────────────────────────────────────────────

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const { pathname } = url;
    const routePath = normalizePathname(pathname);
    const origin = request.headers.get("Origin") || "";
    const hasCode = url.searchParams.has("code");
    const hasState = url.searchParams.has("state");
    const state = url.searchParams.get("state") || "";
    const isOAuthCallbackRequest = request.method === "GET" && hasCode && isValidOAuthState(state);

    // Global CORS pre-flight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status:  204,
        headers: corsHeaders(origin),
      });
    }

    // /oauth/* avoids collisions with static asset paths when using worker assets.
    if (routePath === "/oauth/callback") {
      return handleCallback(request, env);
    }
    if (routePath === "/oauth/login" && request.method === "GET" && hasState) {
      return handleLogin(request, env);
    }

    // Legacy routes retained for backward compatibility.
    if (routePath === "/callback" || (routePath === "/" && isOAuthCallbackRequest)) {
      return handleCallback(request, env);
    }
    if (request.method === "GET" && hasState && routePath === "/login") {
      return handleLogin(request, env);
    }
    if (routePath === "/" || routePath === "/login") return Response.redirect(LOGIN_PAGE, 302);
    if (routePath === "/verify") return handleVerify(request, env);
    if (routePath === "/logout") return handleLogout(request, env);

    return new Response("Not Found", { status: 404 });
  },
};
