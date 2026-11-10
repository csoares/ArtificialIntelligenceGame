// ===================================
// Self-update for unsigned macOS builds.
//
// Squirrel.Mac (what electron-updater uses on macOS) refuses to install updates that are not
// signed with an Apple Developer ID. Our builds are unsigned, so on macOS we do it ourselves:
// download the release .zip, verify its sha512, extract it, then a small detached script waits
// for the app to quit, swaps the .app bundle (rolling back on failure) and relaunches it.
// Windows (NSIS) and Linux (AppImage) keep using electron-updater's own installer.
//
// Kept free of Electron imports so it can be tested with plain Node.
// ===================================

const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { execFile, spawn } = require('child_process');
const { promisify } = require('util');

const execFileAsync = promisify(execFile);

const RELEASE_DOWNLOAD_BASE = 'https://github.com/csoares/ArtificialIntelligenceGame/releases/download';

// Swap script: waits for the app to exit, replaces the bundle with rollback, relaunches.
const SWAP_SCRIPT = `#!/bin/bash
PID="$1"; OLD="$2"; NEW="$3"; WORK="$4"

# Wait (max ~30s) for the running app to quit
for _ in $(seq 1 120); do
  kill -0 "$PID" 2>/dev/null || break
  sleep 0.25
done

BACKUP="$OLD.previous"
rm -rf "$BACKUP"

if ! mv "$OLD" "$BACKUP"; then
  # Could not move the old app out of the way: leave everything as it was
  rm -rf "$WORK"
  [ "$RELAUNCH" != "0" ] && /usr/bin/open "$OLD"
  exit 1
fi

if /usr/bin/ditto "$NEW" "$OLD"; then
  rm -rf "$BACKUP"
else
  # Copy failed: restore the previous version
  rm -rf "$OLD"
  mv "$BACKUP" "$OLD"
fi

/usr/bin/xattr -dr com.apple.quarantine "$OLD" 2>/dev/null
rm -rf "$WORK"
[ "$RELAUNCH" != "0" ] && /usr/bin/open "$OLD"
exit 0
`;

// Pick the .zip for this Mac's architecture from electron-updater's UpdateInfo.files
function pickZip(files, arch = process.arch) {
    const zips = (files || []).filter(file => file.url && file.url.endsWith('.zip'));
    const isArm = url => /arm64/.test(url);
    return zips.find(file => (arch === 'arm64' ? isArm(file.url) : !isArm(file.url))) || null;
}

// /Applications/X.app/Contents/MacOS/X -> /Applications/X.app
function currentAppBundle(execPath = process.execPath) {
    const bundle = path.resolve(execPath, '..', '..', '..');
    return bundle.endsWith('.app') ? bundle : null;
}

// Can we replace the bundle in place? Returns { ok, reason }
function canReplace(bundle) {
    if (!bundle) return { ok: false, reason: 'not-bundle' };
    if (bundle.includes('/AppTranslocation/')) return { ok: false, reason: 'translocated' };
    if (bundle.startsWith('/Volumes/')) return { ok: false, reason: 'dmg' };
    try {
        fs.accessSync(path.dirname(bundle), fs.constants.W_OK);
        fs.accessSync(bundle, fs.constants.W_OK);
    } catch (e) {
        return { ok: false, reason: 'no-permission' };
    }
    return { ok: true };
}

// GitHub downloads sometimes stall halfway. If no data arrives for STALL_TIMEOUT_MS, the
// download is resumed from where it stopped (HTTP Range) instead of waiting forever.
const STALL_TIMEOUT_MS = 20000;
const MAX_ATTEMPTS = 8;

/**
 * Download url to dest, verify its sha512 and report progress.
 * onProgress({ transferred, total, retrying }) is called as data arrives.
 */
