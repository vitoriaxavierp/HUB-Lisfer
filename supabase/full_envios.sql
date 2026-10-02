-- Controle de envios do Mercado Livre Full.
-- Rode este script inteiro UMA vez no SQL Editor do Supabase
-- (Painel do projeto > SQL Editor > New query > colar tudo > Run).
-- Precisa do permissoes.sql já rodado (usa a função tem_modulo).
-- Novo módulo de acesso: "full_envios" (Full · Envios), liberado em Usuários e acessos.
--
-- Contas: '1' Lisfer 1, '2' Lisfer 2, '4' Lalfer Deus, '3' Lalfer 2 (mesmos códigos do Mercado Livre no Hub).

-- ---------- envios ----------
create table if not exists public.full_envios (
  id uuid primary key default gen_random_uuid(),
  conta text not null check (conta in ('1', '2', '3', '4')),
  numero text check (numero is null or char_length(btrim(numero)) between 1 and 40),  -- "Frete #" do PDF
  data_coleta date not null,
  hora_coleta text check (hora_coleta is null or char_length(hora_coleta) <= 20),
  etapa text not null default 'planejado'
    check (etapa in ('planejado', 'preparacao', 'pronto', 'coletado', 'recebido', 'cancelado')),
  responsavel_id uuid references public.profiles(id) on delete set null,
  volumes integer check (volumes is null or volumes between 0 and 100000),
  observacoes text check (observacoes is null or char_length(observacoes) <= 4000),
  checklist jsonb not null default '{}'::jsonb,   -- { "compras": {"em": "...", "por": "uuid"}, ... }
  coletado_em timestamptz,
  recebido_em date,
  disponivel_em date,
  obs_recebimento text check (obs_recebimento is null or char_length(obs_recebimento) <= 4000),
  criado_por uuid references public.profiles(id) on delete set null default auth.uid(),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index if not exists full_envios_data_idx on public.full_envios (data_coleta);
create unique index if not exists full_envios_numero_uk on public.full_envios (upper(btrim(numero))) where numero is not null;

-- ---------- itens de cada envio (do PDF) ----------
create table if not exists public.full_envio_itens (
  id uuid primary key default gen_random_uuid(),
  envio_id uuid not null references public.full_envios(id) on delete cascade,
  sku text not null,
  titulo text,
  codigo_ml text,
  quantidade integer not null check (quantidade >= 0),
  recebida integer check (recebida is null or recebida >= 0),   -- o que o ML confirmou no CD
  unique (envio_id, sku)
);
create index if not exists full_envio_itens_sku_idx on public.full_envio_itens (upper(sku));

-- ---------- histórico (gravado só pelo banco) ----------
create table if not exists public.full_envio_historico (
  id bigint generated always as identity primary key,
  envio_id uuid not null references public.full_envios(id) on delete cascade,
  autor_id uuid references public.profiles(id) on delete set null,
  acao text not null,
  criado_em timestamptz not null default now()
);
create index if not exists full_envio_historico_idx on public.full_envio_historico (envio_id, criado_em);

-- ---------- acesso ----------
alter table public.full_envios enable row level security;
alter table public.full_envio_itens enable row level security;
alter table public.full_envio_historico enable row level security;

drop policy if exists "full_envios_select" on public.full_envios;
create policy "full_envios_select" on public.full_envios for select using (public.tem_modulo('full_envios'));
drop policy if exists "full_envios_insert" on public.full_envios;
create policy "full_envios_insert" on public.full_envios for insert with check (public.tem_modulo('full_envios'));
drop policy if exists "full_envios_update" on public.full_envios;
create policy "full_envios_update" on public.full_envios for update using (public.tem_modulo('full_envios'));
drop policy if exists "full_envios_delete" on public.full_envios;
create policy "full_envios_delete" on public.full_envios for delete using (public.tem_modulo('full_envios'));

drop policy if exists "full_itens_select" on public.full_envio_itens;
create policy "full_itens_select" on public.full_envio_itens for select using (public.tem_modulo('full_envios'));
drop policy if exists "full_itens_insert" on public.full_envio_itens;
create policy "full_itens_insert" on public.full_envio_itens for insert with check (public.tem_modulo('full_envios'));
drop policy if exists "full_itens_update" on public.full_envio_itens;
create policy "full_itens_update" on public.full_envio_itens for update using (public.tem_modulo('full_envios'));
drop policy if exists "full_itens_delete" on public.full_envio_itens;
create policy "full_itens_delete" on public.full_envio_itens for delete using (public.tem_modulo('full_envios'));

drop policy if exists "full_hist_select" on public.full_envio_historico;
create policy "full_hist_select" on public.full_envio_historico for select using (public.tem_modulo('full_envios'));

-- ---------- regras automáticas + histórico ----------
create or replace function public.full_envios_antes() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    new.criado_em := now();
    if auth.uid() is not null then new.criado_por := auth.uid(); end if;
  else
    new.criado_por := old.criado_por;
    new.criado_em := old.criado_em;
  end if;
  new.atualizado_em := now();
  if new.etapa in ('coletado', 'recebido') and new.coletado_em is null then new.coletado_em := now(); end if;
  if new.etapa in ('planejado', 'preparacao', 'pronto') then new.coletado_em := null; end if;
  if new.etapa = 'recebido' and new.recebido_em is null then new.recebido_em := (now() at time zone 'America/Sao_Paulo')::date; end if;
  return new;
end $$;

drop trigger if exists full_envios_antes_trg on public.full_envios;
create trigger full_envios_antes_trg before insert or update on public.full_envios
  for each row execute function public.full_envios_antes();

create or replace function public.full_envios_registrar() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  etapas constant jsonb := '{"planejado": "Planejado", "preparacao": "Em preparação", "pronto": "Pronto para coleta", "coletado": "Coletado", "recebido": "Recebido no ML", "cancelado": "Cancelado"}';
  itens constant jsonb := '{"compras": "Lista de compras feita", "separado": "Produtos separados", "conferido": "Conferido", "nf": "NF emitida", "etiquetas": "Etiquetas impressas e coladas"}';
  k text;
  quem uuid := auth.uid();
  log text[] := '{}';
begin
  if tg_op = 'INSERT' then
    insert into full_envio_historico (envio_id, autor_id, acao) values (new.id, quem, 'cadastrou o envio');
    return new;
  end if;
  if new.etapa is distinct from old.etapa then log := log || ('mudou a etapa para ' || (etapas ->> new.etapa)); end if;
  if new.data_coleta is distinct from old.data_coleta then log := log || ('mudou a coleta para ' || to_char(new.data_coleta, 'DD/MM/YYYY')); end if;
  if new.numero is distinct from old.numero then log := log || ('definiu o número do Full: ' || coalesce(new.numero, '(sem número)')); end if;
  if new.conta is distinct from old.conta then log := log || 'trocou a conta'; end if;
  if new.responsavel_id is distinct from old.responsavel_id then
    log := log || (case when new.responsavel_id is null then 'tirou o responsável'
      else 'passou para ' || coalesce((select nome from profiles where id = new.responsavel_id), 'outra pessoa') end);
  end if;
  if new.observacoes is distinct from old.observacoes then log := log || 'editou as observações'; end if;
  if new.volumes is distinct from old.volumes then log := log || ('volumes: ' || coalesce(new.volumes::text, '—')); end if;
  if new.recebido_em is distinct from old.recebido_em or new.disponivel_em is distinct from old.disponivel_em
     or new.obs_recebimento is distinct from old.obs_recebimento then log := log || 'atualizou o recebimento no ML'; end if;
  for k in select jsonb_object_keys(itens) loop
    if (new.checklist ? k) and not (old.checklist ? k) then log := log || ('marcou "' || (itens ->> k) || '"'); end if;
    if (old.checklist ? k) and not (new.checklist ? k) then log := log || ('desmarcou "' || (itens ->> k) || '"'); end if;
  end loop;
  if array_length(log, 1) > 0 then
    insert into full_envio_historico (envio_id, autor_id, acao) select new.id, quem, unnest(log);
  end if;
  return new;
end $$;

drop trigger if exists full_envios_registrar_trg on public.full_envios;
create trigger full_envios_registrar_trg after insert or update on public.full_envios
  for each row execute function public.full_envios_registrar();

-- ---------- tempo real ----------
do $$ begin alter publication supabase_realtime add table public.full_envios; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.full_envio_itens; exception when duplicate_object then null; end $$;

-- ---------- envios já combinados (só entram uma vez) ----------
insert into public.full_envios (conta, data_coleta, etapa)
select v.conta, v.data_coleta::date, v.etapa
from (values
  ('1', '2026-10-01', 'coletado', 1),
  ('1', '2026-10-01', 'coletado', 2),
  ('2', '2026-10-09', 'planejado', 1),
  ('4', '2026-10-12', 'planejado', 1)
) as v(conta, data_coleta, etapa, n)
where not exists (select 1 from public.full_envios);

notify pgrst, 'reload schema';
