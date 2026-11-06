// Service worker: cache aplikasi untuk luar talian + papar notifikasi push FCM.
const VERSION = 'tk-v3';
const SHELL = ['./','./index.html','./manifest.webmanifest','./css/app.css','./js/app.js','./js/logic.js','./js/store.js','./js/config.js',
  './vendor/firebase.js','./vendor/leaflet.js','./vendor/leaflet.css','./vendor/fonts/figtree.woff2','./vendor/fonts/bricolage.woff2','./icons/icon-192.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  // Paparkan salinan cache serta-merta, kemas kini di latar belakang.
  e.respondWith(caches.open(VERSION).then(async c => {
    const hit = await c.match(e.request, { ignoreSearch: e.request.mode === 'navigate' });
    const net = fetch(e.request).then(r => { if (r.ok) c.put(e.request, r.clone()); return r; });
    if (hit) { e.waitUntil(net.catch(() => {})); return hit; }
    return net;
  }));
});
self.addEventListener('push', e => {
  let p = {};
  try { p = e.data.json(); } catch { p = { data: { title: 'Tulip Kayu', body: e.data ? e.data.text() : '' } }; }
  const d = p.data || p.notification || {};
  e.waitUntil(self.registration.showNotification(d.title || 'Tulip Kayu', {
    body: d.body || '', tag: d.tag || undefined, icon: 'icons/icon-192.png', badge: 'icons/icon-192.png', data: { url: d.url || './index.html' }
  }));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cs => {
    if (cs.length) return cs[0].focus();
    return self.clients.openWindow(e.notification.data?.url || './index.html');
  }));
});
