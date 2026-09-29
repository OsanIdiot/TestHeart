// 키보드 + 게임패드 입력
const BUTTONS = ['LP', 'HP', 'LK', 'HK', 'SP'];
const DIRS = ['up', 'down', 'left', 'right'];

export const KEYMAPS = [
  { up: ['KeyW'], down: ['KeyS'], left: ['KeyA'], right: ['KeyD'],
    LP: ['KeyF'], HP: ['KeyG'], LK: ['KeyV'], HK: ['KeyB'], SP: ['KeyR'] },
  { up: ['ArrowUp'], down: ['ArrowDown'], left: ['ArrowLeft'], right: ['ArrowRight'],
    LP: ['Numpad4', 'KeyK'], HP: ['Numpad5', 'KeyL'], LK: ['Numpad1', 'Comma'], HK: ['Numpad2', 'Period'], SP: ['Numpad6', 'Semicolon'] },
];

// 게임패드: X=약펀치, Y=강펀치, A=약킥, B=강킥, RB=필살 (Xbox 배치 기준)
const PAD_BUTTONS = { LP: 2, HP: 3, LK: 0, HK: 1, SP: 5 };
const PAD_DIRS = { up: 12, down: 13, left: 14, right: 15 };

// 화면 터치 조작 (1P에 합쳐짐)
const touch = { up: false, down: false, left: false, right: false, LP: false, HP: false, LK: false, HK: false, SP: false };
const touchTaps = new Set();
export function setTouch(key, on) {
  if (on && !touch[key]) touchTaps.add(key);
  touch[key] = on;
}
// 화면 탭 등으로 메뉴 키를 대신 누를 때
export function virtualTap(code) { taps.add(code); }

const PREVENT = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Tab']);
const keys = new Set();
const taps = new Set();
const prev = [{}, {}];
let prevPadStart = [false, false];

window.addEventListener('keydown', (e) => {
  if (PREVENT.has(e.code)) e.preventDefault();
  if (e.repeat) return;
  keys.add(e.code);
  taps.add(e.code);
});
window.addEventListener('keyup', (e) => keys.delete(e.code));
window.addEventListener('blur', () => keys.clear());

function padHeld(pad, k) {
  if (!pad) return false;
  if (k in PAD_BUTTONS) return !!pad.buttons[PAD_BUTTONS[k]]?.pressed;
  const ax = pad.axes[0] || 0, ay = pad.axes[1] || 0;
  const dpad = !!pad.buttons[PAD_DIRS[k]]?.pressed;
  if (k === 'left') return dpad || ax < -0.5;
  if (k === 'right') return dpad || ax > 0.5;
  if (k === 'up') return dpad || ay < -0.5;
  return dpad || ay > 0.5;
}

// 한 프레임 분량의 입력을 읽음. taps = 이번 프레임에 새로 눌린 키 (메뉴용)
export function readFrame() {
  const pads = navigator.getGamepads ? [...navigator.getGamepads()].filter(Boolean) : [];
  const players = [0, 1].map((i) => {
    const map = KEYMAPS[i], pad = pads[i];
    const held = {};
    for (const k of [...DIRS, ...BUTTONS]) {
      held[k] = map[k].some((c) => keys.has(c)) || padHeld(pad, k) || (i === 0 && touch[k]);
    }
    const pressed = {};
    for (const b of BUTTONS) {
      pressed[b] = (held[b] && !prev[i][b]) || map[b].some((c) => taps.has(c)) || (i === 0 && touchTaps.has(b));
    }
    prev[i] = held;

    const start = !!pad?.buttons[9]?.pressed;
    if (start && !prevPadStart[i]) taps.add(i === 0 ? 'Enter' : 'Escape');
    prevPadStart[i] = start;

    // 좌우 동시 입력은 중립 처리
    const both = held.left && held.right;
    return {
      left: held.left && !both, right: held.right && !both,
      up: held.up, down: held.down,
      held: { LP: held.LP, HP: held.HP, LK: held.LK, HK: held.HK, SP: held.SP },
      pressed,
    };
  });
  const frameTaps = new Set(taps);
  taps.clear();
  touchTaps.clear();
  return { players, taps: frameTaps };
}
