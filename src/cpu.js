// 아주 단순한 컴퓨터 상대: 몇 프레임마다 거리를 보고 행동을 정함
const BUTTONS = ['LP', 'HP', 'LK', 'HK'];

function makeInput(dirH, up, down, btn) {
  const held = { LP: false, HP: false, LK: false, HK: false };
  const pressed = { LP: false, HP: false, LK: false, HK: false };
  if (btn) { held[btn] = true; pressed[btn] = true; }
  return { left: dirH < 0, right: dirH > 0, up, down, held, pressed };
}

export class Cpu {
  constructor() { this.reset(); }

  reset() { this.plan = null; this.timer = 0; this.comboed = false; this.jumpAttacked = false; }

  think(me, opp) {
    const dist = Math.abs(opp.x - me.x);
    const toward = Math.sign(opp.x - me.x) || me.facing;

    // 약공격이 맞으면 강공격으로 이어가기
    if (me.state !== 'attack') this.comboed = false;
    if (me.state === 'attack' && me.contact && me.move?.cancel && !this.comboed) {
      this.comboed = true;
      if (Math.random() < 0.6) return makeInput(0, false, Math.random() < 0.5, Math.random() < 0.5 ? 'HP' : 'HK');
    }
    // 점프 중 가까워지면 점프 공격
    if (me.state !== 'air') this.jumpAttacked = false;
    if (me.state === 'air' && !this.jumpAttacked && me.vy < 1 && dist < 55) {
      this.jumpAttacked = true;
      return makeInput(0, false, false, Math.random() < 0.5 ? 'HK' : 'HP');
    }

    if (--this.timer <= 0 || (opp.state === 'attack' && this.plan?.kind !== 'block' && Math.random() < 0.15)) {
      this.decide(me, opp, dist, toward);
    }
    const p = this.plan;
    const age = p.age++;
    return makeInput(p.h, p.up && age < 2, p.down, age === 0 ? p.btn : null);
  }

  decide(me, opp, dist, toward) {
    const r = Math.random();
    let plan = { kind: 'idle', h: 0, up: false, down: false, btn: null, age: 0 };
    let dur = 8 + Math.floor(Math.random() * 10);

    if (opp.state === 'attack' && dist < 90 && r < 0.55) {
      const g = opp.move?.guard;
      plan = { ...plan, kind: 'block', h: -toward, down: g === 'low' ? true : g === 'high' ? false : Math.random() < 0.5 };
      dur = 14;
    } else if (opp.y > 20 && dist < 80 && r < 0.45) {
      plan = { ...plan, kind: 'antiair', down: true, btn: 'HP' };
      dur = 24;
    } else if (dist > 110) {
      plan = r < 0.1 ? { ...plan, up: true, h: toward } : { ...plan, h: toward };
      dur = 16;
    } else if (dist > 55) {
      if (r < 0.45) plan = { ...plan, h: toward };
      else if (r < 0.6) plan = { ...plan, down: true, btn: 'HK' };
      else if (r < 0.7) plan = { ...plan, btn: 'HK' };
      else if (r < 0.8) plan = { ...plan, up: true, h: toward };
      else if (r < 0.9) plan = { ...plan, h: -toward };
    } else {
      if (r < 0.55) plan = { ...plan, btn: BUTTONS[Math.floor(Math.random() * 4)], down: Math.random() < 0.4 };
      else if (r < 0.7) plan = { ...plan, h: -toward };
      else if (r < 0.8) plan = { ...plan, kind: 'block', h: -toward, down: true };
      else if (r < 0.88) plan = { ...plan, up: true, h: -toward };
    }
    this.plan = plan;
    this.timer = dur;
  }
}
