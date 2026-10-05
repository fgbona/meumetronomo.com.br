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

  // ---- Figuras musicais das subdivisões (SVG). l: 0 semínima, 1 colcheia, 2 semicolcheia; d: pontuada; r: pausa de colcheia; t: número da quiáltera
  const FIGURES = [
    { n: [{ l: 0 }], name: 'Semínima' },
    { n: [{ l: 1 }, { l: 1 }], name: 'Duas colcheias' },
    { n: [{ l: 1 }, { l: 1 }, { l: 1 }], t: 3, name: 'Tercina de colcheias' },
    { n: [{ l: 2 }, { l: 2 }, { l: 2 }, { l: 2 }], name: 'Quatro semicolcheias' },
    { n: [{ l: 1, d: 1 }, { l: 2 }], name: 'Colcheia pontuada e semicolcheia' },
    { n: [{ l: 2 }, { l: 1, d: 1 }], name: 'Semicolcheia e colcheia pontuada' },
    { n: [{ l: 1 }, { l: 1 }, { l: 2 }, { l: 2 }], t: 3, name: 'Colcheia, colcheia e duas semicolcheias' },
    { n: [{ l: 2 }, { l: 2 }, { l: 1 }, { l: 1 }], t: 3, name: 'Duas semicolcheias e duas colcheias' },
    { n: [{ l: 1 }, { l: 2 }, { l: 2 }, { l: 1 }], t: 3, name: 'Colcheia, duas semicolcheias e colcheia' },
    { n: [{ l: 1, d: 1 }, { l: 2 }, { l: 2 }, { l: 2 }], t: 3, name: 'Colcheia pontuada e três semicolcheias' },
    { n: [{ l: 2 }, { l: 2 }, { l: 2 }, { l: 2 }, { r: 1 }], t: 3, name: 'Quatro semicolcheias e pausa' },
  ];
  function figure({ n, t }) {
    const step = 17, x0 = 9, head = 36, top = 12, w = x0 + n.length * step + 2;
    let out = '';
    const sx = (i) => x0 + i * step + 5; // x da haste
    n.forEach((o, i) => {
      const cx = x0 + i * step;
      if (o.r) { // pausa de colcheia
        out += `<path d="M${cx - 3} ${top + 10} q4 4 8 0 l-4 14" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="${cx - 3}" cy="${top + 10}" r="1.8"/>`;
        return;
      }
      out += `<ellipse cx="${cx}" cy="${head}" rx="5.2" ry="3.6" transform="rotate(-22 ${cx} ${head})"/>`;
      out += `<rect x="${sx(i) - 0.8}" y="${top}" width="1.6" height="${head - top}"/>`;
      if (o.d) out += `<circle cx="${cx + 8}" cy="${head - 2}" r="1.5"/>`;
      if (o.l && n.length === 1) out += `<path d="M${sx(i)} ${top} q8 6 4 14" fill="none" stroke="currentColor" stroke-width="2"/>`;
    });
    const notes = n.map((o, i) => ({ ...o, i })).filter((o) => !o.r);
    if (notes.length > 1) {
      const a = sx(notes[0].i), b = sx(notes[notes.length - 1].i);
      out += `<rect x="${a - 0.8}" y="${top}" width="${b - a + 1.6}" height="3.5"/>`;
      notes.forEach((o, k) => { // feixe secundário: inteiro entre semicolcheias vizinhas, ou um toco
        if (o.l !== 2) return;
        const next = notes[k + 1], prev = notes[k - 1];
        if (next && next.l === 2) out += `<rect x="${sx(o.i) - 0.8}" y="${top + 5.5}" width="${sx(next.i) - sx(o.i) + 1.6}" height="3.5"/>`;
        else if (!(prev && prev.l === 2)) {
          const dir = prev ? -1 : 1;
          out += `<rect x="${dir < 0 ? sx(o.i) - 7 : sx(o.i) - 0.8}" y="${top + 5.5}" width="7.8" height="3.5"/>`;
        }
      });
    }
    if (t) out += `<text x="${(sx(0) + sx(n.length - 1)) / 2}" y="${top - 4}" font-size="11" font-style="italic" font-weight="700" text-anchor="middle" font-family="serif">${t}</text>`;
    return `<svg viewBox="0 0 ${w} 44" width="${w}" height="44" fill="currentColor" aria-hidden="true">${out}</svg>`;
  }
  $('subdivisions').innerHTML = PATTERNS.map((p, i) =>
    `<label title="${FIGURES[i].name}"><input type="radio" name="sub" value="${i}" aria-label="${FIGURES[i].name}"${i === 0 ? ' checked' : ''}>${figure(FIGURES[i])}</label>`
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

  setBpm(+$('metronome').dataset.bpm || 120);
  setBeats(4);
})();
