//update notif test v7
const CACHE_NAME = 'ordering-app-v1';
const ASSETS_TO_CACHE = [
  'order.html',
  'pastOrders.html',
  'order.js',
  'pastOrders.js',
  'menuData.json',
  'main.css',
  'manifest.json',
  // optional vendor files (place them under assets/ before going offline)
  'assets/tailwind.min.css',
  'assets/fonts.css',
  // local font files (ensure these match files in assets/fonts/)
  'assets/fonts/Vazirmatn-Thin.ttf',
  'assets/fonts/Vazirmatn-ExtraLight.ttf',
  'assets/fonts/Vazirmatn-Light.ttf',
  'assets/fonts/Vazirmatn-Regular.ttf',
  'assets/fonts/Vazirmatn-Medium.ttf',
  'assets/fonts/Vazirmatn-SemiBold.ttf',
  'assets/fonts/Vazirmatn-Bold.ttf',
  'assets/fonts/Vazirmatn-ExtraBold.ttf',
  'assets/fonts/Vazirmatn-Black.ttf',
  'assets/icons/icon-192.png',
  'assets/icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
  );
  // Do NOT call skipWaiting() here — we want the new worker to stay "waiting"
  // so the page can show the update banner. User clicks "بروزرسانی" → postMessage('SKIP_WAITING') → then we skipWaiting() in the 'message' handler.
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_NAME)
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  // navigation requests: try network first, then cached requested URL, then order.html
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(() =>
        caches.match(req).then((cached) => cached || caches.match('order.html'))
      )
    );
    return;
  }

  // other requests: cache-first
  event.respondWith(
    caches.match(req).then((cached) => cached || fetch(req).then((res) => {
      // populate cache for future
      const copy = res.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
      return res;
    }).catch(() => {
      // final fallback: try a cached file
      return caches.match('order.html');
    }))
  );
});

self.addEventListener('message', (event) => {
  if (!event.data) return;
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
