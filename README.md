# Meu Metrônomo

Metrônomo online em https://meumetronomo.com.br — site estático gerado com [Hugo](https://gohugo.io) (versão padrão, sem SASS).

- `hugo.toml` — configuração
- `layouts/index.html` — página única (widget do metrônomo)
- `content/_index.md` — textos da página (markdown)
- `static/css/style.css` — tema claro/escuro
- `static/js/app.js` — metrônomo com Web Audio (agendamento com lookahead), tap BPM, subdivisões, temporizador

Desenvolver: `hugo server` e abrir http://localhost:1313. Publicar: `hugo` gera o site em `public/`.
