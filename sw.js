var version = 1;
var FETCH_CACHE;
var cacheWhitelist;
function updateCacheNames() {
  FETCH_CACHE = 'ag-cache-v' + version;
  cacheWhitelist = [version, 'ag-cache-v' + version];//['pages-cache-v1', 'blog-posts-cache-v1'];
}
updateCacheNames();
var urlsToCache = [];//essential urls
var extraUrlsToCache = [];
var lastVersionCheck;

function clearOldCaches() { //returns promise
  caches.keys().then(function(cacheNames) {
    return Promise.all(cacheNames.map(function(cacheName) {//finish when all done
      if (cacheWhitelist.indexOf(cacheName) === -1) return caches.delete(cacheName);
    }));
  });
}

async function getLatestCacheInfo() {
  if (lastVersionCheck && (new Date - lastVersionCheck) < 30000) return {version:version, extraUrlsToCache:extraUrlsToCache};
  lastVersionCheck = new Date;
  var response = await fetch('/cache.txt?time=' + lastVersionCheck.getTime());//prevent disk cache
  if (response.ok) {
    var json = await response.json();
    var newversion = parseInt(json.version);
    var newurls = response.extraUrlsToCache;
    console.log("latestInfo", json)
    return {
      version: (newversion?newversion:version),
      extraUrlsToCache: (newurls?newurls:extraUrlsToCache)
    };
  }
}

function updateToLatestVersion() { //returns promise
  return getLatestCacheInfo().then(function(data) {
    try {
      if (version != data.version) {
        console.log('New version found, updating...');
        version = data.version;
        updateCacheNames();
        clearOldCaches();
        extraUrlsToCache = data.extraUrlsToCache
      }
  } catch (e) {console.error(e)}
  });
}

self.addEventListener('install', function(event) {
  self.skipWaiting();
  event.waitUntil(updateToLatestVersion().then(function() {
    caches.open(FETCH_CACHE).then(function(cache) {cache.addAll(extraUrlsToCache);})
    caches.open(FETCH_CACHE).then(function(cache) {return cache.addAll(urlsToCache);});
  }));
  
});

self.addEventListener('fetch', function(event) {
  event.respondWith(updateToLatestVersion().then(function() {
    return caches.match(event.request).then(function(response) {
      if (response) return response; // Cache hit - return response
      return fetch(event.request).then(function (response) {
        // Check if we received a valid response
        if(!response || response.status !== 200 || response.type !== 'basic') return response;
        // IMPORTANT: Clone the response. A response is a stream and because we want the browser to consume the response
        // as well as the cache consuming the response, we need to clone it so we have two streams.
        var responseToCache = response.clone();
        caches.open(FETCH_CACHE).then(function(cache) {cache.put(event.request, responseToCache);});
        return response;
      });
    });
  }));
});

self.addEventListener('activate', function(event) {
  event.waitUntil(clearOldCaches());
});
self.addEventListener('activate', event => {
  event.waitUntil(clients.claim());
});
