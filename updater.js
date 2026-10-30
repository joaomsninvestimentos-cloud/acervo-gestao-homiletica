(function () {
  const REPO = 'joaomsninvestimentos-cloud/acervo-gestao-homiletica';
  const API = 'https://api.github.com/repos/' + REPO + '/releases/latest';
  const PAGES_BASE = 'https://joaomsninvestimentos-cloud.github.io/acervo-gestao-homiletica/';
  const VERCEL_BASE = 'https://acervo-gestao-homiletica.vercel.app/';
  const DOWNLOAD_PAGE = PAGES_BASE + 'download.html';
  const CHANNELS = [
    { base: PAGES_BASE, version: PAGES_BASE + 'version.json' },
    { base: VERCEL_BASE, version: VERCEL_BASE + 'version.json' }
  ];
  const SKIP_KEY = 'acervo_ota_skip';
  const APP_VERSION = '1.3.1';

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
    if (plugin && typeof plugin.getVersion === 'function') {
      try {
        const info = await plugin.getVersion();
        return (info.version || '').replace(/-debug.*$/, '');
      } catch {
        return APP_VERSION;
      }
    }
    return APP_VERSION;
  }

  async function latestFromChannel(channel) {
    const res = await fetch(channel.version, { cache: 'no-store' });
    if (!res.ok) return null;
    const json = await res.json();
    const tag = String(json.version || '').replace(/^v/i, '');
    if (!tag || !json.apk) return null;
    const url = String(json.apk).indexOf('http') === 0 ? json.apk : channel.base + json.apk;
    return { tag, url, notes: json.notes || '', name: 'AcervoHomiletico.apk', size: json.size || 0 };
  }

  async function latestFromPages() {
    for (let i = 0; i < CHANNELS.length; i++) {
      try {
        const hit = await latestFromChannel(CHANNELS[i]);
        if (hit) return hit;
      } catch {
        /* tenta o proximo canal */
      }
    }
    return null;
  }

  async function latestFromGithub() {
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
      size: apk.size || 0,
    };
  }

  async function latestRelease() {
    try {
      const pages = await latestFromPages();
      if (pages) return pages;
    } catch {
      /* Pages ainda nao publicado: usa Releases */
    }
    return latestFromGithub();
  }

  function openDownloadPage() {
    const cap = window.Capacitor;
    if (cap && cap.Plugins && cap.Plugins.Browser && typeof cap.Plugins.Browser.open === 'function') {
      cap.Plugins.Browser.open({ url: DOWNLOAD_PAGE });
      return;
    }
    window.open(DOWNLOAD_PAGE, '_blank');
  }

  async function check() {
    try {
      const plugin = await nativePlugin();
      const installed = await currentVersion(plugin);
      const latest = await latestRelease();
      if (compareVersions(latest.tag, installed) <= 0) return;
      if (sessionStorage.getItem(SKIP_KEY) === latest.tag) return;

      setBanner(
        '<span>Nova versao <strong>v' + latest.tag + '</strong> disponivel.</span>' +
        '<span class="ota-actions">' +
        '<button type="button" class="ota-btn gold" id="otaUpdateBtn">Baixar atualizacao</button>' +
        '<button type="button" class="ota-btn" id="otaLaterBtn">Depois</button>' +
        '</span>',
        'update'
      );
      document.getElementById('otaUpdateBtn')?.addEventListener('click', openDownloadPage);
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
