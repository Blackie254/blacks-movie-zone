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
  if (page === 'search') return renderSearch(new URLSearchParams(location.search).get('q') || '');
  if (page === 'movies') return renderBrowse(1);
  if (page === 'shows') return renderBrowse(2);
  if (page === 'trending') return renderTrending();
  if (page === 'browse') return renderBrowse(0);
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

// ===== FETCH =====
async function api(endpoint, params = {}) {
  const q = new URLSearchParams(params).toString();
  const url = `${API}/${endpoint}${q ? '?' + q : ''}`;
  try { const r = await fetch(url); return r.json(); } catch { return { success: false }; }
}

// ===== APP CONTAINER =====
const app = document.getElementById('app');
function setApp(html) { app.innerHTML = html; }

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
  <div class="card" onclick="navigate('/detail/${item.subjectId}')">
    <div style="position:relative;overflow:hidden">
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
  el.querySelector('.hero-btn-play').onclick = () => navigate(`/detail/${item.subjectId}`);
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
async function renderHome() {
  setApp(`<div style="margin-top:64px">${heroHtml(6)}</div>
  <div class="section"><div class="section-header"><h2 class="section-title">🔥 Trending Now</h2></div>${makeRow('trendRow', skeletonRow())}</div>
  <div class="section"><div class="section-header"><h2 class="section-title">🏆 Rankings</h2></div><div class="rank-tabs" id="rankTabs"></div>${makeRow('rankCards', skeletonRow())}</div>
  <div class="section"><div class="section-header"><h2 class="section-title">🎬 Popular Movies</h2><a class="section-more" href="/movies" onclick="navigate('/movies');return false;">See All →</a></div>${makeRow('moviesRow', skeletonRow())}</div>
  <div class="section"><div class="section-header"><h2 class="section-title">📺 TV Shows</h2><a class="section-more" href="/shows" onclick="navigate('/shows');return false;">See All →</a></div>${makeRow('showsRow', skeletonRow())}</div>
  ${renderFooter()}`);

  const [trending, ranking, movies, shows] = await Promise.all([
    api('trending', { page: 0, perPage: 18 }),
    api('ranking'),
    api('browse', { subjectType: 1, genre: 'Action', page: 1, perPage: 18 }),
    api('browse', { subjectType: 2, genre: 'Drama', page: 1, perPage: 18 }),
  ]);

  const trendList = trending?.data?.subjectList || [];
  const rankTabs = ranking?.data?.rankingList || [];
  const rankItems = ranking?.data?.subjectList || [];
  const mItems = movies?.data?.subjectList || movies?.data?.items || [];
  const sItems = shows?.data?.subjectList || shows?.data?.items || [];

  if (trendList.length) buildHero(trendList.slice(0, 6));

  fill('trendRow', trendList.map(makeCard).join(''));
  fill('rankCards', rankItems.slice(0, 18).map(makeCard).join(''));
  fill('moviesRow', mItems.map(makeCard).join('') || emptyHtml('🎬', 'No movies yet'));
  fill('showsRow', sItems.map(makeCard).join('') || emptyHtml('📺', 'No shows yet'));

  const tabsEl = document.getElementById('rankTabs');
  if (tabsEl && rankTabs.length) {
    tabsEl.innerHTML = rankTabs.slice(0, 14).map((t, i) =>
      `<button class="rank-tab${i===0?' active':''}" onclick="loadRankTab('${t.id}',this)">${t.name}</button>`).join('');
  }
}

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
  const gridEl = app.querySelector('.cards-grid');
  if (gridEl) gridEl.outerHTML;
  app.querySelector('.section').innerHTML = items.length
    ? `<div class="cards-grid fade-in">${items.map(makeCard).join('')}</div>`
    : emptyHtml('🔥', 'Nothing trending right now');
}

// ===== BROWSE / MOVIES / SHOWS =====
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
      ${GENRES.map(g => `<span class="pill${bs.genre===g?' active':''}" onclick="setBrowseGenre('${g}',this)">${g}</span>`).join('')}
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
  // reset genre/country to All
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

