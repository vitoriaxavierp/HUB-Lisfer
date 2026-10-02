---
name: Hub Lisfer
description: Ferramenta interna da operação Lisfer/Lalfer. Preto Lisfer e amarelo #F5AD00, um só sistema visual em modo operação.
colors:
  brand: "#F5AD00"
  brand-hover: "#E09E00"
  brand-ink: "#1F1500"
  brand-soft: "#FFF5DB"
  brand-text: "#8A5A00"
  ink: "#111315"
  ink-2: "#1B1E21"
  ink-3: "#272B30"
  ink-line: "rgba(255, 255, 255, 0.08)"
  ink-text: "#E6E8EA"
  ink-muted: "#9AA1A8"
  bg: "#F3F4F6"
  surface: "#FFFFFF"
  surface-2: "#F7F8F9"
  surface-3: "#EEF0F3"
  border: "#E1E4E8"
  border-strong: "#C9CED4"
  text: "#14181C"
  text-2: "#49525C"
  text-3: "#646D77"
  success: "#1B7A3A"
  success-soft: "#E2F2E7"
  danger: "#C2262E"
  danger-hover: "#A91F26"
  danger-soft: "#FCE9EA"
  info: "#1E5BC6"
  info-soft: "#E4ECFB"
  warning-text: "#8A5A00"
  warning-soft: "#FFF5DB"
typography:
  display:
    fontFamily: "Archivo, IBM Plex Sans, system-ui, sans-serif"
    fontSize: "24px"
    fontWeight: 800
    lineHeight: 1.25
    letterSpacing: "-0.01em"
  numeral:
    fontFamily: "Archivo, IBM Plex Sans, system-ui, sans-serif"
    fontSize: "24px"
    fontWeight: 800
    lineHeight: 1.1
    fontFeature: "tnum"
  title:
    fontFamily: "IBM Plex Sans, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "15px"
    fontWeight: 600
    lineHeight: 1.25
  body:
    fontFamily: "IBM Plex Sans, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.5
  body-sm:
    fontFamily: "IBM Plex Sans, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.45
  label:
    fontFamily: "IBM Plex Sans, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "13px"
    fontWeight: 500
    lineHeight: 1.5
  caption:
    fontFamily: "IBM Plex Sans, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "12px"
    fontWeight: 600
    lineHeight: 1.5
  data:
    fontFamily: "IBM Plex Mono, ui-monospace, Cascadia Mono, Consolas, monospace"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.5
    fontFeature: "tnum"
rounded:
  xs: "4px"
  sm: "6px"
  md: "8px"
  lg: "12px"
  pill: "999px"
spacing:
  s-1: "4px"
  s-2: "8px"
  s-3: "12px"
  s-4: "16px"
  s-5: "20px"
  s-6: "24px"
  s-8: "32px"
  s-10: "40px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.surface}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "0 16px"
    height: "38px"
  button-primary-hover:
    backgroundColor: "#000000"
  button-primary-active:
    backgroundColor: "{colors.ink-3}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.md}"
    padding: "0 16px"
    height: "38px"
  button-secondary-hover:
    backgroundColor: "{colors.surface-2}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.text-2}"
    rounded: "{rounded.md}"
    padding: "0 16px"
    height: "38px"
  button-ghost-hover:
    backgroundColor: "{colors.surface-3}"
    textColor: "{colors.text}"
  button-sm:
    rounded: "{rounded.sm}"
    padding: "0 10px"
    height: "30px"
  button-lg:
    padding: "0 20px"
    height: "44px"
  icon-button:
    backgroundColor: "transparent"
    textColor: "{colors.text-3}"
    rounded: "{rounded.md}"
    size: "32px"
  icon-button-confirming:
    backgroundColor: "{colors.danger}"
    textColor: "{colors.surface}"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "0 12px"
    height: "38px"
  input-disabled:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.text-3}"
  segmented:
    backgroundColor: "{colors.surface-3}"
    rounded: "{rounded.md}"
    padding: "3px"
  segmented-option-active:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.sm}"
    height: "30px"
  panel:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.lg}"
    padding: "20px"
  panel-foot:
    backgroundColor: "{colors.surface-2}"
    padding: "14px 20px"
  badge:
    backgroundColor: "{colors.surface-3}"
    textColor: "{colors.text-2}"
    typography: "{typography.caption}"
    rounded: "{rounded.pill}"
    padding: "0 8px"
    height: "22px"
  badge-pending:
    backgroundColor: "{colors.warning-soft}"
    textColor: "{colors.warning-text}"
  badge-success:
    backgroundColor: "{colors.success-soft}"
    textColor: "{colors.success}"
  badge-danger:
    backgroundColor: "{colors.danger-soft}"
    textColor: "{colors.danger}"
  count-pill:
    backgroundColor: "{colors.surface-3}"
    textColor: "{colors.text-2}"
    rounded: "{rounded.pill}"
    padding: "0 7px"
    height: "20px"
  table-header:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.text-3}"
    typography: "{typography.caption}"
    padding: "10px 14px"
  sidebar:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.ink-text}"
    width: "240px"
  nav-link:
    textColor: "{colors.ink-text}"
    rounded: "{rounded.md}"
    padding: "0 10px"
    height: "36px"
  nav-link-hover:
    backgroundColor: "{colors.ink-2}"
  nav-link-active:
    backgroundColor: "{colors.ink-3}"
    textColor: "{colors.surface}"
  avatar:
    backgroundColor: "{colors.brand}"
    textColor: "{colors.brand-ink}"
    rounded: "{rounded.pill}"
    size: "32px"
  toast:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.surface}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.md}"
    padding: "12px 16px"
  status-circle-pending:
    backgroundColor: "{colors.brand-soft}"
    rounded: "{rounded.pill}"
    size: "32px"
  status-circle-done:
    backgroundColor: "{colors.success}"
    textColor: "{colors.surface}"
    rounded: "{rounded.pill}"
    size: "32px"
  result-highlight:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.surface}"
    rounded: "{rounded.md}"
    padding: "14px 16px"
