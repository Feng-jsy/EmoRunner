/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { CalibrationConfig } from '../types';
import CameraTracker from './CameraTracker';
import { Sparkles, RefreshCw, Smile, Zap, CheckCircle, ArrowRight } from 'lucide-react';

interface CalibrationMenuProps {
  onSaveCalibration: (config: CalibrationConfig) => void;
  onBack: () => void;
  currentConfig: CalibrationConfig;
}

export default function CalibrationMenu({
  onSaveCalibration,
  onBack,
  currentConfig,
}: CalibrationMenuProps) {
  const [step, setStep] = useState<'NEUTRAL' | 'SMILE' | 'SURPRISE' | 'DONE'>('NEUTRAL');
  const [neutralSmile, setNeutralSmile] = useState<number>(currentConfig.neutralSmile || 0.18);
  const [neutralSurprise, setNeutralSurprise] = useState<number>(currentConfig.neutralSurprise || 0.04);
  const [smileVal, setSmileVal] = useState<number>(0);
  const [surpriseVal, setSurpriseVal] = useState<number>(0);

  const [calibratedSmileRatio, setCalibratedSmileRatio] = useState<number>(currentConfig.smileThreshold || 0.24);
  const [calibratedSurpriseRatio, setCalibratedSurpriseRatio] = useState<number>(currentConfig.surpriseThreshold || 0.08);

  const [liveSmile, setLiveSmile] = useState<number>(0);
  const [liveSurprise, setLiveSurprise] = useState<number>(0);

  // Buffer live expression values
  function handleExpressions(smile: number, surprise: number) {
    setLiveSmile(smile);
    setLiveSurprise(surprise);
  }

  function handleTriggerAction(action: 'JUMP' | 'SHIELD_ON' | 'SHIELD_OFF') {
    // No action needed during calibration itself, just track numbers
  }

  // 1. Calibrate baseline neutral
  function captureNeutral() {
    // Store current live numbers as neutral center
    const lockedSmile = liveSmile > 0 ? liveSmile : 0.18;
    const lockedSurprise = liveSurprise > 0 ? liveSurprise : 0.04;
    setNeutralSmile(lockedSmile);
    setNeutralSurprise(lockedSurprise);
    setStep('SMILE');
  }

  // 2. Calibrate active smile
  function captureSmile() {
    const lockedSmile = liveSmile > 0 ? liveSmile : 0.28;
    // Threshold should be comfortably between neutral and smiling
    // Let's take: neutralSmile + (activeSmile - neutralSmile) * 0.45
    // or standard offset. Let's make it 1.25x of neutral or 0.45 offset
    const computedThreshold = neutralSmile + (lockedSmile - neutralSmile) * 0.55;
    
    // Safety fallback boundaries
    const safeThreshold = Math.max(neutralSmile + 0.02, Math.min(lockedSmile - 0.01, computedThreshold));
    setCalibratedSmileRatio(safeThreshold);
    setStep('SURPRISE');
  }

  // 3. Calibrate active surprise
  function captureSurprise() {
    const lockedSurprise = liveSurprise > 0 ? liveSurprise : 0.10;
    // Threshold comfortable between neutral and surprised jaw open
    const computedThreshold = neutralSurprise + (lockedSurprise - neutralSurprise) * 0.55;
    
    const safeThreshold = Math.max(neutralSurprise + 0.015, Math.min(lockedSurprise - 0.01, computedThreshold));
    setCalibratedSurpriseRatio(safeThreshold);
    setStep('DONE');
  }

  function handleSave() {
    const finalConfig: CalibrationConfig = {
      neutralSmile,
      neutralSurprise,
      smileThreshold: calibratedSmileRatio,
      surpriseThreshold: calibratedSurpriseRatio,
      isCalibrated: true,
    };
    onSaveCalibration(finalConfig);
  }

  function handleReset() {
    setStep('NEUTRAL');
    setNeutralSmile(0.18);
    setNeutralSurprise(0.04);
    setCalibratedSmileRatio(0.24);
    setCalibratedSurpriseRatio(0.08);
  }

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-6 flex flex-col md:flex-row gap-6 items-stretch justify-center h-full min-h-[500px]">
      
      {/* LEFT COLUMN: Camera & Tracking Video */}
      <div className="w-full md:w-5/12 flex-shrink-0 flex flex-col justify-between">
        <div className="flex flex-col h-full bg-[#161623] rounded-2xl p-4 border-2 border-zinc-900">
          <div className="font-press-start text-[10px] text-zinc-400 mb-3 flex items-center justify-between">
            <span>🔴 CALIBRATION CORE</span>
            <span className="text-zinc-500 text-[8px] animate-pulse">SYSTEM ONLINE</span>
          </div>
          
          <div className="w-full h-80 relative flex-1 min-h-[300px]">
            <CameraTracker
              onExpressions={handleExpressions}
              // Temp values display live
              smileThreshold={calibratedSmileRatio}
              surpriseThreshold={calibratedSurpriseRatio}
              onTriggerAction={handleTriggerAction}
              isCalibrated={true}
              showOverlay={true}
            />
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: Interactive Calibration Steps Wizard */}
      <div className="w-full md:w-7/12 flex flex-col justify-between bg-[#19192b] border-2 border-zinc-800 rounded-3xl p-6 relative">
        <div className="flex justify-between items-center pb-4 border-b border-zinc-800 mb-6">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-retro-gold animate-spin" />
            <span className="font-press-start text-xs text-retro-gold tracking-wide">面部表情校准实验室</span>
          </div>
          <button
            onClick={onBack}
            className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 rounded text-xs text-zinc-300 font-medium font-mono hover:text-white"
          >
            返回主页
          </button>
        </div>

        {/* Wizard Steps indicator */}
        <div className="grid grid-cols-4 gap-2 mb-6">
          <div className={`h-2.5 rounded-full ${step === 'NEUTRAL' ? 'bg-cyan-500 shadow-[0_0_8px_#00ffff]' : 'bg-zinc-800'}`} />
          <div className={`h-2.5 rounded-full ${step === 'SMILE' ? 'bg-emerald-500 shadow-[0_0_8px_#39ff14]' : step === 'NEUTRAL' ? 'bg-zinc-800' : 'bg-emerald-900/60'}`} />
          <div className={`h-2.5 rounded-full ${step === 'SURPRISE' ? 'bg-amber-400 shadow-[0_0_8px_#ffcc00]' : step === 'NEUTRAL' || step === 'SMILE' ? 'bg-zinc-800' : 'bg-amber-900/60'}`} />
          <div className={`h-2.5 rounded-full ${step === 'DONE' ? 'bg-violet-500 shadow-[0_0_8px_#a78bfa]' : 'bg-zinc-800'}`} />
        </div>

        {/* Dynamic step rendering */}
        <div className="flex-1 flex flex-col justify-center">
          {step === 'NEUTRAL' && (
            <div className="space-y-4 animate-fade-in">
              <div className="bg-[#1f1e38] p-4 rounded-xl border border-cyan-800/50 flex gap-3">
                <span className="text-2xl mt-1">😐</span>
                <div>
                  <h3 className="font-sans font-bold text-cyan-400 text-sm">第一步：基准校准（平静表情）</h3>
                  <p className="font-sans text-xs text-zinc-400 mt-1 leading-relaxed">
                    面对摄像头，放松面部肌肉，保持<b>平静、无表情</b>的状态 2 秒。
                  </p>
                </div>
              </div>

              <div className="bg-[#10101c] p-4 rounded-xl border border-zinc-800 flex flex-col gap-2">
                <span className="text-[10px] font-press-start text-zinc-500">REALTIME DATA SENSORS</span>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-[#161623] p-3 rounded border border-zinc-800">
                    <span className="text-[10px] text-zinc-500 block">当前嘴角拉伸</span>
                    <span className="text-sm font-semibold font-mono text-cyan-400">{(liveSmile * 100).toFixed(1)}%</span>
                  </div>
                  <div className="bg-[#161623] p-3 rounded border border-zinc-800">
                    <span className="text-[10px] text-zinc-500 block">当前小颌张开</span>
                    <span className="text-sm font-semibold font-mono text-cyan-400">{(liveSurprise * 100).toFixed(1)}%</span>
                  </div>
                </div>
              </div>

              <button
                onClick={captureNeutral}
                className="w-full py-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold rounded-xl shadow-lg shadow-cyan-900/40 transition-all font-press-start text-[10px] flex items-center justify-center gap-2 cursor-pointer mt-4"
              >
                <ArrowRight className="w-4 h-4 text-slate-900" />
                捕获平静基准
              </button>
            </div>
          )}

          {step === 'SMILE' && (
            <div className="space-y-4 animate-fade-in">
              <div className="bg-[#1e2f2e] p-4 rounded-xl border border-emerald-800/50 flex gap-3">
                <span className="text-2xl mt-1">😀</span>
                <div>
                  <h3 className="font-sans font-bold text-emerald-400 text-sm">第二步：笑脸校准（控制跳跃）</h3>
                  <p className="font-sans text-xs text-zinc-400 mt-1 leading-relaxed">
                    面对摄像头，<b>露出明显的笑容 / 嘴角尽量向外拉缩</b>，然后在微笑时点击捕获。
                  </p>
                </div>
              </div>

              <div className="bg-[#10101c] p-4 rounded-xl border border-zinc-800 flex flex-col gap-2">
                <span className="text-[10px] font-press-start text-zinc-500">SMILE PARAMETERS</span>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-zinc-400">平静水平基线：</span>
                      <span className="font-mono text-cyan-400">{(neutralSmile * 100).toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-zinc-400">当前实时嘴角：</span>
                      <span className="font-mono text-emerald-400 font-semibold animate-pulse">{(liveSmile * 100).toFixed(1)}%</span>
                    </div>
                  </div>
                  <p className="text-[11px] text-zinc-500">笑脸状态的值必须明显高于平静状态，以便引擎准确识别跳跃命令。</p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleReset}
                  className="px-4 py-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold rounded-xl transition-all flex items-center justify-center cursor-pointer"
                  title="返工"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
                <button
                  onClick={captureSmile}
                  className="flex-1 py-4 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-slate-950 font-bold rounded-xl shadow-lg shadow-emerald-900/40 transition-all font-press-start text-[10px] flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Smile className="w-4 h-4 text-slate-900" />
                  捕获微笑表情
                </button>
              </div>
            </div>
          )}

          {step === 'SURPRISE' && (
            <div className="space-y-4 animate-fade-in">
              <div className="bg-[#2f271e] p-4 rounded-xl border border-amber-800/50 flex gap-3">
                <span className="text-2xl mt-1">😮</span>
                <div>
                  <h3 className="font-sans font-bold text-amber-400 text-sm">第三步：惊讶校准（开启护盾）</h3>
                  <p className="font-sans text-xs text-zinc-400 mt-1 leading-relaxed">
                    面对摄像头，<b>张大你的嘴巴表露出惊讶、震撼的姿态</b>（嘴巴纵向张大），保持并点击捕获。
                  </p>
                </div>
              </div>

              <div className="bg-[#10101c] p-4 rounded-xl border border-zinc-800 flex flex-col gap-2">
                <span className="text-[10px] font-press-start text-zinc-500">SURPRISE DETECT ENGINE</span>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-zinc-400">平静嘴高基线：</span>
                      <span className="font-mono text-cyan-400">{(neutralSurprise * 100).toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-zinc-400">当前实时嘴高：</span>
                      <span className="font-mono text-amber-400 font-semibold animate-pulse">{(liveSurprise * 100).toFixed(1)}%</span>
                    </div>
                  </div>
                  <p className="text-[11px] text-zinc-500">张大嘴时的数据会明显陡增。这个动作在游戏中用来瞬间展开能量护盾打破箱子。</p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleReset}
                  className="px-4 py-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold rounded-xl transition-all flex items-center justify-center cursor-pointer"
                  title="重新开始"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
                <button
                  onClick={captureSurprise}
                  className="flex-1 py-4 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-bold rounded-xl shadow-lg shadow-amber-900/40 transition-all font-press-start text-[10px] flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Zap className="w-4 h-4 text-slate-900" />
                  捕获惊讶表情
                </button>
              </div>
            </div>
          )}

          {step === 'DONE' && (
            <div className="space-y-4 animate-fade-in text-center py-4">
              <div className="inline-flex p-3 bg-violet-900/30 rounded-2xl border border-violet-500 mb-2">
                <CheckCircle className="w-10 h-10 text-violet-400" />
              </div>
              <h3 className="font-press-start text-xs text-violet-400">CALIBRATION SUCCESSFUL</h3>
              <p className="font-sans text-xs text-zinc-400 leading-relaxed max-w-sm mx-auto">
                面部扫描参数已成功优化！游戏引擎现已学会您的面部几何结构，跳跃和防护罩能够随心出发。
              </p>

              <div className="bg-[#12121f] p-4 rounded-2xl border border-zinc-800 text-left text-xs max-w-md mx-auto space-y-1.5 text-zinc-400 font-mono">
                <div className="flex justify-between">
                  <span>笑脸判定点：</span>
                  <span className="text-emerald-400">({(calibratedSmileRatio * 100).toFixed(1)}%)以上确认跳跃</span>
                </div>
                <div className="flex justify-between">
                  <span>惊讶核心值：</span>
                  <span className="text-cyan-400">({(calibratedSurpriseRatio * 100).toFixed(1)}%)以上激活护盾</span>
                </div>
              </div>

              <div className="flex gap-3 justify-center pt-2">
                <button
                  onClick={handleReset}
                  className="px-6 py-3.5 bg-zinc-850 hover:bg-zinc-800 text-zinc-300 rounded-xl transition-all flex items-center gap-2 text-xs font-medium cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4" /> 重新校准
                </button>
                <button
                  onClick={handleSave}
                  className="px-8 py-3.5 bg-gradient-to-r from-violet-500 to-fuchsia-600 hover:from-violet-400 hover:to-fuchsia-500 text-white font-bold rounded-xl shadow-lg shadow-violet-900/40 transition-all font-press-start text-[10px] flex items-center gap-2 cursor-pointer"
                >
                  保存并开启冒险
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="pt-4 border-t border-zinc-900 text-center text-[10px] text-zinc-600">
          * 提示：校准时请面朝光源，避开背光，使人脸特征点保持连贯。
        </div>
      </div>
    </div>
  );
}
