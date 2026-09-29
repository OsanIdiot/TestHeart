// 기술표: data.js 내용으로 자동 생성
import { CHARACTERS, MOVES } from './data.js';

const ARROWS = { 1: '↙', 2: '↓', 3: '↘', 4: '←', 6: '→', 7: '↖', 8: '↑', 9: '↗' };
const BTN = { HP: '강P', HK: '강K' };

const command = (motion) => [...motion].map((d) => ARROWS[d]).join('');

export function renderMoveList(el, touch) {
  const common = `
    <div class="mv-common">
      <b>공통</b>
      <span>잡기: 아주 가까이서 <em>강P</em> &nbsp;·&nbsp; 뒤잡기: 가까이서 <em>← + 강P</em> (가드 불가)</span>
      <span>대시: →→ &nbsp; 백대시: ←← (시작할 때 무적)</span>
      <span>SP 게이지: 때리거나 맞으면 참. <em>MAX!</em>가 되면 초필살기</span>
      <span>캔슬: 약공격 → 강공격 → 필살기 순서로 끊어서 이어가기</span>
    </div>`;
  const chars = CHARACTERS.map((c) => {
    const rows = c.specials.map((s) => {
      const name = MOVES[s.move].name;
      return `<li><span class="mv-name">${name}${s.super ? ' <i>초필살</i>' : ''}</span><span class="mv-key">${command(s.motion)} + ${BTN[s.btn]}</span></li>`;
    }).join('');
    const combos = c.combos.map((t) => `<li>${t}</li>`).join('');
    return `
      <div class="mv-char" style="--c:${c.color};--cd:${c.dark}">
        <h3>${c.ko} <small>${c.name} · ${c.style}</small></h3>
        <ul class="mv-list">${rows}</ul>
        <h4>추천 콤보</h4>
        <ol class="mv-combo">${combos}</ol>
      </div>`;
  }).join('');
  el.innerHTML = common + `<div class="mv-chars">${chars}</div>`
    + (touch ? '<p class="muted">커맨드는 조이스틱을 화살표 순서대로 돌린 뒤 강P/강K를 누르세요. 예: ↓↘→ = 아래에서 앞으로 반 바퀴</p>' : '');
}
