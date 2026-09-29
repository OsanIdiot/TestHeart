import { CONFIG as C, BODY } from './data.js';
import { MODES, DUMMY_MODES } from './game.js';

const W = 480, H = 270, SCALE = 2;
const G = C.GROUND_Y;
const FONT = '"Malgun Gothic", "Apple SD Gothic Neo", sans-serif';
const INK = '#3a2a3a';
const GLOVE = '#fff6fb';

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

    const sf = game.superFreeze;
    if (sf) this.superBackdrop(game, sf);

    // 공격 중인 캐릭터를 앞에 그림
    const rank = (f) => (f.state === 'throwing' ? 2 : f.state === 'attack' ? 1 : 0);
    const order = [...game.p].sort((a, b) => rank(a) - rank(b));
    for (const f of order) this.fighter(f);
    for (const p of game.projectiles) this.projectile(p);
    for (const e of game.effects) this.effect(e);
    if (game.debug) {
      for (const f of game.p) this.hitboxes(f);
      for (const p of game.projectiles) this.projBox(game.projRect(p));
    }

    ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
    this.hud(game);
    if (sf) this.superName(game, sf);
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

  superBackdrop(game, sf) {
    const ctx = this.ctx;
    const f = game.p[sf.player];
    ctx.fillStyle = 'rgba(40,12,50,0.62)';
    ctx.fillRect(-10, -10, W + 20, H + 20);
    const age = game.frame - sf.frame;
    const cy = G - f.y - 30;
    for (let i = 0; i < 12; i++) { // 뒤로 퍼지는 빛줄기
      const a = (i / 12) * Math.PI * 2 + age * 0.03;
      ctx.strokeStyle = i % 2 ? 'rgba(255,228,92,0.45)' : 'rgba(255,143,179,0.45)';
      ctx.lineWidth = 6;
      ctx.beginPath(); ctx.moveTo(f.x, cy); ctx.lineTo(f.x + Math.cos(a) * 300, cy + Math.sin(a) * 300); ctx.stroke();
    }
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.beginPath(); ctx.arc(f.x, cy, 26 + Math.sin(age / 3) * 3, 0, Math.PI * 2); ctx.fill();
  }

  // ---------- 캐릭터 (임시 네모 버전) ----------
  fighter(f) {
    if (f.state !== 'thrown' || !f.throwAngle) return this.fighterBody(f);
    const ctx = this.ctx;
    const cx = f.x, cy = G - f.y - 29;
    ctx.save();
    ctx.translate(cx, cy); ctx.rotate(f.throwAngle); ctx.translate(-cx, -cy);
    this.fighterBody(f);
    ctx.restore();
  }

  fighterBody(f) {
    const ctx = this.ctx;
    const x = Math.round(f.x);
    const base = G - Math.round(f.y);
    const c = f.char;
    const m = f.state === 'attack' ? f.move : null;

    ctx.fillStyle = 'rgba(80,40,60,0.18)';
    ctx.beginPath(); ctx.ellipse(x, G + 1, 16 - Math.min(8, f.y / 10), 3, 0, 0, Math.PI * 2); ctx.fill();

    const white = f.flash > 0 && f.flash % 4 < 2;
    if (m && m.limb === 'body') return this.rollBall(f, x, base, white);

    const lying = f.state === 'down' || (f.state === 'ko' && f.y <= 0);
    let w = BODY.w, h, top;
    if (lying) { w = 54; h = 14; top = base - h; }
    else if (f.state === 'getup') { h = 40; top = base - h; }
    else if (f.state === 'jumpsquat' || f.state === 'landing') { h = BODY.standH - 8; w = BODY.w + 4; top = base - h; }
    else { const r = f.hurtRect(); h = r.h; top = G - r.y - r.h; }
    const left = x - w / 2;

    const pose = m ? this.limbPose(f, x, base, top, h) : null;

    if (!lying) this.feet(f, x, base, pose);
    if (!lying) this.ears(f, x, top, white);

    ctx.fillStyle = white ? '#ffffff' : c.color;
    this.round(left, top, w, h, 7);
    ctx.fillStyle = white ? '#ffffff' : c.light;
    this.round(left + 5, top + h * 0.5, w - 10, h * 0.36, 4);

    this.face(f, x, top, lying);

    if (f.state === 'throwing') this.throwArms(f, x, top, h);
    else if (pose) this.limb(f, pose);
    else if (!lying) this.hand(f, x + f.facing * (w / 2 - 1), top + h * 0.55);

    if (f.state === 'blockstun') {
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      const bx = f.facing > 0 ? left + w + 4 : left - 7;
      this.round(bx, top + 2, 3, h - 4, 1);
    }
    if (f.state === 'dash' || f.state === 'backdash') {
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      const dir = f.state === 'dash' ? -f.facing : f.facing;
      for (let i = 0; i < 3; i++) this.round(x + dir * (18 + i * 7), base - 4 - i * 3, 6 - i, 3, 1);
    }
  }

  feet(f, x, base, pose) {
    const ctx = this.ctx;
    const walking = f.state === 'walkF' || f.state === 'walkB' || f.state === 'dash';
    const step = walking ? Math.sin(f.stateFrame / 3) * 2 : 0;
    const air = f.y > 0;
    ctx.fillStyle = f.char.dark;
    // 뒷발
    this.round(x - f.facing * 7 - 5 + step, base - (air ? 4 : 5) - Math.max(0, -step), 10, 5, 2);
    // 앞발 (킥 중이면 다리가 뻗어 나가므로 안 그림)
    if (!(pose && pose.kind === 'kick')) this.round(x + f.facing * 5 - 5 - step, base - (air ? 4 : 5) - Math.max(0, step), 10, 5, 2);
  }

  hand(f, hx, hy) {
    const ctx = this.ctx;
    ctx.fillStyle = GLOVE;
    ctx.strokeStyle = f.char.dark;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(hx, hy, 3.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  }

  // 팔/다리가 어디서 나와서 어디까지 뻗는지 계산
  limbPose(f, x, base, top, h) {
    const m = f.move, mf = f.moveFrame;
    let ref = m.hits.find((hh) => mf < hh.end) || m.hits[m.hits.length - 1];
    let start, end, hb;
    if (ref) { start = ref.start; end = ref.end; hb = ref.hitbox; }
    else if (m.projectile) { start = m.projectile.frame - 2; end = m.projectile.frame + 6; hb = { x: 10, y: m.projectile.y, w: 14, h: m.projectile.h }; }
    else return null;
    const first = m.hits[0]?.start ?? start;
    let k;
    if (mf < start) k = mf < first ? 0.2 + 0.15 * (mf / Math.max(1, first)) : 0.45;
    else if (mf < end) k = 1;
    else k = 0.25 + 0.55 * Math.max(0, 1 - (mf - end) / Math.max(1, m.total - end));

    const kind = m.limb === 'kick' || m.limb === 'claw' || m.limb === 'grab' ? m.limb : 'punch';
    const ox = x + f.facing * (kind === 'kick' ? 4 : 6);
    const oy = kind === 'kick' ? base - Math.min(16, h * 0.3) : top + h * 0.4;
    const tx = x + f.facing * (hb.x + hb.w), ty = base - (hb.y + hb.h / 2);
    return { kind, k, ox, oy, px: ox + (tx - ox) * k, py: oy + (ty - oy) * k, active: k === 1 };
  }

  limb(f, p) {
    const ctx = this.ctx;
    const c = f.char;
    ctx.lineCap = 'round';
    ctx.strokeStyle = c.dark; ctx.lineWidth = p.kind === 'kick' ? 8 : 7;
    ctx.beginPath(); ctx.moveTo(p.ox, p.oy); ctx.lineTo(p.px, p.py); ctx.stroke();
    ctx.strokeStyle = c.color; ctx.lineWidth = p.kind === 'kick' ? 5.5 : 4.5;
    ctx.beginPath(); ctx.moveTo(p.ox, p.oy); ctx.lineTo(p.px, p.py); ctx.stroke();
    ctx.lineCap = 'butt';

    if (p.kind === 'kick') { // 신발
      ctx.save();
      ctx.translate(p.px, p.py);
      ctx.rotate(Math.atan2(p.py - p.oy, p.px - p.ox));
      ctx.fillStyle = c.dark; this.round(-4, -4, 12, 8, 3);
      ctx.fillStyle = GLOVE; ctx.fillRect(6, -3, 2, 6);
      ctx.restore();
    } else if (p.kind === 'grab') { // 두 손을 벌려 붙잡으려 함
      this.hand(f, p.px, p.py - 5);
      this.hand(f, p.px - f.facing * 3, p.py + 5);
    } else { // 장갑 주먹
      ctx.fillStyle = GLOVE;
      ctx.strokeStyle = c.dark;
      ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(p.px, p.py, p.active ? 5.5 : 4.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      if (p.kind === 'claw' && p.active) { // 발톱 자국
        ctx.strokeStyle = 'rgba(255,255,255,0.9)';
        ctx.lineWidth = 1.5;
        for (let i = -1; i <= 1; i++) {
          ctx.beginPath();
          ctx.moveTo(p.px + f.facing * 5, p.py - 7 + i * 5);
          ctx.lineTo(p.px + f.facing * 14, p.py + 1 + i * 5);
          ctx.stroke();
        }
      }
    }
    if (p.active && p.kind !== 'claw' && p.kind !== 'grab') { // 빠르게 휘두르는 느낌
      ctx.strokeStyle = 'rgba(255,255,255,0.7)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(p.px - f.facing * 10, p.py - 6); ctx.lineTo(p.px - f.facing * 18, p.py - 6);
      ctx.moveTo(p.px - f.facing * 10, p.py + 6); ctx.lineTo(p.px - f.facing * 18, p.py + 6); ctx.stroke();
    }
  }

  // 잡은 상대를 두 손으로 들고 있음 → 던진 뒤엔 팔을 번쩍
  throwArms(f, x, top, h) {
    const ctx = this.ctx;
    const d = f.throwData;
    const ox = x + f.facing * 6, oy = top + h * 0.4;
    let gx, gy;
    if (d && !d.released) { gx = d.def.x - f.facing * 6; gy = G - d.def.y - 30; }
    else { gx = x + f.facing * (d?.hit.backThrow ? -8 : 22); gy = top - 8; }
    ctx.lineCap = 'round';
    for (const [dy, width, color] of [[0, 7, f.char.dark], [0, 4.5, f.char.color]]) {
      ctx.strokeStyle = color; ctx.lineWidth = width;
      ctx.beginPath();
      ctx.moveTo(ox, oy - 3 + dy); ctx.lineTo(gx, gy - 6);
      ctx.moveTo(ox, oy + 4 + dy); ctx.lineTo(gx, gy + 6);
      ctx.stroke();
    }
    ctx.lineCap = 'butt';
    this.hand(f, gx, gy - 6);
    this.hand(f, gx, gy + 6);
  }

  rollBall(f, x, base, white) {
    const ctx = this.ctx;
    const r = 12, cy = base - r;
    const a = f.moveFrame * 0.5 * f.facing;
    ctx.fillStyle = white ? '#fff' : f.char.color;
    ctx.beginPath(); ctx.arc(x, cy, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = f.char.dark; ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath(); ctx.arc(x, cy, r - 3, a + i * 2.1, a + i * 2.1 + 0.9); ctx.stroke();
    }
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    for (let i = 1; i <= 3; i++) this.round(x - f.facing * (r + i * 6), base - 3 - i * 2, 5, 2, 1);
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
    const hurt = ['hitstun', 'airhit', 'ko', 'down', 'thrown'].includes(f.state);
    const squint = f.state === 'blockstun' || f.state === 'throwing' || (f.state === 'attack' && !!f.activeHit());
    const cx = lying ? x - f.facing * 18 : x + f.facing * 4;
    const ey = top + (lying ? 4 : 12);
    ctx.fillStyle = INK;
    for (const ex of [cx - 5, cx + 3]) {
      if (hurt) { // X 눈
        ctx.fillRect(ex, ey, 1, 1); ctx.fillRect(ex + 2, ey, 1, 1); ctx.fillRect(ex + 1, ey + 1, 1, 1);
        ctx.fillRect(ex, ey + 2, 1, 1); ctx.fillRect(ex + 2, ey + 2, 1, 1);
      } else if (squint) {
        ctx.fillRect(ex, ey + 1, 3, 1);
      } else {
        ctx.fillRect(ex, ey, 2, 4);
        ctx.fillStyle = '#fff'; ctx.fillRect(ex, ey, 1, 1); ctx.fillStyle = INK;
      }
    }
    ctx.fillStyle = 'rgba(255,90,130,0.55)';
    ctx.fillRect(cx - 8, ey + 5, 3, 2);
    ctx.fillRect(cx + 5, ey + 5, 3, 2);
  }

  projectile(p) {
    const ctx = this.ctx;
    const d = Math.sign(p.vx) || 1;
    const len = p.w, rad = p.h / 2;
    ctx.save();
    ctx.translate(p.x, G - p.y - p.h / 2);
    ctx.scale(d, 1);
    ctx.rotate(Math.sin(p.t / 3) * 0.08);
    if (p.data.big) {
      ctx.fillStyle = 'rgba(255,228,92,0.35)';
      ctx.beginPath(); ctx.arc(0, 0, len * 0.7 + Math.sin(p.t / 2) * 2, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = '#ff9a3c';
    ctx.beginPath(); ctx.moveTo(len / 2, 0); ctx.lineTo(-len / 2, -rad); ctx.lineTo(-len / 2, rad); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#e0772a'; ctx.lineWidth = p.data.big ? 2 : 1;
    for (let i = 1; i <= 2; i++) {
      const sx = -len / 2 + (len * i) / 3.2, hh = rad * (1 - (i / 3.2)) * 0.9;
      ctx.beginPath(); ctx.moveTo(sx, -hh); ctx.lineTo(sx + 2, 0); ctx.stroke();
    }
    ctx.fillStyle = '#5cc26a';
    const lw = p.data.big ? 3 : 1.5;
    for (const a of [-0.6, 0, 0.6]) {
      ctx.save(); ctx.translate(-len / 2, 0); ctx.rotate(Math.PI + a + Math.sin(p.t / 2) * 0.15);
      ctx.beginPath(); ctx.moveTo(0, -lw); ctx.lineTo(rad * 1.3 + 3, 0); ctx.lineTo(0, lw); ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }

  effect(e) {
    const ctx = this.ctx;
    const x = e.x, y = G - e.y;
    const k = e.t / 16;
    if (e.type === 'dust') {
      ctx.fillStyle = `rgba(240,220,190,${0.9 - k})`;
      for (const s of [-1, 1]) for (let i = 0; i < 3; i++) {
        const r = 4 + i * 2 + k * 6;
        ctx.beginPath(); ctx.arc(x + s * (10 + i * 8 + k * 14), G - r * 0.6, r, 0, Math.PI * 2); ctx.fill();
      }
      return;
    }
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
    const act = f.activeHit();
    if (act) this.projBox(f.hitRect(act.hit.hitbox));
    ctx.fillStyle = '#000';
    ctx.fillRect(Math.round(f.x) - 1, G - Math.round(f.y), 3, 1);
    ctx.font = `bold 7px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText(f.state + (f.move ? ` ${f.moveKey} ${f.moveFrame}` : ''), f.x, G - f.y - 70);
  }

  projBox(hr) {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(255,40,60,0.45)';
    ctx.fillRect(hr.x, G - hr.y - hr.h, hr.w, hr.h);
    ctx.strokeStyle = 'rgba(255,0,40,1)';
    ctx.lineWidth = 1;
    ctx.strokeRect(hr.x + 0.5, G - hr.y - hr.h + 0.5, hr.w, hr.h);
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
      this.meter(game, f, i);
    });

    ctx.fillStyle = '#4a3346';
    this.round(W / 2 - 16, 6, 32, 22, 4);
    ctx.font = `bold 14px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff';
    ctx.fillText(game.mode === 'training' ? '∞' : String(Math.max(0, game.timer)), W / 2, 22);

    const ct = game.comboText;
    if (ct && game.frame - ct.frame < 80) {
      const left = ct.player === 0;
      const tx = left ? 16 : W - 16;
      ctx.textAlign = left ? 'left' : 'right';
      ctx.font = `900 18px ${FONT}`;
      this.outlined(`${ct.n} HIT!`, tx, 70, '#ff4f86');
      ctx.font = `bold 9px ${FONT}`;
      this.outlined(`${ct.dmg} 대미지`, tx, 82, '#6a4a60');
    }

    ctx.font = `8px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(90,60,80,0.8)';
    if (game.mode === 'training') {
      ctx.font = `bold 9px ${FONT}`;
      const how = game.touch ? '화면 탭으로 변경' : '숫자 1~5로 변경, 0 위치 초기화';
      this.outlined(`허수아비: ${DUMMY_MODES[game.dummyMode]}  (${how})`, W / 2, H - 26, '#6a4a60');
      if (game.adv) {
        const v = game.adv.v;
        this.outlined(`프레임 유불리 ${v > 0 ? '+' : ''}${v}`, W / 2, H - 38, v >= 0 ? '#2f9c5a' : '#d0445e');
      }
    } else if (!game.touch) {
      ctx.fillText('H: 판정 박스 보기   Esc: 일시정지', W / 2, H - 8);
    }
  }

  meter(game, f, i) {
    const ctx = this.ctx;
    const mw = 110, mh = 6, my = H - 14;
    const mx = i === 0 ? 14 : W - 14 - mw;
    const full = f.meter >= C.METER_MAX;
    ctx.fillStyle = '#4a3346';
    this.round(mx - 2, my - 2, mw + 4, mh + 4, 3);
    const fw = mw * Math.min(1, f.meter / C.METER_MAX);
    const blink = full && Math.floor(game.frame / 6) % 2;
    ctx.fillStyle = full ? (blink ? '#ffffff' : '#ff4f86') : '#8fd3ff';
    ctx.fillRect(i === 0 ? mx : mx + mw - fw, my, fw, mh);
    ctx.font = `900 9px ${FONT}`;
    ctx.textAlign = i === 0 ? 'left' : 'right';
    this.outlined(full ? 'MAX!' : 'SP', i === 0 ? mx : mx + mw, my - 4, full ? '#ff4f86' : '#3f8fd6');
  }

  superName(game, sf) {
    const ctx = this.ctx;
    const f = game.p[sf.player];
    const age = game.frame - sf.frame;
    const slide = Math.max(0, 1 - age / 8);
    const x = W / 2 + (sf.player === 0 ? -1 : 1) * slide * 200;
    ctx.save();
    ctx.translate(x, 92);
    ctx.font = `900 30px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.lineWidth = 7; ctx.strokeStyle = '#ffffff';
    ctx.strokeText(`${sf.name}!`, 0, 0);
    ctx.fillStyle = f.char.dark;
    ctx.fillText(`${sf.name}!`, 0, 0);
    ctx.font = `900 10px ${FONT}`;
    ctx.fillStyle = '#ffe45c';
    ctx.fillText('SUPER', 0, -28);
    ctx.restore();
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
    this.outlined('(가제)  2단계 시제품 · 필살기 버전', W / 2, 98, '#6a4a60');
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
