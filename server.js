const express = require('express');
const path = require('path');

const app = express();
const PORT = 5000;
const API_BASE = 'https://movieapi.xcasper.space/api';
const ALLOWED_CDN = ['macdn.aoneroom.com', 'pbcdnw.aoneroom.com', 'cdn.aoneroom.com'];

const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9',
  'Referer': 'https://www.aoneroom.com/',
  'Origin': 'https://www.aoneroom.com',
};

// ===== IN-MEMORY CACHE =====
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCached(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL) { cache.delete(key); return null; }
  return entry.data;
}
function setCache(key, data) {
  cache.set(key, { data, ts: Date.now() });
}

async function proxyFetch(url) {
  const cached = getCached(url);
  if (cached) return cached;
  try {
    const res = await fetch(url, { headers: BROWSER_HEADERS });
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

app.get('/proxy/play', wrap(async (req, res) => {
  const { subjectId } = req.query;
  res.json(await proxyFetch(`${API_BASE}/play?subjectId=${subjectId}`));
}));

app.get('/proxy/stream', wrap(async (req, res) => {
  const { subjectId } = req.query;
  res.json(await proxyFetch(`${API_BASE}/bff/stream?subjectId=${subjectId}`));
}));

app.get('/proxy/captions', wrap(async (req, res) => {
  const { subjectId, streamId } = req.query;
  res.json(await proxyFetch(`${API_BASE}/captions?subjectId=${subjectId}&streamId=${streamId}`));
}));

app.get('/proxy/recommend', wrap(async (req, res) => {
  const { subjectId, page = 1, perPage = 12 } = req.query;
  res.json(await proxyFetch(`${API_BASE}/recommend?subjectId=${subjectId}&page=${page}&perPage=${perPage}`));
}));

app.get('/proxy/browse', wrap(async (req, res) => {
  const { subjectType = 1, genre, countryName, page = 1, perPage = 20 } = req.query;
  let url = `${API_BASE}/browse?subjectType=${subjectType}&page=${page}&perPage=${perPage}`;
  if (genre) url += `&genre=${encodeURIComponent(genre)}`;
  if (countryName) url += `&countryName=${encodeURIComponent(countryName)}`;
  res.json(await proxyFetch(url));
}));

app.get('/proxy/hot', wrap(async (req, res) => {
  res.json(await proxyFetch(`${API_BASE}/hot`));
}));

app.get('/proxy/live', wrap(async (req, res) => {
  res.json(await proxyFetch(`${API_BASE}/live`));
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

// ===== SHOWBOX ENDPOINTS =====
app.get('/proxy/showbox/search', wrap(async (req, res) => {
  const { keyword, type = 'movie', pagelimit = 5 } = req.query;
  res.json(await proxyFetch(`${API_BASE}/showbox/search?keyword=${encodeURIComponent(keyword)}&type=${type}&pagelimit=${pagelimit}`));
}));

app.get('/proxy/showbox/movie', wrap(async (req, res) => {
  const { id } = req.query;
  res.json(await proxyFetch(`${API_BASE}/showbox/movie?id=${id}`));
}));

app.get('/proxy/showbox/tv', wrap(async (req, res) => {
  const { id } = req.query;
  res.json(await proxyFetch(`${API_BASE}/showbox/tv?id=${id}`));
}));

app.get('/proxy/showbox/streams', wrap(async (req, res) => {
  const { id } = req.query;
  res.json(await proxyFetch(`${API_BASE}/showbox/streams?id=${id}`));
}));

app.get('/proxy/showbox/stream', wrap(async (req, res) => {
  const { id, type = 'movie' } = req.query;
  res.json(await proxyFetch(`${API_BASE}/stream?id=${id}&type=${type}`));
}));

// ===== NEWTOXIC ENDPOINTS =====
app.get('/proxy/newtoxic/search', wrap(async (req, res) => {
  const { keyword } = req.query;
  res.json(await proxyFetch(`${API_BASE}/newtoxic/search?keyword=${encodeURIComponent(keyword)}`));
}));

app.get('/proxy/newtoxic/latest', wrap(async (req, res) => {
  const { page = 1 } = req.query;
  res.json(await proxyFetch(`${API_BASE}/newtoxic/latest?page=${page}`));
}));

app.get('/proxy/newtoxic/featured', wrap(async (req, res) => {
  res.json(await proxyFetch(`${API_BASE}/newtoxic/featured`));
}));

app.get('/proxy/newtoxic/detail', wrap(async (req, res) => {
  const { path: p } = req.query;
  res.json(await proxyFetch(`${API_BASE}/newtoxic/detail?path=${encodeURIComponent(p)}`));
}));

app.get('/proxy/newtoxic/files', wrap(async (req, res) => {
  const { path: p } = req.query;
  res.json(await proxyFetch(`${API_BASE}/newtoxic/files?path=${encodeURIComponent(p)}`));
}));

app.get('/proxy/newtoxic/resolve', wrap(async (req, res) => {
  const { fid } = req.query;
  res.json(await proxyFetch(`${API_BASE}/newtoxic/resolve?fid=${fid}`));
}));

// ===== IMDb ID lookup via IMDb's free autocomplete =====
async function getImdbId(title, releaseDate, isShow) {
  try {
    const query = (title || '').toLowerCase().trim();
    if (!query) return null;
    const year = releaseDate ? parseInt(releaseDate.split('-')[0]) : null;
    const firstChar = query[0];
    const url = `https://v2.sg.media-imdb.com/suggestion/${firstChar}/${encodeURIComponent(query)}.json`;
    const cacheKey = `imdb:${query}:${year}`;
    const cached = getCached(cacheKey);
    if (cached) return cached;

    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible)' },
      signal: AbortSignal.timeout(5000),
    });
    const data = await res.json();
    const results = data.d || [];
    const tvTypes = ['tvSeries', 'tvMiniSeries', 'tvShort', 'tvMovie'];

    let match = results.find(r =>
      r.l?.toLowerCase() === title.toLowerCase() &&
      (!year || r.y === year) &&
      (isShow ? tvTypes.includes(r.qid) : r.qid === 'movie')
    );
    if (!match && year) match = results.find(r => r.l?.toLowerCase() === title.toLowerCase() && r.y === year);
    if (!match) match = results.find(r => r.l?.toLowerCase() === title.toLowerCase());
    if (!match) match = results[0];

    const id = match?.id || null;
    setCache(cacheKey, id);
    return id;
  } catch (_) {
    return null;
  }
}

// ===== CURATED LIVE CHANNELS =====
const LIVE_CHANNELS = [
  // ── WRESTLING ──
  { id: 'tna', name: 'TNA Wrestling', category: 'wrestling', badge: '🤼', desc: 'TNA / Impact Wrestling 24/7', url: 'https://d39g1vxj2ef6in.cloudfront.net/v1/master/3fec3e5cac39a52b2132f9c66c83dae043dc17d4/prod-rakuten-stitched/master.m3u8?ads.xumo_channelId=88883039' },
  { id: 'impact', name: 'Impact Network', category: 'wrestling', badge: '🥊', desc: 'Impact Wrestling Live', url: 'https://edge1.lifestreamcdn.com/live/impactroku1/index.m3u8' },
  { id: 'fightnet', name: 'Fight Network', category: 'wrestling', badge: '🏆', desc: 'Combat sports & wrestling', url: 'https://d12a2vxqkkh1bo.cloudfront.net/hls/main.m3u8' },
  { id: 'fightbox', name: 'FightBox HD', category: 'wrestling', badge: '🥋', desc: 'Fights, MMA & combat sports', url: 'https://liveovh010.cda.pl/zkr7GNESGht4_0Wk12c78A/17538736/2782059/enc002/fightboxhdraw/fightboxhdraw.m3u8' },
  { id: 'dazncombat', name: 'DAZN Combat', category: 'wrestling', badge: '⚔️', desc: 'Combat sports on DAZN', url: 'https://dazn-combat-rakuten.amagi.tv/hls/amagi_hls_data_rakutenAA-dazn-combat-rakuten/CDN/master.m3u8' },
  { id: 'hardknocks', name: 'Hard Knocks', category: 'wrestling', badge: '💪', desc: 'Hard Knocks Fighting Championship', url: 'https://d39g1vxj2ef6in.cloudfront.net/v1/master/3fec3e5cac39a52b2132f9c66c83dae043dc17d4/prod-rakuten-stitched/master.m3u8?ads.xumo_channelId=88883037' },
  { id: 'persianafight', name: 'Persiana Fight', category: 'wrestling', badge: '🥊', desc: 'Fight sports channel', url: 'https://fighthls.persiana.live/hls/stream.m3u8' },
  // ── SPORTS ──
  { id: 'bein', name: 'beIN SPORTS XTRA', category: 'sports', badge: '⚽', desc: 'Premium sports from beIN', url: 'https://amg01334-beinsportsllc-beinxtra-samsungau-eiyvc.amagi.tv/playlist/amg01334-beinsportsllc-beinxtra-samsungau/playlist.m3u8' },
  { id: 'espnocho', name: 'ESPN8: The Ocho', category: 'sports', badge: '🏆', desc: 'If it is almost a sport, it is on ESPN8', url: 'https://d3b6q2ou5kp8ke.cloudfront.net/ESPNTheOcho.m3u8' },
  { id: 'cbssports', name: 'CBS Sports HQ', category: 'sports', badge: '🎯', desc: 'CBS Sports 24/7 news & events', url: 'https://propee33f9c2.airspace-cdn.cbsivideo.com/index.m3u8' },
  { id: 'cbsgolazo', name: 'CBS Golazo', category: 'sports', badge: '⚽', desc: 'Soccer news & highlights', url: 'https://proped3fhg87.airspace-cdn.cbsivideo.com/golazo-live-dai/master/golazo-live.m3u8' },
  { id: 'ddsports', name: 'DD Sports India', category: 'sports', badge: '🏏', desc: 'Cricket, kabaddi & more', url: 'https://d3qs3d2rkhfqrt.cloudfront.net/out/v1/b17adfe543354fdd8d189b110617cddd/index.m3u8' },
  { id: 'africa24sport', name: 'Africa24 Sport', category: 'sports', badge: '🌍', desc: 'Pan-African sports coverage', url: 'https://africa24.vedge.infomaniak.com/livecast/ik:africa24sport/manifest.m3u8' },
  // ── NEWS ──
  { id: 'abcnews1', name: 'ABC News Live', category: 'news', badge: '📺', desc: 'Breaking news 24/7', url: 'https://abcnews-streams.akamaized.net/hls/live/2023560/abcnewshudson1/master_400.m3u8' },
  { id: 'abcnews2', name: 'ABC News Live 2', category: 'news', badge: '📺', desc: 'ABC News second channel', url: 'https://abcnews-streams.akamaized.net/hls/live/2023561/abcnewshudson2/master_400.m3u8' },
  { id: 'cbcnews', name: 'CBC News', category: 'news', badge: '🍁', desc: 'Canada\'s public news network', url: 'https://nn.geo.cbc.ca/hls/cbc-1080.m3u8' },
  { id: 'bloomberg', name: 'Bloomberg TV', category: 'news', badge: '📈', desc: 'Business & financial news', url: 'https://bloombergtv-free.akamaized.net/live/bloomberg-us/master.m3u8' },
  // ── COMEDY ──
  { id: 'comedy-central', name: 'Comedy Central', category: 'comedy', badge: '😂', desc: 'Stand-up & comedy shows', url: 'https://jmp2.uk/plu-81.m3u8' },
  { id: 'standup247', name: 'Stand-Up 24/7', category: 'comedy', badge: '🎤', desc: 'Non-stop stand-up comedy', url: 'https://jmp2.uk/plu-82.m3u8' },
  { id: 'comedy-movies', name: 'Comedy Movies', category: 'comedy', badge: '🎬', desc: 'Comedy films around the clock', url: 'https://jmp2.uk/plu-163.m3u8' },
  { id: 'romcom', name: 'RomCom Channel', category: 'comedy', badge: '❤️', desc: 'Romantic comedies 24/7', url: 'https://jmp2.uk/plu-107.m3u8' },
  { id: 'comedy-tv', name: 'Comedy.TV', category: 'comedy', badge: '📺', desc: 'Classic & modern comedy series', url: 'https://jmp2.uk/plu-178.m3u8' },
  { id: 'funny-movies', name: 'Funny Movies', category: 'comedy', badge: '🤣', desc: 'Laugh-out-loud films all day', url: 'https://jmp2.uk/plu-165.m3u8' },
  // ── ENTERTAINMENT ──
  { id: 'pluto-classic', name: 'Classic Movies', category: 'entertainment', badge: '🎬', desc: 'Timeless classic films', url: 'https://jmp2.uk/plu-62.m3u8' },
  { id: 'pluto-action', name: 'Action Movies', category: 'entertainment', badge: '💥', desc: 'Non-stop action films', url: 'https://jmp2.uk/plu-63.m3u8' },
  { id: 'pluto-horror', name: 'Horror 24/7', category: 'entertainment', badge: '👻', desc: 'Horror movies round the clock', url: 'https://jmp2.uk/plu-106.m3u8' },
  { id: 'pluto-scifi', name: 'Sci-Fi Movies', category: 'entertainment', badge: '🚀', desc: 'Science fiction films', url: 'https://jmp2.uk/plu-64.m3u8' },
  { id: 'pluto-crime', name: 'Crime Drama', category: 'entertainment', badge: '🔍', desc: 'Crime & thriller dramas', url: 'https://jmp2.uk/plu-195.m3u8' },
  { id: 'pluto-kids', name: 'Kids TV', category: 'entertainment', badge: '🧒', desc: 'Family & kids programming', url: 'https://jmp2.uk/plu-100.m3u8' },
];

app.get('/proxy/live-channels', (req, res) => {
  res.json({ success: true, channels: LIVE_CHANNELS });
});

// ===== WATCH INFO — builds embed server list including MovieBox & HydraHD =====
app.get('/proxy/watch', wrap(async (req, res) => {
  const { subjectId } = req.query;
  if (!subjectId) return res.json({ success: false, error: 'Missing subjectId' });

  const detail = await proxyFetch(`${API_BASE}/rich-detail?subjectId=${subjectId}`);
  const d = detail?.data;
  if (!d) return res.json({ success: false, error: 'Could not fetch detail' });

  const isShow = d.subjectType === 2;
  const imdbId = await getImdbId(d.title, d.releaseDate, isShow);

  let servers = [];
  if (imdbId) {
    if (isShow) {
      servers = [
        { label: 'Server 1', url: `https://player.videasy.net/tv/${imdbId}/1/1` },
        { label: 'Blizzflix', url: `https://moviesapi.club/tv/${imdbId}-1-1` },
        { label: 'Server 2', url: `https://vidsrc.me/embed/tv?imdb=${imdbId}&season=1&episode=1` },
        { label: 'Server 3', url: `https://vidsrc.xyz/embed/tv?imdb=${imdbId}&season=1&episode=1` },
        { label: 'Server 4', url: `https://2embed.cc/embedtv/${imdbId}` },
      ];
    } else {
      servers = [
        { label: 'Server 1', url: `https://autoembed.co/movie/imdb/${imdbId}` },
        { label: 'Blizzflix', url: `https://moviesapi.club/movie/${imdbId}` },
        { label: 'Server 2', url: `https://player.videasy.net/movie/${imdbId}` },
        { label: 'Server 3', url: `https://vidsrc.me/embed/movie?imdb=${imdbId}` },
        { label: 'Server 4', url: `https://vidsrc.xyz/embed/movie?imdb=${imdbId}` },
      ];
    }
  }

  const vidsrcUrl = servers.length ? servers[0].url : null;
  const detailPath = d.detailPath || '';
  const aoneUrl = detailPath ? `https://www.aoneroom.com/videos/${detailPath}` : null;

  let previewUrl = null;
  if (d.trailerUrl) {
    try {
      const host = new URL(d.trailerUrl).hostname;
      if (ALLOWED_CDN.includes(host)) {
        previewUrl = `/proxy/video?url=${encodeURIComponent(d.trailerUrl)}`;
      }
    } catch (_) {}
  }

  const tracks = (d.dubs || []).map(dub => ({
    subjectId: dub.subjectId,
    label: dub.lanName,
    detailPath: dub.detailPath,
    aoneUrl: dub.detailPath ? `https://www.aoneroom.com/videos/${dub.detailPath}` : null,
    original: dub.original,
  }));

  res.json({
    success: true,
    title: d.title,
    imdbId,
    servers,
    vidsrcUrl,
    aoneUrl,
    previewUrl,
    tracks,
    isShow,
    year: d.releaseDate ? d.releaseDate.split('-')[0] : null,
    rating: d.imdbRatingValue || null,
    genres: d.genre ? d.genre.split(',').map(g => g.trim()).filter(Boolean) : [],
    posterUrl: d.cover?.url || null,
    description: d.description || null,
    country: d.countryName || null,
    duration: d.duration || null,
  });
}));

// ===== VIDEO PROXY — pipes CDN video with range request support =====
app.get('/proxy/video', wrap(async (req, res) => {
  const rawUrl = req.query.url;
  if (!rawUrl) return res.status(400).send('Missing url');

  let parsed;
  try { parsed = new URL(decodeURIComponent(rawUrl)); } catch { return res.status(400).send('Invalid url'); }

  if (!ALLOWED_CDN.includes(parsed.hostname)) {
    return res.status(403).send('Domain not allowed');
  }

  const fetchHeaders = {
    'User-Agent': BROWSER_HEADERS['User-Agent'],
    'Referer': 'https://www.aoneroom.com/',
    'Origin': 'https://www.aoneroom.com',
  };
  if (req.headers.range) fetchHeaders['Range'] = req.headers.range;

  const upstream = await fetch(parsed.href, { headers: fetchHeaders });

  res.status(upstream.status);
  const forward = ['content-type', 'content-length', 'content-range', 'accept-ranges'];
  forward.forEach(h => { const v = upstream.headers.get(h); if (v) res.setHeader(h, v); });
  res.setHeader('Access-Control-Allow-Origin', '*');

  const { Readable } = require('stream');
  Readable.fromWeb(upstream.body).pipe(res);
}));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`BlueBlizzard FreeFlix running on http://0.0.0.0:${PORT}`);
});
