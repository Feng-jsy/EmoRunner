/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef, useState } from 'react';
import { GameState, Obstacle, Coin, Particle, GameScore, SkinId, MiniObjective, pickRandomMiniObjective, SHOP_SKINS, PowerUp, PowerUpType, POWERUP_DEFS, GAME_BALANCE } from '../types';
import { Trophy, HelpCircle, Volume2, VolumeX, ShieldAlert, Zap } from 'lucide-react';

interface GameEngineProps {
  gameState: GameState;
  smileLevel: number;
  surpriseLevel: number;
  externalAction?: { action: 'JUMP' | 'SHIELD_ON' | 'SHIELD_OFF'; id: number } | null;
  smileThreshold: number;
  surpriseThreshold: number;
  isCalibrated: boolean;
  skinId: SkinId;
  onGameOver: (finalScore: number, finalCoins: number, shattered: number, jumps: number, maxCombo: number, expressionStats: { smileAvg: number; smileMax: number; surpriseAvg: number; surpriseMax: number; jumpTriggers: number; shieldTriggers: number }) => void;
  onRestart: () => void;
}

// 8-bit Sound Synthesizer using Web Audio API
class RetroAudioEngine {
  private ctx: AudioContext | null = null;
  public enabled: boolean = true;

  constructor() {
    // Initialized lazily on first user interaction
  }

  private initCtx() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public init() {
    try {
      this.initCtx();
    } catch (_) {}
  }

  playJump() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(150, t);
      osc.frequency.exponentialRampToValueAtTime(550, t + 0.15);
      
      gain.gain.setValueAtTime(0.15, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.18);
      
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      
      osc.start(t);
      osc.stop(t + 0.18);
    } catch (_) {}
  }

  playShieldOn() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(300, t);
      osc.frequency.linearRampToValueAtTime(600, t + 0.1);
      
      gain.gain.setValueAtTime(0.08, t);
      gain.gain.linearRampToValueAtTime(0.03, t + 0.12);
      
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      
      osc.start(t);
      osc.stop(t + 0.12);
    } catch (_) {}
  }

  playBlockShatter() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      
      // Explosion sound via short noise or pulse
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = 'square';
      osc.frequency.setValueAtTime(120, t);
      osc.frequency.exponentialRampToValueAtTime(10, t + 0.25);
      
      gain.gain.setValueAtTime(0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.28);
      
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      
      osc.start(t);
      osc.stop(t + 0.28);
    } catch (_) {}
  }

  playCoin() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = 'sine';
      // Retro C5 -> E5 double musical beep
      osc.frequency.setValueAtTime(523.25, t); // C5
      osc.frequency.setValueAtTime(659.25, t + 0.07); // E5
      
      gain.gain.setValueAtTime(0.12, t);
      gain.gain.setValueAtTime(0.12, t + 0.07);
      gain.gain.exponentialRampToValueAtTime(0.005, t + 0.2);
      
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      
      osc.start(t);
      osc.stop(t + 0.2);
    } catch (_) {}
  }

  playDeath() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(300, t);
      osc.frequency.linearRampToValueAtTime(50, t + 0.6);

      gain.gain.setValueAtTime(0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.6);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 0.6);
    } catch (_) {}
  }

  playMilestone() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;

      // Triumphant ascending arpeggio: C5 → E5 → G5 → C6
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((freq, i) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'triangle';
        const start = t + i * 0.12;
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(0.14, start + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.01, start + 0.35);
        osc.connect(gain);
        gain.connect(this.ctx!.destination);
        osc.start(start);
        osc.stop(start + 0.35);
      });
    } catch (_) {}
  }

  playImpale() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;

      // Sharp metallic sting
      const osc1 = this.ctx.createOscillator();
      const gain1 = this.ctx.createGain();
      osc1.type = 'square';
      osc1.frequency.setValueAtTime(880, t);
      osc1.frequency.exponentialRampToValueAtTime(220, t + 0.15);
      gain1.gain.setValueAtTime(0.18, t);
      gain1.gain.exponentialRampToValueAtTime(0.01, t + 0.2);
      osc1.connect(gain1);
      gain1.connect(this.ctx.destination);
      osc1.start(t);
      osc1.stop(t + 0.2);

      // Low thud
      const osc2 = this.ctx.createOscillator();
      const gain2 = this.ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(80, t + 0.05);
      osc2.frequency.exponentialRampToValueAtTime(30, t + 0.4);
      gain2.gain.setValueAtTime(0.25, t + 0.05);
      gain2.gain.exponentialRampToValueAtTime(0.01, t + 0.45);
      osc2.connect(gain2);
      gain2.connect(this.ctx.destination);
      osc2.start(t + 0.05);
      osc2.stop(t + 0.45);
    } catch (_) {}
  }
}

const audio = new RetroAudioEngine();

// Over-the-top praise messages for every 1000m milestone
const PRAISE_POOL: string[] = [
  '老板看了都想给你加薪！💰',
  '你的腿是装了火箭吗？🚀',
  '隔壁公司HR已在挖你！📞',
  '你是情绪管理大师！🧘',
  '投资人已经坐不住了！💼',
  '连马斯克都想见你！🦾',
  '你的表情肌是钛合金的！🤖',
  '华尔街在讨论你了！📈',
  '超越99.9%的打工人！🏅',
  '简历上可以写这个！📝',
  '你就是赛道之王！👑',
  'IPO都得等你点头！🏦',
  '福布斯下次封面人物！📰',
  '你的耐力令博尔特汗颜！⚡',
  'CEO看了连夜写推荐信！✉️',
  '你是情绪闯关的神！⚡',
  'GPT-6都不如你稳定！🧬',
  'KPI？你就是KPI本身！🎯',
  '董事会给你留了位置！🪑',
  '你的微笑值一个亿！😎',
  '投资人抢着给你打钱！💸',
  '你的抗压能力超越AI！🏋️',
  '猎头已经打爆你电话了！📱',
  '你是打工人的终极形态！🦸',
  '联合国发来贺电！🌍',
];

