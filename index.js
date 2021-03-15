'use strict';

const RingAdapter = require('./lib/ring-adapter');

module.exports = (addonManager, manifest, errorCallback) => {
  const config = manifest.moziot.config;

  if (!config.RingCredentials.email) {
    errorCallback(manifest.name, 'Ring Account Email is Required!');
    return;
  }

  if (!config.RingCredentials.password && !config.refreshToken) {
    errorCallback(manifest.name, 'Ring Account Password / Refresh Token is Required!');
    return;
  }

  if (!config.pollInterval) {
    errorCallback(manifest.name, `Specify a poll Interval between ${config.pollInterval.minimum} and ${config.pollInterval.maximum}`);
    return;
  }

  new RingAdapter(addonManager, manifest);
};
