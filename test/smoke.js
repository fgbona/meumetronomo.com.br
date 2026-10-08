// Teste de fumaça do metrônomo e das ferramentas em jsdom, com Web Audio simulada.
// Uso: hugo && npm i --no-save jsdom && node test/smoke.js
const { JSDOM } = require('jsdom');
const fs = require('fs');
const assert = require('assert');
const root = require('path').join(__dirname, '..', 'public'); // rode `hugo` antes

function fakeAudio(win) {
  const node = () => ({ connect(x) { return x || this; }, start(t) { if (t != null) AC.starts.push(+t.toFixed(3)); }, stop() {}, frequency: { value: 0 }, detune: { value: 0 }, Q: { value: 0 }, gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {}, linearRampToValueAtTime() {}, setTargetAtTime() {} }, type: '' });
  class AC {
    constructor() { this.currentTime = 0; this.sampleRate = 48000; this.destination = {}; AC.last = this; }
    resume() {} close() {}
    createOscillator() { AC.oscs++; return node(); }
    createGain() { return node(); } createBiquadFilter() { return node(); }
    createBufferSource() { AC.noises++; return node(); }
    createBuffer(c, n) { return { getChannelData: () => new Float32Array(n) }; }
    createAnalyser() { return { ...node(), fftSize: 2048, getFloatTimeDomainData(b) { for (let i = 0; i < b.length; i++) b[i] = 0.5 * Math.sin(2 * Math.PI * AC.hz * i / 48000); } }; }
    createMediaStreamSource() { return node(); }
  }
  AC.oscs = 0; AC.noises = 0; AC.hz = 440; AC.starts = [];
  win.AudioContext = AC; return AC;
}
function load(page, url = 'https://meumetronomo.com.br/', storage = {}) {
  const html = fs.readFileSync(`${root}/${page}`, 'utf8');
  const dom = new JSDOM(html, { url, runScripts: 'outside-only', pretendToBeVisual: true });
  const win = dom.window;
  const AC = fakeAudio(win);
  Object.assign(win.localStorage, storage);
  win.matchMedia = () => ({ matches: false });
  const timers = { interval: null, timeouts: [] };
  win.setInterval = (f) => { timers.interval = f; return 1; };
  win.clearInterval = () => (timers.interval = null);
  win.setTimeout = (f, ms) => { if (ms >= 30 && !timers.interval) return setTimeout(f, ms); timers.timeouts.push(f); return 1; };
  win.requestAnimationFrame = () => 0;
  win.navigator.mediaDevices = { getUserMedia: async () => ({ getTracks: () => [{ stop() {} }] }) };
  html.match(/src="(\/js\/[^"]+)"/g).forEach((m) => win.eval(fs.readFileSync(root + m.slice(5, -1), 'utf8')));
  return { win, doc: win.document, AC, timers, $: (id) => win.document.getElementById(id) };
}
const flush = (timers) => { const t = timers.timeouts.splice(0); t.forEach((f) => f()); };

