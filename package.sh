#!/bin/bash

rm -rf node_modules
rm -rf build
npm install --production
rm -f build/SHA256SUMS
mkdir -p build/{linux,raspbian,darwin,windows}

# Fetch the ffmpeg binaries
wget -O build/raspbian/ffmpeg-raspbian-armv6l.tar.gz https://github.com/homebridge/ffmpeg-for-homebridge/releases/download/v0.0.9/ffmpeg-raspbian-armv6l.tar.gz
wget -O build/linux/ffmpeg-debian-x86_64.tar.gz https://github.com/homebridge/ffmpeg-for-homebridge/releases/download/v0.0.9/ffmpeg-debian-x86_64.tar.gz
wget -O build/darwin/ffmpeg-darwin-x86_64.tar.gz https://github.com/homebridge/ffmpeg-for-homebridge/releases/download/v0.0.9/ffmpeg-darwin-x86_64.tar.gz
wget -O build/windows/ffmpeg-win32-x86_64.tar.gz https://github.com/homebridge/ffmpeg-for-homebridge/releases/download/v0.0.9/ffmpeg-win32-x86_64.tar.gz

tar -xvf build/raspbian/ffmpeg-raspbian-armv6l.tar.gz -C build/raspbian/ --strip-components 4 ./usr/local/bin/ffmpeg
tar -xvf build/linux/ffmpeg-debian-x86_64.tar.gz -C build/linux/ --strip-components 4 ./usr/local/bin/ffmpeg
tar -xvf build/darwin/ffmpeg-darwin-x86_64.tar.gz -C build/darwin/ --strip-components 4 ./usr/local/bin/ffmpeg
tar -xvf build/windows/ffmpeg-win32-x86_64.tar.gz -C build/windows/

# Build raspbian package
rm -f SHA256SUMS
rm node_modules/ffmpeg-for-homebridge/ffmpeg
cp build/raspbian/ffmpeg node_modules/ffmpeg-for-homebridge/ffmpeg
sha256sum README.md manifest.json package.json *.js LICENSE > SHA256SUMS
find lib -type f -exec sha256sum {} \; >> SHA256SUMS
find node_modules -type f -exec sha256sum {} \; >> SHA256SUMS
find node_modules -type l -exec sha256sum {} \; >> SHA256SUMS
TARFILE=$(npm pack)
tar xzf ${TARFILE}
cp -r node_modules ./package
tar czf "${TARFILE/.tgz/-linux-arm.tgz}" package
rm -rf package
shasum --algorithm 256 "${TARFILE/.tgz/-linux-arm.tgz}" > "${TARFILE/.tgz/-linux-arm.tgz}".sha256sum
rm $TARFILE
rm "${TARFILE}".sha256sum
echo "Created ${TARFILE/.tgz/-linux-arm.tgz}"

# Build Linux package
rm -f SHA256SUMS
rm node_modules/ffmpeg-for-homebridge/ffmpeg
cp build/linux/ffmpeg node_modules/ffmpeg-for-homebridge/ffmpeg
sha256sum README.md manifest.json package.json *.js LICENSE > SHA256SUMS
find lib -type f -exec sha256sum {} \; >> SHA256SUMS
find node_modules -type f -exec sha256sum {} \; >> SHA256SUMS
find node_modules -type l -exec sha256sum {} \; >> SHA256SUMS
TARFILE=$(npm pack)
tar xzf ${TARFILE}
cp -r node_modules ./package
tar czf "${TARFILE/.tgz/-linux-x64.tgz}" package
rm -rf package
shasum --algorithm 256 "${TARFILE/.tgz/-linux-x64.tgz}" > "${TARFILE/.tgz/-linux-x64.tgz}".sha256sum
rm $TARFILE
rm "${TARFILE}".sha256sum
echo "Created ${TARFILE/.tgz/-linux-x64.tgz}"

# Build darwin package
rm -f SHA256SUMS
rm node_modules/ffmpeg-for-homebridge/ffmpeg
cp build/darwin/ffmpeg node_modules/ffmpeg-for-homebridge/ffmpeg
sha256sum README.md manifest.json package.json *.js LICENSE > SHA256SUMS
find lib -type f -exec sha256sum {} \; >> SHA256SUMS
find node_modules -type f -exec sha256sum {} \; >> SHA256SUMS
find node_modules -type l -exec sha256sum {} \; >> SHA256SUMS
TARFILE=$(npm pack)
tar xzf ${TARFILE}
cp -r node_modules ./package
tar czf "${TARFILE/.tgz/-darwin-x64.tgz}" package
rm -rf package
shasum --algorithm 256 "${TARFILE/.tgz/-darwin-x64.tgz}" > "${TARFILE/.tgz/-darwin-x64.tgz}".sha256sum
rm $TARFILE
rm "${TARFILE}".sha256sum
echo "Created ${TARFILE/.tgz/-darwin-x64.tgz}"

# Cleanup
rm -f SHA256SUMS
rm -rf build

