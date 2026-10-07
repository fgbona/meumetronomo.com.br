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
