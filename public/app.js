/* ===== BlueBlizzard FreeFlix SPA ===== */

const API = '/proxy';
let currentPath = '';
let heroSlideIndex = 0;
let heroItems = [];
let heroTimer = null;

// ===== ROUTER =====
function router() {
  const path = location.pathname + location.search;
  if (path === currentPath) return;
  currentPath = path;
  highlightNav();

  const parts = location.pathname.split('/').filter(Boolean);
  const page = parts[0] || 'home';
  const id = parts[1];

  window.scrollTo(0, 0);

  if (page === 'detail' && id) return renderDetail(id);
  if (page === 'search') return renderSearch(new URLSearchParams(location.search).get('q') || '');
  if (page === 'movies') return renderBrowse(1);
  if (page === 'shows') return renderBrowse(2);
  if (page === 'trending') return renderTrending();
  if (page === 'browse') return renderBrowse();
  return renderHome();
}

function navigate(path) {
  history.pushState({}, '', path);
  router();
}

window.addEventListener('popstate', router);

function highlightNav() {
  const page = location.pathname.split('/')[1] || 'home';
  document.querySelectorAll('.nav-link').forEach(l => {
    l.classList.toggle('active', l.dataset.page === page);
  });
}

// ===== FETCH =====
async function api(endpoint, params = {}) {
  const q = new URLSearchParams(params).toString();
  const url = `${API}/${endpoint}${q ? '?' + q : ''}`;
  try {
    const res = await fetch(url);
    return res.json();
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// ===== TOAST =====
function toast(msg, type = 'info') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = `toast show ${type}`;
  clearTimeout(el._t);
  el._t = setTimeout(() => { el.className = 'toast'; }, 3200);
}

// ===== APP DIV =====
const app = document.getElementById('app');

// ===== NAVBAR SCROLL =====
window.addEventListener('scroll', () => {
  document.getElementById('navbar').classList.toggle('scrolled', scrollY > 60);
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
  suggestTimer = setTimeout(() => fetchSuggestions(q), 300);
});

searchInput.addEventListener('keydown', e => {
  if (e.key === 'Enter' && searchInput.value.trim()) doSearch(searchInput.value.trim());
});
searchBtn.addEventListener('click', () => { if (searchInput.value.trim()) doSearch(searchInput.value.trim()); });

document.addEventListener('click', e => {
  if (!e.target.closest('#searchWrap')) suggestBox.classList.remove('show');
});

async function fetchSuggestions(q) {
  const data = await api('search/suggest', { keyword: q });
  if (!data?.success || !data?.data?.subjectList?.length) { suggestBox.classList.remove('show'); return; }
  const items = data.data.subjectList.slice(0, 6);
  suggestBox.innerHTML = items.map(m => `
    <div class="suggest-item" onclick="goDetail('${m.subjectId}', event)">
      <img src="${m.cover?.url || ''}" alt="${m.title}" onerror="this.style.display='none'" />
      <div class="suggest-item-info">
        <div class="suggest-item-title">${m.title}</div>
        <div class="suggest-item-meta">${m.subjectType === 2 ? 'TV Show' : 'Movie'} · ${m.releaseDate?.slice(0,4) || ''}</div>
      </div>
    </div>`).join('');
  suggestBox.classList.add('show');
}

function doSearch(q) {
  suggestBox.classList.remove('show');
  searchInput.value = '';
  navigate(`/search?q=${encodeURIComponent(q)}`);
}

function goDetail(id, e) {
  if (e) e.preventDefault();
  suggestBox.classList.remove('show');
  navigate(`/detail/${id}`);
}

// ===== POSTER HELPERS =====
function posterImg(item, cls = 'card-poster') {
  const url = item.cover?.url;
  if (url) return `<img class="${cls}" src="${url}" alt="${item.title}" loading="lazy" onerror="this.parentElement.querySelector('.card-poster-placeholder')?.style.setProperty('display','flex'); this.style.display='none';" />
    <div class="card-poster-placeholder" style="display:none">🎬</div>`;
  return `<div class="card-poster-placeholder">🎬</div>`;
}

function ratingColor(r) {
  const n = parseFloat(r);
  if (n >= 8) return 'var(--green)';
  if (n >= 6) return 'var(--gold)';
  return 'var(--text3)';
}

function movieBadge(item) {
  const isNew = item.releaseDate && new Date(item.releaseDate) > new Date(Date.now() - 90 * 86400000);
  if (isNew) return `<span class="card-badge badge-new">New</span>`;
  if (item.subjectType === 2) return `<span class="card-badge badge-hd">TV</span>`;
  return `<span class="card-badge badge-hd">HD</span>`;
}

function makeCard(item) {
  const rating = item.imdbRatingValue;
  const year = item.releaseDate?.slice(0, 4) || '';
  const genre = (item.genre || '').split(',')[0];
  return `
  <div class="card" onclick="navigate('/detail/${item.subjectId}')">
    <div style="position:relative">
      ${posterImg(item)}
      ${movieBadge(item)}
      <div class="card-overlay">
        <div class="card-play-btn">
          <svg width="18" height="18" fill="white" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
        </div>
      </div>
    </div>
    <div class="card-info">
      <div class="card-title" title="${item.title}">${item.title}</div>
      <div class="card-meta">
        <span>${genre} ${year ? '· ' + year : ''}</span>
        ${rating ? `<span class="card-rating" style="color:${ratingColor(rating)}">★ ${rating}</span>` : ''}
      </div>
    </div>
  </div>`;
}

function makeWideCard(item) {
  const stillUrl = item.stills?.url || item.cover?.url;
  const rating = item.imdbRatingValue;
  const genre = (item.genre || '').split(',').slice(0, 2).join(' · ');
  return `
  <div class="wide-card" onclick="navigate('/detail/${item.subjectId}')">
    ${stillUrl ? `<img class="wide-card-img" src="${stillUrl}" alt="${item.title}" loading="lazy" onerror="this.style.background='var(--bg3)'" />` : `<div class="wide-card-img" style="background:var(--bg3)"></div>`}
    <div class="wide-card-info">
      <div class="wide-card-title">${item.title}</div>
      <div class="wide-card-meta">
        ${rating ? `<span style="color:${ratingColor(rating)}">★ ${rating}</span>` : ''}
        <span>${genre}</span>
      </div>
    </div>
  </div>`;
}

// ===== HERO =====
function buildHero(items) {
  heroItems = items;
  heroSlideIndex = 0;
  clearInterval(heroTimer);
  renderHeroSlide();
  if (items.length > 1) {
    heroTimer = setInterval(() => {
      heroSlideIndex = (heroSlideIndex + 1) % heroItems.length;
      renderHeroSlide();
    }, 7000);
  }
}

function renderHeroSlide() {
  const el = document.getElementById('heroSection');
  if (!el) return;
  const item = heroItems[heroSlideIndex];
  const bg = item.stills?.url || item.cover?.url || '';
  const rating = item.imdbRatingValue;
  const type = item.subjectType === 2 ? 'TV Show' : 'Movie';
  const year = item.releaseDate?.slice(0, 4) || '';
  const genres = (item.genre || '').split(',').slice(0, 3).join(' · ');

  el.querySelector('.hero-bg').style.backgroundImage = `url('${bg}')`;
  el.querySelector('.hero-title').textContent = item.title;
  el.querySelector('.badge-type').textContent = type;
  el.querySelector('.badge-rating').textContent = rating ? `★ ${rating}` : '';
  el.querySelector('.hero-meta').innerHTML = `
    ${year ? `<span>📅 ${year}</span>` : ''}
    ${genres ? `<span>🎭 ${genres}</span>` : ''}
    ${item.countryName ? `<span>🌍 ${item.countryName}</span>` : ''}
  `;
  el.querySelector('.hero-desc').textContent = item.description || '';
  el.querySelector('.hero-btn-play').onclick = () => navigate(`/detail/${item.subjectId}`);
  el.querySelector('.hero-btn-info').onclick = () => navigate(`/detail/${item.subjectId}`);

  const dots = el.querySelectorAll('.hero-dot');
  dots.forEach((d, i) => d.classList.toggle('active', i === heroSlideIndex));
}

function heroHtml(count) {
  const dotsHtml = Array.from({length: count}, (_, i) =>
    `<div class="hero-dot${i===0?' active':''}" onclick="setHeroSlide(${i})"></div>`).join('');
  return `
  <div class="hero" id="heroSection">
    <div class="hero-bg" style="background-color:var(--bg2)"></div>
    <div class="hero-gradient"></div>
    <div class="hero-content">
      <div class="hero-badge">
        <span class="badge-type badge hero-badge-type">Movie</span>
        <span class="badge-rating badge"></span>
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
    <div class="hero-dots">${dotsHtml}</div>
  </div>`;
}

window.setHeroSlide = function(i) {
  heroSlideIndex = i;
  clearInterval(heroTimer);
  renderHeroSlide();
  heroTimer = setInterval(() => {
    heroSlideIndex = (heroSlideIndex + 1) % heroItems.length;
    renderHeroSlide();
  }, 7000);
};

// ===== HOME PAGE =====
async function renderHome() {
  app.innerHTML = `<div class="spinner-wrap"><div class="spinner"></div></div>`;

  const [trending, ranking] = await Promise.all([
    api('trending', { page: 0, perPage: 18 }),
    api('ranking'),
  ]);

  const trendList = trending?.data?.subjectList || [];
  const heroCount = Math.min(trendList.length, 6);
  const rankTabs = ranking?.data?.rankingList || [];
  const rankItems = ranking?.data?.subjectList || [];

  let html = '';

  if (heroCount > 0) {
    html += heroHtml(heroCount);
  }

  if (trendList.length) {
    html += `
    <div class="section">
      <div class="section-header">
        <h2 class="section-title">🔥 Trending Now</h2>
        <a class="section-more" href="/trending" onclick="navigate('/trending');return false;">See All →</a>
      </div>
      <div class="cards-row">${trendList.map(makeCard).join('')}</div>
    </div>`;
  }

  if (rankTabs.length) {
    html += `
    <div class="section" id="rankingSection">
      <div class="section-header">
        <h2 class="section-title">🏆 Rankings</h2>
      </div>
      <div class="rank-tabs" id="rankTabs">
        ${rankTabs.slice(0,12).map((t, i) => `<button class="rank-tab${i===0?' active':''}" onclick="loadRankTab('${t.id}',this)">${t.name}</button>`).join('')}
      </div>
      <div class="cards-row" id="rankCards">${rankItems.slice(0,18).map(makeCard).join('')}</div>
    </div>`;
  }

  // Movies section
  html += `
  <div class="section">
    <div class="section-header">
      <h2 class="section-title">🎬 Popular Movies</h2>
      <a class="section-more" href="/movies" onclick="navigate('/movies');return false;">See All →</a>
    </div>
    <div class="cards-row" id="moviesRow"><div class="spinner-wrap" style="min-height:200px"><div class="spinner"></div></div></div>
  </div>

  <div class="section">
    <div class="section-header">
      <h2 class="section-title">📺 TV Shows</h2>
      <a class="section-more" href="/shows" onclick="navigate('/shows');return false;">See All →</a>
    </div>
    <div class="cards-row" id="showsRow"><div class="spinner-wrap" style="min-height:200px"><div class="spinner"></div></div></div>
  </div>

  ${renderFooter()}`;

  app.innerHTML = html;

  if (trendList.length >= heroCount) buildHero(trendList.slice(0, heroCount));

  // Load movies & shows from trending and ranking
  Promise.all([
    api('browse', { subjectType: 1, genre: 'Action', page: 1, perPage: 18 }),
    api('browse', { subjectType: 2, genre: 'Drama', page: 1, perPage: 18 }),
  ]).then(([movies, shows]) => {
    const mr = document.getElementById('moviesRow');
    const sr = document.getElementById('showsRow');
    const mItems = movies?.data?.subjectList || movies?.data?.items || [];
    const sItems = shows?.data?.subjectList || shows?.data?.items || [];
    if (mr) mr.innerHTML = mItems.map(makeCard).join('') || '<div class="empty-state"><div class="empty-icon">🎬</div><div class="empty-text">Nothing to show</div></div>';
    if (sr) sr.innerHTML = sItems.map(makeCard).join('') || '<div class="empty-state"><div class="empty-icon">📺</div><div class="empty-text">Nothing to show</div></div>';
  });
}

window.loadRankTab = async function(id, btn) {
  document.querySelectorAll('.rank-tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const el = document.getElementById('rankCards');
  if (el) el.innerHTML = `<div class="spinner-wrap" style="min-height:200px"><div class="spinner"></div></div>`;
  const data = await api('ranking', { id });
  if (el) el.innerHTML = (data?.data?.subjectList || []).slice(0,18).map(makeCard).join('');
};

// ===== TRENDING PAGE =====
async function renderTrending() {
  app.innerHTML = `
  <div class="page-header">
    <h1 class="page-title">🔥 Trending</h1>
    <p class="page-subtitle">What everyone is watching right now</p>
  </div>
  <div class="section"><div class="spinner-wrap"><div class="spinner"></div></div></div>`;

  const data = await api('trending', { page: 0, perPage: 36 });
  const items = data?.data?.subjectList || [];

  app.innerHTML = `
  <div class="page-header">
    <h1 class="page-title">🔥 Trending Now</h1>
    <p class="page-subtitle">${items.length} trending titles</p>
  </div>
  <div class="section">
    <div class="cards-grid">${items.map(makeCard).join('')}</div>
  </div>
  ${renderFooter()}`;
}

// ===== BROWSE PAGE =====
let browseState = { type: null, genre: '', country: '', page: 1 };

async function renderBrowse(forceType = null) {
  browseState.type = forceType || browseState.type || 1;
  browseState.page = 1;

  const genres = ['Action','Adventure','Animation','Comedy','Crime','Documentary','Drama','Fantasy','Horror','Mystery','Romance','Sci-Fi','Thriller'];
  const countries = ['United States','United Kingdom','South Korea','Japan','India','France','China','Germany','Spain','Italy','Australia','Nigeria'];

  app.innerHTML = `
  <div class="page-header">
    <h1 class="page-title">Browse ${forceType === 2 ? 'TV Shows' : forceType === 1 ? 'Movies' : 'All'}</h1>
    <p class="page-subtitle">Discover your next favourite</p>
  </div>
  <div class="filter-bar">
    <span class="filter-label">Type:</span>
    <select class="filter-select" id="fType" onchange="changeBrowseFilter()">
      <option value="1" ${browseState.type===1?'selected':''}>Movies</option>
      <option value="2" ${browseState.type===2?'selected':''}>TV Shows</option>
    </select>
    <span class="filter-label">Genre:</span>
    <select class="filter-select" id="fGenre" onchange="changeBrowseFilter()">
      <option value="">All Genres</option>
      ${genres.map(g => `<option value="${g}" ${browseState.genre===g?'selected':''}>${g}</option>`).join('')}
    </select>
    <span class="filter-label">Country:</span>
    <select class="filter-select" id="fCountry" onchange="changeBrowseFilter()">
      <option value="">All Countries</option>
      ${countries.map(c => `<option value="${c}" ${browseState.country===c?'selected':''}>${c}</option>`).join('')}
    </select>
  </div>
  <div class="section">
    <div id="browseGrid"><div class="spinner-wrap"><div class="spinner"></div></div></div>
    <div class="load-more-wrap" id="loadMoreWrap" style="display:none">
      <button class="load-more-btn" onclick="loadMoreBrowse()">Load More</button>
    </div>
  </div>
  ${renderFooter()}`;

  await fetchBrowse(true);
}

window.changeBrowseFilter = function() {
  browseState.type = parseInt(document.getElementById('fType').value);
  browseState.genre = document.getElementById('fGenre').value;
  browseState.country = document.getElementById('fCountry').value;
  browseState.page = 1;
  fetchBrowse(true);
};

window.loadMoreBrowse = async function() {
  browseState.page++;
  await fetchBrowse(false);
};

async function fetchBrowse(reset) {
  const grid = document.getElementById('browseGrid');
  const lmw = document.getElementById('loadMoreWrap');
  if (!grid) return;

  if (reset) grid.innerHTML = `<div class="spinner-wrap"><div class="spinner"></div></div>`;

  let items = [];

  if (browseState.genre || browseState.country) {
    // Use browse endpoint when filters are set
    const params = { subjectType: browseState.type, page: browseState.page, perPage: 24 };
    if (browseState.genre) params.genre = browseState.genre;
    if (browseState.country) params.countryName = browseState.country;
    const data = await api('browse', params);
    items = data?.data?.subjectList || data?.data?.items || [];
  } else {
    // Default: use ranking for curated movie/show content
    const rankId = browseState.type === 2 ? '' : '';
    const data = await api('ranking');
    items = (data?.data?.subjectList || []).filter(x =>
      browseState.type === 0 || x.subjectType === browseState.type || !x.subjectType
    );
    if (items.length === 0) items = data?.data?.subjectList || [];
  }

  if (reset) {
    grid.innerHTML = items.length
      ? `<div class="cards-grid">${items.map(makeCard).join('')}</div>`
      : `<div class="empty-state"><div class="empty-icon">🔍</div><div class="empty-title">Nothing found</div><div class="empty-text">Try different filters</div></div>`;
  } else {
    const cg = grid.querySelector('.cards-grid');
    if (cg) cg.insertAdjacentHTML('beforeend', items.map(makeCard).join(''));
  }

  if (lmw) lmw.style.display = items.length >= 24 ? 'flex' : 'none';
}

// ===== SEARCH PAGE =====
let searchPage = 1;
let searchQuery = '';

async function renderSearch(q) {
  searchQuery = q;
  searchPage = 1;
  app.innerHTML = `
  <div class="page-header">
    <h1 class="page-title">🔍 Search: "${q}"</h1>
    <p class="page-subtitle">Showing results for your query</p>
  </div>
  <div class="filter-bar">
    <span class="filter-label">Type:</span>
    <select class="filter-select" id="sType" onchange="changeSearchType()">
      <option value="">All</option>
      <option value="1">Movies</option>
      <option value="2">TV Shows</option>
    </select>
  </div>
  <div class="section">
    <div id="searchGrid"><div class="spinner-wrap"><div class="spinner"></div></div></div>
    <div class="load-more-wrap" id="searchMoreWrap" style="display:none">
      <button class="load-more-btn" onclick="loadMoreSearch()">Load More</button>
    </div>
  </div>
  ${renderFooter()}`;

  await fetchSearch(true);
}

window.changeSearchType = function() { fetchSearch(true); };

window.loadMoreSearch = async function() {
  searchPage++;
  await fetchSearch(false);
};

async function fetchSearch(reset) {
  const grid = document.getElementById('searchGrid');
  const lmw = document.getElementById('searchMoreWrap');
  if (!grid) return;

  if (reset) {
    searchPage = 1;
    grid.innerHTML = `<div class="spinner-wrap"><div class="spinner"></div></div>`;
  }

  const sType = document.getElementById('sType')?.value;
  const params = { keyword: searchQuery, page: searchPage, perPage: 24 };
  if (sType) params.subjectType = sType;

  const data = await api('search', params);
  const items = data?.data?.subjectList || data?.data?.items || [];

  if (reset) {
    grid.innerHTML = items.length
      ? `<div class="cards-grid">${items.map(makeCard).join('')}</div>`
      : `<div class="empty-state"><div class="empty-icon">🔍</div><div class="empty-title">No results found</div><div class="empty-text">Try a different keyword</div></div>`;
  } else {
    const cg = grid.querySelector('.cards-grid');
    if (cg) cg.insertAdjacentHTML('beforeend', items.map(makeCard).join(''));
  }

  if (lmw) lmw.style.display = items.length >= 24 ? 'flex' : 'none';
}

// ===== DETAIL PAGE =====
async function renderDetail(id) {
  app.innerHTML = `<div class="spinner-wrap" style="min-height:80vh"><div class="spinner"></div></div>`;

  const [detail, rec] = await Promise.all([
    api('rich-detail', { subjectId: id }),
    api('recommend', { subjectId: id, page: 1, perPage: 12 }),
  ]);

  if (!detail?.success || !detail?.data) {
    app.innerHTML = `<div class="empty-state" style="margin-top:80px"><div class="empty-icon">⚠️</div><div class="empty-title">Could not load details</div><div class="empty-text">Please try again later</div></div>`;
    return;
  }

  const d = detail.data;
  const isShow = d.subjectType === 2;
  const bgUrl = d.stills?.url || d.cover?.url || '';
  const genres = (d.genre || '').split(',').map(g => g.trim()).filter(Boolean);
  const rating = d.imdbRatingValue;
  const year = d.releaseDate?.slice(0, 4);
  const dur = d.duration ? `${Math.floor(d.duration / 60)}m` : '';
  const recItems = rec?.data?.subjectList || [];

  let seasonsHtml = '';
  const seasons = d.seasonList || d.seasons || [];
  if (isShow && seasons.length) {
    seasonsHtml = `
    <div class="detail-seasons">
      <h3 class="section-title" style="margin-bottom:16px">Episodes</h3>
      <div class="seasons-tabs">
        ${seasons.map((s, i) => `<button class="season-tab${i===0?' active':''}" onclick="loadSeason('${id}','${s.seasonId || s.id}',${i},this)">Season ${s.index || i+1}</button>`).join('')}
      </div>
      <div id="episodesGrid" class="episodes-grid"><div class="spinner-wrap"><div class="spinner"></div></div></div>
    </div>`;
  }

  let castHtml = '';
  const cast = d.staffList || [];
  if (cast.length) {
    castHtml = `
    <div class="detail-cast">
      <h3 class="section-title" style="margin-bottom:16px">Cast & Crew</h3>
      <div class="cast-row">
        ${cast.map(p => `
        <div class="cast-card">
          <img class="cast-avatar" src="${p.avatar?.url || ''}" alt="${p.name}" onerror="this.src=''" />
          <div class="cast-name">${p.name}</div>
          <div class="cast-role">${p.role || p.staffType || ''}</div>
        </div>`).join('')}
      </div>
    </div>`;
  }

  app.innerHTML = `
  <div class="detail-hero">
    ${bgUrl ? `<div class="detail-hero-bg" style="background-image:url('${bgUrl}')"></div>` : `<div class="detail-hero-bg"></div>`}
    <div class="detail-hero-grad"></div>
    <div class="detail-content">
      <div class="detail-poster">
        ${d.cover?.url ? `<img src="${d.cover.url}" alt="${d.title}" onerror="this.parentElement.style.background='var(--bg3)'" />` : `<div style="aspect-ratio:2/3;background:var(--bg3);display:flex;align-items:center;justify-content:center;font-size:48px">🎬</div>`}
      </div>
      <div class="detail-info">
        <h1 class="detail-title">${d.title}</h1>
        <div class="detail-badges">
          <span class="detail-badge db-type">${isShow ? 'TV Show' : 'Movie'}</span>
          ${year ? `<span class="detail-badge db-year">📅 ${year}</span>` : ''}
          ${rating ? `<span class="detail-badge db-rating">★ ${rating} IMDb</span>` : ''}
          ${d.countryName ? `<span class="detail-badge db-country">🌍 ${d.countryName}</span>` : ''}
          ${dur ? `<span class="detail-badge db-year">⏱ ${dur}</span>` : ''}
        </div>
        ${genres.length ? `<div class="detail-genres">${genres.map(g => `<span class="detail-genre">${g}</span>`).join('')}</div>` : ''}
        <p class="detail-desc">${d.description || 'No description available.'}</p>
        <div class="detail-actions">
          <button class="btn-play" onclick="openPlayer('${id}', '${(d.title || '').replace(/'/g,"\\'")}', ${isShow})">
            <svg width="18" height="18" fill="white" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
            Play Now
          </button>
          <button class="btn-info" onclick="toast('Added to Watchlist!','info')">+ Watchlist</button>
        </div>
      </div>
    </div>
  </div>

  <div class="detail-body">
    ${castHtml}
    ${seasonsHtml}
    ${recItems.length ? `
    <div>
      <div class="section-header"><h3 class="section-title">You Might Also Like</h3></div>
      <div class="cards-row">${recItems.map(makeCard).join('')}</div>
    </div>` : ''}
  </div>
  ${renderFooter()}`;

  // Load first season episodes if it's a show
  if (isShow && seasons.length) {
    const firstSeason = seasons[0];
    loadSeasonEpisodes(id, firstSeason.seasonId || firstSeason.id || id);
  }
}

window.loadSeason = function(subjectId, seasonId, idx, btn) {
  document.querySelectorAll('.season-tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  loadSeasonEpisodes(subjectId, seasonId);
};

async function loadSeasonEpisodes(subjectId, seasonId) {
  const grid = document.getElementById('episodesGrid');
  if (!grid) return;
  grid.innerHTML = `<div class="spinner-wrap"><div class="spinner"></div></div>`;

  const data = await api('play', { subjectId: seasonId || subjectId });
  const episodes = data?.data?.episodeList || data?.data?.episodes || [];

  if (!episodes.length) {
    grid.innerHTML = `<div class="empty-state"><div class="empty-icon">📺</div><div class="empty-text">No episodes found</div></div>`;
    return;
  }

  grid.innerHTML = episodes.map(ep => `
  <div class="episode-card" onclick="openPlayerEpisode('${ep.subjectId || ep.id}', '${(ep.title || 'Episode').replace(/'/g,"\\'")}')">
    ${ep.cover?.url || ep.thumbnail ? `<img class="ep-thumb" src="${ep.cover?.url || ep.thumbnail}" alt="" onerror="this.style.background='var(--bg3)'" />` : `<div class="ep-thumb" style="background:var(--bg3);display:flex;align-items:center;justify-content:center">🎬</div>`}
    <div class="ep-info">
      <div class="ep-num">Episode ${ep.index || ep.episode || ''}</div>
      <div class="ep-title">${ep.title || 'Episode'}</div>
      <div class="ep-desc">${ep.description || ''}</div>
    </div>
  </div>`).join('');
}

// ===== VIDEO PLAYER =====
window.openPlayerEpisode = function(subjectId, title) {
  openPlayer(subjectId, title, false);
};

window.openPlayer = async function(subjectId, title, isShow) {
  const overlay = document.getElementById('playerOverlay');
  const header = document.getElementById('playerHeader');
  const body = document.getElementById('playerBody');
  const info = document.getElementById('playerInfo');

  overlay.classList.add('show');
  header.textContent = title;
  body.innerHTML = `<div class="spinner-wrap" style="min-height:300px"><div class="spinner"></div></div>`;
  info.innerHTML = '';

  const [streamData, playData] = await Promise.all([
    api('stream', { subjectId }),
    api('play', { subjectId }),
  ]);

  const streams = streamData?.data?.streamList || streamData?.data?.streams || [];
  const directUrl = playData?.data?.playUrl || playData?.data?.url;

  if (streams.length) {
    const first = streams[0];
    const videoUrl = first.url || first.playUrl || first.streamUrl;

    if (videoUrl) {
      body.innerHTML = `<video id="videoPlayer" controls autoplay playsinline>
        <source src="${videoUrl}" type="video/mp4" />
        Your browser does not support video.
      </video>`;
      info.innerHTML = `<div style="padding:10px 0 4px;font-size:13px;color:var(--text3)">Quality:</div>
        <div class="player-streams">
          ${streams.map((s, i) => `<button class="stream-btn${i===0?' active':''}" onclick="switchStream('${s.url || s.playUrl || s.streamUrl}', this)">${s.quality || s.resolution || 'Stream ' + (i+1)}</button>`).join('')}
        </div>`;
    } else {
      body.innerHTML = `<div class="player-error"><div class="icon">🔒</div><h3>Stream requires browser</h3><p style="margin-bottom:16px">This content uses DRM protection.</p><a class="btn-play" href="https://movieapi.xcasper.space/api/play?subjectId=${subjectId}" target="_blank">Open Stream →</a></div>`;
    }
  } else if (directUrl) {
    body.innerHTML = `<video id="videoPlayer" controls autoplay playsinline>
      <source src="${directUrl}" type="video/mp4" />
    </video>`;
  } else {
    // Try to get any playable content
    const playAny = playData?.data;
    body.innerHTML = `<div class="player-error">
      <div class="icon">🎬</div>
      <h3>Stream Loading...</h3>
      <p style="margin-bottom:16px;color:var(--text2)">The stream for this title requires authentication. Try opening it directly.</p>
      <a class="btn-play" href="https://movieapi.xcasper.space/api/bff/stream?subjectId=${subjectId}" target="_blank" style="display:inline-flex;gap:8px">
        <svg width="18" height="18" fill="white" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
        Open Stream
      </a>
    </div>`;
  }
};

window.switchStream = function(url, btn) {
  document.querySelectorAll('.stream-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const vid = document.getElementById('videoPlayer');
  if (vid) { vid.src = url; vid.play(); }
};

document.getElementById('playerClose').onclick = () => {
  const overlay = document.getElementById('playerOverlay');
  overlay.classList.remove('show');
  const vid = document.getElementById('videoPlayer');
  if (vid) { vid.pause(); vid.src = ''; }
};

document.getElementById('playerOverlay').addEventListener('click', e => {
  if (e.target === e.currentTarget) document.getElementById('playerClose').click();
});

// ===== FOOTER =====
function renderFooter() {
  return `
  <footer>
    <div class="footer-logo">
      <span style="font-size:22px;filter:drop-shadow(0 0 8px #7dd3fc)">❄</span>
      <span style="font-size:16px;font-weight:800">Blue<span style="color:var(--ice)">Blizzard</span> FreeFlix</span>
    </div>
    <div class="footer-links">
      <a class="footer-link" href="/" onclick="navigate('/');return false;">Home</a>
      <a class="footer-link" href="/movies" onclick="navigate('/movies');return false;">Movies</a>
      <a class="footer-link" href="/shows" onclick="navigate('/shows');return false;">TV Shows</a>
      <a class="footer-link" href="/trending" onclick="navigate('/trending');return false;">Trending</a>
    </div>
    <span class="footer-copy">© 2026 BlueBlizzard FreeFlix · For entertainment purposes</span>
  </footer>`;
}

// ===== INTERCEPT LINKS =====
document.addEventListener('click', e => {
  const a = e.target.closest('a[href]');
  if (!a) return;
  const href = a.getAttribute('href');
  if (href && href.startsWith('/') && !href.startsWith('//')) {
    e.preventDefault();
    navigate(href);
  }
});

// ===== INIT =====
router();
