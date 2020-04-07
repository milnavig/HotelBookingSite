var db = require("./db.js");

var get = function() {
  var users = db.get("users").value();
  return users;
};

var getByEmail = function(email) {
  var user = db.get("users")
    .filter({email: email})
    .value();
  
  return user[0] || undefined;
};

var make = function(email, name, phone, password) {
  if (!email || !name || !phone || !password) {
    return false;
  }
  var user = {
    "email":        email,
    "name":         name,
    "phone":        phone,
    "password":     password
  };

  db.get("users")
    .push(user)
    .value();

  return user;
};

module.exports = {
  get: get,
  getByEmail: getByEmail,
  make: make
};