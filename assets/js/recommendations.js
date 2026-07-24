(function () {
  // Config
  const STORAGE_KEY = 'ftgames:recommendationPrefs';
  const MAX_RECOMMENDATIONS = 6;
  const SUGGESTION_BOX_ID = 'suggestion_box';
  const GAME_GRID_SELECTOR = '.game-card-grid[aria-label="Games"]';
  const RECOMMENDED_LINK_SELECTOR = '#recommended-list .recommended-link';

  function normalizeGameId(href) {
    let id = String(href || '').replace(/^https?:\/\//, '');
    id = id.replace(/[^a-zA-Z0-9_\/-]/g, '');
    id = id.replace(/^\//, '');
    return id;
  }

  function isTrackableGame(id) {
    return id && id !== SUGGESTION_BOX_ID;
  }

  function parseGenre(text) {
    const cleaned = String(text || '').trim();
    if (!cleaned) return '';
    const match = cleaned.match(/:\s*(.*)/);
    return match ? match[1].trim().toLowerCase() : cleaned.toLowerCase();
  }

  function sanitizeCountMap(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    const result = {};
    Object.entries(value).forEach(([key, count]) => {
      if (typeof key !== 'string') return;
      const normalized = Math.max(0, Number(count) || 0);
      if (!normalized) return;
      result[key] = normalized;
    });
    return result;
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
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return { counts: {}, genres: {} };
      }
      return {
        counts: sanitizeCountMap(parsed.counts),
        genres: sanitizeCountMap(parsed.genres)
      };
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
    const grid = document.querySelector(GAME_GRID_SELECTOR);
    if (!grid) return [];
    const nodes = grid.querySelectorAll('a.game-card[href]');
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
        genre = parseGenre(genreEl.textContent);
      }

      return { id: id || href, url: href, title: title, genre: genre };
    }).filter(game => isTrackableGame(game.id));

    return games;
  }

  // Update preferences when a game is clicked
  function handleGameClick(e) {
    if (!(e.target instanceof Element)) return;
    if (e.target.closest('.fav-star')) return;

    let href = '';
    let genre = '';
    const card = e.target.closest(`${GAME_GRID_SELECTOR} .game-card`);
    if (card) {
      href = card.getAttribute('href') || card.dataset.gameId || '';
      const genreEl = card.querySelector('.game-tag-genre');
      if (genreEl) {
        genre = parseGenre(genreEl.textContent);
      }
    } else {
      const recommendedLink = e.target.closest(RECOMMENDED_LINK_SELECTOR);
      if (!recommendedLink) return;
      href = recommendedLink.getAttribute('href') || '';
      const allGames = getAllGames();
      const idFromHref = normalizeGameId(href);
      const match = allGames.find(game => game.id === idFromHref || game.url === href);
      genre = match ? match.genre : '';
    }

    const prefs = readPrefs();
    const id = normalizeGameId(href);
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
        if (seen.has(g.id)) continue;
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
    const recSection = document.getElementById('recommendations') || createRecommendationsSection();
    const container = recSection.querySelector('#recommended-list');
    if (!container) return;

    const recs = buildRecommendations();
    container.innerHTML = '';
    if (!recs.length) {
      const empty = document.createElement('li');
      empty.className = 'recommended-empty-message';
      empty.textContent = 'No recommendations yet — play some games to get personalized suggestions!';
      container.appendChild(empty);
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
    section.setAttribute('aria-label', 'Personalized game recommendations');
    section.innerHTML = `\n      <h2>Recommended for you</h2>\n      <ul id="recommended-list" class="recommended-list"></ul>\n    `;

    // Insert after favorites-section if present, otherwise prepend to page-container.
    const fav = document.querySelector('.favorites-section');
    if (fav && fav.parentNode) {
      fav.parentNode.insertBefore(section, fav.nextSibling);
    } else {
      const container = document.querySelector('.page-container') || document.body;
      container.insertBefore(section, container.firstChild);
    }

    return section;
  }

  function init() {
    // Delegate clicks on anchors to capture counts
    document.addEventListener('click', handleGameClick, true);

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', renderRecommendations);
    } else {
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
