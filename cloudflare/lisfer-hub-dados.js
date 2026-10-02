/**
 * lisfer-hub-dados — leitura periódica do Mercado Livre para o Hub Lisfer.
 *
 * Roda pelo agendamento (cron) da Cloudflare. A cada execução lê um pedaço:
 *   1) pedidos pagos de cada conta, dia a dia, nos últimos 60 dias
 *      (faturamento, pedidos, unidades e produtos);
 *   2) o prazo de despacho de cada envio, como o próprio ML informa
 *      (/shipments/{id}/sla: on_time, delayed...), e quando saiu (/history);
 *   3) reclamações e cancelamentos já lidos pelo módulo de Devoluções.
 * Grava tudo nas tabelas ml_* do Supabase. Não altera nada no Mercado Livre.
 *
 * Também lê as etiquetas do Melhor Envio (a cada ~20 min, numa execução só
 * dele): status, rastreio, prazo e NF; liga cada etiqueta à coleta pela NF e,
 * quando um envio atrasa ou tem problema, cria uma tarefa para a vendedora.
 * Grava em me_envios / me_eventos. Não altera nada no Melhor Envio.
 *
 * O acesso às contas do ML é do serviço "lisfer-ia-mercadolivre", usado aqui
 * por um Service Binding (ML) — este serviço nunca vê os tokens do ML.
 * Nenhum dado pessoal de comprador é gravado: só pedido, anúncio, SKU,
 * valores e datas.
 *
 * Configuração na Cloudflare (Settings deste Worker):
 *   - Service binding  ML                  -> lisfer-ia-mercadolivre
 *   - Variável         SUPABASE_URL        -> https://<projeto>.supabase.co
 *   - Secret           SUPABASE_SERVICE_KEY-> chave secreta do Supabase (sb_secret_... ou service_role)
 *   - Secret           CHAVE               -> senha para /status e /rodar
 *   - (opcional)       ORCAMENTO           -> chamadas ao ML por execução (padrão 24;
 *                                             no plano pago da Cloudflare pode subir para 60)
 *   - Trigger cron     every 2 minutes
 *   - (Melhor Envio)   Secret ME_TOKEN    -> token criado em Melhor Envio > Gerenciar > Tokens
 *                      Variável ME_CONTATO -> e-mail de contato técnico (o Melhor Envio exige no User-Agent)
 *                      (opcional) ME_URL  -> https://melhorenvio.com.br (padrão) ou o sandbox
 */

const CONTAS = { "1": 580034079, "2": 454443360, "3": 1498686683, "4": 387545070 };
const ORDEM = ["1", "2", "3", "4"];
const DIAS = 60;
const HORA = 3600e3;
const ATRIBUTOS_PEDIDO = [
  "results.id", "results.date_created", "results.total_amount", "results.shipping",
  "results.order_items.item.id", "results.order_items.item.seller_sku", "results.order_items.item.title",
  "results.order_items.quantity", "results.order_items.unit_price", "paging"
].join(",");
const STATUS_FINAIS = ["on_time", "early", "sem_sla"];

export default {
  async scheduled(_evento, env, ctx) {
    ctx.waitUntil(rodar(env).catch((e) => console.error("execução falhou", e && e.message)));
  },
  async fetch(request, env) {
    const url = new URL(request.url);
    if (!env.CHAVE || url.searchParams.get("chave") !== env.CHAVE) return new Response("Not found", { status: 404 });
    if (url.pathname === "/rodar") return Response.json(await rodar(env));
    if (url.pathname === "/status") return Response.json(await status(env));
    return new Response("Not found", { status: 404 });
  }
};

// ---------------------------------------------------------------- utilidades

