const { registerPlugin } = require('@capacitor/core');

const OtaUpdater = registerPlugin('OtaUpdater', {
  web: {
    getVersion: async () => ({ version: 'web', versionCode: 0 }),
    canInstall: async () => ({ allowed: false }),
    requestInstallPermission: async () => ({}),
    downloadAndInstall: async () => {
      throw new Error('Atualização nativa só no Android');
    },
  },
});

module.exports = { OtaUpdater };