// ===== DETAIL =====
async function renderDetail(id) {
  setApp(`<div class="spinner-wrap" style="min-height:80vh"><div class="spinner"></div></div>`);

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
  const bgUrl = d.stills?.url || d.cover?.url || '';
  const genres = (d.genre || '').split(',').map(g => g.trim()).filter(Boolean);
  const rating = d.imdbRatingValue;
  const year = d.releaseDate?.slice(0, 4) || '';
  const dur = d.duration ? `${Math.floor(d.duration / 60)}m` : '';
  const recItems = rec?.data?.subjectList || [];
  const seasons = d.seasonList || d.seasons || [];
  const cast = d.staffList || [];

  setApp(`
  <div class="detail-hero">
    <div class="detail-hero-bg" style="background-image:url('${bgUrl}')"></div>
    <div class="detail-hero-grad"></div>
    <div class="detail-content">
      <div class="detail-poster">
        ${d.cover?.url
          ? `<img src="${d.cover.url}" alt="${esc(d.title)}" onerror="this.style.display='none'" />`
          : `<div style="aspect-ratio:2/3;background:var(--bg3);display:flex;align-items:center;justify-content:center;font-size:52px">🎬</div>`}
      </div>
      <div class="detail-info">
        <h1 class="detail-title">${esc(d.title)}</h1>
        <div class="detail-badges">
          <span class="detail-badge db-type">${isShow ? 'TV Show' : 'Movie'}</span>
          ${year ? `<span class="detail-badge db-year">📅 ${year}</span>` : ''}
          ${rating ? `<span class="detail-badge db-rating">★ ${rating} IMDb</span>` : ''}
          ${d.countryName ? `<span class="detail-badge db-country">🌍 ${esc(d.countryName)}</span>` : ''}
          ${dur ? `<span class="detail-badge db-year">⏱ ${dur}</span>` : ''}
        </div>
        ${genres.length ? `<div class="detail-genres">${genres.map(g => `<span class="detail-genre" onclick="navigate('/browse');setBrowseGenre('${g}',event.target)">${g}</span>`).join('')}</div>` : ''}
        <p class="detail-desc">${esc(d.description || 'No description available.')}</p>
        <div class="detail-actions">
          <button class="btn-play" onclick="openPlayer('${id}','${esc(d.title)}',${isShow})">
            <svg width="18" height="18" fill="white" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
            Play Now
          </button>
          <button class="btn-info" onclick="toast('Added to watchlist! ✓','success')">＋ Watchlist</button>
        </div>
      </div>
    </div>
  </div>

  <div class="detail-body">
    ${cast.length ? `
    <div class="detail-cast">
      <div class="section-header"><h3 class="section-title">Cast &amp; Crew</h3></div>
      <div class="cast-row">
        ${cast.map(p => `
        <div class="cast-card">
          <img class="cast-avatar" src="${p.avatar?.url || p.avatarUrl || ''}" alt="${esc(p.name)}" onerror="this.style.opacity='0'" loading="lazy" />
          <div class="cast-name">${esc(p.name)}</div>
          <div class="cast-role">${esc(p.role || p.character || '')}</div>
        </div>`).join('')}
      </div>
    </div>` : ''}

    ${isShow && seasons.length ? `
    <div class="detail-seasons">
      <div class="section-header"><h3 class="section-title">Episodes</h3></div>
      <div class="seasons-tabs">
        ${seasons.map((s, i) => `<button class="season-tab${i===0?' active':''}" onclick="loadSeason('${id}','${s.seasonId||s.id||id}',this)">Season ${s.index||i+1}</button>`).join('')}
      </div>
      <div id="episodesGrid" class="episodes-grid">
        <div class="spinner-wrap" style="min-height:140px"><div class="spinner"></div></div>
      </div>
    </div>` : ''}

    ${!isShow ? `
    <div style="margin-bottom:40px">
      <div class="section-header"><h3 class="section-title">▶ Watch</h3></div>
      <button class="btn-play" onclick="openPlayer('${id}','${esc(d.title)}',false)" style="margin-bottom:0">
        <svg width="18" height="18" fill="white" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
        Play Movie
      </button>
    </div>` : ''}

    ${recItems.length ? `
    <div>
      <div class="section-header">
        <h3 class="section-title">You Might Also Like</h3>
      </div>
      ${makeRow('recRow', recItems.map(makeCard).join(''))}
    </div>` : ''}
  </div>
  ${renderFooter()}`);

  if (isShow && seasons.length) {
    loadSeasonEpisodes(id, seasons[0].seasonId || seasons[0].id || id);
  }
}

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
  <div class="episode-card" onclick="openPlayerEpisode('${ep.subjectId||ep.id}','${esc(ep.title||'Episode')}')">
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
window.openPlayerEpisode = (id, title) => openPlayer(id, title, false);

