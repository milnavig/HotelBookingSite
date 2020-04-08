importScripts("/js/reservations-store.js");
importScripts("/js/vendor/progressive-ui-kitt/progressive-ui-kitt-sw-helper.js");

var CACHE_NAME = "site-cache-v1";
var CACHED_URLS_IMMUTABLE = [
  // Our HTML
  "/index.html",
  "/bookings.html",
  "/login.html",
  "/registration.html",
  // Stylesheets
  "/css/style.css",
  "https://maxcdn.bootstrapcdn.com/bootstrap/3.3.6/css/bootstrap.min.css",
  "https://fonts.googleapis.com/css?family=Raleway&display=swap",
  "/css/login-main.css",
  "/css/login-util.css",
  // JavaScript
  "https://code.jquery.com/jquery-3.0.0.min.js",
  "/js/app.js",
  "/js/bookings.js",
  "/js/auth.js",  
  // "/js/offline-map.js",
  "/js/reservations-store.js",
  // Images
  "/img/event-book.jpg",
  "/img/logo-white-50px.png",
  "/img/logo-white-80px.png",
  "/js/vendor/progressive-ui-kitt/themes/flat.css",
  "/js/vendor/progressive-ui-kitt/progressive-ui-kitt.js"
];

var CACHED_URLS_MUTABLE = [
  // JSON
  "/events.json",
  "/reservations.json"
];

var googleMapsAPIJS = "https://maps.googleapis.com/maps/api/js?key="+
  "AIzaSyDm9jndhfbcWByQnrivoaWAEQA8jy3COdE&callback=initMap";

self.addEventListener("install", function(event) {
  console.log("Installed");
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      var newImmutableRequests = [];
      return Promise.all(
        CACHED_URLS_IMMUTABLE.map(function(url) {
          return caches.match(url).then(function(response) {
            if (response) {
              return cache.put(url, response);
            } else {
              newImmutableRequests.push(url);
              return Promise.resolve();
            }
          });
        })
      ).then(function() {
        ProgressiveKITT.addMessage(
          "Кешування закінчено! Ви можете користуватися сторінкою offline.",
          {hideAfter: 2000}
        );
        return cache.addAll(newImmutableRequests.concat(CACHED_URLS_MUTABLE));
      });
    })
  );
});

