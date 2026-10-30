const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;
const API_BASE = 'https://movieapi.xcasper.space/api';
const SPORTS_API_BASE = 'https://apis.keithsite.lol';

const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9',
  'Referer': 'https://www.aoneroom.com/',
  'Origin': 'https://www.aoneroom.com',
};

// ===== IN-MEMORY CACHE =====
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000;
const sportsCache = new Map();
const SPORTS_CACHE_TTL = 45 * 1000;

function getCached(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL) { cache.delete(key); return null; }
  return entry.data;
}
function setCache(key, data) {
  cache.set(key, { data, ts: Date.now() });
}

async function proxyFetch(url, opts = {}) {
  const cached = getCached(url);
  if (cached) return cached;
  try {
    const res = await fetch(url, { headers: BROWSER_HEADERS, signal: AbortSignal.timeout(opts.timeout || 8000), ...opts });
    const text = await res.text();
    let result;
    try { result = JSON.parse(text); } catch { result = { success: false, error: 'Invalid response from upstream' }; }
    if (result && !result.error) setCache(url, result);
    return result;
  } catch (err) {
    return { success: false, error: err.message };
  }
}

function wrap(fn) {
  return async (req, res) => {
    try { await fn(req, res); } catch (err) { res.json({ success: false, error: err.message }); }
  };
}

app.use(express.static(path.join(__dirname, 'public')));

// ===== SEO ESSENTIALS =====
app.get('/robots.txt', (req, res) => {
  res.type('text/plain');
  res.send(`User-agent: *\nAllow: /\nDisallow: /proxy/\n\nSitemap: ${req.protocol}://${req.get('host')}/sitemap.xml\n`);
});

