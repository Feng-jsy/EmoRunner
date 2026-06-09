/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef, useState } from 'react';
import { GameState, Obstacle, Coin, Particle, GameScore, SkinId, MiniObjective, pickRandomMiniObjective, SHOP_SKINS, PowerUp, PowerUpType, POWERUP_DEFS, GAME_BALANCE } from '../types';
import { Trophy, HelpCircle, Volume2, VolumeX, ShieldAlert, Zap } from 'lucide-react';
import { audio } from './audio';
import { runSpawning } from './spawner';
import { renderFloorWithPits, drawObstacles, drawPlayer } from './renderer';

interface GameEngineProps {
  gameState: GameState;
  smileLevel: number;
  surpriseLevel: number;
  externalAction?: { action: 'JUMP' | 'SHIELD_ON' | 'SHIELD_OFF'; id: number } | null;
  smileThreshold: number;
  surpriseThreshold: number;
  isCalibrated: boolean;
  skinId: SkinId;
  onGameOver: (finalScore: number, finalCoins: number, shattered: number, jumps: number, maxCombo: number, expressionStats: { smileAvg: number; smileMax: number; surpriseAvg: number; surpriseMax: number; jumpTriggers: number; shieldTriggers: number }, usedManualInput: boolean, shieldFrames: number, oldHighScore: number, deathReason: string) => void;
  onRestart: () => void;
}

