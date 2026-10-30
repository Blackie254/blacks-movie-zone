/* ===== FreeFlixx T — entertainment and sports hub ===== */

const API = '/proxy';
const SEO_SITE = 'FreeFlixx T';
const SEO_DEFAULT_DESC = 'Explore movies, series, live TV, football scores, fixtures and sports news on FreeFlixx T.';

// ===== SEO =====
function updateSEO({ title, description, url, image } = {}) {
  const fullTitle = title ? `${title} — ${SEO_SITE}` : `${SEO_SITE} — Free Movies, TV Shows & Live TV`;
  const desc = description ? description.slice(0, 160) : SEO_DEFAULT_DESC;
  const canonUrl = url || (location.origin + location.pathname + location.search);
  document.title = fullTitle;
  _setMetaName('description', desc);
  _setMetaId('ogTitle', fullTitle);
  _setMetaId('ogDesc', desc);
  _setMetaId('ogUrl', canonUrl);
  _setMetaId('twTitle', fullTitle);
  _setMetaId('twDesc', desc);
  const canonical = document.getElementById('canonicalTag');
  if (canonical) canonical.setAttribute('href', canonUrl);
  if (image) { _setMetaProp('og:image', image); _setMetaId('twImage', image); }
}
function _setMetaName(name, content) { const el = document.querySelector(`meta[name="${name}"]`); if (el) el.setAttribute('content', content); }
function _setMetaProp(prop, content) { const el = document.querySelector(`meta[property="${prop}"]`); if (el) el.setAttribute('content', content); }
function _setMetaId(id, content) { const el = document.getElementById(id); if (el) el.setAttribute('content', content); }

let currentPath = '';
let heroSlideIndex = 0;
let heroItems = [];
let heroTimer = null;

const GENRES = ['Action','Adventure','Animation','Comedy','Crime','Documentary','Drama','Fantasy','Horror','Mystery','Romance','Sci-Fi','Thriller','Western'];
const COUNTRIES = ['United States','United Kingdom','South Korea','Japan','India','France','China','Germany','Spain','Italy','Australia','Nigeria','Mexico','Canada'];

// ===== ROUTER =====
function router() {
  const path = location.pathname + location.search;
  if (path === currentPath) return;
  currentPath = path;
  highlightNav();
  clearHeroTimer();
  window.scrollTo({ top: 0, behavior: 'instant' });
  const parts = location.pathname.split('/').filter(Boolean);
  const page = parts[0] || 'home';
  const id = parts[1];
  if (page === 'player-test') return renderPlayerTest();
  if (page === 'detail' && id) return renderDetail(id);
  if (page === 'staff' && id) return renderStaff(id);
  if (page === 'search') return renderSearch(new URLSearchParams(location.search).get('q') || '');
  if (page === 'movies') return renderBrowse(1);
  if (page === 'shows' || page === 'series') return renderShows();
  if (page === 'trending') return renderTrending();
  if (page === 'browse') return renderBrowse(0);
  if (page === 'live') return renderLive();
  if (page === 'sports') return renderSports();
  if (page === 'new') return renderNewArrivals();
  return renderHome();
}

function navigate(path) {
  if (location.pathname + location.search === path) return;
  history.pushState({}, '', path);
  router();
}
window.addEventListener('popstate', router);
window.navigate = navigate;

function highlightNav() {
  const rawPage = location.pathname.split('/')[1] || 'home';
  const page = rawPage === 'shows' ? 'series' : rawPage;
  document.querySelectorAll('.nav-link').forEach(l => l.classList.toggle('active', l.dataset.page === page));
}
function clearHeroTimer() { clearInterval(heroTimer); heroTimer = null; }

// ===== FETCH with cache =====
const apiCache = new Map();
const API_CACHE_TTL = 3 * 60 * 1000;

async function api(endpoint, params = {}) {
  const q = new URLSearchParams(params).toString();
  const url = `${API}/${endpoint}${q ? '?' + q : ''}`;
  const cached = apiCache.get(url);
  if (cached && Date.now() - cached.ts < API_CACHE_TTL) return cached.data;
  try {
    const r = await fetch(url);
    const data = await r.json();
    if (data) apiCache.set(url, { data, ts: Date.now() });
    return data;
  } catch { return { success: false }; }
}

// ===== APP =====
const app = document.getElementById('app');
function setApp(html) {
  app.classList.remove('page-enter');
  app.innerHTML = html;
  void app.offsetWidth;
  app.classList.add('page-enter');
}

// ===== TOAST =====
window.toast = function(msg, type = 'info') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = `toast show ${type}`;
  clearTimeout(el._t);
  el._t = setTimeout(() => el.className = 'toast', 3200);
};

// ===== NAVBAR =====
window.addEventListener('scroll', () => {
  document.getElementById('navbar').classList.toggle('scrolled', scrollY > 50);
});

// ===== MOBILE MENU =====
const hamburger = document.getElementById('hamburger');
const mobileMenu = document.getElementById('mobileMenu');
hamburger?.addEventListener('click', () => mobileMenu.classList.toggle('open'));
document.addEventListener('click', e => {
  if (!e.target.closest('#hamburger') && !e.target.closest('#mobileMenu')) {
    mobileMenu?.classList.remove('open');
  }
});

// ===== SEARCH =====
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const suggestBox = document.getElementById('searchSuggestions');
let suggestTimer = null;

searchInput.addEventListener('input', () => {
  const q = searchInput.value.trim();
  clearTimeout(suggestTimer);
  if (!q) { suggestBox.classList.remove('show'); return; }
  suggestTimer = setTimeout(() => fetchSuggestions(q), 280);
});
searchInput.addEventListener('keydown', e => { if (e.key === 'Enter' && searchInput.value.trim()) doSearch(searchInput.value.trim()); });
searchBtn.addEventListener('click', () => { if (searchInput.value.trim()) doSearch(searchInput.value.trim()); });
document.addEventListener('click', e => { if (!e.target.closest('#searchWrap')) suggestBox.classList.remove('show'); });
document.addEventListener('keydown', e => { if (e.key === '/' && document.activeElement !== searchInput) { e.preventDefault(); searchInput.focus(); } });

async function fetchSuggestions(q) {
  const data = await api('search/suggest', { keyword: q });
  const items = data?.data?.subjectList?.slice(0, 7) || [];
  if (!items.length) { suggestBox.classList.remove('show'); return; }
  suggestBox.innerHTML = items.map(m => `
    <div class="suggest-item" onclick="goDetail('${m.subjectId}')">
      <img src="${m.cover?.url || ''}" alt="" onerror="this.style.display='none'" loading="lazy" />
      <div class="suggest-item-info">
        <div class="suggest-item-title">${esc(m.title)}</div>
        <div class="suggest-item-meta">${m.subjectType === 2 ? 'TV Show' : 'Movie'} · ${m.releaseDate?.slice(0,4) || ''}</div>
      </div>
    </div>`).join('');
  suggestBox.classList.add('show');
}

function doSearch(q) { suggestBox.classList.remove('show'); searchInput.value = ''; navigate(`/search?q=${encodeURIComponent(q)}`); }
window.goDetail = id => { suggestBox.classList.remove('show'); navigate(`/detail/${id}`); };

