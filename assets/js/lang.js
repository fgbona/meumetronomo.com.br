// Seleção automática de idioma: só na primeira visita (sem escolha salva), só em páginas com tradução,
// só para navegadores em inglês ou português, e nunca para robôs de busca.
(() => {
  const h = document.documentElement, cur = h.dataset.lang, alt = h.dataset.alt;
  if (!alt) return;
  try { if (localStorage.lang) return; } catch { return; }
  if (/bot|crawl|spider|slurp|bingpreview|lighthouse|headless/i.test(navigator.userAgent)) return;
  const b = ((navigator.languages && navigator.languages[0]) || navigator.language || '').slice(0, 2).toLowerCase();
  const want = b === 'en' ? 'en' : b === 'pt' ? 'pt-br' : '';
  if (!want || want === cur) return;
  try { localStorage.lang = want; } catch {}
  location.replace(alt);
})();
