/* ===== BlueBlizzard FreeFlix — Advanced SPA ===== */

const API = '/proxy';
const SEO_SITE = 'BlueBlizzard FreeFlix';
const SEO_DEFAULT_DESC = 'Watch free movies, TV shows, live sports, wrestling, news and comedy channels on BlueBlizzard FreeFlix. No sign-up required. Stream in HD instantly.';

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
  if (page === 'detail' && id) return renderDetail(id);
  if (page === 'staff' && id) return renderStaff(id);
  if (page === 'search') return renderSearch(new URLSearchParams(location.search).get('q') || '');
  if (page === 'movies') return renderBrowse(1);
  if (page === 'shows') return renderShows();
  if (page === 'trending') return renderTrending();
  if (page === 'browse') return renderBrowse(0);
  if (page === 'live') return renderLive();
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
  const page = location.pathname.split('/')[1] || 'home';
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
  <div class="card" onclick="navigate('/detail/${item.subjectId}')" onmouseenter="prefetchStream('${item.subjectId}')">
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

function makeNtCard(item) {
  const title = item.title || item.name || 'Untitled';
  const poster = item.poster || item.cover || item.thumbnail || '';
  const year = item.year || item.releaseYear || '';
  const path = item.path || item.detailPath || '';
  return `
  <div class="card" onclick="openNtDetail('${esc(path)}','${esc(title)}')">
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

window.openNtDetail = async function(path, title) {
  if (!path) return;
  const overlay = document.getElementById('playerOverlay');
  const header = document.getElementById('playerHeader');
  const body = document.getElementById('playerBody');
  const info = document.getElementById('playerInfo');
  overlay.classList.add('show');
  header.textContent = title;
  info.innerHTML = '';
  body.innerHTML = `<div class="player-loading-bar"><div class="plb-inner"></div></div>`;

  const detail = await api('newtoxic/detail', { path });
  const d = detail?.data || detail;
  const files = d?.files || d?.fileList || [];
  const filesPath = d?.path || d?.filesPath || '';

  let fileList = files;
  if (!fileList.length && filesPath) {
    const fr = await api('newtoxic/files', { path: filesPath });
    fileList = fr?.data?.files || fr?.files || [];
  }

  if (!fileList.length) {
    body.innerHTML = `<div class="player-error"><div class="icon">⚠️</div><h3>No playable files found</h3></div>`;
    return;
  }

  const firstFid = fileList[0]?.fid || fileList[0]?.id;
  if (!firstFid) {
    body.innerHTML = `<div class="player-error"><div class="icon">⚠️</div><h3>Cannot resolve stream</h3></div>`;
    return;
  }

  const resolved = await api('newtoxic/resolve', { fid: firstFid });
  const streamUrl = resolved?.data?.url || resolved?.url;
  if (!streamUrl) {
    body.innerHTML = `<div class="player-error"><div class="icon">⚠️</div><h3>Stream not available</h3></div>`;
    return;
  }

  body.innerHTML = `<video id="videoPlayer" controls autoplay playsinline style="width:100%;max-height:64vh;display:block;background:#000">
    <source src="${esc(streamUrl)}" type="video/mp4" />
  </video>`;

  if (fileList.length > 1) {
    info.innerHTML = `<div style="font-size:11px;color:var(--text3);margin-bottom:8px;font-weight:700;text-transform:uppercase;letter-spacing:1px">Episodes / Files</div>
      <div class="player-streams">${fileList.map((f, i) => `<button class="stream-btn${i===0?' active':''}" onclick="loadNtFile('${f.fid||f.id}',this)">${esc(f.title||f.name||'Episode '+(i+1))}</button>`).join('')}</div>`;
  }
};

window.loadNtFile = async function(fid, btn) {
  document.querySelectorAll('.stream-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const resolved = await api('newtoxic/resolve', { fid });
  const url = resolved?.data?.url || resolved?.url;
  if (!url) { toast('Could not load stream', 'error'); return; }
  const vid = document.getElementById('videoPlayer');
  if (vid) { vid.src = url; vid.play(); }
};

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
  prefetchStream(item.subjectId);
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
  <div class="section" id="homeShowsSection"><div class="section-header"><h2 class="section-title" id="homeShowsTitle">📺 Series &amp; Shows</h2><a class="section-more" href="/shows" onclick="navigate('/shows');return false;">See All →</a></div>${makeRow('showsRow', skeletonRow())}</div>
  <div class="section"><div class="section-header"><h2 class="section-title">🆕 New Arrivals</h2><a class="section-more" href="/new" onclick="navigate('/new');return false;">See All →</a></div>${makeRow('newRow', skeletonRow())}</div>
  ${renderFooter()}`);

  const [trending, ranking, movies, shows, newArrivals] = await Promise.all([
    api('trending', { page: 0, perPage: 18 }),
    api('ranking'),
    api('browse', { subjectType: 1, genre: 'Action', page: 1, perPage: 18 }),
    api('browse', { subjectType: 2, genre: 'Drama', page: 1, perPage: 18 }),
    api('newtoxic/latest', { page: 1 }),
  ]);

  const trendList = trending?.data?.subjectList || [];
  const rankTabs = ranking?.data?.rankingList || [];
  const rankItems = ranking?.data?.subjectList || [];
  const mItems = movies?.data?.subjectList || movies?.data?.items || [];
  const sItems = shows?.data?.subjectList || shows?.data?.items || [];
  const ntItems = newArrivals?.data?.list || newArrivals?.data?.items || newArrivals?.list || [];

  if (trendList.length) buildHero(trendList.slice(0, 6));

  fill('trendRow', trendList.map(makeCard).join(''));
  fill('rankCards', rankItems.slice(0, 18).map(makeCard).join(''));
  fill('moviesRow', mItems.map(makeCard).join('') || emptyHtml('🎬', 'No movies yet'));
  fill('showsRow', sItems.map(makeCard).join('') || emptyHtml('📺', 'No shows yet'));
  fill('newRow', ntItems.length ? ntItems.map(makeNtCard).join('') : emptyHtml('🆕', 'No new arrivals'));

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
  updateSEO({ title: 'Trending Now', description: 'Discover what everyone is watching right now. Trending movies and TV shows streaming free on BlueBlizzard FreeFlix.' });
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