// ===== HELPERS =====
function esc(s) { return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

function ratingColor(r) {
  const n = parseFloat(r);
  if (n >= 8) return 'var(--green)';
  if (n >= 6) return 'var(--gold)';
  return 'var(--text3)';
}

function cardBadge(item) {
  const isNew = item.releaseDate && new Date(item.releaseDate) > new Date(Date.now() - 90 * 86400000);
  if (isNew) return `<span class="card-badge badge-new">New</span>`;
  if (item.subjectType === 2) return `<span class="card-badge badge-tv">TV</span>`;
  return `<span class="card-badge badge-hd">HD</span>`;
}

function makeCard(item) {
  const rating = item.imdbRatingValue;
  const year = item.releaseDate?.slice(0, 4) || '';
  const genre = (item.genre || '').split(',')[0].trim();
  const poster = item.cover?.url;
  return `
  <div class="card" onclick="navigate('/detail/${item.subjectId}')">
    <div class="card-img-wrap">
      ${poster
        ? `<img class="card-poster" src="${poster}" alt="${esc(item.title)}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'" /><div class="card-poster-placeholder" style="display:none">🎬</div>`
        : `<div class="card-poster-placeholder">🎬</div>`}
      ${cardBadge(item)}
      <div class="card-overlay">
        <div class="card-play-btn">
          <svg width="18" height="18" fill="white" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
        </div>
      </div>
    </div>
    <div class="card-info">
      <div class="card-title" title="${esc(item.title)}">${esc(item.title)}</div>
      <div class="card-meta">
        <span>${esc(genre)}${year ? ' · ' + year : ''}</span>
        ${rating ? `<span class="card-rating">★ ${rating}</span>` : ''}
      </div>
    </div>
  </div>`;
}

function makeShowboxCard(item) {
  const title = item.title || 'Untitled';
  const poster = item.poster || '';
  const year = item.year || '';
  const genre = String(item.cats || '').split(',').slice(0, 2).join(' · ');
  return `<article class="card" onclick="toast('Catalog metadata only. Playback is not provided for this source.')">
    <div class="card-img-wrap">${poster ? `<img class="card-poster" src="${esc(poster)}" alt="${esc(title)}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'" /><div class="card-poster-placeholder" style="display:none">🎬</div>` : `<div class="card-poster-placeholder">🎬</div>`}<span class="card-badge badge-tv">Catalog</span></div>
    <div class="card-info"><div class="card-title" title="${esc(title)}">${esc(title)}</div><div class="card-meta"><span>${esc(genre)}${year ? ' · ' + esc(String(year)) : ''}</span>${item.imdb_rating ? `<span class="card-rating">★ ${esc(String(item.imdb_rating))}</span>` : ''}</div></div>
  </article>`;
}

function makeNtCard(item) {
  const title = item.title || item.name || 'Untitled';
  const poster = item.poster || item.cover || item.thumbnail || '';
  const year = item.year || item.releaseYear || '';
  const path = item.path || item.detailPath || item.slug || item.url || '';
  return `
  <div class="card" onclick="toast('Catalog entry only — playback requires an authorized source configured by the site owner.')">
    <div class="card-img-wrap">
      ${poster
        ? `<img class="card-poster" src="${poster}" alt="${esc(title)}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'" /><div class="card-poster-placeholder" style="display:none">🎬</div>`
        : `<div class="card-poster-placeholder">🎬</div>`}
      <span class="card-badge badge-new">New</span>
      <div class="card-overlay">
        <div class="card-play-btn">
          <svg width="18" height="18" fill="white" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
        </div>
      </div>
    </div>
    <div class="card-info">
      <div class="card-title" title="${esc(title)}">${esc(title)}</div>
      <div class="card-meta"><span>${year}</span></div>
    </div>
  </div>`;
}

// ===== SKELETON =====
function skeletonRow(n = 8) {
  return Array(n).fill(0).map(() => `
  <div class="skeleton-card">
    <div class="skeleton skeleton-poster"></div>
    <div class="skeleton skeleton-line"></div>
    <div class="skeleton skeleton-line-sm"></div>
  </div>`).join('');
}
function skeletonGrid(n = 12) {
  return `<div class="cards-grid">${Array(n).fill(0).map(() => `
  <div class="skeleton-grid-card">
    <div class="skeleton skeleton-poster"></div>
    <div class="skeleton skeleton-line" style="margin-top:10px"></div>
    <div class="skeleton skeleton-line-sm"></div>
  </div>`).join('')}</div>`;
}

// ===== ROW =====
function makeRow(id, html) {
  return `
  <div class="row-wrap">
    <button class="row-arrow row-arrow-left" onclick="scrollRow('${id}',-1)" aria-label="Scroll left">&#8249;</button>
    <div class="cards-row" id="${id}">${html}</div>
    <button class="row-arrow row-arrow-right" onclick="scrollRow('${id}',1)" aria-label="Scroll right">&#8250;</button>
  </div>`;
}
window.scrollRow = function(id, dir) {
  const el = document.getElementById(id);
  if (el) el.scrollBy({ left: dir * 530, behavior: 'smooth' });
};

// ===== HERO =====
function buildHero(items) {
  heroItems = items; heroSlideIndex = 0;
  clearHeroTimer();
  applyHeroSlide(true);
  if (items.length > 1) {
    heroTimer = setInterval(() => {
      heroSlideIndex = (heroSlideIndex + 1) % heroItems.length;
      applyHeroSlide(false);
    }, 7000);
  }
}

function applyHeroSlide(first) {
  const el = document.getElementById('heroSection');
  if (!el) return;
  const item = heroItems[heroSlideIndex];
  const bg = item.stills?.url || item.cover?.url || '';
  const rating = item.imdbRatingValue;
  const type = item.subjectType === 2 ? 'TV Show' : 'Movie';
  const year = item.releaseDate?.slice(0, 4) || '';
  const genres = (item.genre || '').split(',').slice(0, 3).map(g => g.trim()).filter(Boolean).join(' · ');
  const isNew = item.releaseDate && new Date(item.releaseDate) > new Date(Date.now() - 90 * 86400000);

  const heroBg = el.querySelector('.hero-bg');
  if (!first) {
    heroBg.classList.add('switching');
    setTimeout(() => { heroBg.style.backgroundImage = bg ? `url('${bg}')` : ''; heroBg.classList.remove('switching'); }, 300);
  } else {
    heroBg.style.backgroundImage = bg ? `url('${bg}')` : '';
  }

  const inner = el.querySelector('.hero-content-inner');
  if (inner && !first) { inner.style.animation = 'none'; void inner.offsetWidth; inner.style.animation = ''; }

  el.querySelector('.hero-title').textContent = item.title;
  el.querySelector('.badge-type').textContent = type;

  const br = el.querySelector('.badge-rating');
  br.textContent = rating ? `★ ${rating}` : '';
  br.style.display = rating ? '' : 'none';

  const bn = el.querySelector('.badge-new-tag');
  if (bn) { bn.textContent = 'New'; bn.style.display = isNew ? '' : 'none'; }

  el.querySelector('.hero-meta').innerHTML = `
    ${year ? `<span>${year}</span><span class="hero-meta-sep"></span>` : ''}
    ${genres ? `<span>${genres}</span>` : ''}
    ${item.countryName ? `<span class="hero-meta-sep"></span><span>${item.countryName}</span>` : ''}`;

  el.querySelector('.hero-desc').textContent = item.description || '';
  el.querySelector('.hero-btn-play').onclick = () => openPlayer(item.subjectId, item.title);
  el.querySelector('.hero-btn-info').onclick = () => navigate(`/detail/${item.subjectId}`);
  el.querySelectorAll('.hero-dot').forEach((d, i) => d.classList.toggle('active', i === heroSlideIndex));
}

function heroHtml(count) {
  const dots = Array.from({length: count}, (_, i) =>
    `<div class="hero-dot${i===0?' active':''}" onclick="setHeroSlide(${i})"></div>`).join('');
  return `
  <div class="hero" id="heroSection">
    <div class="hero-bg"></div>
    <div class="hero-gradient"></div>
    <button class="hero-arrow hero-arrow-prev" onclick="setHeroSlide((heroSlideIndex-1+heroItems.length)%heroItems.length)">&#8249;</button>
    <button class="hero-arrow hero-arrow-next" onclick="setHeroSlide((heroSlideIndex+1)%heroItems.length)">&#8250;</button>
    <div class="hero-content">
      <div class="hero-content-inner">
        <div class="hero-tags">
          <span class="hero-tag badge-type">Movie</span>
          <span class="hero-tag badge-rating"></span>
          <span class="hero-tag badge-new-tag" style="display:none">New</span>
        </div>
        <h1 class="hero-title">Loading…</h1>
        <div class="hero-meta"></div>
        <p class="hero-desc"></p>
        <div class="hero-actions">
          <button class="btn-play hero-btn-play">
            <svg width="18" height="18" fill="white" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
            Watch Now
          </button>
          <button class="btn-info hero-btn-info">
            <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            More Info
          </button>
        </div>
      </div>
    </div>
    <div class="hero-dots">${dots}</div>
  </div>`;
}

window.setHeroSlide = function(i) {
  heroSlideIndex = ((i % heroItems.length) + heroItems.length) % heroItems.length;
  clearHeroTimer();
  applyHeroSlide(false);
  heroTimer = setInterval(() => {
    heroSlideIndex = (heroSlideIndex + 1) % heroItems.length;
    applyHeroSlide(false);
  }, 7000);
};

// ===== HOME =====
async function renderHome() {
  updateSEO({});
  setApp(`<div style="margin-top:0">${heroHtml(6)}</div>

  <a class="sports-spotlight fade-up" href="/sports" onclick="navigate('/sports');return false;">
    <span class="sports-spotlight-mark">⚽</span>
    <span class="sports-spotlight-copy"><strong>THE MATCH CENTRE</strong><small>Live scores · Fixtures · Football news</small></span>
    <span class="sports-spotlight-cta">Explore sports <b>↗</b></span>
  </a>

  <div class="home-genre-bar">
    <div class="home-genre-label">Browse by Genre</div>
    <div class="home-genre-pills" id="homeGenrePills">
      <span class="hg-pill active" onclick="setHomeGenre('',this)">All</span>
      ${GENRES.map(g => `<span class="hg-pill" onclick="setHomeGenre('${g}',this)">${genreIcon(g)} ${g}</span>`).join('')}
    </div>
  </div>

  <div class="section"><div class="section-header"><h2 class="section-title">🔥 Trending Now</h2></div>${makeRow('trendRow', skeletonRow())}</div>
  <div class="section"><div class="section-header"><h2 class="section-title">🏆 Top Ranked</h2></div><div class="rank-tabs" id="rankTabs"></div>${makeRow('rankCards', skeletonRow())}</div>
  <div class="section" id="homeMoviesSection"><div class="section-header"><h2 class="section-title" id="homeMoviesTitle">🎬 Popular Movies</h2><a class="section-more" href="/movies" onclick="navigate('/movies');return false;">See All →</a></div>${makeRow('moviesRow', skeletonRow())}</div>
  <div class="section" id="homeShowsSection"><div class="section-header"><h2 class="section-title" id="homeShowsTitle">📺 Series &amp; Shows</h2><a class="section-more" href="/series" onclick="navigate('/series');return false;">See All →</a></div>${makeRow('showsRow', skeletonRow())}</div>
  <div class="section"><div class="section-header"><h2 class="section-title">🆕 Coming Soon</h2><a class="section-more" href="/new" onclick="navigate('/new');return false;">See All →</a></div>${makeRow('newRow', skeletonRow())}</div>
  ${renderFooter()}`);

  const [trending, ranking, movies, shows, comingSoon] = await Promise.all([
    api('trending', { page: 0, perPage: 18 }),
    api('ranking'),
    api('browse', { subjectType: 1, page: 1, perPage: 18 }),
    api('browse', { subjectType: 2, page: 1, perPage: 18 }),
    api('coming-soon'),
  ]);

  const trendList = trending?.data?.subjectList || [];
  const rankTabs = ranking?.data?.rankingList || [];
  const rankItems = ranking?.data?.subjectList || [];
  const mItems = movies?.data?.items || movies?.data?.subjectList || [];
  const sItems = shows?.data?.subjectList || shows?.data?.items || [];
  const ntItems = (comingSoon?.data?.subjects || []).filter(item => item.subjectType === 1 || item.subjectType === 2);

  if (trendList.length) buildHero(trendList.slice(0, 6));

  fill('trendRow', trendList.map(makeCard).join(''));
  fill('rankCards', rankItems.slice(0, 18).map(makeCard).join(''));
  fill('moviesRow', mItems.map(makeCard).join('') || emptyHtml('🎬', 'No movies yet'));
  fill('showsRow', sItems.map(makeCard).join('') || emptyHtml('📺', 'No shows yet'));
  fill('newRow', ntItems.length ? ntItems.map(makeCard).join('') : emptyHtml('🆕', 'No upcoming titles'));

  const tabsEl = document.getElementById('rankTabs');
  if (tabsEl && rankTabs.length) {
    tabsEl.innerHTML = rankTabs.slice(0, 14).map((t, i) =>
      `<button class="rank-tab${i===0?' active':''}" onclick="loadRankTab('${t.id}',this)">${t.name}</button>`).join('');
  }
}

function genreIcon(g) {
  const icons = {
    Action:'⚔️',Adventure:'🗺️',Animation:'🎨',Comedy:'😂',Crime:'🔍',
    Documentary:'🎥',Drama:'🎭',Fantasy:'🧙',Horror:'👻',Mystery:'🕵️',
    Romance:'❤️','Sci-Fi':'🚀',Thriller:'😱',Western:'🤠'
  };
  return icons[g] || '🎬';
}

window.setHomeGenre = async function(genre, el) {
  document.querySelectorAll('.hg-pill').forEach(p => p.classList.remove('active'));
  el.classList.add('active');
  const movieTitle = document.getElementById('homeMoviesTitle');
  const showTitle = document.getElementById('homeShowsTitle');
  if (movieTitle) movieTitle.textContent = `🎬 ${genre ? genre + ' Movies' : 'Popular Movies'}`;
  if (showTitle) showTitle.textContent = `📺 ${genre ? genre + ' Series & Shows' : 'Series & Shows'}`;
  fill('moviesRow', skeletonRow());
  fill('showsRow', skeletonRow());
  const params = { page: 1, perPage: 18 };
  if (genre) params.genre = genre;
  const [movies, shows] = await Promise.all([
    api('browse', { ...params, subjectType: 1 }),
    api('browse', { ...params, subjectType: 2 }),
  ]);
  const mItems = movies?.data?.subjectList || movies?.data?.items || [];
  const sItems = shows?.data?.subjectList || shows?.data?.items || [];
  fill('moviesRow', mItems.map(makeCard).join('') || emptyHtml('🎬', `No ${genre || 'popular'} movies found`));
  fill('showsRow', sItems.map(makeCard).join('') || emptyHtml('📺', `No ${genre || 'popular'} shows found`));
};

function fill(id, html) { const el = document.getElementById(id); if (el) el.innerHTML = html; }

window.loadRankTab = async function(id, btn) {
  document.querySelectorAll('.rank-tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  fill('rankCards', skeletonRow());
  const data = await api('ranking', { id });
  fill('rankCards', (data?.data?.subjectList || []).slice(0,18).map(makeCard).join(''));
};

// ===== TRENDING =====
async function renderTrending() {
  updateSEO({ title: 'Trending Now', description: 'Discover popular movies and TV series on FreeFlixx T.' });
  setApp(`
  <div class="page-header fade-up">
    <h1 class="page-title">🔥 Trending Now</h1>
    <p class="page-subtitle">What everyone's watching right now</p>
  </div>
  <div class="section">${skeletonGrid(24)}</div>
  ${renderFooter()}`);

  const data = await api('trending', { page: 0, perPage: 36 });
  const items = data?.data?.subjectList || [];
  const sec = app.querySelector('.section');
  if (sec) sec.innerHTML = items.length
    ? `<div class="cards-grid fade-in">${items.map(makeCard).join('')}</div>`
    : emptyHtml('🔥', 'Nothing trending right now', 'Check back soon');
}

// ===== SPORTS HUB =====
function sportsNairobiDate(offsetDays = 0) {
  const date = new Date(Date.now() + offsetDays * 86400000);
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Nairobi', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function sportsStatus(match) {
  const status = String(match?.R?.st || match?.status || '').trim().toUpperCase();
  if (match?.dt && match.dt < sportsNairobiDate() && /^(1T|2T|1H|2H|HT|ET|LIVE|PEN)/.test(status)) return 'FT';
  return status;
}

function sportsIsLive(match) {
  const minute = Number(match?.cm);
  return (!match?.dt || match.dt === sportsNairobiDate()) &&
    (!minute || minute <= 130) &&
    /^(1T|2T|1H|2H|HT|ET|LIVE|PEN)/.test(sportsStatus(match));
}

function sportsMatchCard(match) {
  const status = sportsStatus(match) || 'FT';
  const live = sportsIsLive(match);
  const home = match.p1 || match.homeTeam || 'Home';
  const away = match.p2 || match.awayTeam || 'Away';
  const homeScore = match.R?.r1 ?? match.homeScore ?? '–';
  const awayScore = match.R?.r2 ?? match.awayScore ?? '–';
  const clock = sportsIsLive(match) && match.cm ? `${match.cm}′` : status;
  return `<article class="sports-score-card">
    <div class="sports-card-top"><span class="sports-league-tag">FOOTBALL</span><span class="sports-state${live ? ' is-live' : ''}">${live ? '<i></i> LIVE' : esc(status)}</span></div>
    <div class="sports-score-row"><span class="sports-team">${esc(home)}</span><strong>${esc(String(homeScore))}<em>:</em>${esc(String(awayScore))}</strong><span class="sports-team">${esc(away)}</span></div>
    <div class="sports-card-bottom"><span>${esc(match.dt || 'Match centre')}</span><span>${esc(clock)}</span></div>
  </article>`;
}

function sportsFixtureCard(match, competition) {
  let kickoff = match.date || '';
  if (kickoff) {
    const date = new Date(kickoff);
    if (!Number.isNaN(date.getTime())) kickoff = date.toLocaleString(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  }
  return `<article class="sports-fixture-card">
    <div class="sports-fixture-meta"><span>${esc(competition)}</span><span>${esc(kickoff || `Matchweek ${match.matchday || ''}`)}</span></div>
    <div class="sports-fixture-teams"><span>${esc(match.homeTeam || 'Home')}</span><b>VS</b><span>${esc(match.awayTeam || 'Away')}</span></div>
  </article>`;
}

async function renderSports() {
  updateSEO({ title: 'Sports Match Centre', description: 'Follow live football scores, upcoming fixtures, Premier League standings and football news.' });
  setApp(`<div class="sports-page">
    <section class="sports-hero">
      <div class="sports-hero-glow"></div>
      <div class="sports-hero-copy">
        <div class="sports-eyebrow"><span class="sports-live-indicator"></span> THE SPORTS DESK</div>
        <h1>Every match.<br><span>One place.</span></h1>
        <p>Live football scores, upcoming fixtures, league tables and the stories around the game.</p>
        <div class="sports-hero-actions">
          <a class="sports-primary-btn" href="#sports-live">View live scores <span>↓</span></a>
          <a class="sports-secondary-btn" href="/live" onclick="navigate('/live');return false;">Browse live channels <span>↗</span></a>
        </div>
      </div>
      <div class="sports-ball-art" aria-hidden="true">
        <svg viewBox="0 0 240 240" role="presentation">
          <defs><radialGradient id="ballShade" cx="36%" cy="28%"><stop offset="0" stop-color="#f7f4f0"/><stop offset=".7" stop-color="#b7b2ae"/><stop offset="1" stop-color="#555"/></radialGradient></defs>
          <circle cx="120" cy="120" r="107" fill="url(#ballShade)" stroke="#aaa" stroke-width="3"/>
          <g fill="#161616" stroke="#252525" stroke-width="3" stroke-linejoin="round">
            <polygon points="120,76 145,94 136,124 104,124 95,94"/>
            <polygon points="120,16 145,22 157,48 138,68 111,61 99,37"/>
            <polygon points="220,88 209,116 182,124 164,101 175,73 201,68"/>
            <polygon points="188,207 159,220 138,203 146,175 176,166 195,185"/>
            <polygon points="48,205 27,184 34,154 62,145 83,166 76,195"/>
            <polygon points="18,82 30,53 59,46 77,69 68,98 40,108"/>
          </g>
        </svg>
      </div>
      <div class="sports-hero-foot"><span>FOOTBALL · LIVE DATA</span><span>UPDATED FROM KEITH APIS</span></div>
    </section>

    <section class="sports-section" id="sports-live">
      <div class="sports-section-head"><div><span class="sports-kicker">RIGHT NOW</span><h2>Live &amp; recent scores</h2></div><button class="sports-refresh" onclick="refreshSports()">↻ <span>Refresh</span></button></div>
      <div class="sports-score-grid" id="sportsScores"><div class="sports-loading">Loading match scores…</div></div>
    </section>

    <section class="sports-section">
      <div class="sports-section-head"><div><span class="sports-kicker">UP NEXT</span><h2>Fixture list</h2></div></div>
      <div class="sports-filter-row" id="sportsFilters">
        <button class="sports-filter active" onclick="setSportsCompetition('all',this)">All fixtures</button>
        <button class="sports-filter" onclick="setSportsCompetition('epl',this)">Premier League</button>
        <button class="sports-filter" onclick="setSportsCompetition('ucl',this)">Champions League</button>
      </div>
      <div class="sports-fixture-grid" id="sportsFixtures"><div class="sports-loading">Loading fixtures…</div></div>
      <p class="sports-note">Fixture times are shown in your device’s local timezone. For live video coverage, check the official broadcaster in your region.</p>
    </section>

    <section class="sports-lower-grid">
      <div class="sports-panel">
        <div class="sports-section-head"><div><span class="sports-kicker">THE TABLE</span><h2>Premier League</h2></div><a href="https://www.premierleague.com/" target="_blank" rel="noopener noreferrer" class="sports-external-link">Official site ↗</a></div>
        <div class="sports-table-wrap" id="sportsTable"><div class="sports-loading">Loading standings…</div></div>
      </div>
      <div class="sports-panel">
        <div class="sports-section-head"><div><span class="sports-kicker">AROUND THE GAME</span><h2>Football headlines</h2></div></div>
        <div class="sports-news-list" id="sportsNews"><div class="sports-loading">Loading headlines…</div></div>
      </div>
    </section>
    <div class="sports-official-callout"><span>Watch responsibly.</span> FreeFlixx T links you to official league information. Video rights and broadcasters vary by location. <a href="https://www.uefa.com/uefachampionsleague/" target="_blank" rel="noopener noreferrer">UEFA official site ↗</a></div>
  </div>${renderFooter()}`);

  const [live, epl, ucl, table, news] = await Promise.all([
    api('sports/live'), api('sports/epl'), api('sports/ucl'), api('sports/table'), api('sports/news'),
  ]);
  if (location.pathname !== '/sports') return;

  const today = sportsNairobiDate();
  const yesterday = sportsNairobiDate(-1);
  const games = Object.values(live?.result?.games || {}).filter(match => {
    const rawStatus = String(match?.R?.st || match?.status || '').trim().toUpperCase();
    const completed = ['FT', 'AET', 'PEN'].includes(rawStatus);
    const liveNow = match.dt === today && sportsIsLive(match);
    return match.dt >= yesterday && match.dt <= today && (completed || liveNow);
  });
  const sortedGames = games.sort((a, b) =>
    Number(sportsIsLive(b)) - Number(sportsIsLive(a)) ||
    String(b.dt || '').localeCompare(String(a.dt || '')) ||
    String(b.tm || '').localeCompare(String(a.tm || '')));
  fill('sportsScores', sortedGames.length
    ? sortedGames.slice(0, 8).map(sportsMatchCard).join('')
    : emptyHtml('⚽', 'No live scores available', live?.error || 'Check back when fixtures are underway.'));

  const fixtureData = {
    epl: (epl?.result?.upcomingMatches || []).map(match => ({ match, competition: epl?.result?.competition || 'Premier League' })),
    ucl: (ucl?.result?.upcomingMatches || []).map(match => ({ match, competition: ucl?.result?.competition || 'Champions League' })),
  };
  const allFixtures = [...fixtureData.epl, ...fixtureData.ucl];
  window.setSportsCompetition = (filter, button) => {
    document.querySelectorAll('#sportsFilters .sports-filter').forEach(item => item.classList.remove('active'));
    button?.classList.add('active');
    const list = filter === 'all' ? allFixtures : fixtureData[filter] || [];
    fill('sportsFixtures', list.length
      ? list.slice(0, 12).map(({ match, competition }) => sportsFixtureCard(match, competition)).join('')
      : emptyHtml('🗓️', 'No fixtures available', 'The fixture feed may be temporarily unavailable.'));
  };
  window.setSportsCompetition('all', document.querySelector('#sportsFilters .sports-filter'));

  const standings = table?.result?.standings || [];
  fill('sportsTable', standings.length ? `<table class="sports-standings">
    <thead><tr><th>#</th><th>Club</th><th>P</th><th>GD</th><th>Pts</th></tr></thead>
    <tbody>${standings.slice(0, 10).map(team => `<tr><td>${esc(String(team.position ?? ''))}</td><td>${esc(team.team || '')}</td><td>${esc(String(team.played ?? ''))}</td><td>${Number(team.goalDifference) > 0 ? '+' : ''}${esc(String(team.goalDifference ?? 0))}</td><td class="sports-points">${esc(String(team.points ?? ''))}</td></tr>`).join('')}</tbody>
  </table>` : emptyHtml('🏆', 'Standings unavailable', table?.error || 'Please try again later.'));

  const headlines = news?.result?.data?.items || [];
  fill('sportsNews', headlines.length ? headlines.slice(0, 5).map(item => `<article class="sports-news-item">
    ${item.cover?.url ? `<img src="${esc(item.cover.url)}" alt="" loading="lazy" />` : '<div class="sports-news-placeholder">⚽</div>'}
    <div><span>FOOTBALL NEWS</span><h3>${esc(item.title || 'Football update')}</h3><p>${esc(item.summary || '')}</p></div>
  </article>`).join('') : emptyHtml('📰', 'Headlines unavailable', news?.error || 'Please try again later.'));
}

window.refreshSports = function() {
  ['live', 'epl', 'ucl', 'table', 'news'].forEach(feed => apiCache.delete(`${API}/sports/${feed}`));
  renderSports();
};

// ===== SHOWS =====
let showPage = 1;
let showFeed = 'all';
let curShowGenre = '';
let showFetchId = 0;
async function renderShows() {
  showPage = 1;
  showFeed = 'all';
  curShowGenre = '';
  updateSEO({ title: 'Series', description: 'Browse series, animated series, and Korean dramas.' });
  setApp(`
  <div class="page-header fade-up">
    <h1 class="page-title">📺 Series</h1>
    <p class="page-subtitle">Explore series, animation, and Korean dramas</p>
  </div>
  <div class="pill-section">
    <div class="pill-label">Series collections</div>
    <div class="pill-row" id="showFeedTabs">
      <span class="pill active" onclick="setShowFeed('all',this)">All Series</span>
      <span class="pill" onclick="setShowFeed('animation',this)">Animation</span>
      <span class="pill" onclick="setShowFeed('kdrama',this)">K-Drama</span>
    </div>
    <div class="pill-label">Genre</div>
    <div class="pill-row" id="showGenrePills">
      <span class="pill active" onclick="setShowGenre('',this)">All</span>
      ${GENRES.map(g => `<span class="pill" onclick="setShowGenre('${g}',this)">${genreIcon(g)} ${g}</span>`).join('')}
    </div>
  </div>
  <div class="section">
    <div id="showsGrid">${skeletonGrid()}</div>
    <div class="load-more-wrap" id="showMoreWrap" style="display:none">
      <button class="load-more-btn" id="showMoreBtn" onclick="loadMoreShows()">Load More</button>
    </div>
  </div>
  ${renderFooter()}`);
  await fetchShows(true);
}

window.setShowFeed = async function(feed, el) {
  showFeed = feed;
  showPage = 1;
  curShowGenre = '';
  document.querySelectorAll('#showFeedTabs .pill').forEach(p => p.classList.remove('active'));
  el.classList.add('active');
  document.querySelectorAll('#showGenrePills .pill').forEach((p, i) => p.classList.toggle('active', i === 0));
  await fetchShows(true);
};
window.setShowGenre = async function(genre, el) {
  curShowGenre = genre;
  showPage = 1;
  showFeed = 'all';
  document.querySelectorAll('#showFeedTabs .pill').forEach((p, i) => p.classList.toggle('active', i === 0));
  document.querySelectorAll('#showGenrePills .pill').forEach(p => p.classList.remove('active'));
  el.classList.add('active');
  await fetchShows(true);
};
window.loadMoreShows = async function() {
  const btn = document.getElementById('showMoreBtn');
  if (btn) { btn.textContent = 'Loading…'; btn.disabled = true; }
  showPage++;
  await fetchShows(false);
  if (btn) { btn.textContent = 'Load More'; btn.disabled = false; }
};
async function fetchShows(reset) {
  const requestId = ++showFetchId;
  const grid = document.getElementById('showsGrid');
  const lmw = document.getElementById('showMoreWrap');
  if (!grid) return;
  if (reset) grid.innerHTML = skeletonGrid();
  const pageSize = 28;
  let endpoint = 'browse';
  const params = { page: showPage, perPage: pageSize };
  if (showFeed === 'animation') { endpoint = 'tv-series'; params.genre = 'Animation'; }
  else if (showFeed === 'kdrama') endpoint = 'kdrama';
  else { params.subjectType = 2; if (curShowGenre) params.genre = curShowGenre; }
  const data = await api(endpoint, params);
  if (requestId !== showFetchId) return;
  const items = data?.data?.subjectList || data?.data?.items || [];
  if (reset) {
    grid.innerHTML = items.length
      ? `<div class="cards-grid fade-in">${items.map(makeCard).join('')}</div>`
      : emptyHtml('📺', 'No shows found', data?.error || 'Try another collection or genre');
  } else {
    const cg = grid.querySelector('.cards-grid');
    if (cg) cg.insertAdjacentHTML('beforeend', items.map(makeCard).join(''));
  }
  if (lmw) lmw.style.display = items.length >= pageSize ? 'flex' : 'none';
}

// ===== BROWSE =====
let bp = 1, btype = 0, bgenre = '', bcountry = '', bchannel = '', byear = '', bsort = '';
let browseFetchId = 0;
async function renderBrowse(defaultType) {
  btype = defaultType; bp = 1; bgenre = ''; bcountry = ''; bchannel = ''; byear = ''; bsort = '';
  const titleText = defaultType === 1 ? 'Movies' : 'Browse All';
  updateSEO({ title: titleText, description: `Browse movies and TV shows on FreeFlixx T.` });

  setApp(`
  <div class="page-header fade-up">
    <h1 class="page-title">${defaultType === 1 ? '🎬 Movies' : '🌐 Browse All'}</h1>
    <p class="page-subtitle">${defaultType === 1 ? 'Browse the movie catalog' : 'All movies and TV shows in one place'}</p>
  </div>
  <div class="pill-section">
    ${defaultType === 0 ? `
    <div class="pill-label">Type</div>
    <div class="pill-row" id="browseTypePills">
      <span class="pill active" onclick="setBrowseType(0,this)">All</span>
      <span class="pill" onclick="setBrowseType(1,this)">Movies</span>
      <span class="pill" onclick="setBrowseType(2,this)">TV Shows</span>
    </div>` : ''}
    <div class="pill-label">Genre</div>
    <div class="pill-row" id="browseGenrePills">
      <span class="pill active" onclick="setBrowseGenre('',this)">All</span>
      ${GENRES.map(g => `<span class="pill" onclick="setBrowseGenre('${g}',this)">${g}</span>`).join('')}
    </div>
    <div class="pill-label">Country</div>
    <div class="pill-row" id="browseCountryPills">
      <span class="pill active" onclick="setBrowseCountry('',this)">All</span>
      ${COUNTRIES.map(c => `<span class="pill" onclick="setBrowseCountry('${c}',this)">${c}</span>`).join('')}
    </div>
    <div class="pill-row browse-api-filters">
      <label>Channel
        <select id="browseChannel" onchange="setBrowseApiFilter('channel',this.value)">
          <option value="">All channels</option><option value="2">Channel 2</option>
        </select>
      </label>
      <label>Year
        <select id="browseYear" onchange="setBrowseApiFilter('year',this.value)">
          <option value="">Any year</option>
          ${Array.from({length: 12}, (_, i) => new Date().getFullYear() - i).map(y => `<option value="${y}">${y}</option>`).join('')}
        </select>
      </label>
      <label>Order
        <select id="browseSort" onchange="setBrowseApiFilter('sort',this.value)">
          <option value="">Default</option><option value="Latest">Latest</option><option value="Popular">Popular</option><option value="Rating">Rating</option>
        </select>
      </label>
    </div>
  </div>
  <div class="section">
    <div id="browseGrid">${skeletonGrid()}</div>
    <div class="load-more-wrap" id="browseMoreWrap" style="display:none">
      <button class="load-more-btn" id="browseMoreBtn" onclick="loadMoreBrowse()">Load More</button>
    </div>
  </div>
  ${renderFooter()}`);

  await fetchBrowse(true);
}

window.setBrowseType = function(type, el) {
  btype = type; bp = 1;
  document.querySelectorAll('#browseTypePills .pill').forEach(p => p.classList.remove('active'));
  el.classList.add('active');
  fetchBrowse(true);
};
window.setBrowseGenre = function(genre, el) {
  bgenre = genre; bp = 1;
  document.querySelectorAll('#browseGenrePills .pill').forEach(p => p.classList.remove('active'));
  el.classList.add('active');
  fetchBrowse(true);
};
window.setBrowseCountry = function(country, el) {
  bcountry = country; bp = 1;
  document.querySelectorAll('#browseCountryPills .pill').forEach(p => p.classList.remove('active'));
  el.classList.add('active');
  fetchBrowse(true);
};
window.setBrowseApiFilter = function(key, value) {
  if (key === 'channel') bchannel = value;
  if (key === 'year') byear = value;
  if (key === 'sort') bsort = value;
  bp = 1;
  fetchBrowse(true);
};
window.loadMoreBrowse = async function() {
  const btn = document.getElementById('browseMoreBtn');
  if (btn) { btn.textContent = 'Loading…'; btn.disabled = true; }
  bp++;
  await fetchBrowse(false);
  if (btn) { btn.textContent = 'Load More'; btn.disabled = false; }
};
async function fetchBrowse(reset) {
  const requestId = ++browseFetchId;
  const grid = document.getElementById('browseGrid');
  const lmw = document.getElementById('browseMoreWrap');
  if (!grid) return;
  if (reset) grid.innerHTML = skeletonGrid();
  const params = { page: bp, perPage: bchannel || byear || bsort ? 28 : 24 };
  if (btype) params.subjectType = btype;
  if (bgenre) params.genre = bgenre;
  if (bcountry) params.country = bcountry === 'South Korea' ? 'Korea' : bcountry;
  if (bchannel) params.channelId = bchannel;
  if (byear) params.year = byear;
  if (bsort) params.sort = bsort;
  const data = await api('browse', params);
  if (requestId !== browseFetchId) return;
  const items = data?.data?.subjectList || data?.data?.items || [];
  if (reset) {
    grid.innerHTML = items.length
      ? `<div class="cards-grid fade-in">${items.map(makeCard).join('')}</div>`
      : emptyHtml('🎬', 'No titles found', 'Try different filters');
  } else {
    const cg = grid.querySelector('.cards-grid');
    if (cg) cg.insertAdjacentHTML('beforeend', items.map(makeCard).join(''));
  }
  if (lmw) lmw.style.display = items.length >= 24 ? 'flex' : 'none';
}

// ===== NEW ARRIVALS =====
async function renderNewArrivals() {
  updateSEO({ title: 'Coming Soon', description: 'Browse upcoming movie and series releases from the catalog.' });
  setApp(`
  <div class="page-header fade-up">
    <h1 class="page-title">🆕 Coming Soon</h1>
    <p class="page-subtitle">Upcoming movie and series releases from the catalog</p>
  </div>
  <div class="section">${skeletonGrid(24)}</div>
  ${renderFooter()}`);

  const data = await api('coming-soon');
  const items = (data?.data?.subjects || []).filter(item => item.subjectType === 1 || item.subjectType === 2);
  const sec = app.querySelector('.section');
  if (sec) sec.innerHTML = items.length
    ? `<div class="cards-grid fade-in">${items.map(makeCard).join('')}</div>`
    : emptyHtml('🆕', 'No upcoming titles', 'Check back soon');
}

// ===== LIVE TV =====
async function renderLive() {
  updateSEO({ title: 'Live TV', description: 'Explore live news, entertainment and sports channels on FreeFlixx T.' });
  setApp(`
  <div class="section" style="padding-top:0">
    <div class="live-hero">
      <div class="live-hero-bg"></div>
      <div class="live-hero-content">
        <div class="live-hero-badge"><span class="live-pulse"></span> LIVE</div>
        <h1 class="live-hero-title">Live TV Channels</h1>
        <p class="live-hero-sub">Stream sports, news, wrestling & entertainment free — no sign-up</p>
      </div>
    </div>
    <div class="live-tabs-bar" id="liveTabs"></div>
    <div class="live-grid" id="liveGrid">
      ${Array(12).fill(0).map(() => `<div class="skeleton-grid-card"><div class="skeleton" style="aspect-ratio:16/9"></div><div class="skeleton skeleton-line" style="margin-top:8px;margin-left:10px;margin-right:10px"></div></div>`).join('')}
    </div>
  </div>
  ${renderFooter()}`);

  const data = await api('live-channels');
  const channels = data?.channels || [];
  if (!channels.length) {
    fill('liveGrid', emptyHtml('📡', 'No live channels available'));
    return;
  }

  const cats = [...new Set(channels.map(c => c.category))];
  const catLabels = { wrestling:'🤼 Wrestling', sports:'⚽ Sports', news:'📺 News', comedy:'😂 Comedy', entertainment:'🎬 Entertainment' };
  let activeCat = cats.includes('sports') ? 'sports' : cats[0];

  const tabsEl = document.getElementById('liveTabs');
  if (tabsEl) {
    tabsEl.innerHTML = cats.map(c =>
      `<button class="live-tab${c===activeCat?' active':''}" onclick="setLiveTab('${c}',this)">${catLabels[c]||c}</button>`).join('');
  }

  const catColors = {
    wrestling: 'linear-gradient(135deg,#7f1d1d,#991b1b,#450a0a)',
    sports:    'linear-gradient(135deg,#0c4a6e,#0369a1,#082f49)',
    news:      'linear-gradient(135deg,#1e3a5f,#1d4ed8,#0f172a)',
    comedy:    'linear-gradient(135deg,#713f12,#d97706,#451a03)',
    entertainment: 'linear-gradient(135deg,#2e1065,#7c3aed,#1e0544)',
  };

  function renderCat(cat) {
    const filtered = channels.filter(c => c.category === cat);
    fill('liveGrid', filtered.map(ch => `
      <div class="live-card" onclick="playLiveChannel('${esc(ch.url)}','${esc(ch.name)}','${esc(ch.category)}')">
        <div class="live-thumb" style="background:${catColors[ch.category]||catColors.entertainment}">
          <div class="live-thumb-emoji">${ch.badge}</div>
          <div class="live-thumb-overlay"></div>
          <span class="live-badge-pill"><span class="live-dot"></span>LIVE</span>
          <div class="live-play-btn">
            <svg width="22" height="22" fill="white" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
          </div>
        </div>
        <div class="live-info">
          <div class="live-name">${esc(ch.name)}</div>
          <div class="live-desc">${esc(ch.desc)}</div>
        </div>
      </div>`).join(''));
  }

  renderCat(activeCat);

  window.setLiveTab = function(cat, btn) {
    activeCat = cat;
    document.querySelectorAll('.live-tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    renderCat(cat);
  };
}

window.playLiveChannel = function(url, name, category) {
  const proxyUrl = `/proxy/live-stream?url=${encodeURIComponent(url)}`;
  const overlay = document.getElementById('playerOverlay');
  const header = document.getElementById('playerHeader');
  const body = document.getElementById('playerBody');
  const info = document.getElementById('playerInfo');
  overlay.classList.add('show');
  header.innerHTML = `${esc(name)} <span style="font-size:10px;background:var(--red);color:white;padding:2px 8px;border-radius:4px;margin-left:6px;vertical-align:middle;font-weight:700;letter-spacing:1px;display:inline-flex;align-items:center;gap:4px"><span style="width:6px;height:6px;background:#fff;border-radius:50%;display:inline-block;animation:livePulse 1.4s ease-in-out infinite"></span>LIVE</span>`;
  info.innerHTML = '';
  body.innerHTML = `
    <div style="position:relative;background:#000;line-height:0">
      <div id="liveLoading" style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;background:#08080f;z-index:2">
        <div class="spinner"></div>
        <div style="color:var(--text3);font-size:13px">Connecting to live stream…</div>
      </div>
      <video id="livePlayer" controls autoplay playsinline
        style="width:100%;max-height:64vh;display:block;background:#000;opacity:0;transition:opacity 0.5s">
      </video>
    </div>`;

  const video = document.getElementById('livePlayer');
  const loading = document.getElementById('liveLoading');

  function onReady() { if (loading) loading.style.display = 'none'; video.style.opacity = '1'; }
  video.addEventListener('playing', onReady, { once: true });
  video.addEventListener('loadeddata', onReady, { once: true });
  setTimeout(onReady, 15000);

  if (window.Hls && Hls.isSupported()) {
    if (video._hls) { video._hls.destroy(); }
    const hls = new Hls({ enableWorker: true, lowLatencyMode: true, maxBufferLength: 30 });
    hls.loadSource(proxyUrl);
    hls.attachMedia(video);
    hls.on(Hls.Events.MANIFEST_PARSED, () => video.play().catch(() => {}));
    hls.on(Hls.Events.ERROR, (_, d) => {
      if (d.fatal) {
        if (loading) loading.innerHTML = `<div style="color:var(--text3);font-size:14px;text-align:center;padding:20px;line-height:1.6">📡 Stream unavailable<br><span style="font-size:12px;opacity:0.6">This channel may be offline or geo-restricted.<br>Try a different channel.</span></div>`;
      }
    });
    video._hls = hls;
  } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
    video.src = proxyUrl;
    video.play().catch(() => {});
  } else {
    body.innerHTML = `<div class="player-error"><div class="icon">⚠️</div><h3>HLS not supported</h3><p>Try Chrome or Firefox</p></div>`;
  }
};

// ===== SEARCH =====
let sq = '', sp = 1, stype = '';
async function renderSearch(q) {
  sq = q; sp = 1; stype = '';
  updateSEO({ title: q ? `Search: ${q}` : 'Search', description: `Search results for "${q}" on FreeFlixx T.` });
  setApp(`
  <div class="page-header fade-up">
    <h1 class="page-title">🔍 ${q ? `Results for "${esc(q)}"` : 'Search'}</h1>
  </div>
  <div class="pill-section">
    <div class="pill-row">
      <span class="pill active" onclick="setSearchType('',this)">All</span>
      <span class="pill" onclick="setSearchType('1',this)">Movies</span>
      <span class="pill" onclick="setSearchType('2',this)">TV Shows</span>
      <span class="pill" onclick="setSearchType('showbox',this)">Showbox Catalog</span>
    </div>
  </div>
  <div class="section">
    <div id="searchGrid">${skeletonGrid()}</div>
    <div class="load-more-wrap" id="srchMoreWrap" style="display:none">
      <button class="load-more-btn" id="srchMoreBtn" onclick="loadMoreSearch()">Load More</button>
    </div>
  </div>
  ${renderFooter()}`);
  await fetchSearch(true);
}

window.setSearchType = function(type, el) {
  stype = type; sp = 1;
  document.querySelectorAll('.pill-section .pill').forEach(p => p.classList.remove('active'));
  el.classList.add('active');
  fetchSearch(true);
};
window.loadMoreSearch = async function() {
  const btn = document.getElementById('srchMoreBtn');
  if (btn) { btn.textContent = 'Loading…'; btn.disabled = true; }
  sp++;
  await fetchSearch(false);
  if (btn) { btn.textContent = 'Load More'; btn.disabled = false; }
};
async function fetchSearch(reset) {
  const grid = document.getElementById('searchGrid');
  const lmw = document.getElementById('srchMoreWrap');
  if (!grid) return;
  if (reset) { sp = 1; grid.innerHTML = skeletonGrid(); }
  const p = { keyword: sq, page: sp, perPage: 24 };
  if (stype === 'showbox') {
    const data = await api('showbox/search', { keyword: sq, type: 'movie', pagelimit: 5 });
    const items = Array.isArray(data?.data) ? data.data : [];
    if (reset) grid.innerHTML = items.length
      ? `<div class="cards-grid fade-in">${items.map(makeShowboxCard).join('')}</div>`
      : emptyHtml('🔍', 'No Showbox catalog results', data?.error || 'Try a different keyword');
    else {
      const cg = grid.querySelector('.cards-grid');
      if (cg) cg.insertAdjacentHTML('beforeend', items.map(makeShowboxCard).join(''));
    }
    if (lmw) lmw.style.display = 'none';
    return;
  }
  if (stype) p.subjectType = stype;
  const data = await api('search', p);
  const items = data?.data?.subjectList || data?.data?.items || [];
  if (reset) {
    grid.innerHTML = items.length
      ? `<div class="cards-grid fade-in">${items.map(makeCard).join('')}</div>`
      : emptyHtml('🔍', 'No results found', 'Try a different keyword');
  } else {
    const cg = grid.querySelector('.cards-grid');
    if (cg) cg.insertAdjacentHTML('beforeend', items.map(makeCard).join(''));
  }
  if (lmw) lmw.style.display = items.length >= 24 ? 'flex' : 'none';
}

// ===== DETAIL (watch page) =====
async function renderDetail(id) {
  _currentShowId = id;
  _currentSeasonNum = 1;

  setApp(`
  <div class="watch-page">
    <div class="watch-player-section">
      <div class="watch-player-wrap">
        <div class="watch-player-embed" id="watchPlayerEmbed">
          <div class="watch-player-loading">
            <div class="spinner"></div>
            <p class="watch-loading-text">Checking for an authorized media source…</p>
          </div>
        </div>
      </div>
    </div>
    <div class="watch-controls-bar" id="watchControls">
      <div class="watch-ctrl-group"><span class="watch-ctrl-label">Authorized playback source</span></div>
    </div>
    <div class="watch-info-row" id="watchInfoRow">
      <div class="watch-info-skeleton">
        <div class="skeleton" style="width:55%;height:30px;border-radius:6px;margin-bottom:14px"></div>
        <div class="skeleton" style="width:38%;height:13px;border-radius:4px;margin-bottom:10px"></div>
        <div class="skeleton" style="width:92%;height:12px;border-radius:4px;margin-bottom:7px"></div>
        <div class="skeleton" style="width:76%;height:12px;border-radius:4px"></div>
      </div>
    </div>
  </div>`);

  const [detail, rec] = await Promise.all([
    api('rich-detail', { subjectId: id }),
    api('recommend', { subjectId: id, page: 1, perPage: 16 }),
  ]);

  if (!detail?.success || !detail?.data) {
    setApp(emptyHtml('⚠️', 'Could not load title', 'Please try again later', true));
    return;
  }

  const d = detail.data;
  const typeLabel = d.subjectType === 2 ? 'TV Show' : 'Movie';
  const yearStr = d.releaseDate ? d.releaseDate.slice(0, 4) : '';
  const seoDesc = d.description
    ? d.description.slice(0, 140)
    : `Explore ${d.title}${yearStr ? ' (' + yearStr + ')' : ''} on FreeFlixx T.`;
  updateSEO({ title: `Watch ${d.title}${yearStr ? ' (' + yearStr + ')' : ''}`, description: seoDesc, image: d.cover?.url || undefined });

  const isShow = d.subjectType === 2;
  const seasonMeta = isShow ? await api('seasons', { subjectId: id }) : null;
  const seasons = seasonMeta?.data?.seasons || d.seasonList || d.seasons || [];
  const genres = (d.genre || '').split(',').map(g => g.trim()).filter(Boolean);
  const rating = d.imdbRatingValue;
  const year = d.releaseDate?.slice(0, 4) || '';
  const dur = d.duration ? `${Math.floor(d.duration / 60)}m` : '';
  const recItems = rec?.data?.subjectList || [];
  const cast = d.staffList || [];

  const infoRow = document.getElementById('watchInfoRow');
  if (infoRow) {
    infoRow.innerHTML = `
    <div class="watch-info fade-in">
      <div class="watch-info-left">
        <div class="watch-title-row">
          <h1 class="watch-title">${esc(d.title)}</h1>
        </div>
        <div class="watch-meta-row">
          ${rating ? `<span class="watch-rating">
            <svg width="12" height="12" fill="#f59e0b" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
            ${rating} IMDb</span>` : ''}
          ${year ? `<span class="watch-meta-pill">${year}</span>` : ''}
          ${dur ? `<span class="watch-meta-pill">${dur}</span>` : ''}
          ${d.countryName ? `<span class="watch-meta-pill">${esc(d.countryName)}</span>` : ''}
          <span class="watch-meta-pill ${isShow ? 'pill-show' : 'pill-movie'}">${isShow ? 'TV Show' : 'Movie'}</span>
        </div>
        ${genres.length ? `<div class="watch-genres">${genres.map(g => `<span class="watch-genre" onclick="navigate('/browse');setTimeout(()=>setBrowseGenre('${g}',document.querySelector('[onclick*=setBrowseGenre]')),400)">${g}</span>`).join('')}</div>` : ''}
        ${d.description ? `<p class="watch-desc">${esc(d.description)}</p>` : ''}
      </div>
      <div class="watch-info-poster">
        ${d.cover?.url
          ? `<img src="${d.cover.url}" alt="${esc(d.title)}" onerror="this.style.display='none'" />`
          : `<div class="watch-poster-placeholder">🎬</div>`}
      </div>
    </div>`;
  }

  // Mount playback only when an explicit, authorized source is configured by the site owner.
  const embed = document.getElementById('watchPlayerEmbed');
  const controls = document.getElementById('watchControls');
  if (embed && controls) renderWatchPlayer(embed, controls, id, d.title, isShow, 1, 1);

  const page = document.querySelector('.watch-page');
  if (!page) return;

  // Episodes for shows
  if (isShow && seasons.length) {
    page.insertAdjacentHTML('beforeend', `
    <div class="watch-section">
      <div class="section-header"><h3 class="section-title">Episodes</h3></div>
      <div class="seasons-tabs" id="seasonsTabs">
        ${seasons.map((s, i) => { const number = Number(s.season || s.index || i + 1); return `<button class="season-tab${i===0?' active':''}" onclick="loadSeason('${id}','${id}',${number},this)">Season ${number}<small>${Number(s.episodes) || 0} episodes</small></button>`; }).join('')}
      </div>
      <div id="episodesGrid" class="episodes-grid">
        <div class="spinner-wrap" style="min-height:140px"><div class="spinner"></div></div>
      </div>
    </div>`);
    loadSeasonEpisodes(id, id, Number(seasons[0].season || seasons[0].index || 1));
  } else if (isShow) {
    page.insertAdjacentHTML('beforeend', `<div class="watch-section"><div class="section-header"><h3 class="section-title">Episodes</h3></div>${emptyHtml('📺', 'Episode guide is temporarily unavailable', 'Try refreshing this title in a moment.')}</div>`);
  }

  if (cast.length) {
    page.insertAdjacentHTML('beforeend', `
    <div class="watch-section">
      <div class="section-header"><h3 class="section-title">Cast &amp; Crew</h3></div>
      <div class="cast-row">${cast.map(p => `
        <div class="cast-card" onclick="navigate('/staff/${p.staffId}')">
          <img class="cast-avatar" src="${p.avatar?.url || p.avatarUrl || ''}" alt="${esc(p.name)}" onerror="this.style.opacity='0'" loading="lazy" />
          <div class="cast-name">${esc(p.name)}</div>
          <div class="cast-role">${esc(p.role || p.character || '')}</div>
        </div>`).join('')}
      </div>
    </div>`);
  }

  if (recItems.length) {
    page.insertAdjacentHTML('beforeend', `
    <div class="watch-section">
      <div class="section-header"><h3 class="section-title">You Might Also Like</h3></div>
      ${makeRow('recRow', recItems.map(makeCard).join(''))}
    </div>`);
  }

  page.insertAdjacentHTML('beforeend', renderFooter());
}

// ===== AUTHORIZED MEDIA PLAYER =====
let _currentShowId = null;
let _currentSeasonNum = 1;

function authorizedMediaFor(subjectId, season, episode) {
  const catalog = window.AUTHORIZED_MEDIA || {};
  const key = season ? `${subjectId}:${season}:${episode}` : String(subjectId);
  const media = catalog[key] || catalog[String(subjectId)];
  if (!media?.url) return null;
  try {
    const url = new URL(media.url, window.location.href);
    const hosts = (window.AUTHORIZED_MEDIA_HOSTS || []).map(h => String(h).toLowerCase());
    if (url.protocol !== 'https:' || !hosts.includes(url.hostname.toLowerCase())) return null;
    return { ...media, url: url.href };
  } catch { return null; }
}

function makeNativeVideo(media, className = '') {
  const video = document.createElement('video');
  video.className = className;
  video.controls = true;
  video.playsInline = true;
  video.preload = 'metadata';
  video.setAttribute('aria-label', media.title || 'Video player');
  video.src = media.url;
  if (media.poster) video.poster = media.poster;
  if (media.type === 'hls' && window.Hls && window.Hls.isSupported()) {
    const hls = new window.Hls();
    hls.loadSource(media.url);
    hls.attachMedia(video);
    video._hls = hls;
  }
  return video;
}

function pipButton(video) {
  const button = document.createElement('button');
  button.className = 'watch-srv-btn pip-btn';
  button.type = 'button';
  button.textContent = '▣ Floating player';
  button.title = 'Open picture-in-picture';
  button.addEventListener('click', async () => {
    try {
      if (document.pictureInPictureElement === video) await document.exitPictureInPicture();
      else if (video.requestPictureInPicture) await video.requestPictureInPicture();
      else toast('Picture-in-picture is not supported by this browser', 'error');
    } catch { toast('Could not open the floating player', 'error'); }
  });
  return button;
}

function showUnavailable(container, title = 'No authorized video source is configured') {
  container.innerHTML = `<div class="watch-player-error"><div class="wpe-icon">🎬</div><p>${esc(title)}</p><small>Catalog listings do not include playback rights. The site owner must configure an authorized HTTPS media source in public/media-sources.js.</small></div>`;
}

function renderWatchPlayer(embed, controls, subjectId, title, isShow, season, episode) {
  const media = authorizedMediaFor(subjectId, season, episode) || authorizedMediaFor(subjectId);
  if (!media) { showUnavailable(embed); controls.innerHTML = ''; return; }
  embed.replaceChildren(makeNativeVideo(media, 'authorized-video'));
  controls.innerHTML = '';
  controls.appendChild(pipButton(embed.querySelector('video')));
}

function renderPlayerTest() {
  updateSEO({ title: 'Player Test', description: 'Test the FreeFlixx video player with a CC0 public-domain sample clip.' });
  setApp(`
  <section class="page-header fade-up">
    <h1 class="page-title">Video Player Test</h1>
    <p class="page-subtitle">A separate demo clip to check playback and player controls. This does not change any movie or episode source.</p>
  </section>
  <section class="player-test-panel fade-in">
    <div class="player-test-mark">CC0</div>
    <h2>Sample public-domain video</h2>
    <p>The MDN flower sample is released under CC0 1.0. Open the custom player and test play/pause, seeking, volume, fullscreen, and floating-player support.</p>
    <button class="load-more-btn" type="button" onclick="openPlayer('__sample_public_domain__','CC0 sample · MDN flower video')">Open sample in player</button>
    <a class="player-test-license" href="https://github.com/mdn/interactive-examples/blob/main/LICENSE" target="_blank" rel="noopener noreferrer">View sample license</a>
  </section>
  ${renderFooter()}`);
}

// ===== WATCH PAGE FULLSCREEN =====
function _setWatchFs(active) {
  document.body.classList.toggle('watch-fs-active', active);
  const btn = document.querySelector('.watch-fs-btn');
  if (btn) btn.innerHTML = active
    ? `<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/></svg> Exit`
    : `<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg> Fullscreen`;
}

window.watchFullscreen = function() {
  const isFs = document.body.classList.contains('watch-fs-active');
  _setWatchFs(!isFs);
  if (!isFs) {
    // Also try native browser fullscreen on the page for immersion (hides browser chrome)
    const req = document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen;
    if (req) req.call(document.documentElement).catch(() => {});
  } else {
    const exit = document.exitFullscreen || document.webkitExitFullscreen;
    if (exit && (document.fullscreenElement || document.webkitFullscreenElement)) exit.call(document).catch(() => {});
  }
};

// Sync custom fullscreen with native fullscreen changes (e.g. embed player's own fullscreen btn)
['fullscreenchange', 'webkitfullscreenchange'].forEach(evt => {
  document.addEventListener(evt, () => {
    const nativeFs = !!(document.fullscreenElement || document.webkitFullscreenElement);
    if (nativeFs) {
      // Native fullscreen started (could be embed player's button) — activate our UI-hiding mode
      if (document.getElementById('watchPlayerEmbed')) _setWatchFs(true);
    } else {
      // Native fullscreen ended — exit our custom mode too
      if (document.body.classList.contains('watch-fs-active')) _setWatchFs(false);
    }
  });
});

// ESC key exits custom fullscreen when native fullscreen isn't involved
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && document.body.classList.contains('watch-fs-active')) {
    _setWatchFs(false);
    const exit = document.exitFullscreen || document.webkitExitFullscreen;
    if (exit && (document.fullscreenElement || document.webkitFullscreenElement)) exit.call(document).catch(() => {});
  }
});

