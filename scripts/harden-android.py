#!/usr/bin/env python3
from pathlib import Path
import re
import xml.etree.ElementTree as ET

ROOT = Path("android")
MANIFEST = ROOT / "app" / "src" / "main" / "AndroidManifest.xml"
GRADLE = ROOT / "app" / "build.gradle"
XML_DIR = ROOT / "app" / "src" / "main" / "res" / "xml"
NSC_SRC = Path("android-assets/network_security_config.xml")
NS = "http://schemas.android.com/apk/res/android"
ET.register_namespace("android", NS)


def copy_nsc():
    XML_DIR.mkdir(parents=True, exist_ok=True)
    dest = XML_DIR / "network_security_config.xml"
    dest.write_text(NSC_SRC.read_text())
    print("network security copied")


def patch_manifest():
    raw = MANIFEST.read_text()
    raw = re.sub(
        r'\s*<uses-permission android:name="android.permission.REQUEST_INSTALL_PACKAGES"\s*/>',
        "",
        raw,
    )
    tree = ET.ElementTree(ET.fromstring(raw))
    root = tree.getroot()
    app = root.find("application")
    if app is None:
        raise SystemExit("application tag not found")

    has_internet = any(
        el.get("{%s}name" % NS) == "android.permission.INTERNET"
        for el in root.findall("uses-permission")
    )
    if not has_internet:
        perm = ET.Element("uses-permission")
        perm.set("{%s}name" % NS, "android.permission.INTERNET")
        app_idx = list(root).index(app)
        root.insert(app_idx, perm)

    app.set("{%s}usesCleartextTraffic" % NS, "false")
    app.set("{%s}allowBackup" % NS, "false")
    app.set("{%s}networkSecurityConfig" % NS, "@xml/network_security_config")

    tree.write(MANIFEST, encoding="utf-8", xml_declaration=True)
    text = MANIFEST.read_text()
    if not text.startswith("<?xml"):
        MANIFEST.write_text('<?xml version="1.0" encoding="utf-8"?>\n' + text)
    print("manifest patched")


def patch_gradle():
    if not GRADLE.exists():
        print("gradle missing, skip")
        return
    t = GRADLE.read_text()
    GRADLE.write_text(t)
    print("gradle left as-is")


if __name__ == "__main__":
    copy_nsc()
    patch_manifest()
    patch_gradle()
