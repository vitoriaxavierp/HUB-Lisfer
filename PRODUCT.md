# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Equipe interna da Lisfer Ferramentas (e da empresa irmã Lalfer), usando o Hub no computador do escritório: mesa, monitor, mouse e teclado. Há funções diferentes na equipe (vendas, expedição, gestão), e cada uma usa mais algumas partes do Hub do que outras. Exemplo do dia a dia: a vendedora que trabalha só de manhã lança uma venda que será retirada à tarde, e quem está na expedição à tarde precisa ver e dar baixa nessa coleta.

## Product Purpose

Ferramenta interna que junta, num só lugar, as rotinas que antes dependiam de recado, planilha ou memória: coletas do dia, listas de compra e separação do Full, cálculo de preço e lucratividade por marketplace e acompanhamento de importações. Sucesso significa que nada se perde na troca de turno e que as decisões de preço e compra saem de números confiáveis.

## Positioning

Feito sob medida para a operação Lisfer/Lalfer: lê os PDFs reais do Mercado Livre Full, consulta o estoque e o custo das duas contas Tiny ERP, aplica as taxas reais de cada conta e marketplace e mostra as coletas em tempo real para toda a equipe.

## Operating Context

- Coletas: painel por dia com cliente, documento, WhatsApp, vendedora, tipo de coleta (transportadora, Uber, retirada pessoal, Melhor Envio), NF, volumes, observações e link de rastreio. Pendente = amarelo; coletado = verde, com quem deu baixa e a hora.
- Full: upload do PDF "preparation instructions" do Mercado Livre Full; gera a lista de compras (kits desmembrados, estoque Lisfer/Lalfer/multiempresa, exportação para Excel) e a lista de separação em PDF.
- Calculadoras: preço de venda sugerido e lucratividade para Mercado Livre, Loja Própria (Nuvemshop), Shopee, Amazon, Magalu, TikTok Shop e Kwai.
- Importação: embarques por PI, fornecedor, status (em fabricação, aguardando embarque, em trânsito, chegou), previsão de chegada, valor em US$ e itens (SKU, produto, quantidade).
- Ainda não existem: Pontos do fim do mês, Reputação das contas, Anúncios pendentes (aparecem como "em breve").

## Capabilities and Constraints

- Site estático (HTML/CSS/JS sem framework) na Vercel, com funções Python em `/api`. Login e banco no Supabase (cadastro público desligado; contas criadas pela gestão). Integração com o Tiny ERP v2 pelo servidor.
- Os cálculos, taxas e fórmulas das calculadoras e das listas do Full não podem mudar sem pedido explícito.
- Atualização em tempo real entre as pessoas com o painel aberto (Coletas e Importação).
- Ainda não há permissões por função: todas as pessoas logadas veem e editam tudo.

## Brand Commitments

- Nome: Hub Lisfer. Logo da Lisfer (`logo.png`, versão transparente) e ícone (`favicon.png`).
- Identidade preta e amarela da Lisfer (amarelo de referência #F5AD00), mantida e profissionalizada, não substituída.
- Idioma: português do Brasil, tom direto e operacional.

## Evidence on Hand

Dados reais ficam no Supabase e no Tiny; não há depoimentos, métricas públicas ou clientes a exibir. Não inventar números ou indicadores que o sistema não calcula.

## Product Principles

1. Nada se perde entre turnos: o que foi lançado fica visível, com dono e horário.
2. Números confiáveis acima de tudo: cálculos e dados do ERP são a fonte da verdade.
3. Uma ferramenta, um padrão: todas as telas falam a mesma língua visual e de interação.
4. Rápido para quem usa todo dia: menos cliques nas tarefas frequentes, densidade adequada para o escritório.

## Accessibility & Inclusion

Uso em desktop; contraste AA, foco de teclado visível e rótulos claros em todos os campos.
