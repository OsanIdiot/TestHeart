import { CONFIG as C, BODY, MOVES } from './data.js';

export const EMPTY_INPUT = {
  left: false, right: false, up: false, down: false,
  held: { LP: false, HP: false, LK: false, HK: false },
  pressed: { LP: false, HP: false, LK: false, HK: false },
};

const ACTIONABLE = new Set(['idle', 'walkF', 'walkB', 'crouch']);
const INVULN = new Set(['down', 'getup', 'airhit', 'ko']);
const BUTTON_PRIORITY = ['HK', 'HP', 'LK', 'LP'];

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
    this.move = null; this.moveKey = null; this.moveFrame = 0;
    this.moveHit = false; this.contact = false; this.airMove = false;
    this.stun = 0; this.pushVx = 0; this.combo = 0; this.flash = 0;
    this.buffer = null; this.inp = EMPTY_INPUT;
    this.airAttacked = false; this.lowGuard = false; this.jumpDir = 0;
    this.events = [];
    this.setState('idle');
  }

  setState(s) { this.state = s; this.stateFrame = 0; }

  get grounded() { return this.y <= 0; }
  get actionable() { return ACTIONABLE.has(this.state); }
  get invuln() { return INVULN.has(this.state); }
  get crouching() {
    return this.state === 'crouch'
      || (this.state === 'attack' && this.moveKey[0] === 'c')
      || (this.state === 'blockstun' && this.lowGuard);
  }

  // 선입력 버퍼: 조금 일찍 누른 버튼을 몇 프레임 기억
  handleBuffer(inp, tick) {
    this.inp = inp;
    if (this.buffer && tick && --this.buffer.t <= 0) this.buffer = null;
    for (const b of BUTTON_PRIORITY) {
      if (inp.pressed[b]) { this.buffer = { btn: b, t: C.INPUT_BUFFER }; break; }
    }
  }

  update(inp) {
    this.handleBuffer(inp, true);
    this.stateFrame++;
    if (this.flash > 0) this.flash--;
    if (this.actionable) this.combo = 0;

    const h = (inp.right ? 1 : 0) - (inp.left ? 1 : 0);
    const rel = h * this.facing; // 1 = 앞, -1 = 뒤

    switch (this.state) {
      case 'idle': case 'walkF': case 'walkB': case 'crouch':
        if (this.buffer) { this.startMove((inp.down ? 'c' : 's') + this.buffer.btn); break; }
        if (inp.up) { this.jumpDir = h; this.vx = 0; this.setState('jumpsquat'); break; }
        if (inp.down) { if (this.state !== 'crouch') this.setState('crouch'); this.vx = 0; break; }
        if (rel > 0) { if (this.state !== 'walkF') this.setState('walkF'); this.vx = C.WALK_FWD * this.facing; }
        else if (rel < 0) { if (this.state !== 'walkB') this.setState('walkB'); this.vx = -C.WALK_BACK * this.facing; }
        else { if (this.state !== 'idle') this.setState('idle'); this.vx = 0; }
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
        if (this.buffer && !this.airAttacked) { this.airAttacked = true; this.startMove('j' + this.buffer.btn); }
        break;
      case 'attack': this.updateAttack(); break;
      case 'landing': if (this.stateFrame >= C.LANDING_LAG) this.setState('idle'); break;
      case 'hitstun':
        if (--this.stun <= 0) this.setState('idle');
        break;
      case 'blockstun':
        if (--this.stun <= 0) this.setState(inp.down ? 'crouch' : 'idle');
        break;
      case 'down': if (this.stateFrame >= C.DOWN_TIME) this.setState('getup'); break;
      case 'getup': if (this.stateFrame >= C.GETUP_TIME) this.setState('idle'); break;
    }

    this.physics();
    this.updateRedHp();
  }

  physics() {
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
    if (this.state === 'air') this.setState('landing');
    else if (this.state === 'attack' && this.airMove) { this.move = null; this.setState('landing'); }
    else if (this.state === 'airhit') this.setState('down');
  }

  startMove(key) {
    const m = MOVES[key];
    if (!m) return;
    this.buffer = null;
    this.move = m; this.moveKey = key; this.moveFrame = 0;
    this.moveHit = false; this.contact = false;
    this.airMove = key[0] === 'j';
    if (!this.airMove) this.vx = 0;
    this.setState('attack');
    this.events.push(key[1] === 'H' ? 'swingH' : 'swingL');
  }

  updateAttack() {
    this.moveFrame++;
    const m = this.move;
    // 캔슬: 약공격을 맞혔으면 다음 공격으로 끊어서 이어가기 (콤보)
    if (this.contact && this.buffer && !this.airMove && m.cancel
        && m.cancel.includes(this.buffer.btn)
        && this.moveFrame < m.startup + m.active + C.CANCEL_WINDOW) {
      this.startMove((this.inp.down ? 'c' : 's') + this.buffer.btn);
      return;
    }
    if (this.moveFrame >= m.startup + m.active + m.recovery) {
      this.move = null;
      if (this.airMove && this.y > 0) this.setState('air');
      else this.setState(this.inp.down ? 'crouch' : 'idle');
    }
  }

  isActive() {
    const m = this.move;
    return this.state === 'attack' && m && !this.moveHit
      && this.moveFrame >= m.startup && this.moveFrame < m.startup + m.active;
  }

  hitRect() {
    const hb = this.move.hitbox;
    const x = this.facing > 0 ? this.x + hb.x : this.x - hb.x - hb.w;
    return { x, y: this.y + hb.y, w: hb.w, h: hb.h };
  }

  hurtRect() {
    let h = BODY.standH, yo = 0;
    if (this.crouching) h = BODY.crouchH;
    else if (this.y > 0) { h = BODY.airH; yo = 6; }
    return { x: this.x - BODY.w / 2, y: this.y + yo, w: BODY.w, h };
  }

  // 가드 판정: 상대 반대 방향을 누르고 있으면 막음
  canBlock(att, m) {
    if (!(this.actionable || this.state === 'blockstun') || this.y > 0) return false;
    const h = (this.inp.right ? 1 : 0) - (this.inp.left ? 1 : 0);
    const away = att.x > this.x ? -1 : 1;
    if (h !== away) return false;
    if (m.guard === 'low' && !this.inp.down) return false;
    if (m.guard === 'high' && this.inp.down) return false;
    return true;
  }

  takeHit(att, m, blocked) {
    const dir = Math.sign(this.x - att.x) || att.facing;
    if (blocked) {
      this.setState('blockstun');
      this.stun = m.blockstun; this.lowGuard = this.inp.down;
      this.pushVx = dir * m.push; this.vx = 0;
      return 'block';
    }
    this.combo++;
    const scale = Math.max(C.MIN_SCALING, 1 - C.COMBO_SCALING * (this.combo - 1));
    this.hp = Math.max(this.noKo ? 1 : 0, this.hp - Math.round(m.damage * scale));
    this.redDelay = 30;
    this.flash = 8;
    this.move = null;
    if (this.hp <= 0) {
      this.setState('ko');
      this.vy = 6; this.vx = dir * 2.5; this.y = Math.max(this.y, 1);
      return 'ko';
    }
    if (this.y > 0 || m.launch) {
      this.setState('airhit');
      this.vy = m.launch ? 7 : 4; this.vx = dir * 1.8; this.y = Math.max(this.y, 1);
    } else if (m.knockdown) {
      this.setState('airhit');
      this.vy = 3; this.vx = dir * 1.5; this.y = 1;
    } else {
      this.setState('hitstun');
      this.stun = m.hitstun; this.pushVx = dir * m.push; this.vx = 0;
    }
    return 'hit';
  }

  updateRedHp() {
    if (this.redDelay > 0) this.redDelay--;
    else if (this.redHp > this.hp) this.redHp = Math.max(this.hp, this.redHp - 6);
  }
}
