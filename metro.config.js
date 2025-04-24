const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname, {
  // [Web-only]: Enables CSS support in Metro.
  isCSSEnabled: true,
});

// Optimize Metro configuration for better performance and stability
config.maxWorkers = 2;
config.transformer.minifierConfig = {
  compress: false,
};

// Increase Node.js memory limit
if (process.env.NODE_OPTIONS) {
  process.env.NODE_OPTIONS = `${process.env.NODE_OPTIONS} --max-old-space-size=4096`;
} else {
  process.env.NODE_OPTIONS = '--max-old-space-size=4096';
}

// Add cacheStores configuration to improve caching
config.cacheStores = [];

// Configure resolver for Expo Go
config.resolver.sourceExts = ['js', 'jsx', 'json', 'ts', 'tsx', 'cjs'];
config.resolver.assetExts = ['png', 'jpg', 'jpeg', 'gif', 'wav', 'mp4', 'm4a'];

module.exports = config;