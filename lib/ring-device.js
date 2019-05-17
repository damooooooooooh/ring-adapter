/**
 * Ring device type.
 */
'use strict';

const { Device, Event } = require('gateway-addon');
const RingDatabase = require('./homekit-database');
const RingProperty = require('./homekit-property');
//const PropertyUtils = require('./property-utils');
//const Util = require('./util');
//const VendorExtensions = require('./vendor-extensions');


/*const BLE_POLL_INTERVAL = 30 * 1000;
const SKIP_QUEUE = true;
const TRIGGERED_BY_EVENT = true;*/

/**
 * Ring device type.
 */
class RingDevice extends Device {
  /**
   * Initialize the object.
   *
   * @param {Object} adapter - RingAdapter instance
   * @param {string} connectionType - Type of this connection: "ip" or "ble"
   * @param {Object} service - The service object
   * @param {Object?} bridge - Bridge this device is attached to, if any
   */
  constructor(adapter, id, deviceDescription) {
    const id = HomeKitDevice.getIdFromService(service, connectionType);
    super(adapter, id);

    this.name = deviceDescription.name;
    this.type = deviceDescription.type;
    this['@type'] = deviceDescription['@type'];
    this.description = deviceDescription.description;

    //Builds up the properties
    for (const propertyName in deviceDescription.properties) {
      const propertyDescription = deviceDescription.properties[propertyName];
      const property = new RingProperty(this, propertyName,
        propertyDescription);
      this.properties.set(propertyName, property);
    }
  }
}

module.exports = RingDevice;
