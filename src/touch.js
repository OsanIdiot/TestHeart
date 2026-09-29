// 스마트폰용 화면 터치 조작: 왼쪽 조이스틱 + 오른쪽 버튼 4개
import { setTouch } from './input.js';

export const isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;

function capture(el, e) { try { el.setPointerCapture(e.pointerId); } catch { /* 무시 */ } }

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
    const th = radius * 0.35;
    setTouch('left', dx < -th); setTouch('right', dx > th);
    setTouch('up', dy < -th * 1.2); setTouch('down', dy > th);
    const len = Math.hypot(dx, dy), max = radius * 0.55;
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

  for (const btn of document.querySelectorAll('[data-btn]')) {
    const keys = btn.dataset.btn.split(' '); // 잡기 버튼은 "LP LK" 두 개를 동시에
    const down = (e) => {
      keys.forEach((k) => setTouch(k, true)); btn.classList.add('on'); capture(btn, e);
      navigator.vibrate?.(8);
    };
    const up = () => { btn.classList.remove('on'); keys.forEach((k) => setTouch(k, false)); };
    btn.addEventListener('pointerdown', down);
    btn.addEventListener('pointerup', up);
    btn.addEventListener('pointercancel', up);
  }

  document.addEventListener('contextmenu', (e) => e.preventDefault());
}
