import { Game } from './game.js';
import { Renderer } from './render.js';
import { readFrame, virtualTap } from './input.js';
import { isTouch, setupTouch } from './touch.js';
import { renderMoveList } from './movelist.js';

const STEP = 1000 / 60; // 격투게임은 초당 60프레임 고정
const game = new Game();
const canvas = document.getElementById('game');
const renderer = new Renderer(canvas);
window.game = game; // 디버그용

game.touch = isTouch;
if (isTouch) game.menuIndex = 1; // 폰에서는 CPU 대전이 기본
setupTouch();

// 화면 탭: 메뉴 고르기 / 다시 하기 / 일시정지 풀기 / 허수아비 바꾸기
canvas.addEventListener('pointerdown', (e) => {
  const r = canvas.getBoundingClientRect();
  const y = ((e.clientY - r.top) / r.height) * 270;
  if (game.mode === 'title') {
    const i = Math.floor((y - 126) / 26);
    if (i >= 0 && i < 3) { game.menuIndex = i; virtualTap('Enter'); }
  } else if (game.paused) virtualTap('Escape');
  else if (game.phase === 'matchEnd') virtualTap('Enter');
  else if (game.mode === 'training') game.cycleDummy();
});

renderMoveList(document.getElementById('moves-desk'), false);
renderMoveList(document.getElementById('moves-body'), true);
const movesPanel = document.getElementById('moves');

const tools = {
  pause: () => { if (game.mode !== 'title' && game.phase !== 'matchEnd') virtualTap('Escape'); },
  boxes: () => virtualTap('KeyH'),
  home: () => { game.paused = false; game.mode = 'title'; },
  moves: () => {
    movesPanel.hidden = !movesPanel.hidden;
    if (!movesPanel.hidden && game.mode !== 'title' && game.phase !== 'matchEnd') game.paused = true;
  },
};
for (const el of document.querySelectorAll('[data-tool]')) {
  el.addEventListener('click', () => tools[el.dataset.tool]());
}

let acc = 0;
let last = performance.now();

function loop(now) {
  acc += Math.min(now - last, 250);
  last = now;
  let steps = 0;
  while (acc >= STEP && steps < 5) {
    game.step(readFrame());
    acc -= STEP;
    steps++;
  }
  if (steps === 5) acc = 0;
  renderer.draw(game);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
