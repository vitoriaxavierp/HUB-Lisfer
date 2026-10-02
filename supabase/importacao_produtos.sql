-- Importação mais completa: novas etapas e, para cada SKU que está chegando,
-- foto, anúncios e vendas no Mercado Livre (4 contas) ou a situação no quadro
-- de Anúncios novos.
-- Rode este script inteiro UMA vez no SQL Editor do Supabase.
-- Precisa já rodados: importacoes.sql, permissoes.sql, ml_dados.sql, anuncios.sql e anuncios_trello.sql.

-- ---------- etapas da importação ----------
-- em_fabricacao · aguardando_embarque · em_transito (no mar) · no_brasil (chegou ao porto / desembaraço) · chegou (recebido no estoque)
alter table public.importacoes drop constraint if exists importacoes_status_check;
alter table public.importacoes add constraint importacoes_status_check
  check (status in ('em_fabricacao', 'aguardando_embarque', 'em_transito', 'no_brasil', 'chegou'));

-- ---------- anúncios de cada SKU no Mercado Livre (gravado pelo serviço lisfer-hub-dados) ----------
create table if not exists public.produto_ml (
  sku text primary key,                 -- sempre em maiúsculas
  anuncios jsonb not null default '[]', -- [{conta, mlb, titulo, status, preco, estoque, link}]
  imagem text,                          -- foto principal (https://http2.mlstatic.com/...)
  verificado_em timestamptz not null default now()
);
alter table public.produto_ml enable row level security;
drop policy if exists "produto_ml_select" on public.produto_ml;
create policy "produto_ml_select" on public.produto_ml for select
  using (public.tem_modulo('importacao') or public.tem_modulo('reputacao') or public.tem_modulo('anuncios'));

-- ---------- tudo de uma vez para a tela de Importação ----------
-- Vendas dos últimos 60 dias somando as 4 contas. Kits contam pelas peças:
-- "LF-0335-2" = 2 × LF-0335; kit com vários produtos ("A-1/B-2") soma as
-- peças de cada um, mas o faturamento só entra nos anúncios do produto sozinho.
create or replace function public.importacao_produtos(p_skus text[])
returns table (
  sku text, faturamento numeric, pedidos bigint, pecas bigint, faturamento_kits_mistos boolean,
  por_conta jsonb, ultima_venda date, anuncios jsonb, imagem text, verificado_em timestamptz, quadro jsonb
)
language plpgsql stable security definer set search_path = public
as $$
#variable_conflict use_column
begin
  if not (public.tem_modulo('importacao')) then
    raise exception 'acesso negado';
  end if;
  return query
  with pedidos as (
    select distinct upper(btrim(x)) as s from unnest(p_skus) x where btrim(x) <> ''
  ),
  partes as (
    select v.conta, v.dia, v.faturamento, v.unidades, v.pedidos, upper(btrim(p)) as parte,
           count(*) over (partition by v.conta, v.dia, v.sku, v.mlb) as nparts
    from ml_vendas_sku v, unnest(string_to_array(v.sku, '/')) p
    where v.dia >= (now() at time zone 'America/Sao_Paulo')::date - 60
  ),
  casadas as (
    select q.s, pa.*,
      case when pa.parte = q.s then 1 else substring(pa.parte from length(q.s) + 2)::int end as mult
    from pedidos q
    join partes pa on pa.parte = q.s
      or (left(pa.parte, length(q.s) + 1) = q.s || '-' and substring(pa.parte from length(q.s) + 2) ~ '^[0-9]{1,3}$')
  ),
  vendas as (
    select c.s,
      sum(case when c.nparts = 1 then c.faturamento else 0 end) as fat,
      sum(c.pedidos)::bigint as ped,
      sum(c.unidades * c.mult)::bigint as pcs,
      bool_or(c.nparts > 1) as mistos,
      max(c.dia) as ultima
    from casadas c group by c.s
  ),
  contas as (
    select c.s, jsonb_object_agg(c.conta, jsonb_build_object('faturamento', c.fat, 'pedidos', c.ped, 'pecas', c.pcs)) as pc
    from (
      select s, conta, sum(case when nparts = 1 then faturamento else 0 end) as fat, sum(pedidos) as ped, sum(unidades * mult) as pcs
      from casadas group by s, conta
    ) c group by c.s
  ),
  quadro as (
    select distinct on (upper(a.sku)) upper(a.sku) as s,
      jsonb_build_object('id', a.id, 'lista', col.nome, 'cor', col.cor, 'pronto', coalesce(col.concluida, false),
        'responsavel', pr.nome, 'prioridade', a.prioridade, 'atualizado_em', a.atualizado_em) as q
    from anuncios a
    left join anuncios_colunas col on col.id = a.coluna_id
    left join profiles pr on pr.id = a.responsavel_id
    where upper(a.sku) in (select s from pedidos)
    order by upper(a.sku), coalesce(col.concluida, false), a.atualizado_em desc
  )
  select q.s, coalesce(v.fat, 0), coalesce(v.ped, 0), coalesce(v.pcs, 0), coalesce(v.mistos, false),
         coalesce(c.pc, '{}'::jsonb), v.ultima, coalesce(pm.anuncios, '[]'::jsonb), pm.imagem, pm.verificado_em, qd.q
  from pedidos q
  left join vendas v on v.s = q.s
  left join contas c on c.s = q.s
  left join produto_ml pm on pm.sku = q.s
  left join quadro qd on qd.s = q.s;
end;
$$;

revoke all on function public.importacao_produtos(text[]) from anon;

notify pgrst, 'reload schema';