async function download(url, dest, expectedSha512, onProgress = () => {}) {
    let hash = crypto.createHash('sha512');
    let received = 0;
    let total = 0;
    fs.writeFileSync(dest, '');

    for (let attempt = 1; ; attempt++) {
        const controller = new AbortController();
        let stallTimer = null;
        const armStallTimer = () => {
            clearTimeout(stallTimer);
            stallTimer = setTimeout(() => controller.abort(new Error('A transferência parou (sem dados).')), STALL_TIMEOUT_MS);
        };

        try {
            armStallTimer();
            const headers = received > 0 ? { Range: `bytes=${received}-` } : {};
            const response = await fetch(url, { redirect: 'follow', headers, signal: controller.signal });
            if (!response.ok) {
                throw new Error(`HTTP ${response.status} ao transferir ${url}`);
            }

            if (received > 0 && response.status !== 206) {
                // The server ignored the Range request: start again from zero
                received = 0;
                hash = crypto.createHash('sha512');
                fs.writeFileSync(dest, '');
            }
            const length = Number(response.headers.get('content-length')) || 0;
            if (length) total = received + length;

            const out = fs.createWriteStream(dest, { flags: 'a' });
            const finished = new Promise((resolve, reject) => {
                out.on('finish', resolve);
                out.on('error', reject);
            });
            const reader = response.body.getReader();
            try {
                for (;;) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    armStallTimer();
                    hash.update(value);
                    received += value.length;
                    if (!out.write(value)) {
                        await new Promise(resolve => out.once('drain', resolve));
                    }
                    onProgress({ transferred: received, total, retrying: false });
                }
            } finally {
                out.end();
                await finished;
            }
            clearTimeout(stallTimer);
            if (total && received < total) {
                throw new Error('A ligação fechou antes do fim da transferência.');
            }
            break;
        } catch (error) {
            clearTimeout(stallTimer);
            if (attempt >= MAX_ATTEMPTS) throw error;
            console.log(`Update download interrupted (${error.message}); resuming at ${received} bytes`);
            onProgress({ transferred: received, total, retrying: true });
            await new Promise(resolve => setTimeout(resolve, Math.min(1000 * attempt, 5000)));
        }
    }

    if (expectedSha512 && hash.digest('base64') !== expectedSha512) {
        throw new Error('O ficheiro transferido está corrompido (sha512 não coincide).');
    }
}

/**
 * Download and extract the update. Returns { dir, newApp } (dir is a temp work folder).
 * info is electron-updater's UpdateInfo ({ version, files: [{ url, sha512 }] }).
 */
async function prepareUpdate(info, { onProgress, arch = process.arch, tmpRoot = os.tmpdir() } = {}) {
    const file = pickZip(info.files, arch);
    if (!file) {
        throw new Error('A release não tem um ficheiro .zip para este Mac.');
    }

    const dir = fs.mkdtempSync(path.join(tmpRoot, 'emotions-update-'));
    try {
        const zipPath = path.join(dir, 'update.zip');
        const url = /^https?:\/\//.test(file.url)
            ? file.url
            : `${RELEASE_DOWNLOAD_BASE}/v${info.version}/${encodeURIComponent(file.url)}`;

        await download(url, zipPath, file.sha512, onProgress);

        const extractDir = path.join(dir, 'extracted');
        await execFileAsync('/usr/bin/ditto', ['-x', '-k', zipPath, extractDir]);
        fs.rmSync(zipPath, { force: true });

        const appName = fs.readdirSync(extractDir).find(name => name.endsWith('.app'));
        if (!appName) {
            throw new Error('O .zip da atualização não contém nenhuma aplicação.');
        }
        return { dir, newApp: path.join(extractDir, appName) };
    } catch (error) {
        fs.rmSync(dir, { recursive: true, force: true });
        throw error;
    }
}

/**
 * Start the detached swap script. The caller must quit the app right after.
 */
function installAndRelaunch({ dir, newApp }, bundle, { pid = process.pid, relaunch = true } = {}) {
    const script = path.join(dir, 'swap.sh');
    fs.writeFileSync(script, SWAP_SCRIPT, { mode: 0o755 });
    const child = spawn('/bin/bash', [script, String(pid), bundle, newApp, dir], {
        detached: true,
        stdio: 'ignore',
        env: { ...process.env, RELAUNCH: relaunch ? '1' : '0' }
    });
    child.unref();
    return child;
}

module.exports = {
    pickZip,
    currentAppBundle,
    canReplace,
    prepareUpdate,
    installAndRelaunch,
    download // exported for tests
};
