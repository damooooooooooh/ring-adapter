# ring-adapter
Ring device adapter for Mozilla WebThings Gateway.

## How does it work?
The adapter polls the ring api for activity using a configurable poll interval that you can set in the adpater configuration page.
A static poll of 10 seconds is also used to detect and update changes to to your devices triggered by the ring app/other sources.
The adapter will detect all ring devices associated to your ring account and they can be added from the add thing page.
Ability to detect device rings and motion.
Ability to initiate and detect siren/light activations for compatible devices.

## Supported Devices
Currently (doorbells), lights, floodlights, sirens

## limitations
Tested only with camera and floodlight devices.  Alarms not currently supported.
2FA not supported

## credits
Thanks to dgreif for maintaining a robust implementation of the ring api
https://github.com/dgreif/ring