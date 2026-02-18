# DK Energy Prices - Android TWA

This folder contains a Trusted Web Activity (TWA) wrapper for the DK Energy Prices PWA.

## Prerequisites

- Android Studio (Arctic Fox or newer)
- JDK 11 or newer
- Android SDK with API level 34

## Building the APK

### 1. Open in Android Studio

Open the `android-twa` folder in Android Studio.

### 2. Create a Signing Key

For release builds, create a signing keystore:

```bash
keytool -genkey -v -keystore release-key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias dk-energy-prices
```

### 3. Get SHA256 Fingerprint

Get your signing key's SHA256 fingerprint:

```bash
keytool -list -v -keystore release-key.jks -alias dk-energy-prices
```

### 4. Update Digital Asset Links

Copy the SHA256 fingerprint and update `.well-known/assetlinks.json` in the website root:

```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "dk.energyprices.twa",
    "sha256_cert_fingerprints": ["YOUR_SHA256_FINGERPRINT"]
  }
}]
```

### 5. Build Release APK

In Android Studio:
1. Go to **Build > Generate Signed Bundle / APK**
2. Select **APK**
3. Select your keystore and enter credentials
4. Choose **release** build variant
5. Click **Finish**

The signed APK will be in `app/release/app-release.apk`

## Icon Setup

Copy your app icons to the following folders:
- `app/src/main/res/mipmap-mdpi/` (48x48)
- `app/src/main/res/mipmap-hdpi/` (72x72)
- `app/src/main/res/mipmap-xhdpi/` (96x96)
- `app/src/main/res/mipmap-xxhdpi/` (144x144)
- `app/src/main/res/mipmap-xxxhdpi/` (192x192)

Name them `ic_launcher.png` and `ic_launcher_round.png`.

## Customization

Edit `app/build.gradle` to change:
- `applicationId`: Your app's package name
- `hostName`: Your PWA's domain
- `launchUrl`: The path to your PWA
- `name`/`shortName`: App display names
- Theme colors

## Publishing to Play Store

1. Build a signed AAB (Android App Bundle) instead of APK
2. Create a Play Console developer account
3. Create a new app listing
4. Upload the signed AAB
5. Complete store listing, content rating, and pricing
6. Submit for review

## Widget Support

Android home screen widgets require native code and cannot be created via TWA alone.
For widget functionality, consider using the widget.html page as a quick-launch shortcut
or building a native Android widget separately.
