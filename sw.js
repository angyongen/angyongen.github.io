var version = 1;
var FETCH_CACHE;
var cacheWhitelist;
function updateCacheNames() {
  FETCH_CACHE = 'ag-cache-v' + version;
  cacheWhitelist = [version, 'ag-cache-v' + version];//['pages-cache-v1', 'blog-posts-cache-v1'];
}
updateCacheNames();
var urlsToCache = [];//essential urls
var extraUrlsToCache = [
"/Bingo-Generator/",
"/Bingo-Generator/bingo1.css",
"/Bingo-Generator/elements.js",
"/Bingo-Generator/generator.js",
"/Bingo-Generator/test.js",
"/Bingo-Generator/ui.js",
"/js_scoremaker/analytics.js",
"/js_scoremaker/index.html",
"/js_scoremaker/mode2.css",
"/js_scoremaker/mode2.js",
"/js_scoremaker/script.js",
"/js_synth/html5_audio.js",
"/js_synth/index.html",
"/js_synth/script.js",
"/js_synth/settings.js",
"/js_synth/sounds.js",
"/js_synth/wav.js",
"/js_synth/web_audio_api.js"];
var lastVersionCheck;

function forceCheckVersion() {
    lastVersionCheck = new Date;
    return fetch('/cachewhitelist.txt?time=' + lastVersionCheck.getTime()) //prevent disk cache
}

function clearOldCaches() {
  caches.keys().then(function(cacheNames) {
    return Promise.all(
      cacheNames.map(function(cacheName) {
        if (cacheWhitelist.indexOf(cacheName) === -1) {
          return caches.delete(cacheName);
        }
      })
    );
  })
}


async function getCurrentVersion() {
  if (lastVersionCheck && (new Date - lastVersionCheck) < 10000) return version;
  var response = await forceCheckVersion()
  if (response.ok) {
    var json = await response.json()
    return parseInt(json.version)
  }
}

self.addEventListener('install', function(event) {
  self.skipWaiting();
  // Perform install steps
  event.waitUntil(
    caches.open(FETCH_CACHE)
      .then(function(cache) {
        console.log('Opened cache for essential storage');
        return cache.addAll(urlsToCache);
      })
  );
  caches.open(FETCH_CACHE).then(function(cache) {
        console.log('Opened cache for extra storage');
        cache.addAll(extraUrlsToCache);
      })
});
self.addEventListener('fetch', function(event) {
  event.respondWith(getCurrentVersion().then(function(currentversion) {
    if (version != currentversion) {
      console.log('New version found, updating...');
      version = currentversion;
      updateCacheNames();
      clearOldCaches();
    }
    return caches.match(event.request)
      .then(function(response) {
        // Cache hit - return response
        if (response) {
          return response;
        }

        return fetch(event.request).then(
          function(response) {
            // Check if we received a valid response
            if(!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // IMPORTANT: Clone the response. A response is a stream
            // and because we want the browser to consume the response
            // as well as the cache consuming the response, we need
            // to clone it so we have two streams.
            var responseToCache = response.clone();

            caches.open(FETCH_CACHE)
              .then(function(cache) {
                cache.put(event.request, responseToCache);
              });

            return response;
          }
        );
      })
    
  }))
});

self.addEventListener('activate', function(event) {
  event.waitUntil(console.log('SW activated'));
});
self.addEventListener('activate', function(event) {
  event.waitUntil(clearOldCaches());
});
self.addEventListener('activate', event => {
  event.waitUntil(clients.claim());
});
