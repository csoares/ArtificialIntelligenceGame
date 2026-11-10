# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

"Desafio das Emoções + IA" is an educational game made for UFP (Universidade Fernando Pessoa). It detects facial emotions in the browser using face-api.js and mixes them with quiz and code questions about AI and computer vision. It runs two ways: as a web app served by a small Express server, and as an Electron desktop app with auto-updates from GitHub releases. Everything the user sees (UI text, comments, docs, commit history) is in Portuguese (pt-PT). Keep new UI strings in Portuguese.

## Commands

```bash
npm install
npm start              # Express server on http://localhost:3000 (serves the game + CSV API)
npm run dev            # same, with nodemon auto-reload
npm run electron       # Electron in production mode (loads index.html from disk)
npm run electron-dev   # ELECTRON_IS_DEV=1: loads http://localhost:3000, so `npm start` must be running; opens DevTools
npm run build          # electron-builder for the current platform → dist-electron/
npm run build-all      # mac + win + linux
npm run publish        # build and publish to GitHub releases
```

There are no tests, no linter and no bundler. The frontend is plain browser JS loaded with `<script>` tags.

**Releases:** every push to `main` (except changes that only touch `*.md`) runs `.github/workflows/release.yml`.
- The `version` job sets the next version to the latest `v*` tag plus one patch, or to `package.json`'s `version` if that is higher. Bump `package.json` to make a minor or major release. The job then pushes the tag.
- The matrix job stamps that version with `npm version --no-git-tag-version` and runs `npm run publish` on macOS, Windows and Ubuntu.
- Work on branches: every merge to `main` ships to every installed app.
- `package-lock.json` is gitignored, so CI uses `npm install`, not `npm ci`.

**Auto-update** lives in `electron/main.js` (production only):
- The app checks on start and every 4 h (`UPDATE_CHECK_INTERVAL_MS`). The user is asked before anything downloads, but only while no game is running (checked with `executeJavaScript` on `gameState.isPlaying`). After the download the app restarts into the new version.
- Windows and Linux use electron-updater's own installer.
- While an update downloads (any platform), `reportUpdateProgress()` in `main.js` sends `update-progress` to the renderer, and `showUpdateProgress()` in `app.js` shows a banner (`#update-banner`) with the percentage and MB. The same function drives the Dock/taskbar progress bar.
- macOS builds are unsigned (`identity: null`), and Squirrel.Mac refuses unsigned updates. So on macOS, `electron/mac-updater.js` handles it:
  - It downloads the release `.zip` that matches the CPU architecture (both arm64 and x64 are built), verifies the sha512 from `latest-mac.yml` and extracts it with `ditto`. GitHub release downloads are slow per connection (~0.3 MB/s measured) and sometimes stall, so the file is fetched as `PARALLEL_PARTS` byte ranges at once (about 8× faster), and a part that gets no data for `STALL_TIMEOUT_MS` resumes where it stopped (up to `MAX_ATTEMPTS`). Servers without Range support fall back to a single stream. The sha512 is checked on the finished file.
  - A detached bash script waits for the app to quit, swaps the `.app` bundle (and restores the old one if the copy fails), strips quarantine and relaunches.
  - If the app can't overwrite itself (running from a DMG, translocated, or no write permission), it opens the releases page instead.
  - The module has no Electron imports, so it can be tested with plain Node.

## Architecture

