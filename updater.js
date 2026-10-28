(function () {
  const REPO = 'joaomsninvestimentos-cloud/acervo-gestao-homiletica';
  const API = 'https://api.github.com/repos/' + REPO + '/releases/latest';
  const SKIP_KEY = 'acervo_ota_skip';

  function parseVersion(v) {
    return String(v || '')
      .replace(/^v/i, '')
      .split(/[.-]/)
      .map((p) => parseInt(p, 10) || 0);
  }

  function compareVersions(a, b) {
    const aa = parseVersion(a);
    const bb = parseVersion(b);
    const n = Math.max(aa.length, bb.length);
    for (let i = 0; i < n; i++) {
      const d = (aa[i] || 0) - (bb[i] || 0);
      if (d !== 0) return d;
    }
    return 0;
  }

  function banner() {
    return document.getElementById('otaBanner');
  }

  function setBanner(html, kind) {
    const el = banner();
    if (!el) return;
    el.innerHTML = html;
    el.hidden = false;
    el.className = 'ota-banner' + (kind ? ' ota-' + kind : '');
  }

  function hideBanner() {
    const el = banner();
    if (!el) return;
    el.hidden = true;
    el.innerHTML = '';
  }

  async function nativePlugin() {
    try {
      const cap = window.Capacitor;
      if (!cap || typeof cap.getPlatform !== 'function' || cap.getPlatform() !== 'android') return null;
      if (typeof cap.registerPlugin === 'function') return cap.registerPlugin('OtaUpdater');
      return cap.Plugins && cap.Plugins.OtaUpdater ? cap.Plugins.OtaUpdater : null;
    } catch {
      return null;
    }
  }

  async function currentVersion(plugin) {
    if (plugin) {
      const info = await plugin.getVersion();
      return (info.version || '').replace(/-debug.*$/, '');
    }
    return '1.1.0';
  }

  async function latestRelease() {
    const res = await fetch(API, {
      headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'AcervoHomiletico' },
    });
    if (!res.ok) throw new Error('GitHub HTTP ' + res.status);
    const json = await res.json();
    const tag = String(json.tag_name || '').replace(/^v/i, '');
    const assets = json.assets || [];
    const apk = assets.find((a) => /\.apk$/i.test(a.name));
    if (!tag || !apk) throw new Error('Release sem APK');
    return {
      tag,
      url: apk.browser_download_url,
      notes: json.body || '',
      name: apk.name,
    };
  }

  async function install(plugin, url) {
    const perm = await plugin.canInstall();
    if (!perm.allowed) {
      setBanner(
        '<span>Permita instalar apps deste aplicativo e toque em Atualizar de novo.</span>' +
        '<button type="button" class="ota-btn" id="otaPermBtn">Permitir</button>',
        'warn'
      );
      document.getElementById('otaPermBtn')?.addEventListener('click', () => {
        plugin.requestInstallPermission();
      });
      return;
    }
    setBanner('<span>Baixando atualização…</span>', 'info');
    await plugin.downloadAndInstall({ url });
    setBanner('<span>Confirme a instalação no Android.</span>', 'info');
  }

  async function check() {
    const plugin = await nativePlugin();
    if (!plugin) return;
    try {
      const installed = await currentVersion(plugin);
      const latest = await latestRelease();
      if (compareVersions(latest.tag, installed) <= 0) return;
      if (sessionStorage.getItem(SKIP_KEY) === latest.tag) return;

      setBanner(
        '<span>Nova versão <strong>v' + latest.tag + '</strong> disponível.</span>' +
        '<span class="ota-actions">' +
        '<button type="button" class="ota-btn gold" id="otaUpdateBtn">Atualizar</button>' +
        '<button type="button" class="ota-btn" id="otaLaterBtn">Depois</button>' +
        '</span>',
        'update'
      );
      document.getElementById('otaUpdateBtn')?.addEventListener('click', async () => {
        try {
          await install(plugin, latest.url);
        } catch (e) {
          setBanner('<span>Falha ao atualizar: ' + (e.message || e) + '</span>', 'warn');
        }
      });
      document.getElementById('otaLaterBtn')?.addEventListener('click', () => {
        sessionStorage.setItem(SKIP_KEY, latest.tag);
        hideBanner();
      });
    } catch {
      /* silencioso: app continua sem o banner */
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(check, 1200);
  });
})();
