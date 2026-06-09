/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GAME_BALANCE, Obstacle, Coin, PowerUp, PowerUpType, POWERUP_DEFS } from '../types';

export interface SpawnContext {
  W: number;
  floorYLevel: number;
  obstacles: Obstacle[];
  coins: Coin[];
  powerUps: PowerUp[];
  distanceTraveled: number;
  lastSpawnDistance: number;
  coinRainPhase: number;
}

export interface SpawnResult {
  lastSpawnDistance: number;
  coinRainPhase: number;
}

export function runSpawning(ctx: SpawnContext): SpawnResult {
  // Interval-based obstacle & coin spawning
  if (ctx.distanceTraveled - ctx.lastSpawnDistance > GAME_BALANCE.spawnIntervalBase + Math.random() * GAME_BALANCE.spawnIntervalRandom) {
    ctx.lastSpawnDistance = ctx.distanceTraveled;

    const rand = Math.random();
    const dist = ctx.distanceTraveled;
    const comboChance = Math.min(0.5, Math.floor(dist / GAME_BALANCE.zoneInterval) * 0.05);

    const zoneIndex = Math.floor(dist / GAME_BALANCE.zoneInterval) % 3;
    const zoneCrateRate = [0.2, 0.3, 0.5][zoneIndex];
    const zonePitRate = [0.2, 0.4, 0.1][zoneIndex];
    const zoneCoinRate = [0.45, 0.15, 0.25][zoneIndex];

    const crateThreshold = comboChance + zoneCrateRate;
    const pitThreshold = crateThreshold + zonePitRate;
    const coinThreshold = pitThreshold + zoneCoinRate;

    const W = ctx.W;
    const floorYLevel = ctx.floorYLevel;

    if (rand < comboChance) {
      const pattern = Math.floor(Math.random() * 3);
      if (pattern === 0) {
        ctx.obstacles.push(
          { id: `pit_before_${Date.now()}`, type: 'PIT', x: W + 20, width: 100, height: 120, color: '#111119' },
          { id: `crate_after_${Date.now()}`, type: 'CRATE', x: W + 155, width: 32, height: 38, color: '#c07038' },
        );
        const guideN = 3;
        for (let g = 0; g < guideN; g++) {
          const t = (g + 1) / (guideN + 1);
          const xOff = t * 135;
          const yOff = 4 * 72 * t * (1 - t);
          ctx.coins.push({ id: `coin_guide_${Date.now()}_${g}`, x: W + 20 + xOff, y: floorYLevel - 18 - yOff, collected: false });
        }
      } else if (pattern === 1) {
        const arcN = 5;
        const arcSpan = 120;
        const arcPeak = 75;
        for (let i = 0; i < arcN; i++) {
          const t = i / (arcN - 1);
          const xOff = t * arcSpan;
          const yOff = 4 * arcPeak * t * (1 - t);
          ctx.coins.push({ id: `coin_arc_${Date.now()}_${i}`, x: W + 20 + xOff, y: floorYLevel - 18 - yOff, collected: false });
        }
        ctx.lastSpawnDistance = ctx.distanceTraveled + 60;
      } else {
        ctx.obstacles.push(
          { id: `crate_wall1_${Date.now()}`, type: 'CRATE', x: W + 20, width: 32, height: 38, color: '#c07038' },
          { id: `crate_wall2_${Date.now()}`, type: 'CRATE', x: W + 76, width: 32, height: 38, color: '#b5651d' },
        );
      }
    } else if (rand < crateThreshold) {
      ctx.obstacles.push({ id: `crate_${Date.now()}`, type: 'CRATE', x: W + 20, width: 32, height: 38, color: '#c07038' });
    } else if (rand < pitThreshold) {
      const pitPairChance = dist > GAME_BALANCE.zoneInterval ? Math.min(0.55, (dist - GAME_BALANCE.zoneInterval) / 5000) : 0;
      if (Math.random() < pitPairChance) {
        const gap = 60 + Math.random() * 100;
        const pitW = 70 + Math.random() * 30;
        const pitBWidth = pitW + Math.random() * 20;
        const pitAX = W + 20;
        const pitBX = W + 20 + pitW + gap;
        const maxPitWidth = 250;

        if (gap < 10) {
          const mergedWidth = Math.min(pitBX + pitBWidth - pitAX, maxPitWidth);
          ctx.obstacles.push({ id: `pit_merged_${Date.now()}`, type: 'PIT', x: pitAX, width: mergedWidth, height: 120, color: '#111119' });
          ctx.coins.push({ id: `coin_gap_${Date.now()}`, x: pitAX + mergedWidth / 2, y: floorYLevel - 75, collected: false });
        } else {
          ctx.obstacles.push(
            { id: `pit_pairA_${Date.now()}`, type: 'PIT', x: pitAX, width: pitW, height: 120, color: '#111119' },
            { id: `pit_pairB_${Date.now()}`, type: 'PIT', x: pitBX, width: pitBWidth, height: 120, color: '#111119' },
          );
          ctx.coins.push({ id: `coin_gap_${Date.now()}`, x: W + 20 + pitW + gap / 2, y: floorYLevel - 75, collected: false });
        }
      } else {
        const pitW = 105;
        ctx.obstacles.push({ id: `pit_${Date.now()}`, type: 'PIT', x: W + 20, width: pitW, height: 120, color: '#111119' });
        const guideCoinCount = 3;
        for (let g = 0; g < guideCoinCount; g++) {
          const t = (g + 1) / (guideCoinCount + 1);
          const xOff = t * pitW;
          const yOff = 4 * 145 * t * (1 - t);
          ctx.coins.push({ id: `coin_${Date.now()}_${g}`, x: W + 20 + xOff, y: floorYLevel - 18 - yOff, collected: false });
        }
      }
    } else if (rand < coinThreshold) {
      const coinCount = 5 + Math.floor(Math.random() * 4);
      const arcSpanX = 200 + Math.random() * 120;
      const arcPeakY = 140 + Math.random() * 35;
      for (let i = 0; i < coinCount; i++) {
        const t = i / (coinCount - 1);
        const xOff = t * arcSpanX;
        const yOff = 4 * arcPeakY * t * (1 - t);
        ctx.coins.push({ id: `coin_${Date.now()}_${i}`, x: W + 20 + xOff, y: floorYLevel - 18 - yOff, collected: false });
      }
    }
  }

  // Power-up spawn
  if (ctx.distanceTraveled > 150 && Math.random() < 0.00025) {
    const weighted: PowerUpType[] = ['TRIPLE_JUMP', 'MAGNET', 'MAGNET', 'MAGNET', 'RAINBOW_GLOW', 'STAR_TRAIL'];
    const t = weighted[Math.floor(Math.random() * weighted.length)];
    const def = POWERUP_DEFS[t];
    ctx.powerUps.push({
      id: `pu_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
      type: t, x: ctx.W + Math.random() * 100, y: ctx.floorYLevel - 70 - Math.random() * 80,
      collected: false, icon: def.icon, label: def.label, color: def.color,
    });
  }

  // Coin rain
  if (Math.random() < 0.0008) {
    spawnCoinRain(ctx);
  }

  // Giant crate
  if (Math.random() < 0.001) {
    ctx.obstacles.push({ id: `giant_${Date.now()}`, type: 'CRATE', x: ctx.W + 20, width: 52, height: 58, color: '#8b0000' });
  }

  // Ceiling spikes
  const spikeZoneIdx = Math.floor(ctx.distanceTraveled / GAME_BALANCE.zoneInterval) % 3;
  const spikeZoneChance = [0.00015, 0.00025, 0.0001][spikeZoneIdx];
  if (ctx.distanceTraveled > 200 && Math.random() < spikeZoneChance) {
    const spikeDepth = 170 + Math.random() * 120;
    const spikeWidth = 60 + Math.random() * 140;
    ctx.obstacles.push({ id: `spike_${Date.now()}`, type: 'CEILING_SPIKE', x: ctx.W + Math.random() * 60, width: spikeWidth, height: spikeDepth, color: '#8a8a9a' });
  }

  // Hot floor (never above a pit)
  if (ctx.distanceTraveled > 150 && Math.random() < 0.0002) {
    const hw = 100 + Math.random() * 120;
    const hx = ctx.W + 20;
    const overlapsPit = ctx.obstacles.some(o => o.type === 'PIT' && hx < o.x + o.width && hx + hw > o.x);
    if (!overlapsPit) {
      ctx.obstacles.push({ id: `hotfloor_${Date.now()}`, type: 'HOT_FLOOR', x: hx, width: hw, height: 12 + Math.random() * 16, color: '#ff3300' });
    }
  }

  return { lastSpawnDistance: ctx.lastSpawnDistance, coinRainPhase: ctx.coinRainPhase };
}

// ============================================================
// Coin rain — pixel font word art & geometric patterns
// ============================================================

function spawnCoinRain(ctx: SpawnContext): void {
  const W = ctx.W;
  const now = Date.now();
  const coinSize = 10;

  if (ctx.coinRainPhase === 0) {
    ctx.coinRainPhase = 1;
    const startX = W + 20;
    const startY = 100;
    const charV = [[0, 0], [0, 4], [1, 0], [1, 4], [2, 0], [2, 4], [3, 0], [3, 4], [4, 1], [4, 3], [5, 2]];
    const char2 = [[0, 1], [0, 2], [0, 3], [1, 0], [1, 4], [2, 4], [3, 3], [4, 2], [5, 1], [6, 0], [6, 1], [6, 2], [6, 3], [6, 4]];
    const charDot = [[4, 1], [5, 1]];
    const char3 = [[0, 1], [0, 2], [0, 3], [1, 0], [1, 4], [2, 4], [3, 2], [3, 3], [4, 0], [4, 4], [5, 0], [5, 4], [6, 1], [6, 2], [6, 3]];
    const char8 = [[0, 1], [0, 2], [0, 3], [1, 0], [1, 4], [2, 0], [2, 4], [3, 1], [3, 2], [3, 3], [4, 0], [4, 4], [5, 0], [5, 4], [6, 1], [6, 2], [6, 3]];
    const char9 = [[0, 1], [0, 2], [0, 3], [1, 0], [1, 4], [2, 0], [2, 4], [3, 1], [3, 2], [3, 3], [4, 4], [5, 4], [6, 1], [6, 2], [6, 3]];
    const chars: [number, number, number[][]][] = [
      [0, 0, charV], [6, 0, char2], [13, 0, charDot], [19, 0, char3], [26, 0, char9],
    ];
    let id = 0;
    chars.forEach(([colOffset, _rowOffset, bitmap]) => {
      bitmap.forEach(([r, c]) => {
        ctx.coins.push({ id: `rain_${now}_${id++}`, x: startX + (colOffset + c) * coinSize, y: startY + r * coinSize, collected: false });
      });
    });
  } else if (ctx.coinRainPhase === 1) {
    ctx.coinRainPhase = 2;
    const startX = W + 20;
    const startY = 100;
    const charH: number[][] = [[0, 0], [0, 4], [1, 0], [1, 4], [2, 0], [2, 4], [3, 0], [3, 1], [3, 2], [3, 3], [3, 4], [4, 0], [4, 4], [5, 0], [5, 4], [6, 0], [6, 4]];
    const charE: number[][] = [[1, 1], [1, 2], [1, 3], [2, 0], [2, 4], [3, 0], [3, 1], [3, 2], [3, 3], [3, 4], [4, 0], [5, 0], [5, 4], [6, 1], [6, 2], [6, 3]];
    const charL: number[][] = [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [5, 0], [6, 0], [6, 1], [6, 2], [6, 3]];
    const charO: number[][] = [[1, 1], [1, 2], [1, 3], [2, 0], [2, 4], [3, 0], [3, 4], [4, 0], [4, 4], [5, 0], [5, 4], [6, 1], [6, 2], [6, 3]];
    const charTilde: number[][] = [[3, 2], [4, 1], [4, 3], [5, 0], [5, 4]];
    const helloChars: [number, number, number[][]][] = [
      [0, 0, charH], [6, 0, charE], [12, 0, charL], [18, 0, charL], [24, 0, charO], [30, 0, charTilde],
    ];
    let id = 0;
    helloChars.forEach(([colOffset, _rowOffset, bitmap]) => {
      bitmap.forEach(([r, c]) => {
        ctx.coins.push({ id: `rain_${now}_${id++}`, x: startX + (colOffset + c) * coinSize, y: startY + r * coinSize, collected: false });
      });
    });
  } else {
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
              ctx.coins.push({ id: `rain_${now}_${id++}`, x: startX + (colOff + col) * size, y: startY + row * size, collected: false });
            }
          }
        }
        colOff += 6;
      }
    }

    const words = ['wow', 'lol', 'gg', 'win', 'yes', 'cool', 'nice', 'fun', 'pro', 'fire', 'jump', 'boss', 'epic', 'good', 'omg', 'ggwp', 'ha', 'yo', 'go', 'ace'];
    if (Math.random() < 0.5) {
      const word = words[Math.floor(Math.random() * words.length)];
      spellWord(word, W + 20, 100, 10);
    } else {
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
          ctx.coins.push({ id: `rain_${now}_${i}`, x: px, y: Math.max(40, py), collected: false });
        }
      } else if (pattern === 1) {
        const rows = Math.ceil(Math.sqrt(n));
        const spacing = 28;
        let count = 0;
        for (let row = 0; row < rows && count < n; row++) {
          const colsInRow = row <= Math.floor(rows / 2) ? row + 1 : rows - row;
          const sX = cx - (colsInRow - 1) * spacing / 2;
          for (let col = 0; col < colsInRow && count < n; col++) {
            ctx.coins.push({ id: `rain_${now}_${count}`, x: sX + col * spacing + (Math.random() - 0.5) * 8, y: cy - row * spacing * 0.8 + (Math.random() - 0.5) * 8, collected: false });
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
          ctx.coins.push({ id: `rain_${now}_${i}`, x: px, y: Math.max(40, py), collected: false });
        }
      } else {
        const maxR = 120 + Math.random() * 40;
        for (let i = 0; i < n; i++) {
          const t = i / (n - 1);
          const r = t * maxR;
          const angle = t * Math.PI * 4 + (Math.random() - 0.5) * 0.3;
          ctx.coins.push({ id: `rain_${now}_${i}`, x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r * 0.6, collected: false });
        }
      }
    }
  }
}
