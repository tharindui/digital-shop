import type { DressItem, PoseFrame, SizeOption, SmoothedTransform } from '../types';

const SIZE_SCALE: Record<SizeOption, number> = {
  S: 0.95,
  M: 1,
  L: 1.05,
};

const EMA_ALPHA = 0.28;

export class DressRenderer {
  private smoothed: SmoothedTransform | null = null;
  private dressImageCache = new Map<string, HTMLImageElement>();

  async renderFrame(opts: {
    ctx: CanvasRenderingContext2D;
    canvas: HTMLCanvasElement;
    video: HTMLVideoElement;
    pose: PoseFrame | null;
    dress: DressItem;
    size: SizeOption;
    debug: boolean;
  }) {
    const { ctx, canvas, video, pose, dress, size, debug } = opts;
    const width = canvas.width;
    const height = canvas.height;

    ctx.save();
    ctx.scale(-1, 1);
    ctx.drawImage(video, -width, 0, width, height);
    ctx.restore();

    if (!pose) {
      this.smoothed = null;
      return;
    }

    const transform = this.computeTransform(pose, width, height, dress, size);
    if (!transform) {
      return;
    }

    this.smoothed = this.smoothed
      ? {
          centerX: this.ema(this.smoothed.centerX, transform.centerX),
          centerY: this.ema(this.smoothed.centerY, transform.centerY),
          angle: this.emaAngle(this.smoothed.angle, transform.angle),
          scale: this.ema(this.smoothed.scale, transform.scale),
        }
      : transform;

    await this.drawDress(ctx, dress, this.smoothed);

    if (debug) {
      this.drawDebug(ctx, pose, width, height, dress);
    }
  }

  private computeTransform(
    pose: PoseFrame,
    width: number,
    height: number,
    dress: DressItem,
    size: SizeOption,
  ): SmoothedTransform | null {
    const { leftShoulder, rightShoulder, leftHip, rightHip } = dress.anchors;
    const ls = pose.landmarks[leftShoulder];
    const rs = pose.landmarks[rightShoulder];
    const lh = pose.landmarks[leftHip];
    const rh = pose.landmarks[rightHip];

    if (!ls || !rs || !lh || !rh) {
      return null;
    }

    const shoulderMid = { x: (ls.x + rs.x) / 2, y: (ls.y + rs.y) / 2 };
    const hipMid = { x: (lh.x + rh.x) / 2, y: (lh.y + rh.y) / 2 };

    const shoulderWidth = Math.hypot(ls.x - rs.x, ls.y - rs.y);
    const torsoAngle = Math.atan2(hipMid.y - shoulderMid.y, hipMid.x - shoulderMid.x) - Math.PI / 2;

    const baseScale = shoulderWidth * width * dress.scaleFactor * SIZE_SCALE[size];
    const clampedScale = Math.min(dress.maxScale ?? Number.POSITIVE_INFINITY, Math.max(dress.minScale ?? 90, baseScale));

    return {
      centerX: width * (1 - shoulderMid.x),
      centerY: height * (shoulderMid.y + dress.yOffsetFactor),
      angle: torsoAngle,
      scale: clampedScale,
    };
  }

  private async drawDress(ctx: CanvasRenderingContext2D, dress: DressItem, transform: SmoothedTransform) {
    const img = await this.getDressImage(dress.filePath);
    const drawWidth = transform.scale;
    const drawHeight = (img.height / img.width) * drawWidth * (dress.torsoLengthRatio ?? 1);

    ctx.save();
    ctx.translate(transform.centerX, transform.centerY);
    ctx.rotate(transform.angle);
    ctx.drawImage(img, -drawWidth / 2, -drawHeight * 0.08, drawWidth, drawHeight);
    ctx.restore();
  }

  private drawDebug(ctx: CanvasRenderingContext2D, pose: PoseFrame, width: number, height: number, dress: DressItem) {
    const points = pose.landmarks;
    const toPoint = (i: number) => ({ x: (1 - points[i].x) * width, y: points[i].y * height });
    const shoulderLeft = toPoint(dress.anchors.leftShoulder);
    const shoulderRight = toPoint(dress.anchors.rightShoulder);
    const hipLeft = toPoint(dress.anchors.leftHip);
    const hipRight = toPoint(dress.anchors.rightHip);

    ctx.strokeStyle = '#39ff14';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(shoulderLeft.x, shoulderLeft.y);
    ctx.lineTo(shoulderRight.x, shoulderRight.y);
    ctx.stroke();

    const shoulderMid = { x: (shoulderLeft.x + shoulderRight.x) / 2, y: (shoulderLeft.y + shoulderRight.y) / 2 };
    const hipMid = { x: (hipLeft.x + hipRight.x) / 2, y: (hipLeft.y + hipRight.y) / 2 };

    ctx.strokeStyle = '#00d4ff';
    ctx.beginPath();
    ctx.moveTo(shoulderMid.x, shoulderMid.y);
    ctx.lineTo(hipMid.x, hipMid.y);
    ctx.stroke();

    ctx.fillStyle = '#ff3366';
    for (const landmark of points) {
      ctx.beginPath();
      ctx.arc((1 - landmark.x) * width, landmark.y * height, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private getDressImage(path: string): Promise<HTMLImageElement> {
    const cached = this.dressImageCache.get(path);
    if (cached) return Promise.resolve(cached);

    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        this.dressImageCache.set(path, img);
        resolve(img);
      };
      img.onerror = () => reject(new Error(`Failed to load dress image: ${path}`));
      img.src = path;
    });
  }

  private ema(prev: number, next: number): number {
    return prev + EMA_ALPHA * (next - prev);
  }

  private emaAngle(prev: number, next: number): number {
    const diff = Math.atan2(Math.sin(next - prev), Math.cos(next - prev));
    return prev + EMA_ALPHA * diff;
  }
}
