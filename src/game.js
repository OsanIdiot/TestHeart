import { CONFIG as C, BODY, CHARACTERS } from './data.js';
import { Fighter, EMPTY_INPUT } from './fighter.js';
import { Cpu } from './cpu.js';
import { sfx } from './sound.js';

export const MODES = [
  { id: 'versus', label: '2P 대전', desc: '둘이서 한 키보드로 대전' },
  { id: 'cpu', label: 'CPU 대전', desc: '컴퓨터와 대전' },
  { id: 'training', label: '트레이닝', desc: '허수아비 상대로 연습' },
];
export const DUMMY_MODES = ['서 있기', '앉아 있기', '전부 가드', '계속 점프', 'CPU'];

function overlap(a, b) {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

export class Game {
  constructor() {
    this.p = [new Fighter(0, CHARACTERS[0]), new Fighter(1, CHARACTERS[1])];
    this.cpu = new Cpu();
    this.effects = [];
    this.debug = false;
    this.frame = 0;
    this.mode = 'title';
    this.menuIndex = 0;
    this.dummyMode = 0;
    this.shake = 0;
    this.hitstop = 0;
  }

  startMatch(mode) {
    this.mode = mode;
    this.p.forEach((f) => { f.wins = 0; });
    this.round = 0;
    this.paused = false;
    this.nextRound();
  }

  nextRound() {
    this.round++;
    const mid = C.STAGE_W / 2;
    this.p[0].reset(mid - C.START_GAP / 2, 1);
    this.p[1].reset(mid + C.START_GAP / 2, -1);
    this.cpu.reset();
    this.timer = C.ROUND_TIME; this.timerFrames = 0;
    this.hitstop = 0; this.shake = 0;
    this.effects = []; this.comboText = null; this.adv = null; this.advTrack = null;
    this.idleFrames = 0;
    this.p.forEach((f) => { f.noKo = this.mode === 'training'; });
    if (this.mode === 'training') { this.setPhase('fight'); this.banner = null; return; }
    this.setPhase('intro');
    const final = this.p.every((f) => f.wins === C.ROUNDS_TO_WIN - 1);
    this.setBanner(final ? 'FINAL ROUND' : `ROUND ${this.round}`);
    sfx('round');
  }

  setPhase(p) { this.phase = p; this.phaseFrame = 0; }
  setBanner(text, sub = '') { this.banner = { text, sub, frame: this.frame }; }

  step({ players, taps }) {
    this.frame++;
    this.updateEffects();
    if (taps.has('KeyH')) this.debug = !this.debug;

    if (this.mode === 'title') return this.titleStep(taps);

    if (this.phase === 'matchEnd') {
      if (taps.has('Enter') || taps.has('Space')) { sfx('select'); this.startMatch(this.mode); }
      else if (taps.has('Escape')) { this.mode = 'title'; }
      this.simulate([EMPTY_INPUT, EMPTY_INPUT]);
      return;
    }

    if (taps.has('Escape')) this.paused = !this.paused;
    if (this.paused) {
      if (taps.has('KeyT')) { this.paused = false; this.mode = 'title'; }
      return;
    }

    if (this.mode === 'training') this.trainingKeys(taps);

    this.phaseFrame++;
    let inputs = [EMPTY_INPUT, EMPTY_INPUT];
    if (this.phase === 'fight') inputs = [players[0], this.p2Input(players[1])];
    this.simulate(inputs);

    if (this.phase === 'intro') {
      if (this.phaseFrame === 70) { this.setBanner('FIGHT!'); sfx('fight'); }
      if (this.phaseFrame >= 100) this.setPhase('fight');
    } else if (this.phase === 'fight') {
      this.fightRules();
    } else if (this.phase === 'roundEnd') {
      if (this.phaseFrame === 80) this.announceRoundWinner();
      if (this.phaseFrame >= 180) {
        const champ = this.p.filter((f) => f.wins >= C.ROUNDS_TO_WIN);
        if (champ.length) {
          this.setPhase('matchEnd');
          this.setBanner(champ.length === 2 ? 'DRAW GAME' : `${champ[0].char.name} WIN!`,
            this.touch ? '화면 탭: 다시 하기   ⌂: 타이틀로' : 'Enter: 다시 하기   Esc: 타이틀로');
        } else this.nextRound();
      }
    }
  }

  titleStep(taps) {
    const n = MODES.length;
    if (taps.has('ArrowUp') || taps.has('KeyW')) { this.menuIndex = (this.menuIndex + n - 1) % n; sfx('select'); }
    if (taps.has('ArrowDown') || taps.has('KeyS')) { this.menuIndex = (this.menuIndex + 1) % n; sfx('select'); }
    ['Digit1', 'Digit2', 'Digit3'].forEach((d, i) => { if (taps.has(d)) { this.menuIndex = i; taps.add('Enter'); } });
    if (taps.has('Enter') || taps.has('Space') || taps.has('KeyF')) {
      sfx('fight');
      this.startMatch(MODES[this.menuIndex].id);
    }
  }

  cycleDummy() {
    this.dummyMode = (this.dummyMode + 1) % DUMMY_MODES.length;
    this.cpu.reset();
  }

  trainingKeys(taps) {
    DUMMY_MODES.forEach((_, i) => { if (taps.has(`Digit${i + 1}`)) { this.dummyMode = i; this.cpu.reset(); } });
    if (taps.has('Digit0')) this.nextRound();
  }

  p2Input(human) {
    const [a, b] = this.p;
    if (this.mode === 'versus') return human;
    if (this.mode === 'cpu') return this.cpu.think(b, a);
    const away = Math.sign(b.x - a.x) || 1;
    switch (DUMMY_MODES[this.dummyMode]) {
      case '앉아 있기': return { ...EMPTY_INPUT, down: true };
      case '전부 가드': {
        const stand = a.y > 0 || a.move?.guard === 'high';
        return { ...EMPTY_INPUT, left: away < 0, right: away > 0, down: !stand };
      }
      case '계속 점프': return { ...EMPTY_INPUT, up: true };
      case 'CPU': return this.cpu.think(b, a);
      default: return EMPTY_INPUT;
    }
  }

  // 한 프레임 진행: 이동 → 밀어내기 → 타격 판정
  simulate(inputs) {
    const [a, b] = this.p;
    if (this.hitstop > 0) {
      this.hitstop--;
      a.handleBuffer(inputs[0], false);
      b.handleBuffer(inputs[1], false);
      return;
    }
    a.update(inputs[0]);
    b.update(inputs[1]);
    this.separate();

    const hits = [];
    for (const [att, def] of [[a, b], [b, a]]) {
      if (att.isActive() && !def.invuln) {
        const hr = att.hitRect(), dr = def.hurtRect();
        if (overlap(hr, dr)) hits.push({ att, def, m: att.move, hr, dr });
      }
    }
    for (const h of hits) this.applyHit(h);

    for (const [f, o] of [[a, b], [b, a]]) {
      if (f.grounded && (f.actionable || f.state === 'landing') && f.x !== o.x) f.facing = o.x > f.x ? 1 : -1;
      for (const e of f.events) if (e === 'swingL' || e === 'swingH' || e === 'jump') sfx(e);
      f.events.length = 0;
    }
    this.trackAdvantage();
  }

  applyHit({ att, def, m, hr, dr }) {
    const blocked = def.canBlock(att, m);
    att.moveHit = true;
    att.contact = true;
    const r = def.takeHit(att, m, blocked);

    // 상대가 벽에 붙어 있으면 대신 공격자가 밀려남
    const atWall = def.x <= C.WALL_MARGIN + 1 || def.x >= C.STAGE_W - C.WALL_MARGIN - 1;
    if (r !== 'ko' && def.grounded && atWall) att.pushVx = -(Math.sign(def.x - att.x) || att.facing) * m.push * 0.9;

    const heavy = m.hitstop >= 9;
    this.hitstop = Math.max(this.hitstop, r === 'block' ? Math.round(m.hitstop * 0.7) : r === 'ko' ? 45 : m.hitstop);
    if (r !== 'block' && m.shake) this.shake = Math.max(this.shake, m.shake * 2);
    if (r === 'ko') this.shake = 10;

    const x0 = Math.max(hr.x, dr.x), x1 = Math.min(hr.x + hr.w, dr.x + dr.w);
    const y0 = Math.max(hr.y, dr.y), y1 = Math.min(hr.y + hr.h, dr.y + dr.h);
    this.effects.push({ type: r === 'block' ? 'block' : 'hit', x: (x0 + x1) / 2, y: (y0 + y1) / 2, t: 0, big: heavy, dir: att.facing });

    sfx(r === 'ko' ? 'ko' : r === 'block' ? 'block' : heavy ? 'hitH' : 'hitL');
    if (r !== 'block' && def.combo >= 2) this.comboText = { player: att.index, n: def.combo, frame: this.frame };
    this.advTrack = { att, def, f: 0, ta: null, td: null };
  }

  // 트레이닝용 프레임 유불리 계산 (+면 공격한 쪽이 먼저 움직일 수 있음)
  trackAdvantage() {
    const t = this.advTrack;
    if (!t) return;
    t.f++;
    if (t.ta === null && t.att.actionable) t.ta = t.f;
    if (t.td === null && t.def.actionable) t.td = t.f;
    if (t.ta !== null && t.td !== null) { this.adv = { v: t.td - t.ta, player: t.att.index, frame: this.frame }; this.advTrack = null; }
    else if (t.f > 120) this.advTrack = null;
  }

  separate() {
    const [a, b] = this.p;
    for (let pass = 0; pass < 2; pass++) {
      const ra = a.hurtRect(), rb = b.hurtRect();
      const vert = ra.y < rb.y + rb.h && rb.y < ra.y + ra.h;
      const dx = b.x - a.x;
      if (vert && Math.abs(dx) < BODY.pushW && !(a.state === 'ko' || b.state === 'ko')) {
        const push = (BODY.pushW - Math.abs(dx)) / 2;
        const s = Math.sign(dx) || a.facing;
        a.x -= s * push; b.x += s * push;
      }
      for (const f of this.p) f.x = Math.min(C.STAGE_W - C.WALL_MARGIN, Math.max(C.WALL_MARGIN, f.x));
    }
  }

  fightRules() {
    const [a, b] = this.p;
    if (this.mode === 'training') {
      const calm = a.actionable && (b.actionable || b.state === 'air');
      this.idleFrames = calm ? this.idleFrames + 1 : 0;
      if (this.idleFrames > 40) for (const f of this.p) { if (f.hp < C.MAX_HP) { f.hp = C.MAX_HP; f.redHp = C.MAX_HP; } }
      return;
    }
    if (a.hp <= 0 || b.hp <= 0) {
      if (a.hp <= 0) b.wins++;
      if (b.hp <= 0) a.wins++;
      this.setPhase('roundEnd');
      this.setBanner(a.hp <= 0 && b.hp <= 0 ? 'DOUBLE K.O.' : 'K.O.');
      return;
    }
    if (++this.timerFrames >= 60) {
      this.timerFrames = 0;
      if (--this.timer <= 0) {
        if (a.hp >= b.hp) a.wins++;
        if (b.hp >= a.hp) b.wins++;
        this.setPhase('roundEnd');
        this.setBanner('TIME UP');
        sfx('round');
      }
    }
  }

  announceRoundWinner() {
    const [a, b] = this.p;
    if (a.hp === b.hp) this.setBanner('DRAW');
    else this.setBanner(`${(a.hp > b.hp ? a : b).char.name} WIN`);
  }

  updateEffects() {
    for (const e of this.effects) e.t++;
    this.effects = this.effects.filter((e) => e.t < 16);
    if (this.shake > 0) this.shake--;
  }
}
