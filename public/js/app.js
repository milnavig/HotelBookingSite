// Service Worker
if ("serviceWorker" in navigator) { //Свойство только-для-чтения Navigator.serviceWorker возвращает объект ServiceWorkerContainer, который предоставляет доступ к регистрации, удалению, обновлению и взаимодействию с объектами ServiceWorker для соответствующего документа.
  navigator.serviceWorker.register("/serviceworker.js")
    .then(function(registration) {
      console.log("Service Worker registered with scope:", registration.scope);
    }).catch(function(err) {
      console.log("Service worker registration failed:", err);
    });
}

navigator.serviceWorker.addEventListener("message", function (event) {
  var data = event.data;
  if (data.action === "nav-to-sign-in") {
    window.location.href = data.url;
  } else if (data.action === "update-reservation") {
    updateReservationDisplay(data.reservation);
  }
});

getAuth().then(function(auth) {
  console.log(auth);
  if (auth == "no_auth") {
    window.location.href = "https://for-thesis.space/login";
  }
});

$("#leave").click(function(event) {
  //deleteAuth();
  indexedDB.deleteDatabase("site-reservations");
  if (navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({action: "leave-account"});
  }
});

$(document).ready(function() {
  // Fetch and render upcoming events in the hotel
  $.getJSON("/events.json", renderEvents);
});

// RENDER

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

navigator.getBattery().then(function(battery) {
  function updateAllBatteryInfo(){
    updateChargeInfo();
    updateLevelInfo();
    updateChargingInfo();
    updateDischargingInfo();
  }
  updateAllBatteryInfo();

  battery.addEventListener("chargingchange", function(){
    updateChargeInfo();
  });
  function updateChargeInfo(){
    console.log("Battery charging? "
                + (battery.charging ? "Yes" : "No"));
  }

  battery.addEventListener("levelchange", function(){
    updateLevelInfo();
  });
  function updateLevelInfo(){
    var now = new Date();
    var time = now.getHours() + ":" + now.getMinutes() + ":" + now.getSeconds();
    console.log("Battery level: "
                + battery.level * 100 + "% " + time);
  }

  battery.addEventListener("chargingtimechange", function(){
    updateChargingInfo();
  });
  function updateChargingInfo(){
    console.log("Battery charging time: "
                 + battery.chargingTime + " seconds");
  }

  battery.addEventListener("dischargingtimechange", function(){
    updateDischargingInfo();
  });
  function updateDischargingInfo(){
    console.log("Battery discharging time: "
                 + battery.dischargingTime + " seconds");
  }

});