self.addEventListener("activate", function(event) {
  console.log("Activated");
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          if (CACHE_NAME !== cacheName && cacheName.startsWith("site-cache")) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

self.addEventListener("fetch", function(event) {
  console.log("Fetched " + event.request.url);
  var requestURL = new URL(event.request.url);
  // Handle requests for index.html
  if (requestURL.pathname === "/" || requestURL.pathname === "/index.html") {
    event.respondWith(
      caches.open(CACHE_NAME).then(function(cache) {
        return cache.match("/index.html").then(function(cachedResponse) {
          var fetchPromise = fetch("/index.html")
            .then(function(networkResponse) {
              cache.put("/index.html", networkResponse.clone());
              return networkResponse;
            });
          return cachedResponse || fetchPromise;
        });
      })
    );
  } else if (requestURL.pathname === "/bookings") {
    event.respondWith(
      caches.match("/bookings.html").then(function(response) {
        return response || fetch("/bookings.html");
      })
    );
  } else if (requestURL.pathname === "/login") {
    event.respondWith(
      caches.match("/login.html").then(function(response) {
        return response || fetch("/login.html");
      })
    );
  // Handle requests for Google Maps JavaScript API file
  } else if (requestURL.href === googleMapsAPIJS) {
    /*event.respondWith(
      fetch(
        googleMapsAPIJS+"&"+Date.now(),
        { mode: "no-cors", cache: "no-store" }
      ).catch(function() {
        return caches.match("/js/offline-map.js");
      })
    );*/
  // Handle requests for events JSON file
  } else if (requestURL.pathname === "/events.json") {
    event.respondWith(
      caches.open(CACHE_NAME).then(function(cache) {
        return fetch(event.request).then(function(networkResponse) {
          cache.put(event.request, networkResponse.clone());
          return networkResponse;
        }).catch(function() {
          ProgressiveKITT.addAlert(
          "Ви зараз offline."+
          "Зміст цієї сторінки може бути застарілим."
          );
          return caches.match(event.request);
        });
      })
    );
  // Handle requests for event images.
  } else if (requestURL.pathname.startsWith("/img/event-")) {
    event.respondWith(
      caches.open(CACHE_NAME).then(function(cache) {
        return cache.match(event.request).then(function(cacheResponse) {
          return cacheResponse ||
            fetch(event.request).then(function(networkResponse) {
              cache.put(event.request, networkResponse.clone());
              return networkResponse;
            }).catch(function() {
              return cache.match("/img/event-default.jpg");
            });
        });
      })
    );
  // Handle analytics requests
  } else if (requestURL.host === "www.google-analytics.com") {
    event.respondWith(fetch(event.request));
  // Handle requests for files cached during installation
  } else if (
    CACHED_URLS_IMMUTABLE.includes(requestURL.href) ||
    CACHED_URLS_IMMUTABLE.includes(requestURL.pathname) ||
    CACHED_URLS_MUTABLE.includes(requestURL.href) ||
    CACHED_URLS_MUTABLE.includes(requestURL.pathname)
  ) {
    event.respondWith(
      caches.open(CACHE_NAME).then(function(cache) {
        return cache.match(event.request).then(function(response) {
          return response || fetch(event.request);
        });
      })
    );
  }
});

var createReservationUrl = function(reservationDetails) {
  var reservationUrl = new URL("http://localhost:8443/make-reservation");
  Object.keys(reservationDetails).forEach(function(key) {
    reservationUrl.searchParams.append(key, reservationDetails[key]);
  });
  console.log(reservationUrl);
  return reservationUrl;
};

var postReservationDetails = function(reservation) {
  self.clients.matchAll({ includeUncontrolled: true }).then(function(clients) {
    clients.forEach(function(client) {
      client.postMessage(
        {action: "update-reservation", reservation: reservation}
      );
    });
  });
};

var syncReservations = function() { // переделать
  return getReservations("idx_status", "Відправлення").then(function(reservations) {
    return Promise.all(
      reservations.map(function(reservation) {
        var reservationUrl = createReservationUrl(reservation);
        return fetch(reservationUrl).then(function(response) {
          return response.json();
        }).then(function(newReservation) {
          return updateInObjectStore(
            "reservations",
            newReservation.id,
            newReservation
          ).then(function() {
            postReservationDetails(newReservation);
          });
        });
      })
    );
  });
};

self.addEventListener("sync", function(event) {
  if (event.tag === "sync-reservations") {
    event.waitUntil(syncReservations());
  }
});

self.addEventListener("message", function (event) {
  console.log("Message received:", event.data);
  console.log("From a window with the id:", event.source.id);
  console.log("which is currently pointing at:",  event.source.url);
  console.log("and is", event.source.focused ? "focused" : "not focused");
  console.log("and", event.source.visibilityState);
  var data = event.data;
  if (data.action === "new-reservation") {
    self.clients.matchAll({ includeUncontrolled: true }).then(function(clients) {
      
      clients.forEach(function(client) {
        console.log(client.id);
        console.log(event.source.id);
        if(client.id != event.source.id) {
          client.postMessage({action: "update-list", reservation: data.reservation});
        }
      });
    });
  }
});

self.addEventListener("push", function(event) {
  var data = event.data.json();
  if (data.type === "reservation-confirmation") {
    var reservation = data.reservation;
    event.waitUntil(
      updateInObjectStore(
        "reservations",
        reservation.id,
        reservation)
      .then(function() {
        return self.registration.showNotification("Бронювання підтверджено", {
          body:
            "Бронювання "+reservation.arrivalDate+" було підтверджено.",
          icon: "/img/event-book.jpg",
          badge: "/img/icon-hotel.png",
          tag: "reservation-confirmation-"+reservation.id,
          actions: [
            {
              action: "details",
              title: "Показати бронювання",
              icon: "/img/icon-cal.png"
            }, {
              action: "confirm",
              title: "OK",
              icon: "/img/icon-confirm.png"
            },
          ],
          vibrate:
            [500,110,500]
        });
      })
    );
  }
});

self.addEventListener("notificationclick", function(event) {
  event.notification.close();
  if (event.action === "details") {
    event.waitUntil(
      self.clients.matchAll().then(function(activeClients) {
        if (activeClients.length > 0) {
          activeClients[0].navigate("http://localhost:8443/bookings");
        } else {
          self.clients.openWindow("http://localhost:8443/bookings");
        }
      })
    );
  }
});