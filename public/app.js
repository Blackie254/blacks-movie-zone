/* ===== BlueBlizzard FreeFlix — Smooth SPA ===== */

const API = '/proxy';
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

// ===== FETCH with client cache =====
const apiCache = new Map();
const API_CACHE_TTL = 3 * 60 * 1000;

async function api(endpoint, params = {}) {
  const q = new URLSearchParams(params).toString();
  const url = `${API}/${endpoint}${q ? '?' + q : ''}`;
  const cKey = url;
  const cached = apiCache.get(cKey);
  if (cached && Date.now() - cached.ts < API_CACHE_TTL) return cached.data;
  try {
    const r = await fetch(url);
    const data = await r.json();
    if (data) apiCache.set(cKey, { data, ts: Date.now() });
    return data;
  } catch { return { success: false }; }
}

// ===== APP CONTAINER =====
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

// ===== NAVBAR SCROLL =====
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
  const isNew = item.releaseDate && new Date(item.releaseDate) > new Date(Date.now() - 100 * 86400000);
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
        ${rating ? `<span class="card-rating" style="color:${ratingColor(rating)}">★ ${rating}</span>` : ''}
      </div>
    </div>
  </div>`;
}

// Newtoxic card (different data shape)
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
  const header  = document.getElementById('playerHeader');
  const body    = document.getElementById('playerBody');
  const info    = document.getElementById('playerInfo');
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

  body.innerHTML = `<div class="player-loading-bar"><div class="plb-inner"></div></div>`;
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

  body.innerHTML = `<video id="videoPlayer" controls autoplay playsinline
    style="width:100%;max-height:62vh;display:block;background:#000">
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

// ===== SKELETON CARDS =====
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

