var express = require("express"); // получаем модуль Express
var reservations = require("./reservations.js");
var subscriptions = require("./subscriptions.js");
var events = require("./events.js");
var users = require("./users.js");
var app = express(); // создаем объект приложения
var port = 8443;
var bodyParser = require("body-parser");
var favicon = require("serve-favicon");
const path = require("path");


app.use(bodyParser.json()); // support parsing of application/json type post data

// Define routes
app.use(express.static("public"));

app.use(favicon(path.join(__dirname,"../public/img/logo-48x48.ico")));

app.get("/", function(req, res) {
  res.sendFile("index.html", {root: "public"});
});

app.get("/login", function(req, res) {
  res.sendFile("login.html", {root: "public"});
});

app.get("/registration", function(req, res) {
  res.sendFile("registration.html", {root: "public"});
});

app.get("/bookings", function(req, res) {
  res.sendFile("bookings.html", {root: "public"});
});

app.get("/contacts", function(req, res) {
  res.sendFile("contacts.html", {root: "public"});
});

app.get("/news/:newsID", function(req, res) {
  res.sendFile("news.html", {root: "public"});
});

app.get("/get-news", function(req, res) {
  //console.log(events.getByID(req.query.id));
  res.json(events.getByID(req.query.id));
});

app.get("/reservations.json", function(req, res) {
  //res.json(reservations.get());
  res.json(reservations.getByUser(req.query["user"]));
});

app.get("/reservation-details.json", function(req, res) {
  var reservation = reservations.getById(req.query["id"]);
  res.json(reservations.formatResponseObject(reservation));
});

app.get("/events.json", function(req, res) {
  res.json(events.get());
});

app.get("/users.json", function(req, res) {
  var user = users.getByEmail(req.query["email"]);
  res.json(user);
});

app.get("/registration.json", function(req, res) {
  var email =       req.query["email"];
  var name =        req.query["name"];
  var phone =       req.query["phone"];
  var password =    req.query["password"];
  var user = users.make(email, name, phone, password);
  res.json(user);
});

app.get("/make-reservation", function(req, res) {
  var id =          req.query["id"] || Date.now().toString().substring(3, 11);
  var user =        req.query["user"];
  var city =        req.query["city"] || req.query["form--city"];
  var arrivalDate = req.query["arrivalDate"] || req.query["form--arrival-date"];
  var arrivalTime = req.query["arrivalTime"] || req.query["form--arrival-time"];
  var nights =      req.query["nights"] || req.query["form--nights"];
  var guests =      req.query["guests"] || req.query["form--guests"];
  var reservationStatus = reservations.make(id, user, arrivalDate, arrivalTime, nights, guests, city);
  console.log("Making a reservation!!!");

  // reservations are automatically confirmed 5 seconds after booking time
  setTimeout(function() {
    reservations.confirm(id);
  }, 5000);

  res.json(reservationStatus);
});

app.get("/remove-bookings", function(req, res) {
  var id = req.query["id"];
  var resDel = reservations.deleteBooking(id);

  res.json(resDel);
});

app.post("/add-subscription", function(req, res) {
  subscriptions.add(req.body);
  res.json();
});

// Start the server
app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});