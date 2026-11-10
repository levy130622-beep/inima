// Service Worker for "Pentru inima mea ❤️"
const CACHE_NAME = 'inima-mea-v1.0.0';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/dashboard.html',
  '/guide.html',
  '/css/style.css',
  '/js/app.js',
  '/js/dashboard.js',
  '/js/push-client.js',
  '/manifest.json',
  '/favicon.png',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/apple-touch-icon.png',
  '/icons/badge-72.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch(err => {
        console.warn('Cache addAll warning:', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch handler - network first for APIs, cache fallback for assets
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Bypass cache for API and SSE calls
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          if (event.request.mode === 'navigate') {
            return caches.match('/index.html');
          }
        });
      })
  );
});

// PUSH Notification Event Listener
self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: 'Pentru inima mea ❤️', body: event.data.text() };
    }
  } else {
    data = {
      title: '❤️ AM NEVOIE DE TINE!',
      body: 'Iubita ta te cheamă chiar acum.'
    };
  }

  const title = data.title || '❤️ Pentru inima mea';
  const options = {
    body: data.body || 'Iubita ta are nevoie de tine!',
    icon: data.icon || '/icons/icon-192.png',
    badge: data.badge || '/icons/badge-72.png',
    image: data.image || undefined,
    tag: data.tag || 'heart-alert',
    renotify: data.renotify !== false,
    requireInteraction: data.requireInteraction !== false,
    silent: false,
    timestamp: data.timestamp || Date.now(),
    vibrate: data.vibrate || [300, 100, 300, 100, 400],
    data: data.data || { url: '/dashboard.html' },
    actions: data.actions || [
      { action: 'ack', title: '❤️ Am văzut, sunt aici!' },
      { action: 'open', title: 'Deschide Panoul' }
    ]
  };

  // Update App Badge if supported
  if ('setAppBadge' in navigator) {
    navigator.setAppBadge().catch(() => {});
  }

  event.waitUntil(self.registration.showNotification(title, options));
});

// Notification Click Listener
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const alertData = event.notification.data || {};
  const targetUrl = alertData.url || '/dashboard.html';

  // Handle Quick Action: Boyfriend clicked "❤️ Am văzut, sunt aici!" from notification
  if (event.action === 'ack' && alertData.alertId) {
    event.waitUntil(
      fetch(`/api/alerts/${alertData.alertId}/ack`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ replyMessage: '❤️ Am văzut, sunt aici!' })
      }).then(() => {
        if ('clearAppBadge' in navigator) navigator.clearAppBadge().catch(() => {});
        return self.registration.showNotification('❤️ Confirmat!', {
          body: 'Iubita ta a primit confirmarea că ești alături de ea.',
          icon: '/icons/icon-192.png',
          tag: 'ack-confirmed',
          renotify: false
        });
      }).catch(err => {
        console.error('Failed to acknowledge from push action:', err);
      })
    );
    return;
  }

  // Clear badge on open
  if ('clearAppBadge' in navigator) {
    navigator.clearAppBadge().catch(() => {});
  }

  // Open or focus application window
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes('dashboard') && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
