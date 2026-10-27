// 경기 진행: 두 캐릭터, 타격 판정, 라운드, 승패 (화면과 상관없는 순수 규칙)
import { CONFIG as C, BODY } from './data.js';
import { Fighter } from './fighter.js';

const overlap = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

export class Game {
  constructor() {
    this.fighters = [new Fighter(0), new Fighter(1)];
    this.wins = [0, 0];
    this.round = 0;
    this.events = [];              // 소리·연출용 (이번 프레임에 일어난 일)
    this.startRound();
  }

  startRound() {
    this.round++;
    const mid = C.SCREEN_W / 2;
    this.fighters[0].reset(mid - C.START_GAP / 2, 1);
    this.fighters[1].reset(mid + C.START_GAP / 2, -1);
    this.phase = 'intro';          // intro → fight → roundEnd → (다음 라운드 또는 matchEnd)
    this.phaseTimer = C.ROUND_INTRO;
    this.timeLeft = C.ROUND_TIME * C.FPS;
    this.hitstop = 0;
    this.roundWinner = null;       // 0, 1, 'draw'
    this.matchWinner = null;
  }

  newMatch() {
    this.wins = [0, 0]; this.round = 0;
    this.startRound();
  }

  get timeSeconds() { return Math.ceil(this.timeLeft / C.FPS); }

  // inputs: [1P 입력, 2P 입력] 각각 { left, right, up, down, LP, HP, LK, HK }
  step(inputs) {
    this.events = [];
    if (this.phase === 'matchEnd') {
      if (--this.phaseTimer <= 0 && inputs.some((i) => i && (i.LP || i.HP || i.LK || i.HK))) this.newMatch();
      return;
    }
    if (this.hitstop > 0) {                             // 히트스톱: 맞는 순간 잠깐 멈춤
      this.hitstop--;
      // 멈춘 동안 누른 버튼도 기억 (안 그러면 캔슬 입력이 사라짐)
      if (this.phase === 'fight') this.fighters.forEach((f, i) => f.readButtons(inputs[i] || {}));
      return;
    }

    const fight = this.phase === 'fight';
    const [a, b] = this.fighters;
    this.fighters.forEach((f, i) => {
      f.guardInput = inputs[i] || {};
      f.update(fight ? inputs[i] || {} : {}, fight);
    });

    this.faceEachOther();
    this.separate();
    this.checkHits(a, b);

    if (this.phase === 'intro') {
      if (--this.phaseTimer <= 0) { this.phase = 'fight'; this.events.push('fight'); }
    } else if (this.phase === 'fight') {
      if (--this.timeLeft <= 0) { this.timeLeft = 0; this.endRound('time'); }
    } else if (this.phase === 'roundEnd') {
      if (--this.phaseTimer <= 0) {
        if (this.wins.some((w) => w >= C.ROUNDS_TO_WIN)) {
          this.phase = 'matchEnd'; this.phaseTimer = C.MATCH_END_WAIT;
          const [w0, w1] = this.wins;
          this.matchWinner = w0 === w1 ? 'draw' : w0 > w1 ? 0 : 1;
        } else this.startRound();
      }
    }
  }

  faceEachOther() {
    const [a, b] = this.fighters;
    for (const [f, o] of [[a, b], [b, a]]) {
      if (f.canAct() && f.grounded && o.x !== f.x) f.facing = o.x > f.x ? 1 : -1;
    }
  }

  // 몸끼리 겹치지 않게 밀어내고, 벽 안에 가둔다
  separate() {
    const [a, b] = this.fighters;
    const lo = C.WALL_MARGIN, hi = C.SCREEN_W - C.WALL_MARGIN;
    const ha = a.hurtbox(), hb = b.hurtbox();
    const vertical = ha.y < hb.y + hb.h && hb.y < ha.y + ha.h;
    const gap = Math.abs(a.x - b.x);
    if (vertical && gap < BODY.pushW) {
      const dir = a.x < b.x ? -1 : a.x > b.x ? 1 : -a.facing;
      const fix = (BODY.pushW - gap) / 2;
      a.x += dir * fix; b.x -= dir * fix;
    }
    for (const f of this.fighters) f.x = Math.min(hi - BODY.w / 2, Math.max(lo + BODY.w / 2, f.x));
    // 벽에 붙은 쪽은 못 밀리니 반대쪽이 마저 밀려난다
    if (vertical && Math.abs(a.x - b.x) < BODY.pushW - 0.01) {
      const [l, r] = a.x <= b.x ? [a, b] : [b, a];
      if (l.x <= lo + BODY.w / 2 + 0.01) r.x = l.x + BODY.pushW; else l.x = r.x - BODY.pushW;
    }
  }

  checkHits(a, b) {
    // 두 사람 판정을 먼저 모은 뒤 처리 (동시에 맞히면 서로 맞음)
    const results = [[a, b], [b, a]].map(([atk, def]) => {
      const box = atk.hitbox();
      return box && def.state !== 'ko' && overlap(box, def.hurtbox()) ? [atk, def] : null;
    }).filter(Boolean);
    for (const [atk, def] of results) {
      const m = atk.move;
      atk.hasHit = true; atk.hitFrame = atk.frame;
      const stance = def.guardStance(def.guardInput || {});
      const blocked = stance && (m.guard === 'mid' || (m.guard === 'low' && stance === 'crouch') || (m.guard === 'high' && stance === 'stand'));
      if (blocked) {
        def.takeBlock(m, atk.facing, stance);
        this.events.push({ type: 'block', who: def.index });
        this.hitstop = Math.max(this.hitstop, Math.round(m.hitstop * 0.6));
      } else {
        def.takeHit(m, atk.facing);
        this.events.push({ type: 'hit', who: def.index, heavy: !!m.heavy });
        this.hitstop = Math.max(this.hitstop, m.hitstop);
      }
    }
    if (this.phase === 'fight' && this.fighters.some((f) => f.hp <= 0)) this.endRound('ko');
  }

  endRound(reason) {
    const [a, b] = this.fighters;
    let winner;
    if (a.hp <= 0 && b.hp <= 0) winner = 'draw';
    else if (b.hp <= 0) winner = 0;
    else if (a.hp <= 0) winner = 1;
    else winner = a.hp === b.hp ? 'draw' : a.hp > b.hp ? 0 : 1;
    // 무승부면 양쪽 모두 1승 (끝없이 반복되지 않도록)
    if (winner === 'draw') { this.wins[0]++; this.wins[1]++; } else this.wins[winner]++;
    this.roundWinner = winner;
    this.endReason = reason;
    this.phase = 'roundEnd'; this.phaseTimer = C.ROUND_END_WAIT;
    this.events.push({ type: reason });
  }
}
