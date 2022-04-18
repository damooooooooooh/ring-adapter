/**
 * Ring device type.
 */
'use strict';

const {Device} = require('gateway-addon');
const RingProperty = require('./ring-property');
const path = require('path'),
  fs = require('fs'),
  mkdirp = require('mkdirp'),
  os = require('os');

function getMediaPath(mediaDir) {
  if (mediaDir) {
    return path.join(mediaDir, 'ring-camera');
  }

  let profileDir;
  if (process.env.hasOwnProperty('WEBTHINGS_HOME')) {
    profileDir = process.env.WEBTHINGS_HOME;
  } else {
    profileDir = path.join(os.homedir(), '.webthings');
  }

  return path.join(profileDir, 'media', 'ring-camera');
}

/**
 * Ring device type.
 */
class RingDevice extends Device {
  /**
   * Initialize the object.
   *
   * @param {Object} adapter - RingAdapter instance
   * @param {String} id - id of the device expected by the Ring API
   * @param {String} deviceName Description of the device to add.
   * @param {String} model The Ring Model,
   * @param {String} deviceKind The Ring Device Kind,
   * @param {boolean} hasLowBattery Boolean indicating a low battery,
   * @param {Number} batteryLevel The battery Level percentage,
   * @param {boolean} hasSiren Boolean Indicating if the device has a Siren,
   * @param {boolean} sirenActive Boolean Indicating if the siren is active,
   * @param {boolean} hasLight Boolean Indicating if the Device has a light,
   * @param {boolean} lightOn Boolean indicating if the light is on/off,
   * @param {RingCamera} camera The camera device as returned by
   *   ring-client-api,
   */

  constructor(adapter, id, deviceName, model,
              deviceKind, hasLowBattery, batteryLevel,
              hasSiren, sirenActive,
              hasLight, lightOn,
              camera) {
    super(adapter, id);

    this.deviceId = id;
    this.name = deviceName;
    this.description = model;
    this.camera = camera;
    this.hasCamera = camera.data.settings &&
      camera.data.settings.enable_vod;

    this.mediaDir = path.join(
      getMediaPath(adapter.userProfile.mediaDir),
      this.deviceId
    );
    if (!fs.existsSync(this.mediaDir)) {
      mkdirp.sync(this.mediaDir, {mode: 0o755});
    }

    this['@context'] = 'https://iot.mozilla.org/schemas';
    this['@type'] = ['MotionSensor'];

    // If DeviceKind is of doorbell type, add the button property
    if (deviceKind.toLowerCase().includes('door')) {
      this['@type'] = ['MotionSensor', 'PushButton'];
      this.properties.set(
        'ding',
        new RingProperty(
          this,
          'ding',
          {
            '@type': 'PushedProperty',
            label: 'Ding',
            type: 'boolean',
            readOnly: true,
          },
          false));

      this.addEvent('pressed', {
        '@type': 'PressedEvent',
        description: 'Doorbell Pressed',
      });
      this.addEvent('released', {
        '@type': 'ReleasedEvent',
        description: 'Doorbell released',
      });
    }

    if (hasLight) {
      this['@type'].push('Light');

      this.properties.set(
        'light',
        new RingProperty(
          this,
          'light',
          {
            '@type': 'OnOffProperty',
            title: 'Light',
            type: 'boolean',
          },
          lightOn));
    }

    if (hasSiren) {
      this['@type'].push('Alarm');

      this.properties.set(
        'siren',
        new RingProperty(
          this,
          'siren',
          {
            '@type': 'AlarmProperty',
            title: 'Alarm',
            type: 'boolean',
          },
          sirenActive));

      this.addEvent('alarmEvent', {
        '@type': 'AlarmEvent',
        description: 'An alarm event was triggered!',
        type: 'string',
        readOnly: true,
      });

      this.addEvent('alarmFailure', {
        '@type': 'AlarmFailure',
        description: 'An alarm event failed to trigger!',
        type: 'string',
        readOnly: true,
      });

      this.addEvent('alarmSilenced', {
        '@type': 'AlarmSilenced',
        description: 'An alarm event was silenced!',
        type: 'string',
        readOnly: true,
      });
    }

    this.properties.set(
      'battery',
      new RingProperty(
        this,
        'battery',
        {
          '@type': 'LevelProperty',
          label: 'Battery',
          type: 'integer',
          unit: 'percent',
          readOnly: true,
          minimum: 0,
          maximum: 100,
        },
        Number(batteryLevel)));

    this.properties.set(
      'lowBattery',
      new RingProperty(
        this,
        'lowBattery',
        {
          '@type': 'LowBatteryProperty',
          label: 'Low Battery',
          type: 'boolean',
          readOnly: true,
        },
        Number(hasLowBattery)));

    this.properties.set(
      'motion',
      new RingProperty(
        this,
        'motion',
        {
          '@type': 'MotionProperty',
          label: 'Motion',
          type: 'boolean',
          readOnly: true,
        },
        false));

    if (this.hasCamera) {
      this['@type'].push('VideoCamera', 'Camera');

      this.properties.set(
        'streamActive',
        new RingProperty(
          this,
          'streamActive',
          {
            title: 'Streaming',
            type: 'boolean',
          },
          false
        )
      );
    }

    this.adapter.handleDeviceAdded(this);
  }

  async startVideoStream() {
    console.log(`Starting video stream for ${this.deviceId}`);

    this.sipSession = await this.camera.streamVideo({
      output: [
        '-preset',
        'veryfast',
        '-g',
        '25',
        '-sc_threshold',
        '0',
        '-f',
        'dash',
        '-remove_at_exit',
        '1',
        path.join(this.mediaDir, 'stream.mpd'),
      ],
    });

    this.addVideoProperty();
  }

  async addVideoProperty() {
    // https://discourse.mozilla.org/t/updating-thing-properties-on-the-gateway-ui-i-e-name-links/41101/7
    this.properties.set(
      'video',
      new RingProperty(
        this,
        'video',
        {
          '@type': 'VideoProperty',
          label: 'Live View',
          type: 'null',
          readOnly: true,
          // TODO disable this prop when !streamActive
          links: [
            {
              rel: 'alternate',
              href: `/media/ring-camera/${this.deviceId}/stream.mpd`,
              mediaType: 'application/dash+xml',
            },
          ],
        },
        null));
    
    // Force the UI To Refresh and add the property to GUI, 
    // maybe a hack but cannot see any other way to trigger.
    this.adapter.handleDeviceAdded(this);
  }

  async removeVideoProperty() {
    if (this.properties.has('video')) {
      this.properties.delete('video');
      // Force the UI To Refresh and remove the property from GUI, 
      // It will cause confusion if remains with no content
      // maybe a hack but cannot see any other way to trigger.
      this.adapter.handleDeviceAdded(this);
    }
  }  

  async stopVideoStream() {
    if (this.sipSession) {
      console.log(`Stopping video stream for ${this.deviceId}`);
      await this.sipSession.stop();
      this.removeVideoProperty();
    } else {
      console.warn(`No video stream to stop for ${this.deviceId}`);
    }
  }
}

module.exports = RingDevice;