// ---- Metrônomo ----
{
  const { $, win } = load('index.html');
  assert.equal($('bpm-value').textContent, '60', 'padrão 60');
  assert.equal($('beats').children.length, 4);
  assert.equal(win.localStorage.metro, undefined, 'init não grava');
  $('bpm-inc').click(); assert.equal(JSON.parse(win.localStorage.metro).bpm, 61, 'inc salva');
  win.prompt = () => 'Samba'; $('preset-save').click();
  assert.equal(JSON.parse(win.localStorage.presets)[0].name, 'Samba');
  assert.ok($('presets').textContent.includes('Samba'));
  $('bpm-dec').click(); $('bpm-dec').click();
  $('presets').querySelector('button').click(); assert.equal($('bpm-value').textContent, '61', 'preset restaura');
  $('presets').querySelector('.del').click(); assert.equal($('presets').children.length, 0, 'apaga preset');
  win.prompt = () => '<b>x</b>'; $('preset-save').click(); assert.ok(!$('presets').querySelector('b'), 'nome escapado');
}
{ // memória > padrão; URL > memória
  const { $ } = load('index.html', 'https://meumetronomo.com.br/', { metro: JSON.stringify({ bpm: 95, beats: 3, sub: 2, sound: 'clave', flash: true }) });
  assert.equal($('bpm-value').textContent, '95'); assert.equal($('beats').children.length, 3);
  assert.ok($('subdivisions').querySelector('input[value="2"]').checked); assert.equal($('sound').value, 'clave'); assert.ok($('flash').checked);
  const t = load('index.html', 'https://meumetronomo.com.br/?bpm=130&beats=7&sub=1&accent=0', { metro: JSON.stringify({ bpm: 95, beats: 3 }) });
  assert.equal(t.$('bpm-value').textContent, '130'); assert.equal(t.$('beats').children.length, 7);
  assert.ok(t.$('subdivisions').querySelector('input[value="1"]').checked); assert.ok(!t.$('accent').checked);
  const bad = load('index.html', 'https://meumetronomo.com.br/', { metro: '{garbage', presets: 'null' });
  assert.equal(bad.$('bpm-value').textContent, '60', 'storage corrompido cai no padrão');
}
{ // compassos mudos: toca 1, silencia 1
  const { $, win, AC, timers } = load('index.html');
  $('gap').checked = true; $('gap-play').value = 1; $('gap-mute').value = 1;
  $('start').click();
  for (let t = 0; t <= 16; t += 0.025) { AC.last.currentTime = t; timers.interval(); flush(timers); }
  const osc = AC.starts.filter((_, i) => i % 1 === 0);
  const inMeasure = (m) => AC.starts.filter((t) => t >= m * 4 && t < m * 4 + 4).length;
  assert.deepEqual([0, 1, 2, 3].map(inMeasure), [4, 0, 4, 0], `mudos: ${AC.starts}`);
  $('start').click(); assert.equal($('start').textContent, 'Iniciar');
}
{ // trainer: +10 a cada 2 compassos até 75
  const { $, win, AC, timers } = load('index.html');
  $('trainer').checked = true; $('trainer-step').value = 10; $('trainer-every').value = 2; $('trainer-target').value = 75;
  $('flash').checked = true; $('flash').dispatchEvent(new win.Event('change'));
  $('start').click();
  const seen = new Set();
  for (let t = 0; t <= 40; t += 0.025) { AC.last.currentTime = t; timers.interval(); flush(timers); seen.add($('bpm-value').textContent); }
  assert.deepEqual([...seen], ['60', '70', '75'], `trainer: ${[...seen]}`);
  // intervalo entre cliques: 1 s a 60, 0,857 a 70, 0,8 a 75
  const gaps = AC.starts.slice(1).map((t, i) => +(t - AC.starts[i]).toFixed(2));
  assert.ok(gaps.slice(0, 7).every((g) => g === 1) && gaps.includes(0.86) && gaps.slice(-3).every((g) => g === 0.8), `gaps: ${gaps}`);
  $('start').click();
  $('sound').value = 'tique'; $('sound').dispatchEvent(new win.Event('change'));
  const o = AC.oscs, n = AC.noises; assert.ok(AC.noises > n - 1 && AC.oscs === o, 'tique = só ruído');
}
console.log('metrônomo: ok');

// ---- Ferramentas ----
{
  const { $ } = load('calculadora-de-delay/index.html', 'https://meumetronomo.com.br/calculadora-de-delay/?bpm=120');
  assert.equal($('delay-beat').textContent, '500.0 ms');
  const rows = [...$('delay-table').rows].map((r) => [...r.cells].map((c) => c.textContent));
  assert.deepEqual(rows[2], ['Semínima', '500.0 ms', '750.0 ms', '333.3 ms', '2.000 Hz']);
  assert.deepEqual(rows[3].slice(0, 2), ['Colcheia', '250.0 ms']);
}
{
  const { $, win } = load('conversor-de-tempo/index.html');
  assert.equal($('conv-bar').textContent, '2.00 s');
  assert.equal($('conv-dur').textContent, '1 min 04 s', '32 compassos a 120');
  assert.equal($('conv-bars-out').textContent, '105.0 compassos (420 batidas)');
}
{
  const { $, AC, win } = load('diapasao/index.html');
  assert.equal($('tone-notes').children.length, 12);
  const la = [...$('tone-notes').children].find((b) => b.textContent.startsWith('Lá') && !b.textContent.startsWith('Lá♯'));
  la.click(); assert.equal($('tone-out').textContent, '440.00 Hz'); assert.ok(la.classList.contains('on') || $('tone-notes').querySelector('.on'));
  $('tone-a4').value = 442; $('tone-a4').dispatchEvent(new win.Event('input'));
  assert.equal($('tone-out').textContent, '442.00 Hz', 'A4 muda nota tocando');
  $('tone-stop').click(); assert.ok(!$('tone-notes').querySelector('.on'));
}
{
  const { $, win, AC } = load('afinador/index.html');
  AC.hz = 440;
  $('tuner-start').click();
  return_ = new Promise((r) => setImmediate(r));
  return_.then(() => {
    assert.equal($('tuner-start').textContent, 'Parar');
    assert.equal($('tuner-note').textContent, 'Lá4', `nota: ${$('tuner-note').textContent}`);
    assert.ok($('tuner').classList.contains('ok'), 'afinado');
    console.log('afinador: ok');
  });
}
{
  const { $, win, AC, timers } = load('treino-de-ouvido/index.html');
  $('ear-play').click();
  assert.equal($('ear-answers').children.length, 5, 'básico tem 5 opções');
  assert.ok(AC.oscs === 2, 'intervalo toca 2 notas');
  $('ear-answers').children[0].click();
  assert.ok($('ear-answers').querySelector('.good'), 'mostra a certa');
  assert.match($('ear-score').textContent, /^[01] \/ 1$/);
  $('ear-mode').value = 'acordes'; $('ear-mode').dispatchEvent(new win.Event('change'));
  $('ear-play').click(); assert.equal($('ear-answers').children.length, 7);
}
{
  const { $, win, AC, timers } = load('treino-de-ritmo/index.html');
  $('rhythm-start').click();
  AC.last.currentTime = 0; timers.interval();
  // t0 = 0,3 s; 80 BPM → 0,75 s por batida. Toque em t0 + 2 batidas + 20 ms
  AC.last.currentTime = 0.3 + 1.5 + 0.02; timers.interval(); $('rhythm-tap').click();
  assert.equal($('rhythm-last').textContent, '+20 ms');
  AC.last.currentTime = 0.3 + 2.25 - 0.03; timers.interval(); $('rhythm-tap').click();
  assert.equal($('rhythm-last').textContent, '-30 ms'); assert.equal($('rhythm-n').textContent, '2');
  assert.equal($('rhythm-taps').children.length, 2);
}
console.log('ferramentas: ok');

