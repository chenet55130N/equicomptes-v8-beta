// ÉquiComptes V8 BÊTA — cache PWA dédié à la V8 uniquement.
const CACHE='equi-v8-beta-cache-20261106-voyant-2';
const APP_FILES=['./','./index.html','./manifest.webmanifest','./service-worker.js','./sync-v8.js','./firebase-config.json','./icon-192.png','./icon-512.png'];
const FIREBASE_SDK='https://www.gstatic.com/firebasejs/13.2.0/';
self.addEventListener('install',evt=>{
 evt.waitUntil(caches.open(CACHE).then(c=>c.addAll(APP_FILES)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',evt=>{
 evt.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('equi-v8-beta-cache-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
async function cachedOrFetch(req){const c=await caches.open(CACHE);const hit=await c.match(req);if(hit)return hit;const res=await fetch(req);if(res.ok)try{await c.put(req,res.clone())}catch{}return res;}
async function navigation(req){try{const res=await fetch(req);if(res.ok){const c=await caches.open(CACHE);c.put('./index.html',res.clone()).catch(()=>{});}return res;}catch{return (await caches.match('./index.html'))||Response.error();}}
self.addEventListener('fetch',evt=>{
 const req=evt.request;if(req.method!=='GET')return;
 const url=new URL(req.url);
 if(url.href.startsWith(FIREBASE_SDK)&&url.pathname.endsWith('.js')){evt.respondWith(cachedOrFetch(req));return;}
 if(url.origin!==self.location.origin)return;
 if(req.mode==='navigate'){evt.respondWith(navigation(req));return;}
 if(url.pathname.endsWith('/firebase-config.json')){
  evt.respondWith((async()=>{const c=await caches.open(CACHE);try{const r=await fetch(req);if(r.ok)await c.put(req,r.clone());return r;}catch{return (await c.match(req))||Response.error();}})());return;
 }
 evt.respondWith(cachedOrFetch(req));
});
