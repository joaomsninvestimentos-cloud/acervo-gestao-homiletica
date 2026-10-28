package br.com.acervohomiletico.ota;

import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageInfo;
import android.content.pm.PackageInstaller;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;

import androidx.core.content.FileProvider;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileInputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;

@CapacitorPlugin(name = "OtaUpdater")
public class OtaUpdaterPlugin extends Plugin {

    @PluginMethod
    public void getVersion(PluginCall call) {
        Context ctx = getContext();
        JSObject ret = new JSObject();
        try {
            PackageInfo info = ctx.getPackageManager().getPackageInfo(ctx.getPackageName(), 0);
            String name = info.versionName != null ? info.versionName : "0";
            int code = Build.VERSION.SDK_INT >= Build.VERSION_CODES.P
                ? (int) info.getLongVersionCode()
                : info.versionCode;
            ret.put("version", name);
            ret.put("versionCode", code);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Versão instalada desconhecida");
        }
    }

    @PluginMethod
    public void canInstall(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("allowed", canInstallPackages());
        call.resolve(ret);
    }

    @PluginMethod
    public void requestInstallPermission(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            Intent intent = new Intent(
                Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                Uri.parse("package:" + getContext().getPackageName())
            );
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
        }
        call.resolve();
    }

    @PluginMethod
    public void downloadAndInstall(PluginCall call) {
        String url = call.getString("url");
        if (url == null || url.isEmpty()) {
            call.reject("URL do APK ausente");
            return;
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && !canInstallPackages()) {
            requestInstallPermission(call);
            return;
        }

        new Thread(() -> {
            try {
                File apk = downloadApk(url);
                boolean ok = installApk(apk);
                if (!ok) {
                    call.reject("Não foi possível iniciar a instalação");
                    return;
                }
                JSObject ret = new JSObject();
                ret.put("ok", true);
                call.resolve(ret);
            } catch (Exception e) {
                call.reject(e.getMessage() != null ? e.getMessage() : "Falha no download");
            }
        }).start();
    }

    private boolean canInstallPackages() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            return getContext().getPackageManager().canRequestPackageInstalls();
        }
        return true;
    }

    private File downloadApk(String startUrl) throws Exception {
        File file = new File(getContext().getCacheDir(), "acervo-update.apk");
        if (file.exists() && !file.delete()) {
            throw new Exception("Não foi possível limpar o APK anterior");
        }
        HttpURLConnection conn = openFollowing(startUrl);
        int code = conn.getResponseCode();
        if (code < 200 || code > 299) {
            throw new Exception("Download HTTP " + code);
        }
        try (InputStream in = conn.getInputStream();
             OutputStream out = new java.io.FileOutputStream(file)) {
            byte[] buf = new byte[8192];
            int n;
            while ((n = in.read(buf)) >= 0) {
                out.write(buf, 0, n);
            }
        } finally {
            conn.disconnect();
        }
        if (file.length() == 0L) {
            throw new Exception("Arquivo de atualização vazio");
        }
        return file;
    }

    private HttpURLConnection openFollowing(String startUrl) throws Exception {
        String current = startUrl;
        for (int i = 0; i < 6; i++) {
            HttpURLConnection conn = (HttpURLConnection) new URL(current).openConnection();
            conn.setInstanceFollowRedirects(false);
            conn.setRequestMethod("GET");
            conn.setRequestProperty("User-Agent", "AcervoHomiletico-Android");
            conn.setRequestProperty("Accept", "*/*");
            conn.setConnectTimeout(20000);
            conn.setReadTimeout(60000);
            int code = conn.getResponseCode();
            if (code == 301 || code == 302 || code == 303 || code == 307 || code == 308) {
                String loc = conn.getHeaderField("Location");
                conn.disconnect();
                if (loc == null || loc.isEmpty()) {
                    throw new Exception("Redirect sem Location");
                }
                current = loc;
                continue;
            }
            return conn;
        }
        throw new Exception("Muitos redirecionamentos no download");
    }

    private boolean installApk(File file) {
        try {
            installViaSession(file);
            return true;
        } catch (Exception ignored) {
            return installViaIntent(file);
        }
    }

    private void installViaSession(File file) throws Exception {
        Context ctx = getContext();
        PackageInstaller installer = ctx.getPackageManager().getPackageInstaller();
        PackageInstaller.SessionParams params =
            new PackageInstaller.SessionParams(PackageInstaller.SessionParams.MODE_FULL_INSTALL);
        params.setAppPackageName(ctx.getPackageName());
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            params.setRequireUserAction(PackageInstaller.SessionParams.USER_ACTION_REQUIRED);
        }
        int sessionId = installer.createSession(params);
        try (PackageInstaller.Session session = installer.openSession(sessionId);
             FileInputStream in = new FileInputStream(file);
             OutputStream out = session.openWrite("acervo.apk", 0, file.length())) {
            byte[] buf = new byte[8192];
            int n;
            while ((n = in.read(buf)) >= 0) {
                out.write(buf, 0, n);
            }
            session.fsync(out);
            session.commit(InstallResultReceiver.pendingIntent(ctx, sessionId).getIntentSender());
        }
    }

    private boolean installViaIntent(File file) {
        try {
            Context ctx = getContext();
            Uri uri = FileProvider.getUriForFile(
                ctx, ctx.getPackageName() + ".fileprovider", file
            );
            Intent intent = new Intent(Intent.ACTION_VIEW);
            intent.setDataAndType(uri, "application/vnd.android.package-archive");
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            intent.putExtra(Intent.EXTRA_NOT_UNKNOWN_SOURCE, true);
            intent.putExtra(Intent.EXTRA_RETURN_RESULT, true);
            String[] installers = new String[] {
                "com.google.android.packageinstaller",
                "com.android.packageinstaller",
                "com.miui.packageinstaller",
                "com.miui.global.packageinstaller"
            };
            for (String pkg : installers) {
                try {
                    ctx.grantUriPermission(pkg, uri, Intent.FLAG_GRANT_READ_URI_PERMISSION);
                } catch (Exception ignored) {
                }
            }
            ctx.startActivity(intent);
            return true;
        } catch (Exception e) {
            return false;
        }
    }
}
