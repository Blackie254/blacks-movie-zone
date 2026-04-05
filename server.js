const express = require('express');
const path = require('path');

const app = express();
const PORT = 5000;
const API_BASE = 'https://movieapi.xcasper.space/api';

const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9',
  'Referer': 'https://movieapi.xcasper.space/',
  'Origin': 'https://movieapi.xcasper.space',
};

async function proxyFetch(url) {
  const res = await fetch(url, { headers: BROWSER_HEADERS });
  return res.json();
}

app.use(express.static(path.join(__dirname, 'public')));

app.get('/proxy/trending', async (req, res) => {
  const { page = 0, perPage = 18 } = req.query;
  const data = await proxyFetch(`${API_BASE}/trending?page=${page}&perPage=${perPage}`);
  res.json(data);
});

app.get('/proxy/ranking', async (req, res) => {
  const { id } = req.query;
  const url = id ? `${API_BASE}/ranking?id=${id}` : `${API_BASE}/ranking`;
  const data = await proxyFetch(url);
  res.json(data);
});

app.get('/proxy/homepage', async (req, res) => {
  const data = await proxyFetch(`${API_BASE}/homepage`);
  res.json(data);
});

app.get('/proxy/search', async (req, res) => {
  const { keyword, page = 1, perPage = 20, subjectType } = req.query;
  let url = `${API_BASE}/search?keyword=${encodeURIComponent(keyword)}&page=${page}&perPage=${perPage}`;
  if (subjectType) url += `&subjectType=${subjectType}`;
  const data = await proxyFetch(url);
  res.json(data);
});

app.get('/proxy/search/suggest', async (req, res) => {
  const { keyword } = req.query;
  const data = await proxyFetch(`${API_BASE}/search/suggest?keyword=${encodeURIComponent(keyword)}`);
  res.json(data);
});

app.get('/proxy/rich-detail', async (req, res) => {
  const { subjectId } = req.query;
  const data = await proxyFetch(`${API_BASE}/rich-detail?subjectId=${subjectId}`);
  res.json(data);
});

app.get('/proxy/play', async (req, res) => {
  const { subjectId } = req.query;
  const data = await proxyFetch(`${API_BASE}/play?subjectId=${subjectId}`);
  res.json(data);
});

app.get('/proxy/stream', async (req, res) => {
  const { subjectId } = req.query;
  const data = await proxyFetch(`${API_BASE}/bff/stream?subjectId=${subjectId}`);
  res.json(data);
});

app.get('/proxy/captions', async (req, res) => {
  const { subjectId, streamId } = req.query;
  const data = await proxyFetch(`${API_BASE}/captions?subjectId=${subjectId}&streamId=${streamId}`);
  res.json(data);
});

app.get('/proxy/recommend', async (req, res) => {
  const { subjectId, page = 1, perPage = 12 } = req.query;
  const data = await proxyFetch(`${API_BASE}/recommend?subjectId=${subjectId}&page=${page}&perPage=${perPage}`);
  res.json(data);
});

app.get('/proxy/browse', async (req, res) => {
  const { subjectType = 1, genre, countryName, page = 1, perPage = 20 } = req.query;
  let url = `${API_BASE}/browse?subjectType=${subjectType}&page=${page}&perPage=${perPage}`;
  if (genre) url += `&genre=${encodeURIComponent(genre)}`;
  if (countryName) url += `&countryName=${encodeURIComponent(countryName)}`;
  const data = await proxyFetch(url);
  res.json(data);
});

app.get('/proxy/hot', async (req, res) => {
  const data = await proxyFetch(`${API_BASE}/hot`);
  res.json(data);
});

app.get('/proxy/live', async (req, res) => {
  const data = await proxyFetch(`${API_BASE}/live`);
  res.json(data);
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`BlueBlizzard FreeFlix running on http://0.0.0.0:${PORT}`);
});
