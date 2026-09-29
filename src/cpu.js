// 단순한 컴퓨터 상대: 몇 프레임마다 거리를 보고 행동을 정함
// 필살기는 "필살 버튼 + 방향"으로 씀 (중립=↓↘→, 앞=→↓↘, 뒤=↓↙←, 아래=초필살기)
import { CONFIG as C } from './data.js';

const BUTTONS = ['LP', 'HP', 'LK', 'HK'];
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

function makeInput(dirH, up, down, btns) {
  const held = { LP: false, HP: false, LK: false, HK: false, SP: false };
  const pressed = { ...held };
  for (const b of [].concat(btns || [])) { held[b] = true; pressed[b] = true; }
  return { left: dirH < 0, right: dirH > 0, up, down, held, pressed };
}

export class Cpu {
  constructor() { this.reset(); }

  reset() { this.plan = null; this.timer = 0; this.comboed = false; this.jumpAttacked = false; }

  think(me, opp) {
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
      if (r < (full ? 0.7 : 0.55)) return full ? makeInput(0, false, true, 'SP') : makeInput(0, false, false, 'SP');
    }
    // 점프 중 가까워지면 점프 공격
    if (me.state !== 'air') this.jumpAttacked = false;
    if (me.state === 'air' && !this.jumpAttacked && me.vy < 1 && dist < 55) {
      this.jumpAttacked = true;
      return makeInput(0, false, false, Math.random() < 0.5 ? 'HK' : 'HP');
    }

    if (--this.timer <= 0 || (opp.state === 'attack' && this.plan?.kind !== 'block' && Math.random() < 0.15)) {
      this.decide(me, opp, dist, toward, ruru, full);
    }
    const p = this.plan;
    const age = p.age++;
    return makeInput(p.h, p.up && age < 2, p.down, age === 0 ? p.btn : null);
  }

  decide(me, opp, dist, toward, ruru, full) {
    const r = Math.random();
    let plan = { kind: 'idle', h: 0, up: false, down: false, btn: null, age: 0 };
    let dur = 8 + Math.floor(Math.random() * 10);
    const sp = (dir, extra = {}) => ({ ...plan, kind: 'special', btn: 'SP', h: dir, ...extra });

    if (opp.state === 'attack' && dist < 90 && r < 0.55) {
      const g = opp.activeHit()?.hit.guard ?? opp.move?.hits[0]?.guard;
      plan = { ...plan, kind: 'block', h: -toward, down: g === 'low' ? true : g === 'high' ? false : Math.random() < 0.5 };
      dur = 14;
    } else if (opp.y > 20 && dist < 80 && r < 0.5) {
      plan = Math.random() < 0.5 ? sp(toward) : { ...plan, kind: 'antiair', down: true, btn: 'HP' };
      dur = 24;
    } else if (full && r < 0.08) {
      plan = sp(0, { down: true });
      dur = 30;
    } else if (dist > 110) {
      if (ruru && !me.projectileAlive && r < 0.45) { plan = sp(0); dur = 30; }
      else plan = r < 0.1 ? { ...plan, up: true, h: toward } : { ...plan, h: toward };
      dur = Math.max(dur, 16);
    } else if (dist > 55) {
      if (r < 0.35) plan = { ...plan, h: toward };
      else if (r < 0.5) plan = ruru && !me.projectileAlive ? sp(0) : { ...plan, down: true, btn: 'HK' };
      else if (r < 0.62) plan = ruru ? sp(-toward) : sp(0);
      else if (r < 0.72) plan = { ...plan, btn: 'HK' };
      else if (r < 0.82) plan = { ...plan, up: true, h: toward };
      else if (r < 0.9) plan = { ...plan, h: -toward };
    } else {
      if (r < 0.45) plan = { ...plan, btn: pick(BUTTONS), down: Math.random() < 0.4 };
      else if (r < 0.55) plan = { ...plan, btn: ['LP', 'LK'] }; // 잡기
      else if (r < 0.63 && !ruru) plan = sp(-toward);
      else if (r < 0.75) plan = { ...plan, h: -toward };
      else if (r < 0.85) plan = { ...plan, kind: 'block', h: -toward, down: true };
      else if (r < 0.9) plan = { ...plan, up: true, h: -toward };
    }
    this.plan = plan;
    this.timer = dur;
  }
}
