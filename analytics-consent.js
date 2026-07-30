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
