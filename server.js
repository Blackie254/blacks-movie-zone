const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;
const API_BASE = 'https://movieapi.xcasper.space/api';
const ALLOWED_CDN = ['macdn.aoneroom.com', 'pbcdnw.aoneroom.com', 'cdn.aoneroom.com'];

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
  const pages = ['/', '/movies', '/shows', '/trending', '/browse', '/live', '/new'];
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

// ===== IMDb ID lookup (fast) =====
function cleanTitleForImdb(title) {
  // Strip everything after | · — to get the primary title only
  return (title || '').split(/[|·—]/)[0].trim();
}

async function getImdbId(title, releaseDate, isShow) {
  try {
    const rawTitle = (title || '').trim();
    if (!rawTitle) return null;
    const cleanTitle = cleanTitleForImdb(rawTitle);
    const year = releaseDate ? parseInt(releaseDate.split('-')[0]) : null;
    const cacheKey = `imdb:${cleanTitle.toLowerCase()}:${year}`;
    const cached = getCached(cacheKey);
    if (cached) return cached;

    // Try clean title first, then raw title as fallback
    for (const query of [cleanTitle, rawTitle]) {
      if (!query) continue;
      const firstChar = query[0].toLowerCase();
      const url = `https://v2.sg.media-imdb.com/suggestion/${firstChar}/${encodeURIComponent(query)}.json`;
      try {
        const res = await fetch(url, {
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible)' },
          signal: AbortSignal.timeout(5000),
        });
        const data = await res.json();
        const results = data.d || [];
        if (!results.length) continue;
        const tvTypes = ['tvSeries', 'tvMiniSeries', 'tvShort', 'tvMovie'];
        const ql = query.toLowerCase();

        let match = results.find(r =>
          r.l?.toLowerCase() === ql &&
          (!year || r.y === year) &&
          (isShow ? tvTypes.includes(r.qid) : r.qid === 'movie')
        );
        if (!match && year) match = results.find(r => r.l?.toLowerCase() === ql && r.y === year);
        if (!match) match = results.find(r => r.l?.toLowerCase() === ql);
        if (!match && year) match = results.find(r => Math.abs((r.y || 0) - year) <= 1);
        if (!match) match = results[0];

        const id = match?.id || null;
        if (id) { setCache(cacheKey, id); return id; }
      } catch (_) {}
    }
    setCache(cacheKey, null);
    return null;
  } catch (_) {
    return null;
  }
}

// ===== BUILD EMBED SERVERS =====
function buildEmbedServers(imdbId, isShow, s, e) {
  if (!imdbId) return [];

  if (isShow) {
    return [
      { label: 'Blizzflix 1',  type: 'embed', badge: 'HD',  url: `https://vidsrc.to/embed/tv/${imdbId}/${s}/${e}` },
      { label: 'Blizzflix 2',  type: 'embed', badge: 'HD',  url: `https://player.videasy.net/tv/${imdbId}/${s}/${e}` },
      { label: 'Blizzflix 3',  type: 'embed', badge: '4K',  url: `https://embed.su/embed/tv/${imdbId}/${s}/${e}` },
      { label: 'Blizzflix 4',  type: 'embed', badge: 'HD',  url: `https://vidsrc.net/embed/tv?imdb=${imdbId}&season=${s}&episode=${e}` },
      { label: 'Blizzflix 5',  type: 'embed', badge: 'HD',  url: `https://autoembed.co/tv/imdb/${imdbId}-${s}-${e}` },
      { label: 'Blizzflix 6',  type: 'embed', badge: 'HD',  url: `https://multiembed.mov/?video_id=${imdbId}&imdb=1&s=${s}&e=${e}` },
      { label: 'Blizzflix 7',  type: 'embed', badge: 'HD',  url: `https://player.smashy.stream/tv/${imdbId}?s=${s}&e=${e}` },
      { label: 'Blizzflix 8',  type: 'embed', badge: 'HD',  url: `https://www.2embed.cc/embedtv/${imdbId}&s=${s}&e=${e}` },
      { label: 'Blizzflix 9',  type: 'embed', badge: 'HD',  url: `https://moviesapi.club/tv/${imdbId}-${s}-${e}` },
      { label: 'Blizzflix 10', type: 'embed', badge: 'HD',  url: `https://vidsrc.pro/embed/tv/${imdbId}/${s}/${e}` },
    ];
  } else {
    return [
      { label: 'Blizzflix 1',  type: 'embed', badge: 'HD',  url: `https://vidsrc.xyz/embed/movie/${imdbId}` },
      { label: 'Blizzflix 2',  type: 'embed', badge: 'HD',  url: `https://player.videasy.net/movie/${imdbId}` },
      { label: 'Blizzflix 3',  type: 'embed', badge: '4K',  url: `https://embed.su/embed/movie/${imdbId}` },
      { label: 'Blizzflix 4',  type: 'embed', badge: 'HD',  url: `https://vidsrc.net/embed/movie?imdb=${imdbId}` },
      { label: 'Blizzflix 5',  type: 'embed', badge: 'HD',  url: `https://autoembed.co/movie/imdb/${imdbId}` },
      { label: 'Blizzflix 6',  type: 'embed', badge: 'HD',  url: `https://multiembed.mov/?video_id=${imdbId}&imdb=1` },
      { label: 'Blizzflix 7',  type: 'embed', badge: 'HD',  url: `https://player.smashy.stream/movie/${imdbId}` },
      { label: 'Blizzflix 8',  type: 'embed', badge: 'HD',  url: `https://www.2embed.cc/embed/${imdbId}` },
      { label: 'Blizzflix 9',  type: 'embed', badge: 'HD',  url: `https://moviesapi.club/movie/${imdbId}` },
      { label: 'Blizzflix 10', type: 'embed', badge: 'HD',  url: `https://vidsrc.pro/embed/movie/${imdbId}` },
    ];
  }
}

