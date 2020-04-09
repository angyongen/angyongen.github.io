var version = 1;
var FETCH_CACHE;
var cacheWhitelist;
function updateCacheNames() {
  FETCH_CACHE = 'ag-cache-v' + version;
  cacheWhitelist = [version, 'ag-cache-v' + version];//['pages-cache-v1', 'blog-posts-cache-v1'];
}
updateCacheNames();
var urlsToCache = ['/'];//,'/piano_icon.png','/more.png','/install.png','/js_synth'];
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
  if (lastVersionCheck && (new Date - lastVersionCheck) < 60000) return version;
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
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});
self.addEventListener('fetch', function(event) {
  getCurrentVersion.then((currentversion) => {
    if (version != currentversion) {
      console.log('New version found, updating...');
      version = currentversion;
      updateCacheNames();
      clearOldCaches();
    }
    event.respondWith(
    caches.match(event.request)
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
    );
  })
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
