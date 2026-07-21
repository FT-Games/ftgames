(function () {
  // Config
  const STORAGE_KEY = 'ftgames:recommendationPrefs';
  const MAX_RECOMMENDATIONS = 6;
  const SUGGESTION_BOX_ID = 'suggestion_box';

  function normalizeGameId(href) {
    let id = String(href || '').replace(/^https?:\/\//, '');
    id = id.replace(/[^a-zA-Z0-9_\/-]/g, '');
    id = id.replace(/^\//, '');
    return id;
  }

  function isTrackableGame(id) {
    return id && id !== SUGGESTION_BOX_ID;
  }

  function readPrefs() {
    let raw = null;
    try {
      raw = localStorage.getItem(STORAGE_KEY);
    } catch (e) {
      return { counts: {}, genres: {} };
    }
    if (!raw) return { counts: {}, genres: {} };
    try {
      return JSON.parse(raw);
    } catch (e) {
      // Corrupt stored data; reset
      return { counts: {}, genres: {} };
    }
  }

  function savePrefs(prefs) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    } catch (e) {
      console.warn('Could not save recommendation preferences', e);
    }
  }

  // Collect all game items on the page
  function getAllGames() {
    // The site uses <a class="game-card" href="/some_path"> with nested h2.game-card-title
    // and a <span class="game-tag game-tag-genre"> containing text like "Genre: Platformer".
    const nodes = document.querySelectorAll('a.game-card[href]');
    const games = Array.from(nodes).map(node => {
      const href = node.getAttribute('href') || '#';
      const id = normalizeGameId(href);
      // title
      const titleEl = node.querySelector('.game-card-title') || node.querySelector('h2') || node.querySelector('h3');
      const title = titleEl ? titleEl.textContent.trim() : id || href;
      // genre: try .game-tag-genre text content like "Genre: Platformer"
      let genre = '';
      const genreEl = node.querySelector('.game-tag-genre');
      if (genreEl) {
        const txt = genreEl.textContent || '';
        const m = txt.match(/:\s*(.*)/);
        genre = m ? m[1].trim().toLowerCase() : txt.trim().toLowerCase();
      }

      return { id: id || href, url: href, title: title, genre: genre };
    }).filter(game => isTrackableGame(game.id));

    return games;
  }

  // Update preferences when a game is clicked
  function handleGameClick(e) {
    // clicks on anchors are enough; look for a.closest('.game-card')
    const card = e.target.closest && e.target.closest('.game-card');
    if (!card) return;
    const prefs = readPrefs();
    const href = card.getAttribute('href') || card.dataset.gameId || '';
    const id = normalizeGameId(href);
    let genre = '';
    const genreEl = card.querySelector('.game-tag-genre');
    if (genreEl) {
      const txt = genreEl.textContent || '';
      const m = txt.match(/:\s*(.*)/);
      genre = m ? m[1].trim().toLowerCase() : txt.trim().toLowerCase();
    }

    if (!isTrackableGame(id)) return;

    prefs.counts = prefs.counts || {};
    prefs.genres = prefs.genres || {};

    prefs.counts[id] = (prefs.counts[id] || 0) + 1;
    if (genre) prefs.genres[genre] = (prefs.genres[genre] || 0) + 1;

    // Prevent storage bloat: keep only the most-clicked items
    const MAX_STORED_GAMES = 50;
    const topCounts = Object.entries(prefs.counts)
      .sort((a, b) => (b[1] || 0) - (a[1] || 0))
      .slice(0, MAX_STORED_GAMES);
    prefs.counts = topCounts.reduce((acc, [k, v]) => { acc[k] = v; return acc; }, {});

    const MAX_STORED_GENRES = 20;
    const topGenres = Object.entries(prefs.genres)
      .sort((a, b) => (b[1] || 0) - (a[1] || 0))
      .slice(0, MAX_STORED_GENRES);
    prefs.genres = topGenres.reduce((acc, [k, v]) => { acc[k] = v; return acc; }, {});

    savePrefs(prefs);
    // live update
    renderRecommendations();
  }

  // Build recommendation list
  function buildRecommendations() {
    const games = getAllGames();
    const prefs = readPrefs();
    const counts = prefs.counts || {};
    const genresWeight = prefs.genres || {};

    const byId = {};
    games.forEach(g => byId[g.id] = g);

    const clickedGames = Object.keys(counts).filter(id => byId[id]).sort((a, b) => (counts[b] || 0) - (counts[a] || 0));

    const recommended = [];
    const seen = new Set();

    for (const id of clickedGames) {
      if (recommended.length >= MAX_RECOMMENDATIONS) break;
      recommended.push({ reason: 'Because you played it before', game: byId[id] });
      seen.add(id);
    }

    const genreOrder = Object.keys(genresWeight).sort((a, b) => (genresWeight[b] || 0) - (genresWeight[a] || 0));

    for (const genre of genreOrder) {
      if (recommended.length >= MAX_RECOMMENDATIONS) break;
      const sameGenre = games.filter(g => (g.genre || '') === genre && !seen.has(g.id));
      for (const g of sameGenre) {
        if (recommended.length >= MAX_RECOMMENDATIONS) break;
        recommended.push({ reason: `Because you like ${genre}`, game: g });
        seen.add(g.id);
      }
    }

    if (recommended.length < MAX_RECOMMENDATIONS) {
      const otherGames = games.filter(g => !seen.has(g.id));
      for (const g of otherGames) {
        if (recommended.length >= MAX_RECOMMENDATIONS) break;
        recommended.push({ reason: 'More games to explore', game: g });
        seen.add(g.id);
      }
    }

    return recommended;
  }

  // Render into #recommended-list or create the section dynamically
  function renderRecommendations() {
    let container = document.getElementById('recommended-list');
    if (!container) {
      const recSection = document.getElementById('recommendations') || createRecommendationsSection();
      container = recSection.querySelector('#recommended-list');
    }
    if (!container) return;

    const recs = buildRecommendations();
    container.innerHTML = '';
    if (!recs.length) {
      container.innerHTML = '<li>No recommendations yet — play some games to get personalized suggestions!</li>';
      return;
    }

    for (const r of recs) {
      const li = document.createElement('li');
      li.className = 'recommended-item';
      const a = document.createElement('a');
      a.href = r.game.url;
      a.textContent = r.game.title;
      a.className = 'recommended-link';
      const reason = document.createElement('div');
      reason.className = 'recommended-reason';
      reason.textContent = r.reason;
      li.appendChild(a);
      li.appendChild(reason);
      container.appendChild(li);
    }
  }

  function createRecommendationsSection() {
    const section = document.createElement('section');
    section.id = 'recommendations';
    section.className = 'recommendations-section';
    section.innerHTML = `\n      <h2>Recommended for you</h2>\n      <ul id="recommended-list" class="recommended-list"></ul>\n    `;

    // Insert after favorites-section if present, otherwise prepend to page-container
    const fav = document.querySelector('.favorites-section');
    if (fav && fav.parentNode) {
      fav.parentNode.insertBefore(section, fav.nextSibling);
    } else {
      const container = document.querySelector('.page-container') || document.body;
      container.insertBefore(section, container.firstChild);
    }

    // minimal styles for the list
    const style = document.createElement('style');
    style.textContent = '\n.recommendations-section { margin-top: 24px; padding: 18px; border-radius: 12px; background: rgba(255,255,255,0.6); border: 1px solid rgba(0,0,0,0.06); }\n.recommendations-section h2 { margin: 0 0 10px 0; }\n.recommended-list { list-style: none; padding: 0; margin: 0; display: grid; grid-template-columns: repeat(auto-fit,minmax(200px,1fr)); gap: 12px; }\n.recommended-item { padding: 12px; border-radius: 12px; background: rgba(255,255,255,0.9); }\n.recommended-link { font-weight:700; color: inherit; text-decoration: none; }\n.recommended-reason { font-size: 12px; opacity: 0.8; margin-top: 6px; }\n';
    document.head.appendChild(style);

    return section;
  }

  function init() {
    // Delegate clicks on anchors to capture counts
    document.addEventListener('click', handleGameClick, true);

    // Render on DOMContentLoaded
    document.addEventListener('DOMContentLoaded', function () {
      renderRecommendations();
    });

    // If already loaded
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
      renderRecommendations();
    }
  }

  window.FTGamesRecs = {
    readPrefs,
    savePrefs,
    resetPrefs: function () {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch (e) {
        // ignore
      }
      renderRecommendations();
    },
    renderRecommendations
  };

  init();
})();
