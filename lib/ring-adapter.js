/**
 * Ring adapter for Mozilla WebThings Gateway.
 */
'use strict';

const {Adapter} = require('gateway-addon');
const RingDevice = require('./ring-device');
const {RingApi} = require('ring-client-api');

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
    this.activityResetIntervalMS = 18000; // reset the activity after 18 secs

    this.ringApi = new RingApi({
      // without 2fa
      email: this.config.RingCredentials.email,
      password: this.config.RingCredentials.password,
      
      // with 2fa or if you dont want to store your email/password in your config
      refreshToken: 'token generated with ring-auth-cli.  See https://github.com/dgreif/ring/wiki/Two-Factor-Auth',
    
      // The following are all optional. See below for details
      cameraStatusPollingSeconds: 10,
      cameraDingsPollingSeconds: this.config.pollInterval,
    });

    console.log(`Fetching Ring devices for account ${this.config.RingCredentials.email}`);

    this.ringApi.getCameras().then((cameras) => {
      if (cameras.length) {
        cameras.forEach((camera) => {
          const deviceId = this.getRingAdapterIdFromApiData(camera.data);
          const deviceName = camera.name;
          const model = camera.model;
          const kind = camera.data.kind;
          const hasLowbattery = camera.hasLowBattery;
          const batteryLevel = camera.batteryLevel;
          const hasSiren = camera.hasSiren;
          const sirenActive = (camera.hasSiren) ? ((camera.data.siren_status.seconds_remaining === 0) ? false : true) : false;
          const hasLight = camera.hasLight;
          const lightOn = (camera.hasLight) ? ((camera.data.led_status === 'on') ? true : false) : false;

          this.addDevice(deviceId, deviceName, model, kind,
                         hasLowbattery, batteryLevel, hasSiren, sirenActive,
                         hasLight, lightOn);

          console.log(`Found Ring device: ${deviceName} with model type ${model}. deviceId: ${deviceId}`);
          //console.log(model, kind, hasLowbattery, batteryLevel, hasSiren, sirenActive, hasLight, lightOn);

          // Handle Ring device Notifications (dings)
          camera.onNewDing.subscribe((ding) => {
            const deviceId = this.getRingAdapterIdFromApiData(camera.data);
            const device = this.devices[deviceId];

            console.log(`new ding: ${ding.id} of kind ${ding.kind} for device ${deviceId}`);

            if (device) {
              if (ding.kind === 'motion') {
                if (device.properties.has('motion')) {
                  const motion = true;
                  const motionProp = device.properties.get('motion');
                  if (motionProp.value !== motion) {
                    motionProp.setCachedValue(motion);
                    device.notifyPropertyChanged(motionProp);
                  }
                }
              }

              if (ding.kind === 'ding') {
                if (device.properties.has('ding')) {
                  const ding = true;
                  const dingProp = device.properties.get('ding');
                  if (dingProp.value !== ding) {
                    dingProp.setCachedValue(ding);
                    device.notifyPropertyChanged(dingProp);
                  }
                }
              }
 
              setTimeout(() => {
                console.log(`reset ding: ${ding.id} of kind ${ding.kind} for device ${deviceId}`);
                if (ding.kind === 'motion') {
                  if (device.properties.has('motion')) {
                    const motionProp = device.properties.get('motion');
                    motionProp.setCachedValue(false);
                    device.notifyPropertyChanged(motionProp);
                  }
                }
                if (ding.kind === 'ding') {
                  if (device.properties.has('ding')) {
                    const dingProp = device.properties.get('ding');
                    dingProp.setCachedValue(false);
                    device.notifyPropertyChanged(dingProp);
                  }
                }
              }, this.activityResetIntervalMS);
            }
          });

          // Handle Ring device Updates
          camera.onData.subscribe((camera) => {
            // Update the Battery, Battery %, Siren and Light Properties if any
            const deviceId = this.getRingAdapterIdFromApiData(camera);
            const device = this.devices[deviceId];

            if (device) {
              const batteryLevel = camera.battery_life;
              const lightOn = (camera.led_status) ? ((camera.led_status === 'on') ? true : false) : false;
              const sirenActive = (camera.siren_status) ? ((camera.siren_status.seconds_remaining === 0) ? false : true) : false;

              if (device.properties.has('light')) {
                const lightProp = device.properties.get('light');
                if (lightProp.isUpdating) {
                  console.log(`Didnt sync light property for ${deviceId} as property is already syncing with ring.`);
                }
                if (lightProp.value !== lightOn && !lightProp.isUpdating) {
                  lightProp.setCachedValue(lightOn);
                  device.notifyPropertyChanged(lightProp);
                }
              }

              if (device.properties.has('siren')) {
                const sirenProp = device.properties.get('siren');
                if (sirenProp.isUpdating) {
                  console.log(`Didnt sync siren property for ${deviceId} as property is already syncing with ring.`);
                }
                if (sirenProp.value !== sirenActive && !sirenProp.isUpdating) {
                  sirenProp.setCachedValue(sirenActive);
                  device.notifyPropertyChanged(sirenProp);
                }
              }

              if (device.properties.has('battery')) {
                const batteryProp = device.properties.get('battery');
                if (batteryProp.value !== batteryLevel) {
                  batteryProp.setCachedValue(batteryLevel);
                  device.notifyPropertyChanged(batteryProp);
                }
              }
            }            
          });
        });
      }
    });
  }

  /**
   * Add a new device to the adapter.
   *
   * The important part is to call: `this.handleDeviceAdded(device)`
   *
   * @param {String} deviceId ID of the device to add.
   * @param {String} deviceName Description of the device to add.
   * @param {String} model The Ring Model,
   * @param {String} deviceKind The Ring Device Kind,
   * @param {boolean} hasLowBattery Boolean indicating a low battery,
   * @param {Number} batteryLevel The battery Level percentage,
   * @param {boolean} hasSiren Boolean Indicating if the device has a Siren, 
   * @param {boolean} sirenActive Boolean Indicating if the siren is active,
   * @param {boolean} hasLight Boolean Indicating if the Device has a light,
   * @param {boolean} lightOn Boolean indicating if the light is on/off,
   * @return {Promise} which resolves to the device added.
   */
  addDevice(deviceId, deviceName, model,
            deviceKind, hasLowBattery, batteryLevel,
            hasSiren, sirenActive, hasLight, lightOn){
    return new Promise((resolve, reject) => {
      let device = this.devices[deviceId];

      if (device) {
        // Need to update the device properties
        // resolve(device.updateDevice(ringDevice, null));
      } else {
        device = new RingDevice(this, deviceId,
                                deviceName, model, deviceKind,
                                hasLowBattery, batteryLevel,
                                hasSiren, sirenActive, hasLight, lightOn);
        this.handleDeviceAdded(device);
        resolve(device);
      }
    });
  }

  getRingAdapterIdFromApiData(ringCameraData) {
    // Consistent method to get the device ID
    const deviceId = `ring-${ringCameraData.kind}-${ringCameraData.id}`;
    return deviceId;
  }

  /**
   * Remove a device from the adapter.
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
    console.log(this.name,
                'id', this.id, 'pairing started');
    this.pairingEnd = Date.now() + _timeoutSeconds * 1000;
    this.pairing = true;
    this.pair();
  }

  /**
   * Internal Adapter Pair processing.
   *
   * @param {Number} timeoutSeconds Number of seconds to run before timeout
   */
  pair() {
    console.log(this.name,
                'id', this.id, 'pairing routine started');
    let polling = false;
  }

  /**
   * Cancel the pairing/discovery process.
   */
  cancelPairing() {
    console.log(this.name, 'id', this.id,
                'pairing cancelled');
    this.pairing = false;
  }

  /**
   * Unpair the provided the device from the adapter.
   *
   * @param {Object} device Device to unpair with
   */
  removeThing(device) {
    console.log(this.name, 'id', this.id,
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
    console.log(this.name, 'id', this.id,
                'cancelRemoveThing(', device.id, ')');
    this.pairing = false;
  }

  setSiren(deviceId, value) {
    return new Promise((resolve, reject) => {
      const device = this.devices[deviceId];
      const ringDeviceId = deviceId.split('-')[2];
      // Get a reference to the api Camera Object
      // This API has no camera collection to reference
      // so we need to flatten the cameras from the locations
      this.ringApi.getLocations().then((locations) => {
        if (locations) {
          const camera = locations.reduce((cameras, location) => [...cameras, ...location.cameras], []).filter(camera => camera.id == ringDeviceId)[0];
          if (camera) {
            return camera;
          } else {
            reject();
          }
        }
      }).then((camera) => {
        if (camera) {
          if(camera.hasSiren) {
            camera.setSiren(value);
            resolve();
          }
        }
      });
    });
  }

  setLight(deviceId, value) {
    return new Promise((resolve, reject) => {
      const device = this.devices[deviceId];
      const ringDeviceId = deviceId.split('-')[2];
      // Get a reference to the api Camera Object
      // This API has no camera collection to reference
      // so we need to flatten the cameras from the locations
      this.ringApi.getLocations().then((locations) => {
        if (locations) {
          const camera = locations.reduce((cameras, location) => [...cameras, ...location.cameras], []).filter(camera => camera.id == ringDeviceId)[0];
          if (camera) {
            return camera;
          } else {
            reject();
          }
        }
      }).then((camera) => {
        if (camera) {
          if(camera.hasLight) {
            camera.setLight(value);
            resolve();
          }
        }
      });
    });
  }
}

module.exports = RingAdapter;
