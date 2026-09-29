import { CONFIG as C, BODY, MOVES, MOTIONS } from './data.js';

const NO_BUTTONS = { LP: false, HP: false, LK: false, HK: false };
export const EMPTY_INPUT = {
  left: false, right: false, up: false, down: false,
  held: NO_BUTTONS, pressed: NO_BUTTONS,
};

const ACTIONABLE = new Set(['idle', 'walkF', 'walkB', 'crouch']);
const INVULN = new Set(['down', 'getup', 'airhit', 'ko', 'throwing', 'thrown']);
const STUNNED = new Set(['hitstun', 'blockstun']);
const BUTTON_PRIORITY = ['HK', 'HP', 'LK', 'LP'];
const HIST_LEN = 40;

export class Fighter {
  constructor(index, char) {
    this.index = index;
    this.char = char;
    this.wins = 0;
    this.reset(0, 1);
  }

  reset(x, facing) {
    this.x = x; this.y = 0; this.vx = 0; this.vy = 0;
    this.facing = facing;
    this.hp = C.MAX_HP; this.redHp = C.MAX_HP; this.redDelay = 0;
    this.meter = 0;
    this.move = null; this.moveKey = null; this.moveFrame = 0;
    this.hitDone = new Set(); this.contact = false; this.airMove = false;
    this.stun = 0; this.pushVx = 0; this.combo = 0; this.comboDamage = 0; this.flash = 0;
    this.buffer = null; this.inp = EMPTY_INPUT; this.hist = [];
    this.airAttacked = false; this.lowGuard = false; this.jumpDir = 0;
    this.projectileAlive = false;
    this.events = [];
    this.setState('idle');
  }

  setState(s) { this.state = s; this.stateFrame = 0; }

  get grounded() { return this.y <= 0; }
  get actionable() { return ACTIONABLE.has(this.state); }
  get stunned() { return STUNNED.has(this.state); }
  get invuln() {
    if (INVULN.has(this.state)) return true;
    if (this.state === 'backdash' && this.stateFrame < C.BACKDASH_INVULN) return true;
    const iv = this.state === 'attack' && this.move.invuln;
    return !!iv && this.moveFrame >= iv[0] && this.moveFrame < iv[1];
  }
  get crouching() {
    return this.state === 'crouch'
      || (this.state === 'attack' && this.moveKey[0] === 'c')
      || (this.state === 'blockstun' && this.lowGuard);
  }

  // 방향을 숫자패드 번호로 (앞 = 6, 캐릭터가 보는 방향 기준)
  dirNumber(inp) {
    const h = ((inp.right ? 1 : 0) - (inp.left ? 1 : 0)) * this.facing;
    const v = inp.up ? 3 : inp.down ? -3 : 0;
    return 5 + h + v;
  }

  matchMotion(name) {
    const { variants, window, endOn } = MOTIONS[name];
    const hist = this.hist;
    if (endOn && !endOn.includes(hist[hist.length - 1])) return false;
    return variants.some((steps) => {
      let j = steps.length - 1;
      for (let i = hist.length - 1; i >= Math.max(0, hist.length - window) && j >= 0; i--) {
        if (steps[j].includes(hist[i])) j--;
      }
      return j < 0;
    });
  }

  // 같은 방향을 두 번 톡톡 (대시)
  doubleTap(d) {
    const h = this.hist, n = h.length;
    if (n < 3 || h[n - 1] !== d || h[n - 2] !== 5) return false;
    let i = n - 2;
    while (i >= 0 && h[i] === 5 && n - i < 12) i--;
    return i >= 0 && h[i] === d && n - i < 12;
  }

  // 버튼이 눌린 순간, 커맨드까지 보고 무슨 기술인지 결정
  //  커맨드 + P/K = 필살기 (약/강 버전), 아주 가까이서 강펀치 = 잡기
  resolvePress(inp) {
    const p = inp.pressed;
    const btn = BUTTON_PRIORITY.find((b) => p[b]);
    if (!btn) return null;
    // 초필살기 쉬운 입력: 게이지 MAX + ↓↘→ + 강P·강K 동시
    const h = inp.held;
    const bothHeavy = (p.HP || p.HK) && h.HP && h.HK;
    if (bothHeavy && this.meter >= C.METER_MAX && this.matchMotion('236')) {
      const sup = this.char.specials.find((s) => s.super);
      if (sup) return { special: sup };
    }
    const P = p.LP || p.HP, K = p.LK || p.HK;
    for (const sp of this.char.specials) {
      if ((sp.btn === 'P' ? P : K) && this.matchMotion(sp.motion) && (!sp.super || this.meter >= C.METER_MAX)) {
        return { special: sp, strength: p.HP || p.HK ? 'H' : 'L' };
      }
    }
    if (p.HP && this.inCloseRange(inp)) {
      const back = this.dirNumber(inp) === 4;
      return { btn: back ? 'throwB' : 'throw' };
    }
    return { btn };
  }

