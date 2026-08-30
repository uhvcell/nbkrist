/**
 * UHV CELL Modern Service Worker
 * Stale-while-revalidate for fast load & offline support
 */
const CACHE_NAME = 'uhv-cache-v3';
const STATIC_ASSETS = [
    './',
    './index.html',
    './about.html',
    './activities.html',
    './resources.html',
    './team-structure.html',
    './newsletter.html',
    './contact.html',
    './style.css',
    './app-utils.js',
    './page-content.js',
    './site-settings.js',
    './team-data.js',
    './logo.jpg',
    './favicon.png',
    './manifest.json'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(STATIC_ASSETS).catch((err) => {
                console.warn('Some assets could not be pre-cached:', err);
            });
        }).then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
            );
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    // Only handle GET requests and skip CMS API/upload paths
    if (event.request.method !== 'GET' || event.request.url.includes('/api/')) {
        return;
    }

    const isDataFile = event.request.url.includes('-data.js') || 
                       event.request.url.includes('site-settings.js') || 
                       event.request.url.includes('page-content.js');

    if (isDataFile) {
        event.respondWith(
            fetch(event.request)
                .then((networkResponse) => {
                    if (networkResponse && networkResponse.status === 200) {
                        const responseClone = networkResponse.clone();
                        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
                    }
                    return networkResponse;
                })
                .catch(() => caches.match(event.request))
        );
        return;
    }

    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            const fetchPromise = fetch(event.request).then((networkResponse) => {
                if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
                    const responseClone = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
                }
                return networkResponse;
            }).catch(() => cachedResponse);

            return cachedResponse || fetchPromise;
        })
    );
});
