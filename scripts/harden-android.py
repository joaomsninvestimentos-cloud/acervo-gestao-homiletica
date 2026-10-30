#!/usr/bin/env python3
from pathlib import Path
import re

ROOT = Path("android")
MANIFEST = ROOT / "app" / "src" / "main" / "AndroidManifest.xml"
GRADLE = ROOT / "app" / "build.gradle"
XML_DIR = ROOT / "app" / "src" / "main" / "res" / "xml"
NSC_SRC = Path("android-assets/network_security_config.xml")


def patch_manifest():
    t = MANIFEST.read_text()
    t = re.sub(
        r'\s*<uses-permission android:name="android.permission.REQUEST_INSTALL_PACKAGES"\s*/>',
        "",
        t,
    )
    if "android.permission.INTERNET" not in t:
        t = t.replace(
            "<manifest",
            '<manifest xmlns:android="http://schemas.android.com/apk/res/android"',
            1,
        )
        t = t.replace(
            "<application",
            '    <uses-permission android:name="android.permission.INTERNET" />\n    <application',
            1,
        )
    t = t.replace('android:usesCleartextTraffic="true"', 'android:usesCleartextTraffic="false"')
    if "networkSecurityConfig" not in t:
        t = t.replace(
            "<application",
            '<application android:networkSecurityConfig="@xml/network_security_config" android:allowBackup="false"',
            1,
        )
    elif "allowBackup" not in t:
        t = t.replace("<application", '<application android:allowBackup="false"', 1)
    MANIFEST.write_text(t)
    print("manifest patched")


def patch_gradle():
    t = GRADLE.read_text()
    t = t.replace('android:usesCleartextTraffic="true"', 'android:usesCleartextTraffic="false"')
    GRADLE.write_text(t)
    print("gradle patched")


def copy_nsc():
    XML_DIR.mkdir(parents=True, exist_ok=True)
    dest = XML_DIR / "network_security_config.xml"
    dest.write_text(NSC_SRC.read_text())
    print("network security copied")


if __name__ == "__main__":
    copy_nsc()
    patch_manifest()
    patch_gradle()
