---
title: "Calculadora de delay: BPM em milissegundos"
description: "Converte BPM em milissegundos para cada figura musical (semínima, colcheia, semicolcheia, pontuada, tercina) e em Hz para LFO. Para delay, reverb, compressor e sidechain sincronizados com a música."
lead: Digite o BPM da música. A tabela mostra o tempo de cada figura em milissegundos e a frequência correspondente para LFO.
type: ferramenta
tool: delay
faq:
  - q: "Como calcular o delay a partir do BPM?"
    a: "Divida 60.000 pelo BPM para obter a duração de uma batida (semínima) em milissegundos. A 120 BPM, uma batida dura 500 ms; uma colcheia, 250 ms; uma semicolcheia, 125 ms. A calculadora faz essa conta para todas as figuras, incluindo pontuadas e tercinas."
  - q: "O que é delay pontuado?"
    a: "É o delay com tempo de colcheia pontuada, igual a três semicolcheias (375 ms a 120 BPM). É o efeito clássico das guitarras do U2 e de muita música eletrônica: as repetições caem fora do pulso e criam uma sensação de movimento sem embolar a nota original."
  - q: "Para que serve a coluna LFO?"
    a: "Efeitos como tremolo, chorus, auto-pan e filtros modulados têm a velocidade medida em Hz, não em milissegundos. A coluna mostra a frequência que completa um ciclo exatamente na duração daquela figura. Uma semínima a 120 BPM equivale a 2 Hz."
  - q: "Posso usar os valores no compressor e no reverb?"
    a: "Sim. No compressor, um release igual a uma semicolcheia ou colcheia faz o 'bombeamento' acompanhar o groove. No reverb, um pre-delay de uma fusa ou semifusa (30 a 60 ms) separa o som direto da cauda sem perder o tempo."
---

## Como usar a tabela

A linha **Semínima** é a batida do metrônomo. As figuras acima dela são múltiplos (mínima = 2 batidas, semibreve = 4) e as abaixo são divisões (colcheia = metade, semicolcheia = um quarto).

- **Normal** é o valor da figura.
- **Pontuada** é a figura mais a metade dela (×1,5).
- **Tercina** é um terço de duas figuras (×2/3): três notas no espaço de duas.
- **LFO** é a frequência em Hz que completa um ciclo na duração da figura.

## Valores de referência

| BPM | Semínima | Colcheia | Semicolcheia | Colcheia pontuada |
|---|---|---|---|---|
| 80 | 750 ms | 375 ms | 187,5 ms | 562,5 ms |
| 90 | 666,7 ms | 333,3 ms | 166,7 ms | 500 ms |
| 100 | 600 ms | 300 ms | 150 ms | 450 ms |
| 110 | 545,5 ms | 272,7 ms | 136,4 ms | 409,1 ms |
| 120 | 500 ms | 250 ms | 125 ms | 375 ms |
| 128 | 468,8 ms | 234,4 ms | 117,2 ms | 351,6 ms |
| 140 | 428,6 ms | 214,3 ms | 107,1 ms | 321,4 ms |
| 174 | 344,8 ms | 172,4 ms | 86,2 ms | 258,6 ms |

## Onde usar

- **Delay sincronizado.** Na maioria dos pedais e plugins basta ligar o "tempo sync", mas em pedais analógicos e em gravadores de fita o tempo é ajustado em ms. Use a tabela e confira de ouvido.
- **Reverb.** Pre-delay de semifusa a fusa mantém a clareza. Decay igual a um compasso (4 semínimas) faz a cauda terminar junto com a frase.
- **Compressor com sidechain.** Release igual a uma semicolcheia ou colcheia dá o efeito de "bombeamento" no tempo, comum em house e pop.
- **Gate e tremolo.** Tremolo em colcheias ou semicolcheias usa a coluna LFO. Gates rítmicos funcionam melhor com valores de semicolcheia pontuada, que criam padrões deslocados.

Não sabe o BPM da música? Use o Tap BPM do [metrônomo online](/) ou leia [O que é BPM](/o-que-e-bpm/). Para converter compassos em minutos, use o [conversor de tempo](/conversor-de-tempo/).
