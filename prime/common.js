(function initFtPrime() {
  const WORKER_URL = "https://ftgames.tybridges44.workers.dev/prime";
  const STORAGE_KEY = "ftprime_session";
  const LOGIN_PAGE = "/prime/login.html";
  const SUBSCRIBE_PAGE = "/prime/subscribe.html";
  const PRIME_HOME = "/prime/index.html";

  function captureSessionFromHash() {
    if (!window.location.hash) return null;

    const params = new URLSearchParams(window.location.hash.slice(1));
    const session = params.get("session");

    if (!session) return null;

    localStorage.setItem(STORAGE_KEY, session);
    history.replaceState({}, "", window.location.pathname + window.location.search);
    return session;
  }

  function getSession() {
    return localStorage.getItem(STORAGE_KEY);
  }

  function clearSession() {
    localStorage.removeItem(STORAGE_KEY);
  }

  async function verifySession() {
    const session = getSession();

    if (!session) {
      return {
        ok: false,
        status: 401,
        data: { loggedIn: false, error: "no_session" },
      };
    }

    const res = await fetch(`${WORKER_URL}/verify`, {
      headers: { Authorization: `Bearer ${session}` },
    });

    let data = null;
    try {
      data = await res.json();
    } catch {
      data = { loggedIn: false, error: "invalid_response" };
    }

    return {
      ok: res.ok,
      status: res.status,
      data,
    };
  }

  async function logout() {
    const session = getSession();

    if (session) {
      try {
        await fetch(`${WORKER_URL}/logout`, {
          method: "POST",
          headers: { Authorization: `Bearer ${session}` },
        });
      } catch (error) {
        console.warn("Prime logout request failed:", error);
      }
    }

    clearSession();
    window.location.href = "/";
  }

  window.ftPrime = {
    WORKER_URL,
    LOGIN_PAGE,
    SUBSCRIBE_PAGE,
    PRIME_HOME,
    captureSessionFromHash,
    getSession,
    clearSession,
    verifySession,
    logout,
  };
})();
