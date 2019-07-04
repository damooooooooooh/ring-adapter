/**
 * Ring adapter for Mozilla WebThings Gateway.
 */
'use strict';

const {Adapter} = require('gateway-addon');
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
    addonManager.addAdapter(this);

    this.config = manifest.moziot.config;
    this.pairing = false;
    this.activities = [];
    this.activityPollIntervalMS = this.config.pollInterval * 1000;
    this.activityResetIntervalMS = 18000; // reset the activity after 18 secs
    this.devicePollIntervalMS = (60 * 60 * 1000); // poll the device every hour for device updates like battery etc
    this.activityInterval;
    this.deviceInterval;
    this.resetActivityTimeout;

    this.ring = RingAPI({
      email: this.config.RingCredentials.email,
      password: this.config.RingCredentials.password,
      retries: 1,
      userAgent: 'Mozilla-IOT',
      api_version: 11,
      timeout: (0.2 * 60 * 1000),
    });

    const pollRingActivity = () => {
      this.ring.dings((e, dings) => {

        if (e) {
          console.log('Error fetching Ring Activities', e);
          return;
        }

        if (dings.length > 0) {
          let i;
          for (i = 0; i < dings.length; i++) {
            const ringEvent = {
              id: dings[i].id,
              id_str: dings[i].id_str,
              device_kind: dings[i].device_kind,
              doorbot_id: dings[i].doorbot_id,
              kind: dings[i].kind,
              motion: dings[i].motion,
              now: Date.now(),
            };

            this.processDeviceActivity(ringEvent);

            this.resetActivityTimeout = setTimeout(() => {
              this.resetDeviceActivity(ringEvent);
            }, this.activityResetIntervalMS, ringEvent);
          }
        }
      });
    };

    const pollRingDevices = () => {
      return new Promise(resolve => {
        this.ring.devices((e, devices) => {

          if (e) {
            console.log('Error fetching Ring Devices', e);
            resolve(false);
          }
  
          if (devices) {
            // process the know device types
            KNOWN_DEVICE_TYPES.forEach((value) => {
              for (let i = 0; i < devices[value].length; i++) {
                this.processDevice(devices[value][i]);
              }
            });

            resolve(true);
          } else {
            resolve(false);
          }
        });
      });  
    };

    console.log(`Fetching Ring devices for account ${this.config.RingCredentials.email}`);
    pollRingDevices().then((hasDevices) => {

      if (hasDevices) {
        console.log(`Starting Ring api Activity Poll every ${this.activityPollIntervalMS / 1000} seconds`);
        this.activityInterval = setInterval(pollRingActivity, this.activityPollIntervalMS);
      }
    
      console.log(`Starting Ring api Device Poll every ${this.devicePollIntervalMS / 1000} seconds`);
      this.deviceInterval = setInterval(pollRingDevices, this.devicePollIntervalMS);

    });
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
    clearTimeout(this.resetActivityTimeout);
    clearInterval(this.activityInterval);
    clearInterval(this.devicePollInterval);
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

  processDeviceActivity(ringEvent) {
    const id = `ring-${ringEvent.device_kind}-${ringEvent.doorbot_id}`;
    const device = this.devices[id];

    if (device) {
      console.log('processDeviceActivity', id, ringEvent.kind);
      device.updateDeviceActivity(ringEvent);
    }
  }

  resetDeviceActivity(ringEvent) {
    const id = `ring-${ringEvent.device_kind}-${ringEvent.doorbot_id}`;
    const device = this.devices[id];

    if (device) {
      console.log('resetDeviceActivity', id, ringEvent.kind);
      device.resetDeviceActivity(ringEvent);
    }
  }
}

module.exports = RingAdapter;
