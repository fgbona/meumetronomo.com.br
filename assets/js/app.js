(() => {
  const $ = (id) => document.getElementById(id);
  const PATTERNS = ['1', '1-1', '1-1-1', '1-1-1-1', '1-0-0-1', '1-1-0-0', '1-0-1-0-1-1', '1-1-1-0-1-0', '1-0-1-1-1-0', '1-0-0-1-1-1', '1-1-1-1-0-0'];
  const NAMES = [[240, 'Prestissimo'], [177, 'Presto'], [140, 'Vivace'], [132, 'Allegro'], [109, 'Allegretto'], [97, 'Moderato'], [85, 'Andante'], [70, 'Adagietto'], [60, 'Adagio'], [50, 'Largo'], [45, 'Lento'], [25, 'Grave'], [0, 'Larghissimo']];
  const MIN = 1, MAX = 240;

  const state = { bpm: 120, beats: 4, accent: true, pattern: [1], running: false };
  let ctx, nextTime = 0, beat = 0, sub = 0, tickTimer = null, stopTimer = null, taps = [];

  // ---- UI ----
  const bpmInput = $('bpm'), bpmValue = $('bpm-value'), bpmName = $('bpm-name');
  const beatsEl = $('beats'), startBtn = $('start');

  function setBpm(v) {
    state.bpm = Math.min(MAX, Math.max(MIN, Math.round(v)));
    bpmInput.value = bpmValue.textContent = state.bpm;
    bpmName.textContent = NAMES.find(([min]) => state.bpm >= min)[1];
    document.title = `${state.bpm} BPM - Meu Metrônomo`;
  }
  function setBeats(v) {
    state.beats = Math.min(12, Math.max(1, Math.round(v) || 1));
    $('beats-count').value = state.beats;
    beatsEl.innerHTML = Array.from({ length: state.beats }, (_, i) => `<span class="beat${i === 0 ? ' first' : ''}"></span>`).join('');
  }
  function flash(i) {
    beatsEl.querySelectorAll('.beat').forEach((el, j) => el.classList.toggle('on', j === i));
  }

  bpmInput.addEventListener('input', () => setBpm(bpmInput.value));
  $('bpm-dec').onclick = () => setBpm(state.bpm - 1);
  $('bpm-inc').onclick = () => setBpm(state.bpm + 1);
  $('beats-dec').onclick = () => setBeats(state.beats - 1);
  $('beats-inc').onclick = () => setBeats(state.beats + 1);
  $('beats-count').addEventListener('change', (e) => setBeats(e.target.value));
  $('accent').onchange = (e) => (state.accent = e.target.checked);
  $('timer').onchange = (e) => ($('timer-min').disabled = !e.target.checked);

  $('subdivisions').innerHTML = PATTERNS.map((p, i) =>
    `<label title="${p}"><input type="radio" name="sub" value="${i}"${i === 0 ? ' checked' : ''}>${p.split('-').map((h) => `<i class="${h === '1' ? 'hit' : ''}"></i>`).join('')}</label>`
  ).join('');
  $('subdivisions').addEventListener('change', (e) => (state.pattern = PATTERNS[e.target.value].split('-').map(Number)));

  // ---- Audio: lookahead scheduler (Chris Wilson "A Tale of Two Clocks") ----
  function click(time, kind) {
    const osc = ctx.createOscillator(), gain = ctx.createGain();
    osc.frequency.value = kind === 'accent' ? 1200 : kind === 'beat' ? 900 : 650;
    const vol = kind === 'sub' ? 0.35 : 1;
    gain.gain.setValueAtTime(vol, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.06);
    osc.connect(gain).connect(ctx.destination);
    osc.start(time);
    osc.stop(time + 0.07);
  }
  function schedule() {
    const subLen = 60 / state.bpm / state.pattern.length;
    while (nextTime < ctx.currentTime + 0.1) {
      if (state.pattern[sub]) {
        const kind = sub !== 0 ? 'sub' : state.accent && beat === 0 ? 'accent' : 'beat';
        click(nextTime, kind);
      }
      if (sub === 0) {
        const b = beat;
        setTimeout(() => flash(b), Math.max(0, (nextTime - ctx.currentTime) * 1000));
      }
      nextTime += subLen;
      if (++sub >= state.pattern.length) { sub = 0; beat = (beat + 1) % state.beats; }
    }
  }
  function start() {
    ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
    ctx.resume();
    beat = sub = 0;
    nextTime = ctx.currentTime + 0.05;
    tickTimer = setInterval(schedule, 25);
    if ($('timer').checked) stopTimer = setTimeout(stop, (+$('timer-min').value || 1) * 60000);
    state.running = true;
    startBtn.textContent = 'Parar';
    startBtn.classList.add('running');
  }
  function stop() {
    clearInterval(tickTimer); clearTimeout(stopTimer);
    state.running = false;
    flash(-1);
    startBtn.textContent = 'Iniciar';
    startBtn.classList.remove('running');
  }
  startBtn.onclick = () => (state.running ? stop() : start());

  // ---- Tap BPM: average of the last intervals, reset after 2s pause ----
  $('tap').onclick = () => {
    const now = performance.now();
    if (taps.length && now - taps[taps.length - 1] > 2000) taps = [];
    taps.push(now);
    if (taps.length > 8) taps.shift();
    if (taps.length > 1) setBpm(60000 / ((taps[taps.length - 1] - taps[0]) / (taps.length - 1)));
  };

  // ---- Keyboard ----
  document.addEventListener('keydown', (e) => {
    if (e.target.matches('input')) return;
    if (e.code === 'Space') { e.preventDefault(); startBtn.click(); }
    else if (e.key === 'ArrowUp' || e.key === 'ArrowRight') setBpm(state.bpm + 1);
    else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') setBpm(state.bpm - 1);
    else if (e.key.toLowerCase() === 't') $('tap').click();
  });

  // ---- Theme / fullscreen ----
  const root = document.documentElement;
  try { if (localStorage.theme) root.dataset.theme = localStorage.theme; } catch {}
  $('theme').onclick = () => {
    const dark = root.dataset.theme ? root.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
    root.dataset.theme = dark ? 'light' : 'dark';
    try { localStorage.theme = root.dataset.theme; } catch {}
  };
  $('fullscreen').onclick = () => (document.fullscreenElement ? document.exitFullscreen() : $('metronome').requestFullscreen());

  setBpm(120);
  setBeats(4);
})();
