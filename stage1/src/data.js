// ============================================================
//  게임 수치 설정 파일 (1단계: 네모끼리 싸우기)
//  이 파일의 숫자만 바꿔도 게임의 손맛이 바뀝니다.
//  시간 단위는 전부 "프레임"입니다. (1프레임 = 1/60초)
//  거리 단위는 내부 화면 픽셀입니다. (내부 화면 480×270)
// ============================================================

export const CONFIG = {
  SCREEN_W: 480,        // 내부 화면 가로
  SCREEN_H: 270,        // 내부 화면 세로
  SCALE: 2,             // 표시 배율 (480×270 → 960×540)
  FPS: 60,              // 초당 프레임 (고정)

  GROUND_Y: 232,        // 화면에서 땅의 높이
  WALL_MARGIN: 16,      // 벽 여백
  START_GAP: 150,       // 라운드 시작 시 두 캐릭터 간격

  MAX_HP: 1000,         // 체력
  ROUND_TIME: 60,       // 라운드 제한시간(초)
  ROUNDS_TO_WIN: 2,     // 몇 라운드를 이기면 승리 (3판 2선승)
  ROUND_INTRO: 90,      // "라운드 1 … 파이트!" 보여 주는 시간
  ROUND_END_WAIT: 120,  // KO 후 다음 라운드까지 기다리는 시간
  MATCH_END_WAIT: 180,  // 승리 표시 후 버튼을 받기 시작할 때까지

  WALK_FWD: 1.6,        // 앞으로 걷는 속도
  WALK_BACK: 1.2,       // 뒤로 걷는 속도
  JUMP_SQUAT: 4,        // 점프 준비 프레임 (웅크렸다 뛰는 시간)
  JUMP_VY: 9.5,         // 점프 힘
  JUMP_VX: 2.6,         // 앞/뒤 점프 가로 속도
  GRAVITY: 0.5,         // 중력
  LANDING_LAG: 3,       // 착지 후 경직

  INPUT_BUFFER: 6,      // 선입력: 몇 프레임 일찍 누른 버튼까지 기억할지
  CANCEL_WINDOW: 10,    // 약공격을 맞힌(막힌) 뒤 강공격으로 끊어줄 수 있는 여유
  PUSH_FRICTION: 0.8,   // 밀려나는 힘이 줄어드는 비율
  HIT_PUSH_SCALE: 0.6,  // 맞았을 때는 막았을 때보다 덜 밀려남 (콤보가 이어지도록)
  AIR_HIT_VY: 4,        // 공중에서 맞으면 살짝 떠오르는 힘
  AIR_HIT_VX: 1.8,      // 공중에서 맞으면 뒤로 날아가는 속도
};

// 몸통 크기 (맞는 판정 = 허트박스)
export const BODY = {
  w: 26,
  standH: 58,
  crouchH: 38,
  airH: 46,
  pushW: 24,            // 서로 밀어내는 폭
};

// 캐릭터 (1단계는 색깔 네모)
export const CHARACTERS = [
  { name: '모모', color: '#ff8fb3', dark: '#e0567f' },  // 분홍
  { name: '루루', color: '#7ec8ff', dark: '#3f8fd6' },  // 하늘색
];

// ------------------------------------------------------------
//  기본기
//  startup  = 누르고 판정이 나오기까지
//  active   = 판정이 나와 있는 시간
//  recovery = 판정이 사라진 뒤 다시 움직일 수 있을 때까지
//  hit/block stun = 맞은/막은 상대가 못 움직이는 시간
//  box      = 공격 판정 (x: 몸 앞쪽 기준 거리, y: 발바닥 기준 높이)
//  guard    = 'mid' 서서도 앉아서도 막힘 / 'low' 앉아서만 / 'high' 서서만
//  heavy    = 강공격 (약공격 → 강공격 캔슬 대상)
// ------------------------------------------------------------
const mv = (o) => ({ hitstop: 8, push: 4, ...o });