**Frontend (`index.html` + `config.js` + `app.js` + `style.css`)**: a single page made of `.screen` divs (registration, kiosk-start, loading, game, results) that `showScreen(id)` switches between. All game logic lives in `app.js` with one global `gameState` object (v2, "Desafio das Emoções 2.0"):
- `GAME_PLAN` is the ordered list of round types (`ROUND_TYPES`: emotion, sequence, lie_detector, trick, quiz). `createGamePlan()` fills in a random question from `QUIZ_QUESTIONS` for each quiz round (the last quiz round always gets a `code: true` question) and a random entry from `TRICK_CHALLENGES` for each trick round. To change the game length, edit `GAME_PLAN`; the round count and `MAX_POINTS` (100 per round) are derived from it.
- Round lifecycle: `nextRound()` → `showRoundIntro(type)` (a card from `ROUND_INTROS` with a 3-2-1 countdown; reading time is longer the first time a type appears) → `startRoundOfType()` → exactly one `endRound({...})`, which is guarded by `gameState.round.ended`. `endRound` stops the detection loop, the timer and the round timeouts (`gameState.roundTimers`), records the result and schedules the next round. Every round must end through `endRound`, and every round-scoped timeout should go into `roundTimers`. Timings live in `DURATION`, `INTRO_*` and `ROUND_RESULT_MS`.
- `startDetectionLoop(onFrame)` is the single face-api loop (TinyFaceDetector + FaceLandmark68 + FaceExpression). It uses chained `setTimeout`s, not `setInterval`, so detections never overlap. A token cancels stale ticks, and the last detection is kept briefly so the overlay doesn't flicker. It draws the face marker, updates the live emotion bars and calls `onFrame(expressions, fresh)`. Rounds return `{state, progress}` to colour the marker. `createHoldTracker` implements "hold emotion X for N ms".
- "Detetor de mentiras" runs on a full-screen dark overlay (`#lie-stage`, switched between its `intro`/`play`/`end` panels by `data-panel`). The camera and emotion bars are hidden, but the video keeps playing underneath so detection still works.
  - The round starts with an explanation and an "Estou pronto" button (it auto-starts after `LIE_INTRO_AUTOSTART_MS`), then a 3-2-1.
  - During the 3-2-1, the detector measures the player's **resting face** (the baseline). Don't go back to `1 - neutral`: resting faces are often read as 30–60 % sad or angry, so it fired with no reaction at all.
  - `LIE_QUESTIONS` are provocative statements the AI "accuses" the player of (not questions: nobody answers out loud). Each is shown for up to `LIE_QUESTION_MS` while the player just reads it and tries not to react. After `LIE_GRACE_MS` of reading time, a reaction is the weighted rise of any expression above the baseline (`LIE_REACTION_WEIGHTS`, using smoothed expressions). Smiles and surprise count fully; sad, angry and disgusted count less.
  - The happy and surprised baselines are capped (`LIE_BASELINE_CAP`), so smiling during the 3-2-1 doesn't hide later smiles.
  - If the reaction stays above `LIE_REACTION_THRESHOLD` for `LIE_REACTION_HOLD_MS`, "🚨 APANHADO!" shows and stays up for `LIE_CAUGHT_HOLD_MS` so people can watch the reaction.
  - The red alarm is a `::before` layer. Animating `.lie-stage` itself would restart its fade-in.
  - The questions in `LIE_QUESTIONS` are written for 15–17 year-olds but must stay appropriate for a school event. The last lie-detector round in the plan (`reveal: true`) ends with `LIE_REVEAL`, which explains that the AI can't really detect lies (AI Act). That reveal is the educational point of the round, so keep it. "Engana a IA" rules work on trust: the AI only checks the target emotion.
- Sound effects are synthesized with Web Audio (`sfx`), so there are no audio files. The AudioContext is unlocked on the start click.
- Daily ranking: this is opt-in. Only initials (max 3 letters) and points are stored, in `localStorage` under a key per local date (`desafio-ranking-YYYY-MM-DD`). The ranking is per machine and resets each day.
- Gesture rounds use the **MediaPipe Gesture Recognizer**. It is WebAssembly, so it doesn't clash with face-api's TensorFlow.js.
  - The files are vendored in `models/mediapipe/` (see its `README.txt`; it holds only the SIMD wasm build) and are loaded with `loadGestureRecognizer()` during `initializeGame`. GPU is tried first, then CPU.
  - If loading fails, `createGamePlan()` turns gesture rounds into emotion rounds, so the game never breaks.
  - `startGestureLoop(onFrame)` shares the detection token with `startDetectionLoop`, so `stopDetectionLoop()` stops either one.
  - `GESTURES` keys are MediaPipe category names. The exception is `Heart` (🫶 with two hands), which `isHeart()` detects from the 21 landmarks per hand.
  - The first gesture round always includes 👍 and the second includes 🫶.