// ===== SHOWS =====
let showPage = 1;
async function renderShows() {
  showPage = 1;
  updateSEO({ title: 'TV Shows', description: 'Stream thousands of free TV shows and series on BlueBlizzard FreeFlix. Watch drama, comedy, action and more in HD.' });
  setApp(`
  <div class="page-header fade-up">
    <h1 class="page-title">📺 TV Shows</h1>
    <p class="page-subtitle">Stream series for free — no signup</p>
  </div>
  <div class="pill-section">
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

  await fetchShows(true, '');
}

let curShowGenre = '';
window.setShowGenre = async function(genre, el) {
  curShowGenre = genre; showPage = 1;
  document.querySelectorAll('#showGenrePills .pill').forEach(p => p.classList.remove('active'));
  el.classList.add('active');
  await fetchShows(true, genre);
};
window.loadMoreShows = async function() {
  const btn = document.getElementById('showMoreBtn');
  if (btn) { btn.textContent = 'Loading…'; btn.disabled = true; }
  showPage++;
  await fetchShows(false, curShowGenre);
  if (btn) { btn.textContent = 'Load More'; btn.disabled = false; }
};
async function fetchShows(reset, genre) {
  const grid = document.getElementById('showsGrid');
  const lmw = document.getElementById('showMoreWrap');
  if (!grid) return;
  if (reset) grid.innerHTML = skeletonGrid();
  const params = { subjectType: 2, page: showPage, perPage: 24 };
  if (genre) params.genre = genre;
  const data = await api('browse', params);
  const items = data?.data?.subjectList || data?.data?.items || [];
  if (reset) {
    grid.innerHTML = items.length
      ? `<div class="cards-grid fade-in">${items.map(makeCard).join('')}</div>`
      : emptyHtml('📺', 'No shows found');
  } else {
    const cg = grid.querySelector('.cards-grid');
    if (cg) cg.insertAdjacentHTML('beforeend', items.map(makeCard).join(''));
  }
  if (lmw) lmw.style.display = items.length >= 24 ? 'flex' : 'none';
}

// ===== BROWSE =====
let bp = 1, btype = 0, bgenre = '', bcountry = '';
async function renderBrowse(defaultType) {
  btype = defaultType; bp = 1; bgenre = ''; bcountry = '';
  const titleText = defaultType === 1 ? 'Movies' : 'Browse All';
  updateSEO({ title: titleText, description: `Browse all free ${defaultType === 1 ? 'movies' : 'movies and TV shows'} on BlueBlizzard FreeFlix.` });

  setApp(`
  <div class="page-header fade-up">
    <h1 class="page-title">${defaultType === 1 ? '🎬 Movies' : '🌐 Browse All'}</h1>
    <p class="page-subtitle">${defaultType === 1 ? 'Stream movies free — no signup' : 'All movies and TV shows in one place'}</p>
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
window.loadMoreBrowse = async function() {
  const btn = document.getElementById('browseMoreBtn');
  if (btn) { btn.textContent = 'Loading…'; btn.disabled = true; }
  bp++;
  await fetchBrowse(false);
  if (btn) { btn.textContent = 'Load More'; btn.disabled = false; }
};
async function fetchBrowse(reset) {
  const grid = document.getElementById('browseGrid');
  const lmw = document.getElementById('browseMoreWrap');
  if (!grid) return;
  if (reset) grid.innerHTML = skeletonGrid();
  const params = { page: bp, perPage: 24 };
  if (btype) params.subjectType = btype;
  if (bgenre) params.genre = bgenre;
  if (bcountry) params.countryName = bcountry;
  const data = await api('browse', params);
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
let newTab = 'movies';
async function renderNewArrivals() {
  updateSEO({ title: 'New Arrivals', description: 'The latest movies and TV shows added to BlueBlizzard FreeFlix. Watch new releases free in HD.' });
  setApp(`
  <div class="new-arrivals-hero fade-up">
    <div class="new-arrivals-hero-bg"></div>
    <div class="new-arrivals-hero-content">
      <div class="new-arrivals-badge"><span class="na-spark">✦</span> FRESH PICKS</div>
      <h1 class="new-arrivals-title">New Arrivals</h1>
      <p class="new-arrivals-sub">The hottest new movies & series — updated daily</p>
    </div>
  </div>
  <div class="new-tabs-bar">
    <button class="new-tab active" onclick="switchNewTab('movies',this)">🎬 New Movies</button>
    <button class="new-tab" onclick="switchNewTab('shows',this)">📺 New Series</button>
    <button class="new-tab" onclick="switchNewTab('other',this)">🆕 Latest Additions</button>
  </div>
  <div class="section" id="newArrivalsSection">${skeletonGrid(24)}</div>
  ${renderFooter()}`);

  newTab = 'movies';
  const [movies, shows, latest] = await Promise.all([
    api('browse', { subjectType: 1, page: 1, perPage: 36 }),
    api('browse', { subjectType: 2, page: 1, perPage: 36 }),
    api('newtoxic/latest', { page: 1 }),
  ]);

  window._naMovies = movies?.data?.subjectList || [];
  window._naShows = shows?.data?.subjectList || [];
  window._naOther = latest?.data?.list || latest?.data?.items || latest?.list || [];

  renderNewTab('movies');
}

function renderNewTab(tab) {
  newTab = tab;
  const sec = document.getElementById('newArrivalsSection');
  if (!sec) return;
  if (tab === 'movies') {
    sec.innerHTML = window._naMovies?.length
      ? `<div class="cards-grid fade-in">${window._naMovies.map(makeCard).join('')}</div>`
      : emptyHtml('🎬', 'No new movies yet', 'Check back soon');
  } else if (tab === 'shows') {
    sec.innerHTML = window._naShows?.length
      ? `<div class="cards-grid fade-in">${window._naShows.map(makeCard).join('')}</div>`
      : emptyHtml('📺', 'No new series yet', 'Check back soon');
  } else {
    sec.innerHTML = window._naOther?.length
      ? `<div class="cards-grid fade-in">${window._naOther.map(makeNtCard).join('')}</div>`
      : emptyHtml('🆕', 'No new arrivals yet', 'Check back soon');
  }
}

window.switchNewTab = function(tab, btn) {
  document.querySelectorAll('.new-tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  const sec = document.getElementById('newArrivalsSection');
  if (sec) sec.innerHTML = skeletonGrid(24);
  renderNewTab(tab);
};

// ===== LIVE TV =====
async function renderLive() {
  updateSEO({ title: 'Live TV', description: 'Watch live TV channels free — sports, news, wrestling, comedy and entertainment on BlueBlizzard FreeFlix.' });
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
  let activeCat = cats[0];

  const tabsEl = document.getElementById('liveTabs');
  if (tabsEl) {
    tabsEl.innerHTML = cats.map((c, i) =>
      `<button class="live-tab${i===0?' active':''}" onclick="setLiveTab('${c}',this)">${catLabels[c]||c}</button>`).join('');
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
      <div class="live-card" onclick="playLiveChannel('${esc(ch.url)}','${esc(ch.name)}','${esc(ch.category)}','${ch.type||'hls'}')">
        <div class="live-thumb" style="background:${catColors[ch.category]||catColors.entertainment}">
          <div class="live-thumb-emoji">${ch.badge}</div>
          <div class="live-thumb-overlay"></div>
          <span class="live-badge-pill"><span class="live-dot"></span>${ch.type==='embed'?'YT LIVE':'LIVE'}</span>
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

window.playLiveChannel = function(url, name, category, type) {
  const overlay = document.getElementById('playerOverlay');
  const header = document.getElementById('playerHeader');
  const body = document.getElementById('playerBody');
  const info = document.getElementById('playerInfo');
  overlay.classList.add('show');
  header.innerHTML = `${esc(name)} <span style="font-size:10px;background:var(--red);color:white;padding:2px 8px;border-radius:4px;margin-left:6px;vertical-align:middle;font-weight:700;letter-spacing:1px;display:inline-flex;align-items:center;gap:4px"><span style="width:6px;height:6px;background:#fff;border-radius:50%;display:inline-block;animation:livePulse 1.4s ease-in-out infinite"></span>LIVE</span>`;
  info.innerHTML = '';

  if (type === 'embed') {
    body.innerHTML = `
      <div style="position:relative;background:#000;line-height:0">
        <div id="liveLoading" style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;background:#08080f;z-index:2">
          <div class="spinner"></div>
          <div style="color:var(--text3);font-size:13px">Connecting to ${esc(name)}…</div>
        </div>
        <iframe src="${esc(url)}"
          allow="autoplay; fullscreen; encrypted-media"
          allowfullscreen
          referrerpolicy="no-referrer-when-downgrade"
          style="width:100%;height:64vh;border:none;display:block;background:#000;opacity:0;transition:opacity 0.5s"
          id="liveEmbedFrame">
        </iframe>
      </div>`;
    const iframe = document.getElementById('liveEmbedFrame');
    const loading = document.getElementById('liveLoading');
    if (iframe) {
      iframe.addEventListener('load', () => {
        if (loading) loading.style.display = 'none';
        iframe.style.opacity = '1';
      }, { once: true });
      setTimeout(() => { if (loading) loading.style.display = 'none'; if (iframe) iframe.style.opacity = '1'; }, 5000);
    }
    return;
  }

  const proxyUrl = `/proxy/live-stream?url=${encodeURIComponent(url)}`;
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
        if (loading) loading.innerHTML = `<div style="color:var(--text3);font-size:14px;text-align:center;padding:20px;line-height:1.6">📡 Stream temporarily unavailable<br><span style="font-size:12px;opacity:0.6">This channel may be offline or geo-restricted.<br>Try switching to another channel.</span></div>`;
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
  updateSEO({ title: q ? `Search: ${q}` : 'Search', description: `Search results for "${q}" on BlueBlizzard FreeFlix.` });
  setApp(`
  <div class="page-header fade-up">
    <h1 class="page-title">🔍 ${q ? `Results for "${esc(q)}"` : 'Search'}</h1>
  </div>
  <div class="pill-section">
    <div class="pill-row">
      <span class="pill active" onclick="setSearchType('',this)">All</span>
      <span class="pill" onclick="setSearchType('1',this)">Movies</span>
      <span class="pill" onclick="setSearchType('2',this)">TV Shows</span>
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
  prefetchStream(id);

  setApp(`
  <div class="watch-page">
    <div class="watch-player-section">
      <div class="watch-player-wrap">
        <div class="watch-player-embed" id="watchPlayerEmbed">
          <div class="watch-player-loading">
            <div class="spinner"></div>
            <p class="watch-loading-text">Loading player…</p>
          </div>
        </div>
      </div>
    </div>
    <div class="watch-controls-bar" id="watchControls">
      <div class="watch-ctrl-group"><span class="watch-ctrl-label">Loading servers…</span></div>
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
    : `Watch ${d.title}${yearStr ? ' (' + yearStr + ')' : ''} free online on BlueBlizzard FreeFlix.`;
  updateSEO({ title: `Watch ${d.title}${yearStr ? ' (' + yearStr + ')' : ''}`, description: seoDesc, image: d.cover?.url || undefined });

  const isShow = d.subjectType === 2;
  const genres = (d.genre || '').split(',').map(g => g.trim()).filter(Boolean);
  const rating = d.imdbRatingValue;
  const year = d.releaseDate?.slice(0, 4) || '';
  const dur = d.duration ? `${Math.floor(d.duration / 60)}m` : '';
  const recItems = rec?.data?.subjectList || [];
  const seasons = d.seasonList || d.seasons || [];
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

  // Load player
  const watchDataPromise = streamCache.get(id);
  const watchData = await watchDataPromise;
  const embed = document.getElementById('watchPlayerEmbed');
  const controls = document.getElementById('watchControls');
  if (embed && controls) renderWatchPlayer(embed, controls, id, d.title, watchData, isShow, 1, 1);

  const page = document.querySelector('.watch-page');
  if (!page) return;

  // Episodes for shows
  if (isShow && seasons.length) {
    page.insertAdjacentHTML('beforeend', `
    <div class="watch-section">
      <div class="section-header">
        <h3 class="section-title">Episodes</h3>
        <button class="play-all-btn" id="playAllBtn" onclick="playAllEpisodes('${id}','${seasons[0].seasonId||seasons[0].id||id}',1,'${esc(d.title)}')">
          <svg width="14" height="14" fill="white" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
          Play All
        </button>
      </div>
      <div class="seasons-tabs" id="seasonsTabs">
        ${seasons.map((s, i) => `<button class="season-tab${i===0?' active':''}" onclick="loadSeason('${id}','${s.seasonId||s.id||id}',${s.index||i+1},this,'${esc(d.title)}')">Season ${s.index||i+1}</button>`).join('')}
      </div>
      <div id="episodesGrid" class="episodes-grid">
        <div class="spinner-wrap" style="min-height:140px"><div class="spinner"></div></div>
      </div>
    </div>`);
    loadSeasonEpisodes(id, seasons[0].seasonId || seasons[0].id || id, 1, d.title);
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

// ===== PLAYER STATE (shared by both modal and detail page players) =====
const _ps = { servers: [], idx: 0, autoTimer: null, context: 'watch' };
let _currentShowId = null;
let _currentSeasonNum = 1;

function _clearAutoTimer() { if (_ps.autoTimer) { clearTimeout(_ps.autoTimer); _ps.autoTimer = null; } }

function _advanceServer(delta = 1) {
  _clearAutoTimer();
  const newIdx = _ps.idx + delta;
  if (newIdx < 0 || newIdx >= _ps.servers.length) {
    toast('No more servers to try', 'error');
    return;
  }
  _ps.idx = newIdx;
  const srv = _ps.servers[_ps.idx];

  if (_ps.context === 'watch') {
    const embed = document.getElementById('watchPlayerEmbed');
    const controls = document.getElementById('watchControls');
    if (embed) _mountEmbedFrame(embed, srv, true);
    _updateWatchServerBtns(controls);
  } else {
    const body = document.getElementById('playerBody');
    if (body) _mountModalEmbed(body, srv);
    _updateModalServerBtns();
  }
}
window.playerNextServer = () => _advanceServer(1);
window.playerPrevServer = () => _advanceServer(-1);
window.playerSelectServer = function(idx) {
  _clearAutoTimer();
  _ps.idx = idx;
  const srv = _ps.servers[_ps.idx];
  if (_ps.context === 'watch') {
    const embed = document.getElementById('watchPlayerEmbed');
    const controls = document.getElementById('watchControls');
    if (embed) _mountEmbedFrame(embed, srv, true);
    _updateWatchServerBtns(controls);
  } else {
    const body = document.getElementById('playerBody');
    if (body) _mountModalEmbed(body, srv);
    _updateModalServerBtns();
  }
};

function _mountEmbedFrame(container, server, isWatchPage) {
  const url = server.url || '';
  const srvLabel = server.label || 'Server';

  container.innerHTML = `
  <div style="position:relative;background:#000;line-height:0">
    <div id="embedLoading" style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;background:#08080f;z-index:3;transition:opacity 0.4s">
      <div class="spinner"></div>
      <div style="text-align:center">
        <div style="color:#e2e8f0;font-size:14px;font-weight:600;margin-bottom:4px">Loading ${esc(srvLabel)}…</div>
        <div style="color:var(--text3);font-size:12px">If nothing plays, switch to another server</div>
      </div>
    </div>
    <iframe id="embedFrame"
      src="${esc(url)}"
      allowfullscreen
      allow="autoplay; fullscreen; picture-in-picture; encrypted-media; screen-wake-lock; screen-orientation"
      referrerpolicy="no-referrer-when-downgrade"
      scrolling="no"
      style="width:100%;${isWatchPage ? 'aspect-ratio:16/9' : 'height:64vh'};border:none;display:block;background:#000;opacity:0;transition:opacity 0.4s">
    </iframe>
  </div>`;

  const iframe = document.getElementById('embedFrame');
  const loading = document.getElementById('embedLoading');

  function showPlayer() {
    if (loading) { loading.style.opacity = '0'; setTimeout(() => { if (loading) loading.style.display = 'none'; }, 400); }
    if (iframe) iframe.style.opacity = '1';
  }

  if (iframe) {
    iframe.addEventListener('load', showPlayer, { once: true });
    setTimeout(showPlayer, 12000);
  }
}

function _updateWatchServerBtns(controls) {
  if (!controls) return;
  controls.querySelectorAll('.watch-srv-btn[data-sidx]').forEach((b, i) => {
    b.classList.toggle('active', parseInt(b.dataset.sidx) === _ps.idx);
  });
}
function _updateModalServerBtns() {
  document.querySelectorAll('.stream-btn[data-sidx]').forEach(b => {
    b.classList.toggle('active', parseInt(b.dataset.sidx) === _ps.idx);
  });
}

function renderWatchPlayer(embed, controls, subjectId, title, watchData, isShow, season, episode) {
  if (!watchData?.success) {
    embed.innerHTML = `<div class="watch-player-error"><div class="wpe-icon">🎬</div><p>Stream unavailable — try another server</p></div>`;
    controls.innerHTML = '';
    return;
  }

  const { previewUrl } = watchData;
  const allServers = watchData.servers && watchData.servers.length ? watchData.servers : [];

  if (!allServers.length) {
    embed.innerHTML = previewUrl
      ? `<video controls autoplay playsinline style="width:100%;aspect-ratio:16/9;display:block;background:#000"><source src="${esc(previewUrl)}" type="video/mp4" /></video>`
      : `<div class="watch-player-error"><div class="wpe-icon">🎬</div><p>No stream found for this title</p></div>`;
    controls.innerHTML = '';
    return;
  }

  _ps.servers = allServers;
  _ps.idx = 0;
  _ps.context = 'watch';
  _clearAutoTimer();

  _mountEmbedFrame(embed, allServers[0], true);

  const serverBtns = allServers.map((s, i) =>
    `<button class="watch-srv-btn${i===0?' active':''}" data-sidx="${i}" onclick="playerSelectServer(${i})">${esc(s.label)}${s.badge ? ` <span class="srv-badge${s.badge==='YT'?' yt-badge':''}">${esc(s.badge)}</span>` : ''}</button>`
  ).join('');

  controls.innerHTML = `
    <div class="watch-ctrl-group">
      <span class="watch-ctrl-label">Server</span>
      ${serverBtns}
    </div>
    <div class="watch-ctrl-end">
      ${previewUrl ? `<button class="watch-srv-btn" onclick="switchWatchToPreview('${esc(previewUrl)}')">▶ Trailer</button>` : ''}
      <button class="watch-srv-btn watch-fs-btn" onclick="watchFullscreen()" title="Fullscreen">
        <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
        </svg>
        Fullscreen
      </button>
    </div>`;
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
  const embed = document.getElementById('watchPlayerEmbed');
  const isNativeFs = !!(document.fullscreenElement || document.webkitFullscreenElement);
  const isCssFs = document.body.classList.contains('watch-fs-active');

  if (isNativeFs || isCssFs) {
    // exit fullscreen
    _setWatchFs(false);
    const exit = document.exitFullscreen || document.webkitExitFullscreen;
    if (exit && isNativeFs) exit.call(document).catch(() => {});
    return;
  }

  // Try native fullscreen on the embed element itself for true full-screen
  if (embed) {
    const req = embed.requestFullscreen || embed.webkitRequestFullscreen || embed.mozRequestFullScreen;
    if (req) {
      req.call(embed).catch(() => {
        // Fallback: CSS-based fullscreen
        _setWatchFs(true);
      });
      // Also activate CSS mode so our UI hides and exit button shows
      _setWatchFs(true);
      return;
    }
  }
  // Pure CSS fallback
  _setWatchFs(true);
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

window.switchWatchToPreview = function(url) {
  _clearAutoTimer();
  const embed = document.getElementById('watchPlayerEmbed');
  if (!embed) return;
  embed.innerHTML = `<video controls autoplay playsinline style="width:100%;aspect-ratio:16/9;display:block;background:#000"><source src="${esc(url)}" type="video/mp4" /></video>`;
};

window.switchDubLink = function(url, btn) {
  document.querySelectorAll('.watch-ctrl-group .watch-srv-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
};

window.loadSeason = function(subjectId, seasonId, seasonNum, btn, showTitle) {
  _currentShowId = subjectId;
  _currentSeasonNum = seasonNum || 1;
  document.querySelectorAll('.season-tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  fill('episodesGrid', `<div class="spinner-wrap" style="min-height:140px"><div class="spinner"></div></div>`);
  const paBtn = document.getElementById('playAllBtn');
  if (paBtn) paBtn.onclick = () => playAllEpisodes(subjectId, seasonId, seasonNum, showTitle || '');
  loadSeasonEpisodes(subjectId, seasonId, _currentSeasonNum, showTitle);
};

async function loadSeasonEpisodes(subjectId, seasonId, seasonNum, showTitle) {
  const sNum = seasonNum || _currentSeasonNum || 1;
  const data = await api('play', { subjectId: seasonId || subjectId });
  const episodes = data?.data?.episodeList || data?.data?.episodes || [];
  const grid = document.getElementById('episodesGrid');
  if (!grid) return;
  if (!episodes.length) { grid.innerHTML = emptyHtml('📺', 'No episodes found'); return; }
  window._currentEpisodeList = episodes.map((ep, i) => ({
    subjectId, seasonId, seasonNum: sNum,
    title: ep.title || `Episode ${ep.index || i+1}`,
    epNum: ep.index || ep.episode || (i + 1),
  }));
  grid.innerHTML = `<div class="episodes-grid fade-in">${episodes.map((ep, i) => {
    const epNum = ep.index || ep.episode || (i + 1);
    return `
  <div class="episode-card" onclick="openPlayerEpisode('${subjectId}','${esc(ep.title||'Episode')}',${sNum},${epNum})" onmouseenter="prefetchStream('${subjectId}',${sNum},${epNum})">
    ${ep.cover?.url ? `<img class="ep-thumb" src="${ep.cover.url}" alt="" onerror="this.style.background='var(--bg3)'" loading="lazy" />` : `<div class="ep-thumb" style="background:var(--bg3);display:flex;align-items:center;justify-content:center;font-size:22px">🎬</div>`}
    <div class="ep-info">
      <div class="ep-num">Episode ${epNum}</div>
      <div class="ep-title">${esc(ep.title||'Episode')}</div>
      <div class="ep-desc">${esc(ep.description||'')}</div>
    </div>
    <div class="ep-play-icon">
      <svg width="14" height="14" fill="white" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
    </div>
  </div>`;
  }).join('')}</div>`;
}

// ===== PLAY ALL EPISODES (MovieBox/ShowBox API) =====
let _playlist = [];
let _playlistIdx = 0;

window.playAllEpisodes = async function(subjectId, seasonId, seasonNum, showTitle) {
  toast('Loading episode playlist…', 'info');
  const data = await api('play', { subjectId: seasonId || subjectId });
  const episodes = data?.data?.episodeList || data?.data?.episodes || [];
  if (!episodes.length) { toast('No episodes found for this season', 'error'); return; }

  _playlist = episodes.map((ep, i) => ({
    subjectId,
    title: ep.title || `Episode ${ep.index || i + 1}`,
    season: seasonNum || 1,
    episode: ep.index || ep.episode || (i + 1),
  }));
  _playlistIdx = 0;
  _openPlaylistPlayer(_playlist, 0, showTitle || 'Series');
};

function _openPlaylistPlayer(queue, startIdx, showTitle) {
  const overlay = document.getElementById('playerOverlay');
  const header = document.getElementById('playerHeader');
  const body = document.getElementById('playerBody');
  const info = document.getElementById('playerInfo');
  overlay.classList.add('show');
  _playlistIdx = startIdx;
  _loadPlaylistEp(queue, startIdx, showTitle, header, body, info);
}

async function _loadPlaylistEp(queue, idx, showTitle, header, body, info) {
  _playlistIdx = idx;
  const ep = queue[idx];
  header.textContent = `${showTitle} · S${ep.season}E${ep.episode} — ${ep.title}`;
  body.innerHTML = `<div class="player-loading-bar"><div class="plb-inner"></div></div>`;
  info.innerHTML = '';

  const key = `${ep.subjectId}:${ep.season}:${ep.episode}`;
  if (!streamCache.has(key)) prefetchStream(ep.subjectId, ep.season, ep.episode);
  const watchData = await streamCache.get(key);

  if (!watchData?.success || !watchData.servers?.length) {
    body.innerHTML = `<div class="player-error"><div class="icon">⚠️</div><h3>Stream unavailable for this episode</h3><p style="font-size:13px;margin-top:6px">Trying next episode…</p></div>`;
    if (idx + 1 < queue.length) setTimeout(() => _loadPlaylistEp(queue, idx + 1, showTitle, header, body, info), 2500);
    return;
  }

  _ps.servers = watchData.servers;
  _ps.idx = 0;
  _ps.context = 'modal';
  _clearAutoTimer();
  _mountModalEmbed(body, watchData.servers[0]);

  const serverBtns = watchData.servers.map((s, i) =>
    `<button class="stream-btn${i===0?' active':''}" data-sidx="${i}" onclick="playerSelectServer(${i})">${esc(s.label)}${s.badge ? ` <span class="srv-badge${s.badge==='YT'?' yt-badge':''}">${esc(s.badge)}</span>` : ''}</button>`
  ).join('');

  const hasNext = idx + 1 < queue.length;
  const hasPrev = idx > 0;

  info.innerHTML = `
    <div class="playlist-controls">
      <div class="playlist-nav">
        ${hasPrev ? `<button class="playlist-nav-btn" onclick="_loadPlaylistEp(window._playlist,${idx-1},'${esc(showTitle)}',document.getElementById('playerHeader'),document.getElementById('playerBody'),document.getElementById('playerInfo'))">◀ Prev Ep</button>` : ''}
        <span class="playlist-counter">Episode ${idx+1} of ${queue.length}</span>
        ${hasNext ? `<button class="playlist-nav-btn playlist-next" onclick="_loadPlaylistEp(window._playlist,${idx+1},'${esc(showTitle)}',document.getElementById('playerHeader'),document.getElementById('playerBody'),document.getElementById('playerInfo'))">Next Ep ▶</button>` : '<span class="playlist-counter" style="color:var(--green)">✓ Last Episode</span>'}
      </div>
      <div class="playlist-queue">
        ${queue.map((e, i) => `<button class="stream-btn${i===idx?' active':''}" onclick="_loadPlaylistEp(window._playlist,${i},'${esc(showTitle)}',document.getElementById('playerHeader'),document.getElementById('playerBody'),document.getElementById('playerInfo'))">${i+1}. ${esc(e.title)}</button>`).join('')}
      </div>
    </div>
    <div style="margin-top:12px;font-size:11px;color:var(--text3);font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">Server</div>
    <div class="player-streams">${serverBtns}</div>`;

  window._playlist = queue;
  window._loadPlaylistEp = _loadPlaylistEp;

  if (hasNext) {
    const nep = queue[idx + 1];
    prefetchStream(nep.subjectId, nep.season, nep.episode);
  }
}

// ===== PLAYER =====
const streamCache = new Map();

function _streamKey(subjectId, season, episode) {
  return season ? `${subjectId}:${season}:${episode}` : subjectId;
}

function prefetchStream(subjectId, season, episode) {
  const key = _streamKey(subjectId, season, episode);
  if (!subjectId || streamCache.has(key)) return;
  const params = new URLSearchParams({ subjectId });
  if (season) { params.set('season', season); params.set('episode', episode); }
  streamCache.set(key, fetch(`/proxy/watch?${params}`).then(r => r.json()));
}
window.prefetchStream = prefetchStream;
window.openPlayerEpisode = (id, title, season, episode) => openPlayer(id, title, season, episode);

window.openPlayer = async function(subjectId, title, season, episode) {
  const overlay = document.getElementById('playerOverlay');
  const header = document.getElementById('playerHeader');
  const body = document.getElementById('playerBody');
  const info = document.getElementById('playerInfo');

  overlay.classList.add('show');
  header.textContent = title;
  info.innerHTML = '';
  body.innerHTML = `<div class="player-loading-bar"><div class="plb-inner"></div></div>`;

  const key = _streamKey(subjectId, season, episode);
  if (!streamCache.has(key)) prefetchStream(subjectId, season, episode);
  const watchData = await streamCache.get(key);
  renderPlayerContent(body, info, subjectId, title, watchData);
};

function _mountModalEmbed(body, server) {
  _mountEmbedFrame(body, server, false);
}

function renderPlayerContent(body, info, subjectId, title, watchData) {
  if (!watchData?.success) {
    body.innerHTML = playerError('Could not load this title.');
    return;
  }

  const { previewUrl } = watchData;
  const allServers = watchData.servers && watchData.servers.length ? watchData.servers : [];

  if (!allServers.length && !previewUrl) {
    body.innerHTML = playerError('No stream found for this title.');
    return;
  }

  if (allServers.length) {
    _ps.servers = allServers;
    _ps.idx = 0;
    _ps.context = 'modal';
    _clearAutoTimer();

    _mountModalEmbed(body, allServers[0]);

    const serverBtns = allServers.map((s, i) =>
      `<button class="stream-btn${i===0?' active':''}" data-sidx="${i}" onclick="playerSelectServer(${i})">${esc(s.label)}${s.badge ? ` <span class="srv-badge${s.badge==='YT'?' yt-badge':''}">${esc(s.badge)}</span>` : ''}</button>`
    ).join('');

    info.innerHTML = `
      <div style="font-size:11px;color:var(--text3);margin-bottom:8px;font-weight:700;text-transform:uppercase;letter-spacing:1px">Server</div>
      <div class="player-streams">${serverBtns}</div>`;
    return;
  }

  if (previewUrl) {
    body.innerHTML = `<video controls autoplay playsinline style="width:100%;height:64vh;display:block;background:#000"><source src="${esc(previewUrl)}" type="video/mp4" /></video>`;
  } else {
    body.innerHTML = playerError('No stream found.');
  }
}

function playerError(msg) {
  return `<div class="player-error"><div class="icon">🎬</div><h3>${msg}</h3><p style="font-size:13px;margin-top:6px">Try a different server</p></div>`;
}

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
  _clearAutoTimer();
  playerOverlay?.classList.remove('show');
  const body = document.getElementById('playerBody');
  if (body) {
    const vid = body.querySelector('video');
    if (vid) { if (vid._hls) { vid._hls.destroy(); } vid.pause(); vid.src = ''; }
    body.innerHTML = '';
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
  updateSEO({ title: d.name, description: `See all movies and TV shows starring ${d.name} on BlueBlizzard FreeFlix.`, image: d.avatar?.url });
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
        <div style="font-size:14px;font-weight:700">Blue<span style="color:var(--primary-light)">Blizzard</span></div>
        <div style="font-size:10px;color:var(--text3);font-weight:600;letter-spacing:1.5px;text-transform:uppercase">FreeFlix</div>
      </div>
    </div>
    <div class="footer-links">
      <a class="footer-link" href="/" onclick="navigate('/');return false;">Home</a>
      <a class="footer-link" href="/movies" onclick="navigate('/movies');return false;">Movies</a>
      <a class="footer-link" href="/shows" onclick="navigate('/shows');return false;">TV Shows</a>
      <a class="footer-link" href="/live" onclick="navigate('/live');return false;">Live TV</a>
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
    <div class="footer-copy">© ${new Date().getFullYear()} BlueBlizzard FreeFlix · For educational use only</div>
  </footer>`;
}

// ===== INIT =====
router();
