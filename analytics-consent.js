/**
 * analytics-consent.js
 * Consent-based Google Analytics loader.
 * Drop <script src="analytics-consent.js"></script> before </body> on every page.
 * GA will NOT load until the user clicks "OK" in the consent banner.
 * Consent choice is persisted in localStorage so the banner only appears once.
 */
(function () {
  var GA_ID = 'G-TT0RD8XG0Y';
  var CONSENT_KEY = 'ga_consent';
  var CONSENT_TTL_MS = 14 * 24 * 60 * 60 * 1000; // 2 weeks

  function saveConsent(value) {
    var record = { value: value, expires: Date.now() + CONSENT_TTL_MS };
    localStorage.setItem(CONSENT_KEY, JSON.stringify(record));
  }

  function readConsent() {
    try {
      var raw = localStorage.getItem(CONSENT_KEY);
      if (!raw) return null;
      var record = JSON.parse(raw);
      if (Date.now() > record.expires) {
        localStorage.removeItem(CONSENT_KEY); // expired — re-prompt on next visit
        return null;
      }
      return record.value; // 'granted' or 'denied'
    } catch (e) {
      localStorage.removeItem(CONSENT_KEY);
      return null;
    }
  }

  /** Dynamically loads GA and initialises it. Called only after consent is given. */
  function enableAnalytics() {
    window.dataLayer = window.dataLayer || [];
    function gtag() { dataLayer.push(arguments); }
    window.gtag = gtag;
    gtag('js', new Date());
    gtag('config', GA_ID);

    var script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
    document.head.appendChild(script);
  }

  // Expose so the OK button can call it directly if needed from inline HTML.
  window.enableAnalytics = enableAnalytics;

  function hidePopup() {
    var popup = document.getElementById('ga-consent-popup');
    if (popup) popup.style.display = 'none';
  }

  function onAccept() {
    saveConsent('granted');
    hidePopup();
    enableAnalytics();
  }

  function onDecline() {
    saveConsent('denied');
    hidePopup();
  }

  function injectStyles() {
    var style = document.createElement('style');
    style.textContent = [
      '#ga-consent-popup {',
      '  position: fixed;',
      '  bottom: 0;',
      '  left: 0;',
      '  right: 0;',
      '  background: #1e1e2e;',
      '  color: #e0e0e0;',
      '  padding: 14px 24px;',
      '  display: flex;',
      '  align-items: center;',
      '  justify-content: space-between;',
      '  gap: 14px;',
      '  flex-wrap: wrap;',
      '  z-index: 999999;',
      '  font-family: Arial, sans-serif;',
      '  font-size: 14px;',
      '  box-shadow: 0 -2px 12px rgba(0,0,0,0.45);',
      '}',
      '#ga-consent-popup p {',
      '  margin: 0;',
      '  flex: 1;',
      '  min-width: 200px;',
      '  line-height: 1.5;',
      '}',
      '#ga-consent-popup .ga-consent-btns {',
      '  display: flex;',
      '  gap: 10px;',
      '  flex-shrink: 0;',
      '}',
      '#ga-consent-popup button {',
      '  padding: 8px 22px;',
      '  border: none;',
      '  border-radius: 6px;',
      '  cursor: pointer;',
      '  font-size: 14px;',
      '  font-weight: 600;',
      '}',
      '#ga-consent-accept {',
      '  background: #4a90e2;',
      '  color: #fff;',
      '}',
      '#ga-consent-accept:hover { background: #357abd; }',
      '#ga-consent-decline {',
      '  background: #444;',
      '  color: #ccc;',
      '}',
      '#ga-consent-decline:hover { background: #555; }'
    ].join('\n');
    document.head.appendChild(style);
  }

  function injectPopup() {
    injectStyles();

    var popup = document.createElement('div');
    popup.id = 'ga-consent-popup';
    popup.setAttribute('role', 'dialog');
    popup.setAttribute('aria-label', 'Analytics consent');

    var title = document.createElement('strong');
    title.textContent = 'We use analytics';
    title.style.display = 'block';
    title.style.marginBottom = '4px';

    var msg = document.createElement('p');
    msg.appendChild(title);
    msg.appendChild(document.createTextNode('We use analytics to track our website\'s performance and how much traffic we have. But we also acknowledge our Privacy Policy, so this is completely optional if you don\'t feel like opting in.'));

    var btnWrap = document.createElement('div');
    btnWrap.className = 'ga-consent-btns';

    var acceptBtn = document.createElement('button');
    acceptBtn.id = 'ga-consent-accept';
    acceptBtn.textContent = 'OK';
    acceptBtn.addEventListener('click', onAccept);

    var declineBtn = document.createElement('button');
    declineBtn.id = 'ga-consent-decline';
    declineBtn.textContent = 'Decline';
    declineBtn.addEventListener('click', onDecline);

    btnWrap.appendChild(acceptBtn);
    btnWrap.appendChild(declineBtn);
    popup.appendChild(msg);
    popup.appendChild(btnWrap);
    document.body.appendChild(popup);
  }

  function init() {
    var consent = readConsent();
    if (consent === 'granted') {
      enableAnalytics();       // returning visitor who already accepted
    } else if (consent === null) {
      injectPopup();           // first visit or expired — show banner
    }
    // consent === 'denied': do nothing, GA stays unloaded
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

/* Favorites quick-access sidebar for game pages */
(function () {
  var STORAGE_KEY = 'ftgames:favorites';
  var CATALOG_KEY = 'ftgames:gameCatalog';

  function getFavorites() {
    try {
      var parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      return Array.isArray(parsed) ? parsed.filter(function (id) { return typeof id === 'string'; }) : [];
    } catch (e) {
      return [];
    }
  }

  function getCatalog() {
    try {
      var parsed = JSON.parse(localStorage.getItem(CATALOG_KEY) || '{}');
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (e) {
      return {};
    }
  }

  function fallbackTitle(id) {
    return String(id || '')
      .replace(/^\//, '')
      .replace(/\/.*$/, '')
      .replace(/_/g, ' ')
      .replace(/-/g, ' ')
      .replace(/\b\w/g, function (letter) { return letter.toUpperCase(); });
  }

  function injectStyles() {
    if (document.getElementById('ft-favorites-sidebar-style')) return;
    var style = document.createElement('style');
    style.id = 'ft-favorites-sidebar-style';
    style.textContent = [
      '#ft-favorites-sidebar {',
      '  position: fixed; z-index: 2147483000; left: 12px; top: 64px; bottom: 12px;',
      '  width: 248px; max-height: calc(100vh - 76px); display: flex; flex-direction: column;',
      '  background: rgba(15, 15, 18, .96); border: 1px solid rgba(0, 229, 255, .35);',
      '  border-radius: 14px; color: #fff; font-family: Arial, sans-serif;',
      '  box-shadow: 0 14px 36px rgba(0,0,0,.45); backdrop-filter: blur(12px);',
      '  overflow: hidden; transition: width .25s ease, transform .25s ease;',
      '}',
      '#ft-favorites-sidebar.is-collapsed { width: 48px; }',
      '#ft-favorites-sidebar.is-collapsed .ft-favorites-list,',
      '#ft-favorites-sidebar.is-collapsed .ft-favorites-title { display: none; }',
      '.ft-favorites-header { min-height: 48px; display: flex; align-items: center;',
      '  justify-content: space-between; padding: 0 8px 0 12px; border-bottom: 1px solid rgba(255,255,255,.08); }',
      '.ft-favorites-title { font-size: 14px; font-weight: 800; letter-spacing: .2px; white-space: nowrap; }',
      '#ft-favorites-toggle { width: 34px; height: 34px; flex: 0 0 34px; border: 1px solid rgba(0,229,255,.45);',
      '  border-radius: 9px; background: rgba(0,229,255,.12); color: #fff; cursor: pointer; font-size: 16px; }',
      '.ft-favorites-list { display: flex; flex-direction: column; gap: 7px; padding: 8px; overflow-y: auto; }',
      '.ft-favorite-link { display: flex; align-items: center; gap: 9px; min-height: 54px; padding: 7px;',
      '  border: 1px solid rgba(255,255,255,.08); border-radius: 10px; color: #fff; text-decoration: none;',
      '  background: rgba(255,255,255,.04); transition: .18s ease; overflow: hidden; }',
      '.ft-favorite-link:hover { transform: translateX(2px); border-color: rgba(0,229,255,.55);',
      '  background: rgba(0,229,255,.11); }',
      '.ft-favorite-link.is-current { border-color: rgba(255,200,0,.65); background: rgba(255,200,0,.1); }',
      '.ft-favorite-thumb { width: 44px; height: 44px; flex: 0 0 44px; object-fit: cover; border-radius: 7px;',
      '  background: #24242b; }',
      '.ft-favorite-fallback { width: 44px; height: 44px; flex: 0 0 44px; display: grid; place-items: center;',
      '  border-radius: 7px; background: linear-gradient(135deg,#00aabf,#6941c6); font-size: 18px; }',
      '.ft-favorite-name { min-width: 0; font-size: 13px; font-weight: 700; line-height: 1.25; overflow: hidden;',
      '  text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }',
      '@media (max-width: 700px) {',
      '  #ft-favorites-sidebar { left: 8px; top: 58px; bottom: 8px; width: 210px; max-height: calc(100vh - 66px); }',
      '  #ft-favorites-sidebar.is-collapsed { width: 48px; }',
      '  .ft-favorite-thumb, .ft-favorite-fallback { width: 38px; height: 38px; flex-basis: 38px; }',
      '}'
    ].join('\n');
    document.head.appendChild(style);
  }

  function isGamePage() {
    var path = window.location.pathname.replace(/\/$/, '');
    if (!path || path === '/index' || path === '/games' || path === '/about' || path === '/404') return false;
    if (/^\/(instructions|rules|suggestion_box|sign_up|submit-registration|scriptview|prime)(\/|$)/.test(path)) return false;
    if (/\/(instructions|rules)$/.test(path)) return false;
    return true;
  }

  function render() {
    var sidebar = document.getElementById('ft-favorites-sidebar');
    var favorites = getFavorites();

    if (!isGamePage() || favorites.length === 0) {
      if (sidebar) sidebar.remove();
      return;
    }

    injectStyles();
    if (!sidebar) {
      sidebar = document.createElement('aside');
      sidebar.id = 'ft-favorites-sidebar';
      sidebar.setAttribute('aria-label', 'Favorite games');
      sidebar.innerHTML = '<div class="ft-favorites-header"><span class="ft-favorites-title">⭐ Favorites</span><button id="ft-favorites-toggle" type="button" aria-label="Collapse favorites" title="Collapse favorites">‹</button></div><nav class="ft-favorites-list"></nav>';
      document.body.appendChild(sidebar);

      var toggle = sidebar.querySelector('#ft-favorites-toggle');
      toggle.addEventListener('click', function () {
        var collapsed = sidebar.classList.toggle('is-collapsed');
        toggle.textContent = collapsed ? '›' : '‹';
        toggle.setAttribute('aria-label', collapsed ? 'Expand favorites' : 'Collapse favorites');
        toggle.title = collapsed ? 'Expand favorites' : 'Collapse favorites';
      });
    }

    var list = sidebar.querySelector('.ft-favorites-list');
    var catalog = getCatalog();
    var currentPath = window.location.pathname.replace(/\/$/, '');
    list.innerHTML = '';

    favorites.forEach(function (id) {
      var entry = catalog[id] || {};
      var title = entry.title || fallbackTitle(id);
      var link = document.createElement('a');
      link.className = 'ft-favorite-link';
      link.href = id;
      link.title = title;

      if (currentPath === id || currentPath === id.replace(/\/$/, '')) {
        link.className += ' is-current';
        link.setAttribute('aria-current', 'page');
      }

      if (entry.thumbnail) {
        var thumb = document.createElement('img');
        thumb.className = 'ft-favorite-thumb';
        thumb.src = entry.thumbnail;
        thumb.alt = '';
        link.appendChild(thumb);
      } else {
        var fallback = document.createElement('span');
        fallback.className = 'ft-favorite-fallback';
        fallback.setAttribute('aria-hidden', 'true');
        fallback.textContent = '★';
        link.appendChild(fallback);
      }

      var name = document.createElement('span');
      name.className = 'ft-favorite-name';
      name.textContent = title;
      link.appendChild(name);
      list.appendChild(link);
    });
  }

  function init() {
    render();
    window.addEventListener('storage', function (event) {
      if (event.key === STORAGE_KEY || event.key === CATALOG_KEY) render();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
