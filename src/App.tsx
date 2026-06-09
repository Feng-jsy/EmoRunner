/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { GameState, CalibrationConfig, SkinId, STORAGE_KEYS, getEmotionTitle, EmotionTitle, SHOP_SKINS, AchievementStats, ACHIEVEMENTS, Achievement, DailyChallenge, generateDailyChallenge, LeaderboardEntry, ExpressionRecord } from './types';
import MainMenu from './components/MainMenu';
import CalibrationMenu from './components/CalibrationMenu';
import GameEngine from './components/GameEngine';
import CameraTracker from './components/CameraTracker';
import { Sparkles, Trophy, Sparkle, RefreshCw, Gamepad2, Skull, Sun, Moon, Share2, Check, Medal } from 'lucide-react';

const CALIBRATION_LOCAL_KEY = 'emotion_run_calibration_config';

const DEFAULT_CALIBRATION: CalibrationConfig = {
  neutralSmile: 0.18,
  neutralSurprise: 0.04,
  smileThreshold: 0.24,
  surpriseThreshold: 0.08,
  isCalibrated: false,
};

type TriggerAction = 'JUMP' | 'SHIELD_ON' | 'SHIELD_OFF';

interface TriggerActionEvent {
  action: TriggerAction;
  id: number;
}

export default function App() {
  const [gameState, setGameState] = useState<GameState>('MENU');
  const [calibrationConfig, setCalibrationConfig] = useState<CalibrationConfig>(DEFAULT_CALIBRATION);
  const [smileLevel, setSmileLevel] = useState<number>(0);
  const [surpriseLevel, setSurpriseLevel] = useState<number>(0);
  const [lastScore, setLastScore] = useState<number>(0);
  const [lastCoins, setLastCoins] = useState<number>(0);
  const [isNewHigh, setIsNewHigh] = useState<boolean>(false);
  const [cameraReady, setCameraReady] = useState<boolean>(false);
  const [totalCoins, setTotalCoins] = useState<number>(0);
  const [equippedSkin, setEquippedSkin] = useState<SkinId>('default');
  const [ownedSkins, setOwnedSkins] = useState<SkinId[]>(['default']);
  const [lastEmotionTitle, setLastEmotionTitle] = useState<EmotionTitle>('冷静型');
  const [lastDeathReason, setLastDeathReason] = useState<string>('');
  const [showShop, setShowShop] = useState<boolean>(false);
  const [showAchievements, setShowAchievements] = useState<boolean>(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [unlockedAchievements, setUnlockedAchievements] = useState<string[]>([]);
  const [newAchievements, setNewAchievements] = useState<Achievement[]>([]);
  const [totalStats, setTotalStats] = useState<AchievementStats>({
    totalJumps: 0, totalShattered: 0, totalGames: 0,
    totalDistance: 0, totalCoinsCollected: 0, maxCombo: 0,
  });
  const [dailyChallenge, setDailyChallenge] = useState<DailyChallenge>(generateDailyChallenge);
  const [challengeCompleted, setChallengeCompleted] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [playerName, setPlayerName] = useState<string>('匿名玩家');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [expressionRecords, setExpressionRecords] = useState<ExpressionRecord[]>([]);
  const [triggerActionEvent, setTriggerActionEvent] = useState<TriggerActionEvent | null>(null);

  useEffect(() => {
    try {
      const savedConfigStr = localStorage.getItem(CALIBRATION_LOCAL_KEY);
      if (savedConfigStr) {
        const parsed = JSON.parse(savedConfigStr);
        if (parsed && typeof parsed.smileThreshold === 'number') {
          setCalibrationConfig(parsed);
        }
      }
    } catch (e) {
      console.warn('Failed loading local calibration configs:', e);
    }
    try {
      const savedCoins = localStorage.getItem(STORAGE_KEYS.totalCoins);
      if (savedCoins) setTotalCoins(parseInt(savedCoins, 10) || 0);
    } catch (_) {}
    try {
      const savedOwned = localStorage.getItem(STORAGE_KEYS.ownedSkins);
      if (savedOwned) setOwnedSkins(JSON.parse(savedOwned));
    } catch (_) {}
    try {
      const savedEquipped = localStorage.getItem(STORAGE_KEYS.equippedSkin);
      if (savedEquipped) setEquippedSkin(savedEquipped as SkinId);
    } catch (_) {}
    try {
      const savedAchievements = localStorage.getItem(STORAGE_KEYS.achievements);
      if (savedAchievements) setUnlockedAchievements(JSON.parse(savedAchievements));
    } catch (_) {}
    try {
      const savedStats = localStorage.getItem(STORAGE_KEYS.totalStats);
      if (savedStats) setTotalStats(JSON.parse(savedStats));
    } catch (_) {}
    try {
      const savedTheme = localStorage.getItem('emotion_run_theme');
      if (savedTheme === 'light' || savedTheme === 'dark') setTheme(savedTheme);
    } catch (_) {}
    try {
      const savedChallenge = localStorage.getItem(STORAGE_KEYS.dailyChallenge);
      if (savedChallenge) {
        const parsed: DailyChallenge = JSON.parse(savedChallenge);
        const today = new Date().toISOString().slice(0, 10);
        if (parsed.date === today) {
          setDailyChallenge(parsed);
          setChallengeCompleted(parsed.completed);
        } else {
          const fresh = generateDailyChallenge();
          setDailyChallenge(fresh);
          setChallengeCompleted(false);
          localStorage.setItem(STORAGE_KEYS.dailyChallenge, JSON.stringify(fresh));
        }
      } else {
        const fresh = generateDailyChallenge();
        setDailyChallenge(fresh);
        localStorage.setItem(STORAGE_KEYS.dailyChallenge, JSON.stringify(fresh));
      }
    } catch (_) {}
    try {
      const savedName = localStorage.getItem(STORAGE_KEYS.playerName);
      if (savedName) setPlayerName(savedName);
    } catch (_) {}
    try {
      const savedLB = localStorage.getItem(STORAGE_KEYS.leaderboard);
      if (savedLB) {
        setLeaderboard(JSON.parse(savedLB));
      }
    } catch (_) {}
    try {
      const savedRecords = localStorage.getItem(STORAGE_KEYS.expressionRecords);
      if (savedRecords) setExpressionRecords(JSON.parse(savedRecords));
    } catch (_) {}
  }, []);

  useEffect(() => {
    if (gameState === 'PRELOADING' && cameraReady) {
      setGameState('PLAYING');
    }
  }, [gameState, cameraReady]);

  // Double-tap spacebar to restart on game over
  useEffect(() => {
    if (gameState !== 'GAMEOVER') return;
    let lastTap = 0;
    const handler = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault();
        const now = Date.now();
        if (lastTap > 0 && now - lastTap < 500) {
          handleRestartGame();
          lastTap = 0;
        } else {
          lastTap = now;
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [gameState]);

  function handleCameraStatus(status: 'LOADING_SCRIPTS' | 'WAITING_CAMERA' | 'READY' | 'ERROR') {
    if (status === 'READY' || status === 'ERROR') {
      setCameraReady(true);
    }
  }

  function handleExpressions(smile: number, surprise: number) {
    setSmileLevel(smile);
    setSurpriseLevel(surprise);
  }

  function handleTriggerAction(action: TriggerAction) {
    if (gameState !== 'PLAYING') return;
    setTriggerActionEvent((prev) => ({
      action,
      id: (prev?.id ?? 0) + 1,
    }));
  }

  function handleSaveCalibration(config: CalibrationConfig) {
    setCalibrationConfig(config);
    try {
      localStorage.setItem(CALIBRATION_LOCAL_KEY, JSON.stringify(config));
    } catch (e) {
      console.warn('LocalStorage save rating error:', e);
    }
    setGameState('MENU');
  }

  function handleGameOver(scoreVal: number, coinsVal: number, shattered: number, jumps: number, maxCombo: number, expressionStats?: { smileAvg: number; smileMax: number; surpriseAvg: number; surpriseMax: number; jumpTriggers: number; shieldTriggers: number }, usedManualInput?: boolean, shieldFrames?: number, oldHighScore?: number, deathReason?: string) {
    setLastScore(scoreVal);
    setLastCoins(coinsVal);
    setLastEmotionTitle(getEmotionTitle(shattered, jumps, coinsVal));
    setLastDeathReason(deathReason || '');

    // Check daily challenge
    let dcCompleted = dailyChallenge.completed;
    let dailyChallengeJustCompleted = false;
    if (!dcCompleted) {
      let achieved = false;
      const dc = dailyChallenge;
      if (dc.type === 'jumps' && jumps >= dc.target) achieved = true;
      if (dc.type === 'shatter' && shattered >= dc.target) achieved = true;
      if (dc.type === 'coins' && coinsVal >= dc.target) achieved = true;
      if (dc.type === 'distance' && scoreVal >= dc.target) achieved = true;
      if (dc.type === 'combo' && maxCombo >= dc.target) achieved = true;
      if (dc.type === 'expression_only' && usedManualInput === false) achieved = true;
      if (dc.type === 'shield_limit' && shieldFrames !== undefined && (shieldFrames / 60) <= dc.target) achieved = true;
      if (dc.type === 'beat_record' && oldHighScore !== undefined && scoreVal > oldHighScore) achieved = true;
      if (achieved) {
        dcCompleted = true;
        dailyChallengeJustCompleted = true;
        const updatedDC = { ...dailyChallenge, completed: true };
        setDailyChallenge(updatedDC);
        setChallengeCompleted(true);
        try {
          localStorage.setItem(STORAGE_KEYS.dailyChallenge, JSON.stringify(updatedDC));
        } catch (_) {}
      }
    }

    // Update cumulative stats
    const newStats: AchievementStats = {
      totalJumps: totalStats.totalJumps + jumps,
      totalShattered: totalStats.totalShattered + shattered,
      totalGames: totalStats.totalGames + 1,
      totalDistance: totalStats.totalDistance + scoreVal,
      totalCoinsCollected: totalStats.totalCoinsCollected + coinsVal,
      maxCombo: Math.max(totalStats.maxCombo, maxCombo),
    };
    setTotalStats(newStats);

    // Check achievements
    const newlyUnlocked: Achievement[] = [];
    for (const ach of ACHIEVEMENTS) {
      if (unlockedAchievements.includes(ach.id)) continue;
      let unlocked = false;
      if (ach.id === 'first_jump' && newStats.totalJumps >= 1) unlocked = true;
      if (ach.id === 'first_shatter' && newStats.totalShattered >= 1) unlocked = true;
      if (ach.id === 'play_10' && newStats.totalGames >= 10) unlocked = true;
      if (ach.id === 'play_50' && newStats.totalGames >= 50) unlocked = true;
      if (ach.id === 'distance_5000' && newStats.totalDistance >= 5000) unlocked = true;
      if (ach.id === 'distance_20000' && newStats.totalDistance >= 20000) unlocked = true;
      if (ach.id === 'coins_100' && newStats.totalCoinsCollected >= 100) unlocked = true;
      if (ach.id === 'coins_500' && newStats.totalCoinsCollected >= 500) unlocked = true;
      if (ach.id === 'combo_5' && maxCombo >= 5) unlocked = true;
      if (ach.id === 'combo_10' && maxCombo >= 10) unlocked = true;
      if (ach.id === 'shatter_20' && newStats.totalShattered >= 20) unlocked = true;
      if (ach.id === 'shatter_100' && newStats.totalShattered >= 100) unlocked = true;
      if (ach.id === 'jumps_50' && newStats.totalJumps >= 50) unlocked = true;
      if (ach.id === 'jumps_200' && newStats.totalJumps >= 200) unlocked = true;
      if (unlocked) newlyUnlocked.push(ach);
    }

    // Apply achievement rewards
    let bonusCoins = 0;
    if (dailyChallengeJustCompleted) {
      bonusCoins += dailyChallenge.reward;
    }
    if (newlyUnlocked.length > 0) {
      const newUnlocked = [...unlockedAchievements, ...newlyUnlocked.map(a => a.id)];
      setUnlockedAchievements(newUnlocked);
      setNewAchievements(newlyUnlocked);
      bonusCoins += newlyUnlocked.reduce((sum, a) => sum + a.reward, 0);
      try {
        localStorage.setItem(STORAGE_KEYS.achievements, JSON.stringify(newUnlocked));
      } catch (_) {}
    }

    try {
      const prevHighStr = localStorage.getItem('retro_run_highscore');
      const prevHigh = prevHighStr ? parseInt(prevHighStr, 10) : 0;
      setIsNewHigh(scoreVal > prevHigh);
    } catch (_) {
      setIsNewHigh(false);
    }

    // Save to leaderboard — always append new entry, never overwrite
    const now = new Date();
    const displayName = playerName.trim() || '匿名玩家';
    const newEntry: LeaderboardEntry = {
      name: displayName,
      score: scoreVal,
      coins: coinsVal,
      title: getEmotionTitle(shattered, jumps, coinsVal),
      date: now.toISOString().slice(0, 10),
      time: now.toTimeString().slice(0, 5),
    };
    const updatedLeaderboard = [newEntry, ...leaderboard]
      .sort((a, b) => b.score - a.score)
      .slice(0, 20);
    setLeaderboard(updatedLeaderboard);
    try {
      localStorage.setItem(STORAGE_KEYS.leaderboard, JSON.stringify(updatedLeaderboard));
    } catch (_) {}

    const newTotal = totalCoins + coinsVal + bonusCoins;
    setTotalCoins(newTotal);
    try {
      localStorage.setItem(STORAGE_KEYS.totalCoins, newTotal.toString());
      localStorage.setItem(STORAGE_KEYS.totalStats, JSON.stringify(newStats));
    } catch (_) {}
    // Save expression record
    if (expressionStats) {
      const record: ExpressionRecord = {
        id: `expr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        playerName: playerName.trim() || '匿名玩家',
        date: new Date().toISOString().slice(0, 10),
        smileAvg: expressionStats.smileAvg,
        smileMax: expressionStats.smileMax,
        surpriseAvg: expressionStats.surpriseAvg,
        surpriseMax: expressionStats.surpriseMax,
        jumpCount: expressionStats.jumpTriggers,
        shieldCount: expressionStats.shieldTriggers,
        score: scoreVal,
        title: getEmotionTitle(shattered, jumps, coinsVal),
      };
      const updatedRecords = [record, ...expressionRecords].slice(0, 50);
      setExpressionRecords(updatedRecords);
      try {
        localStorage.setItem(STORAGE_KEYS.expressionRecords, JSON.stringify(updatedRecords));
      } catch (_) {}
    }
    setGameState('GAMEOVER');
  }

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    try { localStorage.setItem('emotion_run_theme', next); } catch (_) {}
  }

  function handleClearAllData() {
    const keys = Object.values(STORAGE_KEYS);
    keys.forEach(k => localStorage.removeItem(k));
    localStorage.removeItem('retro_run_highscore');
    localStorage.removeItem(CALIBRATION_LOCAL_KEY);
    setTotalCoins(0);
    setOwnedSkins(['default']);
    setEquippedSkin('default');
    setUnlockedAchievements([]);
    setTotalStats({ totalJumps: 0, totalShattered: 0, totalGames: 0, totalDistance: 0, totalCoinsCollected: 0, maxCombo: 0 });
    const fresh = generateDailyChallenge();
    setDailyChallenge(fresh);
    setChallengeCompleted(false);
    localStorage.setItem(STORAGE_KEYS.dailyChallenge, JSON.stringify(fresh));
    setShowShop(false);
    setShowAchievements(false);
    setLeaderboard([]);
    setExpressionRecords([]);
    setPlayerName('匿名玩家');
  }

  function startGameFlow() {
    setCameraReady(false);
    setNewAchievements([]);
    setChallengeCompleted(false);
    setGameState('PRELOADING');
  }

  function handleRestartGame() {
    setIsNewHigh(false);
    startGameFlow();
  }

  function handleBuySkin(skinId: SkinId) {
    const skin = SHOP_SKINS.find(s => s.id === skinId);
    if (!skin || ownedSkins.includes(skinId) || totalCoins < skin.price) return;
    const newTotal = totalCoins - skin.price;
    const newOwned = [...ownedSkins, skinId];
    setTotalCoins(newTotal);
    setOwnedSkins(newOwned);
    try {
      localStorage.setItem(STORAGE_KEYS.totalCoins, newTotal.toString());
      localStorage.setItem(STORAGE_KEYS.ownedSkins, JSON.stringify(newOwned));
    } catch (_) {}
  }

  function handleEquipSkin(skinId: SkinId) {
    if (!ownedSkins.includes(skinId)) return;
    setEquippedSkin(skinId);
    try {
      localStorage.setItem(STORAGE_KEYS.equippedSkin, skinId);
    } catch (_) {}
  }

  return (
    <div data-theme={theme} className="min-h-screen bg-[#0d0d16] text-[#e2e2ea] flex flex-col justify-between select-none">

      <header className="bg-[#12121f] border-b-2 border-zinc-900 shadow-lg px-6 py-4 flex items-center justify-between w-full max-w-7xl mx-auto">
        <button
          onClick={() => setGameState('MENU')}
          className="flex items-center gap-2 text-zinc-400 hover:text-white transition duration-150 cursor-pointer focus:outline-none"
        >
          <Gamepad2 className="w-5 h-5 text-retro-green" />
          <span className="font-press-start text-[11px] tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
            情绪闯关 EmoRunner ENGINE
          </span>
        </button>

        <div className="flex items-center gap-3">
          <button
            onClick={toggleTheme}
            className="p-1.5 rounded-lg border border-zinc-800 hover:border-zinc-600 text-zinc-400 hover:text-zinc-200 transition cursor-pointer"
            title={theme === 'dark' ? '切换浅色模式' : '切换深色模式'}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          <div className="flex items-center gap-1.5 bg-[#1a1a2e] border border-zinc-800 px-3 py-1 rounded text-xs select-none">
          <span className="relative flex h-2 w-2 mr-0.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#39ff14] opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-retro-green" />
          </span>
          <span className="font-sans text-[10px] text-zinc-400 font-medium">
            校准状态: {calibrationConfig.isCalibrated ? (
              <b className="text-retro-green">CUSTOMIZED ✓</b>
            ) : (
              <span className="text-zinc-500">DEFAULT DEFAULT</span>
            )}
          </span>
        </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-4 flex flex-col justify-center items-stretch h-full">

        {gameState === 'MENU' && (
          <MainMenu
            onStartGame={startGameFlow}
            onGoToCalibration={() => setGameState('CALIBRATION')}
            calibrationConfig={calibrationConfig}
            totalCoins={totalCoins}
            onOpenShop={() => setShowShop(true)}
            onOpenAchievements={() => setShowAchievements(true)}
            unlockedCount={unlockedAchievements.length}
            dailyChallenge={dailyChallenge}
            onClearAllData={handleClearAllData}
            playerName={playerName}
            onPlayerNameChange={(name: string) => {
              setPlayerName(name);
              try { localStorage.setItem(STORAGE_KEYS.playerName, name); } catch (_) {}
            }}
            leaderboard={leaderboard}
            expressionRecords={expressionRecords}
          />
        )}

        {gameState === 'CALIBRATION' && (
          <CalibrationMenu
            currentConfig={calibrationConfig}
            onSaveCalibration={handleSaveCalibration}
            onBack={() => setGameState('MENU')}
          />
        )}

        {/* PRELOADING and PLAYING share the same layout — CameraTracker mounts once */}
        {(gameState === 'PRELOADING' || gameState === 'PLAYING') && (
          <div className="w-full flex flex-col lg:flex-row gap-6 items-stretch justify-center h-full min-h-[460px]">

            <div className="flex-1 flex flex-col bg-[#141424] border-2 border-zinc-900 rounded-2xl shadow-2xl overflow-hidden min-h-[400px]">
              {gameState === 'PRELOADING' && (
                <div className="flex-1 flex flex-col items-center justify-center bg-[#0d0d16] select-none gap-6">
                  <div className="text-center space-y-4">
                    <div className="w-12 h-12 border-4 border-dashed border-cyan-500 rounded-full animate-spin mx-auto" />
                    <p className="font-press-start text-[10px] text-cyan-400 animate-pulse">加载摄像头</p>
                    <p className="font-sans text-xs text-zinc-500">面部识别引擎启动中...</p>
                  </div>
                  <button
                    onClick={() => setGameState('PLAYING')}
                    className="px-6 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded-xl text-xs font-medium transition cursor-pointer"
                  >
                    跳过，使用键盘
                  </button>
                </div>
              )}
              {gameState === 'PLAYING' && (
                <GameEngine
                  gameState={gameState}
                  smileLevel={smileLevel}
                  surpriseLevel={surpriseLevel}
                  externalAction={triggerActionEvent}
                  smileThreshold={calibrationConfig.smileThreshold}
                  surpriseThreshold={calibrationConfig.surpriseThreshold}
                  isCalibrated={calibrationConfig.isCalibrated}
                  skinId={equippedSkin}
                  onGameOver={handleGameOver}
                  onRestart={handleRestartGame}
                />
              )}
            </div>

            <div className="w-full lg:w-72 flex-shrink-0 flex flex-col justify-between">
              <div className="bg-[#141424] border-2 border-zinc-900 rounded-2xl p-4 flex flex-col h-full">
                <div className="flex justify-between items-center pb-2 border-b border-zinc-800 mb-3">
                  <span className="font-press-start text-[8px] text-zinc-500">🔴 FEED VIEW</span>
                  {gameState === 'PLAYING' && (
                    <button
                      onClick={() => setGameState('CALIBRATION')}
                      className="font-sans text-[10px] text-zinc-400 hover:text-cyan-400 cursor-pointer flex items-center gap-1"
                    >
                      <RefreshCw className="w-2.5 h-2.5" /> 重新校准
                    </button>
                  )}
                </div>

                <div className="flex-1 min-h-[220px] max-h-[300px]">
                  <CameraTracker
                    onExpressions={handleExpressions}
                    smileThreshold={calibrationConfig.smileThreshold}
                    surpriseThreshold={calibrationConfig.surpriseThreshold}
                    onTriggerAction={handleTriggerAction}
                    isCalibrated={calibrationConfig.isCalibrated}
                    showOverlay={true}
                    onStatusChange={handleCameraStatus}
                  />
                </div>
              </div>
            </div>

          </div>
        )}

        {gameState === 'GAMEOVER' && (
          <div className="w-full max-w-md mx-auto bg-[#1b1b32] border-4 border-zinc-900 pixel-border rounded-3xl p-6 text-center shadow-2xl animate-fade-in py-10 relative">
            <div className="absolute top-4 right-4 text-emerald-400">
              <Sparkle className="w-6 h-6 animate-spin" />
            </div>

            <div className="inline-flex p-4 bg-zinc-950/80 rounded-2xl border border-rose-500/50 text-rose-500 mb-4 animate-shake">
              <Skull className="w-10 h-10 stroke-[1.5]" />
            </div>

            {isNewHigh ? (
              <div className="inline-block px-3 py-1 bg-retro-gold text-black rounded font-press-start text-[8.5px] font-bold animate-bounce mb-3 uppercase tracking-wider">
                👑 创下最远纪录 HIGH SCORE!
              </div>
            ) : (
              <div className="inline-block px-3 py-1 bg-red-950/60 text-rose-500 border border-red-800 rounded font-press-start text-[8px] mb-3 uppercase tracking-wider">
                ❌ 冲关结束
              </div>
            )}

            <h2 className="font-press-start text-xs text-rose-500 tracking-wide mb-4">GAME OVER</h2>

            {/* Noita-style death cause */}
            {lastDeathReason && (
              <div className="mb-5 max-w-sm mx-auto">
                <div className="bg-gradient-to-b from-red-950/60 to-red-900/20 border-2 border-red-700/50 rounded-xl px-5 py-3 text-center">
                  <span className="text-[8px] font-press-start text-red-400/70 block mb-1 tracking-widest uppercase">死亡报告</span>
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-xl">
                      {lastDeathReason === 'crushed' ? '📦' : lastDeathReason === 'fell' ? '🕳️' : lastDeathReason === 'burned' ? '🔥' : '🔪'}
                    </span>
                    <span className="font-press-start text-[11px] text-red-300 font-bold">
                      {lastDeathReason === 'crushed' ? '被木箱压碎' : lastDeathReason === 'fell' ? '坠入虚空深渊' : lastDeathReason === 'burned' ? '被熔岩烫死' : '被天花板尖刺刺穿'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {newAchievements.length > 0 && (
              <div className="mb-6 space-y-2 max-w-sm mx-auto">
                {newAchievements.map(ach => (
                  <div
                    key={ach.id}
                    className="bg-retro-gold/10 border border-retro-gold/40 rounded-xl px-4 py-2 flex items-center gap-3 animate-bounce"
                  >
                    <span className="text-lg">{ach.icon}</span>
                    <div className="text-left">
                      <span className="font-press-start text-[8px] text-retro-gold block">成就解锁!</span>
                      <span className="text-[10px] text-zinc-300 font-bold">{ach.name}</span>
                    </div>
                    <span className="ml-auto font-press-start text-[9px] text-retro-gold">+{ach.reward}</span>
                  </div>
                ))}
              </div>
            )}

            {challengeCompleted && (
              <div className="mb-6 max-w-sm mx-auto">
                <div className="bg-cyan-500/10 border border-cyan-400/40 rounded-xl px-4 py-2 flex items-center gap-3 animate-bounce">
                  <span className="text-lg">🎯</span>
                  <div className="text-left">
                    <span className="font-press-start text-[8px] text-cyan-400 block">每日挑战完成!</span>
                    <span className="text-[10px] text-zinc-300 font-bold">{dailyChallenge.description}</span>
                  </div>
                  <span className="ml-auto font-press-start text-[9px] text-cyan-400">+{dailyChallenge.reward}</span>
                </div>
              </div>
            )}

            <div className="bg-[#121221] p-4 rounded-2xl border border-zinc-800 space-y-3 mb-6 text-left max-w-sm mx-auto font-mono text-zinc-400">
              <div className="flex justify-between items-center text-sm pb-1.5 border-b border-zinc-800">
                <span>里程:</span>
                <span className="text-retro-gold font-press-start text-xs font-bold">{lastScore}</span>
              </div>
              <div className="flex justify-between items-center text-sm pb-1.5 border-b border-zinc-800">
                <span>硬币:</span>
                <span className="text-retro-amber font-press-start text-xs font-bold">{lastCoins}</span>
              </div>
              <div className="flex justify-between items-center text-sm pb-1.5 border-b border-zinc-800">
                <span>称号:</span>
                <span className="text-cyan-400 font-press-start text-xs font-bold">{lastEmotionTitle}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span>总硬币:</span>
                <span className="text-retro-gold font-press-start text-xs font-bold">{totalCoins}</span>
              </div>
            </div>

            {/* Quick restart button */}
            <div className="flex flex-col gap-2 max-w-sm mx-auto mb-4">
              <button
                onClick={handleRestartGame}
                className="w-full py-3.5 bg-gradient-to-r from-retro-green to-emerald-500 hover:from-[#5eff42] hover:to-emerald-400 text-slate-950 font-bold rounded-xl shadow-lg transition font-press-start text-[10px] flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-4 h-4 animate-spin" />
                再来一局
              </button>
              <p className="text-[9px] text-zinc-600 font-sans text-center">或<b className="text-zinc-400">双击 [空格键]</b> 快速重开</p>
            </div>

            {/* Name input for leaderboard */}
            <div className="bg-[#121221] border-2 border-retro-gold/30 rounded-2xl p-4 mb-4 text-center max-w-sm mx-auto">
              <label className="font-press-start text-[8px] text-retro-gold block mb-2">
                🏷️ 玩家名
              </label>
              <input
                type="text"
                value={playerName}
                onChange={(e) => {
                  const newName = e.target.value.slice(0, 8);
                  setPlayerName(newName);
                  try { localStorage.setItem(STORAGE_KEYS.playerName, newName); } catch (_) {}
                  // Update name in leaderboard — find the latest entry and rename
                  setLeaderboard(prev => {
                    const updated = [...prev];
                    const idx = updated.findIndex(
                      e => e.date === new Date().toISOString().slice(0, 10) && e.score === lastScore
                    );
                    if (idx >= 0) {
                      updated[idx] = { ...updated[idx], name: newName.trim() || '匿名玩家' };
                      localStorage.setItem(STORAGE_KEYS.leaderboard, JSON.stringify(updated));
                    }
                    return updated;
                  });
                }}
                placeholder="输入玩家ID"
                maxLength={8}
                className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-200 text-sm font-sans outline-none w-full text-center placeholder-zinc-600 focus:border-retro-gold transition"
              />
            </div>

            {/* Leaderboard on death screen */}
            <div className="bg-zinc-950/60 border border-zinc-800 rounded-2xl p-4 mb-6 text-left max-w-sm mx-auto">
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-zinc-800">
                <Medal className="w-4 h-4 text-retro-gold" />
                <span className="font-press-start text-[9px] text-retro-gold">本地排行榜</span>
                <span className="ml-auto text-[8px] text-zinc-600">TOP 10</span>
              </div>
              <div className="space-y-1 max-h-[240px] overflow-y-auto">
                {leaderboard.slice(0, 10).map((entry, idx) => (
                  <div
                    key={`${entry.name}-${entry.date}-${entry.time}-${idx}`}
                    className={`flex items-center justify-between text-[10px] px-2 py-1.5 rounded ${
                      entry.name === (playerName.trim() || '匿名玩家')
                        ? 'bg-retro-gold/10 border border-retro-gold/30'
                        : 'bg-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`font-press-start text-[9px] w-5 text-center ${
                        idx === 0 ? 'text-retro-gold' : idx === 1 ? 'text-zinc-300' : idx === 2 ? 'text-amber-600' : 'text-zinc-600'
                      }`}>
                        {idx === 0 ? '👑' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}`}
                      </span>
                      <span className="text-zinc-300 font-sans truncate max-w-[80px]">{entry.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-zinc-600 text-[7px]">{entry.time}</span>
                      <span className="text-zinc-500 text-[8px]">{entry.title}</span>
                      <span className="font-press-start text-[9px] text-retro-gold tabular-nums">{entry.score}</span>
                    </div>
                  </div>
                ))}
                {leaderboard.length === 0 && (
                  <p className="text-zinc-600 text-[10px] text-center py-4">暂无纪录</p>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-3 max-w-xs mx-auto">
              <button
                onClick={() => setGameState('MENU')}
                className="w-full py-3 bg-zinc-805 hover:bg-zinc-800 text-zinc-300 font-bold rounded-xl transition font-sans text-xs flex items-center justify-center gap-1.5 cursor-pointer border border-zinc-800"
              >
                返回主页
              </button>

              <button
                onClick={() => {
                  const W = 400;
                  const H = 320;
                  const canvas = document.createElement('canvas');
                  canvas.width = W;
                  canvas.height = H;
                  const ctx = canvas.getContext('2d')!;

                  ctx.fillStyle = '#0d0d16';
                  ctx.fillRect(0, 0, W, H);

                  ctx.strokeStyle = '#ffcc00';
                  ctx.lineWidth = 6;
                  ctx.strokeRect(3, 3, W - 6, H - 6);
                  ctx.strokeStyle = '#1a1a2e';
                  ctx.lineWidth = 2;
                  ctx.strokeRect(8, 8, W - 16, H - 16);

                  ctx.fillStyle = '#ffcc00';
                  ctx.font = 'bold 18px "Press Start 2P", monospace';
                  ctx.textAlign = 'center';
                  ctx.shadowColor = 'rgba(255,204,0,0.6)';
                  ctx.shadowBlur = 10;
                  ctx.fillText('情绪闯关 EmoRunner', W / 2, 55);
                  ctx.shadowBlur = 0;

                  ctx.strokeStyle = '#ffcc00';
                  ctx.lineWidth = 1;
                  ctx.beginPath();
                  ctx.moveTo(30, 72);
                  ctx.lineTo(W - 30, 72);
                  ctx.stroke();

                  ctx.textAlign = 'left';
                  const statsX = 50;
                  let y = 100;
                  const lineH = 28;
                  ctx.font = '13px "Courier New", monospace';

                  const lines: [string, string][] = [
                    ['里程', `${lastScore} 米`],
                    ['收集金币', `${lastCoins} 枚`],
                    ['情绪称号', lastEmotionTitle],
                    ['总硬币', `${totalCoins} 枚`],
                    ['解锁成就', `${unlockedAchievements.length}/${ACHIEVEMENTS.length}`],
                  ];

                  lines.forEach(([label, value]) => {
                    ctx.fillStyle = '#8888aa';
                    ctx.fillText(label, statsX, y);
                    ctx.fillStyle = '#ffcc00';
                    ctx.font = 'bold 13px "Courier New", monospace';
                    ctx.fillText(value, statsX + 120, y);
                    ctx.font = '13px "Courier New", monospace';
                    y += lineH;
                  });

                  ctx.fillStyle = '#666680';
                  ctx.font = '9px "Press Start 2P", monospace';
                  ctx.textAlign = 'center';
                  ctx.fillText('来挑战我吧!', W / 2, H - 25);

                  canvas.toBlob((blob) => {
                    if (!blob) return;
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `EmoRunner_${lastScore}m.png`;
                    a.click();
                    URL.revokeObjectURL(url);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }, 'image/png');
                }}
                className="w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold rounded-xl transition font-press-start text-[10px] flex items-center justify-center gap-1.5 cursor-pointer border border-zinc-700"
              >
                {copied ? <Check className="w-4 h-4 text-retro-green" /> : <Share2 className="w-4 h-4" />}
                {copied ? '已保存!' : '导出截图'}
              </button>
            </div>
          </div>
        )}

      </main>

      {/* ACHIEVEMENTS MODAL */}
      {showAchievements && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1b1b32] border-4 border-zinc-900 rounded-3xl p-6 w-full max-w-lg shadow-2xl animate-fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-press-start text-sm text-retro-gold">成就系统</h2>
              <div className="flex items-center gap-3">
                <span className="font-press-start text-[10px] text-retro-gold">{unlockedAchievements.length}/{ACHIEVEMENTS.length}</span>
                <button
                  onClick={() => setShowAchievements(false)}
                  className="text-zinc-500 hover:text-white text-xl leading-none cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="space-y-2">
              {ACHIEVEMENTS.map(ach => {
                const unlocked = unlockedAchievements.includes(ach.id);
                return (
                  <div
                    key={ach.id}
                    className={`bg-[#121221] border rounded-xl p-3 flex items-center gap-3 transition ${
                      unlocked ? 'border-retro-gold/30' : 'border-zinc-800 opacity-40'
                    }`}
                  >
                    <span className="text-xl flex-shrink-0">{unlocked ? ach.icon : '🔒'}</span>
                    <div className="flex-1 min-w-0">
                      <span className={`font-press-start text-[9px] block ${unlocked ? 'text-zinc-200' : 'text-zinc-600'}`}>
                        {ach.name}
                      </span>
                      <p className="text-[10px] text-zinc-500 mt-0.5">{ach.description}</p>
                    </div>
                    <span className={`font-press-start text-[8px] ${unlocked ? 'text-retro-gold' : 'text-zinc-700'}`}>
                      {unlocked ? `+${ach.reward}✓` : `+${ach.reward}`}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* SHOP MODAL */}
      {showShop && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1b1b32] border-4 border-zinc-900 rounded-3xl p-6 w-full max-w-lg shadow-2xl animate-fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-press-start text-sm text-retro-gold">皮肤商店</h2>
              <div className="flex items-center gap-3">
                <span className="font-press-start text-[10px] text-retro-gold">{totalCoins} 硬币</span>
                <button
                  onClick={() => setShowShop(false)}
                  className="text-zinc-500 hover:text-white text-xl leading-none cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {SHOP_SKINS.map(skin => {
                const owned = ownedSkins.includes(skin.id);
                const equipped = equippedSkin === skin.id;
                const canAfford = totalCoins >= skin.price;
                return (
                  <div
                    key={skin.id}
                    className={`bg-[#121221] border-2 rounded-xl p-4 flex items-center gap-4 transition ${
                      equipped ? 'border-retro-gold shadow-[0_0_12px_rgba(255,204,0,0.3)]' : 'border-zinc-800'
                    }`}
                  >
                    <div
                      className="w-14 h-14 rounded-lg border-2 border-zinc-700 flex-shrink-0 flex items-center justify-center"
                      style={{ backgroundColor: skin.suitColor }}
                    >
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: skin.visorColor, boxShadow: `0 0 6px ${skin.visorColor}` }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-press-start text-[9px] text-zinc-200">{skin.name}</span>
                        {equipped && (
                          <span className="text-[8px] px-1.5 py-0.5 bg-retro-gold/20 text-retro-gold border border-retro-gold/50 rounded font-sans">
                            装备中
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-zinc-500 mt-0.5">{skin.description}</p>
                    </div>
                    {owned ? (
                      <button
                        onClick={() => handleEquipSkin(skin.id)}
                        disabled={equipped}
                        className={`px-3 py-2 rounded-lg font-press-start text-[8px] transition cursor-pointer ${
                          equipped
                            ? 'bg-zinc-800 text-zinc-600 cursor-default'
                            : 'bg-cyan-900/60 text-cyan-400 hover:bg-cyan-800 border border-cyan-700'
                        }`}
                      >
                        {equipped ? '已装备' : '装备'}
                      </button>
                    ) : (
                      <button
                        onClick={() => handleBuySkin(skin.id)}
                        disabled={!canAfford}
                        className={`px-3 py-2 rounded-lg font-press-start text-[8px] transition cursor-pointer ${
                          canAfford
                            ? 'bg-retro-gold/20 text-retro-gold hover:bg-retro-gold/40 border border-retro-gold/50'
                            : 'bg-zinc-800 text-zinc-600 cursor-default'
                        }`}
                      >
                        {skin.price === 0 ? '免费' : `${skin.price} 币`}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <footer className="py-4 text-center text-[10px] text-zinc-600 border-t border-zinc-950 w-full max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center px-6 gap-2">
        <span>© 2026 情绪闯关 EmoRunner. 无数据上传，全本地计算。</span>
      </footer>

    </div>
  );
}