  inCloseRange(inp) {
    const o = this.opp;
    return !!o && this.grounded && !inp.down && Math.abs(o.x - this.x) <= C.THROW_RANGE && o.canBeThrown();
  }

  // 선입력 버퍼: 조금 일찍 누른 버튼을 몇 프레임 기억
  handleBuffer(inp, tick) {
    this.inp = inp;
    this.hist.push(this.dirNumber(inp));
    if (this.hist.length > HIST_LEN) this.hist.shift();
    if (this.buffer && tick && --this.buffer.t <= 0) this.buffer = null;
    const r = this.resolvePress(inp);
    if (r) this.buffer = { ...r, t: C.INPUT_BUFFER };
  }

  moveKeyFor(b) {
    if (b.special) {
      const base = b.special.move;
      return MOVES[base + b.strength] ? base + b.strength : base;
    }
    if (b.btn.startsWith('throw')) return this.y > 0 ? 'jHP' : b.btn;
    return (this.y > 0 ? 'j' : this.inp.down ? 'c' : 's') + b.btn;
  }

  update(inp) {
    this.handleBuffer(inp, true);
    this.stateFrame++;
    if (this.flash > 0) this.flash--;
    if (this.actionable) { this.combo = 0; this.comboDamage = 0; }

    const h = (inp.right ? 1 : 0) - (inp.left ? 1 : 0);
    const rel = h * this.facing; // 1 = 앞, -1 = 뒤

    switch (this.state) {
      case 'idle': case 'walkF': case 'walkB': case 'crouch':
        if (this.buffer) { this.startFromBuffer(); break; }
        if (this.doubleTap(6)) { this.setState('dash'); break; }
        if (this.doubleTap(4)) { this.setState('backdash'); break; }
        if (inp.up) { this.jumpDir = h; this.vx = 0; this.setState('jumpsquat'); break; }
        if (inp.down) { if (this.state !== 'crouch') this.setState('crouch'); this.vx = 0; break; }
        if (rel > 0) { if (this.state !== 'walkF') this.setState('walkF'); this.vx = C.WALK_FWD * this.facing; }
        else if (rel < 0) { if (this.state !== 'walkB') this.setState('walkB'); this.vx = -C.WALK_BACK * this.facing; }
        else { if (this.state !== 'idle') this.setState('idle'); this.vx = 0; }
        break;
      case 'dash':
        this.vx = this.stateFrame < C.DASH_TIME - 4 ? C.DASH_VX * this.facing : 0;
        if (this.buffer && this.stateFrame > 6) { this.startFromBuffer(); break; }
        if (this.stateFrame >= C.DASH_TIME) this.setState('idle');
        break;
      case 'backdash':
        this.vx = this.stateFrame < C.BACKDASH_TIME - 6 ? -C.BACKDASH_VX * this.facing : 0;
        if (this.stateFrame >= C.BACKDASH_TIME) this.setState('idle');
        break;
      case 'jumpsquat':
        if (this.stateFrame >= C.JUMP_SQUAT) {
          this.setState('air');
          this.vy = C.JUMP_VY; this.vx = this.jumpDir * C.JUMP_VX; this.y = 0.01;
          this.airAttacked = false;
          this.events.push('jump');
        }
        break;
      case 'air':
        if (this.buffer && !this.airAttacked && !this.buffer.special) {
          this.airAttacked = true;
          this.startMove(this.moveKeyFor(this.buffer));
        }
        break;
      case 'attack': this.updateAttack(); break;
      case 'fall': break; // 공중 필살기 끝, 착지까지 아무것도 못 함
      case 'landing': if (this.stateFrame >= this.landLag) this.setState('idle'); break;
      case 'hitstun':
        if (--this.stun <= 0) this.setState('idle');
        break;
      case 'blockstun':
        if (--this.stun <= 0) this.setState(inp.down ? 'crouch' : 'idle');
        break;
      case 'down': if (this.stateFrame >= C.DOWN_TIME) this.setState('getup'); break;
      case 'getup': if (this.stateFrame >= C.GETUP_TIME) this.setState('idle'); break;
      case 'throwing': if (this.stateFrame >= C.THROW_TOTAL) this.setState('idle'); break;
      case 'thrown': break; // 위치는 잡은 쪽이 정함 (game.js)
    }

    this.physics();
    this.updateRedHp();
  }

