(() => {
  const $ = (id) => document.getElementById(id);
  const NOTES = ['Dó', 'Dó♯', 'Ré', 'Ré♯', 'Mi', 'Fá', 'Fá♯', 'Sol', 'Sol♯', 'Lá', 'Lá♯', 'Si'];
  const midiHz = (m, a4 = 440) => a4 * 2 ** ((m - 69) / 12);
  const noteName = (m) => `${NOTES[((m % 12) + 12) % 12]}${Math.floor(m / 12) - 1}`;
  const fmt = (ms) => ms >= 100 ? ms.toFixed(1) : ms.toFixed(2);
  let ctx;
  const audio = () => { ctx = ctx || new (window.AudioContext || window.webkitAudioContext)(); ctx.resume(); return ctx; };
  // Nota curta com envelope; dur em segundos
  function tone(freq, time, dur, type = 'triangle', vol = 0.4) {
    const osc = ctx.createOscillator(), g = ctx.createGain();
    osc.type = type; osc.frequency.value = freq;
    g.gain.setValueAtTime(0, time);
    g.gain.linearRampToValueAtTime(vol, time + 0.01);
    g.gain.setValueAtTime(vol, time + dur - 0.05);
    g.gain.exponentialRampToValueAtTime(0.001, time + dur);
    osc.connect(g).connect(ctx.destination); osc.start(time); osc.stop(time + dur + 0.02);
  }
  function click(time, accent) {
    const osc = ctx.createOscillator(), g = ctx.createGain();
    osc.frequency.value = accent ? 1200 : 900;
    g.gain.setValueAtTime(1, time); g.gain.exponentialRampToValueAtTime(0.001, time + 0.06);
    osc.connect(g).connect(ctx.destination); osc.start(time); osc.stop(time + 0.07);
  }

  // ---- Afinador cromático ----
  if ($('tuner')) {
    const el = $('tuner'), note = $('tuner-note'), cents = $('tuner-cents'), hz = $('tuner-hz'), needle = $('tuner-needle'), btn = $('tuner-start'), status = $('tuner-status');
    let stream, analyser, buf, raf, smooth = 0;
    // ponytail: autocorrelação O(n²) com n=2048; troque por YIN/MPM se o celular engasgar
    function pitch(b, sr) {
      let size = b.length, rms = 0;
      for (let i = 0; i < size; i++) rms += b[i] * b[i];
      if (Math.sqrt(rms / size) < 0.01) return -1;
      let r1 = 0, r2 = size - 1;
      for (let i = 0; i < size / 2; i++) if (Math.abs(b[i]) < 0.2) { r1 = i; break; }
      for (let i = 1; i < size / 2; i++) if (Math.abs(b[size - i]) < 0.2) { r2 = size - i; break; }
      b = b.slice(r1, r2); size = b.length;
      const c = new Float32Array(size);
      for (let i = 0; i < size; i++) for (let j = 0; j < size - i; j++) c[i] += b[j] * b[j + i];
      let d = 0; while (d + 1 < size && c[d] > c[d + 1]) d++;
      let max = -1, pos = -1;
      for (let i = d; i < size; i++) if (c[i] > max) { max = c[i]; pos = i; }
      if (pos < 1 || pos >= size - 1) return -1;
      const x1 = c[pos - 1], x2 = c[pos], x3 = c[pos + 1], a = (x1 + x3 - 2 * x2) / 2, bb = (x3 - x1) / 2;
      const t = a ? pos - bb / (2 * a) : pos;
      const f = sr / t;
      return f > 27 && f < 4200 ? f : -1;
    }
    function show(f) {
      if (f < 0) { el.classList.remove('ok'); return; }
      const a4 = +$('tuner-a4').value || 440, n = 12 * Math.log2(f / a4) + 69, m = Math.round(n);
      const c = (n - m) * 100;
      smooth = smooth * 0.6 + c * 0.4;
      note.textContent = noteName(m);
      cents.textContent = `${smooth > 0 ? '+' : ''}${smooth.toFixed(0)} cent`;
      hz.textContent = `${f.toFixed(1)} Hz`;
      needle.style.transform = `rotate(${Math.max(-50, Math.min(50, smooth)) * 0.9}deg)`;
      el.classList.toggle('ok', Math.abs(smooth) < 5);
    }
    function loop() { analyser.getFloatTimeDomainData(buf); show(pitch(buf, ctx.sampleRate)); raf = requestAnimationFrame(loop); }
    function stop() {
      cancelAnimationFrame(raf); stream.getTracks().forEach((t) => t.stop()); stream = null;
      btn.textContent = 'Ativar microfone'; status.textContent = 'Microfone desligado.'; el.classList.remove('ok');
    }
    btn.onclick = async () => {
      if (stream) return stop();
      if (!navigator.mediaDevices?.getUserMedia) { status.textContent = 'Este navegador não dá acesso ao microfone.'; return; }
      try { stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } }); }
      catch { status.textContent = 'Sem acesso ao microfone. Permita o uso na barra do navegador e tente de novo.'; return; }
      audio();
      analyser = ctx.createAnalyser(); analyser.fftSize = 2048;
      ctx.createMediaStreamSource(stream).connect(analyser);
      buf = new Float32Array(analyser.fftSize);
      btn.textContent = 'Parar'; status.textContent = 'Ouvindo. Toque uma nota só e deixe soar.';
      loop();
    };
  }

  // ---- Diapasão / gerador de tom ----
  if ($('tone')) {
    const grid = $('tone-notes'), a4 = $('tone-a4'), oct = $('tone-oct'), wave = $('tone-wave'), hzIn = $('tone-hz'), hzBtn = $('tone-play'), out = $('tone-out');
    let osc, g, playing = null;
    function stop() { if (osc) { g.gain.setTargetAtTime(0, ctx.currentTime, 0.02); osc.stop(ctx.currentTime + 0.1); osc = null; } playing = null; render(); }
    function play(freq, key) {
      audio(); if (osc) stop();
      osc = ctx.createOscillator(); g = ctx.createGain();
      osc.type = wave.value; osc.frequency.value = freq;
      g.gain.setValueAtTime(0, ctx.currentTime); g.gain.linearRampToValueAtTime(wave.value === 'sine' ? 0.5 : 0.2, ctx.currentTime + 0.02);
      osc.connect(g).connect(ctx.destination); osc.start();
      playing = key; out.textContent = `${freq.toFixed(2)} Hz`; render();
    }
    function render() {
      grid.innerHTML = NOTES.map((n, i) => {
        const m = (+oct.value + 1) * 12 + i, f = midiHz(m, +a4.value || 440);
        return `<button type="button" data-m="${m}" class="${playing === m ? 'on' : ''}" title="${f.toFixed(2)} Hz">${n}<br><small>${Math.floor(m / 12) - 1}</small></button>`;
      }).join('');
    }
    grid.onclick = (e) => { const b = e.target.closest('button'); if (!b) return; const m = +b.dataset.m; playing === m ? stop() : play(midiHz(m, +a4.value || 440), m); };
    [a4, oct].forEach((i) => i.addEventListener('input', () => { if (typeof playing === 'number') play(midiHz(playing, +a4.value || 440), playing); else render(); }));
    wave.onchange = () => { if (osc) osc.type = wave.value; };
    hzBtn.onclick = () => { const f = +hzIn.value; if (f >= 20 && f <= 20000) playing === 'hz' ? stop() : play(f, 'hz'); };
    $('tone-stop').onclick = stop;
    render();
  }

  // ---- Calculadora de delay / BPM em ms ----
  if ($('delay')) {
    const bpmIn = $('delay-bpm'), body = $('delay-table');
    const FIG = [['Semibreve', 4], ['Mínima', 2], ['Semínima', 1], ['Colcheia', 1 / 2], ['Semicolcheia', 1 / 4], ['Fusa', 1 / 8], ['Semifusa', 1 / 16]];
    function render() {
      const bpm = Math.min(999, Math.max(1, +bpmIn.value || 120)), beat = 60000 / bpm;
      body.innerHTML = FIG.map(([n, k]) => {
        const ms = beat * k;
        return `<tr><td>${n}</td><td>${fmt(ms)} ms</td><td>${fmt(ms * 1.5)} ms</td><td>${fmt(ms * 2 / 3)} ms</td><td>${(1000 / ms).toFixed(3)} Hz</td></tr>`;
      }).join('');
      $('delay-beat').textContent = `${fmt(beat)} ms`;
    }
    bpmIn.addEventListener('input', render);
    bpmIn.value = +new URLSearchParams(location.search).get('bpm') || bpmIn.value;
    render();
  }

  // ---- Conversor de tempo ----
  if ($('conv')) {
    const v = (id, def) => Math.max(0, +$(id).value || def);
    const mmss = (s) => `${Math.floor(s / 60)} min ${Math.round(s % 60).toString().padStart(2, '0')} s`;
    function render() {
      const bpm = v('conv-bpm', 120) || 120, beats = v('conv-beats', 4) || 4, barSec = beats * 60 / bpm;
      const bars = v('conv-bars', 0), secs = v('conv-min', 0) * 60 + v('conv-sec', 0);
      $('conv-dur').textContent = bars ? mmss(bars * barSec) : '–';
      $('conv-bars-out').textContent = secs ? `${(secs / barSec).toFixed(1)} compassos (${Math.round(secs / 60 * bpm)} batidas)` : '–';
      $('conv-bar').textContent = `${barSec.toFixed(2)} s`;
    }
    $('conv').addEventListener('input', render);
    render();
  }

  // ---- Treino de ritmo: toque junto com o clique e veja o desvio ----
  if ($('rhythm')) {
    const btn = $('rhythm-start'), tapBtn = $('rhythm-tap'), bars = $('rhythm-taps'), status = $('rhythm-status');
    let running = false, t0 = 0, beatLen = 0, nextTime = 0, beat = 0, beatsPer = 4, timer, taps = [];
    function schedule() {
      while (nextTime < ctx.currentTime + 0.1) {
        const bar = Math.floor(beat / beatsPer);
        const mute = $('rhythm-mute').checked && bar >= 2;
        if (!mute) click(nextTime, beat % beatsPer === 0);
        const b = beat;
        setTimeout(() => (status.textContent = `${mute ? 'Silêncio' : 'Clique'} · compasso ${bar + 1}, tempo ${(b % beatsPer) + 1}`), Math.max(0, (nextTime - ctx.currentTime) * 1000));
        nextTime += beatLen; beat++;
      }
    }
    function start() {
      audio();
      const bpm = Math.min(240, Math.max(20, +$('rhythm-bpm').value || 80));
      beatsPer = Math.min(12, Math.max(1, +$('rhythm-beats').value || 4));
      beatLen = 60 / bpm; t0 = ctx.currentTime + 0.3; nextTime = t0; beat = 0; taps = [];
      timer = setInterval(schedule, 25); running = true;
      btn.textContent = 'Parar'; bars.innerHTML = ''; render();
    }
    function stop() { clearInterval(timer); running = false; btn.textContent = 'Iniciar'; status.textContent = ''; }
    btn.onclick = () => (running ? stop() : start());
    function tap() {
      if (!running) return;
      const t = ctx.currentTime - t0 - (+$('rhythm-latency').value || 0) / 1000;
      if (t < -beatLen / 2) return;
      const k = Math.round(t / beatLen), dev = (t - k * beatLen) * 1000;
      taps.push(dev); if (taps.length > 32) taps.shift();
      render();
    }
    tapBtn.onclick = tap;
    document.addEventListener('keydown', (e) => { if (e.code === 'Space' && !e.target.matches('input, button')) { e.preventDefault(); tap(); } });
    function render() {
      const n = taps.length, mean = n ? taps.reduce((a, b) => a + b, 0) / n : 0;
      const sd = n > 1 ? Math.sqrt(taps.reduce((a, b) => a + (b - mean) ** 2, 0) / (n - 1)) : 0;
      const last = n ? taps[n - 1] : 0;
      $('rhythm-last').textContent = n ? `${last > 0 ? '+' : ''}${last.toFixed(0)} ms` : '–';
      $('rhythm-mean').textContent = n ? `${mean > 0 ? '+' : ''}${mean.toFixed(0)} ms` : '–';
      $('rhythm-sd').textContent = n > 1 ? `±${sd.toFixed(0)} ms` : '–';
      $('rhythm-n').textContent = n;
      bars.innerHTML = taps.map((d) => `<span class="${d < 0 ? 'early' : ''}" style="height:${Math.min(68, Math.abs(d))}px" title="${d.toFixed(0)} ms"></span>`).join('');
    }
  }

  // ---- Treino de ouvido: intervalos e acordes ----
  if ($('ear')) {
    const INTERVALS = ['Uníssono', '2ª menor', '2ª maior', '3ª menor', '3ª maior', '4ª justa', 'Trítono', '5ª justa', '6ª menor', '6ª maior', '7ª menor', '7ª maior', '8ª justa'];
    const LEVELS = { basico: [3, 4, 5, 7, 12], medio: [2, 3, 4, 5, 7, 9, 11, 12], todos: INTERVALS.map((_, i) => i) };
    const CHORDS = [['Maior', [0, 4, 7]], ['Menor', [0, 3, 7]], ['Diminuto', [0, 3, 6]], ['Aumentado', [0, 4, 8]], ['Maior com 7ª', [0, 4, 7, 11]], ['Dominante (7ª)', [0, 4, 7, 10]], ['Menor com 7ª', [0, 3, 7, 10]]];
    const mode = $('ear-mode'), level = $('ear-level'), answers = $('ear-answers'), status = $('ear-status');
    let q = null, score = 0, total = 0, locked = false;
    const opts = () => mode.value === 'acordes' ? CHORDS.map(([n], i) => [i, n]) : LEVELS[level.value].map((i) => [i, INTERVALS[i]]);
    function play() {
      audio();
      const t = ctx.currentTime + 0.05, root = 48 + Math.floor(Math.random() * 17);
      if (mode.value === 'acordes') CHORDS[q][1].forEach((s) => tone(midiHz(root + s), t, 1.4, 'triangle', 0.25));
      else { tone(midiHz(root), t, 0.7); tone(midiHz(root + q), t + 0.75, 0.9); }
    }
    function ask() {
      const o = opts(); q = o[Math.floor(Math.random() * o.length)][0]; locked = false;
      answers.innerHTML = o.map(([i, n]) => `<button type="button" data-i="${i}">${n}</button>`).join('');
      status.textContent = 'Qual é?'; play();
    }
    answers.onclick = (e) => {
      const b = e.target.closest('button'); if (!b || locked) return;
      locked = true; total++;
      const ok = +b.dataset.i === q; if (ok) score++;
      b.classList.add(ok ? 'good' : 'bad');
      if (!ok) answers.querySelector(`[data-i="${q}"]`).classList.add('good');
      status.textContent = ok ? 'Certo!' : `Errado. Era ${b.closest('div').querySelector(`[data-i="${q}"]`).textContent}.`;
      $('ear-score').textContent = `${score} / ${total}`;
    };
    $('ear-play').onclick = () => (q === null || locked ? ask() : play());
    $('ear-repeat').onclick = () => (q === null ? ask() : play());
    [mode, level].forEach((s) => (s.onchange = () => { q = null; answers.innerHTML = ''; status.textContent = ''; level.disabled = mode.value === 'acordes'; }));
  }

  // ---- Transpositor de cifras ----
  if ($('transpose')) {
    const SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'], FLAT = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
    const IDX = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
    const CHORD = /^([A-G])(#|b)?([^\/\s]*)(?:\/([A-G])(#|b)?)?$/;
    const SUFFIX = /^(m|M|maj|min|dim|aug|sus|add|º|°|ø|\+|-|\d|\(|\)|#|b|\/|j|M7|maj7)*$/;
    const input = $('transpose-in'), out = $('transpose-out'), semi = $('transpose-semi'), acc = $('transpose-acc');
    const isChord = (t) => { const m = t.match(CHORD); return m && SUFFIX.test(m[3]); };
    const shift = (root, a, n, names) => names[(IDX[root] + (a === '#' ? 1 : a === 'b' ? -1 : 0) + n + 120) % 12];
    function run() {
      const n = +semi.value, names = acc.value === 'b' ? FLAT : SHARP;
      out.textContent = input.value.split('\n').map((line) => {
        const tokens = line.split(/(\s+)/), words = tokens.filter((t) => t.trim());
        if (!words.length || words.filter(isChord).length / words.length < 0.6) return line;
        return tokens.map((t) => {
          const m = t.match(CHORD); if (!m || !SUFFIX.test(m[3])) return t;
          return shift(m[1], m[2], n, names) + m[3] + (m[4] ? '/' + shift(m[4], m[5], n, names) : '');
        }).join('');
      }).join('\n');
    }
    [input, semi, acc].forEach((e) => e.addEventListener('input', run));
    $('transpose-copy').onclick = async () => { try { await navigator.clipboard.writeText(out.textContent); $('transpose-copy').textContent = 'Copiado!'; setTimeout(() => ($('transpose-copy').textContent = 'Copiar'), 1500); } catch {} };
    run();
  }

  // ---- Polirritmia ----
  if ($('poly')) {
    const dotsA = $('poly-dots-a'), dotsB = $('poly-dots-b'), btn = $('poly-start');
    let running = false, timer, nextCycle = 0, cycleLen = 0, events = [];
    const cfg = () => ({ a: Math.min(12, Math.max(2, +$('poly-a').value || 3)), b: Math.min(12, Math.max(2, +$('poly-b').value || 2)), bpm: Math.min(240, Math.max(20, +$('poly-bpm').value || 90)) });
    function render() {
      const { a, b } = cfg();
      dotsA.innerHTML = Array.from({ length: a }, () => '<span class="beat"></span>').join('');
      dotsB.innerHTML = Array.from({ length: b }, () => '<span class="beat"></span>').join('');
      $('poly-label').textContent = `${a} contra ${b}`;
    }
    function hit(time, row, i) {
      if (!$(`poly-mute-${row}`).checked) tone(row === 'a' ? 880 : 440, time, 0.08, 'sine', 0.8);
      setTimeout(() => {
        const dots = (row === 'a' ? dotsA : dotsB).children;
        [...dots].forEach((d, j) => d.classList.toggle('on', j === i));
      }, Math.max(0, (time - ctx.currentTime) * 1000));
    }
    function schedule() {
      const { a, b, bpm } = cfg();
      cycleLen = a * 60 / bpm;
      while (nextCycle < ctx.currentTime + 0.1) {
        for (let i = 0; i < a; i++) events.push([nextCycle + i * cycleLen / a, 'a', i]);
        for (let i = 0; i < b; i++) events.push([nextCycle + i * cycleLen / b, 'b', i]);
        nextCycle += cycleLen;
      }
      events.sort((x, y) => x[0] - y[0]);
      while (events.length && events[0][0] < ctx.currentTime + 0.1) hit(...events.shift());
    }
    btn.onclick = () => {
      if (running) { clearInterval(timer); running = false; btn.textContent = 'Iniciar'; events = []; render(); return; }
      audio(); render(); nextCycle = ctx.currentTime + 0.1; events = [];
      timer = setInterval(schedule, 25); running = true; btn.textContent = 'Parar';
    };
    $('poly').querySelectorAll('[data-poly]').forEach((b) => (b.onclick = () => { [$('poly-a').value, $('poly-b').value] = b.dataset.poly.split(':'); render(); }));
    ['poly-a', 'poly-b'].forEach((id) => $(id).addEventListener('input', render));
    render();
  }

  // ---- Drone ----
  if ($('drone')) {
    const btn = $('drone-start'), note = $('drone-note'), oct = $('drone-oct'), fifth = $('drone-fifth'), rich = $('drone-rich'), vol = $('drone-vol');
    let nodes = [], master;
    note.innerHTML = NOTES.map((n, i) => `<option value="${i}"${i === 9 ? ' selected' : ''}>${n}</option>`).join('');
    const freq = () => midiHz((+oct.value + 1) * 12 + +note.value);
    function build() {
      stop(); audio();
      master = ctx.createGain(); master.gain.setValueAtTime(0, ctx.currentTime); master.gain.linearRampToValueAtTime(+vol.value / 100, ctx.currentTime + 0.4);
      master.connect(ctx.destination);
      const f = freq(), r = +rich.value / 100;
      const parts = [[1, 0.5, -3], [1, 0.5, 3], [2, 0.3 * r, 0], [4, 0.12 * r, 0]];
      if (fifth.checked) parts.push([1.5, 0.3, 0], [3, 0.1 * r, 0]);
      parts.forEach(([mult, g, cents]) => {
        const o = ctx.createOscillator(), gn = ctx.createGain();
        o.type = 'sine'; o.frequency.value = f * mult; o.detune.value = cents; gn.gain.value = g;
        o.connect(gn).connect(master); o.start(); nodes.push(o);
      });
      btn.textContent = 'Parar'; $('drone-hz').textContent = `${NOTES[+note.value]}${oct.value} · ${f.toFixed(2)} Hz`;
    }
    function stop() {
      if (!nodes.length) return;
      master.gain.setTargetAtTime(0, ctx.currentTime, 0.1);
      nodes.forEach((o) => o.stop(ctx.currentTime + 0.5)); nodes = []; btn.textContent = 'Tocar';
    }
    btn.onclick = () => (nodes.length ? stop() : build());
    [note, oct, fifth, rich].forEach((e) => e.addEventListener('change', () => nodes.length && build()));
    vol.addEventListener('input', () => master && master.gain.setTargetAtTime(+vol.value / 100, ctx.currentTime, 0.05));
  }

  // ---- Escalas ----
  if ($('scales')) {
    const SCALES = {
      'Maior (jônio)': [2, 2, 1, 2, 2, 2, 1], 'Menor natural (eólio)': [2, 1, 2, 2, 1, 2, 2], 'Menor harmônica': [2, 1, 2, 2, 1, 3, 1], 'Menor melódica': [2, 1, 2, 2, 2, 2, 1],
      'Dórico': [2, 1, 2, 2, 2, 1, 2], 'Frígio': [1, 2, 2, 2, 1, 2, 2], 'Lídio': [2, 2, 2, 1, 2, 2, 1], 'Mixolídio': [2, 2, 1, 2, 2, 1, 2], 'Lócrio': [1, 2, 2, 1, 2, 2, 2],
      'Pentatônica maior': [2, 2, 3, 2, 3], 'Pentatônica menor': [3, 2, 2, 3, 2], 'Blues': [3, 2, 1, 1, 3, 2], 'Tons inteiros': [2, 2, 2, 2, 2, 2], 'Diminuta (tom-semitom)': [2, 1, 2, 1, 2, 1, 2, 1], 'Cromática': [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    };
    const TRIAD = { '4,3': '', '3,4': 'm', '3,3': 'º', '4,4': '+' }, ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
    const root = $('scale-root'), type = $('scale-type');
    root.innerHTML = NOTES.map((n, i) => `<option value="${i}">${n}</option>`).join('');
    type.innerHTML = Object.keys(SCALES).map((k) => `<option>${k}</option>`).join('');
    let notes = [];
    function render() {
      const r = +root.value, steps = SCALES[type.value];
      notes = [r]; steps.slice(0, -1).forEach((s) => notes.push(notes[notes.length - 1] + s));
      $('scale-notes').innerHTML = notes.map((n, i) => `<span class="pill"><b>${NOTES[n % 12]}</b><small>${i + 1}</small></span>`).join('');
      $('scale-formula').textContent = steps.map((s) => ({ 1: 'ST', 2: 'T', 3: 'T+ST' })[s]).join(' – ');
      if (steps.length === 7) {
        const chords = notes.map((_, i) => {
          const a = (notes[(i + 2) % 7] - notes[i] + 24) % 12, b = (notes[(i + 4) % 7] - notes[(i + 2) % 7] + 24) % 12, q = TRIAD[`${a},${b}`];
          return q == null ? null : [ROMAN[i], NOTES[notes[i] % 12] + q];
        });
        $('scale-chords').innerHTML = chords.map((c) => c ? `<span class="pill"><b>${c[1]}</b><small>${c[0]}</small></span>` : '').join('');
        $('scale-chords-wrap').hidden = false;
      } else $('scale-chords-wrap').hidden = true;
    }
    // ---- Braço: cordas da mais aguda (topo) para a mais grave; shapes = janelas de 5 casas a partir de cada grau na corda mais grave
    const tuning = $('fb-tuning'), labels = $('fb-labels'), posSel = $('fb-pos'), fretsIn = $('fb-frets'), board = $('fretboard');
    const DEG = ['1', '♭2', '2', '♭3', '3', '4', '♭5', '5', '♭6', '6', '♭7', '7'];
    function fretboard() {
      const open = tuning.value.split(',').map(Number), nf = Math.min(24, Math.max(5, +fretsIn.value || 15));
      const r = notes[0] % 12, inScale = new Map(notes.map((n, i) => [n % 12, i]));
      const low = open[0], starts = notes.map((n) => ((n - low) % 12 + 12) % 12).sort((a, b) => a - b);
      const span = notes.length <= 6 ? 3 : 4, prev = posSel.value; // pentatônica cabe em 4 casas; diatônica, em 5
      const shapes = starts.flatMap((f, i) => [0, 12, 24].map((o) => [f + o, i + 1])).filter(([f]) => f + span <= nf).sort((a, b) => a[0] - b[0]); // repete os shapes a cada oitava
      posSel.innerHTML = '<option value="">todas as notas</option>' + shapes.map(([f, i]) => `<option value="${f}">shape ${i} (casa ${f}–${f + span})</option>`).join('');
      if ([...posSel.options].some((o) => o.value === prev)) posSel.value = prev;
      const win = posSel.value === '' ? null : [+posSel.value, +posSel.value + span];
      const fw = 44, sh = 26, x0 = 34, y0 = 22, w = x0 + fw * (nf + 1), h = y0 + sh * open.length + 8;
      let out = '';
      for (let f = 1; f <= nf; f++) out += `<line x1="${x0 + fw * f}" y1="${y0}" x2="${x0 + fw * f}" y2="${y0 + sh * (open.length - 1)}" stroke="var(--line)"/>`;
      out += `<rect x="${x0 - 3}" y="${y0 - 2}" width="5" height="${sh * (open.length - 1) + 4}" fill="currentColor"/>`;
      [3, 5, 7, 9, 12, 15, 17, 19, 21, 24].filter((f) => f <= nf).forEach((f) => { const cx = x0 + fw * f - fw / 2, cy = y0 + sh * (open.length - 1) / 2; out += f % 12 ? `<circle cx="${cx}" cy="${cy}" r="4" fill="var(--line)"/>` : `<circle cx="${cx}" cy="${cy - 10}" r="4" fill="var(--line)"/><circle cx="${cx}" cy="${cy + 10}" r="4" fill="var(--line)"/>`; });
      for (let f = 0; f <= nf; f++) if (f % 2 === 1 || f === 12) out += `<text x="${x0 + fw * f - (f ? fw / 2 : fw / 2 + 10)}" y="${h - 1}" font-size="10" text-anchor="middle" fill="var(--muted)">${f}</text>`;
      [...open].reverse().forEach((o, si) => {
        const y = y0 + sh * si;
        out += `<line x1="${x0}" y1="${y}" x2="${w}" y2="${y}" stroke="currentColor" stroke-width="${1 + (open.length - 1 - si) * 0.3}" opacity=".6"/>`;
        for (let f = 0; f <= nf; f++) {
          const m = o + f, deg = inScale.get(((m % 12) + 12) % 12);
          if (deg == null) continue;
          const dim = win && (f < win[0] || f > win[1]);
          const x = f ? x0 + fw * f - fw / 2 : x0 - 16, tonic = ((m % 12) + 12) % 12 === r;
          const label = labels.value === 'degree' ? DEG[(((m - notes[0]) % 12) + 12) % 12] : NOTES[((m % 12) + 12) % 12];
          out += `<g opacity="${dim ? 0.18 : 1}"><circle cx="${x}" cy="${y}" r="10.5" fill="${tonic ? 'var(--accent)' : 'var(--card)'}" stroke="${tonic ? 'var(--accent)' : 'currentColor'}" stroke-width="1.3"/><text x="${x}" y="${y + 3.5}" font-size="${label.length > 2 ? 8 : 9.5}" font-weight="700" text-anchor="middle" fill="${tonic ? 'var(--accent-fg)' : 'currentColor'}">${label}</text></g>`;
        }
      });
      board.innerHTML = `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="Braço com as notas da escala">${out}</svg>`;
    }
    $('scale-play').onclick = () => { audio(); const t = ctx.currentTime + 0.05; [...notes, notes[0] + 12].forEach((n, i) => tone(midiHz(48 + n), t + i * 0.4, 0.38)); };
    [root, type].forEach((e) => (e.onchange = () => { render(); fretboard(); }));
    [tuning, labels, posSel].forEach((e) => (e.onchange = fretboard));
    fretsIn.addEventListener('input', fretboard);
    render(); fretboard();
  }

  // ---- Leitura rítmica ----
  if ($('reading')) {
    const { PATTERNS, FIGURES, figure } = window.MMFIG;
    const LEVELS = { 1: [0, 0, 0, 11, 1], 2: [0, 0, 1, 1, 11, 12, 13], 3: [0, 1, 1, 2, 3, 4, 11, 12, 13], 4: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13] };
    const sheet = $('reading-sheet'), btn = $('reading-start');
    let bars = [], running = false, timer, nextTime = 0, pos = 0, total = 0;
    const cfg = () => ({ beats: Math.min(6, Math.max(2, +$('reading-beats').value || 4)), nbars: Math.min(8, Math.max(1, +$('reading-bars').value || 2)), bpm: Math.min(200, Math.max(30, +$('reading-bpm').value || 70)) });
    function generate() {
      const { beats, nbars } = cfg(), pool = LEVELS[$('reading-level').value] || LEVELS[2];
      bars = Array.from({ length: nbars }, () => Array.from({ length: beats }, () => pool[Math.floor(Math.random() * pool.length)]));
      sheet.innerHTML = bars.map((bar) => `<span class="bar">${bar.map((p) => `<span class="fig" title="${FIGURES[p].name}">${figure(FIGURES[p])}</span>`).join('')}</span>`).join('');
    }
    function schedule() {
      const { beats, bpm } = cfg(), beatLen = 60 / bpm, cells = sheet.querySelectorAll('.fig');
      while (nextTime < ctx.currentTime + 0.1) {
        if (pos >= total + beats) { stop(); return; }
        const t = nextTime, p = pos;
        if (p < beats) click(t, p === 0); // compasso de contagem
        else {
          const idx = p - beats, pat = PATTERNS[bars[Math.floor(idx / beats)][idx % beats]].split('-').map(Number);
          click(t, idx % beats === 0);
          if ($('reading-play').checked) pat.forEach((on, k) => on && tone(1500, t + k * beatLen / pat.length, 0.05, 'square', 0.3));
          setTimeout(() => cells.forEach((c, j) => c.classList.toggle('on', j === idx)), Math.max(0, (t - ctx.currentTime) * 1000));
        }
        if (p < beats) setTimeout(() => ($('reading-status').textContent = `Contagem: ${p + 1}`), Math.max(0, (t - ctx.currentTime) * 1000));
        else setTimeout(() => ($('reading-status').textContent = ''), Math.max(0, (t - ctx.currentTime) * 1000));
        nextTime += beatLen; pos++;
      }
    }
    function stop() { clearInterval(timer); running = false; btn.textContent = 'Tocar'; sheet.querySelectorAll('.fig').forEach((c) => c.classList.remove('on')); $('reading-status').textContent = ''; }
    btn.onclick = () => {
      if (running) return stop();
      audio(); const { beats } = cfg(); total = bars.length * beats; pos = 0; nextTime = ctx.currentTime + 0.1;
      timer = setInterval(schedule, 25); running = true; btn.textContent = 'Parar';
    };
    $('reading-new').onclick = () => { stop(); generate(); };
    ['reading-beats', 'reading-bars', 'reading-level'].forEach((id) => $(id).addEventListener('change', () => { stop(); generate(); }));
    generate();
  }

  // ---- BPM de arquivo de áudio ----
  if ($('bpmfile')) {
    const status = $('bpmfile-status'), out = $('bpmfile-out');
    // ponytail: envelope de energia + autocorrelação; troque por beat tracking (ex.: Ellis) se precisar de posição das batidas
    function detect(ch, sr) {
      const hop = 512, n = Math.floor(ch.length / hop), env = new Float32Array(n);
      for (let i = 0; i < n; i++) { let s = 0; for (let j = i * hop; j < (i + 1) * hop; j++) s += ch[j] * ch[j]; env[i] = Math.sqrt(s / hop); }
      const onset = new Float32Array(n); let mean = 0;
      for (let i = 1; i < n; i++) { onset[i] = Math.max(0, env[i] - env[i - 1]); mean += onset[i]; }
      mean /= n; for (let i = 0; i < n; i++) onset[i] -= mean;
      const fps = sr / hop, minLag = Math.floor(fps * 60 / 200), maxLag = Math.ceil(fps * 60 / 60);
      const ac = new Float32Array(maxLag + 1);
      for (let lag = minLag; lag <= maxLag; lag++) { let s = 0; for (let i = lag; i < n; i++) s += onset[i] * onset[i - lag]; ac[lag] = s / (n - lag); }
      // pente harmônico: um lag bom também tem pico no dobro e na metade
      const score = (lag) => ac[lag] + 0.5 * (ac[lag * 2] || 0) + 0.5 * (ac[Math.round(lag / 2)] || 0);
      const cands = [];
      for (let lag = minLag + 1; lag < maxLag; lag++) if (ac[lag] > ac[lag - 1] && ac[lag] >= ac[lag + 1]) cands.push([score(lag), lag]);
      cands.sort((a, b) => b[0] - a[0]);
      return cands.slice(0, 3).map(([sc, lag]) => {
        const y1 = ac[lag - 1], y2 = ac[lag], y3 = ac[lag + 1], d = (y1 + y3 - 2 * y2) / 2, l = d ? lag - (y3 - y1) / (4 * d) : lag;
        return { bpm: 60 * fps / l, conf: sc / (cands[0][0] || 1) };
      });
    }
    $('bpmfile-in').onchange = async (e) => {
      const file = e.target.files[0]; if (!file) return;
      status.textContent = 'Decodificando…'; out.innerHTML = '';
      try {
        audio();
        const buf = await ctx.decodeAudioData(await file.arrayBuffer());
        const sr = buf.sampleRate, len = Math.min(buf.length, sr * 120), mono = new Float32Array(len);
        for (let c = 0; c < buf.numberOfChannels; c++) { const d = buf.getChannelData(c); for (let i = 0; i < len; i++) mono[i] += d[i] / buf.numberOfChannels; }
        status.textContent = 'Analisando…';
        await new Promise((r) => setTimeout(r, 30));
        const res = detect(mono, sr);
        if (!res.length) { status.textContent = 'Não encontrei um pulso claro. Tente um trecho com bateria ou percussão.'; return; }
        const best = res[0].bpm;
        out.innerHTML = `<div class="big"><span>${best.toFixed(1)}</span><small>BPM estimado</small></div>
          <p class="status">Alternativas: ${res.slice(1).map((r) => r.bpm.toFixed(1)).join(' · ') || '–'} · metade ${(best / 2).toFixed(1)} · dobro ${(best * 2).toFixed(1)}</p>
          <div class="controls"><a class="button" href="/?bpm=${Math.round(best)}">Abrir o metrônomo em ${Math.round(best)} BPM</a></div>`;
        status.textContent = `${file.name} · ${Math.round(buf.duration)} s analisados${buf.duration > 120 ? ' (primeiros 2 min)' : ''}`;
      } catch (err) { status.textContent = 'Não consegui ler este arquivo. Use MP3, WAV, OGG, M4A ou FLAC.'; }
    };
  }
})();