window.loadSeason = function(subjectId, seasonId, seasonNum, btn) {
  _currentShowId = subjectId;
  _currentSeasonNum = seasonNum || 1;
  document.querySelectorAll('.season-tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  fill('episodesGrid', `<div class="spinner-wrap" style="min-height:140px"><div class="spinner"></div></div>`);
  loadSeasonEpisodes(subjectId, seasonId, _currentSeasonNum);
};

async function loadSeasonEpisodes(subjectId, seasonId, seasonNum) {
  const sNum = seasonNum || _currentSeasonNum || 1;
  const data = await api('seasons', { subjectId });
  const season = (data?.data?.seasons || []).find(item => Number(item.season || item.index) === Number(sNum));
  const episodeCount = Math.min(500, Math.max(0, Number(season?.episodes) || 0));
  const episodes = Array.from({ length: episodeCount }, (_, i) => ({ episode: i + 1 }));
  const grid = document.getElementById('episodesGrid');
  if (!grid) return;
  if (!episodes.length) { grid.innerHTML = emptyHtml('📺', 'Episode list unavailable', 'The catalog did not return episodes for this season.'); return; }
  grid.innerHTML = `<div class="episodes-grid fade-in">${episodes.map((ep, i) => {
    const epNum = ep.episode || (i + 1);
    return `
  <div class="episode-card" onclick="openPlayerEpisode('${subjectId}','Season ${sNum} · Episode ${epNum}',${sNum},${epNum})">
    <div class="ep-thumb" style="background:var(--bg3);display:flex;align-items:center;justify-content:center;font-size:22px">🎬</div>
    <div class="ep-info">
      <div class="ep-num">Episode ${epNum}</div>
      <div class="ep-title">Season ${sNum} · Episode ${epNum}</div>
      <div class="ep-desc">Select to play from an authorized source configured by the site owner.</div>
    </div>
    <div class="ep-play-icon">
      <svg width="14" height="14" fill="white" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
    </div>
  </div>`;
  }).join('')}</div>`;
}

// ===== MODAL PLAYER =====
window.openPlayerEpisode = (id, title, season, episode) => openPlayer(id, title, season, episode);
window.openPlayer = async function(subjectId, title, season, episode) {
  const overlay = document.getElementById('playerOverlay');
  const header = document.getElementById('playerHeader');
  const body = document.getElementById('playerBody');
  const info = document.getElementById('playerInfo');
  overlay.classList.add('show');
  header.textContent = title;
  body.replaceChildren();
  info.replaceChildren();
  const media = authorizedMediaFor(subjectId, season, episode) || authorizedMediaFor(subjectId);
  if (!media) {
    body.innerHTML = `<div class="player-error"><div class="icon">🎬</div><h3>No authorized video source is configured</h3><p>Catalog listings do not include playback rights. The site owner must configure an authorized HTTPS media source in public/media-sources.js.</p></div>`;
    return;
  }
  const video = makeNativeVideo(media, 'authorized-video');
  body.replaceChildren(video);
  info.appendChild(pipButton(video));
  video.addEventListener('leavepictureinpicture', () => {
    if (!overlay.classList.contains('show')) {
      if (video._hls) video._hls.destroy();
      video.pause(); video.removeAttribute('src'); video.load(); video.remove();
    }
  });
  try { await video.play(); } catch { /* Autoplay is optional; native controls remain available. */ }
};

// ===== PLAYER OVERLAY =====
const playerOverlay = document.getElementById('playerOverlay');
const playerClose = document.getElementById('playerClose');
const playerFullscreenBtn = document.getElementById('playerFullscreenBtn');
const playerContainer = document.getElementById('playerContainer');

playerClose?.addEventListener('click', closePlayer);
playerOverlay?.addEventListener('click', e => { if (e.target === playerOverlay) closePlayer(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closePlayer(); });

playerFullscreenBtn?.addEventListener('click', () => {
  if (document.fullscreenElement) {
    document.exitFullscreen();
  } else {
    playerContainer?.requestFullscreen?.();
  }
});

function closePlayer() {
  playerOverlay?.classList.remove('show');
  const body = document.getElementById('playerBody');
  if (body) {
    const vid = body.querySelector('video');
    const pipActive = vid && document.pictureInPictureElement === vid;
    if (vid && !pipActive) { if (vid._hls) vid._hls.destroy(); vid.pause(); vid.removeAttribute('src'); vid.load(); }
    if (!pipActive) body.replaceChildren();
  }
  const info = document.getElementById('playerInfo');
  if (info) info.innerHTML = '';
}

// ===== STAFF PAGE =====
async function renderStaff(staffId) {
  setApp(`<div class="spinner-wrap" style="min-height:60vh"><div class="spinner"></div></div>`);
  const [detail, works] = await Promise.all([
    api('staff/detail', { staffId }),
    api('staff/works', { staffId, page: 1, perPage: 24 }),
  ]);
  const d = detail?.data;
  if (!d) { setApp(emptyHtml('⚠️', 'Could not load actor', '', true)); return; }
  updateSEO({ title: d.name, description: `See movies and TV shows featuring ${d.name} on FreeFlixx T.`, image: d.avatar?.url });
  const avatar = d.avatar?.url || '';
  const worksItems = works?.data?.subjectList || [];
  setApp(`
  <div class="staff-hero">
    ${avatar ? `<div class="staff-hero-bg" style="background-image:url('${avatar}')"></div>` : ''}
    <div class="staff-hero-grad"></div>
    <div class="staff-content">
      ${avatar
        ? `<div class="staff-avatar"><img src="${avatar}" alt="${esc(d.name)}" /></div>`
        : `<div class="staff-avatar-placeholder">👤</div>`}
      <div>
        <h1 class="staff-name">${esc(d.name)}</h1>
        ${d.description ? `<p style="font-size:14px;color:var(--text2);margin-top:10px;max-width:680px;line-height:1.7">${esc(d.description.slice(0,300))}${d.description.length>300?'…':''}</p>` : ''}
      </div>
    </div>
  </div>
  <div class="section">
    <div class="section-header"><h2 class="section-title">Filmography</h2></div>
    ${worksItems.length
      ? `<div class="cards-grid fade-in">${worksItems.map(makeCard).join('')}</div>`
      : emptyHtml('🎬', 'No works found')}
  </div>
  ${renderFooter()}`);
}

// ===== FOOTER / EMPTY =====
function emptyHtml(icon, title, sub = '', topPad = false) {
  return `<div class="empty-state" style="${topPad?'padding-top:120px':''}">
    <div class="empty-icon">${icon}</div>
    <div class="empty-title">${title}</div>
    ${sub ? `<div class="empty-text">${sub}</div>` : ''}
  </div>`;
}

function renderFooter() {
  return `<footer>
    <div class="footer-logo">
      <div class="logo-mark" style="width:28px;height:28px;border-radius:8px">
        <svg viewBox="0 0 24 24" fill="white" width="14" height="14"><path d="M8 5v14l11-7z"/></svg>
      </div>
      <div>
        <div style="font-size:14px;font-weight:700">FreeFlixx<span style="color:var(--primary-light)"> T</span></div>
        <div style="font-size:10px;color:var(--text3);font-weight:600;letter-spacing:1.5px;text-transform:uppercase">STREAM UNIVERSE</div>
      </div>
    </div>
    <div class="footer-links">
      <a class="footer-link" href="/" onclick="navigate('/');return false;">Home</a>
      <a class="footer-link" href="/movies" onclick="navigate('/movies');return false;">Movies</a>
      <a class="footer-link" href="/series" onclick="navigate('/series');return false;">Series</a>
      <a class="footer-link" href="/live" onclick="navigate('/live');return false;">Live TV</a>
      <a class="footer-link" href="/sports" onclick="navigate('/sports');return false;">Sports</a>
      <a class="footer-link" href="/trending" onclick="navigate('/trending');return false;">Trending</a>
    </div>
    <div class="footer-contact">
      <a class="footer-contact-btn footer-whatsapp" href="https://wa.me/254114283550" target="_blank" rel="noopener noreferrer">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>
        WhatsApp
      </a>
      <a class="footer-contact-btn footer-email" href="mailto:flixxx254@gmail.com" target="_blank" rel="noopener noreferrer">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
        Email Us
      </a>
    </div>
    <div class="footer-copy">© ${new Date().getFullYear()} FreeFlixx T · Sports data by Keith APIs</div>
  </footer>`;
}

// ===== INIT =====
router();