function diaBRT(ms) {
  return new Date(ms - 3 * HORA).toISOString().slice(0, 10);
}
function somarDias(dia, n) {
  const d = new Date(dia + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
function idadeDias(dia, hoje) {
  return Math.round((Date.parse(hoje + "T12:00:00Z") - Date.parse(dia + "T12:00:00Z")) / (24 * HORA));
}
function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
function arred(n) {
  return Math.round(n * 100) / 100;
}

// chamada ao ML pelo serviço que guarda os acessos (somente leitura)
async function ml(ctx, conta, caminho) {
  if (ctx.orcamento <= 0) return { ok: false, semOrcamento: true };
  ctx.orcamento -= 1;
  const qs = new URLSearchParams({ conta, caminho });
  const r = await ctx.env.ML.fetch("https://ml/api/devolucoes/explorar?" + qs.toString());
  const j = await r.json().catch(() => null);
  if (!j) return { ok: false, status: r.status };
  if (j.status === 429) { ctx.parar = true; return { ok: false, status: 429 }; }
  if (j.cortado) return { ok: false, status: "cortado" };
  return { ok: !!j.ok, status: j.status, dados: j.dados };
}

// relatórios já calculados pelo módulo de Devoluções do serviço de ML
async function relatorioDevolucoes(ctx, params) {
  if (ctx.orcamento <= 0) return null;
  ctx.orcamento -= 1;
  const r = await ctx.env.ML.fetch("https://ml/api/devolucoes/relatorio?" + new URLSearchParams(params).toString());
  return r.ok ? r.json().catch(() => null) : null;
}

async function sb(env, metodo, caminho, corpo, prefer) {
  const chave = String(env.SUPABASE_SERVICE_KEY || "").trim();
  const headers = { apikey: chave, "Content-Type": "application/json" };
  // chave antiga (JWT service_role) vai também no Authorization; a nova
  // (sb_secret_...) só no apikey
  if (chave.startsWith("eyJ")) headers.Authorization = "Bearer " + chave;
  if (prefer) headers.Prefer = prefer;
  const r = await fetch(env.SUPABASE_URL.replace(/\/$/, "") + "/rest/v1/" + caminho, {
    method: metodo,
    headers,
    body: corpo === undefined ? undefined : JSON.stringify(corpo)
  });
  if (!r.ok) {
    const texto = await r.text();
    throw new Error("Supabase " + metodo + " " + caminho.split("?")[0] + ": HTTP " + r.status + " " + texto.slice(0, 200));
  }
  const t = await r.text();
  return t ? JSON.parse(t) : null;
}

// ---------------------------------------------------------------- execução

async function rodar(env) {
  const inicio = Date.now();
  const ctx = { env, orcamento: Number(env.ORCAMENTO || 24), parar: false, log: [] };
  const hoje = diaBRT(Date.now());

  const linhasEstado = (await sb(env, "GET", "ml_sync?select=chave,valor")) || [];
  const estado = {};
  linhasEstado.forEach((l) => { estado[l.chave] = l.valor || {}; });
  const alterado = new Set();

  // Melhor Envio: a cada ~20 min usa uma execução inteira (o limite de
  // chamadas por execução é compartilhado, então não divide com o ML)
  const me = estado["melhorenvio"] || {};
  // enquanto a primeira carga não termina, roda a cada execução
  if (env.ME_TOKEN && (!me.lido || !me.carga_completa || Date.now() - me.lido > ME_INTERVALO)) {
    let resultado;
    try { resultado = await sincronizarME(env, me); }
    catch (e) { resultado = { erro: String((e && e.message) || e).slice(0, 300) }; }
    estado["melhorenvio"] = { ...me, ...resultado, lido: Date.now() };
    ctx.log.push("melhor envio: " + (resultado.erro ? "erro: " + resultado.erro : resultado.resumo));
    estado["execucao"] = { em: Date.now(), ms: Date.now() - inicio, log: ctx.log, parou_por_limite: false };
    await sb(env, "POST", "ml_sync?on_conflict=chave",
      ["melhorenvio", "execucao"].map((chave) => ({ chave, valor: estado[chave], atualizado_em: new Date().toISOString() })),
      "resolution=merge-duplicates");
    return { ok: !resultado.erro, log: ctx.log, ms: Date.now() - inicio };
  }

  // 1) vendas — reserva parte do orçamento para os envios
  const temEnviosPendentes = Object.keys(estado).some((k) => k.startsWith("vendas:") && Object.keys(estado[k].dias || {}).length > 0);
  const limiteVendas = temEnviosPendentes ? Math.ceil(ctx.orcamento * 0.6) : ctx.orcamento;
  const orcamentoEnvios = ctx.orcamento - limiteVendas;
  ctx.orcamento = limiteVendas;
  const lote = { dias: [], skus: [], envios: [], limpar: [] };
  // dia a dia, as 4 contas juntas, do mais recente para o mais antigo: assim
  // o mês atual fica completo para todas antes do histórico mais antigo
  ORDEM.forEach((conta) => { if (!estado["vendas:" + conta]) estado["vendas:" + conta] = { dias: {} }; });
  const contaFalhou = new Set();
  for (let i = 0; i <= DIAS; i++) {
    if (ctx.parar || ctx.orcamento < 2) break;
    const dia = somarDias(hoje, -i);
    for (const conta of ORDEM) {
      if (ctx.parar || ctx.orcamento < 2) break;
      if (contaFalhou.has(conta)) continue;
      const chave = "vendas:" + conta;
      const st = estado[chave];
      if (!precisaLer(dia, hoje, st.dias[dia])) continue;
      const lido = await lerDia(ctx, conta, dia);
      if (!lido) { contaFalhou.add(conta); continue; }
      lote.dias.push(lido.dia);
      lote.skus.push(...lido.skus);
      lote.envios.push(...lido.envios);
      lote.limpar.push({ conta, dia });
      st.dias[dia] = Date.now();
      alterado.add(chave);
    }
  }
  // esquece dias que saíram da janela
  ORDEM.forEach((conta) => {
    const chave = "vendas:" + conta;
    Object.keys(estado[chave].dias).forEach((d) => { if (idadeDias(d, hoje) > DIAS + 2) { delete estado[chave].dias[d]; alterado.add(chave); } });
  });
  await gravarVendas(env, lote);
  ctx.log.push("vendas: " + lote.dias.length + " dia(s) lido(s)");

  // 2) reclamações e cancelamentos — a cada hora
  ctx.orcamento += orcamentoEnvios;
  const dev = estado["devolucoes"] || {};
  if (!ctx.parar && (!dev.lido || Date.now() - dev.lido > HORA)) {
    const ok = await copiarDevolucoes(ctx, hoje);
    if (ok) { estado["devolucoes"] = { lido: Date.now(), ...ok }; alterado.add("devolucoes"); }
  }

  // 3) envios — prazo de despacho como o ML informa (deixa 10 chamadas para o passo 4)
  if (!ctx.parar && ctx.orcamento > 0) {
    const reserva = Math.min(10, ctx.orcamento);
    ctx.orcamento -= reserva;
    const n = await verificarEnvios(ctx, hoje);
    ctx.log.push("envios: " + n + " conferido(s)");
    ctx.orcamento += reserva;
  }

  // 4) anúncios e foto de cada SKU que está chegando na Importação
  if (!ctx.parar && ctx.orcamento >= 5) {
    const n = await verificarSkusImportacao(ctx);
    if (n) ctx.log.push("importação: " + n + " SKU(s) conferido(s) no ML");
  }

  estado["execucao"] = { em: Date.now(), ms: Date.now() - inicio, log: ctx.log, parou_por_limite: ctx.parar };
  alterado.add("execucao");
  const agora = new Date().toISOString();
  await sb(env, "POST", "ml_sync?on_conflict=chave",
    [...alterado].map((chave) => ({ chave, valor: estado[chave], atualizado_em: agora })),
    "resolution=merge-duplicates");
  return { ok: true, log: ctx.log, ms: Date.now() - inicio };
}

// hoje e ontem: relê a cada 30 min; até 7 dias: uma vez por dia (pega
// cancelamentos tardios); mais antigo: lê uma vez só
function precisaLer(dia, hoje, lidoEm) {
  if (!lidoEm) return true;
  const idade = idadeDias(dia, hoje);
  const desde = Date.now() - lidoEm;
  if (idade <= 1) return desde > 0.5 * HORA;
  if (idade <= 7) return desde > 20 * HORA;
  return false;
}

async function lerDia(ctx, conta, dia) {
  const agg = { faturamento: 0, pedidos: 0, unidades: 0 };
  const skus = {};
  const envios = {};
  let offset = 0;
  let total = Infinity;
  while (offset < total && offset < 9950) {
    const caminho = "/orders/search?seller=" + CONTAS[conta] +
      "&order.status=paid" +
      "&order.date_created.from=" + encodeURIComponent(dia + "T00:00:00.000-03:00") +
      "&order.date_created.to=" + encodeURIComponent(dia + "T23:59:59.999-03:00") +
      "&sort=date_asc&limit=50&offset=" + offset +
      "&attributes=" + ATRIBUTOS_PEDIDO;
    const r = await ml(ctx, conta, caminho);
    if (!r.ok) return null; // dia incompleto: tenta de novo na próxima execução
    const resultados = (r.dados && r.dados.results) || [];
    total = num(r.dados && r.dados.paging && r.dados.paging.total);
    for (const o of resultados) {
      agg.faturamento += num(o.total_amount);
      agg.pedidos += 1;
      const itens = o.order_items || [];
      itens.forEach((oi) => {
        const item = oi.item || {};
        const sku = String(item.seller_sku || "").trim().toUpperCase() || "SEM SKU";
        const mlb = String(item.id || "");
        const k = sku + "|" + mlb;
        const qtd = num(oi.quantity);
        const s = skus[k] || (skus[k] = { conta, dia, sku, mlb, titulo: String(item.title || "").slice(0, 200), faturamento: 0, unidades: 0, pedidos: 0 });
        s.faturamento += num(oi.unit_price) * qtd;
        s.unidades += qtd;
        s.pedidos += 1;
        agg.unidades += qtd;
      });
      const envio = o.shipping && o.shipping.id;
      if (envio && !envios[envio]) {
        const it = (itens[0] && itens[0].item) || {};
        envios[envio] = {
          shipment_id: envio, conta, pedido: o.id, dia_venda: dia,
          mlb: String(it.id || ""), sku: String(it.seller_sku || "").trim().toUpperCase() || null,
          titulo: String(it.title || "").slice(0, 200)
        };
      }
    }
    offset += resultados.length;
    if (!resultados.length) break;
  }
  return {
    dia: { conta, dia, faturamento: arred(agg.faturamento), pedidos: agg.pedidos, unidades: agg.unidades, lido_em: new Date().toISOString() },
    skus: Object.values(skus).map((s) => ({ ...s, faturamento: arred(s.faturamento) })),
    envios: Object.values(envios)
  };
}

async function gravarVendas(env, lote) {
  if (!lote.dias.length) return;
  await sb(env, "POST", "ml_vendas_dia?on_conflict=conta,dia", lote.dias, "resolution=merge-duplicates");
  const filtro = lote.limpar.map((x) => "and(conta.eq." + x.conta + ",dia.eq." + x.dia + ")").join(",");
  await sb(env, "DELETE", "ml_vendas_sku?or=(" + filtro + ")");
  if (lote.skus.length) await sb(env, "POST", "ml_vendas_sku", lote.skus);
  // envios novos entram sem apagar o que já foi conferido
  if (lote.envios.length) await sb(env, "POST", "ml_envios?on_conflict=shipment_id", lote.envios, "resolution=ignore-duplicates");
}

async function verificarEnvios(ctx, hoje) {
  const env = ctx.env;
  const ontem = somarDias(hoje, -1);
  const inicio = somarDias(hoje, -DIAS);
  const reconferir = new Date(Date.now() - 6 * HORA).toISOString();
  const finais = STATUS_FINAIS.join(",");
  // nunca conferidos primeiro; depois os ainda em aberto (sem saída ou status não final)
  const filtro = "or=(verificado_em.is.null," +
    "and(sla_status.not.in.(" + finais + ",delayed),verificado_em.lt." + reconferir + ")," +
    "and(sla_status.eq.delayed,despachado_em.is.null,verificado_em.lt." + reconferir + "))";
  const pendentes = (await sb(env, "GET",
    "ml_envios?select=shipment_id,conta&dia_venda=gte." + inicio + "&dia_venda=lte." + ontem + "&" + filtro +
    "&order=verificado_em.asc.nullsfirst,dia_venda.desc&limit=" + Math.max(1, ctx.orcamento))) || [];
  const atualizados = [];
  for (const p of pendentes) {
    if (ctx.parar || ctx.orcamento <= 0) break;
    const r = await ml(ctx, p.conta, "/shipments/" + p.shipment_id + "/sla");
    if (r.semOrcamento || r.status === 429) break;
    // todas as linhas com os mesmos campos (exigência do envio em lote do Supabase)
    const linha = { shipment_id: p.shipment_id, conta: p.conta, verificado_em: new Date().toISOString(), sla_status: null, prazo: null, despachado_em: null };
    if (!r.ok) {
      // sem SLA (ex.: Full, envio cancelado) não conta como atraso do vendedor
      linha.sla_status = r.status === 404 ? "sem_sla" : null;
    } else {
      linha.sla_status = (r.dados && r.dados.status) || null;
      linha.prazo = (r.dados && r.dados.expected_date) || null;
      if (linha.sla_status === "delayed" && ctx.orcamento > 0) {
        const h = await ml(ctx, p.conta, "/shipments/" + p.shipment_id + "/history");
        if (h.ok) linha.despachado_em = (h.dados && h.dados.date_history && h.dados.date_history.date_shipped) || null;
      }
    }
    atualizados.push(linha);
  }
  if (atualizados.length) {
    await sb(env, "POST", "ml_envios?on_conflict=shipment_id", atualizados, "resolution=merge-duplicates");
  }
  return atualizados.length;
}

async function copiarDevolucoes(ctx, hoje) {
  const env = ctx.env;
  const inicio = somarDias(hoje, -DIAS - 30);
  const casos = [];
  for (let pular = 0; pular < 3000; pular += 300) {
    const r = await relatorioDevolucoes(ctx, { secao: "casos", limite: "300", pular: String(pular) });
    if (!r || !r.ok) return null;
    casos.push(...(r.linhas || []));
    if ((r.linhas || []).length < 300) break;
  }
  const cancel = [];
  for (let pular = 0; pular < 3000; pular += 300) {
    const r = await relatorioDevolucoes(ctx, { secao: "cancelamentos", limite: "300", pular: String(pular) });
    if (!r || !r.ok) return null;
    cancel.push(...(r.linhas || []));
    if ((r.linhas || []).length < 300) break;
  }
  const agora = new Date().toISOString();
  const rec = casos.filter((c) => c.reclamacao && c.data >= inicio).map((c) => ({
    reclamacao: c.reclamacao, conta: String(c.conta), pedido: c.pedido || null, data: c.data || null,
    sku: c.sku || null, mlb: c.item || null, titulo: c.titulo || null, unidades: c.unidades || null,
    valor: c.valor == null ? null : num(c.valor), motivo: c.motivo || null, categoria: c.categoria_nome || null,
    desfecho: c.desfecho_nome || null, status: c.status || null, etapa: c.etapa || null,
    afeta_reputacao: c.afeta_reputacao === true, logistica: c.logistica || null, link: c.link || null, atualizado_em: agora
  }));
  const can = cancel.filter((c) => c.pedido && c.data >= inicio).map((c) => ({
    pedido: c.pedido, conta: String(c.conta), data: c.data || null, sku: c.sku || null, titulo: c.titulo || null,
    unidades: c.unidades || null, valor: c.valor == null ? null : num(c.valor), quem: c.quem || null,
    motivo: c.motivo || null, grupo: c.grupo || null, atualizado_em: agora
  }));
  if (rec.length) await sb(env, "POST", "ml_reclamacoes?on_conflict=reclamacao", rec, "resolution=merge-duplicates");
  if (can.length) await sb(env, "POST", "ml_cancelamentos?on_conflict=pedido", can, "resolution=merge-duplicates");
  ctx.log.push("devoluções: " + rec.length + " reclamação(ões), " + can.length + " cancelamento(s)");
  return { reclamacoes: rec.length, cancelamentos: can.length };
}

async function status(env) {
  const linhas = (await sb(env, "GET", "ml_sync?select=chave,valor,atualizado_em")) || [];
  const hoje = diaBRT(Date.now());
  const out = { hoje, contas: {} };
  linhas.forEach((l) => {
    if (l.chave.startsWith("vendas:")) {
      const dias = Object.keys((l.valor && l.valor.dias) || {});
      out.contas[l.chave.slice(7)] = { dias_lidos: dias.length, de: dias.sort()[0] || null };
    } else {
      out[l.chave] = l.valor;
    }
  });
  return out;
}

// ---------------------------------------------------------------- Importação

// Para cada SKU dos embarques, procura o anúncio nas 4 contas (pelo SKU do
// vendedor) e guarda título, status, preço, estoque, link e a foto principal.
// Reconfere uma vez por dia; os SKUs nunca conferidos vão primeiro.
async function verificarSkusImportacao(ctx) {
  const env = ctx.env;
  const itens = (await sb(env, "GET", "importacao_itens?select=sku&limit=5000")) || [];
  const skus = [...new Set(itens.map((i) => String(i.sku || "").trim().toUpperCase()).filter(Boolean))];
  if (!skus.length) return 0;
  const feitos = {};
  ((await sb(env, "GET", "produto_ml?select=sku,verificado_em&limit=5000")) || []).forEach((r) => { feitos[r.sku] = Date.parse(r.verificado_em); });
  const fila = skus.filter((k) => !feitos[k] || Date.now() - feitos[k] > 24 * HORA)
    .sort((a, b) => (feitos[a] || 0) - (feitos[b] || 0));
  const linhas = [];
  for (const sku of fila) {
    if (ctx.parar || ctx.orcamento < ORDEM.length + 1) break;
    const achados = [];
    let falhou = false;
    for (const conta of ORDEM) {
      const r = await ml(ctx, conta, "/users/" + CONTAS[conta] + "/items/search?seller_sku=" + encodeURIComponent(sku) + "&limit=20");
      if (!r.ok) { falhou = true; break; }
      ((r.dados && r.dados.results) || []).slice(0, 20).forEach((mlb) => achados.push({ conta, mlb: String(mlb) }));
    }
    if (falhou) break;
    const anuncios = [];
    let imagem = null;
    if (achados.length) {
      const conta = achados[0].conta;
      const ids = achados.slice(0, 20).map((a) => a.mlb).join(",");
      const r = await ml(ctx, conta, "/items?ids=" + ids + "&attributes=id,title,status,price,available_quantity,secure_thumbnail,thumbnail,permalink");
      const corpo = r.ok && Array.isArray(r.dados) ? r.dados : [];
      const porId = {};
      corpo.forEach((x) => { const b = x && x.body; if (b && b.id) porId[b.id] = b; });
      achados.forEach((a) => {
        const b = porId[a.mlb] || {};
        anuncios.push({ conta: a.conta, mlb: a.mlb, titulo: b.title || null, status: b.status || null,
          preco: b.price != null ? Number(b.price) : null, estoque: b.available_quantity != null ? Number(b.available_quantity) : null,
          link: b.permalink || null });
        if (!imagem && (b.secure_thumbnail || b.thumbnail)) imagem = String(b.secure_thumbnail || b.thumbnail).replace(/^http:/, "https:");
      });
    }
    linhas.push({ sku, anuncios, imagem, verificado_em: new Date().toISOString() });
  }
  if (linhas.length) await sb(env, "POST", "produto_ml?on_conflict=sku", linhas, "resolution=merge-duplicates");
  return linhas.length;
}

// ---------------------------------------------------------------- Melhor Envio

const ME_INTERVALO = 20 * 60e3;
const ME_PAGINAS = 8;              // páginas da listagem por execução
const ME_JANELA_DIAS = 60;         // primeira carga: etiquetas dos últimos 60 dias
const ME_FINAIS = ["delivered", "canceled", "expired"];
const ME_PROBLEMA = { undelivered: "nao_entregue", paused: "interrompido", suspended: "suspenso" };
const MOTIVO = {
  atrasado: "Envio atrasado",
  nao_entregue: "Envio não entregue",
  interrompido: "Entrega interrompida",
  suspenso: "Envio suspenso",
  sem_postar: "Etiqueta paga e ainda não postada"
};

async function meApi(env, metodo, caminho, corpo) {
  const base = String(env.ME_URL || "https://melhorenvio.com.br").replace(/\/$/, "");
  const r = await fetch(base + caminho, {
    method: metodo,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: "Bearer " + String(env.ME_TOKEN).trim(),
      "User-Agent": "Hub Lisfer (" + String(env.ME_CONTATO || "contato não informado").trim() + ")"
    },
    body: corpo === undefined ? undefined : JSON.stringify(corpo)
  });
  if (r.status === 401) throw new Error("o Melhor Envio recusou o token (401). Gere um token novo em Gerenciar > Tokens.");
  if (!r.ok) throw new Error("Melhor Envio " + caminho.split("?")[0] + ": HTTP " + r.status);
  return r.json();
}

function dataISO(v) {
  if (!v) return null;
  const t = Date.parse(String(v).replace(" ", "T"));
  return Number.isFinite(t) ? new Date(t).toISOString() : null;
}
function soDigitos(v) {
  return String(v || "").replace(/\D/g, "").replace(/^0+/, "");
}
// soma dias úteis (seg a sex; feriados não entram na conta)
function somarDiasUteis(iso, n) {
  const d = new Date(Date.parse(iso) - 3 * HORA);
  let falta = n;
  while (falta > 0) {
    d.setUTCDate(d.getUTCDate() + 1);
    const dia = d.getUTCDay();
    if (dia !== 0 && dia !== 6) falta--;
  }
  return d.toISOString().slice(0, 10);
}
function diasUteisEntre(de, ate) {
  let n = 0;
  const d = new Date(de + "T12:00:00Z");
  const fim = new Date(ate + "T12:00:00Z");
  while (d < fim) { d.setUTCDate(d.getUTCDate() + 1); const w = d.getUTCDay(); if (w !== 0 && w !== 6) n++; }
  return n;
}

// etiqueta do Melhor Envio -> linha de me_envios (só o necessário)
function linhaME(o) {
  const servico = o.service || {};
  const empresa = servico.company || {};
  const para = o.to || {};
  const nf = o.invoice || {};
  const linha = {
    id: String(o.id),
    protocolo: o.protocol || null,
    status: o.status || null,
    rastreio: o.tracking || null,
    rastreio_me: o.self_tracking || o.melhorenvio_tracking || null,
    servico: servico.name || null,
    transportadora: empresa.name || null,
    destinatario: para.name || null,
    cidade: para.city || null,
    uf: para.state_abbr || para.state || null,
    nf_numero: nf.number ? String(nf.number) : null,
    nf_chave: nf.key ? String(nf.key) : null,
    prazo_min: Number.isFinite(Number(o.delivery_min)) && o.delivery_min != null ? Number(o.delivery_min) : null,
    prazo_max: Number.isFinite(Number(o.delivery_max)) && o.delivery_max != null ? Number(o.delivery_max) : null,
    preco: o.price != null && Number.isFinite(Number(o.price)) ? Number(o.price) : null,
    criado_me: dataISO(o.created_at),
    pago_em: dataISO(o.paid_at),
    gerado_em: dataISO(o.generated_at),
    postado_em: dataISO(o.posted_at),
    entregue_em: dataISO(o.delivered_at),
    cancelado_em: dataISO(o.canceled_at),
    expirado_em: dataISO(o.expired_at)
  };
  return linha;
}

// prazo e alerta calculados pelo Hub
function avaliar(l, hoje) {
  l.prazo_entrega = l.postado_em && l.prazo_max != null ? somarDiasUteis(l.postado_em, l.prazo_max) : null;
  let alerta = ME_PROBLEMA[l.status] || null;
  if (!alerta && l.status === "posted" && l.prazo_entrega && hoje > l.prazo_entrega) alerta = "atrasado";
  if (!alerta && (l.status === "released" || l.status === "generated") && l.pago_em &&
      diasUteisEntre(diaBRT(Date.parse(l.pago_em)), hoje) >= 2) alerta = "sem_postar";
  l.alerta = alerta;
  return l;
}

async function sincronizarME(env, estado) {
  const hoje = diaBRT(Date.now());
  const vistos = new Map();
  const primeiraCarga = !estado.carga_completa;
  const limite = Date.now() - ME_JANELA_DIAS * 24 * HORA;

  // 1) listagem, das etiquetas mais novas para as mais antigas
  let pagina = estado.pagina_carga && primeiraCarga ? estado.pagina_carga : 1;
  let chegouNoFim = false;
  for (let i = 0; i < ME_PAGINAS; i++) {
    const j = await meApi(env, "GET", "/api/v2/me/orders?page=" + pagina);
    const lista = Array.isArray(j && j.data) ? j.data : [];
    let antigas = 0;
    lista.forEach((o) => {
      if (!o || !o.id || o.status === "pending") return;   // carrinho: ainda não é envio
      const criado = Date.parse(String(o.created_at || "").replace(" ", "T"));
      if (Number.isFinite(criado) && criado < limite) { antigas++; return; }
      vistos.set(String(o.id), linhaME(o));
    });
    const ultima = Number(j && j.last_page) || pagina;
    if (!lista.length || pagina >= ultima || antigas === lista.length) { chegouNoFim = true; break; }
    pagina++;
    // depois da primeira carga, só as páginas mais novas (o resto vem pelo rastreio)
    if (!primeiraCarga && i >= 1) break;
  }

  // 2) etiquetas ainda em andamento que não vieram na listagem: status atual pelo rastreio
  const ativos = (await sb(env, "GET", "me_envios?select=id&status=not.in.(" + ME_FINAIS.join(",") + ")&limit=1000")) || [];
  const faltam = ativos.map((a) => a.id).filter((id) => !vistos.has(id) && id.length >= 36);
  for (let i = 0; i < faltam.length && i < 300; i += 50) {
    const r = await meApi(env, "POST", "/api/v2/me/shipment/tracking", { orders: faltam.slice(i, i + 50) });
    const itens = Array.isArray(r) ? r : Object.values(r || {});
    itens.forEach((t) => {
      if (!t || !t.id) return;
      vistos.set(String(t.id), {
        id: String(t.id), status: t.status || null, rastreio: t.tracking || null,
        rastreio_me: t.melhorenvio_tracking || null,
        pago_em: dataISO(t.paid_at), gerado_em: dataISO(t.generated_at), postado_em: dataISO(t.posted_at),
        entregue_em: dataISO(t.delivered_at), cancelado_em: dataISO(t.canceled_at), expirado_em: dataISO(t.expired_at),
        _parcial: true
      });
    });
  }
  if (!vistos.size) return { resumo: "nenhuma etiqueta nova", carga_completa: primeiraCarga ? chegouNoFim : true, pagina_carga: pagina };

  // 3) estado anterior (para detectar mudanças) e coletas para ligar pela NF
  const ids = [...vistos.keys()];
  const antes = {};
  for (let i = 0; i < ids.length; i += 80) {
    const parte = ids.slice(i, i + 80).map((x) => '"' + x + '"').join(",");
    ((await sb(env, "GET", "me_envios?select=*&id=in.(" + parte + ")")) || [])
      .forEach((r) => { antes[r.id] = r; });
  }
  const desde = somarDias(hoje, -120);
  const coletas = (await sb(env, "GET", "pedidos?select=id,nf,cliente,vendedora_id,tipo_coleta,data_coleta&data_coleta=gte." + desde + "&limit=5000")) || [];
  const porNf = {};
  coletas.forEach((c) => {
    const k = soDigitos(c.nf);
    if (!k) return;
    // se houver mais de uma coleta com a mesma NF, prefere a do tipo Melhor Envio e a mais recente
    const atual = porNf[k];
    const melhor = !atual || (c.tipo_coleta === "melhor_envio" && atual.tipo_coleta !== "melhor_envio") ||
      (c.tipo_coleta === atual.tipo_coleta && c.data_coleta > atual.data_coleta);
    if (melhor) porNf[k] = c;
  });
  const coletaPorId = {};
  coletas.forEach((c) => { coletaPorId[c.id] = c; });

  // 4) monta as linhas, eventos e tarefas
  const agora = new Date().toISOString();
  const completas = [], parciais = [], eventos = [], tarefas = [];
  for (const [id, novo] of vistos) {
    const ant = antes[id];
    const l = { ...(ant || {}), ...Object.fromEntries(Object.entries(novo).filter(([, v]) => v !== null && v !== undefined)) };
    delete l._parcial;
    l.id = id;
    if (!l.coleta_manual) {
      const c = porNf[soDigitos(l.nf_numero)];
      if (c) l.coleta_id = c.id;
    }
    avaliar(l, hoje);
    if (!ant || ant.status !== l.status) eventos.push({ envio_id: id, status_de: ant ? ant.status : null, status_para: l.status || "desconhecido", em: agora });
    const jaFeitas = { ...((ant && ant.tarefas) || {}) };
    // na primeira carga, atraso antigo (mais de 5 dias úteis) não vira tarefa: só aparece no painel
    if (primeiraCarga && l.alerta && !jaFeitas[l.alerta] &&
        (l.alerta === "atrasado" ? diasUteisEntre(l.prazo_entrega, hoje) > 5 : l.criado_me && Date.now() - Date.parse(l.criado_me) > 15 * 24 * HORA)) {
      jaFeitas[l.alerta] = "carga_inicial";
    }
    const coleta = l.coleta_id ? coletaPorId[l.coleta_id] : null;
    if (l.alerta && !jaFeitas[l.alerta] && coleta && coleta.vendedora_id) {
      jaFeitas[l.alerta] = agora;
      tarefas.push({
        titulo: (MOTIVO[l.alerta] + ": NF " + (l.nf_numero || coleta.nf || "?") + " · " + (coleta.cliente || l.destinatario || "")).slice(0, 200),
        detalhes: [
          l.transportadora || l.servico ? "Envio: " + [l.transportadora, l.servico].filter(Boolean).join(" · ") : null,
          l.rastreio ? "Rastreio: " + l.rastreio : null,
          l.prazo_entrega ? "Prazo de entrega: " + l.prazo_entrega.split("-").reverse().join("/") : null,
          "Veja em Coletas › Rastreio Melhor Envio. Tarefa criada automaticamente pelo Hub."
        ].filter(Boolean).join("\n"),
        para_id: coleta.vendedora_id,
        prazo: hoje
      });
    }
    l.tarefas = jaFeitas;
    l.lido_em = agora;
    l.atualizado_em = agora;
    (ant || !novo._parcial ? completas : parciais).push(l);
  }

  // sempre as mesmas chaves em cada lote (o Supabase exige)
  const CAMPOS = ["id", "protocolo", "status", "rastreio", "rastreio_me", "servico", "transportadora", "destinatario", "cidade", "uf",
    "nf_numero", "nf_chave", "prazo_min", "prazo_max", "preco", "criado_me", "pago_em", "gerado_em", "postado_em", "entregue_em",
    "cancelado_em", "expirado_em", "prazo_entrega", "alerta", "coleta_id", "coleta_manual", "tarefas", "lido_em", "atualizado_em"];
  const normalizar = (l) => { const o = {}; CAMPOS.forEach((k) => { o[k] = l[k] === undefined ? (k === "tarefas" ? {} : k === "coleta_manual" ? false : null) : l[k]; }); return o; };
  const todas = completas.concat(parciais).map(normalizar);
  for (let i = 0; i < todas.length; i += 200) {
    await sb(env, "POST", "me_envios?on_conflict=id", todas.slice(i, i + 200), "resolution=merge-duplicates");
  }
  if (eventos.length) await sb(env, "POST", "me_eventos", eventos);
  if (tarefas.length) await sb(env, "POST", "tarefas", tarefas);

  const alertas = todas.filter((l) => l.alerta).length;
  return {
    resumo: todas.length + " etiqueta(s) atualizada(s), " + eventos.length + " mudança(s) de status, " + alertas + " com alerta, " + tarefas.length + " tarefa(s) criada(s)",
    carga_completa: primeiraCarga ? chegouNoFim : true,
    pagina_carga: pagina,
    erro: null
  };
}
