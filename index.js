'use strict';

const RingAdapter = require('./lib/ring-adapter');

module.exports = (addonManager, manifest) => {
  const config = manifest.moziot.config;

  if (!config.RingCredentials.email) {
    errorCallback(manifest.name, 'Ring Account Email is Required!');
    return;
  }

  if (!config.RingCredentials.password) {
    errorCallback(manifest.name, 'Ring Account Password is Required!');
    return;
  }

  new RingAdapter(addonManager, manifest);
};
