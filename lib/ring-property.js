/**
 * Ring property type.
 */
'use strict';

const { GattUtils } = require('hap-controller');
const { Property } = require('gateway-addon');

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
  constructor(device, name, description) {
    super(device, name, propertyDescription);
    this.setCachedValue(propertyDescription.value);
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
    return new Promise((resolve, reject) => {
      super.setValue(value).then((updatedValue) => {
        resolve(updatedValue);
        this.device.notifyPropertyChanged(this);
      }).catch((err) => {
        reject(err);
      });
    });
  }
  
  /**
   * Set the new value of the property.
   *
   * @param {*} value - New value
   * @returns {Promise} Promise which resolves when the value has been set.
   */
  setValue(value) {

  }
}

module.exports = HomeKitProperty;