- No repeats in one game: `createGamePlan()` gives gesture rounds distinct gestures and emotion rounds distinct targets that also differ from the "Engana a IA" targets. The sequence round uses each emotion at most once.
- Handpose/TensorFlow (`lib/handpose.min.js`, `lib/tensorflow.min.js`) is in the repo but unused because it conflicts with face-api.js.

**Kiosk mode** is controlled only by `APP_CONFIG.kioskMode` in `config.js`. When it's on, registration is skipped (the player becomes "Visitante"), the camera stays active, and "Jogar Novamente" goes straight back to the game. (The `config.kioskMode` field in `package.json` and the `APP_CONFIG` env var mentioned in `electron/README.md` aren't read by any code.)

**Web vs. Electron branching**: the renderer checks `window.electronAPI`, which is exposed by `electron/preload.js` through `contextBridge`:
- Model loading: the browser uses `./models`, while Electron uses the custom `app-resource://models` protocol. In `electron/main.js`, that protocol is registered as privileged *before* `app.ready` and maps to `process.resourcesPath` in production (models ship as `extraResources`) or to the repo root in dev. The handler sets `Access-Control-Allow-Origin` and exact MIME types for `.mjs` and `.wasm`, because MediaPipe is loaded with `import()` and a `<script>` from a `file://` page. It also refuses paths that would escape the resources folder.
- Results: in the browser, `saveResultToBackend()` POSTs to the hardcoded `http://localhost:3000/api/save-result`, which appends to `resultados_emocoes.csv` (gitignored). The score is converted to the old 0–5 scale so the CSV format stays the same. Export opens `/api/download-results`. In Electron there is no server, so the backend save is skipped. `exportCSV()` (also triggered from the menu with Ctrl+E) builds the CSV in the renderer and saves it with the `export-csv` IPC handler, which shows a native save dialog.

**Backend (`server.js`)**: Express on port 3000. It serves the repo root statically and has three endpoints: `POST /api/save-result`, `GET /api/download-results` and `GET /api/results-count`.

**Electron (`electron/main.js`)**: `contextIsolation: true` and no node integration, so new renderer↔main features need an `ipcMain.handle` in `main.js` *and* a matching entry in `preload.js`. electron-updater is only loaded when not in dev. `electron/main-original.js` is an old copy that isn't used.

## Packaging gotchas

- electron-builder uses the `build` key in `package.json` (the build log prints `loaded configuration file=package.json`). `electron-builder.yml` is stale and ignored, so don't edit it expecting an effect.
- Any new top-level file the renderer loads must be added to the `files` list, or it will be missing from packaged builds (e.g. `assets/qr-informatica.svg`, the QR code for the course page shown on the kiosk and results screens, generated with the `qrcode` npm package). Links with `target="_blank"` open in the system browser through `setWindowOpenHandler`.
- macOS builds have no Developer ID (`identity: null`). The `afterPack` hook `build/adhoc-sign.js` re-signs the `.app` ad-hoc. Without it, packaging breaks Electron's original signature and macOS calls the downloaded app "damaged". The `zip` targets (arm64 + x64) are what the mac self-updater downloads. Camera permission text lives in `mac.extendInfo`.
- Layout: the CSS is designed for a 1280×720 window and must fit it (and 1366×768) without scrolling or text leaving the screen. Big type uses `clamp()` with `vh` as well as `vw`, and there is a `max-height: 760px` compact block in `style.css`. In Electron, `electron/preload.js` (`fitToWindow`) sets the page zoom (`webFrame.setZoomFactor`) so the page always has ~1280×720 CSS px, which scales the game up on 1080p/4K monitors. Don't switch to CSS `zoom`: it also scales `vh` units and breaks the layout. The browser version doesn't auto-zoom. The game card fills the window height (`#game-screen.active` is a flex column) and quiz answers share one row height (`grid-auto-rows: 1fr`).
- App icons live in `build/`, the electron-builder resources folder: `icon.icns` (macOS), `icon.ico` (Windows) and `icon.png` (Linux). They are rendered from `build/icon.svg`. The web favicon is `assets/favicon.png`.
- To check a mac build locally: `npx electron-builder --mac zip --arm64 --publish never`, then `codesign --verify --deep --strict` on the `.app`.
