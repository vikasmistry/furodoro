const CACHE_NAME = 'furodoro-cache-v3.1'; // Incremented cache version

// List of essential files for the app shell to work offline
const APP_SHELL_FILES = [
    '/', // Alias for index.html for root access
    '/index.html',
    '/src/style.css',
    '/src/script.js',
    '/src/apiService.js',
    '/manifest.json',
    '/images/icon-192x192.png',
    '/images/icon-512x512.png',
];

// No external resources needed anymore
const EXTERNAL_RESOURCES = [];

// Only cache the app shell files
const ALL_RESOURCES_TO_CACHE = [...APP_SHELL_FILES, ...EXTERNAL_RESOURCES];

// Install event: Cache all essential assets
self.addEventListener('install', (event) => {
    console.log('[Service Worker] Installing...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[Service Worker] Caching app shell');
                // Use addAll for atomic caching (if one fails, none are cached)
                const cachePromises = APP_SHELL_FILES.map(url => { // Only cache APP_SHELL_FILES
                    return fetch(url, { mode: 'cors' }) // Use CORS mode for external resources
                        .then(response => {
                            if (!response.ok) {
                                throw new Error(`Request failed for ${url}: ${response.statusText}`);
                            }
                            return cache.put(url, response);
                        })
                        .catch(err => {
                            console.warn(`[Service Worker] Failed to cache ${url}: ${err}`);
                            // Don't block installation if an optional external resource fails
                        });
                });
                return Promise.all(cachePromises);
            })
            .then(() => {
                console.log('[Service Worker] Installation complete, resources cached.');
                self.skipWaiting(); // Activate the new service worker immediately
            })
            .catch(error => {
                console.error('[Service Worker] Installation failed:', error);
            })
    );
});

// Activate event: Clean up old caches
self.addEventListener('activate', (event) => {
    console.log('[Service Worker] Activating...');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('[Service Worker] Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim()) // Take control of uncontrolled clients
    );
});

// Fetch event: Serve from cache first, fall back to network, cache new resources
self.addEventListener('fetch', (event) => {
    // Use a Cache-First strategy
    event.respondWith(
        caches.match(event.request)
            .then((cachedResponse) => {
                // Return cached response if found, otherwise fetch from network
                return cachedResponse || fetch(event.request).then((networkResponse) => {
                    // Optional: Cache dynamically fetched resources (like font files)
                    if (networkResponse && networkResponse.status === 200 && event.request.method === 'GET') {
                        // Example: Cache other assets if necessary (e.g., images loaded dynamically)
                        // if (event.request.url.includes('some-other-asset')) {
                        const responseToCache = networkResponse.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(event.request, responseToCache);
                        });
                    }
                    return networkResponse;
                }).catch(error => {
                    console.warn(`[Service Worker] Network fetch failed for ${event.request.url}:`, error);
                    // Optional: Return a custom offline fallback page here if needed
                    // return caches.match('/offline.html');
                });
            })
    );
});
