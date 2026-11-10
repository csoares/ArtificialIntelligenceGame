// electron-builder afterPack hook (macOS only).
//
// The app is not signed with an Apple Developer ID (mac.identity = null). Without any signature,
// electron-builder leaves Electron's original signature in place, which packaging has invalidated,
// so macOS reports a downloaded app as "damaged". Re-signing ad-hoc ("-") gives a valid
// signature: users then get the normal "unidentified developer" prompt with "Open Anyway".
const { execFileSync } = require('child_process');
const path = require('path');

exports.default = async function adhocSign(context) {
    if (context.electronPlatformName !== 'darwin') return;

    const appPath = path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.app`);
    console.log(`  • ad-hoc signing ${appPath}`);
    execFileSync('codesign', ['--force', '--deep', '--sign', '-', appPath], { stdio: 'inherit' });
    execFileSync('codesign', ['--verify', '--deep', '--strict', appPath], { stdio: 'inherit' });
};