// ===== CURATED LIVE CHANNELS =====
// type: 'hls' = HLS stream via proxy, 'embed' = direct iframe embed
const LIVE_CHANNELS = [
  { id: 'wwe-yt', name: 'WWE', category: 'wrestling', badge: '🎯', desc: 'WWE highlights, events & content', type: 'embed', url: 'https://www.youtube.com/embed/live_stream?channel=UCJ5v_MCY6GNUBTO8-D3XoAg&autoplay=1' },
  { id: 'ufc-yt', name: 'UFC', category: 'wrestling', badge: '🥊', desc: 'UFC fights & MMA action', type: 'embed', url: 'https://www.youtube.com/embed/live_stream?channel=UCvgfXK4nTYKudb0rFR6noLA&autoplay=1' },
  { id: 'aew-yt', name: 'AEW Wrestling', category: 'wrestling', badge: '⚡', desc: 'All Elite Wrestling live & events', type: 'embed', url: 'https://www.youtube.com/embed/live_stream?channel=UCFDd4QMFALYAOq1cJqXQwcA&autoplay=1' },
  { id: 'bellator-yt', name: 'Bellator MMA', category: 'wrestling', badge: '🏆', desc: 'Bellator MMA fights & events', type: 'embed', url: 'https://www.youtube.com/embed/live_stream?channel=UCM0ZRQiPcB1g3cVNEMfRhZA&autoplay=1' },
  { id: 'prowrestling-yt', name: 'Pro Wrestling', category: 'wrestling', badge: '💪', desc: 'Pro wrestling action & highlights', type: 'embed', url: 'https://www.youtube.com/embed/live_stream?channel=UCZ_LWCpk9lK4T8VIE4RMWPQ&autoplay=1' },
  { id: 'combat-sports-yt', name: 'Combat Sports', category: 'wrestling', badge: '⚔️', desc: 'Boxing, kickboxing & combat sports', type: 'embed', url: 'https://www.youtube.com/embed/live_stream?channel=UCRifB4Y8DBTnuV6B1H8KJKQ&autoplay=1' },
  { id: 'espnocho', name: 'ESPN8: The Ocho', category: 'sports', badge: '🏆', desc: 'Almost a sport — it is on ESPN8', type: 'hls', url: 'https://d3b6q2ou5kp8ke.cloudfront.net/ESPNTheOcho.m3u8' },
  { id: 'cbssports', name: 'CBS Sports HQ', category: 'sports', badge: '🎯', desc: 'CBS Sports 24/7 news & events', type: 'hls', url: 'https://cbsn-us.cbsnews.com/cbnshd/master.m3u8' },
  { id: 'cbsgolazo', name: 'CBS Golazo', category: 'sports', badge: '⚽', desc: 'Soccer news & highlights', type: 'hls', url: 'https://proped3fhg87.airspace-cdn.cbsivideo.com/golazo-live-dai/master/golazo-live.m3u8' },
  { id: 'bein', name: 'beIN SPORTS XTRA', category: 'sports', badge: '🏅', desc: 'Premium sports from beIN', type: 'hls', url: 'https://amg01334-beinsportsllc-beinxtra-samsungau-eiyvc.amagi.tv/playlist/amg01334-beinsportsllc-beinxtra-samsungau/playlist.m3u8' },
  { id: 'ddsports', name: 'DD Sports India', category: 'sports', badge: '🏏', desc: 'Cricket, kabaddi & more', type: 'hls', url: 'https://d3qs3d2rkhfqrt.cloudfront.net/out/v1/b17adfe543354fdd8d189b110617cddd/index.m3u8' },
  { id: 'tennis-yt', name: 'Tennis TV Live', category: 'sports', badge: '🎾', desc: 'Live tennis tournaments', type: 'embed', url: 'https://www.youtube.com/embed/live_stream?channel=UCnyfNe2M08Q-gTpFsZE8fBw&autoplay=1' },
  { id: 'abcnews1', name: 'ABC News Live', category: 'news', badge: '📺', desc: 'Breaking news 24/7', type: 'embed', url: 'https://www.youtube.com/embed/live_stream?channel=UCBi2mrWuNuyYy4gbM6fU18Q&autoplay=1' },
  { id: 'dwnews', name: 'DW News', category: 'news', badge: '🌍', desc: 'Deutsche Welle international news', type: 'embed', url: 'https://www.youtube.com/embed/live_stream?channel=UCknLrEdhRCp1aegoMqRaCZg&autoplay=1' },
  { id: 'aljaz', name: 'Al Jazeera English', category: 'news', badge: '🌐', desc: 'Al Jazeera global news 24/7', type: 'embed', url: 'https://www.youtube.com/embed/live_stream?channel=UCNye-wNBqNL5ZzHSJj3l8Bg&autoplay=1' },
  { id: 'france24', name: 'France 24 English', category: 'news', badge: '🗼', desc: 'French international news in English', type: 'embed', url: 'https://www.youtube.com/embed/live_stream?channel=UCQfwfsi5VrQ8yKZ-UWmAoBg&autoplay=1' },
  { id: 'bloomberg', name: 'Bloomberg TV', category: 'news', badge: '📈', desc: 'Business & financial news', type: 'embed', url: 'https://www.youtube.com/embed/live_stream?channel=UCIALMKvObZNtJ6AmdCLP7Lg&autoplay=1' },
  { id: 'cbcnews', name: 'CBC News', category: 'news', badge: '🍁', desc: "Canada's public news network", type: 'hls', url: 'https://nn.geo.cbc.ca/hls/cbc-1080.m3u8' },
  { id: 'sky-news', name: 'Sky News', category: 'news', badge: '🇬🇧', desc: 'UK live news coverage', type: 'embed', url: 'https://www.youtube.com/embed/live_stream?channel=UCegOTmclzjfKuQh-SHRRgaQ&autoplay=1' },
  { id: 'standup247', name: 'Stand-Up 24/7', category: 'comedy', badge: '🎤', desc: 'Non-stop stand-up comedy', type: 'hls', url: 'https://jmp2.uk/plu-82.m3u8' },
  { id: 'comedy-movies', name: 'Comedy Movies', category: 'comedy', badge: '🎬', desc: 'Comedy films around the clock', type: 'hls', url: 'https://jmp2.uk/plu-163.m3u8' },
  { id: 'romcom', name: 'RomCom Channel', category: 'comedy', badge: '❤️', desc: 'Romantic comedies 24/7', type: 'hls', url: 'https://jmp2.uk/plu-107.m3u8' },
  { id: 'comedy-tv', name: 'Comedy TV', category: 'comedy', badge: '😄', desc: 'Classic & modern comedy series', type: 'hls', url: 'https://jmp2.uk/plu-178.m3u8' },
  { id: 'nasa', name: 'NASA TV', category: 'entertainment', badge: '🚀', desc: 'Live space missions & science', type: 'hls', url: 'https://nasa-i.akamaihd.net/hls/live/253565/NASA-NTV1-HLS/master.m3u8' },
  { id: 'pluto-action', name: 'Action Movies', category: 'entertainment', badge: '💥', desc: 'Non-stop action films', type: 'hls', url: 'https://jmp2.uk/plu-63.m3u8' },
  { id: 'pluto-horror', name: 'Horror 24/7', category: 'entertainment', badge: '👻', desc: 'Horror movies round the clock', type: 'hls', url: 'https://jmp2.uk/plu-106.m3u8' },
  { id: 'pluto-scifi', name: 'Sci-Fi Movies', category: 'entertainment', badge: '🛸', desc: 'Science fiction films', type: 'hls', url: 'https://jmp2.uk/plu-64.m3u8' },
  { id: 'pluto-crime', name: 'Crime Drama', category: 'entertainment', badge: '🔍', desc: 'Crime & thriller dramas', type: 'hls', url: 'https://jmp2.uk/plu-195.m3u8' },
  { id: 'pluto-classic', name: 'Classic Movies', category: 'entertainment', badge: '🎞️', desc: 'Timeless classic films', type: 'hls', url: 'https://jmp2.uk/plu-62.m3u8' },
  { id: 'anime-yt', name: 'Anime Live', category: 'entertainment', badge: '🎌', desc: 'Anime episodes & films', type: 'embed', url: 'https://www.youtube.com/embed/live_stream?channel=UCxxnxya_32jcKj4yN1_kD7A&autoplay=1' },
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

// ===== HLS-AWARE STREAM PROXY =====
app.get('/proxy/mb-stream', wrap(async (req, res) => {
  const rawUrl = req.query.url;
  if (!rawUrl) return res.status(400).send('Missing url');
  let targetUrl;
  try { targetUrl = decodeURIComponent(rawUrl); } catch { return res.status(400).send('Invalid url'); }

  const upHeaders = {
    'User-Agent': BROWSER_HEADERS['User-Agent'],
    'Referer': 'https://www.showbox.media/',
    'Origin': 'https://www.showbox.media',
  };
  if (req.headers.range) upHeaders['Range'] = req.headers.range;

  const upstream = await fetch(targetUrl, { headers: upHeaders });
  const ct = upstream.headers.get('content-type') || '';

  res.setHeader('Access-Control-Allow-Origin', '*');

  if (ct.includes('mpegurl') || targetUrl.includes('.m3u8')) {
    const text = await upstream.text();
    const baseUrl = targetUrl.substring(0, targetUrl.lastIndexOf('/') + 1);
    const rewritten = text.split('\n').map(line => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return line;
      const absUrl = trimmed.startsWith('http') ? trimmed : baseUrl + trimmed;
      return `/proxy/mb-stream?url=${encodeURIComponent(absUrl)}`;
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

// ===== WATCH INFO (fast embed-first approach) =====
app.get('/proxy/watch', wrap(async (req, res) => {
  const { subjectId, season = '1', episode = '1' } = req.query;
  if (!subjectId) return res.json({ success: false, error: 'Missing subjectId' });

  const detail = await proxyFetch(`${API_BASE}/rich-detail?subjectId=${subjectId}`);
  const d = detail?.data;
  if (!d) return res.json({ success: false, error: 'Could not fetch detail' });

  const isShow = d.subjectType === 2;
  const s = parseInt(season) || 1;
  const e = parseInt(episode) || 1;

  // Get IMDb ID - this unlocks all embed servers
  const imdbId = await getImdbId(d.title, d.releaseDate, isShow);

  // Build servers from reliable embed providers
  const servers = buildEmbedServers(imdbId, isShow, s, e);

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
    original: dub.original,
  }));

  res.json({
    success: true,
    title: d.title,
    imdbId,
    servers,
    previewUrl,
    tracks,
    isShow,
    season: s,
    episode: e,
    year: d.releaseDate ? d.releaseDate.split('-')[0] : null,
    rating: d.imdbRatingValue || null,
    genres: d.genre ? d.genre.split(',').map(g => g.trim()).filter(Boolean) : [],
    posterUrl: d.cover?.url || null,
    description: d.description || null,
    country: d.countryName || null,
    duration: d.duration || null,
  });
}));

// ===== VIDEO PROXY =====
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
