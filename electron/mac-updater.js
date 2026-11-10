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

// GitHub release downloads can be slow per connection (~0.3 MB/s seen) and sometimes stall.
// So the file is split into PARALLEL_PARTS byte ranges downloaded at the same time (about
// PARALLEL_PARTS times faster), and any part that gets no data for STALL_TIMEOUT_MS resumes
// from where it stopped. Servers without Range support fall back to a single stream.
const PARALLEL_PARTS = 8;
const MIN_PARALLEL_SIZE = 4 * 1024 * 1024;
const STALL_TIMEOUT_MS = 20000;
const MAX_ATTEMPTS = 8;

class NoRangeSupport extends Error {}

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

// fetch with an abort that fires when no data arrives for STALL_TIMEOUT_MS.
// onChunk(Uint8Array) is awaited for every chunk (it may write to disk).
async function fetchWithStallGuard(url, headers, onResponse, onChunk) {
    const controller = new AbortController();
    let stallTimer = null;
    const arm = () => {
        clearTimeout(stallTimer);
        stallTimer = setTimeout(() => controller.abort(new Error('A transferência parou (sem dados).')), STALL_TIMEOUT_MS);
    };
    try {
        arm();
        const response = await fetch(url, { redirect: 'follow', headers, signal: controller.signal });
        if (!response.ok) {
            throw new Error(`HTTP ${response.status} ao transferir ${url}`);
        }
        onResponse(response);
        const reader = response.body.getReader();
        for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            arm();
            await onChunk(value);
        }
    } finally {
        clearTimeout(stallTimer);
    }
}

// Total size if the server supports Range requests, otherwise null
async function probeRangeSupport(url) {
    let total = null;
    try {
        await fetchWithStallGuard(url, { Range: 'bytes=0-0' }, response => {
            const match = /\/(\d+)$/.exec(response.headers.get('content-range') || '');
            if (response.status === 206 && match) total = Number(match[1]);
        }, async () => {});
    } catch (e) {
        return null;
    }
    return total;
}

// Download bytes [start, end] into the open file at the same offset, resuming after stalls
async function downloadPart(url, file, start, end, onBytes, onRetry) {
    let position = start;
    for (let attempt = 1; ; attempt++) {
        try {
            await fetchWithStallGuard(url, { Range: `bytes=${position}-${end}` }, response => {
                if (response.status !== 206) throw new NoRangeSupport('O servidor não aceita transferências por partes.');
            }, async chunk => {
                const bytes = Math.min(chunk.length, end + 1 - position);
                if (bytes <= 0) return;
                await file.write(chunk, 0, bytes, position);
                position += bytes;
                onBytes(bytes);
            });
            if (position <= end) throw new Error('A ligação fechou antes do fim da transferência.');
            return;
        } catch (error) {
            if (error instanceof NoRangeSupport || attempt >= MAX_ATTEMPTS) throw error;
            console.log(`Update part ${start}-${end} interrupted (${error.message}); resuming at ${position}`);
            onRetry(true);
            await wait(Math.min(1000 * attempt, 5000));
            onRetry(false);
        }
    }
}

async function sha512OfFile(filePath) {
    const hash = crypto.createHash('sha512');
    for await (const chunk of fs.createReadStream(filePath)) hash.update(chunk);
    return hash.digest('base64');
}

async function downloadParallel(url, dest, total, onProgress) {
    const partSize = Math.ceil(total / PARALLEL_PARTS);
    let received = 0;
    let retrying = 0;
    const report = () => onProgress({ transferred: received, total, retrying: retrying > 0 });

    const file = await fs.promises.open(dest, 'w');
    try {
        await file.truncate(total);
        const parts = [];
        for (let start = 0; start < total; start += partSize) {
            const end = Math.min(total, start + partSize) - 1;
            parts.push(downloadPart(url, file, start, end,
                bytes => { received += bytes; report(); },
                isRetrying => { retrying += isRetrying ? 1 : -1; report(); }));
        }
        await Promise.all(parts);
    } finally {
        await file.close();
    }
}

// Single stream with resume (used when the server doesn't support Range requests)
async function downloadSingle(url, dest, onProgress) {
    let received = 0;
    let total = 0;
    fs.writeFileSync(dest, '');
    for (let attempt = 1; ; attempt++) {
        const out = fs.createWriteStream(dest, { flags: 'a' });
        const finished = new Promise((resolve, reject) => {
            out.on('finish', resolve);
            out.on('error', reject);
        });
        try {
            await fetchWithStallGuard(url, received > 0 ? { Range: `bytes=${received}-` } : {}, response => {
                if (received > 0 && response.status !== 206) {
                    received = 0; // Range ignored: start again from zero
                    fs.truncateSync(dest, 0);
                }
                const length = Number(response.headers.get('content-length')) || 0;
                if (length) total = received + length;
            }, async chunk => {
                received += chunk.length;
                if (!out.write(chunk)) await new Promise(resolve => out.once('drain', resolve));
                onProgress({ transferred: received, total, retrying: false });
            });
            out.end();
            await finished;
            if (total && received < total) throw new Error('A ligação fechou antes do fim da transferência.');
            return;
        } catch (error) {
            out.end();
            await finished.catch(() => {});
            if (attempt >= MAX_ATTEMPTS) throw error;
            console.log(`Update download interrupted (${error.message}); resuming at ${received} bytes`);
            onProgress({ transferred: received, total, retrying: true });
            await wait(Math.min(1000 * attempt, 5000));
        }
    }
}

/**
 * Download url to dest, verify its sha512 and report progress.
 * onProgress({ transferred, total, retrying }) is called as data arrives.
 */
async function download(url, dest, expectedSha512, onProgress = () => {}) {
    const total = await probeRangeSupport(url);
    if (total && total >= MIN_PARALLEL_SIZE) {
        try {
            await downloadParallel(url, dest, total, onProgress);
        } catch (error) {
            if (!(error instanceof NoRangeSupport)) throw error;
            await downloadSingle(url, dest, onProgress);
        }
    } else {
        await downloadSingle(url, dest, onProgress);
    }

    if (expectedSha512 && (await sha512OfFile(dest)) !== expectedSha512) {
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
