var version = 0; //starting cache version 0, should update with cache.txt
var FETCH_CACHE;
var cacheWhitelist;
function updateCacheNames() {
  FETCH_CACHE = 'ag-cache-v' + version;
  cacheWhitelist = ['ag-cache-v' + version];//['pages-cache-v1', 'blog-posts-cache-v1'];
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

function getMyCacheVersion() {
  caches.keys().then(function(cacheNames) { //returns promise
    for (var i = cacheNames.length - 1; i >= 0; i--) {
      var substrings = cacheNames[i].split("-v");
      var thisVersion = parseInt(substrings[substrings.length - 1]);
      if (thisVersion > version) version = thisVersion
    }
  });
}

async function updateToLatestVersion() {
	await getMyCacheVersion();
	if (lastVersionCheck && (new Date - lastVersionCheck) < 30000) return;
	lastVersionCheck = new Date;
	console.log('Fetching cache.txt');
	//?time=' + lastVersionCheck.getTime()
	// fetch should prioritise new version.
	fetch('/cache.txt').then(function (response){
		if (response.ok) {
			try {
				var json = response.json();
				var newversion = parseInt(json.version);
				var newurls = response.extraUrlsToCache;
				if (version > newversion) {
					console.log('WARNING: current cache version greater, not updating.');
				}
				if (version < newversion) {
					console.log('New cache version found, updating...');
					updateCacheNames();
					clearOldCaches();
					extraUrlsToCache = json.extraUrlsToCache
					caches.open(FETCH_CACHE).then(function(cache) {
						cache.addAll(extraUrlsToCache);
						cache.addAll(urlsToCache);
					})
					version = newversion;
				}
			} catch (e) {console.error(e)}
		}
	});
	
}

self.addEventListener('install', function(event) {
  self.skipWaiting();
  event.waitUntil(updateToLatestVersion().then(function() {
    caches.open(FETCH_CACHE).then(function(cache) {
    	cache.addAll(extraUrlsToCache);
    	cache.addAll(urlsToCache);
	})
  }));
  
});

self.addEventListener('fetch', function(event) {
	event.respondWith(updateToLatestVersion().then(function() {
		return fetch(event.request).then(function (fetchresponse) {
			if(!fetchresponse || fetchresponse.status !== 200 || fetchresponse.type !== 'basic') return fetchresponse;
			// IMPORTANT: Clone the response. A response is a stream and because we want the browser to consume the response
			// as well as the cache consuming the response, we need to clone it so we have two streams.
			var responseToCache = fetchresponse.clone();
			return caches.open(FETCH_CACHE).then(function(cache) {
				cache.put(event.request, responseToCache);
			})
			return fetchresponse;
		}).catch(function(errorresponse) {
			console.log(errorresponse)
			return caches.open(FETCH_CACHE).then(function(cache) {
				return cache.match(event.request).then(function(cacheresponse) {
					if (cacheresponse) return cacheresponse; // Cache hit - fetch error - return cache
				})
			})
				
		});
    }))
})
      


self.addEventListener('activate', function(event) {
  event.waitUntil(clearOldCaches());
});
self.addEventListener('activate', event => {
  event.waitUntil(clients.claim());
});
