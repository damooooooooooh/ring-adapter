'use strict';

const {Database} = require('gateway-addon');
const manifest = require('./manifest.json');
const RingAdapter = require('./lib/ring-adapter');

module.exports = (addonManager, _, errorCallback) => {
  const db = new Database(manifest.id);
  db.open().then(() => {
    return db.loadConfig();
  }).then((config) => {
    if (!config.RingCredentials.email) {
      errorCallback(manifest.id, 'Ring Account Email is Required!');
      return;
    }

    if (!config.RingCredentials.password && !config.refreshToken) {
      errorCallback(manifest.id, 'Ring Account Password / Refresh Token is Required!');
      return;
    }

    if (!config.pollInterval) {
      errorCallback(manifest.id, 'Specify a poll Interval between ' + config.pollInterval.minimum + ' and ' + config.pollInterval.maximum);
      return;
    }

    new RingAdapter(addonManager);
  }).catch(console.error);
};
