// 키보드 → 1P/2P 입력 상태
import { KEYS } from './data.js';

const held = new Set();
const PREVENT = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space']);

export function attachKeyboard(target = window) {
  target.addEventListener('keydown', (e) => { held.add(e.code); if (PREVENT.has(e.code)) e.preventDefault(); });
  target.addEventListener('keyup', (e) => held.delete(e.code));
  target.addEventListener('blur', () => held.clear());
}

export function readInputs() {
  return KEYS.map((map) => Object.fromEntries(
    Object.entries(map).map(([k, codes]) => [k, codes.some((c) => held.has(c))]),
  ));
}
