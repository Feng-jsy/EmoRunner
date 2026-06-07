/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef, useState } from 'react';
import { GameState, Obstacle, Coin, Particle, GameScore, SkinId, MiniObjective, pickRandomMiniObjective, SHOP_SKINS } from '../types';
import { Trophy, HelpCircle, Volume2, VolumeX, ShieldAlert, Zap } from 'lucide-react';

interface GameEngineProps {
  gameState: GameState;
  smileLevel: number;
  surpriseLevel: number;
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
}

const audio = new RetroAudioEngine();

export default function GameEngine({
  gameState,
  smileLevel,
  surpriseLevel,
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
  const scoreRef = useRef<number>(0);
  const coinsRef = useRef<number>(0);

  // Expression sampling for gallery
  const frameCounterRef = useRef<number>(0);
  const expressionSamplesRef = useRef<{ smile: number; surprise: number }[]>([]);
  const smileTriggerCountRef = useRef<number>(0);
  const shieldTriggerCountRef = useRef<number>(0);
  const wasSmilingRef = useRef<boolean>(false);
  const wasShieldingRef = useRef<boolean>(false);

  // Playable settings
  const gravity = 0.05;
  const floorYLevel = 360;
  
  // Game state representation
  const playerRef = useRef({
    x: 150, // Home anchor
    y: floorYLevel - 36, // Character center height
    vy: 0,
    width: 28,
    height: 36,
    isGrounded: true,
    shieldActive: false,
    frame: 0,
    animationTick: 0,
    shatteredCount: 0,
    pushedAlertTick: 0,
  });

  const obstaclesRef = useRef<Obstacle[]>([]);
  const coinsListRef = useRef<Coin[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const speedRef = useRef<number>(0.9);
  const lastSpawnDistanceRef = useRef<number>(0);
  const distanceTraveledRef = useRef<number>(0);

  const comboCountRef = useRef<number>(0);
  const comboTimerRef = useRef<number>(0);
  const maxComboRef = useRef<number>(0);
  const totalJumpsRef = useRef<number>(0);
  const lastMilestoneRef = useRef<number>(0);
  const milestoneAlphaRef = useRef<number>(0);
  const rageModeRef = useRef<number>(0); // > 0 = rage active, counts down frames
  const firstCoinRainRef = useRef<boolean>(true); // first rain spells version number
  const miniObjRef = useRef<MiniObjective>(pickRandomMiniObjective());
  const miniObjProgressRef = useRef<number>(0);
  const miniObjDoneRef = useRef<boolean>(false);
  const miniObjCelebrateRef = useRef<number>(0); // celebration timer frames

  const skin = SHOP_SKINS.find((s) => s.id === skinId) || SHOP_SKINS[0];

  // Load highscore from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('retro_run_highscore');
      if (stored) {
        setHighScore(parseInt(stored, 10));
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

  // Read Expression Values and Map to Player Controls
  useEffect(() => {
    if (gameState !== 'PLAYING') return;

    // Smile triggers jump once when crossing threshold
    if (smileLevel > smileThreshold) {
      triggerJump();
    }

    // Surprise maps to shield status
    const shouldShield = surpriseLevel > surpriseThreshold;
    if (shouldShield !== playerRef.current.shieldActive) {
      if (shouldShield) {
        audio.playShieldOn();
      }
      playerRef.current.shieldActive = shouldShield;
    }
  }, [smileLevel, surpriseLevel, smileThreshold, surpriseThreshold, gameState]);

  // Setup Keyboard Fallback Event Listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keyboardStateRef.current[e.key] = true;

      if (gameState !== 'PLAYING') return;

      if (e.key === ' ' || e.key === 'ArrowUp') {
        e.preventDefault();
        triggerJump();
      }

      if (e.key === 's' || e.key === 'S' || e.key === 'ArrowDown') {
        e.preventDefault();
        if (!playerRef.current.shieldActive) {
          audio.playShieldOn();
          playerRef.current.shieldActive = true;
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keyboardStateRef.current[e.key] = false;

      if (gameState !== 'PLAYING') return;

      if (e.key === 's' || e.key === 'S' || e.key === 'ArrowDown') {
        playerRef.current.shieldActive = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
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
      miniObjCelebrateRef.current = 90; // 1.5s celebration
      coinsRef.current += obj.reward;
      setCoins(coinsRef.current);
      audio.playCoin();
    }
  }

  function triggerJump() {
    const player = playerRef.current;
    if (player.isGrounded) {
      player.vy = -4.0;
      player.isGrounded = false;
      totalJumpsRef.current++;
      updateMiniObj('jump_count');
      audio.playJump();
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
      x: 150,
      y: floorYLevel - 36,
      vy: 0,
      width: 28,
      height: 36,
      isGrounded: true,
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
    
    speedRef.current = 0.9;
    distanceTraveledRef.current = 0;
    lastSpawnDistanceRef.current = 100;
    comboCountRef.current = 0;
    comboTimerRef.current = 0;
    maxComboRef.current = 0;
    totalJumpsRef.current = 0;
    lastMilestoneRef.current = 0;
    milestoneAlphaRef.current = 0;
    rageModeRef.current = 0;
    firstCoinRainRef.current = true;
    miniObjRef.current = pickRandomMiniObjective();
    miniObjProgressRef.current = 0;
    miniObjDoneRef.current = false;
    miniObjCelebrateRef.current = 0;
    expressionSamplesRef.current = [];
    smileTriggerCountRef.current = 0;
    shieldTriggerCountRef.current = 0;
    wasSmilingRef.current = false;
    wasShieldingRef.current = false;
    frameCounterRef.current = 0;

    // Begin looping
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

    // --- 1. PHYSICS UPDATE ---
    const speed = speedRef.current;
    distanceTraveledRef.current += speed;
    scoreRef.current = Math.floor(distanceTraveledRef.current / 10);
    if (comboCountRef.current >= 3) {
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

    // Milestone check (every 1000m)
    const currentMilestone = Math.floor(distanceTraveledRef.current / 1000);
    if (currentMilestone > lastMilestoneRef.current) {
      lastMilestoneRef.current = currentMilestone;
      milestoneAlphaRef.current = 1.0;
    }
    if (milestoneAlphaRef.current > 0) {
      milestoneAlphaRef.current = Math.max(0, milestoneAlphaRef.current - 0.016);
    }

    // Rage mode decay
    if (rageModeRef.current > 0) {
      rageModeRef.current--;
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
    if (speedRef.current < 2.0) {
      speedRef.current += 0.000075;
    }

    // Pushed alert cooldown tick
    if (playerRef.current.pushedAlertTick > 0) {
      playerRef.current.pushedAlertTick--;
    }

    // Player Gravity Physics
    const player = playerRef.current;
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
      }
    });

    // Landing on regular ground level
    if (player.y >= floorYLevel - player.height) {
      if (isInPitSector) {
        // Player falls into the pit void! Cannot stand on ground here.
        player.isGrounded = false;
      } else {
        // Safe ground landing
        player.y = floorYLevel - player.height;
        player.vy = 0;
        player.isGrounded = true;
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
    if (distanceTraveledRef.current - lastSpawnDistanceRef.current > 240 + Math.random() * 180) {
      lastSpawnDistanceRef.current = distanceTraveledRef.current;

      const rand = Math.random();
      const dist = distanceTraveledRef.current;
      const comboChance = Math.min(0.5, Math.floor(dist / 2000) * 0.05);

      // Emotion zone: cycles every 2000m
      const zoneIndex = Math.floor(dist / 2000) % 3; // 0=自信, 1=焦虑, 2=爆发
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
          coinsListRef.current.push({
            id: `coin_guide_${Date.now()}`,
            x: W + 55, y: floorYLevel - 85, collected: false,
          });
        } else if (pattern === 1) {
          for (let i = 0; i < 5; i++) {
            const angle = (i / 4) * Math.PI;
            coinsListRef.current.push({
              id: `coin_arc_${Date.now()}_${i}`,
              x: W + 20 + i * 24,
              y: floorYLevel - 55 - Math.sin(angle) * 60,
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
        obstaclesRef.current.push({
          id: `pit_${Date.now()}`,
          type: 'PIT', x: W + 20, width: 105, height: 120, color: '#111119',
        });
        coinsListRef.current.push({
          id: `coin_${Date.now()}`,
          x: W + 20 + 38, y: floorYLevel - 80, collected: false,
        });
      } else if (rand < coinThreshold) {
        const count = 3 + Math.floor(Math.random() * 3);
        for (let idx = 0; idx < count; idx++) {
          coinsListRef.current.push({
            id: `coin_${Date.now()}_${idx}`,
            x: W + 20 + idx * 30,
            y: floorYLevel - 45 - Math.sin(idx) * 20,
            collected: false,
          });
        }
      }
    }

    // --- SURPRISE EVENTS ---
    // Rage mode: rare auto-activation (~0.05% per frame)
    if (rageModeRef.current === 0 && Math.random() < 0.0003) {
      rageModeRef.current = 180;
      audio.playJump();
    }

    // Coin rain: 0.08% chance per spawn
    if (Math.random() < 0.0008) {
      const now = Date.now();
      const coinSize = 10; // spacing between coins in patterns

      if (firstCoinRainRef.current) {
        // First rain: spell out "v2.7" in pixel art
        firstCoinRainRef.current = false;
        const startX = W + 20;
        const startY = 100;
        const charV = [[0,0],[0,4],[1,0],[1,4],[2,0],[2,4],[3,0],[3,4],[4,1],[4,3],[5,2]];
        const char2 = [[0,1],[0,2],[0,3],[1,0],[1,4],[2,4],[3,3],[4,2],[5,1],[6,0],[6,1],[6,2],[6,3],[6,4]];
        const charDot = [[5,1],[6,1]];
        const char7 = [[0,0],[0,1],[0,2],[0,3],[0,4],[1,4],[2,3],[3,2],[4,1],[5,0],[6,0]];
        const chars: [number, number, number[][]][] = [
          [0, 0, charV],
          [6, 0, char2],
          [12, 0, charDot],
          [16, 0, char7],
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
      } else {
        // Subsequent rains: random geometric patterns
        const pattern = Math.floor(Math.random() * 4); // 0=arc, 1=diamond, 2=wave, 3=spiral
        const cx = W + 180;
        const cy = 150;
        const n = 14 + Math.floor(Math.random() * 8); // 14-21 coins

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
            if (player.shieldActive || rageModeRef.current > 0) {
              obs.isShattered = true;
              player.shatteredCount++;
              updateMiniObj('shatter_crates');
              if (rageModeRef.current === 0) {
                comboCountRef.current++;
                comboTimerRef.current = 120;
                if (comboCountRef.current > maxComboRef.current) {
                  maxComboRef.current = comboCountRef.current;
                }
              }
              const particleColor = rageModeRef.current > 0 ? '#ff4444' : '#a05a2c';
              makeShatterParticles(obs.x, oxTop, particleColor);
              audio.playBlockShatter();
              if (obs.width > 40) {
                scoreRef.current += 5; // giant crate bonus
              }
            } else {
              // Snap player to left of crate to avoid multi-frame dragging
              player.x = obs.x - player.width;
              player.pushedAlertTick = 12;
              if (player.x < 15) {
                triggerDeathState('crushed');
                return;
              }
            }
          }
        }
      }
    });

    // Check if player has fallen deep through the pit
    if (player.y > floorYLevel + 50) {
      triggerDeathState('fell');
      return;
    }

    // Move player back home gradually if not currently being pushed
    if (player.x < 150) {
      player.x += 0.8; // Slowly re-center
      if (player.x > 150) player.x = 150;
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

    // Update animations frames
    player.animationTick++;
    if (player.animationTick % 8 === 0) {
      player.frame = (player.frame + 1) % 4;
    }


    // --- 2. RENDER GRAPHICS CANVAS ---
    // Smooth zone transition: blend over last 500m of each 2000m zone
    const zoneProgress = (distanceTraveledRef.current % 2000) / 2000;
    const blendWidth = 500 / 2000; // last 500m = 25% of zone
    let blendT = 0;
    if (zoneProgress > 1 - blendWidth) {
      blendT = (zoneProgress - (1 - blendWidth)) / blendWidth;
    }
    const zoneA = Math.floor(distanceTraveledRef.current / 2000) % 3;
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
      // Base ground surface
      ctx.fillStyle = curGround;
      ctx.fillRect(0, floorYLevel, W, H - floorYLevel);

      // Continuous solid neon top border line
      ctx.fillStyle = '#39ff14';
      ctx.fillRect(0, floorYLevel - 2, W, 4);

      // Subtle vertical grid marks spaced evenly
      ctx.fillStyle = 'rgba(57, 255, 20, 0.15)';
      for (let gX = 0; gX <= W + 100; gX += 40) {
        const offset = -(distanceTraveledRef.current % 40);
        ctx.fillRect(gX + offset, floorYLevel + 4, 1, H - floorYLevel - 4);
      }

      // Pits / Voids
      obstaclesRef.current.forEach((obs) => {
        if (obs.type === 'PIT') {
          ctx.fillStyle = '#0f0f1c';
          ctx.fillRect(obs.x, floorYLevel, obs.width, H - floorYLevel);

          // Red cliff edges
          ctx.fillStyle = '#ff3366';
          ctx.fillRect(obs.x - 3, floorYLevel, 3, H - floorYLevel);
          ctx.fillRect(obs.x + obs.width, floorYLevel, 3, H - floorYLevel);

          // Pit warning text
          ctx.font = '8px "Press Start 2P"';
          ctx.fillStyle = 'rgba(255, 51, 102, 0.45)';
          ctx.fillText('VOID', obs.x + 14, floorYLevel + 35);
        }
      });
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
    ctx.fillText('空格 / 😐 -> 跳跃', W - 123, 40);
    ctx.fillText('S 按键 / 😮 -> 护盾', W - 123, 52);

    // Combo display
    if (comboCountRef.current >= 3) {
      ctx.save();
      ctx.font = '14px "Press Start 2P"';
      ctx.fillStyle = '#ffcc00';
      ctx.shadowColor = '#ff6600';
      ctx.shadowBlur = 16;
      ctx.textAlign = 'center';
      ctx.fillText(`COMBO x${comboCountRef.current}!`, W / 2, 80);
      ctx.restore();
    }

    // Milestone display
    if (milestoneAlphaRef.current > 0) {
      const alpha = milestoneAlphaRef.current;
      const scale = 1 + (1 - alpha) * 0.3;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = `bold ${Math.floor(22 * scale)}px "Press Start 2P"`;
      ctx.fillStyle = '#ffcc00';
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 20;
      ctx.textAlign = 'center';
      ctx.fillText(`${lastMilestoneRef.current * 1000}m!`, W / 2, H / 2 - 40);
      ctx.restore();
    }

    // Rage mode overlay
    if (rageModeRef.current > 0) {
      const rageAlpha = rageModeRef.current > 30 ? 0.15 : (rageModeRef.current / 30) * 0.15;
      ctx.save();
      ctx.globalAlpha = rageAlpha;
      ctx.fillStyle = '#ff4400';
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
      ctx.save();
      ctx.font = '12px "Press Start 2P"';
      ctx.fillStyle = '#ff4400';
      ctx.shadowColor = '#ff8800';
      ctx.shadowBlur = 20;
      ctx.textAlign = 'center';
      ctx.fillText('RAGE MODE!', W / 2, H / 2 + 50);
      ctx.restore();
    }

    // Tick loop forward
    gameLoopIdRef.current = requestAnimationFrame(runGameTick);
  }

  function triggerDeathState(reason: 'crushed' | 'fell') {
    stopGameLoop();
    audio.playDeath();
    
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
          <span>得分:</span>
          <span className="text-retro-gold font-bold text-xs">{score}</span>
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
            {['🌟 自信区', '😰 焦虑区', '💥 爆发区'][Math.floor(score * 10 / 2000) % 3]}
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
          <span>最高分:</span>
          <span className="font-bold">{highScore}</span>
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
            <p className="leading-snug">识别延迟或无镜头时，欢迎采用键盘或点击：</p>
            <ul className="list-disc pl-4 space-y-0.5 text-zinc-300">
              <li><b className="text-white">笑脸 😀 / [空格键]</b> ➔ 控制跳跃越过虚空与木箱。</li>
              <li><b className="text-white">惊讶 😮 / [ S 键] (需长按)</b> ➔ 展开护盾可以撞碎木箱，化险为夷。</li>
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
