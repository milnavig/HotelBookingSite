// Service Worker
if ("serviceWorker" in navigator) { //Свойство только-для-чтения Navigator.serviceWorker возвращает объект ServiceWorkerContainer, который предоставляет доступ к регистрации, удалению, обновлению и взаимодействию с объектами ServiceWorker для соответствующего документа.
  navigator.serviceWorker.register("/serviceworker.js")
    .then(function(registration) {
      console.log("Service Worker registered with scope:", registration.scope);
    }).catch(function(err) {
      console.log("Service worker registration failed:", err);
    });
}
/*
navigator.serviceWorker.addEventListener("message", function (event) {
  var data = event.data;
  if (data.action === "navigate") {
    window.location.href = data.url; // Ещё не готово
  } else if (data.action === "update-reservation") {
    updateReservationDisplay(data.reservation);
  }
});*/

function setCookie(name, value, options = {}) {

  options = {
    path: "/",
    // при необходимости добавьте другие значения по умолчанию
  };

  if (options.expires instanceof Date) {
    options.expires = options.expires.toUTCString();
  }

  let updatedCookie = encodeURIComponent(name) + "=" + encodeURIComponent(value);

  for (let optionKey in options) {
    updatedCookie += "; " + optionKey;
    let optionValue = options[optionKey];
    if (optionValue !== true) {
      updatedCookie += "=" + optionValue;
    }
  }

  document.cookie = updatedCookie;
}

function getCookie(name) {
  let matches = document.cookie.match(new RegExp(
    "(?:^|; )" + name.replace(/([\.$?*|{}\(\)\[\]\\\/\+^])/g, "\\$1") + "=([^;]*)"
  ));
  return matches ? decodeURIComponent(matches[1]) : undefined;
}

if (getCookie("user") === undefined) {
  window.location.href = "http://188.225.57.199:8443/login";
}

$("#leave").click(function(event) {
  //event.preventDefault();
  setCookie("user", "", {
    "max-age": -1
  });
  indexedDB.deleteDatabase("site-reservations");
});

$(document).ready(function() {
  // Fetch and render upcoming events in the hotel
  $.getJSON("/events.json", renderEvents);
});


/* ************************************************************ */
/* The code below this point is used to render to the DOM. It   */
/* completely ignores common sense principles as a trade off    */
/* for readability.                                             */
/* You can ignore it, or you can send angry tweets about it to  */
/* @TalAter                                                     */
/* ************************************************************ */

var renderEvents = function(data) {
  data.forEach(function(event) {
    $(
      "<div class=\"col-lg-12 col-md-12 col-sm-12 event-container\"><div class=\"event-card\"><div id=\"big-block\">"+
      "<img src=\""+event.img+"\" alt=\""+event.title+"\" class=\"img-responsive img-size\" />"+
      "<div id=\"event-block\"><h4>"+event.title+"</h4>"+
      "<p>"+event.description+"</p></div></div>"+
      "<div class=\"event-date\">"+event.date+"</div>"+
      "</div></div>"
    ).insertBefore("#events-container div.calendar-link-container");
  });
};
