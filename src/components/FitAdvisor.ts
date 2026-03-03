import type { PoseFrame, SizeOption } from '../types';

const LEFT_SHOULDER = 11;
const RIGHT_SHOULDER = 12;
const LEFT_HIP = 23;
const RIGHT_HIP = 24;

export interface FitRecommendation {
  size: SizeOption;
  confidence: number;
  reason: string;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function getFitRecommendation(pose: PoseFrame | null): FitRecommendation {
  if (!pose) {
    return {
      size: 'M',
      confidence: 0,
      reason: 'Waiting for stable pose.',
    };
  }

  const ls = pose.landmarks[LEFT_SHOULDER];
  const rs = pose.landmarks[RIGHT_SHOULDER];
  const lh = pose.landmarks[LEFT_HIP];
  const rh = pose.landmarks[RIGHT_HIP];

  if (!ls || !rs || !lh || !rh) {
    return {
      size: 'M',
      confidence: 0.2,
      reason: 'Key torso landmarks are missing.',
    };
  }

  const shoulderWidth = Math.hypot(ls.x - rs.x, ls.y - rs.y);
  const hipWidth = Math.hypot(lh.x - rh.x, lh.y - rh.y);
  const ratio = shoulderWidth / Math.max(hipWidth, 0.001);

  let size: SizeOption = 'M';
  let reason = 'Balanced shoulder-to-hip ratio.';

  if (ratio > 1.15) {
    size = 'L';
    reason = 'Wider upper-body ratio suggests a comfort fit.';
  } else if (ratio < 0.9) {
    size = 'S';
    reason = 'Narrow upper-body ratio suggests a slimmer fit.';
  }

  const visibility = [ls, rs, lh, rh].reduce((acc, p) => acc + (p.visibility ?? 0.5), 0) / 4;
  const centered = 1 - clamp(Math.abs((ls.x + rs.x) / 2 - 0.5) * 1.8, 0, 1);
  const confidence = clamp(visibility * 0.8 + centered * 0.2, 0, 1);

  return {
    size,
    confidence: Number(confidence.toFixed(2)),
    reason,
  };
}
