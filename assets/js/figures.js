(() => {
  // ---- Figuras musicais das subdivisões (SVG). l: 0 semínima, 1 colcheia, 2 semicolcheia; d: pontuada; r: pausa de colcheia; t: número da quiáltera
  // Padrões de subdivisão por batida ('1' toca, '0' cala) e as figuras correspondentes; os 11 primeiros vão para o metrônomo
  const PATTERNS = ['1', '1-1', '1-1-1', '1-1-1-1', '1-0-0-1', '1-1-0-0', '1-0-1-0-1-1', '1-1-1-0-1-0', '1-0-1-1-1-0', '1-0-0-1-1-1', '1-1-1-1-0-0', '0', '0-1', '1-0'];
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
    { n: [{ r: 2 }], name: 'Pausa de semínima' },
    { n: [{ r: 1 }, { l: 1 }], name: 'Pausa de colcheia e colcheia' },
    { n: [{ l: 1 }, { r: 1 }], name: 'Colcheia e pausa de colcheia' },
  ];
  function figure({ n, t }) {
    const step = 17, x0 = 9, head = 36, top = 12, w = x0 + n.length * step + 2;
    let out = '';
    const sx = (i) => x0 + i * step + 5; // x da haste
    const notes = n.map((o, i) => ({ ...o, i })).filter((o) => !o.r);
    n.forEach((o, i) => {
      const cx = x0 + i * step;
      if (o.r === 2) { // pausa de semínima
        out += `<path d="M${cx - 2} ${top + 2} l5 7 -5 6 q6 6 2 12 q-7 -5 -3 -9 l3 -3 -5 -7z" fill="currentColor"/>`;
        return;
      }
      if (o.r) { // pausa de colcheia
        out += `<path d="M${cx - 3} ${top + 10} q4 4 8 0 l-4 14" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="${cx - 3}" cy="${top + 10}" r="1.8"/>`;
        return;
      }
      out += `<ellipse cx="${cx}" cy="${head}" rx="5.2" ry="3.6" transform="rotate(-22 ${cx} ${head})"/>`;
      out += `<rect x="${sx(i) - 0.8}" y="${top}" width="1.6" height="${head - top}"/>`;
      if (o.d) out += `<circle cx="${cx + 8}" cy="${head - 2}" r="1.5"/>`;
      if (o.l && notes.length === 1) out += `<path d="M${sx(i)} ${top} q8 6 4 14" fill="none" stroke="currentColor" stroke-width="2"/>`;
    });
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
  window.MMFIG = { PATTERNS, FIGURES, figure };
})();
