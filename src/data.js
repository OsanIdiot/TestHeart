// ============================================================
//  게임 수치 설정 파일
//  이 파일의 숫자만 바꿔도 게임의 손맛이 바뀝니다.
//  시간 단위는 전부 "프레임"입니다. (1프레임 = 1/60초)
// ============================================================

export const CONFIG = {
  STAGE_W: 480,        // 스테이지 가로 길이 (화면과 같음)
  GROUND_Y: 232,       // 화면에서 땅의 높이
  WALL_MARGIN: 16,     // 벽 여백
  START_GAP: 150,      // 라운드 시작 시 두 캐릭터 간격

  MAX_HP: 1000,
  ROUND_TIME: 60,      // 라운드 제한시간(초)
  ROUNDS_TO_WIN: 2,    // 몇 라운드를 이기면 승리

  WALK_FWD: 1.6,       // 앞으로 걷는 속도
  WALK_BACK: 1.2,      // 뒤로 걷는 속도
  JUMP_SQUAT: 4,       // 점프 준비 프레임 (웅크렸다 뛰는 시간)
  JUMP_VY: 9.5,        // 점프 힘
  JUMP_VX: 2.6,        // 앞/뒤 점프 가로 속도
  GRAVITY: 0.5,        // 중력
  LANDING_LAG: 3,      // 착지 후 경직

  DASH_VX: 4.2,        // 대시 속도 (→→)
  DASH_TIME: 16,
  BACKDASH_VX: 3.6,    // 백대시 속도 (←←)
  BACKDASH_TIME: 20,
  BACKDASH_INVULN: 8,  // 백대시 시작 무적

  INPUT_BUFFER: 6,     // 선입력: 몇 프레임 일찍 누른 버튼까지 기억할지
  CANCEL_WINDOW: 8,    // 공격을 맞힌 뒤 다음 기술로 끊어줄 수 있는 여유
  PUSH_FRICTION: 0.78, // 밀려나는 힘이 줄어드는 비율
  THROW_RANGE: 34,     // 이 거리 안에서 강펀치를 누르면 잡기
  HIT_PUSH_SCALE: 0.6, // 맞았을 때는 막았을 때보다 덜 밀려남 (콤보가 이어지도록)

  DOWN_TIME: 40,       // 쓰러져 있는 시간
  GETUP_TIME: 18,      // 일어나는 시간 (이 동안 무적)

  COMBO_SCALING: 0.1,  // 콤보가 길어질수록 대미지 10%씩 감소
  MIN_SCALING: 0.4,    // 최소 대미지 비율

  METER_MAX: 1000,     // 필살기 게이지 (가득 차면 초필살기 사용 가능)
  SUPER_FREEZE: 40,    // 초필살기 발동 연출 시간
};

// 몸통 크기 (맞는 판정 = 허트박스)
export const BODY = {
  w: 26,
  standH: 58,
  crouchH: 38,
  airH: 46,
  pushW: 24,           // 서로 밀어내는 폭
};

// ------------------------------------------------------------
//  커맨드 표기 (숫자패드 방향, 오른쪽을 보고 있을 때 기준)
//   7 8 9      236 = ↓↘→   (아래, 아래앞, 앞)
//   4 5 6      623 = →↓↘   (앞, 아래, 아래앞)
//   1 2 3      214 = ↓↙←   (아래, 아래뒤, 뒤)
// ------------------------------------------------------------
export const MOTIONS = {
  '236236': { seq: [2, 3, 6, 2, 3, 6], window: 28 },
  '623':    { seq: [6, 2, 3], window: 14, endOn: [3] },
  '236':    { seq: [2, 3, 6], window: 12 },
  '214':    { seq: [2, 1, 4], window: 12 },
};

export const CHARACTERS = [
  {
    name: 'MOMO', ko: '모모', ears: 'cat', style: '빠른 근접 격투',
    color: '#ff8fb3', dark: '#e0567f', light: '#ffd6e3',
    // 커맨드 + 강펀치(HP) 또는 강킥(HK) → 필살기
    specials: [
      { motion: '236236', btn: 'HP', move: 'momoSuper', super: true },
      { motion: '623', btn: 'HP', move: 'momoUpper' },
      { motion: '236', btn: 'HP', move: 'momoClaw' },
      { motion: '214', btn: 'HK', move: 'momoRoll' },
    ],
    combos: [
      '앉아 약킥 → 앉아 약펀치 → 서서 강펀치 → ↓↘→+강P 냥냥 발톱',
      '점프 강킥 → 서서 강펀치 → →↓↘+강P 냥 어퍼',
      '앉아 약킥 → 서서 강펀치 → ↓↘→↓↘→+강P 냥냥 난무 (게이지 MAX)',
    ],
  },
  {
    name: 'RURU', ko: '루루', ears: 'bunny', style: '멀리서 견제',
    color: '#7ec8ff', dark: '#3f8fd6', light: '#d6eeff',
    specials: [
      { motion: '236236', btn: 'HP', move: 'ruruSuper', super: true },
      { motion: '623', btn: 'HK', move: 'ruruRise' },
      { motion: '236', btn: 'HP', move: 'ruruCarrot' },
      { motion: '214', btn: 'HK', move: 'ruruHop' },
    ],
    combos: [
      '앉아 약킥 → 앉아 약킥 → 서서 강펀치 → ↓↘→+강P 당근 던지기',
      '점프 강펀치 → 하이킥 → →↓↘+강K 깡총 킥',
      '앉아 약킥 → 서서 강펀치 → ↓↘→↓↘→+강P 대왕 당근 (게이지 MAX)',
    ],
  },
];

