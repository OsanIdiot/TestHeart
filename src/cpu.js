// 단순한 컴퓨터 상대: 몇 프레임마다 거리를 보고 행동을 정함
// 필살기는 사람처럼 커맨드(↓↘→ + 펀치 등)를 한 프레임씩 입력함
import { CONFIG as C } from './data.js';

const BUTTONS = ['LP', 'HP', 'LK', 'HK'];
const MOTION_DIRS = { '236': [2, 3, 6], '623': [6, 2, 3], '214': [2, 1, 4], '236236': [2, 3, 6, 2, 3, 6] };
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

function makeInput(dirH, up, down, btns) {
  const held = { LP: false, HP: false, LK: false, HK: false };
  const pressed = { ...held };
  for (const b of [].concat(btns || [])) { held[b] = true; pressed[b] = true; }
  return { left: dirH < 0, right: dirH > 0, up, down, held, pressed };
}

// 숫자패드 방향(캐릭터 기준) → 실제 입력
function dirInput(d, facing, btn) {
  const rel = ((d - 1) % 3) - 1;
  return makeInput(rel * facing, d >= 7, d <= 3, btn);
}

export class Cpu {
  constructor() { this.reset(); }

  reset() { this.plan = null; this.timer = 0; this.comboed = false; this.jumpAttacked = false; this.queue = []; }

  // 커맨드 입력 예약. 게이지가 없으면 초필살기 대신 ↓↘→ 필살기
  special(me, motion) {
    let sp = me.char.specials.find((s) => s.motion === motion);
    if (sp?.super && me.meter < C.METER_MAX) sp = me.char.specials.find((s) => s.motion === '236');
    if (!sp) return;
    const dirs = MOTION_DIRS[sp.motion];
    const btn = (Math.random() < 0.6 ? 'H' : 'L') + sp.btn; // 약/강 버전 섞어서
    this.queue = dirs.map((d, i) => dirInput(d, me.facing, i === dirs.length - 1 ? btn : null));
  }

  think(me, opp) {
    if (this.queue.length) return this.queue.shift();
    const dist = Math.abs(opp.x - me.x);
    const toward = Math.sign(opp.x - me.x) || me.facing;
    const ruru = me.char.name === 'RURU';
    const full = me.meter >= C.METER_MAX;

    // 공격이 맞으면 이어가기: 약 → 강, 강 → 필살기 / 초필살기
    if (me.state !== 'attack') this.comboed = false;
    if (me.state === 'attack' && me.contact && me.move?.cancel && !this.comboed) {
      this.comboed = me.move.cancel === 'special';
      const r = Math.random();
      if (me.move.cancel === 'normal' && r < 0.6) return makeInput(0, false, false, pick(['HP', 'HK']));
      if (r < (full ? 0.7 : 0.55)) { this.special(me, full ? '236236' : '236'); return this.queue.shift(); }
    }
    // 점프 중 가까워지면 점프 공격
    if (me.state !== 'air') this.jumpAttacked = false;
    if (me.state === 'air' && !this.jumpAttacked && me.vy < 1 && dist < 55) {
      this.jumpAttacked = true;
      return makeInput(0, false, false, Math.random() < 0.5 ? 'HK' : 'HP');
    }

    if (--this.timer <= 0 || (opp.state === 'attack' && this.plan?.kind !== 'block' && Math.random() < 0.15)) {
      this.decide(me, opp, dist, toward, ruru, full);
      if (this.queue.length) return this.queue.shift();
    }
    const p = this.plan;
    const age = p.age++;
    return makeInput(p.h, p.up && age < 2, p.down, age === 0 ? p.btn : null);
  }

  decide(me, opp, dist, toward, ruru, full) {
    const r = Math.random();
    let plan = { kind: 'idle', h: 0, up: false, down: false, btn: null, age: 0 };
    let dur = 8 + Math.floor(Math.random() * 10);
    const special = (motion) => { this.special(me, motion); dur = 30; };

    if (opp.state === 'attack' && dist < 90 && r < 0.55) {
      const g = opp.activeHit()?.hit.guard ?? opp.move?.hits[0]?.guard;
      plan = { ...plan, kind: 'block', h: -toward, down: g === 'low' ? true : g === 'high' ? false : Math.random() < 0.5 };
      dur = 14;
    } else if (opp.y > 20 && dist < 80 && r < 0.5) {
      if (Math.random() < 0.5) special('623');
      else { plan = { ...plan, kind: 'antiair', down: true, btn: 'HP' }; dur = 24; }
    } else if (full && r < 0.08) {
      special('236236');
    } else if (dist > 110) {
      if (!me.projectileAlive && r < (ruru ? 0.45 : 0.25)) special('236');
      else { plan = r < 0.1 ? { ...plan, up: true, h: toward } : { ...plan, h: toward }; dur = 16; }
    } else if (dist > 55) {
      if (r < 0.35) plan = { ...plan, h: toward };
      else if (r < 0.5) { if (!me.projectileAlive) special('236'); else plan = { ...plan, down: true, btn: 'HK' }; }
      else if (r < 0.62) special('214');
      else if (r < 0.72) plan = { ...plan, btn: 'HK' };
      else if (r < 0.82) plan = { ...plan, up: true, h: toward };
      else if (r < 0.9) plan = { ...plan, h: -toward };
    } else {
      if (r < 0.45) plan = { ...plan, btn: pick(BUTTONS), down: Math.random() < 0.4 };
      else if (r < 0.55) plan = { ...plan, btn: 'HP' }; // 가까우면 잡기가 됨
      else if (r < 0.63) special(Math.random() < 0.5 ? '214' : '623');
      else if (r < 0.75) plan = { ...plan, h: -toward };
      else if (r < 0.85) plan = { ...plan, kind: 'block', h: -toward, down: true };
      else if (r < 0.9) plan = { ...plan, up: true, h: -toward };
    }
    this.plan = plan;
    this.timer = dur;
  }
}
