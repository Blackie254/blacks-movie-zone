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

async function proxyFetch(url) {
  try {
    const res = await fetch(url, { headers: BROWSER_HEADERS });
    const text = await res.text();
    try { return JSON.parse(text); } catch { return { success: false, error: 'Invalid response from upstream' }; }
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
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible)' },
      signal: AbortSignal.timeout(5000),
    });
    const data = await res.json();
    const results = data.d || [];
    const tvTypes = ['tvSeries', 'tvMiniSeries', 'tvShort', 'tvMovie'];

    // 1. Exact title + year + correct type
    let match = results.find(r =>
      r.l?.toLowerCase() === title.toLowerCase() &&
      (!year || r.y === year) &&
      (isShow ? tvTypes.includes(r.qid) : r.qid === 'movie')
    );
    // 2. Exact title + year (any type)
    if (!match && year) match = results.find(r => r.l?.toLowerCase() === title.toLowerCase() && r.y === year);
    // 3. Exact title only
    if (!match) match = results.find(r => r.l?.toLowerCase() === title.toLowerCase());
    // 4. First result
    if (!match) match = results[0];

    return match?.id || null;
  } catch (_) {
    return null;
  }
}

// ===== WATCH INFO — extracts playable URLs from rich-detail =====
app.get('/proxy/watch', wrap(async (req, res) => {
  const { subjectId } = req.query;
  if (!subjectId) return res.json({ success: false, error: 'Missing subjectId' });

  const detail = await proxyFetch(`${API_BASE}/rich-detail?subjectId=${subjectId}`);

  const d = detail?.data;
  if (!d) return res.json({ success: false, error: 'Could not fetch detail' });

  const isShow = d.subjectType === 2;

  // Look up IMDb ID → build vidsrc.to embed (allows iframing, full movie)
  const imdbId = await getImdbId(d.title, d.releaseDate, isShow);
  let vidsrcUrl = null;
  if (imdbId) {
    vidsrcUrl = isShow
      ? `https://vidsrc.to/embed/tv/${imdbId}`
      : `https://vidsrc.to/embed/movie/${imdbId}`;
  }

  // aOneRoom embed as secondary fallback
  const detailPath = d.detailPath || '';
  const aoneUrl = detailPath ? `https://www.aoneroom.com/videos/${detailPath}` : null;

  // Short CDN preview clip (trailer — not the full movie)
  let previewUrl = null;
  if (d.trailerUrl) {
    try {
      const host = new URL(d.trailerUrl).hostname;
      if (ALLOWED_CDN.includes(host)) {
        previewUrl = `/proxy/video?url=${encodeURIComponent(d.trailerUrl)}`;
      }
    } catch (_) {}
  }

  // Language / dub track list (vidsrc doesn't support per-dub, aOneRoom does)
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
    vidsrcUrl,
    aoneUrl,
    previewUrl,
    tracks,
    isShow,
    year: d.releaseDate ? d.releaseDate.split('-')[0] : null,
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
