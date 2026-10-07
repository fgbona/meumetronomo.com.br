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
})();
