const CACHE_NAME = 'dk-energy-prices-v6-dev-b2';
const BASE_PATH = '/denmark-energy-prices/dev';
const STATIC_ASSETS = [
    `${BASE_PATH}/`,
    `${BASE_PATH}/index.html`,
    `${BASE_PATH}/styles.css`,
    `${BASE_PATH}/app.js`,
    `${BASE_PATH}/i18n.js`,
    `${BASE_PATH}/manifest.json`,
    `${BASE_PATH}/widget.html`,
    `${BASE_PATH}/widget.js`,
    `${BASE_PATH}/electricity.html`,
    `${BASE_PATH}/electricity-dk1.html`,
    `${BASE_PATH}/electricity-dk2.html`,
    `${BASE_PATH}/diesel.html`,
    `${BASE_PATH}/benzin.html`,
    `${BASE_PATH}/gas.html`,
    `${BASE_PATH}/water.html`,
    `${BASE_PATH}/fjernvarme.html`,
    `${BASE_PATH}/config/prices.json`,
    `${BASE_PATH}/icons/icon-192.png`,
    `${BASE_PATH}/icons/icon-512.png`,
    'https://cdn.jsdelivr.net/npm/chart.js'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('Caching static assets');
            return cache.addAll(STATIC_ASSETS);
        })
    );
    self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => name !== CACHE_NAME)
                    .map((name) => caches.delete(name))
            );
        })
    );
    self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);
    
    // For API requests, use network-first strategy
    if (url.hostname === 'api.energidataservice.dk') {
        event.respondWith(networkFirst(request));
        return;
    }
    
    // For static assets, use cache-first strategy
    event.respondWith(cacheFirst(request));
});

async function cacheFirst(request) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
        return cachedResponse;
    }
    
    try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    } catch (error) {
        // Return offline fallback if available
        return new Response('Offline', { status: 503 });
    }
}

async function networkFirst(request) {
    try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            // Cache the API response for offline use
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    } catch (error) {
        // Try to serve from cache
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        return new Response(JSON.stringify({ error: 'Offline' }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// Background sync for price updates
self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-prices') {
        event.waitUntil(syncPrices());
    }
});

async function syncPrices() {
    try {
        const response = await fetch('https://api.energidataservice.dk/dataset/DayAheadPrices?start=now-P1D&limit=100');
        if (response.ok) {
            const data = await response.json();
            // Notify clients of new data
            const clients = await self.clients.matchAll();
            clients.forEach(client => {
                client.postMessage({
                    type: 'PRICES_UPDATED',
                    data: data
                });
            });
        }
    } catch (error) {
        console.error('Background sync failed:', error);
    }
}

// Push notifications for price alerts (if implemented)
self.addEventListener('push', (event) => {
    if (event.data) {
        const data = event.data.json();
        const options = {
            body: data.body,
            icon: '/icons/icon-192.png',
            badge: '/icons/icon-192.png',
            vibrate: [100, 50, 100],
            data: {
                url: data.url || '/'
            }
        };
        
        event.waitUntil(
            self.registration.showNotification(data.title, options)
        );
    }
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const url = event.notification.data?.url || '/';
    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
            // Focus existing window if available
            for (const client of clientList) {
                if (client.url.includes('denmark-energy-prices') && 'focus' in client) {
                    return client.focus();
                }
            }
            // Otherwise open a new window
            return self.clients.openWindow(url);
        })
    );
});
