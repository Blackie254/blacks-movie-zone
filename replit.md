# Black's Movie Zone

A movie and TV show browsing web application.

## Architecture

- **Runtime**: Node.js 20
- **Server**: Express.js serving static files on port 5000
- **Frontend**: Vanilla HTML, CSS, and JavaScript (no framework)

## Project Structure

```
.
├── server.js          # Express server — serves static files on port 5000
├── package.json       # Node.js dependencies
├── public/
│   ├── index.html     # Main HTML page
│   ├── style.css      # Styles (dark movie theme)
│   └── app.js         # Frontend logic (movie cards, search)
└── replit.md          # This file
```

## Running the App

The "Start application" workflow runs `node server.js`, which serves everything on port 5000.

## Features

- Hero banner with call-to-action buttons
- Trending Now, Popular Movies, and Top TV Shows sections
- Movie cards with poster emoji, rating, genre, year, and badge
- Search functionality (filters by title and genre)
- Dark cinematic theme with red accent color
- Responsive layout
