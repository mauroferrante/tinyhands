/* =========================================================
 *  Tiny Hands Play — Service Worker
 *  Cache-first for app shell, network-first for CDN assets
 * ========================================================= */

const CACHE = 'thp-v4';

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

// Fetch: cache-first for shell, network-first for everything else
self.addEventListener('fetch', (e) => {
  // Skip non-GET requests
  if (e.request.method !== 'GET') return;

  // For CDN assets (emoji images, fonts), use stale-while-revalidate
  if (e.request.url.includes('cdn.jsdelivr.net') || e.request.url.includes('fonts.g')) {
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
    return;
  }

  // For app shell: cache-first
  e.respondWith(
    caches.match(e.request).then((r) => r || fetch(e.request))
  );
});
