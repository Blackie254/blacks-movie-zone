# Black's Movie Zone

A vanilla JavaScript movie and series discovery site. MovieAPI is used for title metadata, search, catalog browsing, recommendations, and episode guides. Playback is available only for HTTPS sources configured by the site owner for content they own or are licensed to distribute.

## Run locally

- Node.js 20+
- `npm install`
- `npm start` (port 5000 by default)

## Authorized media configuration

Edit `public/media-sources.js` and add only HTTPS media URLs for content you have permission to distribute. Add the source's hostname to `AUTHORIZED_MEDIA_HOSTS`. Use a title ID for a movie or `TITLE_ID:SEASON:EPISODE` for a specific episode. HLS sources can use `type: 'hls'`. Entries not on the host allowlist are rejected in the browser.

Open `/player-test` to test the player with the isolated MDN flower video sample, dedicated to CC0 1.0 in the MDN interactive-examples repository. The demo uses its own sentinel key and does not associate the sample with any movie or series catalog ID.

The player uses the browser's native controls and Picture-in-Picture API where supported. Selecting a title without a configured authorized source shows a setup notice instead of looking for a third-party stream.

## Catalog API

The backend proxies catalog metadata endpoints such as trending, search, browse, rich detail, recommendation, and episode listing. Third-party stream extraction, direct-download resolution, embed-provider fallbacks, and stream proxy routes are intentionally not included. Legacy playback resolver URLs return HTTP 410.

## Pages

- Home, movie catalog, Series (`/series`, with `/shows` kept as an alias), trending, browse, search, title detail, cast/staff, sports, and live guide.
- Series detail pages show seasons and episode metadata from the catalog API.

## Security notes

Do not put API secrets or private media credentials in browser JavaScript. Use a licensed provider's authenticated playback SDK for protected streams.