window.openPlayer = async function(subjectId, title, isShow) {
  const overlay = document.getElementById('playerOverlay');
  const header = document.getElementById('playerHeader');
  const body = document.getElementById('playerBody');
  const info = document.getElementById('playerInfo');

  overlay.classList.add('show');
  header.textContent = title;
  body.innerHTML = `<div class="spinner-wrap" style="min-height:320px"><div class="spinner"></div></div>`;
  info.innerHTML = '';

  const [streamData, playData] = await Promise.all([
    api('stream', { subjectId }),
    api('play', { subjectId }),
  ]);

  const streams = streamData?.data?.streamList || streamData?.data?.streams || [];
  const directUrl = playData?.data?.playUrl || playData?.data?.url;

  if (streams.length) {
    const validStreams = streams.filter(s => s.url || s.playUrl || s.streamUrl);
    if (validStreams.length) {
      const first = validStreams[0];
      const url = first.url || first.playUrl || first.streamUrl;
      body.innerHTML = `<video id="videoPlayer" controls autoplay playsinline style="width:100%;max-height:62vh;display:block;background:#000">
        <source src="${url}" type="video/mp4" />
      </video>`;
      if (validStreams.length > 1) {
        info.innerHTML = `<div style="font-size:12px;color:var(--text3);margin-bottom:8px;font-weight:700;text-transform:uppercase;letter-spacing:1px">Quality</div>
        <div class="player-streams">
          ${validStreams.map((s, i) => {
            const su = s.url || s.playUrl || s.streamUrl;
            return `<button class="stream-btn${i===0?' active':''}" onclick="switchStream('${su}',this)">${s.quality||s.resolution||('Stream '+(i+1))}</button>`;
          }).join('')}
        </div>`;
      }
      return;
    }
  }

  if (directUrl) {
    body.innerHTML = `<video id="videoPlayer" controls autoplay playsinline style="width:100%;max-height:62vh;display:block;background:#000">
      <source src="${directUrl}" type="video/mp4" />
    </video>`;
    return;
  }

  body.innerHTML = `<div class="player-error">
    <div class="icon">🎬</div>
    <h3>Stream requires authentication</h3>
    <p style="margin-bottom:20px;font-size:14px">This title's stream is protected. Open it directly in a new tab.</p>
    <a class="btn-play" href="https://movieapi.xcasper.space/api/bff/stream?subjectId=${subjectId}" target="_blank" rel="noopener" style="display:inline-flex">
      <svg width="16" height="16" fill="white" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
      Open Stream
    </a>
  </div>`;
};

window.switchStream = function(url, btn) {
  document.querySelectorAll('.stream-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const vid = document.getElementById('videoPlayer');
  if (vid) { vid.src = url; vid.play(); }
};

document.getElementById('playerClose').onclick = () => {
  document.getElementById('playerOverlay').classList.remove('show');
  const vid = document.getElementById('videoPlayer');
  if (vid) { vid.pause(); vid.src = ''; }
};
document.getElementById('playerOverlay').addEventListener('click', e => {
  if (e.target === e.currentTarget) document.getElementById('playerClose').click();
});

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
      <a class="footer-link" href="/shows" onclick="navigate('/shows');return false;">TV Shows</a>
      <a class="footer-link" href="/trending" onclick="navigate('/trending');return false;">Trending</a>
      <a class="footer-link" href="/browse" onclick="navigate('/browse');return false;">Browse</a>
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
