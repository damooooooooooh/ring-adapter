/**
 * Ring property type.
 */
'use strict';
const {Property} = require('gateway-addon');

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
    if (this.readOnly) {
      return Promise.reject('Read-only property');
    }

    if (this.hasOwnProperty('minimum')) {
      value = Math.max(this.minimum, value);
    }

    if (this.hasOwnProperty('maximum')) {
      value = Math.min(this.maximum, value);
    }

    if (this.type === 'integer') {
      value = Math.round(value);
    }

    if (this.type === 'boolean') {
      value = !!value;
    }

    return new Promise((resolve, reject) => {
      super.setValue(value).then((updatedValue) => {
        resolve(updatedValue);
        this.device.notifyPropertyChanged(this);
      }).catch((err) => {
        reject(err);
      });
    });
  }
}

module.exports = RingProperty;
