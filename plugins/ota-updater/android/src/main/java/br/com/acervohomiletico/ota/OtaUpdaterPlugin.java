package br.com.acervohomiletico.ota;

import android.content.Context;
import android.content.pm.PackageInfo;
import android.os.Build;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

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
            call.reject("Versao instalada desconhecida");
        }
    }
}
