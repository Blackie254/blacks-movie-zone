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

// ===== WATCH INFO — extracts playable URLs from rich-detail + stream API =====
app.get('/proxy/watch', wrap(async (req, res) => {
  const { subjectId } = req.query;
  if (!subjectId) return res.json({ success: false, error: 'Missing subjectId' });

  const [detail, streamData] = await Promise.all([
    proxyFetch(`${API_BASE}/rich-detail?subjectId=${subjectId}`),
    proxyFetch(`${API_BASE}/bff/stream?subjectId=${subjectId}`),
  ]);

  const d = detail?.data;
  if (!d) return res.json({ success: false, error: 'Could not fetch detail' });

  const detailPath = d.detailPath || '';
  const embedUrl = detailPath ? `https://www.aoneroom.com/videos/${detailPath}` : null;

  // Extract direct stream URLs from the stream API response
  const sd = streamData?.data || streamData;
  const rawStreams =
    sd?.streamList ||
    sd?.streams ||
    sd?.sources ||
    (sd?.url ? [{ url: sd.url, quality: 'Default' }] : []);

  const streams = rawStreams
    .filter(s => s?.url)
    .map(s => ({
      url: `/proxy/video?url=${encodeURIComponent(s.url)}`,
      quality: s.quality || s.resolution || s.label || 'Default',
      raw: s.url,
    }))
    .filter(s => {
      try {
        const host = new URL(s.raw).hostname;
        return ALLOWED_CDN.includes(host);
      } catch { return false; }
    });

  // Build dub/audio track list
  const tracks = (d.dubs || []).map(dub => ({
    subjectId: dub.subjectId,
    label: dub.lanName,
    detailPath: dub.detailPath,
    embedUrl: dub.detailPath ? `https://www.aoneroom.com/videos/${dub.detailPath}` : null,
    original: dub.original,
  }));

  res.json({
    success: true,
    title: d.title,
    trailerUrl: d.trailerUrl || null,
    trailerCover: d.trailerCover || null,
    embedUrl,
    detailPath,
    streams,
    tracks,
    isShow: d.subjectType === 2,
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
