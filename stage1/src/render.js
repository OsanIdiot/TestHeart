// 화면 그리기 (1단계: 색깔 네모 + 체력바 + 라운드 표시)
import { CONFIG as C, CHARACTERS } from './data.js';

const G = C.GROUND_Y;
const sy = (y) => G - y;           // 게임 높이 → 화면 y

export function render(ctx, game, opts = {}) {
  const W = C.SCREEN_W, H = C.SCREEN_H;
  ctx.fillStyle = '#3b2a45'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#5b4470'; ctx.fillRect(0, G, W, H - G);
  ctx.fillStyle = '#7a5f8f'; ctx.fillRect(0, G, W, 2);

  for (const f of game.fighters) drawFighter(ctx, f, CHARACTERS[f.index], opts.showBoxes);
  drawHud(ctx, game);
}

function drawFighter(ctx, f, ch, showBoxes) {
  const hb = f.hurtbox();
  let body = f.state === 'hitstun' || f.state === 'ko' ? '#ffffff' : ch.color;
  if (f.state === 'hitstun' && f.timer % 4 < 2 && !f.airHit) body = ch.color;
  ctx.fillStyle = body;
  ctx.fillRect(Math.round(hb.x), Math.round(sy(hb.y + hb.h)), hb.w, hb.h);
  ctx.strokeStyle = ch.dark; ctx.lineWidth = 2;
  ctx.strokeRect(Math.round(hb.x) + 1, Math.round(sy(hb.y + hb.h)) + 1, hb.w - 2, hb.h - 2);
  // 눈: 바라보는 방향 표시
  const eyeX = f.x + f.facing * 6, eyeY = sy(hb.y + hb.h - 10);
  ctx.fillStyle = '#2b1d2a'; ctx.fillRect(Math.round(eyeX) - 1, Math.round(eyeY), 3, 4);

  // 공격 중: 팔/다리 네모
  if (f.state === 'attack') {
    const m = f.move, box = m.box;
    const front = f.x + f.facing * hb.w / 2;
    const active = f.moveFrame >= m.startup && f.moveFrame < m.startup + m.active;
    const len = active ? box.w : Math.round(box.w * 0.4);
    const x0 = front + f.facing * box.x;
    const x = f.facing > 0 ? x0 : x0 - len;
    ctx.fillStyle = ch.dark;
    ctx.fillRect(Math.round(x), Math.round(sy(f.y + box.y + box.h)), len, box.h);
  }
  // 가드 자세: 앞에 막대
  if (f.blocking || f.state === 'blockstun') {
    ctx.fillStyle = f.state === 'blockstun' ? '#ffe680' : 'rgba(255,255,255,0.6)';
    const gx = f.x + f.facing * (hb.w / 2 + 3);
    ctx.fillRect(Math.round(gx) - 1, Math.round(sy(hb.y + hb.h)), 3, hb.h);
  }
  if (showBoxes) {
    ctx.strokeStyle = '#4af'; ctx.lineWidth = 1;
    ctx.strokeRect(hb.x + 0.5, sy(hb.y + hb.h) + 0.5, hb.w, hb.h);
    const box = f.hitbox();
    if (box) { ctx.strokeStyle = '#f33'; ctx.strokeRect(box.x + 0.5, sy(box.y + box.h) + 0.5, box.w, box.h); }
  }
}

function drawHud(ctx, game) {
  const W = C.SCREEN_W;
  const barW = 190, barH = 10, top = 12;
  game.fighters.forEach((f, i) => {
    const ch = CHARACTERS[i];
    const x = i === 0 ? 14 : W - 14 - barW;
    ctx.fillStyle = '#1d1420'; ctx.fillRect(x - 1, top - 1, barW + 2, barH + 2);
    ctx.fillStyle = '#5a2a35'; ctx.fillRect(x, top, barW, barH);
    const w = Math.round(barW * f.hp / C.MAX_HP);
    ctx.fillStyle = ch.color;
    ctx.fillRect(i === 0 ? x + barW - w : x, top, w, barH);   // 가운데 쪽에서부터 줄어듦
    ctx.font = '10px "Malgun Gothic", sans-serif'; ctx.textBaseline = 'top';
    ctx.textAlign = i === 0 ? 'left' : 'right';
    ctx.fillStyle = '#fff';
    ctx.fillText(ch.name, i === 0 ? x : x + barW, top + barH + 3);
    // 이긴 라운드 표시
    for (let k = 0; k < C.ROUNDS_TO_WIN; k++) {
      const cx = i === 0 ? x + barW - 6 - k * 10 : x + 6 + k * 10;
      ctx.fillStyle = k < game.wins[i] ? '#ffd35c' : '#3a2838';
      ctx.fillRect(cx - 3, top + barH + 4, 7, 7);
    }
  });
  ctx.textAlign = 'center'; ctx.fillStyle = '#fff';
  ctx.font = 'bold 16px sans-serif';
  ctx.fillText(String(game.timeSeconds), W / 2, top - 2);

  let msg = null;
  if (game.phase === 'intro') msg = game.phaseTimer > 30 ? `라운드 ${game.round}` : '파이트!';
  else if (game.phase === 'roundEnd') {
    const head = game.endReason === 'ko' ? 'K.O.' : '시간 종료';
    const who = game.roundWinner === 'draw' ? '무승부' : `${CHARACTERS[game.roundWinner].name} 승리`;
    msg = `${head}  ${who}`;
  } else if (game.phase === 'matchEnd') {
    msg = game.matchWinner === 'draw' ? '무승부!' : `${CHARACTERS[game.matchWinner].name} 최종 승리!`;
  }
  if (msg) {
    ctx.font = 'bold 24px "Malgun Gothic", sans-serif'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#2b1d2a'; ctx.fillText(msg, W / 2 + 2, 110 + 2);
    ctx.fillStyle = '#ffd35c'; ctx.fillText(msg, W / 2, 110);
    if (game.phase === 'matchEnd' && game.phaseTimer <= 0) {
      ctx.font = '11px "Malgun Gothic", sans-serif'; ctx.fillStyle = '#fff';
      ctx.fillText('아무 공격 버튼이나 누르면 다시 시작', W / 2, 140);
    }
  }
}
