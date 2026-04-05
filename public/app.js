const movies = [
  { id: 1, title: "The Dark Knight", year: 2008, rating: 9.0, genre: "Action", emoji: "🦇", badge: "HD" },
  { id: 2, title: "Inception", year: 2010, rating: 8.8, genre: "Sci-Fi", emoji: "🌀", badge: "4K" },
  { id: 3, title: "Interstellar", year: 2014, rating: 8.6, genre: "Sci-Fi", emoji: "🚀", badge: "4K" },
  { id: 4, title: "Parasite", year: 2019, rating: 8.5, genre: "Thriller", emoji: "🏠", badge: "HD" },
  { id: 5, title: "The Godfather", year: 1972, rating: 9.2, genre: "Crime", emoji: "🌹", badge: "Classic" },
  { id: 6, title: "Pulp Fiction", year: 1994, rating: 8.9, genre: "Crime", emoji: "💼", badge: "Classic" },
  { id: 7, title: "The Matrix", year: 1999, rating: 8.7, genre: "Sci-Fi", emoji: "💊", badge: "HD" },
  { id: 8, title: "Avengers: Endgame", year: 2019, rating: 8.4, genre: "Action", emoji: "⚡", badge: "4K" },
];

const tvShows = [
  { id: 101, title: "Breaking Bad", year: 2008, rating: 9.5, genre: "Drama", emoji: "🧪", badge: "Series" },
  { id: 102, title: "Game of Thrones", year: 2011, rating: 9.3, genre: "Fantasy", emoji: "🐉", badge: "Series" },
  { id: 103, title: "The Wire", year: 2002, rating: 9.3, genre: "Crime", emoji: "📡", badge: "Series" },
  { id: 104, title: "Stranger Things", year: 2016, rating: 8.7, genre: "Horror", emoji: "👾", badge: "Series" },
  { id: 105, title: "Chernobyl", year: 2019, rating: 9.4, genre: "Drama", emoji: "☢️", badge: "Mini" },
  { id: 106, title: "The Office", year: 2005, rating: 9.0, genre: "Comedy", emoji: "📋", badge: "Series" },
  { id: 107, title: "Black Mirror", year: 2011, rating: 8.8, genre: "Sci-Fi", emoji: "🖥️", badge: "Series" },
  { id: 108, title: "Peaky Blinders", year: 2013, rating: 8.8, genre: "Crime", emoji: "🎩", badge: "Series" },
];

const trending = [
  { id: 201, title: "Dune: Part Two", year: 2024, rating: 8.5, genre: "Sci-Fi", emoji: "🏜️", badge: "New" },
  { id: 202, title: "Oppenheimer", year: 2023, rating: 8.9, genre: "Drama", emoji: "💥", badge: "New" },
  { id: 203, title: "Poor Things", year: 2023, rating: 8.0, genre: "Fantasy", emoji: "🧬", badge: "New" },
  { id: 204, title: "The Holdovers", year: 2023, rating: 7.9, genre: "Drama", emoji: "❄️", badge: "New" },
  { id: 205, title: "Maestro", year: 2023, rating: 7.4, genre: "Biography", emoji: "🎵", badge: "New" },
  { id: 206, title: "American Fiction", year: 2023, rating: 7.8, genre: "Comedy", emoji: "📚", badge: "New" },
  { id: 207, title: "Barbie", year: 2023, rating: 7.0, genre: "Comedy", emoji: "🩷", badge: "New" },
  { id: 208, title: "Spider-Man: ATSV", year: 2023, rating: 8.6, genre: "Animation", emoji: "🕷️", badge: "New" },
];

const bgColors = [
  '#1a0a2e', '#0a1a2e', '#1a2e0a', '#2e0a1a',
  '#0a2e1a', '#2e1a0a', '#0a0a2e', '#2e0a0a',
];

function createMovieCard(item) {
  const bgColor = bgColors[item.id % bgColors.length];
  return `
    <div class="movie-card" onclick="showAlert('${item.title}')">
      <div class="movie-poster" style="background: linear-gradient(135deg, ${bgColor}, #0a0a0f);">
        <span>${item.emoji}</span>
        <div class="movie-overlay">
          <div class="play-btn">▶</div>
        </div>
        <span class="movie-badge">${item.badge}</span>
      </div>
      <div class="movie-info">
        <div class="movie-title">${item.title}</div>
        <div class="movie-meta">
          <span>${item.genre} · ${item.year}</span>
          <span class="movie-rating">★ ${item.rating}</span>
        </div>
      </div>
    </div>
  `;
}

function showAlert(title) {
  alert(`"${title}" - Coming Soon!\n\nFull streaming support will be available soon.`);
}

function renderGrid(containerId, items) {
  const container = document.getElementById(containerId);
  if (container) {
    container.innerHTML = items.map(createMovieCard).join('');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  renderGrid('trending-grid', trending);
  renderGrid('popular-grid', movies);
  renderGrid('shows-grid', tvShows);

  const searchInput = document.querySelector('.search-bar input');
  const searchBtn = document.querySelector('.search-bar button');

  function doSearch() {
    const query = searchInput.value.trim().toLowerCase();
    if (!query) return;
    const all = [...trending, ...movies, ...tvShows];
    const results = all.filter(item =>
      item.title.toLowerCase().includes(query) ||
      item.genre.toLowerCase().includes(query)
    );
    renderGrid('trending-grid', results.length ? results : all);
    document.querySelector('.section-title').textContent =
      results.length ? `Search results for "${searchInput.value}"` : 'No results found - showing all';
  }

  searchBtn.addEventListener('click', doSearch);
  searchInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') doSearch();
  });
});
