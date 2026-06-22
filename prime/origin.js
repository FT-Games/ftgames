(function enforcePrimeOrigin() {
  const canonicalOrigin = "https://ftgames.xyz";
  const isLocalHost = ["localhost", "127.0.0.1"].includes(window.location.hostname);

  if (!isLocalHost && window.location.origin !== canonicalOrigin) {
    window.location.replace(canonicalOrigin + window.location.pathname + window.location.search + window.location.hash);
  }
})();
