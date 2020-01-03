/**
 * Ring property type.
 */
'use strict';
const {Property, Event} = require('gateway-addon');

/**
 * Ring property type.
 */
class RingProperty extends Property {
  /**
   * Initialize the object.
   *
   * @param {Object} device - Device this property belongs to
   * @param {string} name - Name of the property
   * @param {Object} description - Description of the property
   */
  constructor(device, name, description, value) {
    super(device, name, description);
    this.setCachedValue(value);
    this.device.notifyPropertyChanged(this);
    this.isUpdating = false;
  }

  /**
   * Set the value of the property.
   *
   * @param {*} value The new value to set
   * @returns a promise which resolves to the updated value.
   *
   * @note it is possible that the updated value doesn't match
   * the value passed in.
   */
  setValue(value) {
    return new Promise((resolve, reject) => {
      const backupValue = this.value;
      this.setCachedValue(value);
      resolve(value);
      this.device.notifyPropertyChanged(this);

      if (this.name === 'light') {
        this.isUpdating = true;
        const textValue = (value) ? 'On' : 'Off';
        this.device.adapter.setLight(this.device.id, this.value)
          .then(() => {
            console.log(`Turned ${textValue} the light for device ${this.device.deviceId}`);

            // As the ring api Synces every 10 secs, lets wait 10 secs 
            // after updating an block incorrect updates from the api
            setTimeout(() => {
              this.isUpdating = false;
            }, 10000);
          })
          .catch((error) => {
            // The update failed raise the alert
            console.log(`Could not turn ${textValue} the light for device ${this.device.deviceId}. ${error}`);
            this.setCachedValue(backupValue);
            this.device.notifyPropertyChanged(this);
            this.isUpdating = false;
          });
      } else if (this.name === 'siren') {
        this.isUpdating = true;
        const textValue = (value) ? 'Triggered' : 'Silenced';
        this.device.adapter.setSiren(this.device.id, this.value)
          .then(() => {
            console.log(`${textValue} the Alarm for device ${this.device.deviceId}`);
            if (value) {
              this.device.eventNotify(new Event(this.device,
                                         'alarmEvent',
                                         'Alarm Triggered!'));
            } else {
              this.device.eventNotify(new Event(this.device,
                                         'alarmSilenced',
                                         'Alarm Silenced!'));
            }

            // As the ring api Synces every 10 secs, lets wait 10 secs 
            // after updating an block incorrect updates from the api
            setTimeout(() => {
              this.isUpdating = false;
            }, 10000);
          })
          .catch((error) => {
            // The update failed raise the alert
            const errorMessage = `Could not ${textValue} the Alarm for device ${this.device.deviceId}. ${error}`;
            console.log(errorMessage);
            this.device.eventNotify(new Event(this.device,
                                       'alarmFailure',
                                       errorMessage));
            this.setCachedValue(backupValue);
            this.device.notifyPropertyChanged(this);
            this.isUpdating = false;
          });
      }    
    });
  }
}

module.exports = RingProperty;
