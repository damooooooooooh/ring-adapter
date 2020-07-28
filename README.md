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

## Ring Account 2FA Authentication
The ring adapter now supports two-factor authentication using one-time passcodes and refresh tokens.
To configure the ring device adapter:

1. Enter your email and password associated with your Ring account on the ring-adapter add-ons configuration page.
2. Initially leave the OTP (One-time passcode) field empty and click **Apply**. 
3. You will then be prompted to provide the otp that was sent to your email or mobile (This may take a few seconds).
4. Enter the OTP (Within 10 minutes) and click **Apply** again.
5. Your Ring devices will then be discoverable on the Things page (Click the **+** and **Save** button).

**Note:** *Should your refresh token become invalid or expire just re-enter your password and repeat the otp verification steps (2-4) above to be issued a new refresh token.*

## credits
Thanks to dgreif for maintaining a robust implementation of the ring api
https://github.com/dgreif/ring