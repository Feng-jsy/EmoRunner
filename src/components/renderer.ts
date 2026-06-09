/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Obstacle, Skin, GAME_BALANCE } from '../types';

// ============================================================
// Floor & pit rendering
// ============================================================

export function renderFloorWithPits(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  obstacles: Obstacle[],
  floorYLevel: number,
  distanceTraveled: number,
  curGround: string,
) {
  // Base ground surface
  ctx.fillStyle = curGround;
  ctx.fillRect(0, floorYLevel, W, H - floorYLevel);

  // Draw pits
  for (let i = 0; i < obstacles.length; i++) {
    const obs = obstacles[i];
    if (obs.type !== 'PIT') continue;
    const pL = obs.x;
    const pR = obs.x + obs.width;

    ctx.fillStyle = '#0f0f1c';
    ctx.fillRect(pL, floorYLevel, pR - pL, H - floorYLevel);

    ctx.fillStyle = '#ff3366';
    ctx.fillRect(pL - 3, floorYLevel, 3, H - floorYLevel);
    ctx.fillRect(pR, floorYLevel, 3, H - floorYLevel);
  }

  // Neon green top line — skip pits
  ctx.fillStyle = '#39ff14';
  let greenStart = 0;
  for (let i = 0; i < obstacles.length; i++) {
    const obs = obstacles[i];
    if (obs.type !== 'PIT') continue;
    const pL = Math.max(0, obs.x);
    const pR = Math.min(W, obs.x + obs.width);
    if (pL > greenStart) {
      ctx.fillRect(greenStart, floorYLevel - 2, pL - greenStart, 4);
    }
    greenStart = Math.max(greenStart, pR);
  }
  if (greenStart < W) {
    ctx.fillRect(greenStart, floorYLevel - 2, W - greenStart, 4);
  }

  // Vertical grid marks — skip pits
  ctx.fillStyle = 'rgba(57, 255, 20, 0.15)';
  const gridOffset = -(distanceTraveled % 40);
  for (let gX = 0; gX <= W + 100; gX += 40) {
    const markX = gX + gridOffset;
    let insidePit = false;
    for (let i = 0; i < obstacles.length; i++) {
      const obs = obstacles[i];
      if (obs.type !== 'PIT') continue;
      if (markX > obs.x + 3 && markX < obs.x + obs.width - 3) {
        insidePit = true;
        break;
      }
    }
    if (!insidePit) {
      ctx.fillRect(markX, floorYLevel + 4, 1, H - floorYLevel - 4);
    }
  }
}

// ============================================================
// Obstacle rendering
// ============================================================

