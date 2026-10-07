(() => {
  const $ = (id) => document.getElementById(id);
  const NAMES = [[240, 'Prestissimo'], [177, 'Presto'], [140, 'Vivace'], [132, 'Allegro'], [109, 'Allegretto'], [97, 'Moderato'], [85, 'Andante'], [70, 'Adagietto'], [60, 'Adagio'], [50, 'Largo'], [45, 'Lento'], [25, 'Grave'], [0, 'Larghissimo']];
  const MIN = 1, MAX = 240;
  // Sons sintetizados: f = frequência [acento, batida, subdivisão], d = decaimento (s), noise = ruído filtrado junto
  const SOUNDS = {
    bipe: { type: 'sine', f: [1200, 900, 650], d: 0.06 },
    madeira: { type: 'sine', f: [1900, 1500, 1100], d: 0.03, noise: 1 },
    clave: { type: 'triangle', f: [2600, 2200, 1800], d: 0.05 },
    tique: { f: [6000, 4500, 3500], d: 0.015, noise: 1, tone: 0 },
  };

  const state = { bpm: 60, beats: 4, accent: true, sub: 0, pattern: [1], sound: 'bipe', flash: false, running: false };
  let ctx, noiseBuf, nextTime = 0, beat = 0, sub = 0, measure = 0, tickTimer = null, stopTimer = null, taps = [];

  // ---- UI ----
  const bpmInput = $('bpm'), bpmValue = $('bpm-value'), bpmName = $('bpm-name');
  const beatsEl = $('beats'), startBtn = $('start'), box = $('metronome');

  function setBpm(v) {
    state.bpm = Math.min(MAX, Math.max(MIN, Math.round(v)));
    bpmInput.value = bpmValue.textContent = state.bpm;
    bpmName.textContent = NAMES.find(([min]) => state.bpm >= min)[1];
    save();
  }
  function setBeats(v) {
    state.beats = Math.min(12, Math.max(1, Math.round(v) || 1));
    $('beats-count').value = state.beats;
    beatsEl.innerHTML = Array.from({ length: state.beats }, (_, i) => `<span class="beat${i === 0 ? ' first' : ''}"></span>`).join('');
    save();
  }
  function setSub(i) {
    state.sub = PATTERNS[i] ? +i : 0;
    state.pattern = PATTERNS[state.sub].split('-').map(Number);
    const r = $('subdivisions').querySelector(`input[value="${state.sub}"]`);
    if (r) r.checked = true;
    save();
  }
  function setAccent(on) { state.accent = $('accent').checked = !!on; save(); }
  function setSound(s) { state.sound = SOUNDS[s] ? s : 'bipe'; $('sound').value = state.sound; save(); }
  function setFlash(on) { state.flash = $('flash').checked = !!on; save(); }
  function flash(i) {
    beatsEl.querySelectorAll('.beat').forEach((el, j) => el.classList.toggle('on', j === i));
    if (state.flash && i >= 0) { box.classList.add('flash'); setTimeout(() => box.classList.remove('flash'), 80); }
  }

  bpmInput.addEventListener('input', () => setBpm(bpmInput.value));
  $('bpm-dec').onclick = () => setBpm(state.bpm - 1);
  $('bpm-inc').onclick = () => setBpm(state.bpm + 1);
  $('beats-dec').onclick = () => setBeats(state.beats - 1);
  $('beats-inc').onclick = () => setBeats(state.beats + 1);
  $('beats-count').addEventListener('change', (e) => setBeats(e.target.value));
  $('accent').onchange = (e) => setAccent(e.target.checked);
  $('timer').onchange = (e) => ($('timer-min').disabled = !e.target.checked);
  $('sound').onchange = (e) => { setSound(e.target.value); if (!state.running) preview(); };
  $('flash').onchange = (e) => setFlash(e.target.checked);

  const { PATTERNS, FIGURES, figure } = window.MMFIG;
  $('subdivisions').innerHTML = PATTERNS.slice(0, 11).map((p, i) =>
    `<label title="${FIGURES[i].name}"><input type="radio" name="sub" value="${i}" aria-label="${FIGURES[i].name}"${i === 0 ? ' checked' : ''}>${figure(FIGURES[i])}</label>`
  ).join('');
  $('subdivisions').addEventListener('change', (e) => setSub(e.target.value));

  // ---- Audio: lookahead scheduler (Chris Wilson "A Tale of Two Clocks") ----
  function audio() {
    ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
    ctx.resume();
    return ctx;
  }
  function noise() {
    if (!noiseBuf) {
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.05, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    return src;
  }
  function click(time, kind) {
    const s = SOUNDS[state.sound], f = s.f[kind === 'accent' ? 0 : kind === 'beat' ? 1 : 2];
    const vol = kind === 'sub' ? 0.35 : 1;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + s.d);
    gain.connect(ctx.destination);
    if (s.tone !== 0) {
      const osc = ctx.createOscillator();
      osc.type = s.type; osc.frequency.value = f;
      osc.connect(gain); osc.start(time); osc.stop(time + s.d + 0.01);
    }
    if (s.noise) {
      const n = noise(), bp = ctx.createBiquadFilter();
      bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = s.tone === 0 ? 1 : 4;
      n.connect(bp).connect(gain); n.start(time); n.stop(time + s.d + 0.01);
    }
  }
  function preview() { audio(); click(ctx.currentTime, 'beat'); }
  const num = (id, min, max, def) => Math.min(max, Math.max(min, +$(id).value || def));
  function newMeasure() {
    measure++;
    if ($('trainer').checked) {
      const step = num('trainer-step', 1, 20, 4), every = num('trainer-every', 1, 32, 4), target = num('trainer-target', MIN, MAX, 120);
      if (measure % every === 0 && state.bpm !== target) setBpm(state.bpm < target ? Math.min(target, state.bpm + step) : Math.max(target, state.bpm - step));
    }
  }
  function muted() {
    if (!$('gap').checked) return false;
    const play = num('gap-play', 1, 16, 4), mute = num('gap-mute', 1, 16, 2);
    return measure % (play + mute) >= play;
  }
  function schedule() {
    while (nextTime < ctx.currentTime + 0.1) {
      if (sub === 0 && beat === 0) { if (measure >= 0) newMeasure(); else measure = 0; }
      const silent = muted();
      if (state.pattern[sub] && !silent) {
        const kind = sub !== 0 ? 'sub' : state.accent && beat === 0 ? 'accent' : 'beat';
        click(nextTime, kind);
      }
      if (sub === 0) {
        const b = beat;
        setTimeout(() => { beatsEl.classList.toggle('silent', silent); flash(b); }, Math.max(0, (nextTime - ctx.currentTime) * 1000));
      }
      nextTime += 60 / state.bpm / state.pattern.length;
      if (++sub >= state.pattern.length) { sub = 0; beat = (beat + 1) % state.beats; }
    }
  }
  function start() {
    audio();
    beat = sub = 0; measure = -1;
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
    beatsEl.classList.remove('silent');
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
    if (e.target.matches('input, select')) return;
    if (e.code === 'Space') { e.preventDefault(); startBtn.click(); }
    else if (e.key === 'ArrowUp' || e.key === 'ArrowRight') setBpm(state.bpm + 1);
    else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') setBpm(state.bpm - 1);
    else if (e.key.toLowerCase() === 't') $('tap').click();
  });

  $('fullscreen').onclick = () => (document.fullscreenElement ? document.exitFullscreen() : box.requestFullscreen());

  // ---- Memória (localStorage) e presets ----
  let loading = true;
  const store = (k, v) => { try { localStorage[k] = JSON.stringify(v); } catch {} };
  const load = (k, def) => { try { return JSON.parse(localStorage[k]) ?? def; } catch { return def; } };
  function save() {
    if (loading) return;
    store('metro', { bpm: state.bpm, beats: state.beats, accent: state.accent, sub: state.sub, sound: state.sound, flash: state.flash });
  }
  function apply(s) {
    if (s.bpm) setBpm(s.bpm);
    if (s.beats) setBeats(s.beats);
    if (s.sub != null) setSub(s.sub);
    if (s.accent != null) setAccent(s.accent);
    if (s.sound) setSound(s.sound);
    if (s.flash != null) setFlash(s.flash);
  }
  let presets = load('presets', []);
  function renderPresets() {
    $('presets').innerHTML = presets.map((p, i) =>
      `<li><button type="button" data-i="${i}">${p.name.replace(/[<>&"]/g, (c) => `&#${c.charCodeAt(0)};`)} <small>${p.bpm} BPM · ${p.beats} bat.</small></button><button type="button" class="del" data-del="${i}" aria-label="Apagar ${p.name.replace(/"/g, '&quot;')}">×</button></li>`
    ).join('');
  }
  $('presets').onclick = (e) => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.del != null) { presets.splice(+b.dataset.del, 1); store('presets', presets); renderPresets(); }
    else apply(presets[+b.dataset.i]);
  };
  $('preset-save').onclick = () => {
    const name = (prompt('Nome da música ou exercício:', `${state.bpm} BPM`) || '').trim().slice(0, 40);
    if (!name) return;
    presets = presets.filter((p) => p.name !== name).concat({ name, bpm: state.bpm, beats: state.beats, sub: state.sub, accent: state.accent }).slice(-30);
    store('presets', presets); renderPresets();
  };
  $('share').onclick = async () => {
    const q = new URLSearchParams({ bpm: state.bpm, beats: state.beats });
    if (state.sub) q.set('sub', state.sub);
    if (!state.accent) q.set('accent', 0);
    const url = `${location.origin}/?${q}`;
    try { await navigator.clipboard.writeText(url); $('share').textContent = 'Link copiado!'; setTimeout(() => ($('share').textContent = 'Copiar link'), 1500); }
    catch { prompt('Copie o link:', url); }
  };
  renderPresets();

  // ---- Estado inicial: URL > último ajuste salvo > padrão da página ----
  const q = new URLSearchParams(location.search), saved = load('metro', {});
  apply({ sub: 0, accent: true, sound: 'bipe', flash: false, beats: 4, ...saved, bpm: +q.get('bpm') || saved.bpm || +box.dataset.bpm || 60 });
  if (q.has('beats')) setBeats(q.get('beats'));
  if (q.has('sub')) setSub(q.get('sub'));
  if (q.has('accent')) setAccent(q.get('accent') !== '0');
  loading = false;
})();