// ---- Ferramentas, lote 2 ----
{
  const { $, win } = load('transpositor-de-acordes/index.html');
  $('transpose-in').value = 'G   D/F#  Em7  C7+\nA casa é minha\nBm7(b5)  E7  Am';
  $('transpose-semi').value = '2'; $('transpose-semi').dispatchEvent(new win.Event('input'));
  assert.equal($('transpose-out').textContent, 'A   E/G#  F#m7  D7+\nA casa é minha\nC#m7(b5)  F#7  Bm', 'transpõe acordes e preserva letra');
  $('transpose-acc').value = 'b'; $('transpose-semi').value = '-1'; $('transpose-semi').dispatchEvent(new win.Event('input'));
  assert.ok($('transpose-out').textContent.startsWith('Gb   Db/F  Ebm7  B7+'), `bemóis: ${$('transpose-out').textContent.split('\n')[0]}`);
}
{
  const { $, win, AC, timers } = load('polirritmia/index.html');
  assert.equal($('poly-dots-a').children.length, 3); assert.equal($('poly-dots-b').children.length, 2);
  $('poly').querySelector('[data-poly="4:3"]').click(); assert.equal($('poly-label').textContent, '4 contra 3');
  $('poly-start').click();
  for (let t = 0; t <= 2.8; t += 0.025) { AC.last.currentTime = t; timers.interval(); flush(timers); }
  // 4 contra 3 a 90 BPM: ciclo = 4 × 0,667 = 2,667 s → 7 toques por ciclo (4 + 3), 2 ciclos agendados em 2,8 s
  const first = AC.starts.filter((t) => t < 2.76).length;
  assert.equal(first, 7, `toques no 1º ciclo: ${first} (${AC.starts})`);
  $('poly-start').click(); assert.equal($('poly-start').textContent, 'Iniciar');
}
{
  const { $, AC } = load('drone/index.html');
  assert.equal($('drone-note').value, '9', 'Lá selecionado');
  $('drone-start').click(); assert.equal($('drone-start').textContent, 'Parar'); assert.equal(AC.oscs, 6, 'fundamental ×2 + 2 harmônicos + quinta ×2');
  assert.equal($('drone-hz').textContent, 'Lá2 · 110.00 Hz');
  $('drone-start').click(); assert.equal($('drone-start').textContent, 'Tocar');
}
{
  const { $, win } = load('escalas/index.html');
  const notes = () => [...$('scale-notes').querySelectorAll('b')].map((b) => b.textContent).join(' ');
  const chords = () => [...$('scale-chords').querySelectorAll('b')].map((b) => b.textContent).join(' ');
  assert.equal(notes(), 'Dó Ré Mi Fá Sol Lá Si');
  assert.equal(chords(), 'Dó Rém Mim Fá Sol Lám Siº');
  assert.equal($('scale-formula').textContent, 'T – T – ST – T – T – T – ST');
  $('scale-root').value = '9'; $('scale-type').value = 'Menor harmônica'; $('scale-type').dispatchEvent(new win.Event('change'));
  assert.equal(notes(), 'Lá Si Dó Ré Mi Fá Sol♯'); assert.equal(chords(), 'Lám Siº Dó+ Rém Mi Fá Sol♯º');
  $('scale-type').value = 'Pentatônica menor'; $('scale-type').dispatchEvent(new win.Event('change'));
  assert.equal(notes(), 'Lá Dó Ré Mi Sol'); assert.ok($('scale-chords-wrap').hidden);
  // braço: Lá menor pentatônica no violão, 15 casas → 6 cordas × 16 posições × 5/12 notas ≈ 40 círculos, 5 shapes
  const circles = () => $('fretboard').querySelectorAll('circle[r="10.5"]');
  assert.ok(circles().length >= 38 && circles().length <= 42, `notas no braço: ${circles().length}`);
  assert.equal($('fb-pos').options.length, 7, '5 shapes na 1ª oitava + 1 acima da casa 12 que cabe em 15 casas, + todas');
  $('fb-frets').value = 24; $('fb-frets').dispatchEvent(new win.Event('input'));
  assert.ok([...$('fb-pos').options].some((o) => o.textContent.includes('casa 20–23')), 'shapes até a casa 24');
  $('fb-frets').value = 15; $('fb-frets').dispatchEvent(new win.Event('input'));
  assert.equal($('fretboard').querySelectorAll('circle[fill="var(--accent)"]').length, 8, 'tônicas Lá: 6 cordas × casas 5/17, 0/12, 7, 2/14, 10, 5 → 8');
  $('fb-labels').value = 'degree'; $('fb-labels').dispatchEvent(new win.Event('change'));
  assert.ok([...$('fretboard').querySelectorAll('text')].some((t) => t.textContent === '♭3'), 'rótulo de grau');
  $('fb-pos').value = '5'; $('fb-pos').dispatchEvent(new win.Event('change'));
  assert.equal($('fretboard').querySelectorAll('g[opacity="1"]').length, 12, 'shape 1 da pentatônica tem 12 notas (2 por corda)');
  $('fb-tuning').value = '4,9,14,19'; $('fb-tuning').dispatchEvent(new win.Event('change'));
  assert.equal($('fretboard').querySelectorAll('line[stroke="currentColor"]').length, 4, 'baixo: 4 cordas');
}
{
  const { $, win, AC, timers } = load('leitura-ritmica/index.html');
  assert.equal($('reading-sheet').querySelectorAll('.bar').length, 2); assert.equal($('reading-sheet').querySelectorAll('.fig').length, 8);
  $('reading-level').value = '1'; $('reading-level').dispatchEvent(new win.Event('change'));
  assert.ok([...$('reading-sheet').querySelectorAll('.fig')].every((f) => /Semínima|Pausa de semínima|Duas colcheias/.test(f.title)), 'nível 1 só figuras simples');
  $('reading-play').checked = true; $('reading-start').click();
  for (let t = 0; t <= 12 && timers.interval; t += 0.025) { AC.last.currentTime = t; timers.interval(); flush(timers); }
  assert.equal($('reading-start').textContent, 'Tocar', 'para sozinho no fim');
  assert.ok(AC.starts.length >= 12, `contagem + 8 tempos de clique: ${AC.starts.length}`);
}
{
  const { $, win, AC } = load('bpm-de-musica/index.html');
  // sinal sintético: pulsos a 100 BPM por 20 s
  const sr = 44100, len = sr * 20, ch = new Float32Array(len);
  for (let b = 0; b < 20 * 100 / 60; b++) { const s = Math.round(b * 0.6 * sr); for (let i = 0; i < 2000; i++) ch[s + i] = Math.sin(i * 0.3) * Math.exp(-i / 400); }
  AC.prototype.decodeAudioData = async () => ({ sampleRate: sr, length: len, duration: 20, numberOfChannels: 1, getChannelData: () => ch });
  const file = { name: 'x.wav', arrayBuffer: async () => new ArrayBuffer(8) };
  Object.defineProperty($('bpmfile-in'), 'files', { value: [file] });
  $('bpmfile-in').onchange({ target: $('bpmfile-in') });
  new Promise((r) => setTimeout(r, 200)).then(() => {
    const got = $('bpmfile-out').querySelector('.big span');
    assert.ok(got && Math.abs(+got.textContent - 100) < 1, `BPM detectado: ${got && got.textContent} (${$('bpmfile-status').textContent})`);
    console.log('bpm de música: ok');
  });
}
console.log('ferramentas lote 2: ok');
