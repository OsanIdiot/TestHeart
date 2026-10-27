// 캐릭터 한 명의 움직임 (화면과 상관없는 순수 규칙)
// 좌표: x = 몸 가운데, y = 땅에서 떨어진 높이(위가 +)
import { CONFIG as C, BODY, MOVES } from './data.js';

export const BUTTONS = ['LP', 'HP', 'LK', 'HK'];

export class Fighter {
  constructor(index) {
    this.index = index;
    this.reset(0, 1);
  }

  reset(x, facing) {
    this.x = x; this.y = 0; this.vx = 0; this.vy = 0;
    this.facing = facing;          // 1 = 오른쪽을 봄, -1 = 왼쪽
    this.hp = C.MAX_HP;
    this.state = 'idle';           // idle walk crouch jumpsquat air attack hitstun blockstun land ko
    this.timer = 0;                // 현재 상태에서 지난(또는 남은) 프레임
    this.move = null; this.moveKey = null; this.moveFrame = 0;
    this.hasHit = false; this.hitFrame = -999;
    this.jumpDir = 0;
    this.push = 0;                 // 맞거나 막았을 때 밀려나는 힘
    this.airHit = false;           // 공중에서 맞아 떨어지는 중
    this.blocking = false;         // 이번 프레임 가드 자세인지 (그림용)
    this.lastBlockHeight = null;
    this.buffer = {};              // 버튼별 마지막으로 누른 프레임
    this.prevHeld = {};
    this.frame = 0;
  }

  get grounded() { return this.y <= 0 && this.state !== 'air' && !this.airHit; }
  get crouching() { return this.state === 'crouch' || (this.state === 'attack' && this.moveKey.startsWith('crouch_')) || (this.state === 'blockstun' && this.lastBlockHeight === 'crouch'); }

  // 맞는 판정 (월드 좌표, y는 위가 +)
  hurtbox() {
    const h = this.state === 'air' || this.airHit ? BODY.airH : this.crouching ? BODY.crouchH : BODY.standH;
    return { x: this.x - BODY.w / 2, y: this.y, w: BODY.w, h };
  }

  // 공격 판정 (판정이 나와 있을 때만)
  hitbox() {
    if (this.state !== 'attack' || this.hasHit) return null;
    const m = this.move, f = this.moveFrame;
    if (f < m.startup || f >= m.startup + m.active) return null;
    const front = this.x + this.facing * BODY.w / 2;
    const x0 = front + this.facing * m.box.x;
    const x = this.facing > 0 ? x0 : x0 - m.box.w;
    return { x, y: this.y + m.box.y, w: m.box.w, h: m.box.h };
  }

  // 입력에서 "뒤"는 상대 반대쪽
  dirs(input) {
    const fwd = this.facing > 0 ? input.right : input.left;
    const back = this.facing > 0 ? input.left : input.right;
    return { fwd: fwd && !back, back: back && !fwd, up: input.up, down: input.down };
  }

  readButtons(input) {
    for (const b of BUTTONS) {
      if (input[b] && !this.prevHeld[b]) this.buffer[b] = this.frame;
      this.prevHeld[b] = !!input[b];
    }
  }

  // 선입력 기억 안에서 눌린 버튼 하나 (강공격 우선)
  takeButton(only) {
    const order = ['HK', 'HP', 'LK', 'LP'].filter((b) => !only || only.includes(b));
    for (const b of order) {
      const t = this.buffer[b];
      if (t !== undefined && this.frame - t <= C.INPUT_BUFFER) { delete this.buffer[b]; return b; }
    }
    return null;
  }

  canAct() { return ['idle', 'walk', 'crouch'].includes(this.state); }

  startAttack(prefix, btn) {
    this.moveKey = `${prefix}_${btn}`;
    this.move = MOVES[this.moveKey];
    this.moveFrame = 0; this.hasHit = false;
    this.state = 'attack';
    if (prefix !== 'air') this.vx = 0;
  }

  // 지금 가드 자세인가? (뒤를 누르고, 움직일 수 있거나 이미 막는 중)
  guardStance(input) {
    if (!this.grounded) return null;
    if (!(this.canAct() || this.state === 'blockstun')) return null;
    if (!this.dirs(input).back) return null;
    return input.down ? 'crouch' : 'stand';
  }

