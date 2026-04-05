# BlueBlizzard FreeFlix

A full-featured movie and TV show streaming discovery website powered by the Casper Tech Kenya API.

## Architecture

- **Runtime**: Node.js 20
- **Server**: Express.js on port 5000 (serves static frontend + proxies API calls)
- **Frontend**: Vanilla SPA (HTML, CSS, JavaScript — no framework)
- **API**: https://movieapi.xcasper.space/api (proxied via backend to add browser headers)

## Project Structure

```
.
├── server.js          # Express server — serves static files + proxy routes on port 5000
├── package.json       # Node.js dependencies (express)
├── public/
│   ├── index.html     # SPA shell (navbar, player overlay, toast, app div)
│   ├── style.css      # Full dark cinematic theme (CSS variables, responsive)
│   └── app.js         # SPA router, API calls, all page renderers
└── replit.md          # This file
```

## API Proxy Routes

All routes are on `/proxy/*` and forward to `https://movieapi.xcasper.space/api/*` with browser headers:

- `GET /proxy/trending` — Trending content
- `GET /proxy/ranking` — Rankings with genre tabs
- `GET /proxy/homepage` — Homepage sections
- `GET /proxy/search` — Search by keyword
- `GET /proxy/search/suggest` — Search autocomplete
- `GET /proxy/rich-detail` — Full movie/show details
- `GET /proxy/play` — Episode list and play data
- `GET /proxy/stream` — Video stream URLs
- `GET /proxy/recommend` — Recommendations
- `GET /proxy/browse` — Browse by genre/country

## Pages

- **Home** (`/`) — Hero banner slideshow + Trending + Rankings + Movies + Shows sections
- **Movies** (`/movies`) — Browse movies with genre/country filters
- **TV Shows** (`/shows`) — Browse TV shows with genre/country filters
- **Trending** (`/trending`) — Grid of all trending content
- **Browse** (`/browse`) — Filterable browse with Type/Genre/Country dropdowns
- **Search** (`/search?q=...`) — Search results with type filter
- **Detail** (`/detail/:id`) — Full detail page with cast, episodes (for shows), recommendations
- **Live TV** (`/live`) — Live TV with hero banner, tabbed categories (Wrestling/Sports/News/Entertainment/All), HLS.js streaming, curated iptv-org channels
- **Player** — Overlay modal video player with stream quality switcher; HLS.js for m3u8 live streams

## Live TV System

Curated channels sourced from iptv-org public API (streams.json / channels.json):
- **Wrestling & Combat**: TNA Wrestling, Impact Network, Fight Network, FightBox HD, DAZN Combat, Hard Knocks, Persiana Fight
- **Sports**: beIN SPORTS XTRA, ESPN8: The Ocho, CBS Sports HQ, CBS Golazo, DD Sports India, ERT Sports 1, Africa24 Sport
- **News**: ABC News Live (2 streams), CBC News
- **Entertainment**: Pluto TV channels (classic films, action, horror, comedy, sci-fi, crime)

Server endpoint: `GET /proxy/live-channels` — returns hardcoded curated channel list with stream URLs.
HLS.js loaded via CDN for m3u8 stream support in all browsers.

## Features

- Hero banner with auto-sliding showcase (6 slides, 7s interval)
- Real-time search with autocomplete suggestions
- Movie/TV card grid with poster images, ratings, genres
- Video player with stream URL loading
- Ranking tabs (Popular, BoxOffice, Action, Horror, etc.)
- Browse with genre + country filtering + load more pagination
- Responsive design for mobile and desktop
