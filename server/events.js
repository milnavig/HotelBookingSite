var db = require("./db.js"); //подключаем модуль

/**
 * Get all events from the database
 *
 * @returns {Array}
 */
var get = function() {
  return db.get("events").value();
};

module.exports = {
  get: get
};
