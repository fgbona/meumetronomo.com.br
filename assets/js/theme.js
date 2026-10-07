(() => {
  const root = document.documentElement, btn = document.getElementById('theme');
  try { if (localStorage.theme) root.dataset.theme = localStorage.theme; } catch {}
  if (!btn) return;
  btn.onclick = () => {
    const dark = root.dataset.theme ? root.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
    root.dataset.theme = dark ? 'light' : 'dark';
    try { localStorage.theme = root.dataset.theme; } catch {}
  };
})();
// Fecha o menu ao clicar fora ou apertar Esc
document.addEventListener('click', (e) => document.querySelectorAll('details.menu[open]').forEach((d) => { if (!d.contains(e.target)) d.open = false; }));
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') document.querySelectorAll('details.menu[open]').forEach((d) => (d.open = false)); });
