# Digital Fitting Room (Webcam MVP)

A local React + TypeScript demo that uses a laptop webcam and MediaPipe Pose Landmarker to overlay virtual dresses on a user in real time.

## Prerequisites

- Node.js 18+ (Node 20 recommended)
- npm 9+
- Webcam-enabled laptop/browser (Chrome recommended)

## Install and run

```bash
npm install
npm run dev
```

Open the local URL from Vite (usually `http://localhost:5173`).

## How it works

- Requests webcam access and renders the live mirrored stream to a canvas.
- Runs MediaPipe Pose Landmarker in `VIDEO` mode per animation frame.
- Extracts shoulder/hip landmarks and computes:
  - shoulder midpoint
  - hip midpoint
  - shoulder width
  - torso angle
- Uses these values to position/rotate/scale the selected dress PNG.
- Applies EMA smoothing (`alpha = 0.28`) on center, rotation, and scale.
- Supports debug mode to draw landmark points plus shoulder/torso guide lines.
- Includes a basic fit suggestion (`S/M/L`) with confidence from landmark visibility and centering.

## Auto-start / idle reset

- Person detected = pose landmarks available.
- If no person is detected for 5 seconds, the app returns to idle message state.

## Project structure

- `src/components/CameraView.tsx` – webcam setup, frame loop, status UI.
- `src/components/PoseTracker.ts` – MediaPipe model setup + frame detection.
- `src/components/DressRenderer.ts` – canvas compositing, transform math, smoothing, debug drawing.
- `src/components/DressCatalog.tsx` – dress picker, size selector, debug toggle.
- `src/components/FitAdvisor.ts` – demo-only size recommendation logic.
- `public/assets/dresses/` – dress config JSON (PNGs are auto-generated during `postinstall`).

## Adding a new dress

1. Add a transparent PNG to `public/assets/dresses/` **or** extend `scripts/generate-dress-assets.mjs` so it generates your PNG automatically.
2. Add an item to `public/assets/dresses/config.json` with:
   - `id`, `name`, `filePath`
   - `scaleFactor`, `yOffsetFactor`
   - `anchors` (`leftShoulder`, `rightShoulder`, `leftHip`, `rightHip`)
   - optional `torsoLengthRatio`, `minScale`, `maxScale`
3. Mirror the same object in `src/lib/dresses.ts` (runtime source used by the app).

## Notes on MediaPipe assets

- WASM runtime files are copied automatically from `@mediapipe/tasks-vision` into `public/wasm` during `postinstall` via `scripts/copy-mediapipe-assets.mjs`.
- Dress PNG assets are generated in `public/assets/dresses` during `postinstall` via `scripts/generate-dress-assets.mjs` to keep source control text-only.
- Place `pose_landmarker_lite.task` at `public/models/pose_landmarker_lite.task`.


## Camera troubleshooting

If the camera does not open:

- Use `http://localhost:5173` (or HTTPS). Browser camera APIs are blocked on insecure origins.
- Click the camera icon in the browser address bar and set camera permission to **Allow**.
- Close other apps that may lock the webcam (Zoom/Meet/Teams/OBS).
- Ensure the model file exists at `public/models/pose_landmarker_lite.task`.
- If you see `Unable to open zip archive`, your model file is invalid/corrupted (often an HTML file saved as `.task`). Re-download and replace it with the real binary model file.
- If the error banner contains a long stack trace, verify the model URL in browser: `http://localhost:5173/models/pose_landmarker_lite.task` should download binary data, not an HTML page.
- Use the **Retry camera** button shown in the app error banner after fixing permissions.
- Use **Retry pose** to reinitialize the pose model without restarting camera.

## Known limitations

- This is a 2D overlay demo, not a physically accurate cloth simulation.
- No depth camera is used; occlusion and layering are approximate.
- Size output is an estimate only for demo UX (not true body measurement).
- Lighting, loose clothing, and partial body visibility can reduce confidence.
