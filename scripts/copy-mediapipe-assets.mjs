import { cpSync, existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(process.cwd());
const sourceWasmDir = resolve(root, 'node_modules/@mediapipe/tasks-vision/wasm');
const targetWasmDir = resolve(root, 'public/wasm');

if (!existsSync(sourceWasmDir)) {
  console.warn('MediaPipe wasm directory not found yet, skipping copy.');
  process.exit(0);
}

mkdirSync(targetWasmDir, { recursive: true });
cpSync(sourceWasmDir, targetWasmDir, { recursive: true });
console.log('Copied MediaPipe wasm assets to public/wasm');
