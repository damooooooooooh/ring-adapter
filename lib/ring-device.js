/**
 * Ring device type.
 */
'use strict';

const {Device, Constants} = require('gateway-addon');
//const RingDatabase = require('./ring-database');
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
   * @param {Object} device - the device API object
   */

  constructor(adapter, id, device) {
    super(adapter, id);

    this.deviceId = device.id;
    this.name = device.description;
    this.description = device.address;

    // Handle Doorbell type
    if (device.kind === 'doorbell_v3') {
      this.type = Constants.THING_TYPE_BINARY_SENSOR;
      this['@type'] = ['MotionSensor'];

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
          device.battery_life));

      this.properties.set(
        'video',
        new RingProperty(
          this,
          'video',
          {
            '@type': 'VideoProperty',
            label: 'Video',
            type: null,
            readOnly: true,
            links: [
              {
                rel: 'alternate',
                href: '',
                mediaType: '',
              },
            ],
          },
          null));

      this.adapter.handleDeviceAdded(this);
    }
  }

  updateDevice(device) {
    if (this.properties.has('battery')) {
      const battery = device.battery_life;
      const batteryProp = this.properties.get('battery');
      if (batteryProp.value !== battery) {
        batteryProp.setCachedValue(battery);
        super.notifyPropertyChanged(batteryProp);
      }
    }

    this.resetProperties();
  }

  updateDeviceActivity(activity) {
    if (activity.kind === 'motion' || activity.kind === 'ding') {
      if (this.properties.has('motion')) {
        const motion = activity.motion;
        const motionProp = this.properties.get('motion');
        if (motionProp.value !== motion) {
          motionProp.setCachedValue(motion);
          super.notifyPropertyChanged(motionProp);
        }
      }
    }

    if (activity.kind === 'ding') {
      if (this.properties.has('ding')) {
        const ding = true;
        const dingProp = this.properties.get('ding');
        if (dingProp.value !== ding) {
          dingProp.setCachedValue(ding);
          super.notifyPropertyChanged(dingProp);
        }
      }
    }
  }

  resetProperties() {
    if (this.properties.has('ding')) {
      const dingProp = this.properties.get('ding');
      dingProp.setCachedValue(false);
      super.notifyPropertyChanged(dingProp);
    }

    if (this.properties.has('motion')) {
      const motionProp = this.properties.get('motion');
      motionProp.setCachedValue(false);
      super.notifyPropertyChanged(motionProp);
    }
  }
}

module.exports = RingDevice;
