/* =========================================================
 *  Tiny Hands Play — Service Worker
 *  Stale-while-revalidate for app shell (fast + always fresh)
 *  Stale-while-revalidate for CDN assets
 * ========================================================= */

const CACHE = 'thp-v60';

const SHELL = [
  '/',
  '/index.html',
  '/manifest.json',
  // CSS
  '/css/base.css',
  '/css/landing.css',
  '/css/playground.css',
  '/css/games/splat-keys.css',
  '/css/games/stack-smash.css',
  '/css/games/spell-it-out.css',
  '/css/games/memory-match.css',
  '/css/games/balloon-float.css',
  '/css/games/rocket-ride.css',
  '/css/games/ball-bonanza.css',
  '/css/games/tiny-town.css',
  '/css/games/melody-maker.css',
  // JS
  '/js/game-manager.js',
  '/js/audio.js',
  '/js/effects.js',
  '/js/emoji.js',
  '/js/emoji-registry.js',
  '/js/share.js',
  '/js/games/splat-keys.js',
  '/js/games/stack-smash.js',
  '/js/games/stack-audience.js',
  '/js/games/spell-it-out.js',
  '/js/games/memory-match.js',
  '/js/games/balloon-float.js',
  '/js/games/rocket-ride.js',
  '/js/games/ball-bonanza.js',
  '/js/games/tiny-town.js',
  '/js/games/melody-maker.js',
  '/js/games/song-parade.js',
  '/js/parallax.js',
];

// Install: pre-cache the app shell
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL))
  );
  self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Stale-while-revalidate helper: serve cached instantly, update cache in background
function staleWhileRevalidate(e) {
  e.respondWith(
    caches.open(CACHE).then((cache) =>
      cache.match(e.request).then((cached) => {
        const fetched = fetch(e.request).then((response) => {
          if (response.ok) cache.put(e.request, response.clone());
          return response;
        }).catch(() => cached);
        return cached || fetched;
      })
    )
  );
}

// Fetch handler
self.addEventListener('fetch', (e) => {
  // Skip non-GET requests
  if (e.request.method !== 'GET') return;

  // SPA fallback: serve cached index.html for virtual routes (/play/*, /story, /intent/*)
  const url = new URL(e.request.url);
  if (e.request.mode === 'navigate' &&
      (url.pathname.startsWith('/play/') || url.pathname === '/story' || url.pathname.startsWith('/intent/'))) {
    e.respondWith(caches.match('/index.html').then((r) => r || fetch('/index.html')));
    return;
  }

  // Everything (app shell + CDN): stale-while-revalidate
  // Serves cached version instantly for speed, fetches fresh copy in background
  // so the next page load always has the latest files.
  staleWhileRevalidate(e);
});
