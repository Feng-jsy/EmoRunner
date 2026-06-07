/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type GameState = 'MENU' | 'CALIBRATION' | 'PRELOADING' | 'PLAYING' | 'GAMEOVER';

export interface CalibrationConfig {
  neutralSmile: number;
  neutralSurprise: number;
  smileThreshold: number;
  surpriseThreshold: number;
  isCalibrated: boolean;
}

export type ObstacleType = 'CRATE' | 'PIT';

export interface Obstacle {
  id: string;
  type: ObstacleType;
  x: number; // horizontal distance in pixel space
  width: number;
  height: number;
  color: string;
  isShattered?: boolean;
}

export interface Coin {
  id: string;
  x: number;
  y: number;
  collected: boolean;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  alpha: number;
  life: number;
}

export interface GameScore {
  score: number;
  coins: number;
  dateTime: string;
}

export type SkinId = 'default' | 'flame' | 'gold' | 'ghost';

export interface Skin {
  id: SkinId;
  name: string;
  price: number;
  suitColor: string;
  hairColor: string;
  skinColor: string;
  visorColor: string;
  description: string;
}

export const SHOP_SKINS: Skin[] = [
  { id: 'default', name: '深海蓝西装', price: 0, suitColor: '#1a3a5c', hairColor: '#1a1515', skinColor: '#e8c9a0', visorColor: '#c0a060', description: '经典商务海军蓝' },
  { id: 'flame', name: '酒红西装', price: 1, suitColor: '#5c1a2a', hairColor: '#1c1414', skinColor: '#e8c9a0', visorColor: '#c0392b', description: '大胆勃艮第红' },
  { id: 'gold', name: '炭灰西装', price: 1, suitColor: '#2d2d38', hairColor: '#181818', skinColor: '#e0c8a8', visorColor: '#d4a017', description: '高级合伙人灰' },
  { id: 'ghost', name: '银灰西装', price: 1, suitColor: '#8a8a9a', hairColor: '#2a2830', skinColor: '#e8d8c0', visorColor: '#c0c0e0', description: '神秘顾问银灰' },
];

export const STORAGE_KEYS = {
  totalCoins: 'emotion_run_total_coins',
  ownedSkins: 'emotion_run_owned_skins',
  equippedSkin: 'emotion_run_equipped_skin',
  highScore: 'retro_run_highscore',
  calibration: 'emotion_run_calibration_config',
  achievements: 'emotion_run_achievements',
  totalStats: 'emotion_run_total_stats',
  dailyChallenge: 'emotion_run_daily_challenge',
  leaderboard: 'emotion_run_leaderboard',
  playerName: 'emotion_run_player_name',
  expressionRecords: 'emotion_run_expression_records',
} as const;

export interface LeaderboardEntry {
  name: string;
  score: number;
  coins: number;
  title: string;
  date: string;
}

export interface ExpressionRecord {
  id: string;
  playerName: string;
  date: string;
  smileAvg: number;
  smileMax: number;
  surpriseAvg: number;
  surpriseMax: number;
  jumpCount: number;
  shieldCount: number;
  score: number;
  title: EmotionTitle;
}

export type EmotionTitle = '稳健型' | '冷静型' | '爆发型' | '护盾战神';

export function getEmotionTitle(shattered: number, jumps: number, coins: number): EmotionTitle {
  if (shattered >= 8) return '护盾战神';
  if (jumps >= 15) return '爆发型';
  if (coins >= 10) return '稳健型';
  return '冷静型';
}

export interface AchievementStats {
  totalJumps: number;
  totalShattered: number;
  totalGames: number;
  totalDistance: number;
  totalCoinsCollected: number;
  maxCombo: number;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  reward: number;
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first_jump', name: '初次起跳', description: '完成第一次跳跃', icon: '🦘', reward: 1 },
  { id: 'first_shatter', name: '初次撞碎', description: '第一次用护盾撞碎木箱', icon: '💥', reward: 1 },
  { id: 'play_10', name: '常客', description: '累计游玩10局', icon: '🎮', reward: 3 },
  { id: 'play_50', name: '忠实玩家', description: '累计游玩50局', icon: '🏆', reward: 5 },
  { id: 'distance_5000', name: '马拉松新秀', description: '累计奔跑5000米', icon: '🏃', reward: 2 },
  { id: 'distance_20000', name: '长途跋涉', description: '累计奔跑20000米', icon: '🗺️', reward: 5 },
  { id: 'coins_100', name: '淘金者', description: '累计收集100枚硬币', icon: '💰', reward: 3 },
  { id: 'coins_500', name: '金币大亨', description: '累计收集500枚硬币', icon: '👑', reward: 5 },
  { id: 'combo_5', name: '连击大师', description: '单局达成5连击', icon: '🔥', reward: 3 },
  { id: 'combo_10', name: '连击传说', description: '单局达成10连击', icon: '⚡', reward: 5 },
  { id: 'shatter_20', name: '破坏王', description: '累计撞碎20个木箱', icon: '🪓', reward: 3 },
  { id: 'shatter_100', name: '拆迁队长', description: '累计撞碎100个木箱', icon: '💣', reward: 5 },
  { id: 'jumps_50', name: '跳跃达人', description: '累计跳跃50次', icon: '🎯', reward: 3 },
  { id: 'jumps_200', name: '空中飞人', description: '累计跳跃200次', icon: '✈️', reward: 5 },
];

