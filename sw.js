/* ETO Club service worker: offline cache + review reminders */
const VER = 'eto-v1';
const SHELL = ['./', 'index.html', 'style.css', 'scripts.js', 'app-extra.js', 'manifest.json', 'icons/icon-192.png', 'icons/icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VER).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => !['eto-meta', 'eto-runtime', VER].includes(k)).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === location.origin) {
    // Network first so updates show up, cache as offline fallback
    e.respondWith(
      fetch(req).then(res => {
        if (res.ok) { const copy = res.clone(); caches.open(VER).then(c => c.put(req, copy)); }
        return res;
      }).catch(() => caches.match(req, { ignoreSearch: true }).then(r => r || caches.match('index.html')))
    );
  } else if (/fonts\.(googleapis|gstatic)\.com$/.test(url.host)) {
    // Fonts: stale-while-revalidate
    e.respondWith(caches.open('eto-runtime').then(async c => {
      const hit = await c.match(req);
      const net = fetch(req).then(res => { if (res.ok) c.put(req, res.clone()); return res; }).catch(() => hit);
      return hit || net;
    }));
  }
  // dictionary / translate APIs and meme GIFs are not intercepted
});

/* ---- Reminders ---- */
async function readState() {
  const c = await caches.open('eto-meta');
  const r = await c.match('reminder-state');
  return r ? r.json() : null;
}
async function maybeNotify() {
  const s = await readState();
  if (!s || !s.enabled) return;
  const now = new Date(), today = now.toDateString();
  const [h, m] = (s.time || '20:00').split(':').map(Number);
  const due = new Date(); due.setHours(h, m, 0, 0);
  if (now < due || s.lastNotified === today || s.lastStudied === today) return;
  await self.registration.showNotification('ETO Club 📚', {
    body: 'Đến giờ ôn từ vựng rồi! Chỉ 5 phút thôi 💪',
    icon: 'icons/icon-192.png', badge: 'icons/icon-192.png',
    tag: 'eto-review', data: { url: './' }
  });
  s.lastNotified = today;
  const c = await caches.open('eto-meta');
  await c.put('reminder-state', new Response(JSON.stringify(s)));
}
self.addEventListener('periodicsync', e => { if (e.tag === 'review-reminder') e.waitUntil(maybeNotify()); });
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    for (const c of list) if ('focus' in c) return c.focus();
    return clients.openWindow('./');
  }));
});
