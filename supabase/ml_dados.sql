-- Dados do Mercado Livre para o painel "Reputação das contas":
-- faturamento por dia e por produto, envios (prazo de despacho), reclamações
-- e cancelamentos das 4 contas. Quem grava é o serviço "lisfer-hub-dados"
-- (Cloudflare), com a chave service_role; o Hub só lê.
-- Rode este script inteiro UMA vez no SQL Editor do Supabase.
-- Precisa do permissoes.sql já rodado (usa a função tem_modulo).

create table if not exists public.ml_vendas_dia (
  conta text not null,
  dia date not null,
  faturamento numeric not null default 0,
  pedidos int not null default 0,
  unidades int not null default 0,
  lido_em timestamptz not null default now(),
  primary key (conta, dia)
);

create table if not exists public.ml_vendas_sku (
  conta text not null,
  dia date not null,
  sku text not null,
  mlb text not null,
  titulo text,
  faturamento numeric not null default 0,
  unidades int not null default 0,
  pedidos int not null default 0,
  primary key (conta, dia, sku, mlb)
);

create table if not exists public.ml_envios (
  shipment_id bigint primary key,
  conta text not null,
  pedido bigint,
  dia_venda date,
  mlb text,
  sku text,
  titulo text,
  sla_status text,          -- como o ML informa: on_time, early, delayed, ...
  prazo timestamptz,        -- data-limite de despacho informada pelo ML
  despachado_em timestamptz,
  verificado_em timestamptz
);
create index if not exists ml_envios_pendentes_idx on public.ml_envios (verificado_em nulls first, dia_venda desc);
create index if not exists ml_envios_atrasos_idx on public.ml_envios (conta, sla_status, dia_venda desc);

create table if not exists public.ml_reclamacoes (
  reclamacao bigint primary key,
  conta text not null,
  pedido bigint,
  data date,
  sku text,
  mlb text,
  titulo text,
  unidades int,
  valor numeric,
  motivo text,
  categoria text,
  desfecho text,
  status text,
  etapa text,
  afeta_reputacao boolean,
  logistica text,
  link text,
  atualizado_em timestamptz not null default now()
);
create index if not exists ml_reclamacoes_conta_idx on public.ml_reclamacoes (conta, data desc);

create table if not exists public.ml_cancelamentos (
  pedido bigint primary key,
  conta text not null,
  data date,
  sku text,
  titulo text,
  unidades int,
  valor numeric,
  quem text,                -- seller, buyer, meli...
  motivo text,
  grupo text,
  atualizado_em timestamptz not null default now()
);
create index if not exists ml_cancelamentos_conta_idx on public.ml_cancelamentos (conta, data desc);

create table if not exists public.ml_sync (
  chave text primary key,
  valor jsonb not null default '{}'::jsonb,
  atualizado_em timestamptz not null default now()
);

-- leitura só para quem tem o módulo "Reputação das contas"; gravação só pelo
-- serviço (a chave service_role ignora RLS), por isso não há política de escrita
do $$
declare t text;
begin
  foreach t in array array['ml_vendas_dia','ml_vendas_sku','ml_envios','ml_reclamacoes','ml_cancelamentos','ml_sync'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I on public.%I', t || '_select_modulo', t);
    execute format('create policy %I on public.%I for select using (public.tem_modulo(''reputacao''))', t || '_select_modulo', t);
  end loop;
end $$;

-- resumo por conta num período (respeita as regras de acesso acima)
create or replace function public.ml_resumo(p_de date, p_ate date)
returns table (conta text, faturamento numeric, pedidos bigint, unidades bigint, dias_lidos bigint)
language sql stable security invoker set search_path = public
as $$
  select v.conta, sum(v.faturamento), sum(v.pedidos), sum(v.unidades), count(*)
  from public.ml_vendas_dia v
  where v.dia between p_de and p_ate
  group by v.conta;
$$;

-- produtos que mais faturaram numa conta e período
create or replace function public.ml_top_skus(p_conta text, p_de date, p_ate date, p_limite int default 50)
returns table (sku text, titulo text, anuncios bigint, faturamento numeric, unidades bigint, pedidos bigint)
language sql stable security invoker set search_path = public
as $$
  select s.sku, max(s.titulo), count(distinct s.mlb), sum(s.faturamento), sum(s.unidades), sum(s.pedidos)
  from public.ml_vendas_sku s
  where s.conta = p_conta and s.dia between p_de and p_ate
  group by s.sku
  order by sum(s.faturamento) desc
  limit greatest(1, least(p_limite, 500));
$$;

-- quantos envios do período já foram conferidos (para mostrar a cobertura)
create or replace function public.ml_cobertura_envios(p_de date)
returns table (conta text, total bigint, verificados bigint, atrasados bigint)
language sql stable security invoker set search_path = public
as $$
  select e.conta, count(*), count(e.verificado_em), count(*) filter (where e.sla_status = 'delayed')
  from public.ml_envios e
  where e.dia_venda >= p_de
  group by e.conta;
$$;
