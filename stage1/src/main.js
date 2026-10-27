// 시작점: 60프레임 고정 진행 + 그리기
import { CONFIG as C } from './data.js';
import { Game } from './game.js';
import { render } from './render.js';
import { attachKeyboard, readInputs } from './input.js';

const canvas = document.getElementById('screen');
canvas.width = C.SCREEN_W; canvas.height = C.SCREEN_H;
canvas.style.width = `${C.SCREEN_W * C.SCALE}px`;
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

const game = new Game();
const opts = { showBoxes: false };
attachKeyboard();
window.addEventListener('keydown', (e) => { if (e.code === 'KeyH') opts.showBoxes = !opts.showBoxes; });
window.__game = game;               // 자동 테스트에서 상태 확인용

const STEP = 1000 / C.FPS;
let last = performance.now(), acc = 0;
function loop(now) {
  acc += Math.min(now - last, 250); last = now;
  while (acc >= STEP) { game.step(readInputs()); acc -= STEP; }
  render(ctx, game, opts);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