---

# Design System: Hub Lisfer

## Overview

**Creative North Star: "O Quadro do Turno"**

O Hub é o quadro que a equipe da Lisfer olha o dia inteiro: o que foi lançado de manhã precisa estar legível, com dono e horário, para quem chega à tarde. Por isso o sistema é de **modo operação**: denso na medida do escritório (mesa, monitor, mouse e teclado), calmo, sem ornamento, e com a identidade preta e amarela da Lisfer aplicada com disciplina em vez de espalhada pela tela.

A estrutura é sempre a mesma: um menu lateral escuro e agrupado (preto Lisfer) à esquerda e uma área de conteúdo clara (`--bg`) onde o **painel branco** é o único tipo de container. A cor é contida: a tinta preta é a ação principal, o amarelo marca o lugar onde você está, o foco sobre o fundo escuro e o que está **pendente**; o verde quer dizer **coletado**. Números e códigos (NF, SKU, PI, CPF/CNPJ) aparecem em fonte mono, para serem lidos e conferidos sem esforço.

A assinatura do sistema é o **círculo de status das Coletas** (anel amarelo que vira um check verde, com um "pop" de 260ms ao dar baixa) e as **confirmações por toast**: toda ação que grava algo responde com uma frase curta, em português, dizendo o que aconteceu.

