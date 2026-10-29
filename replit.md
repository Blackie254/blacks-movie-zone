# Project notes

This is a Node.js/Express metadata catalog with a vanilla JavaScript SPA. The app exposes title and episode metadata through its backend proxy and supports video playback only for owner-configured licensed HTTPS sources in `public/media-sources.js`.

The `Series` route is `/series` (`/shows` remains an alias). Picture-in-Picture uses browser-native APIs. The backend deliberately does not resolve third-party embed or scraped stream links.
