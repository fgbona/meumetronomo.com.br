---
title: "Transpositor de acordes e cifras online"
date: 2026-10-07T20:28:35-03:00
description: "Cole a cifra, escolha quantos semitons subir ou descer e receba a cifra transposta. Reconhece baixo invertido, sétimas e extensões. Para capotraste e voz."
lead: Cole a cifra à esquerda e escolha quantos semitons transpor. As linhas de letra ficam como estão; só os acordes mudam.
type: ferramenta
weight: 40
tool: transpositor
menu: "Transpositor de acordes"
faq:
  - q: "Como transpor uma cifra para o meu tom de voz?"
    a: "Cante a música com a cifra original e veja se está alta ou baixa demais. Se a voz força nos agudos, desça 1 ou 2 semitons e teste de novo; se perde o grave, suba. Cada semitom é uma casa no violão. A maioria das vozes encontra o tom confortável dentro de 3 semitons para cima ou para baixo."
  - q: "Como usar o transpositor com capotraste?"
    a: "O capotraste sobe o tom sem mudar os desenhos dos acordes. Para tocar uma música em Si bemol com os acordes de Sol, transponha a cifra 3 semitons para baixo (Si bemol vira Sol) e coloque o capotraste na casa 3. A regra: capotraste na casa N equivale a transpor −N semitons."
  - q: "Quais acordes o transpositor reconhece?"
    a: "Qualquer acorde escrito em cifra americana (C, D, E, F, G, A, B) com sustenido ou bemol, seguido de sufixos como m, 7, maj7, 7M, m7, sus4, add9, dim, º, aug, +, 9, 11, 13, 7(b5), e com baixo invertido como D/F#. Linhas em que menos de 60% das palavras são acordes são tratadas como letra e não mudam."
  - q: "Sustenidos ou bemóis?"
    a: "Os dois nomes indicam a mesma nota (C# e Db). A convenção é usar sustenidos em tons com sustenidos (G, D, A, E, B) e bemóis em tons com bemóis (F, Bb, Eb, Ab). Se não sabe, escolha o que fica mais fácil de ler."
---

## Como funciona

O transpositor lê a cifra linha por linha. Em cada linha, conta quantas palavras são acordes válidos; se a maioria for, a linha é tratada como linha de acordes e cada acorde é deslocado pelo número de semitons escolhido. O sufixo (m7, sus4, 7M) e o baixo invertido (/F#) acompanham a transposição. As linhas de letra e as marcações entre colchetes, como [Intro] e [Refrão], ficam intactas.

## Tabela de transposição

| Semitons | Exemplo | Uso comum |
|---|---|---|
| +1 | C → C# | Ajuste fino para a voz |
| +2 | C → D | Um tom acima, muito comum em karaokê |
| +3 | C → Eb | Capotraste na casa 3 com acordes de C |
| +5 | C → F | Capotraste na casa 5 |
| −2 | C → Bb | Tom de instrumentos em Si bemol (trompete, sax tenor, clarinete) |
| −3 | C → A | Tom de instrumentos em Lá (clarinete em Lá) |
| +3 | C → Eb | Tom de instrumentos em Mi bemol (sax alto, sax barítono) |
| ±12 | C → C | Mesma nota, uma oitava acima ou abaixo |

## Capotraste: qual casa usar

Escolha o tom em que a música precisa soar e o desenho de acordes que quer tocar. A diferença em semitons é a casa do capotraste.

| Soa em | Acordes de C | Acordes de D | Acordes de E | Acordes de G | Acordes de A |
|---|---|---|---|---|---|
| D | casa 2 | 0 | – | – | casa 5 |
| Eb | casa 3 | casa 1 | – | – | casa 6 |
| E | casa 4 | casa 2 | 0 | – | casa 7 |
| F | casa 5 | casa 3 | casa 1 | – | – |
| G | casa 7 | casa 5 | casa 3 | 0 | – |
| A | – | casa 7 | casa 5 | casa 2 | 0 |
| Bb | – | – | casa 6 | casa 3 | casa 1 |
| C | 0 | – | – | casa 5 | casa 3 |

Para encontrar o desenho, transponha a cifra original para baixo pelo número da casa. Depois de transpor, confira a afinação com o [afinador](/afinador/) e marque o andamento no [metrônomo](/).
