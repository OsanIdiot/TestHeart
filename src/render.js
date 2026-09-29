import { CONFIG as C, BODY } from './data.js';
import { MODES, DUMMY_MODES } from './game.js';

const W = 480, H = 270, SCALE = 2;
const G = C.GROUND_Y;
const FONT = '"Malgun Gothic", "Apple SD Gothic Neo", sans-serif';

export class Renderer {
  constructor(canvas) {
    canvas.width = W * SCALE;
    canvas.height = H * SCALE;
    this.ctx = canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;
  }

  draw(game) {
    const ctx = this.ctx;
    const sx = game.shake ? (Math.random() - 0.5) * game.shake : 0;
    const sy = game.shake ? (Math.random() - 0.5) * game.shake : 0;
    ctx.setTransform(SCALE, 0, 0, SCALE, sx * SCALE, sy * SCALE);
    this.background(game.frame);

    if (game.mode === 'title') { ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0); return this.title(game); }

    // 공격 중인 캐릭터를 앞에 그림
    const order = [...game.p].sort((a, b) => (a.state === 'attack') - (b.state === 'attack'));
    for (const f of order) this.fighter(f);
    for (const e of game.effects) this.effect(e);
    if (game.debug) for (const f of game.p) this.hitboxes(f);

    ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
    this.hud(game);
    this.banner(game);
    if (game.paused) this.pause(game.touch);
  }

  // ---------- 배경 ----------
  background(frame) {
    const ctx = this.ctx;
    const sky = ctx.createLinearGradient(0, 0, 0, G);
    sky.addColorStop(0, '#ffd9ec');
    sky.addColorStop(1, '#dff3ff');
    ctx.fillStyle = sky;
    ctx.fillRect(-10, -10, W + 20, G + 10);

    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    for (const [x0, y, s] of [[40, 40, 1], [200, 24, 0.8], [360, 56, 1.2], [520, 34, 0.9]]) {
      const x = ((x0 + frame * 0.08 * s) % (W + 120)) - 60;
      this.round(x, y, 46 * s, 12 * s, 6);
      this.round(x + 10 * s, y - 8 * s, 24 * s, 12 * s, 6);
    }

    ctx.fillStyle = '#c5ebc0';
    ctx.beginPath(); ctx.ellipse(90, G + 6, 150, 46, 0, Math.PI, 0); ctx.fill();
    ctx.fillStyle = '#b4e2b0';
    ctx.beginPath(); ctx.ellipse(380, G + 6, 170, 38, 0, Math.PI, 0); ctx.fill();

    ctx.fillStyle = '#f7e1b5';
    ctx.fillRect(-10, G, W + 20, H - G + 10);
    ctx.fillStyle = '#efcf94';
    for (let x = 0; x < W; x += 24) ctx.fillRect(x, G + 10, 12, 3);
    ctx.fillStyle = '#e3b977';
    ctx.fillRect(-10, G, W + 20, 2);
  }

  // ---------- 캐릭터 (임시 네모 버전) ----------
  fighter(f) {
    const ctx = this.ctx;
    const x = Math.round(f.x);
    const base = G - Math.round(f.y);
    const c = f.char;

    ctx.fillStyle = 'rgba(80,40,60,0.18)';
    ctx.beginPath(); ctx.ellipse(x, G + 1, 16 - Math.min(8, f.y / 10), 3, 0, 0, Math.PI * 2); ctx.fill();

    const lying = f.state === 'down' || (f.state === 'ko' && f.y <= 0);
    let w = BODY.w, h, top;
    if (lying) { w = 54; h = 14; top = base - h; }
    else if (f.state === 'getup') { h = 40; top = base - h; }
    else if (f.state === 'jumpsquat' || f.state === 'landing') { h = BODY.standH - 8; w = BODY.w + 4; top = base - h; }
    else { const r = f.hurtRect(); h = r.h; top = G - r.y - r.h; }
    const left = x - w / 2;
    const white = f.flash > 0 && f.flash % 4 < 2;

    if (!lying) this.ears(f, x, top, white);

    ctx.fillStyle = white ? '#ffffff' : c.color;
    this.round(left, top, w, h, 7);
    ctx.fillStyle = white ? '#ffffff' : c.light;
    this.round(left + 5, top + h * 0.5, w - 10, h * 0.36, 4);

    this.face(f, x, top, lying);

    if (f.state === 'attack' && f.move) this.limb(f, x, base);
    if (f.state === 'blockstun') {
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      const bx = f.facing > 0 ? left + w + 2 : left - 5;
      this.round(bx, top + 2, 3, h - 4, 1);
    }
  }

  ears(f, x, top, white) {
    const ctx = this.ctx;
    ctx.fillStyle = white ? '#ffffff' : f.char.color;
    if (f.char.ears === 'cat') {
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(x + s * 11, top + 4); ctx.lineTo(x + s * 9, top - 7); ctx.lineTo(x + s * 2, top + 2);
        ctx.fill();
      }
    } else {
      const droop = f.state === 'hitstun' || f.state === 'airhit' ? 4 : 0;
      this.round(x - 8 - droop, top - 14 + droop, 5, 16, 2);
      this.round(x + 3, top - 16, 5, 18, 2);
    }
  }

  face(f, x, top, lying) {
    const ctx = this.ctx;
    const hurt = ['hitstun', 'airhit', 'ko', 'down'].includes(f.state);
    const squint = f.state === 'blockstun' || (f.state === 'attack' && f.move && f.moveFrame >= f.move.startup);
    const cx = lying ? x - f.facing * 18 : x + f.facing * 4;
    const ey = top + (lying ? 4 : 12);
    ctx.fillStyle = '#3a2a3a';
    for (const ex of [cx - 5, cx + 3]) {
      if (hurt) { // X 눈
        ctx.fillRect(ex, ey, 1, 1); ctx.fillRect(ex + 2, ey, 1, 1); ctx.fillRect(ex + 1, ey + 1, 1, 1);
        ctx.fillRect(ex, ey + 2, 1, 1); ctx.fillRect(ex + 2, ey + 2, 1, 1);
      } else if (squint) {
        ctx.fillRect(ex, ey + 1, 3, 1);
      } else {
        ctx.fillRect(ex, ey, 2, 4);
        ctx.fillStyle = '#fff'; ctx.fillRect(ex, ey, 1, 1); ctx.fillStyle = '#3a2a3a';
      }
    }
    ctx.fillStyle = 'rgba(255,90,130,0.55)';
    ctx.fillRect(cx - 8, ey + 5, 3, 2);
    ctx.fillRect(cx + 5, ey + 5, 3, 2);
  }

  limb(f, x, base) {
    const ctx = this.ctx;
    const m = f.move, mf = f.moveFrame, hb = m.hitbox;
    let k;
    if (mf < m.startup) k = 0.3;
    else if (mf < m.startup + m.active) k = 1;
    else k = 0.25 + 0.5 * (1 - (mf - m.startup - m.active) / m.recovery);
    const lw = Math.max(5, hb.w * k), lh = Math.max(5, hb.h * (k < 1 ? 0.75 : 1));
    const lx = f.facing > 0 ? x + hb.x : x - hb.x - lw;
    const ly = base - hb.y - hb.h / 2 - lh / 2;
    ctx.fillStyle = f.char.dark;
    this.round(lx, ly, lw, lh, 3);
    if (k === 1) {
      const tip = f.facing > 0 ? lx + lw - 6 : lx;
      ctx.fillStyle = '#fff6fb';
      this.round(tip, ly + 1, 6, lh - 2, 2);
    }
  }

  effect(e) {
    const ctx = this.ctx;
    const x = e.x, y = G - e.y;
    const k = e.t / 16;
    if (e.type === 'block') {
      ctx.strokeStyle = `rgba(120,200,255,${1 - k})`;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(x, y, 4 + k * 14, 0, Math.PI * 2); ctx.stroke();
      return;
    }
    const r = (e.big ? 22 : 14) * (0.4 + k);
    ctx.fillStyle = `rgba(255,240,120,${1 - k})`;
    ctx.strokeStyle = `rgba(255,255,255,${1 - k})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + e.t * 0.05;
      const rr = i % 2 ? r * 0.45 : r;
      ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    ctx.closePath(); ctx.fill(); ctx.stroke();
    if (e.t < 8) { // 작은 하트 조각
      ctx.fillStyle = `rgba(255,110,160,${1 - k})`;
      for (let i = 0; i < 3; i++) this.heart(x + e.dir * (6 + e.t * 2) + i * 4 * e.dir, y - 6 - e.t * 1.5 + i * 5, 3);
    }
  }

  hitboxes(f) {
    const ctx = this.ctx;
    const r = f.hurtRect();
    ctx.strokeStyle = f.invuln ? 'rgba(160,160,160,0.9)' : 'rgba(0,200,90,0.95)';
    ctx.lineWidth = 1;
    ctx.strokeRect(r.x + 0.5, G - r.y - r.h + 0.5, r.w, r.h);
    if (f.isActive()) {
      const hr = f.hitRect();
      ctx.fillStyle = 'rgba(255,40,60,0.45)';
      ctx.fillRect(hr.x, G - hr.y - hr.h, hr.w, hr.h);
      ctx.strokeStyle = 'rgba(255,0,40,1)';
      ctx.strokeRect(hr.x + 0.5, G - hr.y - hr.h + 0.5, hr.w, hr.h);
    }
    ctx.fillStyle = '#000';
    ctx.fillRect(Math.round(f.x) - 1, G - Math.round(f.y), 3, 1);
    ctx.font = `bold 7px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText(f.state + (f.move ? ` ${f.moveKey} ${f.moveFrame}` : ''), f.x, G - f.y - 66);
  }

  // ---------- UI ----------
  hud(game) {
    const ctx = this.ctx;
    const bw = 190, bh = 10, y = 12;
    game.p.forEach((f, i) => {
      const bx = i === 0 ? 14 : W - 14 - bw;
      const ratio = f.hp / C.MAX_HP, red = f.redHp / C.MAX_HP;
      ctx.fillStyle = '#4a3346';
      this.round(bx - 2, y - 2, bw + 4, bh + 4, 3);
      ctx.fillStyle = '#7a5870';
      ctx.fillRect(bx, y, bw, bh);
      const rw = bw * red, hw = bw * ratio;
      ctx.fillStyle = '#ff5d73';
      ctx.fillRect(i === 0 ? bx : bx + bw - rw, y, rw, bh);
      ctx.fillStyle = ratio < 0.3 ? '#ffb13d' : '#ffe45c';
      ctx.fillRect(i === 0 ? bx : bx + bw - hw, y, hw, bh);
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.fillRect(i === 0 ? bx : bx + bw - hw, y + 1, hw, 2);

      ctx.font = `bold 9px ${FONT}`;
      ctx.textAlign = i === 0 ? 'left' : 'right';
      this.outlined(`${f.char.name} ${f.char.ko}`, i === 0 ? bx : bx + bw, y + bh + 11, f.char.dark);

      if (game.mode !== 'training') {
        for (let k = 0; k < C.ROUNDS_TO_WIN; k++) {
          const hx = i === 0 ? bx + bw - 8 - k * 12 : bx + 8 + k * 12;
          ctx.fillStyle = k < f.wins ? '#ff4f86' : 'rgba(255,255,255,0.7)';
          this.heart(hx, y + bh + 7, 4);
        }
      }
    });

    ctx.fillStyle = '#4a3346';
    this.round(W / 2 - 16, 6, 32, 22, 4);
    ctx.font = `bold 14px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff';
    ctx.fillText(game.mode === 'training' ? '∞' : String(Math.max(0, game.timer)), W / 2, 22);

    const ct = game.comboText;
    if (ct && game.frame - ct.frame < 70) {
      const left = ct.player === 0;
      ctx.font = `bold 16px ${FONT}`;
      ctx.textAlign = left ? 'left' : 'right';
      this.outlined(`${ct.n} HIT!`, left ? 16 : W - 16, 70, '#ff4f86');
    }

    ctx.font = `8px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(90,60,80,0.8)';
    if (game.mode === 'training') {
      ctx.textAlign = 'left';
      ctx.font = `bold 9px ${FONT}`;
      const how = game.touch ? '화면 탭으로 변경' : '숫자 1~5로 변경, 0 위치 초기화';
      this.outlined(`허수아비: ${DUMMY_MODES[game.dummyMode]}  (${how})`, 14, H - 12, '#6a4a60');
      if (game.adv) {
        const v = game.adv.v;
        ctx.textAlign = 'right';
        this.outlined(`프레임 유불리 ${v > 0 ? '+' : ''}${v}`, W - 14, H - 12, v >= 0 ? '#2f9c5a' : '#d0445e');
      }
    } else if (!game.touch) {
      ctx.fillText('H: 판정 박스 보기   Esc: 일시정지', W / 2, H - 8);
    }
  }

  banner(game) {
    const b = game.banner;
    if (!b) return;
    const age = game.frame - b.frame;
    const persistent = game.phase === 'matchEnd';
    if (!persistent && age > 70) return;
    const ctx = this.ctx;
    const pop = Math.min(1, age / 8);
    const s = 0.6 + 0.4 * pop + (age < 8 ? 0.15 * Math.sin(pop * Math.PI) : 0);
    ctx.save();
    ctx.translate(W / 2, H / 2 - 20);
    ctx.scale(s, s);
    ctx.font = `900 34px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#4a3346';
    ctx.strokeText(b.text, 0, 0);
    ctx.fillStyle = b.text.startsWith('K.O') ? '#ff4f86' : '#ffe45c';
    ctx.fillText(b.text, 0, 0);
    ctx.restore();
    if (b.sub) {
      ctx.font = `bold 10px ${FONT}`;
      ctx.textAlign = 'center';
      this.outlined(b.sub, W / 2, H / 2 + 12, '#6a4a60');
    }
  }

  pause(touch) {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(40,20,40,0.55)';
    ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center';
    ctx.font = `900 26px ${FONT}`;
    this.outlined('PAUSE', W / 2, H / 2 - 10, '#ffe45c');
    ctx.font = `bold 10px ${FONT}`;
    this.outlined(touch ? '화면 탭: 계속하기   ⌂: 타이틀로' : 'Esc: 계속하기   T: 타이틀로', W / 2, H / 2 + 14, '#6a4a60');
  }

  title(game) {
    const ctx = this.ctx;
    ctx.textAlign = 'center';
    ctx.font = `900 38px ${FONT}`;
    const bob = Math.sin(game.frame / 20) * 2;
    ctx.lineWidth = 7; ctx.strokeStyle = '#4a3346';
    ctx.strokeText('PROJECT HEART', W / 2, 78 + bob);
    ctx.fillStyle = '#ff6f9f';
    ctx.fillText('PROJECT HEART', W / 2, 78 + bob);
    ctx.font = `bold 10px ${FONT}`;
    this.outlined('(가제)  1단계 시제품 · 네모 버전', W / 2, 98, '#6a4a60');
    ctx.fillStyle = '#ff4f86';
    this.heart(W / 2 - 128, 64 + bob, 6); this.heart(W / 2 + 128, 64 + bob, 6);

    MODES.forEach((m, i) => {
      const y = 140 + i * 26;
      const sel = i === game.menuIndex;
      ctx.fillStyle = sel ? '#ffffff' : 'rgba(255,255,255,0.45)';
      this.round(W / 2 - 110, y - 14, 220, 20, 6);
      ctx.font = `bold 11px ${FONT}`;
      ctx.fillStyle = sel ? '#e0567f' : '#6a4a60';
      ctx.fillText(`${i + 1}. ${m.label}  —  ${m.desc}`, W / 2, y);
      if (sel) { ctx.fillStyle = '#ff4f86'; this.heart(W / 2 - 100, y - 4, 3); }
    });
    ctx.font = `9px ${FONT}`;
    ctx.fillStyle = '#6a4a60';
    ctx.fillText(game.touch ? '원하는 모드를 탭하세요 · 폰은 가로로 돌리면 더 크게 보여요' : '↑↓ 또는 W/S로 고르고 Enter', W / 2, 232);
  }

  // ---------- 도구 ----------
  round(x, y, w, h, r) {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.roundRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h), r);
    ctx.fill();
  }

  heart(x, y, s) {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.moveTo(x, y + s);
    ctx.bezierCurveTo(x - s * 1.6, y - s * 0.2, x - s * 0.8, y - s * 1.4, x, y - s * 0.5);
    ctx.bezierCurveTo(x + s * 0.8, y - s * 1.4, x + s * 1.6, y - s * 0.2, x, y + s);
    ctx.fill();
  }

  outlined(text, x, y, color) {
    const ctx = this.ctx;
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#ffffff';
    ctx.strokeText(text, x, y);
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
  }
}
