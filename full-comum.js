// Regras do controle de envios do Full, usadas pela página do Full,
// pela Lista de Compras e pelo Início.
const HubFull = (function () {
  // mesmos códigos de conta do Mercado Livre usados no resto do Hub
  const CONTAS = [
    { conta: '1', nome: 'Lisfer 1', empresa: 'Lisfer', cor: 'amarelo' },
    { conta: '2', nome: 'Lisfer 2', empresa: 'Lisfer', cor: 'laranja' },
    { conta: '4', nome: 'Lalfer Deus', empresa: 'Lalfer', cor: 'azul' },
    { conta: '3', nome: 'Lalfer 2', empresa: 'Lalfer', cor: 'turquesa' }
  ];
  const ETAPAS = [
    { key: 'planejado', nome: 'Planejado' },
    { key: 'preparacao', nome: 'Em preparação' },
    { key: 'pronto', nome: 'Pronto para coleta' },
    { key: 'coletado', nome: 'Coletado' },
    { key: 'recebido', nome: 'Recebido no ML' }
  ];
  const CANCELADO = { key: 'cancelado', nome: 'Cancelado' };
  const CHECKLIST = [
    { key: 'compras', nome: 'Lista de compras feita' },
    { key: 'separado', nome: 'Produtos separados' },
    { key: 'conferido', nome: 'Conferido' },
    { key: 'nf', nome: 'NF emitida' },
    { key: 'etiquetas', nome: 'Etiquetas impressas e coladas' }
  ];

  const conta = (c) => CONTAS.find((x) => x.conta === String(c)) || { conta: c, nome: 'Conta ' + c, cor: 'cinza' };
  const etapa = (k) => ETAPAS.find((e) => e.key === k) || (k === 'cancelado' ? CANCELADO : { key: k, nome: k });
  const indiceEtapa = (k) => ETAPAS.findIndex((e) => e.key === k);
  // ainda não saiu do galpão
  const aberto = (e) => ['planejado', 'preparacao', 'pronto'].indexOf(e.etapa) !== -1;

  function hojeISO() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function diasAte(iso) {
    const [y, m, d] = iso.split('-').map(Number);
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
    return Math.round((new Date(y, m - 1, d) - hoje) / 86400000);
  }
  const atrasado = (e) => aberto(e) && diasAte(e.data_coleta) < 0;
  function dataCurta(iso) { const [, m, d] = iso.split('-'); return d + '/' + m; }
  function quandoColeta(iso) {
    const n = diasAte(iso);
    if (n === 0) return 'hoje';
    if (n === 1) return 'amanhã';
    if (n === -1) return 'ontem';
    if (n > 1 && n < 7) {
      const [y, m, d] = iso.split('-').map(Number);
      return new Date(y, m - 1, d).toLocaleDateString('pt-BR', { weekday: 'long' });
    }
    return dataCurta(iso);
  }
  const chipConta = (c) => { const x = conta(c); return '<span class="full-conta k-' + x.cor + '"><span class="full-conta-dot"></span>' + x.nome + '</span>'; };

  // junta itens repetidos do mesmo SKU (o PDF pode trazer o mesmo SKU em mais de uma linha)
  function juntarItens(itens) {
    const por = {};
    (itens || []).forEach((i) => {
      const sku = String(i.sku || '').trim().toUpperCase();
      if (!sku) return;
      const q = Number(i.unidades != null ? i.unidades : i.quantidade) || 0;
      if (!por[sku]) por[sku] = { sku, titulo: i.titulo || i.nome || null, codigo_ml: i.codigo_ml || null, quantidade: 0 };
      por[sku].quantidade += q;
    });
    return Object.values(por);
  }

  // grava os itens de um PDF no envio (substitui os itens anteriores) e,
  // se pedido, o número do Full e o item "Lista de compras feita" do checklist
  async function salvarItens(envio, itens, opcoes) {
    opcoes = opcoes || {};
    const lista = juntarItens(itens);
    const del = await sb.from('full_envio_itens').delete().eq('envio_id', envio.id);
    if (del.error) return del.error;
    if (lista.length) {
      const ins = await sb.from('full_envio_itens').insert(lista.map((i) => ({ envio_id: envio.id, ...i })));
      if (ins.error) return ins.error;
    }
    const campos = {};
    if (opcoes.numero && !envio.numero) campos.numero = String(opcoes.numero);
    if (opcoes.marcarCompras && !(envio.checklist || {}).compras) {
      campos.checklist = Object.assign({}, envio.checklist || {}, { compras: { em: new Date().toISOString(), por: HubAuth.user && HubAuth.user.id } });
    }
    if (Object.keys(campos).length) {
      const up = await sb.from('full_envios').update(campos).eq('id', envio.id);
      if (up.error) return up.error;
    }
    return null;
  }

  // lê PDFs do Full no servidor (só o que está escrito neles, sem consultar o Tiny)
  async function lerPdfs(files) {
    const arquivos = await Promise.all(Array.from(files).map((f) => new Promise((ok, erro) => {
      const r = new FileReader();
      r.onload = () => ok({ nome: f.name, pdf_base64: String(r.result).split(',')[1] });
      r.onerror = () => erro(new Error('Não foi possível ler ' + f.name));
      r.readAsDataURL(f);
    })));
    const { data } = await sb.auth.getSession();
    const token = data.session ? data.session.access_token : null;
    const resp = await fetch('/api/full-itens', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      body: JSON.stringify({ arquivos })
    });
    const j = await resp.json().catch(() => ({}));
    if (!resp.ok) throw new Error(j.erro || 'Não foi possível ler o PDF.');
    return j.envios || [];
  }

  return { CONTAS, ETAPAS, CANCELADO, CHECKLIST, conta, etapa, indiceEtapa, aberto, atrasado, hojeISO, diasAte, dataCurta, quandoColeta, chipConta, juntarItens, salvarItens, lerPdfs };
})();
