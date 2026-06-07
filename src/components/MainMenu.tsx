/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { Play, Sparkles, Smile, ShieldAlert, Award, AlertCircle, RefreshCw, Trophy, User, Medal, Camera } from 'lucide-react';
import { CalibrationConfig, ACHIEVEMENTS, DailyChallenge, LeaderboardEntry, ExpressionRecord } from '../types';

interface MainMenuProps {
  onStartGame: () => void;
  onGoToCalibration: () => void;
  calibrationConfig: CalibrationConfig;
  totalCoins: number;
  onOpenShop: () => void;
  onOpenAchievements: () => void;
  unlockedCount: number;
  dailyChallenge: DailyChallenge;
  onClearAllData: () => void;
  playerName: string;
  onPlayerNameChange: (name: string) => void;
  leaderboard: LeaderboardEntry[];
  expressionRecords: ExpressionRecord[];
}

export default function MainMenu({
  onStartGame,
  onGoToCalibration,
  calibrationConfig,
  totalCoins,
  onOpenShop,
  onOpenAchievements,
  unlockedCount,
  dailyChallenge,
  onClearAllData,
  playerName,
  onPlayerNameChange,
  leaderboard,
  expressionRecords,
}: MainMenuProps) {
  const [hasCameraAccess, setHasCameraAccess] = useState<boolean | null>(null);
  const [showGallery, setShowGallery] = useState<boolean>(false);

  // Check general media query
  useEffect(() => {
    // Check if camera permission flows can start
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      setHasCameraAccess(true);
    } else {
      setHasCameraAccess(false);
    }
  }, []);

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8 flex flex-col justify-center items-center gap-8 min-h-[550px] animate-fade-in select-none">
      
      {/* 8-bit ARCADE MACHINE LOGO HEADER */}
      <div className="text-center space-y-4 max-w-md">
        <div className="relative inline-block py-2">
          {/* Animated retro pixel glow overlay */}
          <h1 className="font-press-start text-3xl md:text-4xl tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-retro-gold via-white to-retro-green drop-shadow-[0_4px_12px_rgba(255,204,0,0.45)] animate-pulse">
            情绪闯关 EmoRunner
          </h1>
          <div className="absolute -top-3 -right-6 text-[9px] font-press-start bg-rose-500 text-white font-bold px-1 py-0.5 rounded rotate-12 scale-90 animate-bounce">
                        MVP+ v2.7
          </div>
        </div>
        
        <p className="font-sans text-xs text-zinc-400 font-medium tracking-wide leading-relaxed">
          基于 <b>Web 摄像头表情检测</b> 的 2D 像素闯关游戏。
          <br />
          使用笑脸触发跳跃，张大嘴巴召唤力量护盾打击障碍！
        </p>
      </div>

      {/* CORE CONTROL CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-3xl">
        
        {/* PLAY DIRECTLY PANEL */}
        <div className="bg-[#1a1a2e] border-2 border-zinc-800 rounded-2xl p-6 flex flex-col justify-between items-stretch transition hover:border-[#39ff14]/40 hover:-translate-y-0.5 shadow-xl">
          <div className="space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-zinc-800">
              <span className="font-press-start text-[10px] text-emerald-400">01 / ADVENTURE</span>
              <span className="text-[9px] font-sans px-2 py-0.5 bg-emerald-950/60 text-emerald-400 border border-emerald-800 rounded">
                推荐动作
              </span>
            </div>
            
            <h3 className="font-sans font-bold text-[#e0e0ea] text-lg">主线闯关模式</h3>
            <p className="font-sans text-xs text-zinc-400 leading-relaxed">
              人物将不停向前跑，需要面对层出不穷的<b>虚空悬崖</b>和<b>致命木箱障碍</b>。在极速增加的难度中坚持更长距离！
            </p>

            <div className="space-y-2 bg-[#121221] p-3 rounded-xl border border-zinc-900 text-xs text-zinc-400 font-sans">
              <div className="flex items-center gap-2">
                <span className="text-emerald-400 font-sans">😀 笑脸表情</span>
                <span className="text-zinc-500">➔</span>
                <span className="text-zinc-300"><b>跳跃</b> 以跃过大峡谷与障碍</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-cyan-400 font-sans">😮 惊讶表情</span>
                <span className="text-zinc-500">➔</span>
                <span className="text-zinc-300"><b>激活护盾</b> 瞬间撞碎挡路的大木箱</span>
              </div>
            </div>
          </div>

          <button
            onClick={onStartGame}
            className="w-full py-4 mt-6 bg-gradient-to-r from-[#39ff14] to-emerald-500 hover:from-[#5eff42] hover:to-emerald-400 text-[#0c0c16] font-bold rounded-xl shadow-lg shadow-emerald-900/30 transition duration-150 font-press-start text-[10px] flex items-center justify-center gap-2 cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current stroke-0" />
            开启探索闯关
          </button>
        </div>

        {/* CALIBRATION LABORATORY PANEL */}
        <div className="bg-[#1a1a2e] border-2 border-zinc-800 rounded-2xl p-6 flex flex-col justify-between items-stretch transition hover:border-[#00ffff]/40 hover:-translate-y-0.5 shadow-xl">
          <div className="space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-zinc-800">
              <span className="font-press-start text-[10px] text-cyan-400">02 / LABORATORY</span>
              
              {calibrationConfig.isCalibrated ? (
                <span className="text-[9px] font-sans px-2 py-0.5 bg-indigo-950/60 text-indigo-400 border border-indigo-800 rounded">
                  已校准 ✓
                </span>
              ) : (
                <span className="text-[9px] font-sans px-2 py-0.5 bg-amber-950/60 text-retro-amber border border-amber-800 rounded animate-pulse">
                  未校准 (建议进行)
                </span>
              )}
            </div>
            
            <h3 className="font-sans font-bold text-[#e0e0ea] text-lg">面部微表情识别调校</h3>
            <p className="font-sans text-xs text-zinc-400 leading-relaxed">
              每个人的脸型结构、嘴型、光照和摄像头焦距不同。实验室可通过简单的平静、微笑、惊讶三步，<b>定制生成专属您的判定阈值</b>。
            </p>

            <div className="bg-[#121221] p-3 rounded-xl border border-zinc-900 space-y-1 text-xs text-zinc-400 font-mono">
              <div className="flex justify-between">
                <span>校准状态：</span>
                <span className={calibrationConfig.isCalibrated ? 'text-emerald-400 font-bold' : 'text-amber-500'}>
                  {calibrationConfig.isCalibrated ? '定制就绪' : '默认参数'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>笑脸判定灵敏度：</span>
                <span className="text-zinc-300">{(calibrationConfig.smileThreshold * 100).toFixed(0)}%</span>
              </div>
              <div className="flex justify-between">
                <span>惊讶判定灵敏度：</span>
                <span className="text-zinc-300">{(calibrationConfig.surpriseThreshold * 100).toFixed(0)}%</span>
              </div>
            </div>
          </div>

          <button
            onClick={onGoToCalibration}
            className="w-full py-4 mt-6 bg-gradient-to-r from-[#00ffff] to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-[#0c0c16] font-bold rounded-xl shadow-lg shadow-cyan-900/30 transition duration-150 font-press-start text-[10px] flex items-center justify-center gap-2 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 fill-current stroke-0" />
            表情校准实验室
          </button>
        </div>

      </div>

      {/* SHOP & COINS + PLAYER ID */}
      <div className="w-full max-w-3xl">
        <div className="bg-[#1a1a2e] border-2 border-zinc-800 rounded-2xl p-5 flex items-center justify-between gap-4 hover:border-retro-gold/40 transition shadow-xl flex-wrap">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-[#241d1a] text-retro-gold rounded-lg border border-yellow-700/50">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-press-start text-zinc-500 block">累计硬币</span>
              <span className="font-press-start text-xl text-retro-gold font-bold">{totalCoins}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-[#121221] border border-zinc-700 rounded-lg px-3 py-2">
              <User className="w-4 h-4 text-zinc-500" />
              <input
                type="text"
                value={playerName}
                onChange={(e) => onPlayerNameChange(e.target.value.slice(0, 8))}
                placeholder="输入玩家ID"
                maxLength={8}
                className="bg-transparent text-zinc-300 text-xs font-sans outline-none w-24 placeholder-zinc-600"
              />
            </div>
            <button
              onClick={() => setShowGallery(true)}
              className="px-4 py-3 bg-[#1a1a2e] hover:bg-[#22223a] text-zinc-300 border border-zinc-700 rounded-xl shadow-lg transition font-press-start text-[10px] flex items-center gap-2 cursor-pointer"
            >
              <Camera className="w-4 h-4 text-purple-400" />
              图鉴 ({expressionRecords.length})
            </button>
            <button
              onClick={onOpenAchievements}
              className="px-4 py-3 bg-[#1a1a2e] hover:bg-[#22223a] text-zinc-300 border border-zinc-700 rounded-xl shadow-lg transition font-press-start text-[10px] flex items-center gap-2 cursor-pointer"
            >
              <Trophy className="w-4 h-4 text-retro-gold" />
              成就 ({unlockedCount}/{ACHIEVEMENTS.length})
            </button>
            <button
              onClick={onOpenShop}
              className="px-5 py-3 bg-gradient-to-r from-retro-gold to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-[#0c0c16] font-bold rounded-xl shadow-lg transition font-press-start text-[10px] flex items-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              皮肤商店
            </button>
          </div>
        </div>
      </div>

      {/* DAILY CHALLENGE */}
      <div className="w-full max-w-3xl">
        <div className={`bg-[#1a1a2e] border-2 rounded-2xl p-5 flex items-center justify-between gap-4 transition shadow-xl ${
          dailyChallenge.completed ? 'border-emerald-700/50' : 'border-cyan-700/40 hover:border-cyan-400/50'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-lg border ${
              dailyChallenge.completed
                ? 'bg-emerald-950/40 text-emerald-400 border-emerald-700/50'
                : 'bg-cyan-950/40 text-cyan-400 border-cyan-700/50 animate-pulse'
            }`}>
              <Trophy className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-press-start text-zinc-500 block">每日挑战</span>
              <span className={`font-press-start text-sm font-bold ${
                dailyChallenge.completed ? 'text-emerald-400 line-through' : 'text-cyan-400'
              }`}>
                {dailyChallenge.description}
              </span>
              <span className="font-sans text-[10px] text-zinc-500 block mt-0.5">
                {dailyChallenge.completed ? '今日已完成 ✓' : `奖励 +${dailyChallenge.reward} 硬币`}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* LEADERBOARD & KEYBOARD SHORTCUTS */}
      <div className="w-full max-w-3xl grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">

        {/* LOCAL LEADERBOARD */}
        <div className="bg-zinc-950/60 border border-zinc-900 rounded-2xl p-5 flex flex-col">
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-zinc-800">
            <Medal className="w-4 h-4 text-retro-gold" />
            <span className="font-press-start text-[9px] text-retro-gold">本地排行榜</span>
          </div>
          <div className="space-y-1.5 flex-1">
            {leaderboard.slice(0, 10).map((entry, idx) => (
              <div
                key={idx}
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
                <div className="flex items-center gap-3">
                  <span className="text-zinc-500 text-[9px]">{entry.title}</span>
                  <span className="font-press-start text-[9px] text-retro-gold tabular-nums">{entry.score}</span>
                </div>
              </div>
            ))}
            {leaderboard.length === 0 && (
              <p className="text-zinc-600 text-[10px] text-center py-4">暂无纪录，快去挑战吧!</p>
            )}
          </div>
        </div>

        {/* REASSURING FALLBACK STATEMENT */}
        <div className="bg-zinc-950/60 border border-zinc-900 rounded-2xl p-5 flex items-center gap-3">
          <div className="p-3 bg-[#1d1c2b] text-indigo-400 rounded-lg border border-indigo-900/50">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div className="text-xs font-sans text-zinc-400 leading-relaxed">
            <p className="font-semibold text-zinc-300">💡 备用物理按键支持</p>
            <p className="text-[11px] text-zinc-500 mt-0.5">
              如果您由于权限、网络等原因无法正常开启镜头面部捕获，您可自由使用<b>[空格键/向上箭头] 控制跳跃</b>，和<b>[S 键/向下箭头] 控制防御</b>进行流畅游玩。
            </p>
          </div>
        </div>

      </div>

      {/* EXPRESSION GALLERY MODAL */}
      {showGallery && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1b1b32] border-4 border-zinc-900 rounded-3xl p-6 w-full max-w-2xl shadow-2xl animate-fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-press-start text-sm text-purple-400">表情收集图鉴</h2>
              <div className="flex items-center gap-3">
                <span className="font-press-start text-[10px] text-zinc-500">{expressionRecords.length} 条记录</span>
                <button onClick={() => setShowGallery(false)} className="text-zinc-500 hover:text-white text-xl leading-none cursor-pointer">✕</button>
              </div>
            </div>

            {/* Per-player aggregate stats */}
            {(() => {
              const playerMap = new Map<string, ExpressionRecord[]>();
              expressionRecords.forEach(r => {
                const list = playerMap.get(r.playerName) || [];
                list.push(r);
                playerMap.set(r.playerName, list);
              });
              const playerSummaries = Array.from(playerMap.entries())
                .sort((a, b) => b[1].length - a[1].length);

              if (playerSummaries.length === 0) {
                return <p className="text-zinc-500 text-sm text-center py-8">暂无表情记录，快去玩一局吧!</p>;
              }

              return (
                <div className="space-y-6">
                  {/* Player summary cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {playerSummaries.map(([name, records]) => {
                      const totalSmileAvg = records.reduce((s, r) => s + r.smileAvg, 0) / records.length;
                      const totalSurpriseAvg = records.reduce((s, r) => s + r.surpriseAvg, 0) / records.length;
                      const bestScore = Math.max(...records.map(r => r.score));
                      return (
                        <div key={name} className={`bg-[#121221] border rounded-xl p-4 ${
                          name === (playerName.trim() || '匿名玩家') ? 'border-purple-500/40 shadow-[0_0_12px_rgba(168,85,247,0.15)]' : 'border-zinc-800'
                        }`}>
                          <div className="flex items-center gap-2 mb-3">
                            <User className="w-4 h-4 text-purple-400" />
                            <span className="font-press-start text-[9px] text-zinc-200">{name}</span>
                            <span className="text-[9px] text-zinc-600 ml-auto">{records.length}局</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                            <div className="flex justify-between bg-zinc-900/50 px-2 py-1 rounded">
                              <span className="text-zinc-500">平均笑脸</span>
                              <span className="text-emerald-400">{(totalSmileAvg * 100).toFixed(0)}%</span>
                            </div>
                            <div className="flex justify-between bg-zinc-900/50 px-2 py-1 rounded">
                              <span className="text-zinc-500">平均惊讶</span>
                              <span className="text-cyan-400">{(totalSurpriseAvg * 100).toFixed(0)}%</span>
                            </div>
                            <div className="flex justify-between bg-zinc-900/50 px-2 py-1 rounded">
                              <span className="text-zinc-500">最佳成绩</span>
                              <span className="text-retro-gold">{bestScore}m</span>
                            </div>
                            <div className="flex justify-between bg-zinc-900/50 px-2 py-1 rounded">
                              <span className="text-zinc-500">总触发</span>
                              <span className="text-zinc-300">{records.reduce((s, r) => s + r.jumpCount + r.shieldCount, 0)}次</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Per-game records */}
                  <div>
                    <h3 className="font-press-start text-[9px] text-zinc-500 mb-3 pb-2 border-b border-zinc-800">对局记录</h3>
                    <div className="space-y-2">
                      {expressionRecords.slice(0, 30).map((record) => (
                        <div key={record.id} className="bg-[#121221] border border-zinc-800 rounded-xl p-3 flex items-center gap-3">
                          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-zinc-900 border border-zinc-700 flex items-center justify-center">
                            <span className="text-lg">{record.smileAvg > record.surpriseAvg ? '😀' : '😮'}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-press-start text-[8px] text-zinc-300">{record.playerName}</span>
                              <span className="text-[9px] text-zinc-600">{record.date}</span>
                              <span className="text-[8px] px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-400">{record.title}</span>
                            </div>
                            <div className="flex items-center gap-3 mt-1 text-[9px] font-mono">
                              <span className="text-emerald-400">笑均{(record.smileAvg * 100).toFixed(0)}%</span>
                              <span className="text-emerald-600">峰{(record.smileMax * 100).toFixed(0)}%</span>
                              <span className="text-cyan-400">讶均{(record.surpriseAvg * 100).toFixed(0)}%</span>
                              <span className="text-cyan-600">峰{(record.surpriseMax * 100).toFixed(0)}%</span>
                            </div>
                            <div className="flex items-center gap-2 mt-0.5 text-[8px] text-zinc-600">
                              <span>跳{record.jumpCount}次</span>
                              <span>盾{record.shieldCount}次</span>
                              <span>得分{record.score}m</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* RESET DATA */}
      <div className="w-full max-w-3xl flex justify-center mt-4">
        <button
          onClick={() => {
            if (confirm('确认清除所有数据吗？这将删除金币、皮肤、成就、纪录等所有本地存储数据，此操作不可恢复！')) {
              onClearAllData();
            }
          }}
          className="px-4 py-2 bg-transparent hover:bg-red-950/30 text-zinc-700 hover:text-red-500 border border-zinc-800 hover:border-red-800 rounded-lg text-[9px] font-sans transition cursor-pointer"
        >
          清除所有本地数据
        </button>
      </div>

    </div>
  );
}