**Key Characteristics:**
- Menu lateral escuro e agrupado + conteúdo claro com painéis brancos; um shell idêntico em todas as páginas.
- Archivo 800 só para título de página e números grandes; IBM Plex Sans para a interface; IBM Plex Mono para dados.
- Tinta (#111315) é a ação principal; amarelo (#F5AD00) é posição, foco no escuro e pendência; verde é concluído.
- Foco sempre visível: contorno de 2px (tinta no claro, amarelo no menu escuro).
- Ícones de traço único 24x24 vindos de `HubIcons`; nunca emoji.
- Estados honestos: carregando (skeleton/spinner), vazio, erro e confirmação em toast.

## Colors

Uma paleta quase neutra, com o preto Lisfer como estrutura e o amarelo Lisfer como sinal raro.

### Primary
- **Preto Lisfer / Tinta** (`--ink`): fundo do menu lateral, da barra superior compacta, do botão principal, do toast e do bloco de resultado das calculadoras. É a cor da ação: se um botão é preto, é a coisa principal da tela.
- **Tinta 2 e Tinta 3** (`--ink-2`, `--ink-3`): hover e item ativo no menu escuro; `--ink-3` também é o estado `:active` do botão principal.
- **Texto e apoio sobre tinta** (`--ink-text`, `--ink-muted`, `--ink-line`): texto do menu, títulos de grupo e ícones em repouso, e divisórias finas sobre o escuro.

### Secondary
- **Amarelo Lisfer** (`--brand`): item ativo do menu (barra de 3px à esquerda + ícone amarelo), contorno de foco no menu escuro, avatar do usuário, ponto e anel de "pendente", ícone do toast de sucesso, seleção de texto. Nunca é cor de botão principal.
- **Amarelo suave** (`--brand-soft`): fundo do círculo pendente, halo do ponto pendente, etiqueta "hoje".
- **Amarelo legível** (`--brand-text`, igual a `--warning-text`): o "amarelo" que funciona como texto sobre branco (contraste AA). Use este, nunca `--brand`, para texto amarelo em superfície clara.
- **Tinta sobre amarelo** (`--brand-ink`): texto sobre fundo amarelo (avatar, seleção).

### Tertiary
- **Verde coletado** (`--success`, `--success-soft`): concluído/coletado, "baixa por…", situação "OK" nas listas.
- **Vermelho** (`--danger`, `--danger-hover`, `--danger-soft`): erro, campo obrigatório (`*`), exclusão em confirmação, atraso, prejuízo.
- **Azul informativo** (`--info`, `--info-soft`): avisos neutros e o status "aguardando embarque" da Importação.
- **Pendência** (`--warning-text`, `--warning-soft`): selo pendente, "em trânsito", destaque "a comprar".

### Neutral
- **Fundo da aplicação** (`--bg`): a área de conteúdo atrás dos painéis.
- **Superfície** (`--surface`): painéis, campos, botão secundário.
- **Superfície 2** (`--surface-2`): cabeçalho de tabela, rodapé de painel, hover de linha, campo desabilitado.
- **Superfície 3** (`--surface-3`): selo neutro, contador, controle segmentado, observação de coleta, hover de botão fantasma.
- **Bordas** (`--border`, `--border-strong`): `--border` para divisórias de painel e linhas de tabela; `--border-strong` para contorno de campos e botão secundário.
- **Texto** (`--text`, `--text-2`, `--text-3`): principal, secundário (rótulos, descrições) e terciário (metadados, cabeçalhos de tabela, placeholders de apoio).

### Named Rules
**A Regra da Tinta.** A tinta preta é reservada à ação principal. Uma área de ação tem no máximo um botão preto; o resto é secundário, fantasma ou link.

**A Regra do Amarelo Raro.** O amarelo só significa três coisas: "você está aqui" (menu), "foco sobre o escuro" e "pendente". Se não é nenhuma das três, não é amarelo.

**A Regra Verde = Coletado.** Verde é reservado para o que foi concluído. Não use verde para decorar nem como cor de botão.

## Typography

**Display Font:** Archivo 800 (com fallback para IBM Plex Sans)
**Body Font:** IBM Plex Sans (com system-ui, -apple-system, Segoe UI, Roboto)
**Label/Mono Font:** IBM Plex Mono (com ui-monospace, Cascadia Mono, Consolas)

**Character:** Archivo pesado dá a voz firme da marca nos poucos lugares em que ela fala alto; Plex Sans é neutra e técnica para o trabalho do dia; Plex Mono deixa códigos e documentos conferíveis caractere a caractere.

Carregamento (igual em todas as páginas): Google Fonts com `Archivo:wght@700;800`, `IBM Plex Mono:wght@400;500` e `IBM Plex Sans:wght@400;500;600;700`.

### Hierarchy
- **Display** (Archivo 800, `--fs-2xl` 24px, line-height 1.25, -0.01em): só o `h1.page-title` de cada página (20px abaixo de 900px). Na tela de login, o título do painel escuro usa 34px e o "Entrar" 24px.
- **Numeral** (Archivo 800, 24–34px, line-height 1–1.2, números tabulares): números grandes de resumo: contagens da Importação, fatos da Lista de Compras, "dias para chegar" no Início, valor do resultado nas calculadoras (28px). Quantidade a comprar na tabela usa `--fs-lg` 17px.
- **Title** (Plex Sans 600, `--fs-md` 15px): título de painel (`.panel-head h2`), nome do cliente na coleta, nome de ferramenta. Nos cartões de calculadora o título é Archivo 800 17px.
- **Body** (Plex Sans 400, `--fs-base` 14px, line-height 1.5): texto padrão, campos, botões (600). Descrição de página em 15px, `--text-2`, até 68ch.
- **Body-sm** (Plex Sans, `--fs-sm` 13px): tabelas, metadados, alertas, toasts.
- **Label** (Plex Sans 500, 13px, `--text-2`): rótulo de campo, sempre acima do campo.
- **Caption** (Plex Sans 600, `--fs-xs` 12px): selos, contadores, cabeçalhos de tabela (`--text-3`). `--fs-2xs` 11px só para títulos de grupo do menu, rótulos sobre números e o selo "HUB".
- **Data** (Plex Mono 400–500, 0.93em ou 12–13px): NF, SKU, PI, CPF/CNPJ, telefone, datas no seletor de dia, área de itens da Importação.

### Named Rules
**A Regra do Archivo Escasso.** Archivo 800 aparece apenas em títulos de página, títulos de cartão de calculadora e números grandes. Nunca em botões, rótulos, tabelas ou parágrafos.

**A Regra do Dado em Mono.** Todo identificador conferível (NF, SKU, PI, CPF/CNPJ, telefone, número de pedido em campo) usa `.mono`/`--font-mono`. Placeholders continuam em sans, mesmo em campos mono (`.input.mono::placeholder` volta para `--font-sans`).

**A Regra Sem Caixa-Alta.** Títulos de grupo, cabeçalhos de tabela e selos ficam em caixa normal, sem `text-transform: uppercase` e sem espaçamento largo.

## Layout

- **Shell:** `.app` em flex; menu lateral fixo (`position: sticky`) de `--sidebar-w` 240px, altura 100vh; `.app-main` ocupa o resto.
- **Página:** `main.page` com largura máxima `--content-max` 1240px, centralizada, padding 28px 32px 56px (20px 16px 48px abaixo de 900px).
- **Cabeçalho de página:** `.page-header` em flex com quebra; texto (`breadcrumb` opcional, `h1.page-title`, `p.page-desc`) à esquerda e `.page-actions` à direita, alinhados pela base; 24px de margem abaixo.
- **Ritmo:** escala de 4px (`--s-1` a `--s-10`). Painéis empilhados com `.stack` (24px); grupos menores com `.stack-sm` (12px); fileiras de controles com `.cluster` (8px).
- **Formulários:** `.form-grid` de 12 colunas com gap de 16px e classes `.col-2` a `.col-12`; abaixo de 1100px as colunas estreitas alargam; abaixo de 640px vira 2 colunas e todo campo ocupa a linha inteira (exceto `.col-half`).
- **Painéis de largura limitada:** sub-hubs (Full, Calculadoras) usam painel com até 820px.
- **Breakpoints compartilhados:** 1100px (grade do formulário), 900px (menu vira gaveta com barra superior escura de 56px e fundo escurecido `rgba(17, 19, 21, 0.45)`), 640px (formulário em 2 colunas, painéis com padding 16px, toast em largura total). Páginas usam ainda 1180px, 1000px e 760px para as próprias grades.
- **Densidade:** linhas de tabela com 10px 14px (7px em `.table-compact`); linhas de coleta com 16px 20px.

## Elevation & Depth

O sistema é plano com camadas tonais: a profundidade vem de `--bg` → painel branco → `--surface-2`/`--surface-3`, e de bordas de 1px. Sombras são mínimas e funcionais.

### Shadow Vocabulary
- **Repouso** (`--shadow-xs`): painéis, cartões de calculadora, botões principal e secundário, opção ativa do segmentado, seletor de data.
- **Sobreposição** (`--shadow-lg`): só o que flutua sobre o conteúdo: toast e o menu lateral aberto como gaveta no celular.
- **Halo de campo** (`0 0 0 3px rgba(17, 19, 21, 0.12)`): foco de campos, junto da borda em tinta.

### Named Rules
**A Regra do Plano por Padrão.** Superfícies não sobem no hover. Hover muda fundo ou borda; sombra maior só para o que realmente flutua (toast, gaveta).

## Shapes

Cantos suaves e consistentes: `--r-md` 8px para tudo que se clica ou digita (botões, campos, itens do menu, alertas, toast), `--r-lg` 12px para painéis, cartões de calculadora e área de upload, `--r-sm` 6px para botões pequenos e opções do segmentado, `--r-xs` 4px para o selo "HUB", e `--r-pill` para selos, contadores, avatar e círculos de status. Bordas de 1px em `--border`; a área de upload usa borda tracejada de 1.5px em `--border-strong`. Divisórias internas (entre células de resumo, linhas de tabela) são sempre neutras, em `--border`.

## Components

### Buttons
Firmes e discretos; o peso vem da cor, não do tamanho.
- **Shape:** cantos de 8px (`--r-md`), altura 38px, padding 0 16px, Plex Sans 600 14px, ícone opcional de 16px com gap de 8px.
- **Primary (`.btn-primary`):** fundo tinta, texto branco, `--shadow-xs`; hover `#000000`; active `--ink-3`. Uma por área de ação.
- **Secondary (`.btn-secondary`):** branco com borda `--border-strong`; hover `--surface-2` e borda `--text-3`; active `--surface-3`.
- **Ghost (`.btn-ghost`):** transparente, texto `--text-2`; hover `--surface-3`. Para ações de apoio no cabeçalho de painel (ex.: "Recolher").
- **Tamanhos:** `.btn-sm` 30px (raio 6px, 13px), `.btn-lg` 44px (login), `.btn-block` largura total.
- **Desabilitado:** opacidade 0.5, cursor `not-allowed`.
- **Carregando:** `HubUI.busy(btn, 'Salvando…')` desabilita, marca `aria-busy`, troca o conteúdo por spinner + texto e devolve a função que restaura.
- **Botão de ícone (`.icon-btn`):** 32x32, transparente, `--text-3`; hover `--surface-3`. Variante `.danger` fica vermelha no hover. **Exclusão em dois cliques:** o primeiro clique vira `.is-confirming` (fundo vermelho, ícone + texto "Confirmar"); o segundo exclui.
- **Link de ação (`.link-btn`):** texto sublinhado com sublinhado em `--border-strong` que escurece no hover.
- **Calculadoras:** o botão "Calcular" do cartão é o mesmo botão principal (tinta, 40px, largura total), escrito sob `.calc-page`.

### Chips
- **Selos (`.badge`):** pílula de 22px, 12px 600, com ponto opcional de 7px. Variantes: neutro (`--surface-3`), `.badge-pending` (fundo amarelo suave, texto `--warning-text`, ponto `--brand`), `.badge-success`, `.badge-danger`, `.badge-outline` (tipo de coleta, com ícone).
- **Contador (`.count-pill`):** pílula de 20px ao lado do título do painel, números tabulares.
- **Status da Importação (`.status-select`):** um select em formato de pílula com ponto colorido; cores por status via `--st`/`--st-bg`: fabricação neutro, aguardando azul, em trânsito amarelo (ponto `--brand`), chegou verde.
- **Atalhos das calculadoras (`.calc-jump`):** pílulas de 28px com borda `--border`, levando ao cartão do marketplace.

### Cards / Containers
- **Painel (`.panel`)** é o único container: fundo branco, borda 1px `--border`, raio 12px, `--shadow-xs`.
- **Partes:** `.panel-head` (14px 20px, borda inferior, título 15px 600 + `.panel-sub` + `.spacer` + ações), `.panel-body` (20px; 16px no celular), `.panel-foot` (fundo `--surface-2`, borda superior, onde fica o botão principal do formulário).
- **Listas dentro do painel:** linhas separadas por `--border`, hover `--surface-2`, sem margem entre elas.
- **Cartão de calculadora (`.calc-page .card`):** é o mesmo painel (mesmos tokens) com padding 20px 22px 22px; quando é alvo de âncora (`:target`), ganha borda tinta e halo. O resultado principal (`.destaque`) é um bloco tinta com rótulo amarelo e valor em Archivo 28px; em prejuízo vira vermelho.
- **Interruptor de acesso (`.switch`, em Usuários e acessos):** trilho 36×20 px, `--border-strong` desligado e `--ink` ligado, bolinha branca com `--shadow-xs` que desliza em 180 ms; foco com contorno tinta de 2 px. Linha de master usa fundo `--brand-soft` com interruptores travados; conta sem nenhum módulo ganha o selo "sem acesso" em `--danger-soft`.
- **Sem acesso (`HubShell.semAcesso`):** quando a pessoa abre um módulo que não tem liberado, o conteúdo da página vira um painel vazio centralizado com ícone de cadeado, título "Você não tem acesso a este módulo" e botão "Voltar ao início". O menu lateral só mostra o que está liberado.
- **Preço ideal (`.ideal-box`, só em Lucratividade):** aparece logo abaixo do `.destaque` quando o lucro fica abaixo da meta de 10% ou no prejuízo. Fundo `--warning-soft` com borda âmbar, rótulo em `--warning-text`, valor em Archivo 24px, linha de apoio com o lucro nesse preço e a diferença para o preço atual, e o botão secundário "Usar este preço" (contorno tinta) que preenche o campo e recalcula. Mostra sempre o **menor** preço que atinge a meta, buscado centavo a centavo com as mesmas funções de cálculo do cartão.

### Quadro de anúncios (estilo Trello, em Anúncios novos)
- **Página larga:** `main.page.page-board` tira o limite de 1240px; o quadro (`.kb`) rola na horizontal.
- **Lista (`.kl`):** 272px, fundo `--surface-3`, raio 12px, sem borda; cabeçalho arrastável com nome clicável (renomeia na hora), contador e menu `…` (`.kmenu`, fixo, `--shadow-lg`). Lista de prontos mostra um check verde antes do nome. Os cartões rolam dentro da lista; no pé, "+ Adicionar um cartão" abre o compositor (aceita várias linhas coladas da planilha). No fim do quadro, "+ Adicionar outra lista".
- **Cartão (`.kc`):** branco, raio 8px, sombra de 1px; topo com prioridade (`.prio`: Urgente vermelho sólido, Alta amarelo suave, Normal neutro), SKU em mono e selo da marca; nome do produto em 14px 500; rodapé com data de pronto (verde), ícones de descrição e comentários e avatar do responsável (`.av`, amarelo Lisfer). Arrastar deixa um "buraco" cinza no lugar.
- **Cores de apoio (só no quadro):** cada lista tem uma cor escolhida no menu `…` (cinza, amarelo, azul, roxo, turquesa, laranja, rosa, verde), mostrada numa faixa de 4px no topo, no ponto antes do nome e no contador. Padrão: Pendente amarelo, Em andamento azul, Revisão roxo, lista de prontos verde; lista nova recebe a próxima cor livre. Cada pessoa tem uma cor fixa no avatar (escolhida pelas masters em Usuários e acessos, clicando no avatar; sem escolha, calculada pelo id). A paleta `.k-*` e o avatar `.av-k` ficam no `hub.css`, para achar os cartões de alguém de relance. A cor organiza; ela nunca substitui texto (nome da lista, prioridade e responsável continuam escritos).
- **Detalhe (`dialog.cd`):** abre ao clicar no cartão. Título editável, responsável, lista, SKU, prioridade em segmentado, descrição, e Atividade (comentários em balão + histórico gravado pelo banco, com opção de esconder o histórico). Lateral com "Mover para…" e exclusão em dois cliques.

### Tarefas (Início)
- Painel `.tk-panel` no topo do Início, para todas as pessoas: aparece para quem tem o módulo "Agendar tarefas" ou tem alguma tarefa.
- **Para você:** cada tarefa tem o mesmo círculo de "feito" das Coletas (anel amarelo → check verde com pop). Prazo em pílula: neutro, amarelo ("vence hoje/amanhã") ou vermelho ("atrasada"). Tarefa feita fica riscada por 1 dia e depois some.
- **Você pediu:** avatar de quem recebeu, selo "Aberta" ou linha verde "Fulana concluiu…" com o botão "Ok, visto" (arquiva). Tarefa aberta pode ser excluída em dois cliques.
- **Página Tarefas (`tarefas.html`, no menu logo abaixo de Início):** abas Recebidas / Enviadas (todas as pessoas) e Painel de controle (só masters). O painel tem 5 números (abertas, atrasadas em vermelho, feitas em 7 dias em verde, tempo típico, % no prazo), a tabela "Por pessoa" (clicar filtra a lista) e a lista completa com De → Para, situação (Aberta, Atrasada, Feita, Feita com atraso), prazo, datas, tempo e "visto". Filtros por texto, situação, pessoa e período; exporta CSV do que está filtrado.
- Chegada de tarefa nova e conclusão do que você pediu viram toast em tempo real. "Nova tarefa" é botão secundário no cabeçalho do painel (o preto continua sendo "Nova coleta").

### Full · Envios e calendário (`full.html`)
- Regras comuns em `full-comum.js` (`HubFull`): contas com cor fixa (Lisfer 1 amarelo, Lisfer 2 laranja, Lalfer Deus azul, Lalfer 2 turquesa), etapas (Planejado → Em preparação → Pronto para coleta → Coletado → Recebido no ML, mais Cancelado), checklist de 5 itens. Chip de conta `.full-conta` no `hub.css`.
- Página: faixa de resumo (coletas em 7 dias, coleta atrasada em vermelho, a caminho do ML, envios do mês), lista com abas Próximos / A caminho do ML / Histórico e filtro por conta, e calendário mensal com um ponto por envio na cor da conta (ponto vazado = já coletado); clicar num dia filtra a lista e "Novo envio" já vem com a data.
- Linha do envio: bloco de data (amarelo se é hoje, vermelho se a coleta passou), conta, "Full #número" em mono, observação, SKUs/unidades, divergência do recebimento, progresso do checklist, etapa e responsável.
- Detalhe (`dialog.ed`): etapas clicáveis (feitas em verde, atual em tinta), informações editáveis, checklist com quem marcou e quando, itens do PDF com "Recebido no ML" por SKU e diferença, recebimento, histórico gravado pelo banco e exclusão em dois cliques. Abre direto por `full.html#envio=<id>`.
- A Lista de Compras ganhou o painel "Salvar no controle do Full" (vincula cada PDF ao envio pelo número ou cria um envio). O Início mostra "Próximas coletas do Full" (14 dias + atrasadas).

### Rastreio Melhor Envio (`rastreio.html`, em Coletas)
- Faixa de resumo clicável (Precisam de atenção em vermelho, Em trânsito, Aguardando postagem, Entregues, Todas) que também troca a lista.
- Tabela com status em pílula (azul em trânsito, amarelo aguardando postagem, verde entregue, vermelho problema) e o motivo do alerta logo abaixo; coleta do Hub com avatar da vendedora ou select "Vincular a uma coleta…"; rastreio em mono com botão de copiar; prazo em vermelho com "N dias úteis de atraso".
- Clicar na linha abre a linha do tempo (datas do Melhor Envio + problemas percebidos pelo Hub) e os detalhes. O Início mostra "Melhor Envio: atenção" só quando há alerta.

### Importação · produtos do embarque
- Etapas: Em fabricação (neutro) → Pronto, aguardando embarque (azul) → No mar (amarelo) → Chegou no Brasil (roxo) → Recebido no estoque (verde).
- Itens abertos como tabela de produtos: foto do anúncio do ML (56px, quadro neutro quando não há), SKU em mono + selo da marca, nome, peças chegando em Archivo, vendas dos últimos 60 dias somando as 4 contas (faturamento, pedidos, peças, chips por conta nas cores das contas) e a situação do anúncio (ativos em verde, sem anúncio ativo em amarelo, "No quadro: lista" na cor da lista, "Ainda não anunciado" em vermelho com "Adicionar ao quadro").

### Inputs / Fields
- **Estrutura:** `.field` em coluna com gap de 6px; rótulo acima (13px 500 `--text-2`), `*` obrigatório em `--danger`, dica `.hint` 12px.
- **Campo (`.input`, `.select`, `.textarea`):** 38px, branco, borda `--border-strong`, raio 8px, 14px. Placeholder `#8C949C`, sempre em sans.
- **Hover:** borda `--text-3`. **Focus:** borda tinta + halo `0 0 0 3px rgba(17, 19, 21, 0.12)` (sem outline extra).
- **Erro:** `aria-invalid="true"` deixa a borda vermelha; mensagem em `.form-error`. **Desabilitado:** `--surface-2`, texto `--text-3`.
- **Select:** seta própria em SVG (`--text-3`), padding direito 34px.
- **Segmentado (`.segmented`):** trilho `--surface-3` com opções `aria-pressed`; a ativa fica branca com `--shadow-xs`. Dentro de `.input-group` (ex.: CNPJ/CPF + documento) encosta no campo.
- **Upload (`.dropzone`):** área tracejada `--surface-2`; hover ou arrastando (`.is-over`) borda tinta e fundo branco; arquivos listados em `.file-item`.

### Navigation
- **Menu lateral (`aside#appSidebar`)**, montado por `HubShell` a partir da lista `NAV` em `shared.js`: logo + selo "HUB", grupos ("Operação", "Vendas", "Em breve") com título 11px `--ink-muted`, e rodapé com avatar amarelo, nome, e-mail e botão Sair.
- **Item (`.sb-link`):** 36px, raio 8px, ícone 18px `--ink-muted`; hover `--ink-2`; ativo (`aria-current="page"`) com fundo `--ink-3`, texto branco 600, ícone amarelo e barra amarela de 3px na borda esquerda do menu.
- **Subitens (`.sb-sub`):** só aparecem quando o pai ou um filho está ativo; 32px, 13px, sem ícone, com fio vertical `--ink-line`.
- **Em breve (`.is-soon`):** texto e ícone apagados, sem hover, `aria-disabled`.
- **Foco no escuro:** contorno de 2px `--brand`, recuado (`outline-offset: -2px`).
- **Celular (≤900px):** barra superior tinta de 56px com botão de menu; o menu desliza como gaveta (`.app.nav-open`), fecha pelo fundo escurecido ou Esc.
- **Breadcrumb:** em subpáginas, acima do título, 13px `--text-3`, separador chevron.
- **Troca de calculadora (`.calc-switch`):** controle segmentado de links com `aria-current`.

### Toast
Confirmação curta para toda gravação. `HubUI.toast('Coleta adicionada.')` ou `HubUI.toast('Não foi possível salvar.', { error: true })`. Fundo tinta, texto branco 13px 500, ícone check amarelo (ou alerta `#FF8A8F` em erro), canto inferior direito, entra subindo 8px em 180ms, sai após 3,2s. Região `role="status"` `aria-live="polite"`.

### Círculo de status das Coletas (assinatura)
Botão redondo de 32px que é a própria ação de dar baixa. **Pendente:** fundo `--brand-soft`, anel interno de 2px `--brand` e ponto amarelo de 12px. **Hover:** o anel e o ponto ficam verdes (prévia do que vai acontecer). **Coletado:** fundo `--success` com check branco de 16px. **Ao dar baixa:** o círculo faz "pop" (escala 0.7 → 1 em 260ms, `--ease-out`), o check entra girando com 60ms de atraso, e a linha pisca `--success-soft` por 900ms; em seguida vem o toast "… marcada como coletada.". Os títulos das listas repetem o código com um ponto de 10px (amarelo em "Pendentes", verde em "Coletadas").

### Estados de carga, vazio e aviso
- **Carregando:** linhas `.skeleton-row` com `.skeleton` (brilho de 1.2s) no formato do conteúdo; spinner de 15px em botões.
- **Vazio (`.empty`):** ícone 28px `--border-strong`, título 14px 600 e texto curto que diz o que fazer.
- **Aviso (`.alert`):** `.alert-danger`, `.alert-warning`, `.alert-info`, com ícone de 18px e texto 13px.

## Do's and Don'ts

### Do:
- **Do** construir toda página nova com o shell: `.app` > `aside#appSidebar[data-active]` + `.app-scrim` + `.app-main` > `main.page`, liberando a tela só dentro de `HubAuth.requireAuth`.
- **Do** registrar o módulo novo na lista `NAV` de `shared.js`; o `data-active` da página tem que ser a `key` do item.
- **Do** usar os tokens de `hub.css` (`var(--…)`) no `<style>` da página; o `<style>` local guarda só o que é específico da tela.
- **Do** colocar conteúdo em painéis brancos (`.panel` com `.panel-head`/`.panel-body`/`.panel-foot`).
- **Do** manter um único botão principal (tinta) por área de ação, normalmente no rodapé do painel ou nas ações do cabeçalho.
- **Do** confirmar toda gravação com `HubUI.toast` e envolver o botão em `HubUI.busy` enquanto salva.
- **Do** usar `.mono` para NF, SKU, PI, CPF/CNPJ e telefone, com placeholder em sans.
- **Do** usar ícones de `HubIcons.svg(nome)` (traço 1.8, 24x24, `currentColor`) e adicionar ícones novos nesse mesmo conjunto.
- **Do** escrever no tom do Hub: português direto e operacional ("Coleta adicionada.", "Não foi possível excluir. Tente de novo.").
- **Do** escopar o CSS das calculadoras em `.calc-page` para não vazar no menu lateral.
- **Do** mostrar os três estados: carregando (skeleton), vazio (`.empty`) e erro (`.alert` ou toast de erro).

### Don't:
- **Don't** alterar fórmulas, taxas ou lógica das calculadoras e das listas do Full em trabalho visual; mudança visual mexe só em marcação e CSS.
- **Don't** usar borda esquerda colorida em linhas, cartões ou alertas para indicar status; status é o círculo, o ponto ou o selo.
- **Don't** usar emoji como ícone, em lugar nenhum.
- **Don't** usar a tinta preta em botões que não são a ação principal, nem colocar dois botões pretos lado a lado.
- **Don't** usar o amarelo `--brand` como botão principal, fundo de painel ou texto sobre branco (para texto use `--brand-text`).
- **Don't** criar outro tipo de container (cartões coloridos, caixas com sombra forte, painéis dentro de painéis decorativos).
- **Don't** usar Archivo em botões, rótulos ou tabelas, nem colocar títulos em caixa-alta com espaçamento largo.
- **Don't** tirar o contorno de foco; no claro ele é tinta de 2px, no menu escuro é amarelo de 2px recuado.
- **Don't** escrever cores em hex dentro das páginas quando existe token equivalente.
- **Don't** inventar números ou indicadores que o sistema não calcula.

## Como montar uma página nova

Esqueleto obrigatório (copie de `calculadoras.html` ou `full.html`, que são os menores):

```html
<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Nome do módulo — Hub Lisfer</title>
<link rel="icon" type="image/png" href="favicon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wght@700;800&family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap">
<link rel="stylesheet" href="hub.css">
<!-- supabase-js fixado na versão e com integrity, igual às outras páginas -->
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.2/dist/umd/supabase.min.js" integrity="sha384-WgXwGL6fUsYJWNaKJgVbrJKGRQwc1vieh2oy4kw9nXqpNDz3tdSsqEYUgeHD/NuF" crossorigin="anonymous"></script>
<script src="config.js"></script>
<script src="shared.js"></script>
<style>
  /* só o que é específico desta tela, sempre com var(--…) */
</style>
</head>
<body>

<div class="app" id="appScreen" hidden>
  <aside class="app-sidebar" id="appSidebar" data-active="chave-do-modulo"></aside>
  <div class="app-scrim"></div>
  <div class="app-main">
    <main class="page">
      <header class="page-header">
        <div class="page-header-text">
          <h1 class="page-title">Nome do módulo</h1>
          <p class="page-desc">Uma frase dizendo para que serve.</p>
        </div>
        <div class="page-actions"><!-- ações da página --></div>
      </header>

      <div class="stack">
        <section class="panel">
          <div class="panel-head"><h2>Título do painel</h2></div>
          <div class="panel-body">…</div>
        </section>
      </div>
    </main>
  </div>
</div>

<script>
(function () {
  HubAuth.requireAuth((user) => {
    document.getElementById('appScreen').hidden = false;
    // carregar dados aqui
  });
})();
</script>
</body>
</html>
```

Regras do esqueleto:
- O `aside#appSidebar` fica vazio: `HubShell` preenche o menu, o rodapé do usuário e injeta a barra superior compacta em `.app-main`.
- `.app` começa `hidden` e só aparece dentro de `HubAuth.requireAuth`, que manda para `index.html` quem não tem sessão.
- Subpágina de um módulo leva `nav.breadcrumb` acima do `h1` e um item em `children` do pai na lista `NAV`.
- Página de calculadora usa `main.page.calc-page` e todo o CSS dela começa com `.calc-page`.
