import {
  FilesetResolver,
  PoseLandmarker,
  type NormalizedLandmark,
  type PoseLandmarkerResult,
} from '@mediapipe/tasks-vision';
import type { PoseFrame } from '../types';

const LOCAL_MODEL_PATH = '/models/pose_landmarker_lite.task';
const WASM_PATH = '/wasm';

async function validateLocalModelAsset(modelPath: string) {
  const response = await fetch(modelPath, { cache: 'no-store' });

  if (!response.ok) {
    throw new Error(`MODEL_NOT_FOUND: Could not fetch ${modelPath} (HTTP ${response.status}).`);
  }

  const contentType = (response.headers.get('content-type') ?? '').toLowerCase();
  if (contentType.includes('text/html')) {
    throw new Error(`MODEL_ARCHIVE_INVALID: ${modelPath} returned HTML instead of a binary .task model.`);
  }

  const bytes = new Uint8Array(await response.arrayBuffer());
  const isZipArchive =
    bytes.length > 4 && bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04;

  if (!isZipArchive) {
    throw new Error(
      `MODEL_ARCHIVE_INVALID: ${modelPath} is not a valid .task zip archive. Ensure this is a binary MediaPipe .task file.`,
    );
  }
}

export class PoseTracker {
  private static instance: Promise<PoseTracker> | null = null;

  private constructor(private landmarker: PoseLandmarker) {}

  static async create(): Promise<PoseTracker> {
    if (!PoseTracker.instance) {
      PoseTracker.instance = (async () => {
        const resolver = await FilesetResolver.forVisionTasks(WASM_PATH);
        await validateLocalModelAsset(LOCAL_MODEL_PATH);

        try {
          const gpuLandmarker = await PoseLandmarker.createFromOptions(resolver, {
            baseOptions: {
              modelAssetPath: LOCAL_MODEL_PATH,
              delegate: 'GPU',
            },
            runningMode: 'VIDEO',
            numPoses: 1,
          });
          return new PoseTracker(gpuLandmarker);
        } catch {
          const cpuLandmarker = await PoseLandmarker.createFromOptions(resolver, {
            baseOptions: {
              modelAssetPath: LOCAL_MODEL_PATH,
              delegate: 'CPU',
            },
            runningMode: 'VIDEO',
            numPoses: 1,
          });
          return new PoseTracker(cpuLandmarker);
        }
      })().catch((error) => {
        PoseTracker.instance = null;
        throw error;
      });
    }

    return PoseTracker.instance;
  }

  detect(video: HTMLVideoElement, timestampMs: number): PoseFrame | null {
    const result: PoseLandmarkerResult = this.landmarker.detectForVideo(video, timestampMs);
    const [pose] = result.landmarks;

    if (!pose || pose.length === 0) {
      return null;
    }

    return {
      landmarks: pose.map((landmark: NormalizedLandmark) => ({
        x: landmark.x,
        y: landmark.y,
        z: landmark.z,
        visibility: landmark.visibility,
      })),
      timestampMs,
    };
  }

  close() {
    this.landmarker.close();
    PoseTracker.instance = null;
  }
}