  startFromBuffer() {
    const b = this.buffer;
    const key = this.moveKeyFor(b);
    // 당근은 화면에 하나만
    if (MOVES[key].projectile && this.projectileAlive && !MOVES[key].super) {
      this.buffer = null;
      return;
    }
    this.startMove(key);
  }

  physics() {
    if (this.state === 'thrown') return;
    if (this.y > 0) {
      this.vy -= C.GRAVITY;
      this.y += this.vy;
      this.x += this.vx;
      if (this.y <= 0) { this.y = 0; this.vy = 0; this.land(); }
    } else {
      this.x += this.vx;
    }
    this.x += this.pushVx;
    this.pushVx *= C.PUSH_FRICTION;
    if (Math.abs(this.pushVx) < 0.05) this.pushVx = 0;
  }

  land() {
    this.vx = 0;
    this.events.push('land');
    this.landLag = C.LANDING_LAG;
    if (this.state === 'air') this.setState('landing');
    else if (this.state === 'attack' && (this.airMove || this.move.jump)) {
      this.landLag = this.move.landLag ?? C.LANDING_LAG;
      this.move = null; this.setState('landing');
    } else if (this.state === 'fall') { this.landLag = this.fallLag; this.setState('landing'); }
    else if (this.state === 'airhit') { this.setState('down'); this.events.push('thud'); }
    else if (this.state === 'ko') this.events.push('thud');
  }

  startMove(key) {
    const m = MOVES[key];
    if (!m) return;
    this.buffer = null;
    this.move = m; this.moveKey = key; this.moveFrame = 0;
    this.hitDone = new Set(); this.contact = false;
    this.airMove = key[0] === 'j';
    if (!this.airMove) this.vx = 0;
    this.setState('attack');
    if (m.super) { this.meter -= C.METER_MAX; this.events.push({ type: 'super', name: m.name }); }
    else if (!/^[scj][LH][PK]$|^throwB?$/.test(key)) { this.meter = Math.min(C.METER_MAX, this.meter + 30); this.events.push('special'); }
    this.events.push(key.includes('H') || m.super ? 'swingH' : 'swingL');
    this.moveTick();
  }

  // 기술 진행 중 매 프레임: 이동, 점프, 당근 발사
  moveTick() {
    const m = this.move, f = this.moveFrame;
    if (m.moveX) {
      const seg = m.moveX.find(([a, b]) => f >= a && f < b);
      if (this.grounded) this.vx = seg ? seg[2] * this.facing : 0;
    }
    if (m.jump && f === m.jump.frame) {
      this.vy = m.jump.vy; this.vx = m.jump.vx * this.facing; this.y = 0.01;
    }
    if (m.projectile && f === m.projectile.frame) this.events.push({ type: 'projectile', data: m.projectile });
  }

  updateAttack() {
    this.moveFrame++;
    const m = this.move;
    // 캔슬: 공격을 맞혔으면 다음 기술로 끊어서 이어가기 (콤보)
    const b = this.buffer;
    if (this.contact && b && m.cancel && this.moveFrame < this.lastHitEnd() + C.CANCEL_WINDOW) {
      const okNormal = m.cancel === 'normal' && !b.special && !b.btn.startsWith('throw');
      if (b.special || okNormal) {
        const key = this.moveKeyFor(b);
        if (key !== this.moveKey || m.cancel === 'normal') { this.startMove(key); return; }
      }
    }
    this.moveTick();
    if (this.moveFrame >= m.total) {
      this.move = null;
      if (this.y > 0) {
        if (this.airMove) this.setState('air');
        else { this.fallLag = m.landLag ?? C.LANDING_LAG; this.setState('fall'); }
      } else this.setState(this.inp.down ? 'crouch' : 'idle');
    }
  }

