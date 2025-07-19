const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname, {
  // [Web-only]: Enables CSS support in Metro.
  isCSSEnabled: true,
});

// Optimize for Android builds
config.resolver.platforms = ['native', 'android', 'ios', 'web'];

// Reduce memory usage during builds
config.maxWorkers = 1;

// Optimize transformer for Android
config.transformer = {
  ...config.transformer,
  minifierConfig: {
    keep_fnames: true,
    mangle: {
      keep_fnames: true,
    },
  },
};

// Configure resolver to avoid conflicts
config.resolver = {
  ...config.resolver,
  sourceExts: ['js', 'jsx', 'json', 'ts', 'tsx', 'cjs', 'mjs'],
  assetExts: ['png', 'jpg', 'jpeg', 'gif', 'wav', 'mp4', 'm4a', 'ttf', 'otf', 'woff', 'woff2'],
  alias: {
    '@': __dirname,
  },
};

// Disable experimental features that can cause Gradle issues
config.experimental = {
  ...config.experimental,
  tsconfigPaths: false,
};

module.exports = config;