  update(input, controllable) {
    this.frame++;
    if (!controllable) input = {};
    this.readButtons(input);
    const d = this.dirs(input);
    this.blocking = !!this.guardStance(input) && this.state !== 'attack';

    switch (this.state) {
      case 'idle': case 'walk': case 'crouch': {
        const btn = this.takeButton();
        if (btn) { this.startAttack(d.down ? 'crouch' : 'stand', btn); break; }
        if (d.up) { this.state = 'jumpsquat'; this.timer = 0; this.jumpDir = d.fwd ? this.facing : d.back ? -this.facing : 0; this.vx = 0; break; }
        if (d.down) { this.state = 'crouch'; this.vx = 0; break; }
        if (d.fwd) { this.state = 'walk'; this.vx = this.facing * C.WALK_FWD; }
        else if (d.back) { this.state = 'walk'; this.vx = -this.facing * C.WALK_BACK; }
        else { this.state = 'idle'; this.vx = 0; }
        break;
      }
      case 'jumpsquat':
        if (++this.timer >= C.JUMP_SQUAT) {
          this.state = 'air'; this.vy = C.JUMP_VY; this.vx = this.jumpDir * C.JUMP_VX;
        }
        break;
      case 'air': {
        const btn = this.takeButton();
        if (btn) this.startAttack('air', btn);
        break;
      }
      case 'attack': {
        this.moveFrame++;
        const m = this.move;
        // 약공격을 맞힌(막힌) 뒤 강공격으로 캔슬
        if (!m.heavy && this.hasHit && this.frame - this.hitFrame <= C.CANCEL_WINDOW && this.grounded) {
          const btn = this.takeButton(['HP', 'HK']);
          if (btn) { this.startAttack(this.moveKey.startsWith('crouch_') ? 'crouch' : 'stand', btn); break; }
        }
        if (this.moveKey.startsWith('air_')) {
          if (this.moveFrame >= m.startup + m.active) { this.hasHit = true; } // 판정 끝, 착지까지 그대로
        } else if (this.moveFrame >= m.startup + m.active + m.recovery) {
          this.state = d.down ? 'crouch' : 'idle';
        }
        break;
      }
      case 'hitstun': case 'blockstun':
        if (this.airHit) break;                 // 공중에서 맞으면 착지할 때까지
        if (--this.timer <= 0) this.state = this.lastBlockHeight === 'crouch' && d.down ? 'crouch' : 'idle';
        break;
      case 'land':
        if (--this.timer <= 0) this.state = 'idle';
        break;
      case 'ko':
        break;
    }

    // 물리
    const inAir = this.state === 'air' || this.airHit || (this.state === 'ko' && this.y > 0) || (this.state === 'attack' && this.moveKey.startsWith('air_'));
    if (inAir) {
      this.vy -= C.GRAVITY;
      this.y += this.vy;
      this.x += this.vx;
      if (this.y <= 0) this.landing();
    } else {
      this.x += this.vx;
    }
    this.x += this.push;
    this.push *= C.PUSH_FRICTION;
    if (Math.abs(this.push) < 0.05) this.push = 0;
  }

  landing() {
    this.y = 0; this.vy = 0; this.vx = 0;
    if (this.state === 'ko') return;
    if (this.airHit) { this.airHit = false; this.state = 'land'; this.timer = 10; return; }
    this.state = 'land'; this.timer = C.LANDING_LAG;
  }

  // 맞았을 때
  takeHit(move, attackerFacing) {
    this.hp = Math.max(0, this.hp - move.damage);
    this.move = null; this.moveKey = null;
    this.lastBlockHeight = null;
    const airborne = this.y > 0;
    if (this.hp <= 0) {
      this.state = 'ko'; this.airHit = false;
      this.vy = 5; this.vx = attackerFacing * 2.4; this.y = Math.max(this.y, 0.01);
      return;
    }
    if (airborne) {
      this.state = 'hitstun'; this.airHit = true;
      this.vy = C.AIR_HIT_VY; this.vx = attackerFacing * C.AIR_HIT_VX;
    } else {
      this.state = 'hitstun'; this.timer = move.hitstun; this.vx = 0;
      this.push = attackerFacing * move.push * C.HIT_PUSH_SCALE;
    }
  }

  // 막았을 때
  takeBlock(move, attackerFacing, height) {
    this.state = 'blockstun'; this.timer = move.blockstun; this.vx = 0;
    this.lastBlockHeight = height;
    this.push = attackerFacing * move.push;
  }
}
