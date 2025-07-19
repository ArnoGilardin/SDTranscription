const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname, {
  // [Web-only]: Enables CSS support in Metro.
  isCSSEnabled: true,
});

// Optimize for Android builds - reduce memory usage
config.maxWorkers = 1;

// Simplify resolver to avoid conflicts
config.resolver = {
  ...config.resolver,
  sourceExts: ['js', 'jsx', 'json', 'ts', 'tsx'],
  assetExts: ['png', 'jpg', 'jpeg', 'gif', 'wav', 'mp4', 'm4a', 'ttf', 'otf'],
  platforms: ['native', 'android', 'ios', 'web'],
  alias: {
    '@': __dirname,
  },
};

// Optimize transformer for better Android compatibility
config.transformer = {
  ...config.transformer,
  minifierConfig: {
    keep_fnames: true,
    mangle: {
      keep_fnames: true,
    },
  },
};

// Disable experimental features that cause Gradle issues
config.experimental = {
  ...config.experimental,
  tsconfigPaths: false,
};

module.exports = config;