// ------------------------------------------------------------
//  기술 표
//  s = 서서, c = 앉아서, j = 점프 중
//  LP 약펀치 / HP 강펀치 / LK 약킥 / HK 강킥
//
//  startup  : 발생 (공격이 나가기까지)
//  active   : 지속 (때리는 판정이 있는 시간)
//  recovery : 후딜 (거둬들이는 시간, 이때 맞으면 반격당함)
//  hitstun  : 맞은 상대가 못 움직이는 시간
//  blockstun: 막은 상대가 못 움직이는 시간
//  guard    : mid=서서/앉아서 둘 다 막힘, low=앉아서만, high=서서만
//  hitbox   : 때리는 네모 (x=몸 중심에서 앞으로, y=발바닥에서 위로)
//  cancel   : 'normal' = 다른 기본기·필살기로 끊기 가능, 'special' = 필살기로만
//  limb     : 그림 종류 (punch 주먹, kick 발, claw 발톱, body 몸통)
// ------------------------------------------------------------
const RAW_MOVES = {
  sLP: { name: '서서 약펀치', limb: 'punch', startup: 4, active: 3, recovery: 6,  damage: 30, hitstun: 13, blockstun: 9,  push: 3, guard: 'mid', hitstop: 6,  hitbox: { x: 8, y: 36, w: 26, h: 10 }, cancel: 'normal' },
  sHP: { name: '서서 강펀치', limb: 'punch', startup: 8, active: 4, recovery: 16, damage: 80, hitstun: 20, blockstun: 15, push: 5, guard: 'mid', hitstop: 10, hitbox: { x: 8, y: 34, w: 34, h: 12 }, shake: 3, cancel: 'special' },
  sLK: { name: '서서 약킥',   limb: 'kick',  startup: 5, active: 3, recovery: 8,  damage: 35, hitstun: 13, blockstun: 9,  push: 3, guard: 'mid', hitstop: 6,  hitbox: { x: 6, y: 12, w: 30, h: 10 }, cancel: 'normal' },
  sHK: { name: '하이킥',      limb: 'kick',  startup: 10, active: 4, recovery: 18, damage: 95, hitstun: 20, blockstun: 15, push: 6, guard: 'mid', hitstop: 11, hitbox: { x: 8, y: 40, w: 38, h: 14 }, shake: 4, cancel: 'special' },

  cLP: { name: '앉아 약펀치', limb: 'punch', startup: 4, active: 2, recovery: 7,  damage: 25, hitstun: 12, blockstun: 8,  push: 3, guard: 'mid', hitstop: 6,  hitbox: { x: 8, y: 22, w: 26, h: 9 },  cancel: 'normal' },
  cHP: { name: '대공 강펀치', limb: 'punch', startup: 6, active: 5, recovery: 18, damage: 75, hitstun: 18, blockstun: 12, push: 3, guard: 'mid', hitstop: 10, hitbox: { x: 2, y: 30, w: 24, h: 42 }, launch: true, shake: 3, cancel: 'special' },
  cLK: { name: '앉아 약킥',   limb: 'kick',  startup: 5, active: 3, recovery: 8,  damage: 25, hitstun: 12, blockstun: 8,  push: 3, guard: 'low', hitstop: 6,  hitbox: { x: 6, y: 0, w: 30, h: 8 },   cancel: 'normal' },
  cHK: { name: '다리 후리기', limb: 'kick',  startup: 9, active: 4, recovery: 22, damage: 70, hitstun: 20, blockstun: 15, push: 4, guard: 'low', hitstop: 10, hitbox: { x: 6, y: 0, w: 44, h: 10 },  knockdown: true, shake: 3, cancel: 'special' },

  jLP: { name: '점프 약펀치', limb: 'punch', startup: 4, active: 10, recovery: 4, damage: 35, hitstun: 15, blockstun: 10, push: 2, guard: 'high', hitstop: 6,  hitbox: { x: 4, y: 18, w: 22, h: 12 } },
  jHP: { name: '점프 강펀치', limb: 'punch', startup: 5, active: 8, recovery: 8,  damage: 75, hitstun: 22, blockstun: 14, push: 3, guard: 'high', hitstop: 10, hitbox: { x: 6, y: 10, w: 28, h: 16 }, shake: 2 },
  jLK: { name: '점프 약킥',   limb: 'kick',  startup: 4, active: 12, recovery: 4, damage: 40, hitstun: 15, blockstun: 10, push: 2, guard: 'high', hitstop: 6,  hitbox: { x: 4, y: 2, w: 26, h: 10 } },
  jHK: { name: '점프 강킥',   limb: 'kick',  startup: 6, active: 8, recovery: 8,  damage: 80, hitstun: 22, blockstun: 14, push: 3, guard: 'high', hitstop: 11, hitbox: { x: 4, y: -4, w: 34, h: 14 }, shake: 2 },

  // 잡기: 아주 가까이서 강펀치 (뒤+강펀치 = 뒤로 던지기). 가드 불가
  throw: { name: '잡기', limb: 'punch', startup: 2, active: 3, recovery: 22, damage: 120, hitstun: 0, blockstun: 0, push: 0, guard: 'throw', hitstop: 14, hitbox: { x: 6, y: 10, w: 26, h: 40 }, throw: true, knockdown: true, shake: 4 },
  throwB: { name: '뒤잡기', limb: 'punch', startup: 2, active: 3, recovery: 22, damage: 120, hitstun: 0, blockstun: 0, push: 0, guard: 'throw', hitstop: 14, hitbox: { x: 6, y: 10, w: 26, h: 40 }, throw: true, backThrow: true, knockdown: true, shake: 4 },

  // ---------------- 모모 (고양이) ----------------
  momoClaw: { name: '냥냥 발톱', limb: 'claw', total: 38, moveX: [[3, 16, 6]],
    hits: [{ start: 9, end: 16, damage: 110, hitstun: 20, blockstun: 12, push: 6, guard: 'mid', hitstop: 12, hitbox: { x: 8, y: 26, w: 26, h: 18 }, knockdown: true, shake: 3 }] },
  momoUpper: { name: '냥 어퍼', limb: 'punch', total: 40, invuln: [0, 9], jump: { frame: 3, vx: 1.8, vy: 9 }, landLag: 14,
    hits: [{ start: 3, end: 11, damage: 130, hitstun: 20, blockstun: 16, push: 3, guard: 'mid', hitstop: 13, hitbox: { x: 4, y: 34, w: 22, h: 36 }, launch: true, shake: 5 }] },
  momoRoll: { name: '고양이 구르기', limb: 'body', total: 36, hurtH: 22, moveX: [[2, 24, 5]],
    hits: [{ start: 6, end: 24, damage: 85, hitstun: 18, blockstun: 12, push: 4, guard: 'low', hitstop: 10, hitbox: { x: 0, y: 0, w: 24, h: 18 }, knockdown: true }] },
  momoSuper: { name: '냥냥 난무', limb: 'claw', total: 62, super: true, invuln: [0, 14], moveX: [[4, 22, 6]],
    hits: [10, 15, 20, 25].map((s) => ({ start: s, end: s + 3, damage: 45, hitstun: 30, blockstun: 8, push: 1, guard: 'mid', hitstop: 5, hitbox: { x: 4, y: 18, w: 32, h: 32 } }))
      .concat([{ start: 32, end: 36, damage: 140, hitstun: 30, blockstun: 14, push: 4, guard: 'mid', hitstop: 20, hitbox: { x: 4, y: 18, w: 34, h: 40 }, launch: true, shake: 8 }]) },

  // ---------------- 루루 (토끼) ----------------
  ruruCarrot: { name: '당근 던지기', limb: 'punch', total: 44, hits: [],
    projectile: { frame: 13, speed: 4.6, w: 18, h: 8, y: 30, life: 120, hits: 1, damage: 80, hitstun: 18, blockstun: 14, push: 4, guard: 'mid', hitstop: 8 } },
  ruruRise: { name: '깡총 킥', limb: 'kick', total: 42, invuln: [0, 8], jump: { frame: 3, vx: 1.6, vy: 9.5 }, landLag: 14,
    hits: [{ start: 3, end: 12, damage: 125, hitstun: 20, blockstun: 16, push: 3, guard: 'mid', hitstop: 13, hitbox: { x: 2, y: 30, w: 26, h: 38 }, launch: true, shake: 5 }] },
  ruruHop: { name: '당근 내려찍기', limb: 'kick', total: 44, jump: { frame: 4, vx: 3.6, vy: 6.5 }, landLag: 8,
    hits: [{ start: 15, end: 44, damage: 90, hitstun: 20, blockstun: 12, push: 4, guard: 'high', hitstop: 11, hitbox: { x: 0, y: -4, w: 30, h: 16 }, shake: 3 }] },
  ruruSuper: { name: '대왕 당근', limb: 'punch', total: 52, super: true, invuln: [0, 16], hits: [],
    projectile: { frame: 16, speed: 4, w: 36, h: 28, y: 14, life: 130, hits: 5, interval: 6, damage: 55, hitstun: 26, blockstun: 10, push: 1, guard: 'mid', hitstop: 6, lastLaunch: true, big: true } },
};

// 단순 기술(startup/active/recovery)을 공통 형식(hits 목록)으로 변환
function normalize(m) {
  if (m.hits) return m;
  const { startup, active, recovery, name, limb, cancel, ...hit } = m;
  return { name, limb, cancel, startup, total: startup + active + recovery,
    hits: [{ start: startup, end: startup + active, ...hit }] };
}

export const MOVES = Object.fromEntries(Object.entries(RAW_MOVES).map(([k, m]) => [k, normalize(m)]));
