// Only the app shell is cached. Never cache Google Maps, API calls or keys.
const PREFIX = 'liberated-maps-shell:' + new URL(self.registration.scope).pathname + ':';
const CACHE = PREFIX + '__BUILD_ID__';
const ASSETS = ['./', './index.html', './app.js', './style.css', './pwa.js', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png', './icons/apple-touch-icon.png'];
const allowed = new Set(ASSETS.map(asset => new URL(asset, self.registration.scope).pathname));
self.addEventListener('install', event => {
 event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
 event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith(PREFIX) && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
 const url = new URL(event.request.url);
 if(event.request.method !== 'GET' || url.origin !== self.location.origin || !allowed.has(url.pathname))return;
 event.respondWith((async()=>{
  const cache = await caches.open(CACHE);
  try{
   // Network first prevents old controls from returning after a deployment.
   const response = await fetch(event.request);
   if(response.ok){await cache.put(event.request,response.clone());return response;}
   if(event.request.mode !== 'navigate')return response;
  }catch{}
  const cached = event.request.mode === 'navigate'
   ? await cache.match(new URL('./index.html',self.registration.scope).href)
   : await cache.match(event.request);
  return cached || new Response('離線且尚未快取此檔案，請連網後重新開啟。',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}});
 })());
});
