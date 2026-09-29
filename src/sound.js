// 효과음: 파일 없이 소리를 직접 합성 (임시용)
let ac = null;
let noise = null;

function ensure() {
  if (!ac) {
    try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch { return null; }
    noise = ac.createBuffer(1, ac.sampleRate * 0.3, ac.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  if (ac.state === 'suspended') ac.resume();
  return ac;
}
window.addEventListener('keydown', ensure);
window.addEventListener('pointerdown', ensure);

function tone(type, f0, f1, dur, vol, delay = 0) {
  const t = ac.currentTime + delay;
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g).connect(ac.destination);
  o.start(t); o.stop(t + dur);
}

function burst(freq, dur, vol) {
  const t = ac.currentTime;
  const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
  s.buffer = noise;
  f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = 1.2;
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  s.connect(f).connect(g).connect(ac.destination);
  s.start(t); s.stop(t + dur);
}

export function sfx(name) {
  if (!ac || ac.state !== 'running') return;
  switch (name) {
    case 'swingL': burst(2400, 0.06, 0.08); break;
    case 'swingH': burst(1400, 0.1, 0.12); break;
    case 'hitL': tone('square', 420, 160, 0.08, 0.12); burst(1800, 0.08, 0.25); break;
    case 'hitH': tone('square', 260, 60, 0.16, 0.18); burst(900, 0.16, 0.4); break;
    case 'block': tone('triangle', 1400, 900, 0.06, 0.15); burst(4000, 0.04, 0.12); break;
    case 'jump': tone('sine', 300, 700, 0.1, 0.08); break;
    case 'ko': tone('square', 500, 40, 0.8, 0.2); burst(600, 0.5, 0.4); break;
    case 'round': tone('square', 660, 660, 0.12, 0.1); tone('square', 880, 880, 0.2, 0.1, 0.13); break;
    case 'fight': tone('sawtooth', 440, 880, 0.25, 0.12); break;
    case 'select': tone('square', 880, 1200, 0.07, 0.08); break;
  }
}
