export type SizeOption = 'S' | 'M' | 'L';

export interface DressItem {
  id: string;
  name: string;
  filePath: string;
  scaleFactor: number;
  yOffsetFactor: number;
  anchors: {
    leftShoulder: number;
    rightShoulder: number;
    leftHip: number;
    rightHip: number;
  };
  torsoLengthRatio?: number;
  minScale?: number;
  maxScale?: number;
}

export interface PoseFrame {
  landmarks: Array<{ x: number; y: number; z: number; visibility?: number }>;
  timestampMs: number;
}

export interface SmoothedTransform {
  centerX: number;
  centerY: number;
  angle: number;
  scale: number;
}

export interface TrackingState {
  hasPerson: boolean;
  confidence: number;
  stableConfidence: number;
}