// ===== ROW WITH SCROLL ARROWS =====
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
  if (el) el.scrollBy({ left: dir * 520, behavior: 'smooth' });
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
  const genres = (item.genre || '').split(',').slice(0, 3).join(' · ');

  const heroBg = el.querySelector('.hero-bg');
  if (!first) {
    heroBg.classList.add('switching');
    setTimeout(() => {
      heroBg.style.backgroundImage = bg ? `url('${bg}')` : '';
      heroBg.classList.remove('switching');
    }, 300);
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
  el.querySelector('.hero-meta').innerHTML = `
    ${year ? `<span>📅 ${year}</span>` : ''}
    ${genres ? `<span>🎭 ${genres}</span>` : ''}
    ${item.countryName ? `<span>🌍 ${item.countryName}</span>` : ''}`;
  el.querySelector('.hero-desc').textContent = item.description || '';
  el.querySelector('.hero-btn-play').onclick = () => openPlayer(item.subjectId, item.title, item.subjectType === 2);
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
        <div class="hero-badge">
          <span class="badge-type">Movie</span>
          <span class="badge-rating"></span>
        </div>
        <h1 class="hero-title">Loading...</h1>
        <div class="hero-meta"></div>
        <p class="hero-desc"></p>
        <div class="hero-actions">
          <button class="btn-play hero-btn-play">
            <svg width="18" height="18" fill="white" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
            Watch Now
          </button>
          <button class="btn-info hero-btn-info">ℹ More Info</button>
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
let homeGenre = '';

async function renderHome() {
  setApp(`<div style="margin-top:64px">${heroHtml(6)}</div>

  <div class="home-genre-bar">
    <div class="home-genre-label">Browse by Genre</div>
    <div class="home-genre-pills" id="homeGenrePills">
      <span class="hg-pill active" onclick="setHomeGenre('',this)">All</span>
      ${GENRES.map(g => `<span class="hg-pill" onclick="setHomeGenre('${g}',this)">${genreIcon(g)} ${g}</span>`).join('')}
    </div>
  </div>

  <div class="section"><div class="section-header"><h2 class="section-title">🔥 Trending Now</h2></div>${makeRow('trendRow', skeletonRow())}</div>
  <div class="section"><div class="section-header"><h2 class="section-title">🏆 Rankings</h2></div><div class="rank-tabs" id="rankTabs"></div>${makeRow('rankCards', skeletonRow())}</div>
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
  homeGenre = genre;
  document.querySelectorAll('.hg-pill').forEach(p => p.classList.remove('active'));
  el.classList.add('active');

  const label = genre || 'Popular';
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

  fill('moviesRow', mItems.map(makeCard).join('') || emptyHtml('🎬', `No ${label} movies found`));
  fill('showsRow', sItems.map(makeCard).join('') || emptyHtml('📺', `No ${label} shows found`));
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
  setApp(`
  <div class="page-header fade-up">
    <h1 class="page-title">🔥 Trending Now</h1>
    <p class="page-subtitle">What everyone's watching right now</p>
  </div>
  <div class="section">${skeletonGrid(24)}</div>
  ${renderFooter()}`);

  const data = await api('trending', { page: 0, perPage: 36 });
  const items = data?.data?.subjectList || [];
  app.querySelector('.section').innerHTML = items.length
    ? `<div class="cards-grid fade-in">${items.map(makeCard).join('')}</div>`
    : emptyHtml('🔥', 'Nothing trending right now');
}

// ===== NEW ARRIVALS (NewToxic) =====
let ntPage = 1;

async function renderNewArrivals() {
  ntPage = 1;
  setApp(`
  <div class="page-header fade-up">
    <h1 class="page-title">🆕 New Arrivals</h1>
    <p class="page-subtitle">Fresh content added recently</p>
  </div>
  <div class="section">
    <div id="ntGrid">${skeletonGrid()}</div>
    <div class="load-more-wrap" id="ntMoreWrap" style="display:none">
      <button class="load-more-btn" id="ntMoreBtn" onclick="loadMoreNt()">Load More</button>
    </div>
  </div>
  ${renderFooter()}`);

  await fetchNtLatest(true);
}

async function fetchNtLatest(reset) {
  const grid = document.getElementById('ntGrid');
  const lmw = document.getElementById('ntMoreWrap');
  if (!grid) return;
  if (reset) grid.innerHTML = skeletonGrid();

  const data = await api('newtoxic/latest', { page: ntPage });
  const items = data?.data?.list || data?.data?.items || data?.list || [];

  if (reset) {
    grid.innerHTML = items.length
      ? `<div class="cards-grid fade-in">${items.map(makeNtCard).join('')}</div>`
      : emptyHtml('🆕', 'No new arrivals found');
  } else {
    const cg = grid.querySelector('.cards-grid');
    if (cg) cg.insertAdjacentHTML('beforeend', items.map(makeNtCard).join(''));
  }
  if (lmw) lmw.style.display = items.length >= 20 ? 'flex' : 'none';
}

window.loadMoreNt = async function() {
  const btn = document.getElementById('ntMoreBtn');
  if (btn) { btn.textContent = 'Loading...'; btn.disabled = true; }
  ntPage++;
  await fetchNtLatest(false);
  if (btn) { btn.textContent = 'Load More'; btn.disabled = false; }
};

// ===== LIVE TV =====
let liveTab = 'all';
let allLiveChannels = [];

async function renderLive() {
  liveTab = 'wrestling';
  setApp(`
  <div class="live-hero">
    <div class="live-hero-bg"></div>
    <div class="live-hero-content">
      <div class="live-hero-badge"><span class="live-pulse"></span> LIVE NOW</div>
      <h1 class="live-hero-title">Live TV & Sports</h1>
      <p class="live-hero-sub">Wrestling, combat sports, news &amp; entertainment — all streaming free</p>
    </div>
  </div>

  <div class="live-tabs-bar">
    <button class="live-tab active" data-tab="wrestling" onclick="switchLiveTab('wrestling',this)">🤼 Wrestling &amp; Combat</button>
    <button class="live-tab" data-tab="sports" onclick="switchLiveTab('sports',this)">🏆 Sports</button>
    <button class="live-tab" data-tab="comedy" onclick="switchLiveTab('comedy',this)">😂 Comedy</button>
    <button class="live-tab" data-tab="entertainment" onclick="switchLiveTab('entertainment',this)">🎬 Movies &amp; TV</button>
    <button class="live-tab" data-tab="news" onclick="switchLiveTab('news',this)">📰 News</button>
    <button class="live-tab" data-tab="all" onclick="switchLiveTab('all',this)">📡 All Channels</button>
  </div>

  <div class="section" id="liveSection">
    <div class="spinner-wrap" style="min-height:300px"><div class="spinner"></div></div>
  </div>
  ${renderFooter()}`);

  const [curated, legacy] = await Promise.all([
    api('live-channels'),
    api('live'),
  ]);

  const curatedChannels = curated?.channels || [];
  const legacyChannels = (legacy?.data?.list || legacy?.data?.channels || []).map(ch => ({
    id: ch.subjectId || ch.id || Math.random(),
    name: ch.title || ch.name || 'Channel',
    category: 'general',
    badge: '📡',
    desc: ch.category || '',
    url: ch.streamUrl || ch.url || '',
    thumb: ch.cover?.url || ch.logo || ch.thumbnail || '',
  }));

  allLiveChannels = [...curatedChannels, ...legacyChannels];
  renderLiveGrid(liveTab);
}

function renderLiveGrid(tab) {
  const section = document.getElementById('liveSection');
  if (!section) return;

  const filtered = tab === 'all'
    ? allLiveChannels
    : allLiveChannels.filter(ch => ch.category === tab);

  if (!filtered.length) {
    section.innerHTML = emptyHtml('📡', 'No channels in this category', 'Check back later');
    return;
  }

  section.innerHTML = `<div class="live-grid fade-in">${filtered.map(ch => `
    <div class="live-card" onclick="openLiveChannel('${esc(ch.url||'')}','${esc(ch.name||'Channel')}','${esc(ch.badge||'📡')}')">
      <div class="live-thumb">
        ${ch.thumb
          ? `<img src="${esc(ch.thumb)}" alt="${esc(ch.name)}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'" loading="lazy" /><div class="live-thumb-placeholder" style="display:none">${ch.badge||'📡'}</div>`
          : `<div class="live-thumb-placeholder">${ch.badge||'📡'}</div>`}
        <span class="live-badge-pill">● LIVE</span>
        <div class="live-play-btn">
          <svg width="20" height="20" fill="white" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
        </div>
      </div>
      <div class="live-info">
        <div class="live-name">${esc(ch.name)}</div>
        ${ch.desc ? `<div class="live-desc">${esc(ch.desc)}</div>` : ''}
        <div class="live-cat-tag">${liveCatLabel(ch.category)}</div>
      </div>
    </div>`).join('')}</div>`;
}

function liveCatLabel(cat) {
  const map = { wrestling:'🤼 Wrestling', sports:'🏆 Sports', news:'📰 News', entertainment:'🎬 Entertainment', comedy:'😂 Comedy', general:'📡 Live' };
  return map[cat] || '📡 Live';
}

window.switchLiveTab = function(tab, btn) {
  liveTab = tab;
  document.querySelectorAll('.live-tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderLiveGrid(tab);
};

window.openLiveChannel = function(streamUrl, title, badge) {
  if (!streamUrl) { toast('No stream URL for this channel', 'error'); return; }
  const overlay = document.getElementById('playerOverlay');
  const header  = document.getElementById('playerHeader');
  const body    = document.getElementById('playerBody');
  const info    = document.getElementById('playerInfo');
  overlay.classList.add('show');
  header.textContent = `${badge || '📡'} ${title}`;
  info.innerHTML = `<div style="font-size:12px;color:var(--text3);padding-top:4px">● Live streaming — quality may vary by region</div>`;

  body.innerHTML = `<div style="position:relative;background:#000">
    <div id="liveLoading" style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;background:#080c14;z-index:2">
      <div class="spinner"></div>
      <div style="color:var(--text3);font-size:13px">Connecting to stream…</div>
    </div>
    <video id="livePlayer" controls autoplay playsinline
      style="width:100%;max-height:62vh;display:block;background:#000;opacity:0;transition:opacity 0.4s">
    </video>
  </div>`;

  const video = document.getElementById('livePlayer');
  const loading = document.getElementById('liveLoading');

  function showPlayer() { if (loading) loading.style.display = 'none'; video.style.opacity = '1'; }
  video.addEventListener('playing', showPlayer);
  video.addEventListener('loadeddata', showPlayer);
  setTimeout(showPlayer, 8000);

  const isHLS = streamUrl.includes('.m3u8') || streamUrl.includes('m3u');
  if (isHLS && window.Hls && Hls.isSupported()) {
    const hls = new Hls({ enableWorker: true, lowLatencyMode: true });
    hls.loadSource(streamUrl);
    hls.attachMedia(video);
    hls.on(Hls.Events.MANIFEST_PARSED, () => video.play().catch(() => {}));
    hls.on(Hls.Events.ERROR, (e, d) => {
      if (d.fatal) { loading.innerHTML = `<div style="color:var(--text3);font-size:14px;text-align:center">⚠️ Stream unavailable<br><span style="font-size:11px;opacity:0.6">Try another channel</span></div>`; }
    });
    video._hls = hls;
  } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
    video.src = streamUrl;
    video.play().catch(() => {});
  } else {
    video.src = streamUrl;
    video.play().catch(() => {});
  }
};

// ===== SERIES & SHOWS PAGE =====
const SHOW_GENRES = ['Drama','Action','Comedy','Thriller','Crime','Fantasy','Sci-Fi','Animation','Mystery','Romance','Horror','Documentary'];

async function renderShows() {
  setApp(`<div style="margin-top:64px">${heroHtml(6)}</div>

  <div class="home-genre-bar">
    <div class="home-genre-label">Browse Shows by Genre</div>
    <div class="home-genre-pills" id="showGenrePills">
      <span class="hg-pill active" onclick="setShowGenre('',this)">All Genres</span>
      ${SHOW_GENRES.map(g => `<span class="hg-pill" onclick="setShowGenre('${g}',this)">${genreIcon(g)} ${g}</span>`).join('')}
    </div>
  </div>

  <div class="section"><div class="section-header"><h2 class="section-title">🔥 Trending Shows</h2><a class="section-more" href="/browse" onclick="navigate('/browse');return false;">Browse All →</a></div>${makeRow('showsTrendRow', skeletonRow())}</div>
  <div class="section" id="showsGenreSection"><div class="section-header"><h2 class="section-title" id="showsGenreTitle">🎭 Drama Series</h2></div>${makeRow('showsGenreRow', skeletonRow())}</div>
  <div class="section"><div class="section-header"><h2 class="section-title">😂 Comedy Shows</h2></div>${makeRow('showsComedyRow', skeletonRow())}</div>
  <div class="section"><div class="section-header"><h2 class="section-title">⚔️ Action &amp; Adventure</h2></div>${makeRow('showsActionRow', skeletonRow())}</div>
  <div class="section"><div class="section-header"><h2 class="section-title">🔍 Crime &amp; Thriller</h2></div>${makeRow('showsCrimeRow', skeletonRow())}</div>
  ${renderFooter()}`);

  const [trending, drama, comedy, action, crime] = await Promise.all([
    api('trending', { page: 0, perPage: 18 }),
    api('browse', { subjectType: 2, genre: 'Drama', page: 1, perPage: 18 }),
    api('browse', { subjectType: 2, genre: 'Comedy', page: 1, perPage: 18 }),
    api('browse', { subjectType: 2, genre: 'Action', page: 1, perPage: 18 }),
    api('browse', { subjectType: 2, genre: 'Crime', page: 1, perPage: 18 }),
  ]);

  const trendShows = (trending?.data?.subjectList || []).filter(x => x.subjectType === 2);
  const dramaItems = drama?.data?.subjectList || drama?.data?.items || [];
  const comedyItems = comedy?.data?.subjectList || comedy?.data?.items || [];
  const actionItems = action?.data?.subjectList || action?.data?.items || [];
  const crimeItems = crime?.data?.subjectList || crime?.data?.items || [];

  // Hero uses drama shows for variety
  const heroList = dramaItems.length ? dramaItems.slice(0, 6) : trendShows.slice(0, 6);
  if (heroList.length) buildHero(heroList);

  fill('showsTrendRow', trendShows.length ? trendShows.map(makeCard).join('') : dramaItems.slice(0, 10).map(makeCard).join(''));
  fill('showsGenreRow', dramaItems.map(makeCard).join('') || emptyHtml('🎭', 'No drama shows found'));
  fill('showsComedyRow', comedyItems.map(makeCard).join('') || emptyHtml('😂', 'No comedy shows found'));
  fill('showsActionRow', actionItems.map(makeCard).join('') || emptyHtml('⚔️', 'No action shows found'));
  fill('showsCrimeRow', crimeItems.map(makeCard).join('') || emptyHtml('🔍', 'No crime shows found'));
}

window.setShowGenre = async function(genre, el) {
  document.querySelectorAll('#showGenrePills .hg-pill').forEach(p => p.classList.remove('active'));
  el.classList.add('active');

  const title = document.getElementById('showsGenreTitle');
  if (title) title.textContent = genre ? `${genreIcon(genre)} ${genre} Series` : '🎭 All Shows';

  fill('showsGenreRow', skeletonRow());

  const params = { subjectType: 2, page: 1, perPage: 18 };
  if (genre) params.genre = genre;
  const data = await api('browse', params);
  const items = data?.data?.subjectList || data?.data?.items || [];
  fill('showsGenreRow', items.map(makeCard).join('') || emptyHtml('📺', `No ${genre || ''} shows found`));
};

// ===== STAFF / ACTOR PAGE =====
async function renderStaff(staffId) {
  setApp(`<div class="spinner-wrap" style="min-height:80vh"><div class="spinner"></div></div>`);

  const [detail, works, related] = await Promise.all([
    api('staff/detail', { staffId }),
    api('staff/works', { staffId, page: 1, perPage: 20 }),
    api('staff/related', { staffId }),
  ]);

  const d = detail?.data;
  if (!d) {
    setApp(emptyHtml('⚠️', 'Could not load profile', 'Please try again later', true));
    return;
  }

  const workItems = works?.data?.subjectList || works?.data?.list || [];
  const relatedPeople = related?.data?.staffList || related?.data?.list || [];

  setApp(`
  <div class="staff-hero">
    <div class="staff-hero-bg" style="background-image:url('${d.avatar?.url||d.avatarUrl||''}')"></div>
    <div class="staff-hero-grad"></div>
    <div class="staff-content">
      <div class="staff-avatar">
        ${d.avatar?.url || d.avatarUrl
          ? `<img src="${d.avatar?.url||d.avatarUrl}" alt="${esc(d.name)}" />`
          : `<div class="staff-avatar-placeholder">🎭</div>`}
      </div>
      <div class="staff-info">
        <h1 class="staff-name">${esc(d.name)}</h1>
        <div class="detail-badges" style="margin-top:12px">
          ${d.birthDate ? `<span class="detail-badge db-year">🎂 ${d.birthDate}</span>` : ''}
          ${d.birthPlace ? `<span class="detail-badge db-country">📍 ${esc(d.birthPlace)}</span>` : ''}
          ${d.nationality ? `<span class="detail-badge db-type">${esc(d.nationality)}</span>` : ''}
        </div>
        ${d.description ? `<p class="detail-desc" style="margin-top:16px">${esc(d.description)}</p>` : ''}
      </div>
    </div>
  </div>

  <div class="detail-body">
    ${workItems.length ? `
    <div class="section">
      <div class="section-header"><h3 class="section-title">🎬 Known For</h3></div>
      ${makeRow('staffWorksRow', workItems.map(makeCard).join(''))}
    </div>` : ''}

    ${relatedPeople.length ? `
    <div class="section">
      <div class="section-header"><h3 class="section-title">👥 Related People</h3></div>
      <div class="cast-row">${relatedPeople.map(p => `
        <div class="cast-card" onclick="navigate('/staff/${p.staffId}')">
          <img class="cast-avatar" src="${p.avatar?.url||p.avatarUrl||''}" alt="${esc(p.name)}" onerror="this.style.opacity='0'" loading="lazy" />
          <div class="cast-name">${esc(p.name)}</div>
          <div class="cast-role">${esc(p.role||p.character||'')}</div>
        </div>`).join('')}
      </div>
    </div>` : ''}
  </div>
  ${renderFooter()}`);
}

// ===== BROWSE / MOVIES =====
let bs = { type: 1, genre: '', country: '', page: 1 };

async function renderBrowse(forceType = null) {
  if (forceType !== null) { bs.type = forceType; bs.genre = ''; bs.country = ''; }
  bs.page = 1;

  const title = bs.type === 1 ? '🎬 Movies' : bs.type === 2 ? '📺 TV Shows' : '🎞 Browse All';

  setApp(`
  <div class="page-header fade-up">
    <h1 class="page-title">${title}</h1>
    <p class="page-subtitle">Discover your next favourite</p>
  </div>

  <div class="pill-section">
    <div class="pill-label">Type</div>
    <div class="pill-row" id="typeRow">
      <span class="pill${bs.type===1?' active':''}" onclick="setBrowseType(1,this)">Movies</span>
      <span class="pill${bs.type===2?' active':''}" onclick="setBrowseType(2,this)">TV Shows</span>
      <span class="pill${bs.type===0?' active':''}" onclick="setBrowseType(0,this)">All</span>
    </div>

    <div class="pill-label">Genre</div>
    <div class="pill-row" id="genreRow">
      <span class="pill${!bs.genre?' active':''}" onclick="setBrowseGenre('',this)">All</span>
      ${GENRES.map(g => `<span class="pill${bs.genre===g?' active':''}" onclick="setBrowseGenre('${g}',this)">${genreIcon(g)} ${g}</span>`).join('')}
    </div>

    <div class="pill-label">Country</div>
    <div class="pill-row" id="countryRow">
      <span class="pill${!bs.country?' active':''}" onclick="setBrowseCountry('',this)">All</span>
      ${COUNTRIES.map(c => `<span class="pill${bs.country===c?' active':''}" onclick="setBrowseCountry('${c}',this)">${c}</span>`).join('')}
    </div>
  </div>

  <div class="section">
    <div id="browseGrid">${skeletonGrid()}</div>
    <div class="load-more-wrap" id="loadMoreWrap" style="display:none">
      <button class="load-more-btn" id="loadMoreBtn" onclick="loadMoreBrowse()">Load More</button>
    </div>
  </div>
  ${renderFooter()}`);

  await fetchBrowse(true);
}

window.setBrowseType = function(type, el) {
  bs.type = type; bs.genre = ''; bs.country = ''; bs.page = 1;
  updatePills('typeRow', el);
  document.querySelectorAll('#genreRow .pill').forEach((p,i) => p.classList.toggle('active', i===0));
  document.querySelectorAll('#countryRow .pill').forEach((p,i) => p.classList.toggle('active', i===0));
  fetchBrowse(true);
};

window.setBrowseGenre = function(genre, el) {
  bs.genre = genre; bs.page = 1;
  updatePills('genreRow', el);
  fetchBrowse(true);
};

window.setBrowseCountry = function(country, el) {
  bs.country = country; bs.page = 1;
  updatePills('countryRow', el);
  fetchBrowse(true);
};

function updatePills(rowId, activeEl) {
  document.querySelectorAll(`#${rowId} .pill`).forEach(p => p.classList.remove('active'));
  activeEl.classList.add('active');
}

window.loadMoreBrowse = async function() {
  const btn = document.getElementById('loadMoreBtn');
  if (btn) { btn.textContent = 'Loading...'; btn.disabled = true; }
  bs.page++;
  await fetchBrowse(false);
  if (btn) { btn.textContent = 'Load More'; btn.disabled = false; }
};

async function fetchBrowse(reset) {
  const grid = document.getElementById('browseGrid');
  const lmw = document.getElementById('loadMoreWrap');
  if (!grid) return;
  if (reset) grid.innerHTML = skeletonGrid();

  let items = [];
  if (bs.genre || bs.country) {
    const p = { page: bs.page, perPage: 24 };
    if (bs.type) p.subjectType = bs.type;
    if (bs.genre) p.genre = bs.genre;
    if (bs.country) p.countryName = bs.country;
    const data = await api('browse', p);
    items = data?.data?.subjectList || data?.data?.items || [];
  } else {
    const data = await api('ranking');
    items = data?.data?.subjectList || [];
    if (bs.type) items = items.filter(x => !x.subjectType || x.subjectType === bs.type);
  }

  if (reset) {
    grid.innerHTML = items.length
      ? `<div class="cards-grid fade-in">${items.map(makeCard).join('')}</div>`
      : emptyHtml('🔍', 'Nothing found', 'Try a different genre or country');
  } else {
    const cg = grid.querySelector('.cards-grid');
    if (cg) cg.insertAdjacentHTML('beforeend', items.map(makeCard).join(''));
  }
  if (lmw) lmw.style.display = (items.length >= 24 && (bs.genre || bs.country)) ? 'flex' : 'none';
}

// ===== SEARCH =====
let sq = '', sp = 1, stype = '';

async function renderSearch(q) {
  sq = q; sp = 1; stype = '';
  setApp(`
  <div class="page-header fade-up">
    <h1 class="page-title">🔍 "${esc(q)}"</h1>
    <p class="page-subtitle">Search results</p>
  </div>
  <div class="pill-section" style="margin-bottom:8px">
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
  if (btn) { btn.textContent = 'Loading...'; btn.disabled = true; }
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
      : emptyHtml('🔍', 'No results found', `Try a different keyword`);
  } else {
    const cg = grid.querySelector('.cards-grid');
    if (cg) cg.insertAdjacentHTML('beforeend', items.map(makeCard).join(''));
  }
  if (lmw) lmw.style.display = items.length >= 24 ? 'flex' : 'none';
}

// ===== DETAIL (watch page) =====
async function renderDetail(id) {
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
        <div class="skeleton" style="width:90%;height:12px;border-radius:4px;margin-bottom:7px"></div>
        <div class="skeleton" style="width:75%;height:12px;border-radius:4px"></div>
      </div>
    </div>
  </div>`);

  const [detail, rec] = await Promise.all([
    api('rich-detail', { subjectId: id }),
    api('recommend', { subjectId: id, page: 1, perPage: 14 }),
  ]);

  if (!detail?.success || !detail?.data) {
    setApp(emptyHtml('⚠️', 'Could not load title', 'Please try again later', true));
    return;
  }

  const d = detail.data;
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
            <svg width="13" height="13" fill="#fbbf24" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
            ${rating} IMDb</span>` : ''}
          ${year ? `<span class="watch-meta-pill">${year}</span>` : ''}
          ${dur ? `<span class="watch-meta-pill">${dur}</span>` : ''}
          ${d.countryName ? `<span class="watch-meta-pill">${esc(d.countryName)}</span>` : ''}
          <span class="watch-meta-pill ${isShow ? 'pill-show' : 'pill-movie'}">${isShow ? 'TV Show' : 'Movie'}</span>
        </div>
        ${genres.length ? `<div class="watch-genres">${genres.map(g => `<span class="watch-genre" onclick="navigate('/browse');setBrowseGenre('${g}',event.target)">${g}</span>`).join('')}</div>` : ''}
        ${d.description ? `<p class="watch-desc">${esc(d.description)}</p>` : ''}
      </div>
      <div class="watch-info-poster">
        ${d.cover?.url
          ? `<img src="${d.cover.url}" alt="${esc(d.title)}" onerror="this.style.display='none'" />`
          : `<div class="watch-poster-placeholder">🎬</div>`}
      </div>
    </div>`;
  }

  const watchData = await streamCache.get(id);
  const embed = document.getElementById('watchPlayerEmbed');
  const controls = document.getElementById('watchControls');
  if (embed && controls) renderWatchPlayer(embed, controls, id, d.title, watchData, isShow);

  const page = document.querySelector('.watch-page');
  if (!page) return;

  if (isShow && seasons.length) {
    page.insertAdjacentHTML('beforeend', `
    <div class="watch-section">
      <div class="section-header"><h3 class="section-title">Episodes</h3></div>
      <div class="seasons-tabs">
        ${seasons.map((s, i) => `<button class="season-tab${i===0?' active':''}" onclick="loadSeason('${id}','${s.seasonId||s.id||id}',this)">Season ${s.index||i+1}</button>`).join('')}
      </div>
      <div id="episodesGrid" class="episodes-grid">
        <div class="spinner-wrap" style="min-height:140px"><div class="spinner"></div></div>
      </div>
    </div>`);
    loadSeasonEpisodes(id, seasons[0].seasonId || seasons[0].id || id);
  }

  if (cast.length) {
    page.insertAdjacentHTML('beforeend', `
    <div class="watch-section">
      <div class="section-header"><h3 class="section-title">Cast &amp; Crew</h3></div>
      <div class="cast-row">${cast.map(p => `
        <div class="cast-card" onclick="navigate('/staff/${p.staffId}')" style="cursor:pointer">
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

function renderWatchPlayer(embed, controls, subjectId, title, watchData, isShow) {
  if (!watchData?.success) {
    embed.innerHTML = `<div class="watch-player-error"><div class="wpe-icon">🎬</div><p>Stream unavailable</p></div>`;
    controls.innerHTML = '';
    return;
  }

  const { vidsrcUrl, aoneUrl, previewUrl, tracks } = watchData;
  const embedServers = watchData.servers && watchData.servers.length ? watchData.servers : (vidsrcUrl ? [{ label: 'Server 1', url: vidsrcUrl }] : []);

  if (embedServers.length) {
    const firstUrl = embedServers[0].url;
    embed.innerHTML = `
    <div style="position:relative;background:#000;line-height:0">
      <div id="vsLoading" style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;background:#0a0a0f;z-index:2">
        <div class="spinner"></div>
        <div style="color:var(--text3);font-size:13px">Loading player…</div>
      </div>
      <iframe id="vidsrcFrame"
        src="${esc(firstUrl)}"
        allowfullscreen
        allow="autoplay; fullscreen; picture-in-picture; encrypted-media; screen-wake-lock; screen-orientation"
        referrerpolicy="no-referrer-when-downgrade"
        scrolling="no"
        style="width:100%;aspect-ratio:16/9;border:none;display:block;background:#000;opacity:0;transition:opacity 0.4s">
      </iframe>
    </div>`;

    const iframe = document.getElementById('vidsrcFrame');
    const loading = document.getElementById('vsLoading');
    iframe.addEventListener('load', () => { if (loading) loading.style.display = 'none'; iframe.style.opacity = '1'; });
    setTimeout(() => { if (loading) loading.style.display = 'none'; iframe.style.opacity = '1'; }, 10000);

    const serverBtns = embedServers.map((s, i) =>
      `<button class="watch-srv-btn${i===0?' active':''}" onclick="switchVidsrcServer('${esc(s.url)}',this)">${esc(s.label)}</button>`
    ).join('');

    const dubBtns = tracks && tracks.length > 1
      ? `<div class="watch-ctrl-divider"></div>
         <div class="watch-ctrl-group">
           <span class="watch-ctrl-label">Language</span>
           ${tracks.map(t => `<button class="watch-srv-btn${t.original?' active':''}" onclick="switchDubLink('${esc(t.aoneUrl||aoneUrl||'')}',this)">${esc(t.label)}</button>`).join('')}
         </div>`
      : '';

    controls.innerHTML = `
      <div class="watch-ctrl-group">
        <span class="watch-ctrl-label">Server</span>
        ${serverBtns}
      </div>
      ${dubBtns}
      <div class="watch-ctrl-end">
        ${aoneUrl ? `<a class="watch-srv-btn" href="${esc(aoneUrl)}" target="_blank" rel="noopener">↗ aOneRoom</a>` : ''}
        ${previewUrl ? `<button class="watch-srv-btn" onclick="switchWatchToPreview('${esc(previewUrl)}')">▶ Trailer</button>` : ''}
      </div>`;
    return;
  }

  if (previewUrl) {
    embed.innerHTML = `<video id="videoPlayer" controls autoplay playsinline
      style="width:100%;aspect-ratio:16/9;display:block;background:#000">
      <source src="${esc(previewUrl)}" type="video/mp4" />
    </video>`;
  } else {
    embed.innerHTML = `<div class="watch-player-error">
      <div class="wpe-icon">🎬</div>
      <p>No stream found</p>
      ${aoneUrl ? `<a class="btn-play" href="${esc(aoneUrl)}" target="_blank" rel="noopener" style="display:inline-flex;margin-top:16px">
        <svg width="16" height="16" fill="white" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>Watch on aOneRoom</a>` : ''}
    </div>`;
  }

  controls.innerHTML = aoneUrl ? `
    <div class="watch-ctrl-group">
      <span class="watch-ctrl-label">Watch full ${isShow?'show':'movie'} on</span>
      <a class="watch-srv-btn active" href="${esc(aoneUrl)}" target="_blank" rel="noopener">↗ aOneRoom</a>
    </div>` : '';
}

window.switchWatchToPreview = function(url) {
  const embed = document.getElementById('watchPlayerEmbed');
  if (!embed) return;
  embed.innerHTML = `<video id="videoPlayer" controls autoplay playsinline
    style="width:100%;aspect-ratio:16/9;display:block;background:#000">
    <source src="${esc(url)}" type="video/mp4" />
  </video>`;
};

window.loadSeason = function(subjectId, seasonId, btn) {
  document.querySelectorAll('.season-tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  fill('episodesGrid', `<div class="spinner-wrap" style="min-height:140px"><div class="spinner"></div></div>`);
  loadSeasonEpisodes(subjectId, seasonId);
};

async function loadSeasonEpisodes(subjectId, seasonId) {
  const data = await api('play', { subjectId: seasonId || subjectId });
  const episodes = data?.data?.episodeList || data?.data?.episodes || [];
  const grid = document.getElementById('episodesGrid');
  if (!grid) return;
  if (!episodes.length) { grid.innerHTML = emptyHtml('📺', 'No episodes found'); return; }
  grid.innerHTML = `<div class="episodes-grid fade-in">${episodes.map(ep => `
  <div class="episode-card" onclick="openPlayerEpisode('${ep.subjectId||ep.id}','${esc(ep.title||'Episode')}')" onmouseenter="prefetchStream('${ep.subjectId||ep.id}')">
    ${ep.cover?.url ? `<img class="ep-thumb" src="${ep.cover.url}" alt="" onerror="this.style.background='var(--bg3)'" loading="lazy" />` : `<div class="ep-thumb" style="background:var(--bg3);display:flex;align-items:center;justify-content:center;font-size:20px">🎬</div>`}
    <div class="ep-info">
      <div class="ep-num">Episode ${ep.index||ep.episode||''}</div>
      <div class="ep-title">${esc(ep.title||'Episode')}</div>
      <div class="ep-desc">${esc(ep.description||'')}</div>
    </div>
    <div class="ep-play-icon">
      <svg width="14" height="14" fill="white" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
    </div>
  </div>`).join('')}</div>`;
}

// ===== PLAYER =====
const streamCache = new Map();

function prefetchStream(subjectId) {
  if (!subjectId || streamCache.has(subjectId)) return;
  streamCache.set(subjectId, fetch(`/proxy/watch?subjectId=${subjectId}`).then(r => r.json()));
}

window.prefetchStream = prefetchStream;
window.openPlayerEpisode = (id, title) => openPlayer(id, title, false);

window.openPlayer = async function(subjectId, title) {
  const overlay = document.getElementById('playerOverlay');
  const header  = document.getElementById('playerHeader');
  const body    = document.getElementById('playerBody');
  const info    = document.getElementById('playerInfo');

  overlay.classList.add('show');
  header.textContent = title;
  info.innerHTML = '';
  body.innerHTML = `<div class="player-loading-bar"><div class="plb-inner"></div></div>`;

  if (!streamCache.has(subjectId)) prefetchStream(subjectId);

  const watchData = await streamCache.get(subjectId);
  renderPlayerContent(body, info, subjectId, title, watchData);
};

function renderPlayerContent(body, info, subjectId, title, watchData) {
  if (!watchData?.success) {
    body.innerHTML = playerError('Could not load this title.', 'https://www.aoneroom.com/search');
    return;
  }

  const { vidsrcUrl, aoneUrl, previewUrl, tracks, imdbId, isShow } = watchData;
  const embedServers = watchData.servers && watchData.servers.length ? watchData.servers : (vidsrcUrl ? [{ label: 'Server 1', url: vidsrcUrl }] : []);

  if (!embedServers.length && !aoneUrl && !previewUrl) {
    body.innerHTML = playerError('No stream found for this title.', 'https://www.aoneroom.com');
    return;
  }

  if (embedServers.length) {
    const firstUrl = embedServers[0].url;
    body.innerHTML = `
      <div style="position:relative;background:#000;line-height:0">
        <div id="vsLoading" style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;background:#0d1117;z-index:2">
          <div class="spinner"></div>
          <div style="color:var(--text3);font-size:13px">Loading player…</div>
        </div>
        <iframe id="vidsrcFrame"
          src="${esc(firstUrl)}"
          allowfullscreen
          allow="autoplay; fullscreen; picture-in-picture; encrypted-media; screen-wake-lock; screen-orientation"
          referrerpolicy="no-referrer-when-downgrade"
          scrolling="no"
          style="width:100%;height:64vh;border:none;display:block;background:#000;opacity:0;transition:opacity 0.4s">
        </iframe>
      </div>`;

    const iframe = document.getElementById('vidsrcFrame');
    const loading = document.getElementById('vsLoading');
    iframe.addEventListener('load', () => { if (loading) loading.style.display = 'none'; iframe.style.opacity = '1'; });
    setTimeout(() => { if (loading) loading.style.display = 'none'; iframe.style.opacity = '1'; }, 10000);

    const serverBtns = embedServers.map((s, i) =>
      `<button class="stream-btn${i===0?' active':''}" onclick="switchVidsrcServer('${esc(s.url)}',this)">${esc(s.label)}</button>`
    ).join('');

    const dubBtns = tracks && tracks.length > 1
      ? `<div class="player-section-label" style="margin-top:14px">Language / Dubs</div>
         <div class="player-streams" style="flex-wrap:wrap">
           ${tracks.map(t => `<button class="stream-btn${t.original?' active':''}" onclick="switchDubLink('${esc(t.aoneUrl||aoneUrl||'')}',this)">${esc(t.label)}</button>`).join('')}
         </div>`
      : '';

    info.innerHTML = `
      <div class="player-section-label">Stream Server</div>
      <div class="player-streams">${serverBtns}</div>
      ${dubBtns}
      <div class="player-trailer-bar" style="margin-top:14px;flex-wrap:wrap;gap:8px">
        ${aoneUrl ? `<a class="stream-btn" href="${esc(aoneUrl)}" target="_blank" rel="noopener">↗ aOneRoom</a>` : ''}
        ${previewUrl ? `<button class="stream-btn" onclick="switchToPreview('${esc(previewUrl)}')">▶ Preview Clip</button>` : ''}
      </div>`;
    return;
  }

  if (previewUrl) {
    body.innerHTML = `<video id="videoPlayer" controls autoplay playsinline
      style="width:100%;max-height:56vh;display:block;background:#000">
      <source src="${esc(previewUrl)}" type="video/mp4" />
    </video>`;
  } else {
    body.innerHTML = `<div style="height:40px"></div>`;
  }

  info.innerHTML = `
    <div class="watch-full-bar">
      <div class="watch-full-left">
        <div class="watch-full-label">${previewUrl ? '▶ Playing preview clip' : '🎬 ' + esc(title)}</div>
        <div class="watch-full-sub">Watch the full movie on aOneRoom — free, no sign-up needed</div>
      </div>
      ${aoneUrl ? `<a class="btn-play watch-full-btn" href="${esc(aoneUrl)}" target="_blank" rel="noopener">
        <svg width="18" height="18" fill="white" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
        Watch Full Movie
      </a>` : ''}
    </div>`;
}

window.switchVidsrcServer = function(url, btn) {
  btn.closest('.watch-ctrl-group, .player-streams')
    ?.querySelectorAll('.watch-srv-btn, .stream-btn')
    .forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const iframe = document.getElementById('vidsrcFrame');
  const loading = document.getElementById('vsLoading');
  if (!iframe) return;
  if (loading) {
    loading.style.display = 'flex';
    loading.innerHTML = `<div class="spinner"></div><div style="color:var(--text3);font-size:13px">Switching server…</div>`;
  }
  iframe.style.opacity = '0';

  if (iframe._switchTimeout) clearTimeout(iframe._switchTimeout);
  const onLoad = () => {
    if (loading) loading.style.display = 'none';
    iframe.style.opacity = '1';
    iframe.removeEventListener('load', onLoad);
    if (iframe._switchTimeout) clearTimeout(iframe._switchTimeout);
  };
  iframe.addEventListener('load', onLoad);
  iframe._switchTimeout = setTimeout(onLoad, 15000);
  iframe.src = url;
};

window.switchDubLink = function(url, btn) {
  if (!url) return;
  document.querySelectorAll('.player-streams .stream-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  window.open(url, '_blank', 'noopener');
};

window.switchToPreview = function(url) {
  const body = document.getElementById('playerBody');
  if (!body) return;
  body.innerHTML = `<video id="videoPlayer" controls autoplay playsinline
    style="width:100%;max-height:64vh;display:block;background:#000">
    <source src="${esc(url)}" type="video/mp4" />
  </video>`;
};

function playerError(msg, link) {
  return `<div class="player-error">
    <div class="icon">🎬</div>
    <h3>Stream unavailable</h3>
    <p style="margin-bottom:20px;font-size:14px">${msg}</p>
    <a class="btn-play" href="${link}" target="_blank" rel="noopener" style="display:inline-flex">
      <svg width="16" height="16" fill="white" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
      Browse on aOneRoom
    </a>
  </div>`;
}

document.getElementById('playerClose').onclick = () => {
  if (document.fullscreenElement) document.exitFullscreen();
  document.getElementById('playerOverlay').classList.remove('show');
  const vid = document.getElementById('videoPlayer') || document.getElementById('livePlayer');
  if (vid) {
    if (vid._hls) { vid._hls.destroy(); vid._hls = null; }
    vid.pause(); vid.src = '';
  }
};
document.getElementById('playerOverlay').addEventListener('click', e => {
  if (e.target === e.currentTarget) document.getElementById('playerClose').click();
});

// ── Fullscreen button ──
const fsBtn = document.getElementById('playerFullscreenBtn');
const fsIconExpand = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>`;
const fsIconCompress = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/><line x1="10" y1="14" x2="3" y2="21"/><line x1="21" y1="3" x2="14" y2="10"/></svg>`;

fsBtn.addEventListener('click', () => {
  const container = document.getElementById('playerContainer');
  if (!document.fullscreenElement) {
    const req = container.requestFullscreen || container.webkitRequestFullscreen || container.mozRequestFullScreen;
    if (req) {
      req.call(container).then(() => {
        if (screen.orientation && screen.orientation.lock) {
          screen.orientation.lock('landscape').catch(() => {});
        }
      }).catch(() => {});
    }
  } else {
    if (screen.orientation && screen.orientation.unlock) screen.orientation.unlock();
    const exit = document.exitFullscreen || document.webkitExitFullscreen || document.mozCancelFullScreen;
    if (exit) exit.call(document);
  }
});

document.addEventListener('fullscreenchange', updateFsIcon);
document.addEventListener('webkitfullscreenchange', updateFsIcon);
document.addEventListener('mozfullscreenchange', updateFsIcon);

function updateFsIcon() {
  fsBtn.innerHTML = document.fullscreenElement ? fsIconCompress : fsIconExpand;
  fsBtn.setAttribute('aria-label', document.fullscreenElement ? 'Exit Fullscreen' : 'Fullscreen');
  if (!document.fullscreenElement) {
    if (screen.orientation && screen.orientation.unlock) screen.orientation.unlock();
  }
}

// Double-click video to toggle fullscreen
document.getElementById('playerBody').addEventListener('dblclick', () => fsBtn.click());

// ===== FOOTER =====
function renderFooter() {
  return `<footer>
    <div class="footer-logo">
      <span style="font-size:20px">❄</span>
      <span style="font-size:15px;font-weight:800">Blue<span style="color:var(--ice)">Blizzard</span> FreeFlix</span>
    </div>
    <div class="footer-links">
      <a class="footer-link" href="/" onclick="navigate('/');return false;">Home</a>
      <a class="footer-link" href="/movies" onclick="navigate('/movies');return false;">Movies</a>
      <a class="footer-link" href="/shows" onclick="navigate('/shows');return false;">Series &amp; Shows</a>
      <a class="footer-link" href="/trending" onclick="navigate('/trending');return false;">Trending</a>
      <a class="footer-link" href="/browse" onclick="navigate('/browse');return false;">Browse</a>
      <a class="footer-link" href="/live" onclick="navigate('/live');return false;">Live TV</a>
      <a class="footer-link" href="/new" onclick="navigate('/new');return false;">New Arrivals</a>
    </div>
    <span class="footer-copy">© 2026 BlueBlizzard FreeFlix</span>
  </footer>`;
}

// ===== EMPTY STATE =====
function emptyHtml(icon, title, sub = '', pad = false) {
  return `<div class="empty-state"${pad ? ' style="margin-top:80px"' : ''}><div class="empty-icon">${icon}</div><div class="empty-title">${title}</div>${sub ? `<div class="empty-text">${sub}</div>` : ''}</div>`;
}

// ===== INTERCEPT CLICKS =====
document.addEventListener('click', e => {
  const a = e.target.closest('a[href]');
  if (!a) return;
  const href = a.getAttribute('href');
  if (href?.startsWith('/') && !href.startsWith('//')) { e.preventDefault(); navigate(href); }
});

// ===== KEYBOARD SHORTCUTS =====
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') document.getElementById('playerClose').click();
  if (e.key === '/' && !e.target.closest('input')) { e.preventDefault(); searchInput.focus(); }
});

// ===== INIT =====
router();
