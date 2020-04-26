var db = require("./db.js");
var webpush = require("web-push");

// IMPORTANT
// Once you have generated the `push-keys.js` file described in chapter 10, there is
// no need for this try catch statement, or the `temporary-push-keys.js` file.
// It is only here so that the server can run while you are working on earlier
// chapters, and have not generated your own `push-keys.js` file yet.
var pushKeys;
pushKeys = require("./push-keys.js");

/**
 * Adds a subscription details object to the database, if it doesn't already exist
 *
 * @param {Object} subscription
 */
var add = function(subscription) {
  // Make sure subscription doesn't already exist
  var existingSubscriptions = db.get("subscriptions")
    .filter({endpoint: subscription.endpoint})
    .value();
  if (existingSubscriptions.length > 0) {
    return;
  }

  // Add the new subscription
  db.get("subscriptions")
    .push(subscription)
    .value();
};

/**
 * Sends a push message to all subscriptions
 *
 * @param {Object} pushPayload
 */
var notify = function(pushPayload) {
  var reservation = pushPayload["reservation"];
  var user = reservation["user"];

  pushPayload = JSON.stringify(pushPayload);
  webpush.setGCMAPIKey(pushKeys.GCMAPIKey);
  webpush.setVapidDetails(
    pushKeys.subject,
    pushKeys.publicKey,
    pushKeys.privateKey
  );

  var subscriptions = db.get("subscriptions").filter({ user: user }).value();
  subscriptions.forEach(function(subscription) {
    delete subscription["user"];
    webpush
      .sendNotification(subscription, pushPayload)
      .then(function() {
        console.log("Notification sent");
      })
      .catch(function() {
        console.log("Notification failed");
      });
  });
};

module.exports = {
  add: add,
  notify: notify
};
