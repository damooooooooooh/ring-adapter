/**
 * Ring device type.
 */
'use strict';

const { Device, Event } = require('gateway-addon');
const RingProperty = require('./ring-property');


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
   */

  constructor(adapter, id, deviceName, model,
              deviceKind, hasLowBattery, batteryLevel,
              hasSiren, sirenActive,
              hasLight, lightOn)
  {
    super(adapter, id);

    this.deviceId = id;
    this.name = deviceName;
    this.description = model;
    this['@context'] = 'https://iot.mozilla.org/schemas';

    this['@type'] = ['MotionSensor'];


    if (deviceKind === 'doorbell_v3' || deviceKind === 'cocoa_doorbell') {
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
      this['@type'] = ['MotionSensor', 'Light', 'Alarm'];

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

    this.adapter.handleDeviceAdded(this);
  }
}

module.exports = RingDevice;
