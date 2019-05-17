/**
 * Ring adapter for Mozilla WebThings Gateway.
 */
'use strict';

const {Adapter} = require('gateway-addon');
const RingDatabase = require('./ring-database');
const RingDevice = require('./ring-device');
const RingAPI = require('doorbot');

/**
 * Adapter for Ring devices.
 */
class RingAdapter extends Adapter {
  /**
   * Initialize the object.
   *
   * @param {Object} addonManager - AddonManagerProxy object
   * @param {Object} manifest - Package manifest
   */
  constructor(addonManager, manifest) {
    super(addonManager, manifest.name, manifest.name);
    addonManager.addAdapter(this);

  }


  /**
   * Unpair a device with the adapter.
   *
   * @param {Object} device - Device to unpair
   * @returns {Promise} Promise which resolves to the device removed.
   */
  removeThing(device) {
    let promise;

    /*if (device.paired) {
      if (device.bridge) {
        device.bridge.removeDevice(device);
        promise = Promise.resolve();
      } else {
        const database = new HomeKitDatabase(this.packageName);
        promise = device.unpair().then(() => {
          return database.open();
        }).then(() => {
          return database.removePairingData(device.deviceID);
        }).then(() => {
          database.close();
        });
      }
    } else {
      promise = Promise.resolve();
    }

    return promise.then(() => {
      this.knownDevices.delete(device.deviceID);
      this.handleDeviceRemoved(device);
    });*/
  }


  /**
   * Clean up before shutting down this adapter.
   *
   * @returns {Promise} Promise which resolves when finished unloading.
   */
  unload() {
    return super.unload();
  }
}

module.exports = RingAdapter;