app.get('/sitemap.xml', (req, res) => {
  const base = `${req.protocol}://${req.get('host')}`;
  const pages = ['/', '/movies', '/series', '/trending', '/browse', '/sports', '/live', '/new'];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map(p => `  <url><loc>${base}${p}</loc><changefreq>daily</changefreq><priority>${p === '/' ? '1.0' : '0.8'}</priority></url>`).join('\n')}
</urlset>`;
  res.type('application/xml');
  res.send(xml);
});

// ===== CORE ENDPOINTS =====
app.get('/proxy/trending', wrap(async (req, res) => {
  const { page = 0, perPage = 18 } = req.query;
  res.json(await proxyFetch(`${API_BASE}/trending?page=${page}&perPage=${perPage}`));
}));

app.get('/proxy/ranking', wrap(async (req, res) => {
  const { id } = req.query;
  const url = id ? `${API_BASE}/ranking?id=${id}` : `${API_BASE}/ranking`;
  res.json(await proxyFetch(url));
}));

app.get('/proxy/homepage', wrap(async (req, res) => {
  res.json(await proxyFetch(`${API_BASE}/homepage`));
}));

app.get('/proxy/search', wrap(async (req, res) => {
  const { keyword, page = 1, perPage = 20, subjectType } = req.query;
  let url = `${API_BASE}/search?keyword=${encodeURIComponent(keyword)}&page=${page}&perPage=${perPage}`;
  if (subjectType) url += `&subjectType=${subjectType}`;
  res.json(await proxyFetch(url));
}));

app.get('/proxy/search/suggest', wrap(async (req, res) => {
  const { keyword } = req.query;
  res.json(await proxyFetch(`${API_BASE}/search/suggest?keyword=${encodeURIComponent(keyword)}`));
}));

app.get('/proxy/rich-detail', wrap(async (req, res) => {
  const { subjectId } = req.query;
  res.json(await proxyFetch(`${API_BASE}/rich-detail?subjectId=${subjectId}`));
}));

app.get('/proxy/seasons', wrap(async (req, res) => {
  const { subjectId } = req.query;
  if (!subjectId) return res.status(400).json({ success: false, error: 'subjectId is required' });
  res.json(await proxyFetch(`${API_BASE}/seasons?subjectId=${encodeURIComponent(subjectId)}`));
}));

app.get('/proxy/recommend', wrap(async (req, res) => {
  const { subjectId, page = 1, perPage = 12 } = req.query;
  res.json(await proxyFetch(`${API_BASE}/recommend?subjectId=${subjectId}&page=${page}&perPage=${perPage}`));
}));

function catalogPageParams(query) {
  const page = Math.min(1000, Math.max(1, Number.parseInt(query.page, 10) || 1));
  const perPage = Math.min(28, Math.max(1, Number.parseInt(query.perPage, 10) || 28));
  return { page, perPage };
}

app.get('/proxy/tv-series', wrap(async (req, res) => {
  const { page, perPage } = catalogPageParams(req.query);
  const params = new URLSearchParams({ page: String(page), perPage: String(perPage) });
  if (req.query.genre) params.set('genre', String(req.query.genre).slice(0, 80));
  res.json(await proxyFetch(`${API_BASE}/tv-series?${params}`));
}));

app.get('/proxy/kdrama', wrap(async (req, res) => {
  const { page, perPage } = catalogPageParams(req.query);
  res.json(await proxyFetch(`${API_BASE}/kdrama?page=${page}&perPage=${perPage}`));
}));

// Search returns title metadata only; playback/source and download fields are never forwarded by the client.
app.get('/proxy/showbox/search', wrap(async (req, res) => {
  const keyword = String(req.query.keyword || '').trim().slice(0, 120);
  if (!keyword) return res.status(400).json({ success: false, error: 'keyword is required' });
  const type = req.query.type === 'tv' ? 'tv' : 'movie';
  const pagelimit = Math.min(20, Math.max(1, Number.parseInt(req.query.pagelimit, 10) || 5));
  const result = await proxyFetch(`${API_BASE}/showbox/search?keyword=${encodeURIComponent(keyword)}&type=${type}&pagelimit=${pagelimit}`);
  if (Array.isArray(result?.data)) {
    result.data = result.data.map(({ id, box_type, title, year, poster, description, cats, imdb_rating }) =>
      ({ id, box_type, title, year, poster, description, cats, imdb_rating }));
  }
  res.json(result);
}));

app.get('/proxy/browse', wrap(async (req, res) => {
  const { subjectType, genre } = req.query;
  const country = String(req.query.country || req.query.countryName || '').slice(0, 80);
  const channelId = /^\d{1,8}$/.test(String(req.query.channelId || '')) ? String(req.query.channelId) : '';
  const year = /^\d{4}$/.test(String(req.query.year || '')) ? String(req.query.year) : '';
  const sort = ['Latest', 'Popular', 'Rating'].includes(String(req.query.sort || '')) ? String(req.query.sort) : '';
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
  const perPage = Math.min(48, Math.max(1, Number.parseInt(req.query.perPage, 10) || 20));
  const matches = item => {
    if (genre && !String(item.genre || '').toLowerCase().split(',').some(value => value.trim() === String(genre).toLowerCase())) return false;
    if (country && !String(item.countryName || '').toLowerCase().includes(country.toLowerCase())) return false;
    if (year && !String(item.releaseDate || '').startsWith(year)) return false;
    return true;
  };

  if (channelId || year || sort) {
    const params = new URLSearchParams({ page: String(page), perPage: String(Math.min(perPage, 28)) });
    if (subjectType && subjectType !== '0') params.set('subjectType', String(subjectType));
    if (channelId) params.set('channelId', channelId);
    if (genre) params.set('genre', String(genre).slice(0, 80));
    if (country) params.set('country', country);
    if (year) params.set('year', year);
    if (sort) params.set('sort', sort);
    return res.json(await proxyFetch(`${API_BASE}/browse?${params}`));
  }

  // MovieAPI's /browse rejects subjectType=1. Its /hot endpoint is the supported movie feed.
  if (subjectType === '1' || !subjectType || subjectType === '0') {
    const [hot, trending, ranking, catalog] = await Promise.all([
      proxyFetch(`${API_BASE}/hot`),
      proxyFetch(`${API_BASE}/trending?page=0&perPage=36`),
      proxyFetch(`${API_BASE}/ranking`),
      !subjectType || subjectType === '0'
        ? proxyFetch(`${API_BASE}/browse?subjectType=2&page=1&perPage=24${channelId ? `&channelId=${channelId}` : ''}${genre ? `&genre=${encodeURIComponent(genre)}` : ''}${country ? `&country=${encodeURIComponent(country)}` : ''}${year ? `&year=${year}` : ''}${sort ? `&sort=${sort}` : ''}`)
        : Promise.resolve(null),
    ]);
    const movieItems = [
      ...(hot?.data?.movie || []),
      ...(trending?.data?.subjectList || []).filter(item => item.subjectType === 1),
      ...(ranking?.data?.subjectList || []).filter(item => item.subjectType === 1),
    ];
    const browseItems = (catalog?.data?.items || catalog?.data?.subjectList || [])
      .filter(item => item.subjectType === 1 || item.subjectType === 2);
    const unique = new Map([...browseItems, ...movieItems].filter(matches).map(item => [String(item.subjectId), item]));
    const all = [...unique.values()].sort((a, b) => String(b.releaseDate || '').localeCompare(String(a.releaseDate || '')));
    const start = (page - 1) * perPage;
    return res.json({
      success: true,
      data: {
        items: all.slice(start, start + perPage),
        pager: { page, perPage, totalCount: all.length, hasMore: start + perPage < all.length },
      },
    });
  }

  let url = `${API_BASE}/browse?subjectType=${encodeURIComponent(subjectType)}&page=${page}&perPage=${perPage}`;
  if (channelId) url += `&channelId=${channelId}`;
  if (genre) url += `&genre=${encodeURIComponent(genre)}`;
  if (country) url += `&country=${encodeURIComponent(country)}`;
  if (year) url += `&year=${year}`;
  if (sort) url += `&sort=${encodeURIComponent(sort)}`;
  res.json(await proxyFetch(url));
}));

app.get('/proxy/coming-soon', wrap(async (req, res) => {
  res.json(await proxyFetch(`${API_BASE}/coming-soon`));
}));

app.get('/proxy/hot', wrap(async (req, res) => {
  res.json(await proxyFetch(`${API_BASE}/hot`));
}));

app.get('/proxy/live', wrap(async (req, res) => {
  res.json(await proxyFetch(`${API_BASE}/live`));
}));

// ===== SPORTS DATA (fixed upstream paths; never accepts a caller-supplied URL) =====
const SPORTS_FEEDS = {
  live: '/livescore',
  epl: '/epl/upcomingmatches',
  ucl: '/ucl/upcomingmatches',
  table: '/epl/standings',
  news: '/football/news',
};

app.get('/proxy/sports/:feed', wrap(async (req, res) => {
  const endpoint = SPORTS_FEEDS[req.params.feed];
  if (!endpoint) return res.status(404).json({ status: false, error: 'Unknown sports feed' });

  const cacheKey = req.params.feed;
  const cached = sportsCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < SPORTS_CACHE_TTL) {
    return res.json(cached.data);
  }

  try {
    const upstream = await fetch(`${SPORTS_API_BASE}${endpoint}`, {
      headers: { 'Accept': 'application/json', 'User-Agent': 'FreeFlixx/1.0' },
      signal: AbortSignal.timeout(10000),
    });
    if (!upstream.ok) {
      return res.status(502).json({ status: false, error: `Sports feed returned HTTP ${upstream.status}` });
    }
    const data = await upstream.json();
    if (data?.status) sportsCache.set(cacheKey, { data, ts: Date.now() });
    res.json(data);
  } catch {
    res.status(502).json({ status: false, error: 'Sports data is temporarily unavailable' });
  }
}));

// ===== STAFF / ACTOR ENDPOINTS =====
app.get('/proxy/staff/detail', wrap(async (req, res) => {
  const { staffId } = req.query;
  res.json(await proxyFetch(`${API_BASE}/staff/detail?staffId=${staffId}`));
}));

app.get('/proxy/staff/works', wrap(async (req, res) => {
  const { staffId, page = 1, perPage = 20 } = req.query;
  res.json(await proxyFetch(`${API_BASE}/staff/works?staffId=${staffId}&page=${page}&perPage=${perPage}`));
}));

app.get('/proxy/staff/related', wrap(async (req, res) => {
  const { staffId } = req.query;
  res.json(await proxyFetch(`${API_BASE}/staff/related?staffId=${staffId}`));
}));

// Title catalog, series details, and episode metadata are provided by the catalog API.
// Playback sources are deliberately not resolved or proxied by this server.

// Legacy playback paths are explicitly retired to avoid accidentally serving scraped streams.
for (const route of ['/proxy/watch', '/proxy/play', '/proxy/stream', '/proxy/mb-stream', '/proxy/video']) {
  app.all(route, (req, res) => res.status(410).json({ success: false, error: 'Third-party stream resolution is not supported. Configure authorized media sources in public/media-sources.js.' }));
}

// ===== CURATED LIVE CHANNELS =====
const LIVE_CHANNELS = [
  { id: 'fightnet', name: 'Fight Network', category: 'wrestling', badge: '🏆', desc: 'Combat sports & wrestling 24/7', url: 'https://d12a2vxqkkh1bo.cloudfront.net/hls/main.m3u8' },
  { id: 'dazncombat', name: 'DAZN Combat', category: 'wrestling', badge: '⚔️', desc: 'Boxing, MMA & combat sports', url: 'https://dazn-combat-rakuten.amagi.tv/hls/amagi_hls_data_rakutenAA-dazn-combat-rakuten/CDN/master.m3u8' },
  { id: 'fightbox', name: 'FightBox HD', category: 'wrestling', badge: '🥋', desc: 'Fights, MMA & combat sports', url: 'https://liveovh010.cda.pl/zkr7GNESGht4_0Wk12c78A/17538736/2782059/enc002/fightboxhdraw/fightboxhdraw.m3u8' },
  { id: 'impact', name: 'Impact Wrestling', category: 'wrestling', badge: '🥊', desc: 'Impact Wrestling Network Live', url: 'https://edge1.lifestreamcdn.com/live/impactroku1/index.m3u8' },
  { id: 'espnocho', name: 'ESPN8: The Ocho', category: 'sports', badge: '🏆', desc: 'Almost a sport — it is on ESPN8', url: 'https://d3b6q2ou5kp8ke.cloudfront.net/ESPNTheOcho.m3u8' },
  { id: 'cbssports', name: 'CBS Sports HQ', category: 'sports', badge: '🎯', desc: 'CBS Sports 24/7 news & events', url: 'https://propee33f9c2.airspace-cdn.cbsivideo.com/index.m3u8' },
  { id: 'cbsgolazo', name: 'CBS Golazo', category: 'sports', badge: '⚽', desc: 'Soccer news & highlights', url: 'https://proped3fhg87.airspace-cdn.cbsivideo.com/golazo-live-dai/master/golazo-live.m3u8' },
  { id: 'bein', name: 'beIN SPORTS XTRA', category: 'sports', badge: '🏅', desc: 'Premium sports from beIN', url: 'https://amg01334-beinsportsllc-beinxtra-samsungau-eiyvc.amagi.tv/playlist/amg01334-beinsportsllc-beinxtra-samsungau/playlist.m3u8' },
  { id: 'ddsports', name: 'DD Sports India', category: 'sports', badge: '🏏', desc: 'Cricket, kabaddi & more', url: 'https://d3qs3d2rkhfqrt.cloudfront.net/out/v1/b17adfe543354fdd8d189b110617cddd/index.m3u8' },
  { id: 'abcnews1', name: 'ABC News Live', category: 'news', badge: '📺', desc: 'Breaking news 24/7', url: 'https://abcnews-streams.akamaized.net/hls/live/2023560/abcnewshudson1/master_400.m3u8' },
  { id: 'bloomberg', name: 'Bloomberg TV', category: 'news', badge: '📈', desc: 'Business & financial news', url: 'https://bloombergtv-free.akamaized.net/live/bloomberg-us/master.m3u8' },
  { id: 'dwnews', name: 'DW News', category: 'news', badge: '🌍', desc: 'Deutsche Welle international news', url: 'https://dwamdstream102.akamaized.net/hls/live/2015525/dwstream102/stream01/streamPlaylist.m3u8' },
  { id: 'aljaz', name: 'Al Jazeera English', category: 'news', badge: '🌐', desc: 'Al Jazeera global news 24/7', url: 'https://live-hls-web-aje.getaj.net/AJE/01.m3u8' },
  { id: 'france24', name: 'France 24 English', category: 'news', badge: '🗼', desc: 'French international news in English', url: 'https://f24hls-i.akamaihd.net/hls/live/221193/F24_EN_LO_HLS/master.m3u8' },
  { id: 'cbcnews', name: 'CBC News', category: 'news', badge: '🍁', desc: "Canada's public news network", url: 'https://nn.geo.cbc.ca/hls/cbc-1080.m3u8' },
  { id: 'standup247', name: 'Stand-Up 24/7', category: 'comedy', badge: '🎤', desc: 'Non-stop stand-up comedy', url: 'https://jmp2.uk/plu-82.m3u8' },
  { id: 'comedy-movies', name: 'Comedy Movies', category: 'comedy', badge: '🎬', desc: 'Comedy films around the clock', url: 'https://jmp2.uk/plu-163.m3u8' },
  { id: 'romcom', name: 'RomCom Channel', category: 'comedy', badge: '❤️', desc: 'Romantic comedies 24/7', url: 'https://jmp2.uk/plu-107.m3u8' },
  { id: 'comedy-tv', name: 'Comedy TV', category: 'comedy', badge: '😄', desc: 'Classic & modern comedy series', url: 'https://jmp2.uk/plu-178.m3u8' },
  { id: 'nasa', name: 'NASA TV', category: 'entertainment', badge: '🚀', desc: 'Live space missions & science', url: 'https://nasa-i.akamaihd.net/hls/live/253565/NASA-NTV1-HLS/master.m3u8' },
  { id: 'pluto-action', name: 'Action Movies', category: 'entertainment', badge: '💥', desc: 'Non-stop action films', url: 'https://jmp2.uk/plu-63.m3u8' },
  { id: 'pluto-horror', name: 'Horror 24/7', category: 'entertainment', badge: '👻', desc: 'Horror movies round the clock', url: 'https://jmp2.uk/plu-106.m3u8' },
  { id: 'pluto-scifi', name: 'Sci-Fi Movies', category: 'entertainment', badge: '🛸', desc: 'Science fiction films', url: 'https://jmp2.uk/plu-64.m3u8' },
  { id: 'pluto-crime', name: 'Crime Drama', category: 'entertainment', badge: '🔍', desc: 'Crime & thriller dramas', url: 'https://jmp2.uk/plu-195.m3u8' },
  { id: 'pluto-classic', name: 'Classic Movies', category: 'entertainment', badge: '🎞️', desc: 'Timeless classic films', url: 'https://jmp2.uk/plu-62.m3u8' },
];

app.get('/proxy/live-channels', (req, res) => {
  res.json({ success: true, channels: LIVE_CHANNELS });
});

// ===== LIVE TV HLS PROXY =====
app.get('/proxy/live-stream', wrap(async (req, res) => {
  const rawUrl = req.query.url;
  if (!rawUrl) return res.status(400).send('Missing url');
  let targetUrl;
  try { targetUrl = decodeURIComponent(rawUrl); } catch { return res.status(400).send('Invalid url'); }

  const upHeaders = {
    'User-Agent': BROWSER_HEADERS['User-Agent'],
    'Accept': '*/*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Origin': new URL(targetUrl).origin,
  };

  const upstream = await fetch(targetUrl, { headers: upHeaders, signal: AbortSignal.timeout(10000) });
  const ct = upstream.headers.get('content-type') || '';

  res.setHeader('Access-Control-Allow-Origin', '*');

  if (ct.includes('mpegurl') || targetUrl.includes('.m3u8') || targetUrl.includes('playlist')) {
    const text = await upstream.text();
    const baseUrl = targetUrl.substring(0, targetUrl.lastIndexOf('/') + 1);
    const rewritten = text.split('\n').map(line => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return line;
      const absUrl = trimmed.startsWith('http') ? trimmed : baseUrl + trimmed;
      return `/proxy/live-stream?url=${encodeURIComponent(absUrl)}`;
    }).join('\n');
    res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
    res.send(rewritten);
  } else {
    res.status(upstream.status);
    ['content-type', 'content-length', 'content-range', 'accept-ranges'].forEach(h => {
      const v = upstream.headers.get(h); if (v) res.setHeader(h, v);
    });
    const { Readable } = require('stream');
    Readable.fromWeb(upstream.body).pipe(res);
  }
}));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`FreeFlixx T running on http://0.0.0.0:${PORT}`);
});
