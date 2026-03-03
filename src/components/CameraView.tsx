import { useEffect, useMemo, useRef, useState } from 'react';
import type { DressItem, PoseFrame, SizeOption, TrackingState } from '../types';
import { PoseTracker } from './PoseTracker';
import { DressRenderer } from './DressRenderer';
import { getFitRecommendation } from './FitAdvisor';

interface Props {
  selectedDress: DressItem;
  selectedSize: SizeOption;
  debug: boolean;
}

const IDLE_TIMEOUT_MS = 5000;

export default function CameraView({ selectedDress, selectedSize, debug }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const rendererRef = useRef(new DressRenderer());
  const lastSeenRef = useRef<number>(Date.now());
  const selectedDressRef = useRef(selectedDress);
  const selectedSizeRef = useRef(selectedSize);
  const debugRef = useRef(debug);

  const [cameraStatus, setCameraStatus] = useState('Requesting camera...');
  const [poseStatus, setPoseStatus] = useState('Loading pose model...');
  const [tracking, setTracking] = useState<TrackingState>({
    hasPerson: false,
    confidence: 0,
    stableConfidence: 0,
  });
  const [pose, setPose] = useState<PoseFrame | null>(null);

  selectedDressRef.current = selectedDress;
  selectedSizeRef.current = selectedSize;
  debugRef.current = debug;

  const fit = useMemo(() => getFitRecommendation(pose), [pose]);

  useEffect(() => {
    let tracker: PoseTracker | null = null;
    let activeStream: MediaStream | null = null;
    let mounted = true;

    const start = async () => {
      try {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas) {
          return;
        }

        activeStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'user',
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });

        video.srcObject = activeStream;
        await video.play();

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        setCameraStatus('Camera ready');

        tracker = await PoseTracker.create();
        setPoseStatus('Pose tracking ready');

        const loop = async () => {
          if (!mounted || !tracker || !videoRef.current || !canvasRef.current) {
            return;
          }

          const timestamp = performance.now();
          const framePose = tracker.detect(videoRef.current, timestamp);
          const ctx = canvasRef.current.getContext('2d');

          if (ctx) {
            await rendererRef.current.renderFrame({
              ctx,
              canvas: canvasRef.current,
              video: videoRef.current,
              pose: framePose,
              dress: selectedDressRef.current,
              size: selectedSizeRef.current,
              debug: debugRef.current,
            });
          }

          const hasPerson = Boolean(framePose);
          if (hasPerson) {
            lastSeenRef.current = Date.now();
            setPose(framePose);
          } else if (Date.now() - lastSeenRef.current > IDLE_TIMEOUT_MS) {
            setPose(null);
          }

          const vis = framePose
            ? [11, 12, 23, 24].reduce(
                (acc, index) => acc + (framePose.landmarks[index]?.visibility ?? 0),
                0,
              ) / 4
            : 0;

          setTracking((prev) => ({
            hasPerson,
            confidence: vis,
            stableConfidence: prev.stableConfidence + 0.2 * (vis - prev.stableConfidence),
          }));

          animationRef.current = requestAnimationFrame(loop);
        };

        animationRef.current = requestAnimationFrame(loop);
      } catch {
        setCameraStatus('Camera permission denied');
        setPoseStatus('Pose tracking unavailable');
      }
    };

    start();

    return () => {
      mounted = false;
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (activeStream) {
        activeStream.getTracks().forEach((track) => track.stop());
      }
      tracker?.close();
    };
  }, []);

  const idle = !tracking.hasPerson && Date.now() - lastSeenRef.current > IDLE_TIMEOUT_MS;

  return (
    <section className="viewer">
      <div className="status-bar">
        <span>{cameraStatus}</span>
        <span>{poseStatus}</span>
        <span>{tracking.hasPerson ? 'Person detected' : 'No person detected'}</span>
      </div>
      <div className="canvas-wrap">
        <video ref={videoRef} playsInline muted className="hidden-video" />
        <canvas ref={canvasRef} className="mirror-canvas" />
        {idle && <div className="idle-banner">Stand in front of camera to start fitting</div>}
      </div>
      <div className="fit-panel">
        <p>
          Recommended size: <strong>{fit.size}</strong> (Confidence: {fit.confidence.toFixed(2)})
        </p>
        <p>{fit.reason}</p>
        <p className="note">Note: This is an estimate for demo.</p>
      </div>
    </section>
  );
}