// Over-the-top praise messages for every 5000m milestone (50 entries)
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
  'HR已把你的表情设为培训教材！🎭',
  '你的笑容治愈了整个部门！🏥',
  '隔壁组已经在打听你的工号！🔍',
  '系统检测到你的气场已爆表！📊',
  '拒绝过你的公司正在集体后悔！💔',
  '嘴角上扬角度已载入吉尼斯！📐',
  '同事众筹给你立雕像已达标！🗿',
  '多巴胺分泌量打破公司纪录！🧪',
  '全国HR协会已发来警告通知！⚠️',
  '你的快乐因子正在全城扩散！☢️',
  '今日最佳员工你全票当选！🗳️',
  '公司股价因你表现上涨3%！📈',
  '你已被列入核心人才保护名单！🛡️',
  '招聘网站为你开设了专属页面！🌐',
  '你的抗压数据已被写入教科书！📚',
  '月球基地项目已提名你为队长！🌙',
  '人力部因为你修改了考核标准！📋',
  '你的快乐指数拉高了城市均值！🏙️',
  '连键盘都在为你自动鼓掌！👏',
  '辞退信在你面前会自动销毁！🔥',
  '你的表情肌已达奥林匹克级别！🥇',
  '诺贝尔经济学奖提名已发出！🎖️',
  '硅谷风投正在研究你的简历！🔬',
  '你的耐力让马拉松选手沉默！🏃',
  '本周热搜第一就是你！🔥',
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
  const [speedDisplay, setSpeedDisplay] = useState<number>(GAME_BALANCE.initialSpeed);
  const [coins, setCoins] = useState<number>(0);
  const [soundOn, setSoundOn] = useState<boolean>(true);
  const [useKeyboardHelp, setUseKeyboardHelp] = useState<boolean>(false);
  const [helpFading, setHelpFading] = useState<boolean>(false);
  const [miniObjDisplay, setMiniObjDisplay] = useState<{ desc: string; progress: number; target: number; reward: number; done: boolean }>({ desc: '', progress: 0, target: 0, reward: 0, done: false });
  const prevMiniObjRef = useRef<string>('');

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
  const coinRainPhaseRef = useRef<number>(0); // 0="v3.1", 1="hello~", 2+=random
  const miniObjRef = useRef<MiniObjective>(pickRandomMiniObjective());
  const miniObjProgressRef = useRef<number>(0);
  const miniObjDoneRef = useRef<boolean>(false);
  const miniObjCelebrateRef = useRef<number>(0); // celebration timer frames
  const powerUpsRef = useRef<PowerUp[]>([]);
  const activePowerUpRef = useRef<PowerUpType | null>(null);
  const powerUpExpiryRef = useRef<number>(0); // timestamp when power-up expires
  const oxygenRef = useRef<number>(1.0); // shield oxygen 0-1
  const lastTickTimeRef = useRef<number>(0); // for real-time delta calculation
  const usedManualInputRef = useRef<boolean>(false); // tracked for expression_only challenge
  const cumulativeShieldFramesRef = useRef<number>(0); // tracked for shield_limit challenge

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
        usedManualInputRef.current = true;
        triggerJump();
      }

      if (e.key === 's' || e.key === 'S' || e.key === 'ArrowDown') {
        e.preventDefault();
        usedManualInputRef.current = true;
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
        usedManualInputRef.current = true;
        triggerJump();
      } else if (e.button === 2) { // right click = shield
        e.preventDefault();
        usedManualInputRef.current = true;
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
    prevMiniObjRef.current = '';
    expressionSamplesRef.current = [];
    smileTriggerCountRef.current = 0;
    shieldTriggerCountRef.current = 0;
    wasSmilingRef.current = false;
    wasShieldingRef.current = false;
    manualShieldDesiredRef.current = false;
    usedManualInputRef.current = false;
    cumulativeShieldFramesRef.current = 0;
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
    // Throttle React state sync to every 6 frames (~10Hz) to avoid 60fps re-renders
    if (frameCounterRef.current % 6 === 0) {
      setScore(scoreRef.current);
      setSpeedDisplay(speedRef.current);
    }

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

    // Milestone check (every 5000m) + random praise message
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

    // Sync mini-objective display state — only when values actually change
    {
      const key = `${miniObjRef.current.description}|${miniObjProgressRef.current}|${miniObjRef.current.target}|${miniObjDoneRef.current}`;
      if (key !== prevMiniObjRef.current) {
        prevMiniObjRef.current = key;
        setMiniObjDisplay({
          desc: miniObjRef.current.description,
          progress: miniObjProgressRef.current,
          target: miniObjRef.current.target,
          reward: miniObjRef.current.reward,
          done: miniObjDoneRef.current,
        });
      }
    }

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
      cumulativeShieldFramesRef.current++;
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
        const playerCenter = player.x + player.width / 2;
        const pitLeft = obs.x;
        const pitRight = obs.x + obs.width;
        // Simple center-based detection: fall when player is clearly over the pit
        if (playerCenter > pitLeft + 5 && playerCenter < pitRight - 5) {
          isInPitSector = true;
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

    // Spawn Obstacles & Coins via spawner module
    const spawnResult = runSpawning({
      W,
      floorYLevel,
      obstacles: obstaclesRef.current,
      coins: coinsListRef.current,
      powerUps: powerUpsRef.current,
      distanceTraveled: distanceTraveledRef.current,
      lastSpawnDistance: lastSpawnDistanceRef.current,
      coinRainPhase: coinRainPhaseRef.current,
    });
    lastSpawnDistanceRef.current = spawnResult.lastSpawnDistance;
    coinRainPhaseRef.current = spawnResult.coinRainPhase;

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
        // and only when approaching from the left side (not falling off right edge)
        if (!feetOnCrate) {
          const playerCenter = player.x + player.width / 2;
          const crateCenter = obs.x + obs.width / 2;
          const sideCollision = (
            pxLeft < oxRight &&
            pxRight > oxLeft &&
            pxTop < oxBottom &&
            pxBottom > oxTop + 6 &&
            playerCenter < crateCenter
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
            obs.isShattered = true;
            makeShatterParticles(obs.x + obs.width / 2, sxBottom, '#8a8a9a');
            audio.playBlockShatter();
          } else {
            triggerDeathState('impaled');
            return;
          }
        }
      }

      // Hot floor collision: standing on glowing floor = death
      if (obs.type === 'HOT_FLOOR') {
        const pxLeft = player.x;
        const pxRight = player.x + player.width;
        const pxBottom = player.y + player.height;

        if (
          player.isGrounded &&
          pxRight > obs.x + 4 && pxLeft < obs.x + obs.width - 4 &&
          pxBottom >= floorYLevel - 2
        ) {
          triggerDeathState('burned');
          return;
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

    // Parallax Mountain range — procedural ridges, seamless scroll
    const scroll1 = distanceTraveledRef.current * 0.45;
    ctx.fillStyle = curMountain;
    ctx.beginPath();
    ctx.moveTo(0, H);
    for (let sx = 0; sx <= W + 60; sx += 50) {
      const wx = sx + scroll1;
      const h = 120 + Math.sin(wx * 0.005) * 38 + Math.sin(wx * 0.017 + 1.3) * 24;
      ctx.lineTo(sx, floorYLevel - h);
    }
    ctx.lineTo(W, H);
    ctx.closePath();
    ctx.fill();

    // Parallax Mountain range layer 2 (closer, faster parallax)
    const scroll2 = distanceTraveledRef.current * 1.05;
    ctx.fillStyle = '#21213f';
    ctx.beginPath();
    ctx.moveTo(0, H);
    for (let sx = 0; sx <= W + 40; sx += 35) {
      const wx = sx + scroll2;
      const h = 55 + Math.sin(wx * 0.009) * 20 + Math.sin(wx * 0.028 + 0.7) * 13;
      ctx.lineTo(sx, floorYLevel - h);
    }
    ctx.lineTo(W, H);
    ctx.closePath();
    ctx.fill();

    renderFloorWithPits(ctx, W, H, obstaclesRef.current, floorYLevel, distanceTraveledRef.current, curGround);

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

    drawObstacles(ctx, obstaclesRef.current, floorYLevel, timestamp);

    // Drawing particle debris
    particlesRef.current.forEach((p) => {
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.alpha;
      ctx.fillRect(p.x, p.y, p.size, p.size);
    });
    ctx.globalAlpha = 1.0; // Reset

    // Player character
    drawPlayer(ctx, player.x, player.y, skin, timestamp, {
      shieldActive: player.shieldActive,
      doubleJumpFlash: player.doubleJumpFlash,
      airJumpsLeft: player.airJumpsLeft,
      isGrounded: player.isGrounded,
      pushedAlertTick: player.pushedAlertTick,
      animationTick: player.animationTick,
      frame: player.frame,
      vy: player.vy,
      height: player.height,
      isTripleJump: activePowerUpRef.current === 'TRIPLE_JUMP' && player.airJumpsLeft >= 2,
      activePowerUp: activePowerUpRef.current === 'RAINBOW_GLOW' ? 'RAINBOW_GLOW' : null,
    });

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

  function triggerDeathState(reason: 'crushed' | 'fell' | 'impaled' | 'burned') {
    stopGameLoop();
    if (reason === 'impaled') {
      audio.playImpale();
    } else {
      audio.playDeath();
    }

    // Save new high score in localStorage
    const finalScore = scoreRef.current;
    const finalCoins = coinsRef.current;
    let oldHighScore = 0;

    try {
      const stored = localStorage.getItem('retro_run_highscore');
      oldHighScore = stored ? parseInt(stored, 10) : 0;
      if (finalScore > oldHighScore) {
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

    onGameOver(finalScore, finalCoins, playerRef.current.shatteredCount, totalJumpsRef.current, maxComboRef.current, exprStats, usedManualInputRef.current, cumulativeShieldFramesRef.current, oldHighScore, reason);
  }

  return (
    <div
      ref={containerRef}
      className={`w-full flex-1 flex flex-col justify-between items-stretch select-none h-full transition-colors duration-1000 ${
        ['bg-[#111119]', 'bg-[#1a1118]', 'bg-[#181411]'][Math.floor(score / GAME_BALANCE.zoneInterval) % 3]
      }`}
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
          {/* Speed gauge */}
          <span className={`text-[8px] px-2 py-0.5 rounded border font-mono ${
            speedDisplay > 1.6 ? 'border-red-700 bg-red-950/40 text-red-400' :
            speedDisplay > 1.3 ? 'border-amber-700 bg-amber-950/40 text-amber-400' :
            'border-emerald-700 bg-emerald-950/40 text-emerald-400'
          }`}>
            ⚡{speedDisplay.toFixed(1)}x
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

        {/* Keyboard help bar — manual toggle only */}
        {useKeyboardHelp && gameState === 'PLAYING' && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/75 backdrop-blur border border-zinc-700/60 rounded-lg px-5 py-1.5 text-[10px] text-zinc-400 font-mono pointer-events-auto z-10 select-none">
            空格 = 跳跃 &nbsp;|&nbsp; S = 护盾 &nbsp;|&nbsp; ESC = 暂停
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
