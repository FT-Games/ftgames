/**
 * FT Prime – Cloudflare Worker
 *
 * Required environment bindings (set in Cloudflare dashboard or wrangler.toml):
 *   DISCORD_CLIENT_ID     – your Discord application client ID
 *   DISCORD_CLIENT_SECRET – your Discord application client secret
 *   SESSIONS              – KV namespace binding for session storage
 *
 * Endpoints:
 *   GET  /login     → redirect to Discord OAuth
 *   GET  /callback  → exchange Discord code for session, redirect to prime home
 *   GET  /verify    → validate session token, return user info + prime status
 *   POST /logout    → delete session from KV
 */

const DISCORD_API    = "https://discord.com/api/v10";
const REDIRECT_URI   = "https://ftgames.xyz/prime/auth.html";
const PRIME_HOME     = "https://ftgames.xyz/prime/index.html";
const LOGIN_PAGE     = "https://ftgames.xyz/prime/login.html";
const ALLOWED_ORIGIN = "https://ftgames.xyz";

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

// ── Route handlers ────────────────────────────────────────────────────────────

/** GET /login  – redirect straight to Discord OAuth (server-driven flow). */
function handleLogin(env) {
  const params = new URLSearchParams({
    client_id:     env.DISCORD_CLIENT_ID,
    response_type: "code",
    redirect_uri:  REDIRECT_URI,
    scope:         "identify",
  });
  return Response.redirect(
    `https://discord.com/oauth2/authorize?${params}`,
    302
  );
}

/** GET /callback?code=…  – exchange code → access token → user → session. */
async function handleCallback(request, env) {
  const url   = new URL(request.url);
  const code  = url.searchParams.get("code");
  const error = url.searchParams.get("error");

  if (error || !code) {
    return Response.redirect(`${LOGIN_PAGE}?error=oauth_denied`, 302);
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
    return Response.redirect(`${LOGIN_PAGE}?error=token_exchange`, 302);
  }

  const tokens      = await tokenRes.json();
  const accessToken = tokens.access_token;

  // 2. Fetch Discord user profile
  const userRes = await fetch(`${DISCORD_API}/users/@me`, {
    headers: { Authorization: "Bearer " + accessToken },
  });

  if (!userRes.ok) {
    console.error("User fetch failed:", await userRes.text());
    return Response.redirect(`${LOGIN_PAGE}?error=user_fetch`, 302);
  }

  const user = await userRes.json();

  // 3. Determine prime status
  //    By default every authenticated user is prime.
  //    To restrict access, set a KV key  prime:<userId>  to "false".
  let isPrime = true;
  try {
    const override = await env.SESSIONS.get(`prime:${user.id}`);
    if (override !== null) isPrime = override === "true";
  } catch {
    /* KV unavailable – keep default */
  }

  // 4. Create a secure random session and persist it (7-day TTL)
  const sessionId   = generateSessionId();
  const sessionData = JSON.stringify({
    userId:    user.id,
    username:  user.username,
    avatar:    user.avatar,
    prime:     isPrime,
    createdAt: Date.now(),
  });

  await env.SESSIONS.put(`session:${sessionId}`, sessionData, {
    expirationTtl: 604800, // 7 days in seconds
  });

  // 5. Send the session token to the client via a redirect
  //    index.html reads ?session= from the URL, stores it in localStorage,
  //    then strips it from the address bar immediately.
  return Response.redirect(`${PRIME_HOME}?session=${sessionId}`, 302);
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

  return jsonResponse(
    {
      loggedIn:  true,
      prime:     session.prime,
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
    const { pathname } = new URL(request.url);
    const origin       = request.headers.get("Origin") || "";

    // Global CORS pre-flight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status:  204,
        headers: corsHeaders(origin),
      });
    }

    if (pathname === "/login")    return handleLogin(env);
    if (pathname === "/callback") return handleCallback(request, env);
    if (pathname === "/verify")   return handleVerify(request, env);
    if (pathname === "/logout")   return handleLogout(request, env);

    return new Response("Not Found", { status: 404 });
  },
};
