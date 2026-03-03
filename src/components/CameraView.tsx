import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

function toCameraError(error: unknown): string {
  if (error instanceof DOMException) {
    if (error.name === 'NotAllowedError') {
      return 'Camera permission denied. Allow camera access and retry.';
    }
    if (error.name === 'NotFoundError') {
      return 'No camera found on this device.';
    }
    if (error.name === 'NotReadableError') {
      return 'Camera is busy in another app/tab.';
    }
    if (error.name === 'SecurityError') {
      return 'Camera requires HTTPS or localhost secure context.';
    }
  }

  return 'Unable to start camera.';
}

function toPoseError(error: unknown): string {
  if (error instanceof Error) {
    if (error.message.includes('pose_landmarker_lite.task')) {
      return 'Pose model missing: place /public/models/pose_landmarker_lite.task.';
    }
    return `Pose init failed: ${error.message}`;
  }

  return 'Pose tracking unavailable.';
}

export default function CameraView({ selectedDress, selectedSize, debug }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const rendererRef = useRef(new DressRenderer());
  const trackerRef = useRef<PoseTracker | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const lastSeenRef = useRef<number>(Date.now());
  const selectedDressRef = useRef(selectedDress);
  const selectedSizeRef = useRef(selectedSize);
  const debugRef = useRef(debug);
  const mountedRef = useRef(true);

  const [cameraStatus, setCameraStatus] = useState('Initializing camera...');
  const [poseStatus, setPoseStatus] = useState('Initializing pose tracker...');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [runKey, setRunKey] = useState(0);
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

  const stopSession = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    trackerRef.current?.close();
    trackerRef.current = null;
  }, []);

  const startSession = useCallback(async () => {
    stopSession();
    setErrorMessage(null);
    setPose(null);
    setTracking({ hasPerson: false, confidence: 0, stableConfidence: 0 });

    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas) {
      return;
    }

    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setCameraStatus('Camera unavailable');
      setPoseStatus('Pose tracking unavailable');
      setErrorMessage('Open the app on https:// or http://localhost to enable webcam APIs.');
      return;
    }

    try {
      setCameraStatus('Requesting camera permission...');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      if (!mountedRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      streamRef.current = stream;
      video.srcObject = stream;
      video.muted = true;
      video.playsInline = true;
      await video.play();

      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;
      setCameraStatus('Camera ready');
    } catch (error) {
      setCameraStatus('Camera unavailable');
      setPoseStatus('Pose tracking unavailable');
      setErrorMessage(toCameraError(error));
      return;
    }

    try {
      setPoseStatus('Loading pose model...');
      const tracker = await PoseTracker.create();
      if (!mountedRef.current) {
        tracker.close();
        return;
      }
      trackerRef.current = tracker;
      setPoseStatus('Pose tracking ready');
    } catch (error) {
      setPoseStatus('Pose tracking unavailable');
      setErrorMessage(toPoseError(error));
      return;
    }

    const loop = async () => {
      if (!mountedRef.current || !videoRef.current || !canvasRef.current || !trackerRef.current) {
        return;
      }

      const timestamp = performance.now();
      const framePose = trackerRef.current.detect(videoRef.current, timestamp);
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
  }, [stopSession]);

  useEffect(() => {
    mountedRef.current = true;
    void startSession();

    return () => {
      mountedRef.current = false;
      stopSession();
    };
  }, [runKey, startSession, stopSession]);

  const idle = !tracking.hasPerson && Date.now() - lastSeenRef.current > IDLE_TIMEOUT_MS;

  return (
    <section className="viewer">
      <div className="status-bar">
        <span>{cameraStatus}</span>
        <span>{poseStatus}</span>
        <span>{tracking.hasPerson ? 'Person detected' : 'No person detected'}</span>
      </div>

      {errorMessage && (
        <div className="error-banner">
          <p>{errorMessage}</p>
          <button type="button" onClick={() => setRunKey((v) => v + 1)}>
            Retry camera
          </button>
        </div>
      )}

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