export type ChallengeType = 'jumps' | 'shatter' | 'coins' | 'distance' | 'combo';

export interface DailyChallenge {
  date: string;
  type: ChallengeType;
  target: number;
  description: string;
  reward: number;
  completed: boolean;
}

const CHALLENGE_POOL: { type: ChallengeType; label: string; tiers: { target: number; reward: number }[] }[] = [
  { type: 'jumps', label: '单局跳跃', tiers: [{ target: 5, reward: 2 }, { target: 10, reward: 3 }, { target: 20, reward: 5 }] },
  { type: 'shatter', label: '单局撞碎箱子', tiers: [{ target: 3, reward: 2 }, { target: 6, reward: 3 }, { target: 10, reward: 5 }] },
  { type: 'coins', label: '单局收集硬币', tiers: [{ target: 5, reward: 2 }, { target: 10, reward: 3 }, { target: 20, reward: 5 }] },
  { type: 'distance', label: '单局奔跑', tiers: [{ target: 500, reward: 2 }, { target: 1000, reward: 3 }, { target: 2000, reward: 5 }] },
  { type: 'combo', label: '单局最高连击', tiers: [{ target: 3, reward: 2 }, { target: 5, reward: 3 }, { target: 8, reward: 5 }] },
];

export interface MiniObjective {
  id: string;
  description: string;
  target: number;
  reward: number;
  type: 'collect_coins' | 'shatter_crates' | 'jump_count' | 'distance';
}

const MINI_OBJECTIVE_POOL: MiniObjective[] = [
  { id: 'mo_coins_50', description: '收集50枚硬币', target: 50, reward: 3, type: 'collect_coins' },
  { id: 'mo_coins_80', description: '收集80枚硬币', target: 80, reward: 5, type: 'collect_coins' },
  { id: 'mo_coins_120', description: '收集120枚硬币', target: 120, reward: 8, type: 'collect_coins' },
  { id: 'mo_shatter_20', description: '撞碎20个木箱', target: 20, reward: 3, type: 'shatter_crates' },
  { id: 'mo_shatter_40', description: '撞碎40个木箱', target: 40, reward: 5, type: 'shatter_crates' },
  { id: 'mo_shatter_60', description: '撞碎60个木箱', target: 60, reward: 8, type: 'shatter_crates' },
  { id: 'mo_jumps_50', description: '完成50次跳跃', target: 50, reward: 3, type: 'jump_count' },
  { id: 'mo_jumps_100', description: '完成100次跳跃', target: 100, reward: 5, type: 'jump_count' },
  { id: 'mo_jumps_150', description: '完成150次跳跃', target: 150, reward: 8, type: 'jump_count' },
  { id: 'mo_dist_3000', description: '奔跑3000米', target: 3000, reward: 3, type: 'distance' },
  { id: 'mo_dist_6000', description: '奔跑6000米', target: 6000, reward: 5, type: 'distance' },
  { id: 'mo_dist_10000', description: '奔跑10000米', target: 10000, reward: 8, type: 'distance' },
];

export function pickRandomMiniObjective(): MiniObjective {
  return MINI_OBJECTIVE_POOL[Math.floor(Math.random() * MINI_OBJECTIVE_POOL.length)];
}

export function generateDailyChallenge(): DailyChallenge {
  const today = new Date().toISOString().slice(0, 10);
  const seed = today.split('-').reduce((s, n) => s + parseInt(n, 10), 0);
  const poolIdx = seed % CHALLENGE_POOL.length;
  const tierIdx = (seed * 7) % CHALLENGE_POOL[poolIdx].tiers.length;
  const pool = CHALLENGE_POOL[poolIdx];
  const tier = pool.tiers[tierIdx];
  return {
    date: today,
    type: pool.type,
    target: tier.target,
    description: `${pool.label}${tier.target}次`,
    reward: tier.reward,
    completed: false,
  };
}