export default function GameEngine({
  gameState,
  smileLevel,
  surpriseLevel,
  externalAction,
  smileThreshold,
  surpriseThreshold,
  isCalibrated,
  skinId,
  onGameOver,
  onRestart,
}: GameEngineProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Game states and scores
  const [score, setScore] = useState<number>(0);
  const [coins, setCoins] = useState<number>(0);
  const [soundOn, setSoundOn] = useState<boolean>(true);
  const [useKeyboardHelp, setUseKeyboardHelp] = useState<boolean>(true);
  const [helpFading, setHelpFading] = useState<boolean>(false);
  const [miniObjDisplay, setMiniObjDisplay] = useState<{ desc: string; progress: number; target: number; reward: number; done: boolean }>({ desc: '', progress: 0, target: 0, reward: 0, done: false });

  // High score tracking
  const [highScore, setHighScore] = useState<number>(0);
  
  // Keys ref
  const keyboardStateRef = useRef<{ [key: string]: boolean }>({});

  // Active game logic references (bypass React state delays for 60fps loop)
  const gameLoopIdRef = useRef<number | null>(null);
  const gameActiveRef = useRef<boolean>(false);
  const pausedRef = useRef<boolean>(false);
  const scoreRef = useRef<number>(0);
  const coinsRef = useRef<number>(0);

  // Expression sampling for gallery
  const frameCounterRef = useRef<number>(0);
  const expressionSamplesRef = useRef<{ smile: number; surprise: number }[]>([]);
  const smileTriggerCountRef = useRef<number>(0);
  const shieldTriggerCountRef = useRef<number>(0);
  const wasSmilingRef = useRef<boolean>(false);
  const wasShieldingRef = useRef<boolean>(false);
  const manualShieldDesiredRef = useRef<boolean>(false);

  // Playable settings
  const gravity = GAME_BALANCE.gravity;
  const floorYLevel = GAME_BALANCE.floorY;
  
  // Game state representation
  const playerRef = useRef({
    x: GAME_BALANCE.playerX, // Home anchor
    y: floorYLevel - GAME_BALANCE.playerHeight, // Character center height
    vy: 0,
    width: GAME_BALANCE.playerWidth,
    height: GAME_BALANCE.playerHeight,
    isGrounded: true,
    airJumpsLeft: 0,
    doubleJumpFlash: 0, // frames for visual flash after double jump
    shieldActive: false,
    frame: 0,
    animationTick: 0,
    shatteredCount: 0,
    pushedAlertTick: 0,
  });

  const obstaclesRef = useRef<Obstacle[]>([]);
  const coinsListRef = useRef<Coin[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const speedRef = useRef<number>(GAME_BALANCE.initialSpeed);
  const lastSpawnDistanceRef = useRef<number>(0);
  const distanceTraveledRef = useRef<number>(0);

  const comboCountRef = useRef<number>(0);
  const comboTimerRef = useRef<number>(0);
  const maxComboRef = useRef<number>(0);
  const totalJumpsRef = useRef<number>(0);
  const lastMilestoneRef = useRef<number>(0);
  const milestoneAlphaRef = useRef<number>(0);
  const milestoneTimestampRef = useRef<number>(0); // for 4s fade-in/out timing
  const praiseMessageRef = useRef<string>('');
  const coinRainPhaseRef = useRef<number>(0); // 0="v2.30", 1="hello~", 2+=random
  const miniObjRef = useRef<MiniObjective>(pickRandomMiniObjective());
  const miniObjProgressRef = useRef<number>(0);
  const miniObjDoneRef = useRef<boolean>(false);
  const miniObjCelebrateRef = useRef<number>(0); // celebration timer frames
  const powerUpsRef = useRef<PowerUp[]>([]);
  const activePowerUpRef = useRef<PowerUpType | null>(null);
  const powerUpExpiryRef = useRef<number>(0); // timestamp when power-up expires
  const oxygenRef = useRef<number>(1.0); // shield oxygen 0-1
  const lastTickTimeRef = useRef<number>(0); // for real-time delta calculation

  const skin = SHOP_SKINS.find((s) => s.id === skinId) || SHOP_SKINS[0];

  // Load highscore from localStorage (migrate old score format: ×10)
  useEffect(() => {
    try {
      const stored = localStorage.getItem('retro_run_highscore');
      if (stored) {
        let val = parseInt(stored, 10);
        // Old format: score = distance/10. If value seems too small for meters, convert.
        if (val > 0 && val < 1000) val *= 10;
        setHighScore(val);
      }
    } catch (_) {}
  }, []);

  // Eagerly warmup audio engine on any early user activity to prevent first-sound frame rate jitter
  useEffect(() => {
    const warmupAudio = () => {
      audio.init();
      window.removeEventListener('click', warmupAudio);
      window.removeEventListener('keydown', warmupAudio);
      window.removeEventListener('touchstart', warmupAudio);
    };
    window.addEventListener('click', warmupAudio);
    window.addEventListener('keydown', warmupAudio);
    window.addEventListener('touchstart', warmupAudio);
    return () => {
      window.removeEventListener('click', warmupAudio);
      window.removeEventListener('keydown', warmupAudio);
      window.removeEventListener('touchstart', warmupAudio);
    };
  }, []);

  // Auto-dismiss keyboard help after 5 seconds with fade
  useEffect(() => {
    if (gameState !== 'PLAYING') {
      setUseKeyboardHelp(true);
      setHelpFading(false);
      return;
    }
    const timer = setTimeout(() => {
      setHelpFading(true);
      setTimeout(() => {
        setUseKeyboardHelp(false);
        setHelpFading(false);
      }, 500);
    }, 5000);
    return () => clearTimeout(timer);
  }, [gameState]);

  // Update sound engine toggle
  useEffect(() => {
    audio.enabled = soundOn;
  }, [soundOn]);

  // Direct expression-to-control mapping (rising-edge jump, continuous shield)
  useEffect(() => {
    if (gameState !== 'PLAYING' || pausedRef.current) return;

    // Smile → jump (rising-edge detection per-frame via ref, not just event)
    if (smileLevel > smileThreshold && !wasSmilingRef.current) {
      triggerJump();
      wasSmilingRef.current = true;
    } else if (smileLevel <= smileThreshold) {
      wasSmilingRef.current = false;
    }

    // Surprise → shield (continuous hold, OR with manual input)
    const shouldShield = surpriseLevel > surpriseThreshold || manualShieldDesiredRef.current;
    if (shouldShield !== playerRef.current.shieldActive) {
      if (shouldShield && oxygenRef.current > 0) {
        audio.playShieldOn();
        playerRef.current.shieldActive = true;
      } else if (!shouldShield) {
        playerRef.current.shieldActive = false;
      }
    }
  }, [smileLevel, surpriseLevel, smileThreshold, surpriseThreshold, gameState]);

  // Consume camera-triggered actions from App as debounced supplement
  useEffect(() => {
    if (gameState !== 'PLAYING' || !externalAction || pausedRef.current) return;

    if (externalAction.action === 'JUMP') {
      triggerJump();
      return;
    }

    if (externalAction.action === 'SHIELD_ON') {
      if (!playerRef.current.shieldActive && oxygenRef.current > 0) {
        audio.playShieldOn();
        playerRef.current.shieldActive = true;
      }
      return;
    }

    if (externalAction.action === 'SHIELD_OFF' && !manualShieldDesiredRef.current) {
      playerRef.current.shieldActive = false;
    }
  }, [externalAction, gameState]);

  // Setup Keyboard Fallback Event Listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keyboardStateRef.current[e.key] = true;

      if (e.key === 'Escape') {
        e.preventDefault();
        if (gameState === 'PLAYING') {
          pausedRef.current = !pausedRef.current;
        }
        return;
      }

      if (gameState !== 'PLAYING') return;
      if (pausedRef.current) return;

      if (e.key === ' ' || e.key === 'ArrowUp') {
        e.preventDefault();
        triggerJump();
      }

      if (e.key === 's' || e.key === 'S' || e.key === 'ArrowDown') {
        e.preventDefault();
        manualShieldDesiredRef.current = true;
        if (!playerRef.current.shieldActive && oxygenRef.current > 0) {
          audio.playShieldOn();
          playerRef.current.shieldActive = true;
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keyboardStateRef.current[e.key] = false;

      if (gameState !== 'PLAYING') return;

      if (e.key === 's' || e.key === 'S' || e.key === 'ArrowDown') {
        manualShieldDesiredRef.current = false;
        playerRef.current.shieldActive = false;
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (gameState !== 'PLAYING' || pausedRef.current) return;
      if (e.button === 0) { // left click = jump
        e.preventDefault();
        triggerJump();
      } else if (e.button === 2) { // right click = shield
        e.preventDefault();
        manualShieldDesiredRef.current = true;
        if (!playerRef.current.shieldActive && oxygenRef.current > 0) {
          audio.playShieldOn();
          playerRef.current.shieldActive = true;
        }
      }
    };
    const handleMouseUp = (e: MouseEvent) => {
      if (gameState !== 'PLAYING' || pausedRef.current) return;
      if (e.button === 2) { // release right = shield off
        manualShieldDesiredRef.current = false;
        playerRef.current.shieldActive = false;
      }
    };
    const preventCtx = (e: Event) => e.preventDefault();

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('contextmenu', preventCtx);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('contextmenu', preventCtx);
    };
  }, [gameState]);

  // Restart the game loop when state transitions to PLAYING
  useEffect(() => {
    if (gameState === 'PLAYING') {
      initializeNewGame();
    } else {
      stopGameLoop();
    }
    return () => stopGameLoop();
  }, [gameState]);

  // Handle Container Resizing Elegantly
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;
      canvas.width = container.clientWidth;
      canvas.height = Math.min(container.clientHeight, 480);
    };

    const observer = new ResizeObserver(handleResize);
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }
    window.addEventListener('resize', handleResize);
    
    // Initial size calculation
    setTimeout(handleResize, 100);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  function updateMiniObj(type: MiniObjective['type']) {
    const obj = miniObjRef.current;
    if (miniObjDoneRef.current || obj.type !== type) return;
    miniObjProgressRef.current++;
    if (miniObjProgressRef.current >= obj.target) {
      miniObjDoneRef.current = true;
      miniObjCelebrateRef.current = GAME_BALANCE.miniObjCelebrateFrames; // 1.5s celebration
      coinsRef.current += obj.reward;
      setCoins(coinsRef.current);
      audio.playCoin();
    }
  }

  function triggerJump() {
    const player = playerRef.current;
    if (player.isGrounded) {
      // First jump from ground
      player.vy = GAME_BALANCE.jumpVyGround;
      player.isGrounded = false;
      player.airJumpsLeft = activePowerUpRef.current === 'TRIPLE_JUMP' ? 2 : 1;
      totalJumpsRef.current++;
      updateMiniObj('jump_count');
      audio.playJump();
    } else if (player.airJumpsLeft > 0) {
      // Air jump (double / triple)
      player.vy = GAME_BALANCE.jumpVyAir;
      player.airJumpsLeft--;
      player.doubleJumpFlash = GAME_BALANCE.doubleJumpFlashFrames;
      totalJumpsRef.current++;
      updateMiniObj('jump_count');
      audio.playJump();
      // Burst particles at double jump position
      for (let i = 0; i < 10; i++) {
        particlesRef.current.push({
          x: player.x + player.width / 2 + (Math.random() - 0.5) * 20,
          y: player.y + player.height / 2 + (Math.random() - 0.5) * 10,
          vx: (Math.random() - 0.5) * 5,
          vy: (Math.random() - 0.5) * 5 - 1,
          size: Math.random() * 4 + 2,
          color: Math.random() > 0.5 ? '#ffcc00' : '#ffffff',
          alpha: 1,
          life: 0.7,
        });
      }
    }
  }

  function initializeNewGame() {
    // Reset scores
    scoreRef.current = 0;
    coinsRef.current = 0;
    setScore(0);
    setCoins(0);

    // Reset player details
    playerRef.current = {
      x: GAME_BALANCE.playerX,
      y: floorYLevel - GAME_BALANCE.playerHeight,
      vy: 0,
      width: 28,
      height: 36,
      isGrounded: true,
      airJumpsLeft: 0,
      doubleJumpFlash: 0,
      shieldActive: false,
      frame: 0,
      animationTick: 0,
      shatteredCount: 0,
      pushedAlertTick: 0,
    };

    // Clear lists
    obstaclesRef.current = [];
    coinsListRef.current = [];
    particlesRef.current = [];
    
    speedRef.current = GAME_BALANCE.initialSpeed;
    distanceTraveledRef.current = 0;
    lastSpawnDistanceRef.current = 100;
    comboCountRef.current = 0;
    comboTimerRef.current = 0;
    maxComboRef.current = 0;
    totalJumpsRef.current = 0;
    lastMilestoneRef.current = 0;
    milestoneAlphaRef.current = 0;
    milestoneTimestampRef.current = 0;
    praiseMessageRef.current = '';
    coinRainPhaseRef.current = 0;
    powerUpsRef.current = [];
    activePowerUpRef.current = null;
    powerUpExpiryRef.current = 0;
    lastTickTimeRef.current = 0;
    oxygenRef.current = 1.0;
    miniObjRef.current = pickRandomMiniObjective();
    miniObjProgressRef.current = 0;
    miniObjDoneRef.current = false;
    miniObjCelebrateRef.current = 0;
    expressionSamplesRef.current = [];
    smileTriggerCountRef.current = 0;
    shieldTriggerCountRef.current = 0;
    wasSmilingRef.current = false;
    wasShieldingRef.current = false;
    manualShieldDesiredRef.current = false;
    frameCounterRef.current = 0;

    // Begin looping
    pausedRef.current = false;
    gameActiveRef.current = true;
    gameLoopIdRef.current = requestAnimationFrame(runGameTick);
  }

  function stopGameLoop() {
    gameActiveRef.current = false;
    if (gameLoopIdRef.current) {
      cancelAnimationFrame(gameLoopIdRef.current);
      gameLoopIdRef.current = null;
    }
  }

  // Create highly optimized pixel debris shatters
  function makeShatterParticles(x: number, y: number, color: string) {
    const count = 18;
    for (let i = 0; i < count; i++) {
      particlesRef.current.push({
        x: x + Math.random() * 24,
        y: y + Math.random() * 32,
        vx: (Math.random() - 0.5) * 8 - 3, // Fly back and out
        vy: -Math.random() * 6 - 2, // Arch up
        size: Math.random() * 4 + 2,
        color,
        alpha: 1,
        life: 1.0,
      });
    }
  }

  // Main game logic engine, coordinates canvas drawing and mechanics at 60fps
  function runGameTick(timestamp: number) {
    if (!gameActiveRef.current) return;

    const canvas = canvasRef.current;
    if (!canvas) {
      gameLoopIdRef.current = requestAnimationFrame(runGameTick);
      return;
    }

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) {
      gameLoopIdRef.current = requestAnimationFrame(runGameTick);
      return;
    }

    const W = canvas.width;
    const H = canvas.height;

    // Real-time delta (cap to avoid huge jumps on tab switch)
    const dt = Math.min(0.1, lastTickTimeRef.current ? (timestamp - lastTickTimeRef.current) / 1000 : 1 / 60);
    lastTickTimeRef.current = timestamp;

    const player = playerRef.current;
    const speed = speedRef.current;

    // Skip physics when paused (but still render the frozen frame)
    const isPaused = pausedRef.current;
    if (!isPaused) {

    // --- 1. PHYSICS UPDATE ---
    distanceTraveledRef.current += speed;
    scoreRef.current = Math.floor(distanceTraveledRef.current);
    if (comboCountRef.current >= GAME_BALANCE.comboScoreThreshold) {
      scoreRef.current += comboCountRef.current;
    }
    setScore(scoreRef.current);

    // Expression sampling (every 30 frames = 0.5s @ 60fps)
    frameCounterRef.current++;
    if (frameCounterRef.current % 30 === 0) {
      expressionSamplesRef.current.push({ smile: smileLevel, surprise: surpriseLevel });
    }
    // Track trigger counts (rising edge detection)
    if (smileLevel > smileThreshold && !wasSmilingRef.current) {
      smileTriggerCountRef.current++;
      wasSmilingRef.current = true;
    } else if (smileLevel <= smileThreshold) {
      wasSmilingRef.current = false;
    }
    if (surpriseLevel > surpriseThreshold && !wasShieldingRef.current) {
      shieldTriggerCountRef.current++;
      wasShieldingRef.current = true;
    } else if (surpriseLevel <= surpriseThreshold) {
      wasShieldingRef.current = false;
    }

    // Mini-objective: distance tracking (continuous, not event-based)
    if (!miniObjDoneRef.current && miniObjRef.current.type === 'distance') {
      miniObjProgressRef.current = scoreRef.current;
      if (miniObjProgressRef.current >= miniObjRef.current.target) {
        miniObjDoneRef.current = true;
        miniObjCelebrateRef.current = 90;
        coinsRef.current += miniObjRef.current.reward;
        setCoins(coinsRef.current);
        audio.playCoin();
      }
    }

    // Milestone check (every 1000m) + random praise message
    const currentMilestone = Math.floor(distanceTraveledRef.current / GAME_BALANCE.milestoneInterval);
    if (currentMilestone > lastMilestoneRef.current) {
      lastMilestoneRef.current = currentMilestone;
      milestoneTimestampRef.current = timestamp;
      praiseMessageRef.current = PRAISE_POOL[Math.floor(Math.random() * PRAISE_POOL.length)];
      audio.playMilestone();
    }
    // 4-second milestone display with fade-in/out
    // fade-in 0→0.5s, hold 0.5→3.5s, fade-out 3.5→4.0s
    {
      const elapsed = milestoneTimestampRef.current > 0
        ? (timestamp - milestoneTimestampRef.current) / 1000
        : 999;
      if (elapsed <= 0.5) {
        milestoneAlphaRef.current = elapsed / 0.5;
      } else if (elapsed <= 3.5) {
        milestoneAlphaRef.current = 1.0;
      } else if (elapsed <= 4.0) {
        milestoneAlphaRef.current = (4.0 - elapsed) / 0.5;
      } else {
        milestoneAlphaRef.current = 0;
      }
    }

    // Mini-objective celebration timer decay
    if (miniObjCelebrateRef.current > 0) {
      miniObjCelebrateRef.current--;
    }

    // Sync mini-objective display state
    setMiniObjDisplay({
      desc: miniObjRef.current.description,
      progress: miniObjProgressRef.current,
      target: miniObjRef.current.target,
      reward: miniObjRef.current.reward,
      done: miniObjDoneRef.current,
    });

    if (comboTimerRef.current > 0) {
      comboTimerRef.current--;
      if (comboTimerRef.current <= 0) {
        comboCountRef.current = 0;
      }
    }

    // Slowly increase speed over time
    if (speedRef.current < GAME_BALANCE.maxSpeed) {
      speedRef.current += GAME_BALANCE.speedRampPerFrame;
    }

    // Pushed alert cooldown tick
    if (playerRef.current.pushedAlertTick > 0) {
      playerRef.current.pushedAlertTick--;
    }

    // Double jump flash cooldown
    if (playerRef.current.doubleJumpFlash > 0) {
      playerRef.current.doubleJumpFlash--;
    }

    // Shield oxygen management — real-time
    if (playerRef.current.shieldActive) {
      oxygenRef.current -= dt / GAME_BALANCE.shieldDepleteSec;
      if (oxygenRef.current <= 0) {
        oxygenRef.current = 0;
        playerRef.current.shieldActive = false;
      }
    } else {
      oxygenRef.current = Math.min(1, oxygenRef.current + dt / GAME_BALANCE.shieldRefillSec);
    }

    // Power-up timer — real-time expiry
    if (activePowerUpRef.current && Date.now() >= powerUpExpiryRef.current) {
      activePowerUpRef.current = null;
    }

    // Player Gravity Physics
    player.vy += gravity;
    player.y += player.vy;

    // Inside Pits Collision & Triggers checking
    let isInPitSector = false;
    let onObstacleTop = false;

    obstaclesRef.current.forEach((obs) => {
      if (obs.type === 'PIT' && !obs.isShattered) {
        // Find if player center coordinates align vertically with the pit gap
        const playerCenter = player.x + player.width / 2;
        const pitLeft = obs.x;
        const pitRight = obs.x + obs.width;

        // If the player center is over the empty mouth of the pit, they fall into the void:
        if (playerCenter > pitLeft + 3 && playerCenter < pitRight - 3) {
          isInPitSector = true;
        }

        // Pit wall collision: solid walls at ground level (no clipping through pit sides)
        const atGround = player.y >= floorYLevel - player.height - 4;
        if (atGround && !isInPitSector) {
          const pxRight = player.x + player.width;
          // Left wall: player walks into pit from left
          if (pxRight > pitLeft + 4 && playerCenter <= pitLeft + 8) {
            player.x = pitLeft - player.width;
            player.pushedAlertTick = 12;
            if (player.x < GAME_BALANCE.playerDeathEdgeX) {
              triggerDeathState('crushed');
              return;
            }
          }
          // Right wall: player walks into pit from right
          if (player.x < pitRight - 4 && playerCenter >= pitRight - 8) {
            player.x = pitRight;
            player.pushedAlertTick = 12;
            if (player.x < GAME_BALANCE.playerDeathEdgeX) {
              triggerDeathState('crushed');
              return;
            }
          }
        }
      }
    });

    // Landing on regular ground level — only snap if near surface (not deep in pit)
    if (player.y >= floorYLevel - player.height) {
      if (isInPitSector) {
        // Player falls into the pit void! Cannot stand on ground here.
        player.isGrounded = false;
        // Grant one emergency air jump when sliding into a pit
        if (player.airJumpsLeft === 0) {
          player.airJumpsLeft = 1;
        }
      } else if (player.y <= floorYLevel - player.height + 8) {
        // Safe ground landing — only when at/near surface
        player.y = floorYLevel - player.height;
        player.vy = 0;
        player.isGrounded = true;
        player.airJumpsLeft = 0;
      }
    }

    // Move and update debris particles
    particlesRef.current.forEach((p, idx) => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.25; // gravity on particles
      p.life -= 0.025;
      p.alpha = Math.max(0, p.life);
      if (p.life <= 0) {
        particlesRef.current.splice(idx, 1);
      }
    });

    // Spawn Obstacles & Coins dynamically based on distance traveled
    if (distanceTraveledRef.current - lastSpawnDistanceRef.current > GAME_BALANCE.spawnIntervalBase + Math.random() * GAME_BALANCE.spawnIntervalRandom) {
      lastSpawnDistanceRef.current = distanceTraveledRef.current;

      const rand = Math.random();
      const dist = distanceTraveledRef.current;
      const comboChance = Math.min(0.5, Math.floor(dist / GAME_BALANCE.zoneInterval) * 0.05);

      // Emotion zone: cycles every 2000m
      const zoneIndex = Math.floor(dist / GAME_BALANCE.zoneInterval) % 3; // 0=自信, 1=焦虑, 2=爆发
      const zoneCrateRate = [0.2, 0.3, 0.5][zoneIndex];
      const zonePitRate = [0.2, 0.4, 0.1][zoneIndex];
      const zoneCoinRate = [0.45, 0.15, 0.25][zoneIndex];

      const crateThreshold = comboChance + zoneCrateRate;
      const pitThreshold = crateThreshold + zonePitRate;
      const coinThreshold = pitThreshold + zoneCoinRate;

      if (rand < comboChance) {
        // --- COMBO PATTERNS ---
        const pattern = Math.floor(Math.random() * 3);
        if (pattern === 0) {
          obstaclesRef.current.push({
            id: `pit_before_${Date.now()}`,
            type: 'PIT', x: W + 20, width: 100, height: 120, color: '#111119',
          });
          obstaclesRef.current.push({
            id: `crate_after_${Date.now()}`,
            type: 'CRATE', x: W + 155, width: 32, height: 38, color: '#c07038',
          });
          // Jump-guide arc over the pit → crate
          const guideN = 3;
          for (let g = 0; g < guideN; g++) {
            const t = (g + 1) / (guideN + 1);
            const xOff = t * 135; // pit(100) + gap(35) → crate
            const yOff = 4 * 72 * t * (1 - t);
            coinsListRef.current.push({
              id: `coin_guide_${Date.now()}_${g}`,
              x: W + 20 + xOff,
              y: floorYLevel - 18 - yOff,
              collected: false,
            });
          }
        } else if (pattern === 1) {
          // Parabolic coin arc — matches natural jump
          const arcN = 5;
          const arcSpan = 120;
          const arcPeak = 75;
          for (let i = 0; i < arcN; i++) {
            const t = i / (arcN - 1);
            const xOff = t * arcSpan;
            const yOff = 4 * arcPeak * t * (1 - t);
            coinsListRef.current.push({
              id: `coin_arc_${Date.now()}_${i}`,
              x: W + 20 + xOff,
              y: floorYLevel - 18 - yOff,
              collected: false,
            });
          }
          lastSpawnDistanceRef.current = distanceTraveledRef.current + 60;
        } else {
          obstaclesRef.current.push({
            id: `crate_wall1_${Date.now()}`,
            type: 'CRATE', x: W + 20, width: 32, height: 38, color: '#c07038',
          });
          obstaclesRef.current.push({
            id: `crate_wall2_${Date.now()}`,
            type: 'CRATE', x: W + 76, width: 32, height: 38, color: '#b5651d',
          });
        }
      } else if (rand < crateThreshold) {
        obstaclesRef.current.push({
          id: `crate_${Date.now()}`,
          type: 'CRATE', x: W + 20, width: 32, height: 38, color: '#c07038',
        });
      } else if (rand < pitThreshold) {
        // After 2000m, chance to spawn closely-spaced pit pairs (never 3)
        const pitPairChance = dist > GAME_BALANCE.zoneInterval ? Math.min(0.55, (dist - GAME_BALANCE.zoneInterval) / 5000) : 0;
        if (Math.random() < pitPairChance) {
          const gap = 60 + Math.random() * 100; // tight gap between pits
          const pitW = 70 + Math.random() * 30;
          const pitBWidth = pitW + Math.random() * 20;
          const pitAX = W + 20;
          const pitBX = W + 20 + pitW + gap;
          // Max combined width a double-jump can cross (with speed≥1.0)
          const maxPitWidth = 250;

          if (gap < 10) {
            // Overlapping pits → merge into one, no red divider
            const mergedWidth = Math.min(pitBX + pitBWidth - pitAX, maxPitWidth);
            obstaclesRef.current.push({
              id: `pit_merged_${Date.now()}`,
              type: 'PIT', x: pitAX, width: mergedWidth, height: 120, color: '#111119',
            });
            coinsListRef.current.push({
              id: `coin_gap_${Date.now()}`,
              x: pitAX + mergedWidth / 2, y: floorYLevel - 75, collected: false,
            });
          } else {
            obstaclesRef.current.push({
              id: `pit_pairA_${Date.now()}`,
              type: 'PIT', x: pitAX, width: pitW, height: 120, color: '#111119',
            });
            obstaclesRef.current.push({
              id: `pit_pairB_${Date.now()}`,
              type: 'PIT', x: pitBX, width: pitBWidth, height: 120, color: '#111119',
            });
            // Reward coin in the gap
            coinsListRef.current.push({
              id: `coin_gap_${Date.now()}`,
              x: W + 20 + pitW + gap / 2, y: floorYLevel - 75, collected: false,
            });
          }
        } else {
          // Single pit with jump-guide coin arc
          const pitW = 105;
          obstaclesRef.current.push({
            id: `pit_${Date.now()}`,
            type: 'PIT', x: W + 20, width: pitW, height: 120, color: '#111119',
          });
          // Arc of 3 coins tracing natural jump parabola over the pit
          const guideCoinCount = 3;
          for (let g = 0; g < guideCoinCount; g++) {
            const t = (g + 1) / (guideCoinCount + 1); // 0.25, 0.5, 0.75
            const xOff = t * pitW;
            // Parabola: y = 4*h*t*(1-t), peaks at 75px
            const yOff = 4 * 70 * t * (1 - t);
            coinsListRef.current.push({
              id: `coin_${Date.now()}_${g}`,
              x: W + 20 + xOff,
              y: floorYLevel - 18 - yOff,
              collected: false,
            });
          }
        }
      } else if (rand < coinThreshold) {
        // Jump-arc coin trail: parabolic pattern = natural jump trajectory
        const coinCount = 5 + Math.floor(Math.random() * 4); // 5-8 coins
        const arcSpanX = 120 + Math.random() * 80;
        const arcPeakY = 65 + Math.random() * 55; // peak height above ground
        for (let i = 0; i < coinCount; i++) {
          const t = i / (coinCount - 1); // 0 → 1
          const xOff = t * arcSpanX;
          const yOff = 4 * arcPeakY * t * (1 - t);
          coinsListRef.current.push({
            id: `coin_${Date.now()}_${i}`,
            x: W + 20 + xOff,
            y: floorYLevel - 18 - yOff,
            collected: false,
          });
        }
      }
    }

    // --- SURPRISE EVENTS ---

    // Power-up spawn: rare (~0.025% per frame), magnet appears 3x more
    if (distanceTraveledRef.current > 150 && Math.random() < 0.00025) {
      const weighted: PowerUpType[] = ['TRIPLE_JUMP', 'MAGNET', 'MAGNET', 'MAGNET', 'RAINBOW_GLOW', 'STAR_TRAIL'];
      const t = weighted[Math.floor(Math.random() * weighted.length)];
      const def = POWERUP_DEFS[t];
      powerUpsRef.current.push({
        id: `pu_${Date.now()}_${Math.random().toString(36).slice(2,5)}`,
        type: t,
        x: W + Math.random() * 100,
        y: floorYLevel - 70 - Math.random() * 80,
        collected: false,
        icon: def.icon,
        label: def.label,
        color: def.color,
      });
    }

    // Coin rain: 0.08% chance per frame
    if (Math.random() < 0.0008) {
      const now = Date.now();
      const coinSize = 10;

      if (coinRainPhaseRef.current === 0) {
        // First rain: spell out "v2.30"
        coinRainPhaseRef.current = 1;
        const startX = W + 20;
        const startY = 100;
        const charV  = [[0,0],[0,4],[1,0],[1,4],[2,0],[2,4],[3,0],[3,4],[4,1],[4,3],[5,2]];
        const char2  = [[0,1],[0,2],[0,3],[1,0],[1,4],[2,4],[3,3],[4,2],[5,1],[6,0],[6,1],[6,2],[6,3],[6,4]];
        const charDot = [[4,1],[5,1]];
        const char3  = [[0,1],[0,2],[0,3],[1,0],[1,4],[2,4],[3,2],[3,3],[4,0],[4,4],[5,0],[5,4],[6,1],[6,2],[6,3]];
        const char0  = [[0,1],[0,2],[0,3],[1,0],[1,4],[2,0],[2,4],[3,0],[3,4],[4,0],[4,4],[5,0],[5,4],[6,1],[6,2],[6,3]];
        const chars: [number, number, number[][]][] = [
          [0, 0, charV],
          [6, 0, char2],
          [13, 0, charDot],
          [19, 0, char3],
          [26, 0, char0],
        ];
        let id = 0;
        chars.forEach(([colOffset, _rowOffset, bitmap]) => {
          bitmap.forEach(([r, c]) => {
            coinsListRef.current.push({
              id: `rain_${now}_${id++}`,
              x: startX + (colOffset + c) * coinSize,
              y: startY + r * coinSize,
              collected: false,
            });
          });
        });
      } else if (coinRainPhaseRef.current === 1) {
        // Second rain: spell out "hello~"
        coinRainPhaseRef.current = 2;
        const startX = W + 20;
        const startY = 100;
        // 5-col x 7-row pixel font
        const charH: number[][] = [[0,0],[0,4],[1,0],[1,4],[2,0],[2,4],[3,0],[3,1],[3,2],[3,3],[3,4],[4,0],[4,4],[5,0],[5,4],[6,0],[6,4]];
        const charE: number[][] = [[1,1],[1,2],[1,3],[2,0],[2,4],[3,0],[3,1],[3,2],[3,3],[3,4],[4,0],[5,0],[5,4],[6,1],[6,2],[6,3]];
        const charL: number[][] = [[0,0],[1,0],[2,0],[3,0],[4,0],[5,0],[6,0],[6,1],[6,2],[6,3]];
        const charO: number[][] = [[1,1],[1,2],[1,3],[2,0],[2,4],[3,0],[3,4],[4,0],[4,4],[5,0],[5,4],[6,1],[6,2],[6,3]];
        const charTilde: number[][] = [[3,2],[4,1],[4,3],[5,0],[5,4]];
        const helloChars: [number, number, number[][]][] = [
          [0, 0, charH],
          [6, 0, charE],
          [12, 0, charL],
          [18, 0, charL],
          [24, 0, charO],
          [30, 0, charTilde],
        ];
        let id = 0;
        helloChars.forEach(([colOffset, _rowOffset, bitmap]) => {
          bitmap.forEach(([r, c]) => {
            coinsListRef.current.push({
              id: `rain_${now}_${id++}`,
              x: startX + (colOffset + c) * coinSize,
              y: startY + r * coinSize,
              collected: false,
            });
          });
        });
      } else {
        // Subsequent rains: 50% word, 50% geometric
        const pixFont: Record<string, string> = {
          a: '0111010001111111000110001100011000110001',
          b: '1111010001100011111010001100011000111110',
          c: '0111010001100001000010000100011000101110',
          d: '1111010001100011000110001100011000111110',
          e: '1111110000100001111010000100001000011111',
          f: '1111110000100001111010000100001000010000',
          g: '0111010001100001011110001100011000101110',
          h: '1000110001100011111110001100011000110001',
          i: '0111000100001000010000100001000010001110',
          j: '0011100010000100001000010000100010011000',
          k: '1000110010101001100010100100101001010001',
          l: '1000010000100001000010000100001000011110',
          m: '1000111011101011010110001100011000110001',
          n: '1000111001101011001110001100011000110001',
          o: '0111010001100011000110001100011000101110',
          p: '1111010001100011111010000100001000010000',
          r: '1111010001100011111010100100101001010001',
          s: '0111010001100000111000001000110001011100',
          t: '1111100100001000010000100001000010000100',
          u: '1000110001100011000110001100011000101110',
          w: '1000110001100011000110101101011010101010',
          x: '1000110001010100010001010010001100010001',
          y: '1000110001010100010000100001000010000100',
          z: '1111100001000100010001000100001000011111',
        };
        function spellWord(word: string, startX: number, startY: number, size: number) {
          let id = 0;
          let colOff = 0;
          for (const ch of word) {
            const bitmap = pixFont[ch];
            if (!bitmap) { colOff += 6; continue; }
            for (let row = 0; row < 7; row++) {
              for (let col = 0; col < 5; col++) {
                if (bitmap[row * 5 + col] === '1') {
                  coinsListRef.current.push({
                    id: `rain_${now}_${id++}`,
                    x: startX + (colOff + col) * size,
                    y: startY + row * size,
                    collected: false,
                  });
                }
              }
            }
            colOff += 6;
          }
        }

        const words = ['wow','lol','gg','win','yes','cool','nice','fun','pro','fire','jump','boss','epic','good','omg','ggwp','ha','yo','go','ace'];
        if (Math.random() < 0.5) {
          // Spell a random word
          const word = words[Math.floor(Math.random() * words.length)];
          spellWord(word, W + 20, 100, 10);
        } else {
          // Geometric patterns
          const pattern = Math.floor(Math.random() * 4);
          const cx = W + 180;
          const cy = 150;
          const n = 14 + Math.floor(Math.random() * 8);

        if (pattern === 0) {
          const a = 0.004 + Math.random() * 0.004;
          const span = 200 + Math.random() * 100;
          for (let i = 0; i < n; i++) {
            const t = (i / (n - 1) - 0.5) * 2;
            const px = cx + t * span;
            const py = cy + a * (px - cx) * (px - cx) * 0.5 - 40 - Math.random() * 20;
            coinsListRef.current.push({ id: `rain_${now}_${i}`, x: px, y: Math.max(40, py), collected: false });
          }
        } else if (pattern === 1) {
          const rows = Math.ceil(Math.sqrt(n));
          const spacing = 28;
          let count = 0;
          for (let row = 0; row < rows && count < n; row++) {
            const colsInRow = row <= Math.floor(rows / 2) ? row + 1 : rows - row;
            const sX = cx - (colsInRow - 1) * spacing / 2;
            for (let col = 0; col < colsInRow && count < n; col++) {
              coinsListRef.current.push({
                id: `rain_${now}_${count}`,
                x: sX + col * spacing + (Math.random() - 0.5) * 8,
                y: cy - row * spacing * 0.8 + (Math.random() - 0.5) * 8,
                collected: false,
              });
              count++;
            }
          }
        } else if (pattern === 2) {
          const amp = 50 + Math.random() * 60;
          const freq = 0.02 + Math.random() * 0.02;
          const sX = cx - 180;
          for (let i = 0; i < n; i++) {
            const px = sX + i * (360 / (n - 1));
            const py = cy + Math.sin((px - cx) * freq) * amp;
            coinsListRef.current.push({ id: `rain_${now}_${i}`, x: px, y: Math.max(40, py), collected: false });
          }
        } else {
          const maxR = 120 + Math.random() * 40;
          for (let i = 0; i < n; i++) {
            const t = i / (n - 1);
            const r = t * maxR;
            const angle = t * Math.PI * 4 + (Math.random() - 0.5) * 0.3;
            coinsListRef.current.push({
              id: `rain_${now}_${i}`,
              x: cx + Math.cos(angle) * r,
              y: cy + Math.sin(angle) * r * 0.6,
              collected: false,
            });
          }
        }
        } // end geometric patterns else
      }
    }

    // Giant crate: 0.1% chance per spawn
    if (Math.random() < 0.001) {
      obstaclesRef.current.push({
        id: `giant_${Date.now()}`,
        type: 'CRATE',
        x: W + 20,
        width: 52,
        height: 58,
        color: '#8b0000',
      });
    }

    // Ceiling spikes: appear after 200m, zone-dependent chance
    const spikeZoneIdx = Math.floor(distanceTraveledRef.current / GAME_BALANCE.zoneInterval) % 3;
    const spikeZoneChance = [0.00015, 0.00025, 0.0001][spikeZoneIdx]; // 自信/焦虑/爆发
    if (distanceTraveledRef.current > 200 && Math.random() < spikeZoneChance) {
      const spikeDepth = 170 + Math.random() * 120; // how far down from ceiling (170-290px)
      const spikeWidth = 60 + Math.random() * 140; // cluster width
      obstaclesRef.current.push({
        id: `spike_${Date.now()}`,
        type: 'CEILING_SPIKE',
        x: W + Math.random() * 60,
        width: spikeWidth,
        height: spikeDepth,
        color: '#8a8a9a',
      });
    }

    // Scroll obstacles and detect interaction collisions
    obstaclesRef.current.forEach((obs, idx) => {
      obs.x -= speed;

      // Cull stale off-screen obstacles
      if (obs.x + obs.width < -100) {
        obstaclesRef.current.splice(idx, 1);
        return;
      }

      // Check box colliders
      if (obs.type === 'CRATE' && !obs.isShattered) {
        const pxLeft = player.x;
        const pxRight = player.x + player.width;
        const pxTop = player.y;
        const pxBottom = player.y + player.height;

        const oxLeft = obs.x;
        const oxRight = obs.x + obs.width;
        const oxTop = floorYLevel - obs.height;
        const oxBottom = floorYLevel;

        // Standing on top: both feet must be over the crate surface
        const feetOnCrate = (
          pxRight > oxLeft + 8 &&
          pxLeft < oxRight - 8 &&
          pxBottom >= oxTop - 1 &&
          pxBottom <= oxTop + 5 &&
          player.vy >= 0
        );

        if (feetOnCrate) {
          player.y = oxTop - player.height;
          player.vy = 0;
          player.isGrounded = true;
          player.airJumpsLeft = 0;
        }

        // Side collision: only when NOT standing on this crate
        if (!feetOnCrate) {
          const sideCollision = (
            pxLeft < oxRight &&
            pxRight > oxLeft &&
            pxTop < oxBottom &&
            pxBottom > oxTop + 6
          );

          if (sideCollision) {
            if (player.shieldActive) {
              obs.isShattered = true;
              player.shatteredCount++;
              updateMiniObj('shatter_crates');
              comboCountRef.current++;
              comboTimerRef.current = GAME_BALANCE.comboTimerFrames;
              if (comboCountRef.current > maxComboRef.current) {
                maxComboRef.current = comboCountRef.current;
              }
              // Shield shatter costs extra oxygen (bigger crate = more drain)
              const crateCost = obs.width > 45 ? GAME_BALANCE.shieldCostLargeCrate : obs.width > 32 ? GAME_BALANCE.shieldCostMediumCrate : GAME_BALANCE.shieldCostSmallCrate;
              oxygenRef.current = Math.max(0, oxygenRef.current - crateCost);
              makeShatterParticles(obs.x, oxTop, '#a05a2c');
              audio.playBlockShatter();
              if (obs.width > 40) {
                scoreRef.current += 5; // giant crate bonus
              }
            } else {
              // Snap player to left of crate to avoid multi-frame dragging
              player.x = obs.x - player.width;
              player.pushedAlertTick = 12;
              if (player.x < GAME_BALANCE.playerDeathEdgeX) {
                triggerDeathState('crushed');
                return;
              }
            }
          }
        }
      }

      // Ceiling spike collision: player's head hits spikes when jumping
      if (obs.type === 'CEILING_SPIKE' && !obs.isShattered) {
        const pxLeft = player.x;
        const pxRight = player.x + player.width;
        const pxTop = player.y; // top of player

        const sxLeft = obs.x;
        const sxRight = obs.x + obs.width;
        const sxBottom = obs.height; // spike tip extends down to this y

        // Player head enters the spike zone
        if (pxRight > sxLeft + 4 && pxLeft < sxRight - 4 && pxTop <= sxBottom) {
          if (player.shieldActive) {
            // Shield shatters the spike, but costs oxygen
            obs.isShattered = true;
            oxygenRef.current = Math.max(0, oxygenRef.current - GAME_BALANCE.shieldCostCeilingSpike);
            makeShatterParticles(obs.x + obs.width / 2, sxBottom, '#8a8a9a');
            audio.playBlockShatter();
          } else {
            triggerDeathState('impaled');
            return;
          }
        }
      }
    });

    // Check if player has fallen deep through the pit
    if (player.y > floorYLevel + GAME_BALANCE.pitDeathDepth) {
      triggerDeathState('fell');
      return;
    }

    // Move player back home gradually if not currently being pushed
    if (player.x < GAME_BALANCE.playerX) {
      player.x += GAME_BALANCE.playerReCenterSpeed;
      if (player.x > GAME_BALANCE.playerX) player.x = GAME_BALANCE.playerX;
    }

    // Scroll and resolve Coins capture
    coinsListRef.current.forEach((c, idx) => {
      c.x -= speed;

      // Cull offscreen stale coins
      if (c.x < -50) {
        coinsListRef.current.splice(idx, 1);
        return;
      }

      // Collision box check
      if (!c.collected) {
        const pdMaxY = player.y + player.height;
        const pdMinY = player.y;
        
        const distToPlayer = Math.sqrt(
          Math.pow((player.x + 14) - c.x, 2) + Math.pow((player.y + 18) - c.y, 2)
        );

        if (distToPlayer < 24) {
          c.collected = true;
          coinsRef.current += 1;
          setCoins(coinsRef.current);
          updateMiniObj('collect_coins');
          audio.playCoin();
          
          // Tiny shiny coin particles
          for (let pIdx = 0; pIdx < 5; pIdx++) {
            particlesRef.current.push({
              x: c.x,
              y: c.y,
              vx: (Math.random() - 0.5) * 4,
              vy: (Math.random() - 0.5) * 4 - 1,
              size: Math.random() * 2.5 + 1.5,
              color: '#ffd700',
              alpha: 1,
              life: 0.8,
            });
          }
        }
      }
    });

    // Scroll and resolve Power-ups
    powerUpsRef.current.forEach((pu, idx) => {
      pu.x -= speed;
      if (pu.x < -50) { powerUpsRef.current.splice(idx, 1); return; }
      if (!pu.collected) {
        const dist = Math.sqrt(
          Math.pow((player.x + 14) - pu.x, 2) + Math.pow((player.y + 18) - pu.y, 2)
        );
        if (dist < 26) {
          pu.collected = true;
          activePowerUpRef.current = pu.type;
          powerUpExpiryRef.current = Date.now() + POWERUP_DEFS[pu.type].durationSec * 1000;
          audio.playCoin();
          // Celebration particles
          for (let i = 0; i < 12; i++) {
            particlesRef.current.push({
              x: pu.x, y: pu.y,
              vx: (Math.random() - 0.5) * 6,
              vy: (Math.random() - 0.5) * 6 - 2,
              size: Math.random() * 4 + 3,
              color: pu.color,
              alpha: 1, life: 0.9,
            });
          }
        }
      }
    });

    // Magnet: pull nearby coins toward player
    if (activePowerUpRef.current === 'MAGNET') {
      const px = player.x + player.width / 2;
      const py = player.y + player.height / 2;
      coinsListRef.current.forEach(c => {
        if (!c.collected) {
          const dx = px - c.x;
          const dy = py - c.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 180 && dist > 5) {
            const force = 2.5 / dist;
            c.x += dx * force;
            c.y += dy * force;
          }
        }
      });
    }

    // Update animations frames
    player.animationTick++;
    if (player.animationTick % 8 === 0) {
      player.frame = (player.frame + 1) % 4;
    }


    } // end if (!isPaused) — rendering still happens below when paused

    // --- 2. RENDER GRAPHICS CANVAS ---
    // Smooth zone transition: blend over last 500m of each 2000m zone
    const zoneProgress = (distanceTraveledRef.current % GAME_BALANCE.zoneInterval) / GAME_BALANCE.zoneInterval;
    const blendWidth = 500 / GAME_BALANCE.zoneInterval; // last 500m = 25% of zone
    let blendT = 0;
    if (zoneProgress > 1 - blendWidth) {
      blendT = (zoneProgress - (1 - blendWidth)) / blendWidth;
    }
    const zoneA = Math.floor(distanceTraveledRef.current / GAME_BALANCE.zoneInterval) % 3;
    const zoneB = (zoneA + 1) % 3;

    function lerpHex(a: string, b: string, t: number): string {
      const ah = parseInt(a.slice(1), 16);
      const bh = parseInt(b.slice(1), 16);
      const ar = (ah >> 16) & 0xff, ag = (ah >> 8) & 0xff, ab = ah & 0xff;
      const br = (bh >> 16) & 0xff, bg = (bh >> 8) & 0xff, bb = bh & 0xff;
      const rr = Math.round(ar + (br - ar) * t);
      const rg = Math.round(ag + (bg - ag) * t);
      const rb = Math.round(ab + (bb - ab) * t);
      return '#' + ((rr << 16) | (rg << 8) | rb).toString(16).padStart(6, '0');
    }

    const zoneBgColors = ['#0d1b3e', '#1e0d12', '#150b2e'];
    const zoneMountainColors = ['#15224a', '#250f17', '#1d0c3d'];
    const zoneStarColors = ['#ffdd88', '#ff6666', '#cc88ff'];
    const zoneGroundColors = ['#1e2d4a', '#2d151d', '#1e103d'];

    const curBg = lerpHex(zoneBgColors[zoneA], zoneBgColors[zoneB], blendT);
    const curMountain = lerpHex(zoneMountainColors[zoneA], zoneMountainColors[zoneB], blendT);
    const curStar = lerpHex(zoneStarColors[zoneA], zoneStarColors[zoneB], blendT);
    const curGround = lerpHex(zoneGroundColors[zoneA], zoneGroundColors[zoneB], blendT);

    ctx.fillStyle = curBg;
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = curStar;
    for (let sIdx = 0; sIdx < 40; sIdx++) {
      const starX = (sIdx * 37 - (distanceTraveledRef.current * 0.2)) % (W + 100);
      const starY = (sIdx * 19) % (H - 200) + 15;
      const size = sIdx % 4 === 0 ? 3 : 1.5;
      
      // Twinkle flicker logic
      if ((timestamp + sIdx * 50) % 2000 > 1800) {
        continue;
      }
      ctx.fillRect(starX, starY, size, size);
    }

    // Parallax Mountain range layer 1 (Triangle wave outline)
    ctx.fillStyle = curMountain;
    ctx.beginPath();
    ctx.moveTo(0, H);
    for (let mIdx = 0; mIdx <= W + 100; mIdx += 60) {
      const offsetX = -((distanceTraveledRef.current * 0.45) % 60);
      const mH = 140 + Math.sin(mIdx + (distanceTraveledRef.current * 0.003)) * 30 + (mIdx % 3 === 0 ? 10 : 0);
      ctx.lineTo(mIdx + offsetX, floorYLevel - mH);
    }
    ctx.lineTo(W, H);
    ctx.closePath();
    ctx.fill();

    // Parallax Mountain range layer 2 (Forest lines closer)
    ctx.fillStyle = '#21213f';
    ctx.beginPath();
    ctx.moveTo(0, H);
    for (let mIdx = 0; mIdx <= W + 100; mIdx += 40) {
      const offsetX = -((distanceTraveledRef.current * 1.1) % 40);
      const mH = 80 + Math.cos(mIdx * 0.05) * 15;
      ctx.lineTo(mIdx + offsetX, floorYLevel - mH);
    }
    ctx.lineTo(W, H);
    ctx.closePath();
    ctx.fill();

    const renderFloorWithPits = () => {
      // Collect pit regions, sort left→right, then merge overlapping ones
      const rawPits = obstaclesRef.current
        .filter(o => o.type === 'PIT')
        .map(o => ({ left: o.x, right: o.x + o.width }))
        .sort((a, b) => a.left - b.left);

      // Merge pits whose red edges overlap (gap < 6px)
      const pitRegions: { left: number; right: number }[] = [];
      for (const pit of rawPits) {
        const last = pitRegions[pitRegions.length - 1];
        if (last && pit.left - last.right < 6) {
          last.right = Math.max(last.right, pit.right);
        } else {
          pitRegions.push({ left: pit.left, right: pit.right });
        }
      }

      // Base ground surface
      ctx.fillStyle = curGround;
      ctx.fillRect(0, floorYLevel, W, H - floorYLevel);

      // Draw pits / voids first
      pitRegions.forEach(pit => {
        ctx.fillStyle = '#0f0f1c';
        ctx.fillRect(pit.left, floorYLevel, pit.right - pit.left, H - floorYLevel);

        // Red cliff edges (drawn deeper into the void for visibility)
        ctx.fillStyle = '#ff3366';
        ctx.fillRect(pit.left - 3, floorYLevel, 3, H - floorYLevel);
        ctx.fillRect(pit.right, floorYLevel, 3, H - floorYLevel);

        // Pit warning text
        ctx.font = '8px "Press Start 2P"';
        ctx.fillStyle = 'rgba(255, 51, 102, 0.55)';
        ctx.fillText('⚠ VOID', pit.left + 8, floorYLevel + 35);
      });

      // Neon green top line — only on solid ground, skip pits
      ctx.fillStyle = '#39ff14';
      let greenStart = 0;
      pitRegions.forEach(pit => {
        const pL = Math.max(0, pit.left);
        const pR = Math.min(W, pit.right);
        if (pL > greenStart) {
          ctx.fillRect(greenStart, floorYLevel - 2, pL - greenStart, 4);
        }
        greenStart = Math.max(greenStart, pR);
      });
      if (greenStart < W) {
        ctx.fillRect(greenStart, floorYLevel - 2, W - greenStart, 4);
      }

      // Vertical grid marks — skip pits
      ctx.fillStyle = 'rgba(57, 255, 20, 0.15)';
      for (let gX = 0; gX <= W + 100; gX += 40) {
        const offset = -(distanceTraveledRef.current % 40);
        const markX = gX + offset;
        const insidePit = pitRegions.some(p => markX > p.left + 3 && markX < p.right - 3);
        if (!insidePit) {
          ctx.fillRect(markX, floorYLevel + 4, 1, H - floorYLevel - 4);
        }
      }
    };
    renderFloorWithPits();

    // Drawing Coins
    coinsListRef.current.forEach((c) => {
      if (c.collected) return;
      ctx.save();
      ctx.translate(c.x, c.y);
      
      // Retro spin width calculation
      const spinWidth = 14 * Math.abs(Math.sin(timestamp * 0.008));
      
      // Neon Golden layout
      ctx.fillStyle = '#ffcc00';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      
      ctx.beginPath();
      ctx.ellipse(0, 0, spinWidth / 2, 7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      
      // Inside 'C' emboss
      ctx.fillStyle = '#cca300';
      ctx.font = '8px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      if (spinWidth > 8) {
        ctx.fillText('$', 0, 0);
      }
      ctx.restore();
    });

    // Drawing Power-ups
    powerUpsRef.current.forEach((pu) => {
      if (pu.collected) return;
      const bobY = Math.sin(timestamp * 0.004 + pu.x * 0.1) * 6;
      const px = pu.x;
      const py = pu.y + bobY;
      // Glow aura
      const glowGrad = ctx.createRadialGradient(px, py, 4, px, py, 20);
      glowGrad.addColorStop(0, pu.color);
      glowGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(px, py, 20, 0, Math.PI * 2);
      ctx.fill();
      // Icon background
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.beginPath();
      ctx.arc(px, py, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = pu.color;
      ctx.lineWidth = 2;
      ctx.stroke();
      // Icon
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(pu.icon, px, py - 1);
      // Label below
      ctx.font = '7px "Press Start 2P"';
      ctx.fillStyle = pu.color;
      ctx.fillText(pu.label, px, py + 18);
      ctx.textAlign = 'start';
    });

    // Drawing Obstacles (Wood Crates)
    obstaclesRef.current.forEach((obs) => {
      if (obs.type === 'CRATE' && !obs.isShattered) {
        const boxY = floorYLevel - obs.height;

        // Crate body base (Brown wood tone)
        ctx.fillStyle = '#a05a2c';
        ctx.fillRect(obs.x, boxY, obs.width, obs.height);

        // Inner borders
        ctx.strokeStyle = '#5a3216';
        ctx.lineWidth = 3;
        ctx.strokeRect(obs.x + 1.5, boxY + 1.5, obs.width - 3, obs.height - 3);

        ctx.strokeStyle = '#8a4d25';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(obs.x + 4, boxY + 4, obs.width - 8, obs.height - 8);

        // Crisscross plank lines
        ctx.beginPath();
        ctx.moveTo(obs.x + 4, boxY + 4);
        ctx.lineTo(obs.x + obs.width - 4, boxY + obs.height - 4);
        ctx.moveTo(obs.x + obs.width - 4, boxY + 4);
        ctx.lineTo(obs.x + 4, boxY + obs.height - 4);
        ctx.stroke();

        // White highlighting corner pixels
        ctx.fillStyle = 'rgba(255,255,255,0.25)';
        ctx.fillRect(obs.x + 2, boxY + 2, 3, 3);
        ctx.fillRect(obs.x + obs.width - 5, boxY + 2, 3, 3);
      }
    });

    // Drawing Ceiling Spikes (hanging from top of screen)
    obstaclesRef.current.forEach((obs) => {
      if (obs.type === 'CEILING_SPIKE' && !obs.isShattered) {
        const spikeTipY = obs.height;
        const spikeCount = Math.max(1, Math.floor(obs.width / 28));
        const spacing = obs.width / spikeCount;
        const baseWidth = 22;

        for (let i = 0; i < spikeCount; i++) {
          const cx = obs.x + i * spacing + spacing / 2;
          const tipY = spikeTipY + (Math.random() - 0.5) * 12; // slight variation

          // Spike shadow
          ctx.fillStyle = 'rgba(0,0,0,0.35)';
          ctx.beginPath();
          ctx.moveTo(cx - baseWidth/2 + 4, 2);
          ctx.lineTo(cx + 2, tipY + 2);
          ctx.lineTo(cx + baseWidth/2, 2);
          ctx.closePath();
          ctx.fill();

          // Main spike body - dark metallic
          ctx.fillStyle = '#6b6b7a';
          ctx.beginPath();
          ctx.moveTo(cx - baseWidth/2, 0);
          ctx.lineTo(cx, tipY);
          ctx.lineTo(cx + baseWidth/2, 0);
          ctx.closePath();
          ctx.fill();

          // Lighter edge highlight
          ctx.fillStyle = '#9a9aae';
          ctx.beginPath();
          ctx.moveTo(cx - baseWidth/2, 0);
          ctx.lineTo(cx, tipY);
          ctx.lineTo(cx - baseWidth/2 + 4, 0);
          ctx.closePath();
          ctx.fill();

          // Blood-red tip
          const tipGlow = 10 + Math.sin(timestamp * 0.015 + i) * 3;
          ctx.fillStyle = '#cc2233';
          ctx.beginPath();
          ctx.moveTo(cx - 4, tipY - tipGlow);
          ctx.lineTo(cx, tipY);
          ctx.lineTo(cx + 4, tipY - tipGlow);
          ctx.closePath();
          ctx.fill();

          // Bright red drip point
          ctx.fillStyle = '#ff3344';
          ctx.beginPath();
          ctx.arc(cx, tipY, 2, 0, Math.PI * 2);
          ctx.fill();

          // Ceiling mount bracket
          ctx.fillStyle = '#4a4a58';
          ctx.fillRect(cx - baseWidth/2 - 2, 0, baseWidth + 4, 5);
          ctx.fillStyle = '#5a5a6a';
          ctx.fillRect(cx - baseWidth/2, 0, baseWidth, 4);

          // Bracket bolts
          ctx.fillStyle = '#333340';
          ctx.fillRect(cx - baseWidth/2 + 3, 1, 3, 2);
          ctx.fillRect(cx + baseWidth/2 - 6, 1, 3, 2);
        }
      }
    });

    // Drawing particle debris
    particlesRef.current.forEach((p) => {
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.alpha;
      ctx.fillRect(p.x, p.y, p.size, p.size);
    });
    ctx.globalAlpha = 1.0; // Reset

    // --- DRAW SUITED BUSINESSMAN CHARACTER ---
    const animFrame = player.frame;
    const isJumping = !player.isGrounded && player.vy < 0;
    const isFalling = !player.isGrounded && player.vy >= 0;
    const shirtColor = '#f5f5f0';

    ctx.save();
    ctx.translate(player.x, player.y);

    // Flash red when pushed
    const flashOn = player.pushedAlertTick > 0 && Math.floor(timestamp / 50) % 2 === 0;
    const faceColor = flashOn ? '#ff6666' : skin.skinColor;
    const hairColor = flashOn ? '#330000' : skin.hairColor;
    const suitCol = flashOn ? '#4a1010' : skin.suitColor;
    const tieCol = flashOn ? '#ff0000' : skin.visorColor;

    // --- HEAD (y: 0-10) ---
    // Hair cap
    ctx.fillStyle = hairColor;
    ctx.fillRect(4, 0, 20, 3);
    // Hair left sideburn
    ctx.fillRect(3, 1, 3, 8);
    // Hair right sideburn
    ctx.fillRect(22, 1, 3, 8);
    // Face
    ctx.fillStyle = faceColor;
    ctx.fillRect(5, 3, 18, 7);
    // Glasses / cyber visor
    ctx.fillStyle = tieCol;
    ctx.fillRect(14, 5, 8, 2);
    // Mouth (subtle)
    ctx.fillStyle = '#c09878';
    ctx.fillRect(12, 8.5, 4, 1);

    // --- NECK ---
    ctx.fillStyle = faceColor;
    ctx.fillRect(11, 10, 6, 2);

    // --- UPPER BODY (y: 11-23): Suit jacket ---
    // Jacket left side
    ctx.fillStyle = suitCol;
    ctx.fillRect(3, 11, 10, 12);
    // Jacket right side
    ctx.fillRect(15, 11, 10, 12);
    // Jacket shoulders (slightly wider)
    ctx.fillRect(2, 11, 3, 4);
    ctx.fillRect(23, 11, 3, 4);

    // White shirt collar V
    ctx.fillStyle = shirtColor;
    ctx.fillRect(10, 11, 8, 3);

    // Tie
    ctx.fillStyle = tieCol;
    ctx.fillRect(12, 14, 4, 7);

    // Shirt visible below tie
    ctx.fillStyle = shirtColor;
    ctx.fillRect(10, 20, 8, 3);

    // Jacket bottom (covers shirt sides)
    ctx.fillStyle = suitCol;
    ctx.fillRect(3, 18, 7, 5);
    ctx.fillRect(18, 18, 7, 5);

    // Belt
    ctx.fillStyle = hairColor;
    ctx.fillRect(5, 23, 18, 2);
    // Belt buckle
    ctx.fillStyle = tieCol;
    ctx.fillRect(12, 23, 4, 2);

    // --- LOWER BODY (y: 25-35): Dress pants ---
    ctx.fillStyle = suitCol;

    if (isJumping) {
      // Knees up
      ctx.fillRect(4, 25, 8, 5);
      ctx.fillRect(16, 25, 8, 5);
      // Shoes
      ctx.fillStyle = hairColor;
      ctx.fillRect(3, 30, 9, 3);
      ctx.fillRect(16, 30, 9, 3);
    } else if (isFalling) {
      // Legs extended down
      ctx.fillRect(5, 25, 7, 10);
      ctx.fillRect(16, 25, 7, 10);
      // Shoes
      ctx.fillStyle = hairColor;
      ctx.fillRect(4, 33, 9, 3);
      ctx.fillRect(15, 33, 9, 3);
    } else {
      // Running stride animation
      if (animFrame === 0) {
        ctx.fillRect(5, 25, 7, 8);
        ctx.fillStyle = hairColor;
        ctx.fillRect(4, 33, 9, 3);
        ctx.fillStyle = suitCol;
        ctx.fillRect(17, 25, 7, 5);
        ctx.fillStyle = hairColor;
        ctx.fillRect(16, 30, 9, 3);
      } else if (animFrame === 1) {
        ctx.fillRect(6, 25, 6, 8);
        ctx.fillStyle = hairColor;
        ctx.fillRect(5, 33, 9, 3);
        ctx.fillStyle = suitCol;
        ctx.fillRect(16, 25, 6, 8);
        ctx.fillStyle = hairColor;
        ctx.fillRect(16, 33, 9, 3);
      } else if (animFrame === 2) {
        ctx.fillRect(5, 25, 7, 5);
        ctx.fillStyle = hairColor;
        ctx.fillRect(4, 30, 9, 3);
        ctx.fillStyle = suitCol;
        ctx.fillRect(17, 25, 7, 8);
        ctx.fillStyle = hairColor;
        ctx.fillRect(16, 33, 9, 3);
      } else {
        ctx.fillRect(6, 25, 6, 6);
        ctx.fillStyle = hairColor;
        ctx.fillRect(5, 31, 9, 3);
        ctx.fillStyle = suitCol;
        ctx.fillRect(16, 25, 6, 6);
        ctx.fillStyle = hairColor;
        ctx.fillRect(16, 31, 9, 3);
      }
    }

    // --- SHIELD EFFECT ---
    if (player.shieldActive) {
      ctx.strokeStyle = 'rgba(0, 255, 255, 0.85)';
      ctx.lineWidth = Math.sin(timestamp * 0.02) * 2 + 3;
      ctx.beginPath();
      ctx.arc(14, 17, 32, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = 'rgba(0, 255, 255, 0.06)';
      ctx.fill();
      ctx.font = '6px "Press Start 2P"';
      ctx.fillStyle = '#00ffff';
      ctx.textAlign = 'center';
      if (Math.floor(timestamp / 100) % 3 === 0) {
        ctx.fillText('SHIELD', 14, -10);
      }
    }

    // --- DOUBLE JUMP FLASH EFFECT ---
    if (player.doubleJumpFlash > 0) {
      const flashAlpha = player.doubleJumpFlash / 12;
      // Expanding ring
      const ringRadius = (12 - player.doubleJumpFlash) * 4 + 8;
      ctx.strokeStyle = `rgba(255, 255, 255, ${flashAlpha * 0.7})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(14, 17, ringRadius, 0, Math.PI * 2);
      ctx.stroke();
      // Flash overlay
      ctx.fillStyle = `rgba(255, 255, 200, ${flashAlpha * 0.15})`;
      ctx.fillRect(2, 0, 24, player.height);
    }

    // --- AIR JUMP AVAILABLE INDICATOR ---
    if (player.airJumpsLeft > 0 && !player.isGrounded) {
      const bobbleY = Math.sin(timestamp * 0.06) * 3;
      const isTriple = activePowerUpRef.current === 'TRIPLE_JUMP' && player.airJumpsLeft >= 2;
      ctx.fillStyle = isTriple ? 'rgba(255, 102, 0, 0.8)' : 'rgba(255, 204, 0, 0.7)';
      ctx.font = '7px "Press Start 2P"';
      ctx.textAlign = 'center';
      ctx.fillText(isTriple ? '⬆⬆⬆' : '⬆⬆', 14, player.height + 12 + bobbleY);
    }

    // --- ACTIVE POWER-UP VISUALS ---
    // Star trail: leave sparkles behind player
    if (activePowerUpRef.current === 'STAR_TRAIL' && player.animationTick % 3 === 0) {
      particlesRef.current.push({
        x: player.x + Math.random() * player.width,
        y: player.y + Math.random() * player.height,
        vx: -1 - Math.random() * 2,
        vy: (Math.random() - 0.5) * 2,
        size: Math.random() * 3 + 1.5,
        color: Math.random() > 0.5 ? '#ffdd44' : '#ffffff',
        alpha: 0.8,
        life: 0.5,
      });
    }
    // Rainbow glow: cycling hue overlay
    if (activePowerUpRef.current === 'RAINBOW_GLOW') {
      const hue = (timestamp * 0.3) % 360;
      ctx.fillStyle = `hsla(${hue}, 80%, 60%, 0.2)`;
      ctx.fillRect(2, 0, 24, player.height);
      ctx.strokeStyle = `hsla(${hue}, 90%, 70%, 0.6)`;
      ctx.lineWidth = 2;
      ctx.strokeRect(2, 0, 24, player.height);
    }

    ctx.restore();

    // Warn if getting pushed backwards close to the edge of death
    if (player.x < 100) {
      ctx.save();
      ctx.font = '8px "Press Start 2P"';
      ctx.fillStyle = '#ff3366';
      ctx.shadowColor = '#ff3366';
      ctx.shadowBlur = 8;
      ctx.fillText('被卡住! 快跳! ⚠️', player.x, player.y - 18);
      ctx.restore();
    }

    // --- 3. RENDERING OVERLAYS OR HUDS ---
    // Floating Expression HUD status at top right
    ctx.fillStyle = 'rgba(26, 26, 46, 0.75)';
    ctx.strokeStyle = '#2d2d48';
    ctx.lineWidth = 1;
    ctx.fillRect(W - 130, 15, 115, 42);
    ctx.strokeRect(W - 130, 15, 115, 42);

    ctx.font = '7px "Press Start 2P"';
    ctx.fillStyle = '#8a8ab0';
    ctx.fillText('ACTION KEYS:', W - 123, 27);

    ctx.fillStyle = '#ffffff';
    ctx.font = '10px sans-serif';
    ctx.fillText('空格/左键 -> 跳跃', W - 123, 40);
    ctx.fillText('S/右键 -> 护盾', W - 123, 52);

    // Combo display
    if (comboCountRef.current >= GAME_BALANCE.comboScoreThreshold) {
      ctx.save();
      ctx.font = '14px "Press Start 2P"';
      ctx.fillStyle = '#ffcc00';
      ctx.shadowColor = '#ff6600';
      ctx.shadowBlur = 16;
      ctx.textAlign = 'center';
      ctx.fillText(`COMBO x${comboCountRef.current}!`, W / 2, 80);
      ctx.restore();
    }

    // Shield oxygen bar (bottom-left)
    const oxy = oxygenRef.current;
    const barW = 90;
    const barH = 8;
    const barX = 10;
    const barY = H - 28;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);
    const oxyColor = oxy > 0.4 ? '#39ff14' : oxy > 0.15 ? '#ffaa00' : '#ff3344';
    ctx.fillStyle = oxyColor;
    ctx.fillRect(barX, barY, barW * oxy, barH);
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 1;
    ctx.strokeRect(barX, barY, barW, barH);
    ctx.font = '7px "Press Start 2P"';
    ctx.fillStyle = '#aaa';
    ctx.fillText('🛡️ 护盾', barX, barY - 4);

    // Power-up active timer (top-center) — real-time countdown
    if (activePowerUpRef.current && powerUpExpiryRef.current > Date.now()) {
      const def = POWERUP_DEFS[activePowerUpRef.current];
      const secsLeft = Math.max(0, Math.ceil((powerUpExpiryRef.current - Date.now()) / 1000));
      ctx.save();
      ctx.font = '10px "Press Start 2P"';
      ctx.fillStyle = def.color;
      ctx.shadowColor = def.color;
      ctx.shadowBlur = 8;
      ctx.textAlign = 'center';
      ctx.fillText(`${def.icon} ${def.label} ${secsLeft}s`, W / 2, 105);
      ctx.restore();
    }

    // Milestone display with praise message
    if (milestoneAlphaRef.current > 0) {
      const alpha = milestoneAlphaRef.current;
      const scale = 1 + (1 - alpha) * 0.3;
      ctx.save();
      ctx.globalAlpha = alpha;

      // Milestone number
      ctx.font = `bold ${Math.floor(22 * scale)}px "Press Start 2P"`;
      ctx.fillStyle = '#ffcc00';
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 20;
      ctx.textAlign = 'center';
      ctx.fillText(`${lastMilestoneRef.current * GAME_BALANCE.milestoneInterval}m!`, W / 2, H / 2 - 55);

      // Praise message — colorful text
      ctx.font = `${Math.floor(11 * scale)}px "Press Start 2P"`;
      const hue = (lastMilestoneRef.current * 37 + Date.now() * 0.01) % 360;
      ctx.fillStyle = `hsl(${hue}, 90%, 65%)`;
      ctx.shadowColor = `hsl(${hue}, 100%, 50%)`;
      ctx.shadowBlur = 12;
      ctx.fillText(praiseMessageRef.current, W / 2, H / 2 - 20);

      // Remaining distance to next milestone
      const nextMilestone = (lastMilestoneRef.current + 1) * GAME_BALANCE.milestoneInterval;
      const remaining = Math.max(0, Math.round(nextMilestone - distanceTraveledRef.current));
      ctx.font = `${Math.floor(9 * scale)}px "Press Start 2P"`;
      ctx.fillStyle = 'rgba(200, 200, 220, 0.7)';
      ctx.shadowBlur = 0;
      ctx.fillText(`→ 距${nextMilestone}m还剩 ${remaining}m`, W / 2, H / 2 + 2);

      ctx.restore();
    }

    // Pause overlay
    if (pausedRef.current) {
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(0, 0, W, H);
      ctx.font = '20px "Press Start 2P"';
      ctx.fillStyle = '#ffcc00';
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 16;
      ctx.textAlign = 'center';
      ctx.fillText('⏸ 暂停中', W / 2, H / 2);
      ctx.font = '9px "Press Start 2P"';
      ctx.fillStyle = '#aaa';
      ctx.shadowBlur = 0;
      ctx.fillText('按 ESC 继续', W / 2, H / 2 + 30);
    }

    // Tick loop forward
    gameLoopIdRef.current = requestAnimationFrame(runGameTick);
  }

  function triggerDeathState(reason: 'crushed' | 'fell' | 'impaled') {
    stopGameLoop();
    if (reason === 'impaled') {
      audio.playImpale();
    } else {
      audio.playDeath();
    }
    
    // Save new high score in localStorage
    const finalScore = scoreRef.current;
    const finalCoins = coinsRef.current;
    
    try {
      const stored = localStorage.getItem('retro_run_highscore');
      const curMax = stored ? parseInt(stored, 10) : 0;
      if (finalScore > curMax) {
        localStorage.setItem('retro_run_highscore', finalScore.toString());
        setHighScore(finalScore);
      }
    } catch (_) {}

    // Compute expression stats from samples
    const samples = expressionSamplesRef.current;
    let smileSum = 0, smileMax = 0, surpriseSum = 0, surpriseMax = 0;
    samples.forEach(s => {
      smileSum += s.smile;
      if (s.smile > smileMax) smileMax = s.smile;
      surpriseSum += s.surprise;
      if (s.surprise > surpriseMax) surpriseMax = s.surprise;
    });
    const n = samples.length || 1;
    const exprStats = {
      smileAvg: smileSum / n,
      smileMax,
      surpriseAvg: surpriseSum / n,
      surpriseMax,
      jumpTriggers: smileTriggerCountRef.current,
      shieldTriggers: shieldTriggerCountRef.current,
    };

    onGameOver(finalScore, finalCoins, playerRef.current.shatteredCount, totalJumpsRef.current, maxComboRef.current, exprStats);
  }

  return (
    <div
      ref={containerRef}
      className="w-full flex-1 flex flex-col justify-between items-stretch bg-[#111119] select-none h-full"
    >
      {/* HUD Header Area */}
      <div className="bg-[#161626] border-b-4 border-zinc-900 px-4 py-3 flex items-center justify-between gap-4 font-press-start text-[9px] text-[#e0e0ea] z-10 w-full">
        {/* Dynamic score counter */}
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-retro-gold animate-bounce" fill="#ffcc00" />
          <span>里程:</span>
          <span className="text-retro-gold font-bold text-xs">{score} m</span>
        </div>

        {/* Coins tally */}
        <div className="flex items-center gap-2">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-retro-gold border border-white animate-spin" />
          <span>硬币:</span>
          <span className="text-retro-amber font-bold text-xs">{coins}</span>
        </div>

        {/* Zone indicator */}
        <div className="flex items-center gap-1.5">
          <span className="text-[8px] px-2 py-0.5 rounded border border-zinc-700 bg-zinc-900/60">
            {['🌟 自信区', '😰 焦虑区', '💥 爆发区'][Math.floor(score / GAME_BALANCE.zoneInterval) % 3]}
          </span>
        </div>

        {/* Mini-objective inline card */}
        {gameState === 'PLAYING' && miniObjDisplay.desc && (
          <div className={`hidden md:flex items-center gap-1.5 px-2 py-1 rounded border text-[8px] transition-all duration-300 ${
            miniObjDisplay.done
              ? 'border-retro-gold/60 bg-retro-gold/10 text-retro-gold'
              : 'border-zinc-700 bg-zinc-900/40 text-zinc-400'
          } ${miniObjCelebrateRef.current > 0 ? 'animate-bounce' : ''}`}>
            <span>{miniObjDisplay.done ? '✅' : '🎯'}</span>
            <span>{miniObjDisplay.desc}</span>
            {!miniObjDisplay.done && (
              <span className="text-retro-gold font-bold">{miniObjDisplay.progress}/{miniObjDisplay.target}</span>
            )}
            {miniObjDisplay.done && (
              <span className="text-retro-gold font-bold">+{miniObjDisplay.reward}💰</span>
            )}
          </div>
        )}

        {/* Global Record */}
        <div className="hidden sm:flex items-center gap-1.5 text-zinc-500">
          <Trophy className="w-3.5 h-3.5 text-zinc-600" />
          <span>最远:</span>
          <span className="font-bold">{highScore} m</span>
        </div>

        {/* System Settings & Toggles */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setUseKeyboardHelp(!useKeyboardHelp)}
            className={`p-1 rounded border cursor-pointer hover:bg-zinc-800 transition ${
              useKeyboardHelp ? 'border-indigo-500 text-indigo-400' : 'border-zinc-800 text-zinc-600'
            }`}
            title="查看按键技巧"
          >
            <HelpCircle className="w-3.5 h-3.5" />
          </button>
          
          <button
            onClick={() => setSoundOn(!soundOn)}
            className="p-1 rounded border border-zinc-800 hover:bg-zinc-800 text-zinc-400 transition cursor-pointer"
            title="音量开关"
          >
            {soundOn ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5 text-rose-500" />}
          </button>
        </div>
      </div>

      {/* Primary HTML5 Physics Canvas Container */}
      <div className="flex-1 w-full relative flex items-center justify-center bg-[#07070d]">
        <canvas
          ref={canvasRef}
          className="w-full max-h-[480px] bg-[#0c0c16] rounded-sm shadow-inner pixel-border border-zinc-900 focus:outline-none"
        />

        {/* Hover keyboard instructional tips */}
        {useKeyboardHelp && gameState === 'PLAYING' && (
          <div className={`absolute top-4 left-4 bg-black/85 backdrop-blur border border-zinc-805 p-3 rounded-lg flex flex-col gap-1 text-[11px] text-zinc-400 font-sans pointer-events-auto z-10 max-w-xs shadow-xl shadow-black/80 transition-opacity duration-500 ${helpFading ? 'opacity-0' : 'opacity-100 animate-fade-in'}`}>
            <div className="flex justify-between font-bold text-indigo-400 pb-1 border-b border-zinc-800 mb-1">
              <span>🎮 操作支持说明</span>
              <button onClick={() => setUseKeyboardHelp(false)} className="mx-1 text-zinc-500 hover:text-white px-1">✕</button>
            </div>
            <p className="leading-snug">识别延迟或无镜头时，欢迎用以下方式操控：</p>
            <ul className="list-disc pl-4 space-y-0.5 text-zinc-300">
              <li><b className="text-white">😀 / [空格] / 鼠标左键</b> ➔ 跳跃越过虚空与木箱。</li>
              <li><b className="text-white">😮 / [S键] / 鼠标右键(按住)</b> ➔ 护盾撞碎木箱，右键松开即关闭。</li>
              <li className="text-zinc-500 text-[10px]">🖱️ <b className="text-zinc-400">[ESC]</b> 暂停 &nbsp;|&nbsp; 右键菜单已禁用</li>
            </ul>
          </div>
        )}
      </div>

      {/* Visual representation of user commands during active gameplay */}
      {isCalibrated && gameState === 'PLAYING' && (
        <div className="bg-[#121221] px-5 py-3 border-t-2 border-zinc-900 flex justify-around items-center gap-4 text-xs font-sans font-medium text-zinc-400">
          <div className="flex items-center gap-2">
            <span className={`w-3.5 h-3.5 rounded-full ${smileLevel > smileThreshold ? 'bg-emerald-400 animate-ping' : 'bg-zinc-800'}`} />
            <span>笑脸探测强度 / 判定：</span>
            <span className="font-mono text-[#e0e0ea]">
              {(smileLevel * 100).toFixed(0)}% / <b className="text-emerald-400">{(smileThreshold * 100).toFixed(0)}%</b>
            </span>
          </div>

          <div className="flex items-center gap-2 border-l border-zinc-800 pl-6">
            <span className={`w-3.5 h-3.5 rounded-full ${surpriseLevel > surpriseThreshold ? 'bg-cyan-400 animate-ping' : 'bg-zinc-800'}`} />
            <span>惊讶探测强度 / 判定：</span>
            <span className="font-mono text-[#e0e0ea]">
              {(surpriseLevel * 100).toFixed(0)}% / <b className="text-cyan-400">{(surpriseThreshold * 100).toFixed(0)}%</b>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
