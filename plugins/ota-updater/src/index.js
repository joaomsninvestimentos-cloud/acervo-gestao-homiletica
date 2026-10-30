const { registerPlugin } = require('@capacitor/core');

const OtaUpdater = registerPlugin('OtaUpdater', {
  web: {
    getVersion: async () => ({ version: 'web', versionCode: 0 }),
  },
});

module.exports = { OtaUpdater };
