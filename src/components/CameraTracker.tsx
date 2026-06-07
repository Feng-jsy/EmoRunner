/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef, useState } from 'react';
import { Camera as CameraIcon, Smile, ShieldAlert } from 'lucide-react';

interface CameraTrackerProps {
  onExpressions: (smile: number, surprise: number) => void;
  smileThreshold: number;
  surpriseThreshold: number;
  onTriggerAction: (action: 'JUMP' | 'SHIELD_ON' | 'SHIELD_OFF') => void;
  isCalibrated: boolean;
  showOverlay?: boolean;
  onStatusChange?: (status: 'LOADING_SCRIPTS' | 'WAITING_CAMERA' | 'READY' | 'ERROR') => void;
}

// Global declaration for MediaPipe CDN scripts
declare const FaceMesh: any;
declare const Camera: any;

export default function CameraTracker({
  onExpressions,
  smileThreshold,
  surpriseThreshold,
  onTriggerAction,
  isCalibrated,
  showOverlay = true,
  onStatusChange,
}: CameraTrackerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [loadingState, setLoadingState] = useState<'LOADING_SCRIPTS' | 'WAITING_CAMERA' | 'READY' | 'ERROR'>('LOADING_SCRIPTS');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [activeExpression, setActiveExpression] = useState<'NEUTRAL' | 'SMILE' | 'SURPRISE'>('NEUTRAL');
  const [currentSmile, setCurrentSmile] = useState<number>(0);
  const [currentSurprise, setCurrentSurprise] = useState<number>(0);

  const activeTrackingRef = useRef<boolean>(true);
  const lastExpressionRef = useRef<'NEUTRAL' | 'SMILE' | 'SURPRISE'>('NEUTRAL');
  const lastFrameTimeRef = useRef<number>(0);
  const faceMeshInstanceRef = useRef<any>(null);
  const cameraInstanceRef = useRef<any>(null);
  // EMA smoothing refs
  const smoothSmileRef = useRef<number>(0);
  const smoothSurpriseRef = useRef<number>(0);
  const EMA_ALPHA = 0.25; // lower = smoother, higher = more responsive

  useEffect(() => {
    onStatusChange?.(loadingState);
  }, [loadingState]);

  // Poll for MediaPipe CDN script readiness
  useEffect(() => {
    let active = true;
    const checkInterval = setInterval(() => {
      if (typeof FaceMesh !== 'undefined' && typeof Camera !== 'undefined') {
        clearInterval(checkInterval);
        if (active) {
          setLoadingState('WAITING_CAMERA');
          initCameraAndFaceMesh();
        }
      }
    }, 500);

    // Timeout if scripts take too long to load (e.g. 10 seconds)
    const timeout = setTimeout(() => {
      clearInterval(checkInterval);
      if (active && (typeof FaceMesh === 'undefined' || typeof Camera === 'undefined')) {
        setLoadingState('ERROR');
        setErrorMsg('无法从 CDN 加载面部识别模块。请检查您的网络连接，或直接使用键盘玩耍（空格键跳跃，S键护盾）。');
      }
    }, 12000);

    return () => {
      active = false;
      clearInterval(checkInterval);
      clearTimeout(timeout);
      
      // Stop webcam and face mesh on unmount
      if (cameraInstanceRef.current) {
        try {
          cameraInstanceRef.current.stop();
        } catch (e) {
          console.warn('Stopped camera error:', e);
        }
      }
      if (faceMeshInstanceRef.current) {
        try {
          faceMeshInstanceRef.current.close();
        } catch (e) {
          console.warn('FaceMesh close error:', e);
        }
      }
    };
  }, []);

  async function initCameraAndFaceMesh() {
    if (!videoRef.current || !canvasRef.current) return;

    try {
      // 1. Initialize FaceMesh
      const faceMesh = new FaceMesh({
        locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
      });

      faceMesh.setOptions({
        maxNumFaces: 1,
        refineLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      faceMesh.onResults(onFaceMeshResults);
      faceMeshInstanceRef.current = faceMesh;

      // 2. Setup video stream via Camera Utils
      const camera = new Camera(videoRef.current, {
        onFrame: async () => {
          if (!activeTrackingRef.current) return;
          // Limit tracking to ~20 FPS for CPU efficiency, still responsive
          const now = Date.now();
          if (now - lastFrameTimeRef.current >= 50) {
            lastFrameTimeRef.current = now;
            await faceMesh.send({ image: videoRef.current! });
          }
        },
        width: 320,
        height: 240,
      });

      await camera.start();
      cameraInstanceRef.current = camera;
      setLoadingState('READY');
    } catch (err: any) {
      console.error('Camera Init Error:', err);
      setLoadingState('ERROR');
      setErrorMsg(
        err.message?.includes('Permission') || err.name === 'NotAllowedError'
          ? '摄像头访问被拒绝！请点击浏览器地址栏的摄像头图标允许访问，并刷新页面。或直接使用键盘快捷键玩耍。'
          : '启动摄像头失败，可能是设备不支持或已被其他程序占用。您可以继续使用键盘玩耍！'
      );
    }
  }

  // Calculate Euclidean Distance in normalized coordinates
  function distance(p1: { x: number; y: number }, p2: { x: number; y: number }) {
    return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
  }

  function onFaceMeshResults(results: any) {
    if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) {
      // No face detected, reset HUD numbers slightly smoothly
      setCurrentSmile(0);
      setCurrentSurprise(0);
      return;
    }

    const landmarks = results.multiFaceLandmarks[0];
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear previous drawing
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Render original mirror-video frame inside Canvas if showOverlay is true
    if (showOverlay) {
      ctx.save();
      ctx.scale(-1, 1);
      ctx.translate(-canvas.width, 0);
      ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);
      ctx.restore();
    }

    // Indices:
    // Left mouth corner = 61
    // Right mouth corner = 291
    // Top forehead = 10
    // Chin bottom = 152
    // Inner lip top = 13
    // Inner lip bottom = 14
    
    const leftCorner = landmarks[61];
    const rightCorner = landmarks[291];
    const faceTop = landmarks[10];
    const faceBottom = landmarks[152];
    const innerLipTop = landmarks[13];
    const innerLipBottom = landmarks[14];

    if (!leftCorner || !rightCorner || !faceTop || !faceBottom || !innerLipTop || !innerLipBottom) {
      return;
    }

    // Face Height serves as distance normalization factor (auto scale adjustment)
    const faceHeightDist = distance(faceTop, faceBottom);
    if (faceHeightDist === 0) return;

    // Compute metrics
    const mouthWidthDist = distance(leftCorner, rightCorner);
    const mouthHeightDist = distance(innerLipTop, innerLipBottom);

    const smileRatio = mouthWidthDist / faceHeightDist;
    const surpriseRatio = mouthHeightDist / faceHeightDist;

    // EMA smoothing to reduce jitter
    smoothSmileRef.current = smoothSmileRef.current * (1 - EMA_ALPHA) + smileRatio * EMA_ALPHA;
    smoothSurpriseRef.current = smoothSurpriseRef.current * (1 - EMA_ALPHA) + surpriseRatio * EMA_ALPHA;
    const smoothSmile = smoothSmileRef.current;
    const smoothSurprise = smoothSurpriseRef.current;

    // Save smoothed metrics for HUD display
    setCurrentSmile(smoothSmile);
    setCurrentSurprise(smoothSurprise);
    onExpressions(smoothSmile, smoothSurprise);

    // Hysteresis: activation threshold = full threshold, deactivation = 0.7x threshold
    const wasSmile = lastExpressionRef.current === 'SMILE';
    const wasSurprise = lastExpressionRef.current === 'SURPRISE';
    const smileOn = wasSmile ? smoothSmile > smileThreshold * 0.7 : smoothSmile > smileThreshold;
    const surpriseOn = wasSurprise ? smoothSurprise > surpriseThreshold * 0.7 : smoothSurprise > surpriseThreshold;

    // Conflict resolution: when both trigger, pick the one further above its threshold
    let currentExpression: 'NEUTRAL' | 'SMILE' | 'SURPRISE' = 'NEUTRAL';
    if (smileOn && surpriseOn) {
      const smileStrength = smoothSmile / Math.max(0.01, smileThreshold);
      const surpriseStrength = smoothSurprise / Math.max(0.01, surpriseThreshold);
      currentExpression = smileStrength >= surpriseStrength ? 'SMILE' : 'SURPRISE';
    } else if (smileOn) {
      currentExpression = 'SMILE';
    } else if (surpriseOn) {
      currentExpression = 'SURPRISE';
    }

    // Trigger action callbacks on state changes
    if (currentExpression !== lastExpressionRef.current) {
      if (currentExpression === 'SMILE') {
        onTriggerAction('JUMP');
      } else if (currentExpression === 'SURPRISE') {
        onTriggerAction('SHIELD_ON');
      } else {
        if (lastExpressionRef.current === 'SURPRISE') {
          onTriggerAction('SHIELD_OFF');
        }
      }
      lastExpressionRef.current = currentExpression;
      setActiveExpression(currentExpression);
    }

    // Draw stylized pixel-art helper path overlays
    if (showOverlay) {
      const W = canvas.width;
      const H = canvas.height;

      // Reflect coordinate system since video is mirrored
      const mapPoint = (p: { x: number; y: number }) => ({
        x: (1 - p.x) * W,
        y: p.y * H,
      });

      const pLeft = mapPoint(leftCorner);
      const pRight = mapPoint(rightCorner);
      const pTop = mapPoint(innerLipTop);
      const pBot = mapPoint(innerLipBottom);

      // Determine wireframe styling depending on detection
      let wireframeColor = 'rgba(255, 255, 255, 0.45)'; // Default neutral
      if (currentExpression === 'SMILE') {
        wireframeColor = '#39ff14'; // Bright green for jumping
      } else if (currentExpression === 'SURPRISE') {
        wireframeColor = '#00ffff'; // Electric cyan for shield
      }

      // Draw stylized retro facial landmarks
      ctx.lineWidth = 2.5;
      
      // Draw mouth borders
      ctx.strokeStyle = wireframeColor;
      ctx.beginPath();
      ctx.moveTo(pLeft.x, pLeft.y);
      ctx.lineTo(pTop.x, pTop.y);
      ctx.lineTo(pRight.x, pRight.y);
      ctx.lineTo(pBot.x, pBot.y);
      ctx.closePath();
      ctx.stroke();

      // Draw dots on corner landmarks
      ctx.fillStyle = currentExpression === 'SMILE' ? '#39ff14' : '#ffffff';
      ctx.fillRect(pLeft.x - 3, pLeft.y - 3, 6, 6);
      ctx.fillRect(pRight.x - 3, pRight.y - 3, 6, 6);

      ctx.fillStyle = currentExpression === 'SURPRISE' ? '#00ffff' : '#ffffff';
      ctx.fillRect(pTop.x - 3, pTop.y - 3, 6, 6);
      ctx.fillRect(pBot.x - 3, pBot.y - 3, 6, 6);

      // Draw full simplified mask dots to make it feel extremely cyberpunk-ish!
      const subsetIndices = [
        33, 133, 362, 263, // Left and right eyes
        1, 4, 152, 10,      // Nose bridge, tip, chin, top head
        234, 454,           // Left and right cheeks
      ];
      ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
      subsetIndices.forEach((idx) => {
        if (landmarks[idx]) {
          const pt = mapPoint(landmarks[idx]);
          ctx.fillRect(pt.x - 1.5, pt.y - 1.5, 3, 3);
        }
      });
    }
  }

  return (
    <div className="relative w-full h-full bg-[#161623] rounded-2xl overflow-hidden pixel-border border-zinc-800 flex flex-col items-center justify-center">
      {/* Mirror HTML5 Video Element (must be rendered, not display:none, for MediaPipe) */}
      <video
        ref={videoRef}
        playsInline
        muted
        autoPlay
        style={{ position: 'absolute', opacity: 0, width: '1px', height: '1px', pointerEvents: 'none' }}
      />

      {/* Screen view depending on loading status */}
      {loadingState === 'LOADING_SCRIPTS' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-[#111119] z-20">
          <div className="w-10 h-10 border-4 border-dashed border-cyan-500 rounded-full animate-spin mb-4" />
          <p className="font-press-start text-[10px] text-cyan-400 mb-2 animate-pulse">LOADING AI TRACKER</p>
          <p className="font-sans text-xs text-zinc-500 max-w-xs">正在连接 CDN 加载人脸关键点检测引擎，大功即将告成...</p>
        </div>
      )}

      {loadingState === 'WAITING_CAMERA' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-[#111119] z-20">
          <CameraIcon className="w-10 h-10 text-emerald-400 stroke-[1.5] mb-4 animate-bounce" />
          <p className="font-press-start text-[10px] text-emerald-400 mb-2">INIT CAMERA</p>
          <p className="font-sans text-xs text-zinc-400 max-w-xs mb-2">请授予摄像头访问权限，以便在 iframe 中识别人脸表情进行互动！</p>
          <p className="font-sans text-[11px] text-zinc-500">（如无摄像头，可点击取消/关闭直接使用键盘畅玩）</p>
        </div>
      )}

      {loadingState === 'ERROR' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-[#181216] z-20">
          <ShieldAlert className="w-10 h-10 text-retro-red mb-4 animate-shake" />
          <p className="font-press-start text-[10px] text-rose-500 mb-2">TRACKER OFFLINE</p>
          <p className="font-sans text-xs text-zinc-400 max-w-xs mb-3">{errorMsg}</p>
          <div className="bg-[#24171d] px-3 py-1.5 rounded text-[11px] text-rose-400 font-medium">
            键盘操作：[空格键] 跳跃， [ S 键 ] 护盾 (需长按)
          </div>
        </div>
      )}

      {/* Actual Feed Rendering and Indicators */}
      <div className="relative w-full h-full flex flex-col">
        {/* Mirror Canvas Renderer */}
        <canvas
          ref={canvasRef}
          width={320}
          height={240}
          className="w-full h-full object-cover scale-x-[-1]"
        />

        {/* Real-time expression bubble and tracking indicators */}
        {loadingState === 'READY' && (
          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2 pointer-events-none z-10 bg-black/60 backdrop-blur-md px-3 py-2 rounded-xl border border-zinc-800">
            {/* Smile Metric Gauge */}
            <div className="flex flex-col flex-1">
              <div className="flex justify-between items-center text-[9px] mb-1">
                <span className="text-emerald-400 font-medium flex items-center gap-1">
                  <Smile className="w-3 h-3" /> 笑脸跳跃
                </span>
                <span className="text-zinc-400 font-mono">
                  {(currentSmile * 100).toFixed(0)}%/{(smileThreshold * 100).toFixed(0)}%
                </span>
              </div>
              <div className="w-full h-2 bg-zinc-900 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-75 ${
                    currentSmile > smileThreshold ? 'bg-emerald-500 shadow-[0_0_8px_#39ff14]' : 'bg-emerald-700/60'
                  }`}
                  style={{ width: `${Math.min(100, (currentSmile / Math.max(0.1, smileThreshold * 1.5)) * 100)}%` }}
                />
              </div>
            </div>

            {/* Surprise Metric Gauge */}
            <div className="flex flex-col flex-1 border-l border-zinc-800 pl-3">
              <div className="flex justify-between items-center text-[9px] mb-1">
                <span className="text-cyan-400 font-medium flex items-center gap-1">
                  <ShieldAlert className="w-3 h-3" /> 惊讶护盾
                </span>
                <span className="text-zinc-400 font-mono">
                  {(currentSurprise * 100).toFixed(0)}%/{(surpriseThreshold * 100).toFixed(0)}%
                </span>
              </div>
              <div className="w-full h-2 bg-zinc-900 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-75 ${
                    currentSurprise > surpriseThreshold ? 'bg-cyan-500 shadow-[0_0_8px_#00ffff]' : 'bg-cyan-700/60'
                  }`}
                  style={{ width: `${Math.min(100, (currentSurprise / Math.max(0.1, surpriseThreshold * 1.5)) * 100)}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Real-time triggering emoji indicator */}
        {loadingState === 'READY' && activeExpression !== 'NEUTRAL' && (
          <div className="absolute top-3 left-3 animate-bounce bg-black/75 px-2.5 py-1.5 rounded-lg border border-zinc-700 flex items-center gap-1.5 font-press-start text-[9px] text-[#e0e0ea] pointer-events-none">
            {activeExpression === 'SMILE' && (
              <>
                <span className="text-emerald-400">😀</span>
                <span className="text-emerald-400 font-bold tracking-wider animate-pulse">跳!</span>
              </>
            )}
            {activeExpression === 'SURPRISE' && (
              <>
                <span className="text-cyan-400">😮</span>
                <span className="text-cyan-400 font-bold tracking-wider animate-pulse font-sans">护盾!</span>
              </>
            )}
          </div>
        )}

        {loadingState === 'READY' && !isCalibrated && (
          <div className="absolute top-3 right-3 bg-retro-amber/90 backdrop-blur text-black px-2 py-1 rounded font-sans font-bold text-[9px] uppercase tracking-wider shadow-lg animate-pulse">
            ⚠️ 建议先进行面部校准
          </div>
        )}
      </div>
    </div>
  );
}