export function drawObstacles(
  ctx: CanvasRenderingContext2D,
  obstacles: Obstacle[],
  floorYLevel: number,
  timestamp: number,
) {
  for (const obs of obstacles) {
    // --- CRATES ---
    if (obs.type === 'CRATE' && !obs.isShattered) {
      const boxY = floorYLevel - obs.height;

      ctx.fillStyle = '#a05a2c';
      ctx.fillRect(obs.x, boxY, obs.width, obs.height);

      ctx.strokeStyle = '#5a3216';
      ctx.lineWidth = 3;
      ctx.strokeRect(obs.x + 1.5, boxY + 1.5, obs.width - 3, obs.height - 3);

      ctx.strokeStyle = '#8a4d25';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(obs.x + 4, boxY + 4, obs.width - 8, obs.height - 8);

      ctx.beginPath();
      ctx.moveTo(obs.x + 4, boxY + 4);
      ctx.lineTo(obs.x + obs.width - 4, boxY + obs.height - 4);
      ctx.moveTo(obs.x + obs.width - 4, boxY + 4);
      ctx.lineTo(obs.x + 4, boxY + obs.height - 4);
      ctx.stroke();

      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.fillRect(obs.x + 2, boxY + 2, 3, 3);
      ctx.fillRect(obs.x + obs.width - 5, boxY + 2, 3, 3);
    }

    // --- CEILING SPIKES ---
    if (obs.type === 'CEILING_SPIKE' && !obs.isShattered) {
      const spikeTipY = obs.height;
      const spikeCount = Math.max(1, Math.floor(obs.width / 28));
      const spacing = obs.width / spikeCount;
      const baseWidth = 22;

      for (let i = 0; i < spikeCount; i++) {
        const cx = obs.x + i * spacing + spacing / 2;
        const tipY = spikeTipY + (Math.random() - 0.5) * 12;

        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.beginPath();
        ctx.moveTo(cx - baseWidth / 2 + 4, 2);
        ctx.lineTo(cx + 2, tipY + 2);
        ctx.lineTo(cx + baseWidth / 2, 2);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#6b6b7a';
        ctx.beginPath();
        ctx.moveTo(cx - baseWidth / 2, 0);
        ctx.lineTo(cx, tipY);
        ctx.lineTo(cx + baseWidth / 2, 0);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#9a9aae';
        ctx.beginPath();
        ctx.moveTo(cx - baseWidth / 2, 0);
        ctx.lineTo(cx, tipY);
        ctx.lineTo(cx - baseWidth / 2 + 4, 0);
        ctx.closePath();
        ctx.fill();

        const tipGlow = 10 + Math.sin(timestamp * 0.015 + i) * 3;
        ctx.fillStyle = '#cc2233';
        ctx.beginPath();
        ctx.moveTo(cx - 4, tipY - tipGlow);
        ctx.lineTo(cx, tipY);
        ctx.lineTo(cx + 4, tipY - tipGlow);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#ff3344';
        ctx.beginPath();
        ctx.arc(cx, tipY, 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#4a4a58';
        ctx.fillRect(cx - baseWidth / 2 - 2, 0, baseWidth + 4, 5);
        ctx.fillStyle = '#5a5a6a';
        ctx.fillRect(cx - baseWidth / 2, 0, baseWidth, 4);

        ctx.fillStyle = '#333340';
        ctx.fillRect(cx - baseWidth / 2 + 3, 1, 3, 2);
        ctx.fillRect(cx + baseWidth / 2 - 6, 1, 3, 2);
      }
    }

    // --- HOT FLOOR ---
    if (obs.type === 'HOT_FLOOR') {
      const hfY = floorYLevel;
      const glowGrad = ctx.createLinearGradient(0, hfY, 0, hfY + obs.height + 20);
      glowGrad.addColorStop(0, 'rgba(255,80,0,0.5)');
      glowGrad.addColorStop(0.3, 'rgba(255,30,0,0.3)');
      glowGrad.addColorStop(1, 'rgba(255,0,0,0)');
      ctx.fillStyle = glowGrad;
      ctx.fillRect(obs.x - 10, hfY - 4, obs.width + 20, obs.height + 24);

      ctx.fillStyle = '#ff3300';
      ctx.fillRect(obs.x, hfY, obs.width, obs.height);

      const lavaGrad = ctx.createLinearGradient(0, hfY, 0, hfY + obs.height);
      lavaGrad.addColorStop(0, '#ffcc00');
      lavaGrad.addColorStop(0.2, '#ff6600');
      lavaGrad.addColorStop(0.5, '#ff3300');
      lavaGrad.addColorStop(1, '#991100');
      ctx.fillStyle = lavaGrad;
      ctx.fillRect(obs.x + 2, hfY + 2, obs.width - 4, obs.height - 4);

      for (let bx = obs.x + 10; bx < obs.x + obs.width - 10; bx += 18) {
        const bubbleY = hfY + 3 + Math.sin(timestamp * 0.01 + bx * 0.1) * 4;
        const bubbleR = 3 + Math.sin(timestamp * 0.02 + bx * 0.05) * 2;
        ctx.fillStyle = 'rgba(255,220,100,0.7)';
        ctx.beginPath();
        ctx.arc(bx, bubbleY, bubbleR, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = '#ff4400';
      for (let sx = obs.x + 4; sx < obs.x + obs.width - 4; sx += 12) {
        ctx.beginPath();
        ctx.moveTo(sx, hfY);
        ctx.lineTo(sx + 6, hfY - 8);
        ctx.lineTo(sx + 12, hfY);
        ctx.closePath();
        ctx.fill();
      }
    }
  }
}

// ============================================================
// Player character drawing
// ============================================================

export interface PlayerDrawParams {
  shieldActive: boolean;
  doubleJumpFlash: number;
  airJumpsLeft: number;
  isGrounded: boolean;
  pushedAlertTick: number;
  animationTick: number;
  frame: number;
  vy: number;
  height: number;
  isTripleJump: boolean;
  activePowerUp: 'STAR_TRAIL' | 'RAINBOW_GLOW' | null;
}

export function drawPlayer(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  skin: Skin,
  timestamp: number,
  p: PlayerDrawParams,
) {
  const animFrame = p.frame;
  const isJumping = !p.isGrounded && p.vy < 0;
  const isFalling = !p.isGrounded && p.vy >= 0;
  const shirtColor = '#f5f5f0';

  ctx.save();
  ctx.translate(x, y);

  const flashOn = p.pushedAlertTick > 0 && Math.floor(timestamp / 50) % 2 === 0;
  const faceColor = flashOn ? '#ff6666' : skin.skinColor;
  const hairColor = flashOn ? '#330000' : skin.hairColor;
  const suitCol = flashOn ? '#4a1010' : skin.suitColor;
  const tieCol = flashOn ? '#ff0000' : skin.visorColor;

  // HEAD
  ctx.fillStyle = hairColor;
  ctx.fillRect(4, 0, 20, 3);
  ctx.fillRect(3, 1, 3, 8);
  ctx.fillRect(22, 1, 3, 8);
  ctx.fillStyle = faceColor;
  ctx.fillRect(5, 3, 18, 7);
  ctx.fillStyle = tieCol;
  ctx.fillRect(14, 5, 8, 2);
  ctx.fillStyle = '#c09878';
  ctx.fillRect(12, 8.5, 4, 1);

  // NECK
  ctx.fillStyle = faceColor;
  ctx.fillRect(11, 10, 6, 2);

  // UPPER BODY: Suit jacket
  ctx.fillStyle = suitCol;
  ctx.fillRect(3, 11, 10, 12);
  ctx.fillRect(15, 11, 10, 12);
  ctx.fillRect(2, 11, 3, 4);
  ctx.fillRect(23, 11, 3, 4);

  ctx.fillStyle = shirtColor;
  ctx.fillRect(10, 11, 8, 3);

  ctx.fillStyle = tieCol;
  ctx.fillRect(12, 14, 4, 7);

  ctx.fillStyle = shirtColor;
  ctx.fillRect(10, 20, 8, 3);

  ctx.fillStyle = suitCol;
  ctx.fillRect(3, 18, 7, 5);
  ctx.fillRect(18, 18, 7, 5);

  // Belt
  ctx.fillStyle = hairColor;
  ctx.fillRect(5, 23, 18, 2);
  ctx.fillStyle = tieCol;
  ctx.fillRect(12, 23, 4, 2);

  // LOWER BODY: Dress pants
  ctx.fillStyle = suitCol;

  if (isJumping) {
    ctx.fillRect(4, 25, 8, 5);
    ctx.fillRect(16, 25, 8, 5);
    ctx.fillStyle = hairColor;
    ctx.fillRect(3, 30, 9, 3);
    ctx.fillRect(16, 30, 9, 3);
  } else if (isFalling) {
    ctx.fillRect(5, 25, 7, 10);
    ctx.fillRect(16, 25, 7, 10);
    ctx.fillStyle = hairColor;
    ctx.fillRect(4, 33, 9, 3);
    ctx.fillRect(15, 33, 9, 3);
  } else {
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

  // SHIELD EFFECT
  if (p.shieldActive) {
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

  // DOUBLE JUMP FLASH
  if (p.doubleJumpFlash > 0) {
    const flashAlpha = p.doubleJumpFlash / GAME_BALANCE.doubleJumpFlashFrames;
    const ringRadius = (GAME_BALANCE.doubleJumpFlashFrames - p.doubleJumpFlash) * 4 + 8;
    ctx.strokeStyle = `rgba(255, 255, 255, ${flashAlpha * 0.7})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(14, 17, ringRadius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = `rgba(255, 255, 200, ${flashAlpha * 0.15})`;
    ctx.fillRect(2, 0, 24, p.height);
  }

  // AIR JUMP INDICATOR
  if (p.airJumpsLeft > 0 && !p.isGrounded) {
    const bobbleY = Math.sin(timestamp * 0.06) * 3;
    ctx.fillStyle = p.isTripleJump ? 'rgba(255, 102, 0, 0.8)' : 'rgba(255, 204, 0, 0.7)';
    ctx.font = '7px "Press Start 2P"';
    ctx.textAlign = 'center';
    ctx.fillText(p.isTripleJump ? '⬆⬆⬆' : '⬆⬆', 14, p.height + 12 + bobbleY);
  }

  // RAINBOW GLOW
  if (p.activePowerUp === 'RAINBOW_GLOW') {
    const hue = (timestamp * 0.3) % 360;
    ctx.fillStyle = `hsla(${hue}, 80%, 60%, 0.2)`;
    ctx.fillRect(2, 0, 24, p.height);
    ctx.strokeStyle = `hsla(${hue}, 90%, 70%, 0.6)`;
    ctx.lineWidth = 2;
    ctx.strokeRect(2, 0, 24, p.height);
  }

  ctx.restore();
}
