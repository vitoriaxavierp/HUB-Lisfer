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

  // 3) envios — prazo de despacho como o ML informa
  if (!ctx.parar && ctx.orcamento > 0) {
    const n = await verificarEnvios(ctx, hoje);
    ctx.log.push("envios: " + n + " conferido(s)");
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
