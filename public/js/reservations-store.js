var DB_VERSION = 3;
var DB_NAME = "site-reservations";

if (navigator.storage && navigator.storage.persist) { // что-бы никогда не удаляло БД
  navigator.storage.persist().then(function(granted) {
    if (granted) {
      console.log("Data will not be deleted automatically");
    }
  });
}

var openDatabase = function() {
  return new Promise(function(resolve, reject) {
    // Make sure IndexedDB is supported before attempting to use it
    if (!self.indexedDB) {
      reject("IndexedDB not supported");
    }
    var request = self.indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = function(event) {
      reject("Database error: " + event.target.error);
    };

    request.onupgradeneeded = function(event) {
      var db = event.target.result;
      var upgradeTransaction = event.target.transaction;
      var reservationsStore;
      var reservationsStore_Auth;
      if (!db.objectStoreNames.contains("reservations")) {
        reservationsStore = db.createObjectStore("reservations",
          { keyPath: "id" }
        );
      } else {
        reservationsStore = upgradeTransaction.objectStore("reservations");
      }
        
      if (!db.objectStoreNames.contains("auth")) { // !!!!!!!!!
        reservationsStore_Auth = db.createObjectStore("auth",
          { keyPath: "email" }
        );
      } else {
        reservationsStore_Auth = upgradeTransaction.objectStore("auth");
      }

      if (!reservationsStore.indexNames.contains("idx_status")) {
        reservationsStore.createIndex("idx_status", "status", { unique: false });
      }
        
      if (!reservationsStore_Auth.indexNames.contains("idx_status")) { // !!!
        reservationsStore_Auth.createIndex("idx_status", "status", { unique: false });
      }
    };

    request.onsuccess = function(event) {
      resolve(event.target.result);
    };
  });
};

var openObjectStore = function(db, storeName, transactionMode) {
  return db
    .transaction(storeName, transactionMode)
    .objectStore(storeName);
};

var addToObjectStore = function(storeName, object) {
  return new Promise(function(resolve, reject) {
    openDatabase().then(function(db) {
      openObjectStore(db, storeName, "readwrite")
        .add(object).onsuccess = resolve;
    }).catch(function(errorMessage) {
      reject(errorMessage);
    });
  });
};

var updateInObjectStore = function(storeName, id, object) {
  return new Promise(function(resolve, reject) {
    openDatabase().then(function(db) {
      openObjectStore(db, storeName, "readwrite")
        .openCursor().onsuccess = function(event) {
          var cursor = event.target.result;
          if (!cursor) {
            reject("Reservation not found in object store");
          }
          if (cursor.value.id === id) {
            console.log("I'm in database");
            cursor.update(object).onsuccess = resolve;
            return;
          }
          cursor.continue();
        };
    }).catch(function(errorMessage) {
      reject(errorMessage);
    });
  });
};

/*
function getCookie(name) {
  let matches = document.cookie.match(new RegExp(
    "(?:^|; )" + name.replace(/([\.$?*|{}\(\)\[\]\\\/\+^])/g, "\\$1") + "=([^;]*)"
  ));
  return matches ? decodeURIComponent(matches[1]) : undefined;
}*/

var getReservations = function(indexName, indexValue) {
  var now = new Date();
  var time = now.getHours() + ":" + now.getMinutes() + ":" + now.getSeconds() + ":" + now.getMilliseconds();
  console.log("Початок отримання з БД: " + time);
  return new Promise(function(resolve) {
    openDatabase().then(function(db) {
      var objectStore = openObjectStore(db, "reservations");
      var reservations = [];
      var cursor;
      if (indexName && indexValue) {
        cursor = objectStore.index(indexName).openCursor(indexValue);
      } else {
        cursor = objectStore.openCursor();
      }
      cursor.onsuccess = function(event) {
        var cursor = event.target.result;
        if (cursor) {
          reservations.push(cursor.value);
          cursor.continue();
        } else {
          var now = new Date();
          var time = now.getHours() + ":" + now.getMinutes() + ":" + now.getSeconds() + ":" + now.getMilliseconds();
          console.log("Кінець отримання з БД: " + time);
          console.log(reservations.length);
          if (reservations.length > 0) {
            resolve(reservations);
          } else {
            getReservationsFromServer().then(function(reservations) {
              var now = new Date();
              var time = now.getHours() + ":" + now.getMinutes() + ":" + now.getSeconds() + ":" + now.getMilliseconds();
              console.log("Початок запису у БД: " + time);
              openDatabase().then(function(db) {
                var objectStore = openObjectStore(db, "reservations", "readwrite");
                for (var i = 0; i < reservations.length; i++) {
                  objectStore.add(reservations[i]);
                }
                var now = new Date();
                var time = now.getHours() + ":" + now.getMinutes() + ":" + now.getSeconds() + ":" + now.getMilliseconds();
                console.log("Кінець запису у БД: " + time);
                resolve(reservations);
              });
              caches.open("site-cache-v1").then(function(cache) { // зачем?
                cache.put("/reservations.json", new Response(reservations));
              });
            });
          }
        }
      };
    }).catch(function() {
      getReservationsFromServer().then(function(reservations) {
        resolve(reservations);
      });
    });
  });
};

var getReservationsFromServer = function() {
  return new Promise(function(resolve) {
    if (self.$) {
      //$.getJSON("/reservations.json", resolve);
      getAuth().then(function(auth) {$.getJSON("/reservations.json", {user: auth}, resolve);});
      
    } else if (self.fetch) {
      getAuth().then(function(auth) {
        fetch("/reservations.json", {user: "alex@gmail.com"}).then(function(response) { // не уверен что можно добавлять второй аргумент fetch("/reservations.json", {user: getCookie("user")})
          return response.json();
        }).then(function(reservations) {
          resolve(reservations);
        });
      });
      
    }
  });
};

var getAuth = function() { 
  return new Promise(function(resolve) {
    openDatabase().then(function(db) {
      var objectStore = openObjectStore(db, "auth");
      var auths = [];
      var cursor;
      
      cursor = objectStore.index("idx_status").openCursor("loggined");
      cursor = objectStore.openCursor();
      
      cursor.onsuccess = function(event) {
        var cursor = event.target.result;
        if (cursor) {
          auths.push(cursor.value.email);
          cursor.continue();
        } else {
          if (auths.length > 0) {
            resolve(auths[0]);
          } else {
            resolve("no_auth");
          }
        }
      };
    }).catch(function() {
      console.log("Auth Error");
    });
  });
};

var deleteAuth = function() { 
  return new Promise(function(resolve) {
    openDatabase().then(function(db) {
      db.transaction("auth", "readwrite")
        .objectStore("auth")
        .clear()
        .onsuccess = function(event) {
          console.log("Object store cleared");
        };
      
    }).catch(function() {
      console.log("Delete Auth Error");
    });
  });
};

var deleteBooking = function(id) { 
  return new Promise(function(resolve, reject) {
    openDatabase().then(function(db) {
      db.transaction("reservations", "readwrite")
        .objectStore("reservations")
        .openCursor().onsuccess = function(event) {
          var cursor = event.target.result;
          if (!cursor) {
            reject("Reservation not found in object store");
          }
          if (cursor.value.id === id) {
            cursor.delete().onsuccess = resolve;
            return;
          }
          cursor.continue();
        };
    }).catch(function(errorMessage) {
      reject(errorMessage);
    });
  });
};