  lastHitEnd() {
    const hits = this.move.hits;
    return hits.length ? hits[hits.length - 1].end : 0;
  }

  // 지금 때리는 중인 판정 (없으면 null)
  activeHit() {
    if (this.state !== 'attack') return null;
    const hits = this.move.hits;
    for (let i = 0; i < hits.length; i++) {
      const h = hits[i];
      if (!this.hitDone.has(i) && this.moveFrame >= h.start && this.moveFrame < h.end) return { hit: h, index: i };
    }
    return null;
  }

  hitRect(hb) {
    const x = this.facing > 0 ? this.x + hb.x : this.x - hb.x - hb.w;
    return { x, y: this.y + hb.y, w: hb.w, h: hb.h };
  }

  hurtRect() {
    let h = BODY.standH, yo = 0;
    if (this.state === 'attack' && this.move.hurtH) h = this.move.hurtH;
    else if (this.crouching) h = BODY.crouchH;
    else if (this.y > 0) { h = BODY.airH; yo = 6; }
    return { x: this.x - BODY.w / 2, y: this.y + yo, w: BODY.w, h };
  }

  // 가드 판정: 상대 반대 방향을 누르고 있으면 막음
  canBlock(attX, hit) {
    if (hit.guard === 'throw') return false;
    if (!(this.actionable || this.state === 'blockstun') || this.y > 0) return false;
    const h = (this.inp.right ? 1 : 0) - (this.inp.left ? 1 : 0);
    const away = attX > this.x ? -1 : 1;
    if (h !== away) return false;
    if (hit.guard === 'low' && !this.inp.down) return false;
    if (hit.guard === 'high' && this.inp.down) return false;
    return true;
  }

  // 다단히트 기술(juggle)은 공중에 뜬 상대도 계속 때릴 수 있음
  hittableBy(hit) {
    if (this.state === 'airhit' && hit.juggle && this.hp > 0 && this.juggles < 12) return true;
    return !this.invuln;
  }

  canBeThrown() {
    return this.grounded && !this.stunned && !this.invuln;
  }

  takeHit(attX, attFacing, hit, blocked, last = true) {
    const dir = Math.sign(this.x - attX) || attFacing;
    if (blocked) {
      this.setState('blockstun');
      this.stun = hit.blockstun; this.lowGuard = this.inp.down;
      this.pushVx = dir * hit.push; this.vx = 0;
      return 'block';
    }
    this.combo++;
    this.juggles = this.state === 'airhit' ? (this.juggles || 0) + 1 : 0;
    const scale = Math.max(C.MIN_SCALING, 1 - C.COMBO_SCALING * (this.combo - 1));
    const dmg = Math.round(hit.damage * scale);
    this.hp = Math.max(this.noKo ? 1 : 0, this.hp - dmg);
    this.comboDamage += dmg;
    this.meter = Math.min(C.METER_MAX, this.meter + dmg * 0.5);
    this.redDelay = 30;
    this.flash = 8;
    this.move = null;
    if (this.hp <= 0) {
      this.setState('ko');
      this.vy = 6; this.vx = dir * 2.5; this.y = Math.max(this.y, 1);
      return 'ko';
    }
    if (hit.throw) {
      this.setState('airhit');
      this.vy = 5; this.vx = dir * 3.2; this.y = Math.max(this.y, 1);
    } else if (this.y > 0 || (hit.launch && last) || hit.lift) {
      this.setState('airhit');
      if (hit.launch) { this.vy = 7; this.vx = dir * 1.8; }
      else if (hit.juggle) { this.vy = hit.lift ?? 3.5; this.vx = dir * 0.6; } // 연타 중엔 거의 제자리에 띄워 둠
      else { this.vy = 4; this.vx = dir * 1.8; }
      this.y = Math.max(this.y, 1);
    } else if (hit.knockdown) {
      this.setState('airhit');
      this.vy = 3; this.vx = dir * 1.5; this.y = 1;
    } else {
      this.setState('hitstun');
      this.stun = hit.hitstun; this.pushVx = dir * hit.push * C.HIT_PUSH_SCALE; this.vx = 0;
    }
    return 'hit';
  }

  updateRedHp() {
    if (this.redDelay > 0) this.redDelay--;
    else if (this.redHp > this.hp) this.redHp = Math.max(this.hp, this.redHp - 6);
  }
}
