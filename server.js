const express = require('express'), path = require('path');
const app = express(), KEY = process.env.TMDB_KEY;
const cache = new Map();
async function cached(k, ttl, fn) {
  const c = cache.get(k); if (c && Date.now() - c.t < ttl) return c.v;
  const v = await fn(); cache.set(k, { t: Date.now(), v }); return v;
}
app.use(express.static(path.join(__dirname, 'public'), { maxAge: '1h' }));

app.get('/api/tmdb/*', async (req, res) => {
  if (!KEY) return res.status(500).json({ error: 'TMDB_KEY is not set on the server' });
  const u = new URL('https://api.themoviedb.org/3/' + req.params[0]);
  for (const [k, v] of Object.entries(req.query)) u.searchParams.set(k, v);
  u.searchParams.set('api_key', KEY);
  try {
    const data = await cached(u.href, 10 * 60e3, async () => {
      const r = await fetch(u); if (!r.ok) throw new Error('TMDB ' + r.status); return r.json();
    });
    res.json(data);
  } catch (e) { res.status(502).json({ error: e.message }); }
});

// Free-to-air channels from the community iptv-org catalogue (https streams only)
app.get('/api/live', async (req, res) => {
  try {
    const all = await cached('live', 3600e3, async () => {
      const [ch, st] = await Promise.all([
        fetch('https://iptv-org.github.io/api/channels.json').then(r => r.json()),
        fetch('https://iptv-org.github.io/api/streams.json').then(r => r.json())]);
      const urls = {};
      for (const s of st) if (s.channel && /^https:\/\/.+\.m3u8/i.test(s.url) && !urls[s.channel]) urls[s.channel] = s.url;
      return ch.filter(c => urls[c.id] && !c.is_nsfw && !c.closed && !(c.categories || []).includes('xxx'))
        .map(c => ({ id: c.id, name: c.name, country: c.country, cats: c.categories || [], url: urls[c.id] }));
    });
    const { cat, q, country } = req.query;
    let out = all;
    if (cat && cat !== 'all') out = out.filter(c => c.cats.includes(cat));
    if (country) out = out.filter(c => c.country === country);
    if (q) out = out.filter(c => c.name.toLowerCase().includes(String(q).toLowerCase()));
    res.json(out.slice(0, 120));
  } catch (e) { res.status(502).json({ error: e.message }); }
});

app.get('*', (_, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.listen(process.env.PORT || 5000, () => console.log('FreeFlixx running'));