export const MOVES = {
  // 서서
  stand_LP: mv({ name: '서서 약P', startup: 4, active: 3, recovery: 7, damage: 40, hitstun: 14, blockstun: 10, guard: 'mid', box: { x: 0, y: 36, w: 26, h: 10 }, hitstop: 6, push: 3 }),
  stand_HP: mv({ name: '서서 강P', startup: 8, active: 4, recovery: 16, damage: 90, hitstun: 20, blockstun: 15, guard: 'mid', box: { x: 0, y: 34, w: 38, h: 14 }, heavy: true, hitstop: 11, push: 6 }),
  stand_LK: mv({ name: '서서 약K', startup: 5, active: 3, recovery: 8, damage: 45, hitstun: 14, blockstun: 10, guard: 'mid', box: { x: 0, y: 18, w: 32, h: 10 }, hitstop: 6, push: 3 }),
  stand_HK: mv({ name: '서서 강K', startup: 10, active: 4, recovery: 18, damage: 100, hitstun: 21, blockstun: 16, guard: 'mid', box: { x: 0, y: 30, w: 44, h: 14 }, heavy: true, hitstop: 12, push: 7 }),
  // 앉아서 (발차기는 하단: 서서 막을 수 없음)
  crouch_LP: mv({ name: '앉아 약P', startup: 4, active: 3, recovery: 7, damage: 35, hitstun: 13, blockstun: 9, guard: 'mid', box: { x: 0, y: 22, w: 26, h: 10 }, hitstop: 6, push: 3 }),
  crouch_HP: mv({ name: '앉아 강P', startup: 7, active: 5, recovery: 17, damage: 85, hitstun: 20, blockstun: 15, guard: 'mid', box: { x: 0, y: 30, w: 26, h: 26 }, heavy: true, hitstop: 11, push: 5 }),
  crouch_LK: mv({ name: '앉아 약K', startup: 5, active: 3, recovery: 8, damage: 35, hitstun: 13, blockstun: 9, guard: 'low', box: { x: 0, y: 2, w: 34, h: 8 }, hitstop: 6, push: 3 }),
  crouch_HK: mv({ name: '앉아 강K', startup: 9, active: 4, recovery: 20, damage: 90, hitstun: 20, blockstun: 15, guard: 'low', box: { x: 0, y: 2, w: 46, h: 9 }, heavy: true, hitstop: 11, push: 6 }),
  // 점프 (중단 판정: 앉아서 막을 수 없음, 착지하면 끝)
  air_LP: mv({ name: '점프 약P', startup: 4, active: 8, recovery: 0, damage: 40, hitstun: 14, blockstun: 10, guard: 'high', box: { x: 0, y: 20, w: 24, h: 12 }, hitstop: 6, push: 3 }),
  air_HP: mv({ name: '점프 강P', startup: 7, active: 6, recovery: 0, damage: 80, hitstun: 18, blockstun: 14, guard: 'high', box: { x: 0, y: 10, w: 30, h: 18 }, heavy: true, hitstop: 10, push: 5 }),
  air_LK: mv({ name: '점프 약K', startup: 5, active: 8, recovery: 0, damage: 45, hitstun: 14, blockstun: 10, guard: 'high', box: { x: -4, y: 0, w: 28, h: 12 }, hitstop: 6, push: 3 }),
  air_HK: mv({ name: '점프 강K', startup: 8, active: 6, recovery: 0, damage: 90, hitstun: 18, blockstun: 14, guard: 'high', box: { x: -4, y: 2, w: 36, h: 14 }, heavy: true, hitstop: 11, push: 5 }),
};

// 키보드 배치 (1P / 2P)
export const KEYS = [
  { up: ['KeyW'], down: ['KeyS'], left: ['KeyA'], right: ['KeyD'],
    LP: ['KeyF'], HP: ['KeyG'], LK: ['KeyV'], HK: ['KeyB'] },
  { up: ['ArrowUp'], down: ['ArrowDown'], left: ['ArrowLeft'], right: ['ArrowRight'],
    LP: ['Numpad4', 'KeyK'], HP: ['Numpad5', 'KeyL'], LK: ['Numpad1', 'Comma'], HK: ['Numpad2', 'Period'] },
];
