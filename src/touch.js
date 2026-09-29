// 스마트폰용 화면 터치 조작: 왼쪽 조이스틱 + 오른쪽 버튼 4개
import { setTouch } from './input.js';

export const isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;

function capture(el, e) { try { el.setPointerCapture(e.pointerId); } catch { /* 무시 */ } }

// 8방향을 똑같은 크기(45도씩)로 나눔 → 대각선(↘ 등)이 잘 들어감
const SECTORS = [
  ['right'], ['right', 'down'], ['down'], ['left', 'down'],
  ['left'], ['left', 'up'], ['up'], ['right', 'up'],
];

export function setupTouch() {
  if (!isTouch) return;
  document.documentElement.classList.add('touch');

  const stick = document.getElementById('stick');
  const knob = document.getElementById('knob');
  let stickId = null;

  const moveStick = (e) => {
    const r = stick.getBoundingClientRect();
    const radius = r.width / 2;
    let dx = e.clientX - (r.left + radius), dy = e.clientY - (r.top + radius);
    const len = Math.hypot(dx, dy);
    let dirs = [];
    if (len > radius * 0.22) {
      const sector = ((Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) % 8) + 8) % 8;
      dirs = SECTORS[sector];
    }
    for (const d of ['left', 'right', 'up', 'down']) setTouch(d, dirs.includes(d));
    const max = radius * 0.55;
    if (len > max) { dx *= max / len; dy *= max / len; }
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
  };
  const releaseStick = () => {
    stickId = null;
    for (const d of ['left', 'right', 'up', 'down']) setTouch(d, false);
    knob.style.transform = '';
  };
  stick.addEventListener('pointerdown', (e) => {
    stickId = e.pointerId; moveStick(e); capture(stick, e);
  });
  stick.addEventListener('pointermove', (e) => { if (e.pointerId === stickId) moveStick(e); });
  stick.addEventListener('pointerup', (e) => { if (e.pointerId === stickId) releaseStick(); });
  stick.addEventListener('pointercancel', (e) => { if (e.pointerId === stickId) releaseStick(); });

  // 버튼: 두 버튼 사이를 누르면 둘 다 눌림 (예: 강P+강K)
  const pad = document.querySelector('.btns');
  const buttons = [...pad.querySelectorAll('[data-btn]')];
  const touches = new Map(); // pointerId → 누른 버튼들
  const refresh = () => {
    const on = new Set([...touches.values()].flat());
    for (const b of buttons) {
      const k = b.dataset.btn;
      b.classList.toggle('on', on.has(k));
      setTouch(k, on.has(k));
    }
  };
  pad.addEventListener('pointerdown', (e) => {
    const hits = buttons.filter((b) => {
      const r = b.getBoundingClientRect();
      const d = Math.hypot(e.clientX - (r.left + r.width / 2), e.clientY - (r.top + r.height / 2));
      return d <= (r.width / 2) * 1.2;
    }).map((b) => b.dataset.btn);
    if (!hits.length) return;
    touches.set(e.pointerId, hits);
    capture(pad, e);
    refresh();
    navigator.vibrate?.(8);
  });
  const up = (e) => { if (touches.delete(e.pointerId)) refresh(); };
  pad.addEventListener('pointerup', up);
  pad.addEventListener('pointercancel', up);

  document.addEventListener('contextmenu', (e) => e.preventDefault());
}
