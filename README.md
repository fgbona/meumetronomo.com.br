# Meu Metrônomo

Metrônomo e ferramentas para músicos em https://meumetronomo.com.br — site estático gerado com [Hugo](https://gohugo.io) (versão padrão, sem SASS).

- `hugo.toml` — configuração
- `content/_index.md` — home (metrônomo); `content/*.md` — artigos (`type: artigo`), ferramentas (`type: ferramenta`, `tool: <nome>`) e páginas institucionais
- `layouts/index.html` + `partials/metronome*.html` — home com o widget do metrônomo
- `layouts/ferramenta/single.html` + `partials/tools/<nome>.html` — páginas de ferramenta (afinador, diapasão, delay, conversor, ritmo, ouvido)
- `assets/css/style.css` — tema claro/escuro (entra inline no HTML, minificado)
- `assets/js/app.js` — metrônomo: Web Audio com agendamento lookahead, tap BPM, subdivisões, temporizador, trainer de velocidade, compassos mudos, sons, flash, ajustes salvos e presets (localStorage)
- `assets/js/tools.js` — afinador (autocorrelação), gerador de tom, calculadora de delay, conversor, treino de ritmo e de ouvido
- `assets/js/theme.js` — alternância de tema (em todas as páginas)

Desenvolver: `hugo server` e abrir http://localhost:1313. Publicar: `./deploy.sh` (gera em `public/` e avisa o IndexNow).

Testar: `hugo && npm i --no-save jsdom && node test/smoke.js` (teste de fumaça em jsdom do metrônomo e das ferramentas).
