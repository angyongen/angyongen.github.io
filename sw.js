var FETCH_CACHE = 'ag-cache-default';
var cacheWhitelist = ['ag-cache-default'];//['pages-cache-v1', 'blog-posts-cache-v1'];
var urlsToCache = ['/'];//,'/piano_icon.png','/more.png','/install.png','/js_synth'];
var lastVersionCheck;
function clearOldCaches() {
  return caches.keys().then(function(cacheNames) {
    return Promise.all(
      cacheNames.map(function(cacheName) {
        if (cacheWhitelist.indexOf(cacheName) === -1) {
          return caches.delete(cacheName);
        }
      })
    );
  })
}

function forceCheckVersion() {
    console.log('Checking version...');
    var xhr = new XMLHttpRequest();
    xhr.open("GET", "/cachewhitelist.txt", true);
    xhr.onload = function (e) {
      if (xhr.readyState === 4) {
        if (xhr.status === 200) {

          console.log(xhr.responseText);
        } else {
          console.error(xhr.statusText);
        }
      }
    };
    xhr.onerror = function (e) {
      console.error(xhr.statusText);
    };
    xhr.send(null); 
}

function checkVersion() {
    console.log('test');
  if (lastVersionCheck) {
    var tmp_lastVersionCheck = lastVersionCheck;
    lastVersionCheck = new Date;
    var diff = lastVersionCheck - tmp_lastVersionCheck;
    if (diff > 60000) {forceCheckVersion();}
  } else {
    lastVersionCheck = new Date;
    forceCheckVersion();
  }
}

self.addEventListener('install', function(event) {
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
  checkVersion();
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
