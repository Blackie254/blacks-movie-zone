/*
 * Add only HTTPS playback URLs for content you own or are licensed to distribute.
 * Add each media host to AUTHORIZED_MEDIA_HOSTS. HLS entries require type: "hls".
 * Movie key: "SUBJECT_ID". Episode key: "SUBJECT_ID:SEASON:EPISODE".
 * Example (replace all placeholders; do not publish an unlicensed stream URL):
 * window.AUTHORIZED_MEDIA_HOSTS = ['media.example.com'];
 * window.AUTHORIZED_MEDIA = {
 *   '12345': { url: 'https://media.example.com/movie.mp4', title: 'Licensed movie' },
 *   '67890:1:1': { url: 'https://media.example.com/s1e1.m3u8', type: 'hls', title: 'Episode 1' }
 * };
 */
window.AUTHORIZED_MEDIA_HOSTS = [];
window.AUTHORIZED_MEDIA = {};
