# BlueBlizzard FreeFlix

A full-featured free streaming SPA for movies, TV shows, and live TV — inspired by MovieBox and HydraHD with a premium cinematic aesthetic.

## Architecture

- **Runtime**: Node.js 20
- **Server**: Express.js on port 5000 (serves static frontend + proxies API calls)
- **Frontend**: Vanilla SPA (HTML, CSS, JavaScript — no framework)
- **API**: https://movieapi.xcasper.space/api (proxied via backend with browser headers)

## Design

- **Color palette**: Deep dark bg (`#0a0a0f`) with purple/violet primary (`#6c63ff`) inspired by MovieBox/HydraHD
- **Logo**: Play button icon in purple rounded square (replaces old snowflake)
- **Cards**: 2:3 poster ratio with hover elevation, play button overlay, rating & genre meta
- **Hero**: Cinematic full-width slider with backdrop image, gradient overlay, 7s auto-advance
- **Typography**: Inter font family — 300–900 weight range

## Project Structure

```
.
├── server.js          # Express server — static files + API proxy + stream resolver
├── package.json       # Node.js dependencies (express)
├── public/
│   ├── index.html     # SPA shell (navbar, player overlay, toast, main#app)
│   ├── style.css      # Full premium dark theme (CSS variables, animations, responsive)
│   └── app.js         # SPA router, API calls, all page renderers
└── replit.md          # This file
```

## API Proxy Routes

All on `/proxy/*` forwarded to upstream API with browser headers:

- `GET /proxy/trending` — Trending content
- `GET /proxy/ranking` — Rankings with category tabs
- `GET /proxy/homepage` — Homepage sections
- `GET /proxy/search` — Search by keyword + type filter
- `GET /proxy/search/suggest` — Search autocomplete
- `GET /proxy/rich-detail` — Full movie/show details + cast
- `GET /proxy/play` — Episode list
- `GET /proxy/stream` / `GET /proxy/showbox/streams` — Video stream URLs
- `GET /proxy/recommend` — Similar title recommendations
- `GET /proxy/browse` — Browse by type/genre/country
- `GET /proxy/live-channels` — Curated live channel list
- `GET /proxy/watch` — Stream resolver (MovieBox + embed fallbacks + IMDb lookup)
- `GET /proxy/mb-stream` — HLS-aware MovieBox stream proxy with manifest rewriting
- `GET /proxy/newtoxic/*` — New arrivals content
- `GET /proxy/staff/*` — Actor/director detail + filmography

## Stream Resolver (Server 1 fix)

`GET /proxy/watch?subjectId=X&season=S&episode=E`:
1. Fetches rich-detail for the title
2. Looks up IMDb ID via IMDb suggestion API
3. Races MovieBox stream resolver (showbox API) with 8s timeout
4. Builds server list:
   - **Server 1**: MovieBox direct HLS stream (if available) — proxied via `/proxy/mb-stream`
   - **Blizzflix**: `vidsrc.to/embed/...` with IMDb ID
   - **Server 2**: `player.videasy.net`
   - **Server 3**: `vidsrc.me`
   - **Server 4**: `moviesapi.club`
   - **Server 5**: `2embed.cc`
5. TV shows pass correct `season` and `episode` to all embed URLs

## Pages

- **Home** (`/`) — Hero banner slideshow + genre filter bar + Trending + Rankings + Movies + Shows + New Arrivals
- **Movies** (`/movies`) — Browse movies with genre filter pills
- **TV Shows** (`/shows`) — Browse TV shows with genre filter pills
- **Trending** (`/trending`) — Full grid of trending content
- **Browse** (`/browse`) — Filterable by Type / Genre / Country with load more
- **New Arrivals** (`/new`) — Latest additions from newtoxic feed
- **Search** (`/search?q=...`) — Search results with type filter + load more
- **Detail** (`/detail/:id`) — Full watch page with player, server switcher, cast, episodes, recommendations
- **Live TV** (`/live`) — Wrestling, Sports, News, Comedy, Entertainment with tabbed HLS player
- **Staff** (`/staff/:id`) — Actor/director page with bio and filmography

## Live TV Channels (curated)

- **Wrestling**: TNA Wrestling, Impact Network, Fight Network, FightBox HD, DAZN Combat, Hard Knocks
- **Sports**: beIN SPORTS XTRA, ESPN8 The Ocho, CBS Sports HQ, CBS Golazo, DD Sports India
- **News**: ABC News Live (x2), CBC News, Bloomberg TV
- **Comedy**: Comedy Central, Stand-Up 24/7, Comedy Movies, RomCom, Comedy.TV
- **Entertainment**: Classic Movies, Action Movies, Horror 24/7, Sci-Fi, Crime Drama, Kids TV

## Key Features

- Hero banner: auto-slides every 7s, 6 items, dot navigator, prev/next arrows, prefetches player on hover
- Search: real-time autocomplete with poster thumbnails, keyboard shortcut `/`
- Player overlay: iframe (embed) + native video (HLS.js) support, fullscreen, quality switching
- Watch page: inline player with server switcher bar, episode grid, cast carousel, recommendations
- Skeleton loaders everywhere — no blank flashes
- `streamCache` prefetches stream info on card hover for instant player open
- SEO: dynamic title/description/og:* per page, JSON-LD, sitemap.xml, robots.txt
