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

  INPUT_BUFFER: 6,     // 선입력: 몇 프레임 일찍 누른 버튼까지 기억할지
  CANCEL_WINDOW: 6,    // 약공격을 맞힌 뒤 다음 공격으로 끊어줄 수 있는 여유
  PUSH_FRICTION: 0.82, // 밀려나는 힘이 줄어드는 비율

  DOWN_TIME: 40,       // 쓰러져 있는 시간
  GETUP_TIME: 18,      // 일어나는 시간 (이 동안 무적)

  COMBO_SCALING: 0.1,  // 콤보가 길어질수록 대미지 10%씩 감소
  MIN_SCALING: 0.4,    // 최소 대미지 비율
};

// 몸통 크기 (맞는 판정 = 허트박스)
export const BODY = {
  w: 26,
  standH: 58,
  crouchH: 38,
  airH: 46,
  pushW: 24,           // 서로 밀어내는 폭
};

export const CHARACTERS = [
  { name: 'MOMO', ko: '모모', ears: 'cat',   color: '#ff8fb3', dark: '#e0567f', light: '#ffd6e3' },
  { name: 'RURU', ko: '루루', ears: 'bunny', color: '#7ec8ff', dark: '#3f8fd6', light: '#d6eeff' },
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
//  cancel   : 맞혔을 때 이어서 쓸 수 있는 버튼
// ------------------------------------------------------------
const LIGHT_CANCEL = ['LP', 'LK', 'HP', 'HK'];

export const MOVES = {
  sLP: { name: '서서 약펀치', startup: 4, active: 3, recovery: 6,  damage: 30, hitstun: 13, blockstun: 9,  push: 3,   guard: 'mid', hitstop: 6,  hitbox: { x: 8, y: 36, w: 24, h: 10 }, cancel: LIGHT_CANCEL },
  sHP: { name: '서서 강펀치', startup: 8, active: 4, recovery: 16, damage: 80, hitstun: 20, blockstun: 15, push: 5,   guard: 'mid', hitstop: 10, hitbox: { x: 8, y: 32, w: 34, h: 14 }, shake: 3 },
  sLK: { name: '서서 약킥',   startup: 5, active: 3, recovery: 8,  damage: 35, hitstun: 13, blockstun: 9,  push: 3,   guard: 'mid', hitstop: 6,  hitbox: { x: 6, y: 16, w: 30, h: 10 }, cancel: LIGHT_CANCEL },
  sHK: { name: '서서 강킥',   startup: 11, active: 4, recovery: 18, damage: 90, hitstun: 20, blockstun: 15, push: 6,  guard: 'mid', hitstop: 11, hitbox: { x: 6, y: 26, w: 42, h: 14 }, shake: 4 },

  cLP: { name: '앉아 약펀치', startup: 4, active: 2, recovery: 7,  damage: 25, hitstun: 12, blockstun: 8,  push: 3,   guard: 'mid', hitstop: 6,  hitbox: { x: 8, y: 22, w: 22, h: 9 },  cancel: LIGHT_CANCEL },
  cHP: { name: '대공 강펀치', startup: 6, active: 5, recovery: 18, damage: 75, hitstun: 18, blockstun: 12, push: 3,   guard: 'mid', hitstop: 10, hitbox: { x: 2, y: 30, w: 24, h: 42 }, launch: true, shake: 3 },
  cLK: { name: '앉아 약킥',   startup: 5, active: 3, recovery: 8,  damage: 25, hitstun: 12, blockstun: 8,  push: 3,   guard: 'low', hitstop: 6,  hitbox: { x: 6, y: 0, w: 30, h: 8 },   cancel: LIGHT_CANCEL },
  cHK: { name: '다리 후리기', startup: 9, active: 4, recovery: 22, damage: 70, hitstun: 20, blockstun: 15, push: 4,   guard: 'low', hitstop: 10, hitbox: { x: 6, y: 0, w: 44, h: 10 },  knockdown: true, shake: 3 },

  jLP: { name: '점프 약펀치', startup: 4, active: 10, recovery: 4, damage: 35, hitstun: 12, blockstun: 10, push: 2,  guard: 'high', hitstop: 6,  hitbox: { x: 4, y: 16, w: 22, h: 12 } },
  jHP: { name: '점프 강펀치', startup: 7, active: 6, recovery: 8,  damage: 75, hitstun: 18, blockstun: 14, push: 3,  guard: 'high', hitstop: 10, hitbox: { x: 6, y: 8, w: 28, h: 16 }, shake: 2 },
  jLK: { name: '점프 약킥',   startup: 4, active: 12, recovery: 4, damage: 40, hitstun: 12, blockstun: 10, push: 2,  guard: 'high', hitstop: 6,  hitbox: { x: 4, y: 4, w: 26, h: 10 } },
  jHK: { name: '점프 강킥',   startup: 8, active: 6, recovery: 8,  damage: 80, hitstun: 18, blockstun: 14, push: 3,  guard: 'high', hitstop: 11, hitbox: { x: 4, y: -2, w: 34, h: 14 }, shake: 2 },
};
