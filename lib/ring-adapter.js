/**
 * Ring adapter for Mozilla WebThings Gateway.
 */
'use strict';

const { Adapter } = require('gateway-addon');
//const RingDatabase = require('./ring-database');
const RingDevice = require('./ring-device');
const RingAPI = require('doorbot');

const KNOWN_DEVICE_TYPES = ['doorbots', 'stickup_cams'];


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


    this.config = manifest.moziot.config;
    this.pairing = false;
    this.activityPollInterval = 10000;

    addonManager.addAdapter(this);

    this.ring = RingAPI({
      email: this.config.RingCredentials.email,
      password: this.config.RingCredentials.password,
      retries: 1,
      userAgent: 'Mozilla-IOT',
      api_version: 11,
      timeout: (10 * 60 * 1000),
    });

    const pollRingActivity = () => {
      //clear previous activities
      for (var device in this.devices) {
        this.devices[device].resetProperties();
      }

      this.ring.dings((e, json) => {
        if (json.length > 0) {
          this.processDeviceActivity(json[0]);
        }
      })
    };

    this.processDevices();

    console.log('Ring-Adapter - Starting check for activity every 10 seconds.');
    setInterval(pollRingActivity, this.activityPollInterval);
    pollRingActivity();
  }

/**
 * Example process to add a new device to the adapter.
 *
 * The important part is to call: `this.handleDeviceAdded(device)`
 *
 * @param {String} deviceId ID of the device to add.
 * @param {String} deviceDescription Description of the device to add.
 * @return {Promise} which resolves to the device added.
 */
addDevice(deviceId, deviceDescription) {
  return new Promise((resolve, reject) => {
    if (deviceId in this.devices) {
      reject(`Device: ${deviceId} already exists.`);
    } else {
      const device = new RingDevice(this, deviceId, deviceDescription);
      this.handleDeviceAdded(device);
      resolve(device);
    }
  });
}

/**
 * Example process ro remove a device from the adapter.
 *
 * The important part is to call: `this.handleDeviceRemoved(device)`
 *
 * @param {String} deviceId ID of the device to remove.
 * @return {Promise} which resolves to the device removed.
 */
removeDevice(deviceId) {
  return new Promise((resolve, reject) => {
    const device = this.devices[deviceId];
    if (device) {
      this.handleDeviceRemoved(device);
      resolve(device);
    } else {
      reject(`Device: ${deviceId} not found.`);
    }
  });
}

/**
 * Clean up before shutting down this adapter.
 *
 * @returns {Promise} Promise which resolves when finished unloading.
 */
unload() {
  return super.unload();
}

/**
 * Start the pairing/discovery process.
 *
 * @param {Number} timeoutSeconds Number of seconds to run before timeout
 */
startPairing(_timeoutSeconds) {
  console.log('RingAdapter:', this.name,
    'id', this.id, 'pairing started');

  this.pairing = true;
  this.processDevices();
}

/**
 * Cancel the pairing/discovery process.
 */
cancelPairing() {
  console.log('RingAdapter:', this.name, 'id', this.id,
    'pairing cancelled');
  this.pairing = true;
}

/**
 * Unpair the provided the device from the adapter.
 *
 * @param {Object} device Device to unpair with
 */
removeThing(device) {
  console.log('RingAdapter:', this.name, 'id', this.id,
    'removeThing(', device.id, ') started');

  this.removeDevice(device.id).then(() => {
    console.log('RingAdapter: device:', device.id, 'was unpaired.');
  }).catch((err) => {
    console.error('RingAdapter: unpairing', device.id, 'failed');
    console.error(err);
  });
}

/**
 * Cancel unpairing process.
 *
 * @param {Object} device Device that is currently being paired
 */
cancelRemoveThing(device) {
  console.log('RingAdapter:', this.name, 'id', this.id,
    'cancelRemoveThing(', device.id, ')');
  this.pairing = false;
}

processDevices() {
  console.log('RingAdapter:', this.name,
    'id', this.id, 'fetching list of devices from Ring api');

  this.ring.devices((e, devices) => {
    // process the know device types
    KNOWN_DEVICE_TYPES.forEach((value) => {
      for (let i = 0; i < devices[value].length; i++) {
        this.processDevice(devices[value][i]);
      }
    });
  });
}

processDevice(ringDevice) {
  const id = `ring-${ringDevice.kind}-${ringDevice.id}`;
  console.log('processDevice', id)
  const device = this.devices[id];

  if (device) {
    device.updateDevice(ringDevice, null);
    return;
  }

  new RingDevice(this, id, ringDevice);
}

processDeviceActivity(ringActivity) {
  const id = `ring-${ringActivity.device_kind}-${ringActivity.doorbot_id}`;
  const device = this.devices[id];

  if (device) {
    console.log('processDeviceActivity', id, ringActivity.kind)
    device.updateDeviceActivity(ringActivity);
    return;
  }
}
}

module.exports = RingAdapter;
