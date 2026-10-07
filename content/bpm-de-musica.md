---
title: "Descobrir o BPM de uma música: analisador de arquivo de áudio"
description: "Envie um MP3, WAV ou outro arquivo de áudio e descubra o BPM da música. A análise roda no navegador, sem upload. Mostra o andamento estimado, alternativas em metade e dobro e abre o metrônomo no BPM encontrado."
lead: Escolha um arquivo de áudio do seu aparelho. A análise acontece no navegador, em segundos, e nada é enviado.
type: ferramenta
weight: 120
tool: bpmfile
menu: "BPM de uma música"
faq:
  - q: "Como o site descobre o BPM?"
    a: "Ele mede a energia do som em fatias de cerca de 10 milissegundos, detecta os picos (ataques de bateria, baixo, palmas) e procura o intervalo que melhor se repete entre eles, com um método chamado autocorrelação. O intervalo mais forte, convertido em batidas por minuto, é o BPM estimado."
  - q: "O resultado deu o dobro ou a metade do que eu esperava. Por quê?"
    a: "É a ambiguidade clássica da detecção de andamento: uma música a 80 BPM com colcheias marcadas tem picos a cada 375 ms, o mesmo de uma a 160 BPM em semínimas. Por isso mostramos a metade e o dobro. Use o Tap BPM do metrônomo batendo no pulso que você sente para decidir."
  - q: "Funciona com qualquer música?"
    a: "Funciona melhor com música que tem percussão ou pulso claro: pop, rock, eletrônica, samba, forró. Em música clássica, baladas só com voz e piano, ou gravações com andamento variável (rubato), o resultado pode ficar impreciso ou sem pulso definido."
  - q: "O arquivo é enviado para algum servidor?"
    a: "Não. O arquivo é lido e analisado inteiramente no seu navegador com a Web Audio API. Nada é enviado, armazenado ou guardado. Músicas longas são analisadas nos primeiros dois minutos."
---

## Como usar

1. **Clique em "Escolher arquivo de áudio"** e selecione uma música do celular ou do computador. Formatos aceitos: MP3, WAV, OGG, M4A/AAC e FLAC, dependendo do navegador.
2. **Aguarde alguns segundos.** O site decodifica o arquivo e calcula o andamento.
3. **Leia o resultado.** O número grande é o BPM mais provável. As alternativas são outros picos encontrados. Se o valor parecer rápido ou lento demais, considere a metade ou o dobro.
4. **Abra o metrônomo** no BPM encontrado e toque junto com a música para confirmar.

## Quando o resultado não bate

- **Música com swing ou shuffle** pode dar um valor intermediário. Use o Tap BPM do [metrônomo](/) para conferir.
- **Introduções sem bateria** pesam pouco na análise, mas se a música inteira é suave, o pulso pode não ser encontrado. Experimente um trecho recortado só do refrão.
- **Andamento que muda** ao longo da música (acelerando, ritardando, seções em outro tempo) produz uma média que não corresponde a nenhuma seção.
- **Arquivos muito comprimidos** ou com volume baixíssimo têm picos menos definidos. Normalize o volume antes, se puder.

## Para que serve saber o BPM

- **Tirar a música de ouvido** no andamento certo, com o metrônomo marcando.
- **Montar setlists e playlists** com transições de andamento suaves. DJs e professores de dança usam faixas de BPM para organizar o repertório.
- **Sincronizar efeitos** no estúdio: delay, LFO e compressão em tempo. A [calculadora de delay](/calculadora-de-delay/) converte o BPM em milissegundos.
- **Comparar versões** de uma mesma música e entender por que uma soa mais arrastada ou mais urgente.

Para entender o que o número significa e como contá-lo manualmente, leia [O que é BPM](/o-que-e-bpm/). A [tabela de BPM por estilo](/bpm-por-estilo/) ajuda a checar se o resultado faz sentido para o gênero.
