-- Rode este script inteiro uma vez no SQL Editor do Supabase
-- (Painel do projeto > SQL Editor > New query > colar tudo > Run)

-- ==========================================================
-- Importações (embarques de fornecedores) e seus itens
-- ==========================================================
create table public.importacoes (
  id uuid primary key default gen_random_uuid(),
  pi_numero text not null,
  fornecedor text not null,
  status text not null default 'em_fabricacao' check (status in ('em_fabricacao', 'aguardando_embarque', 'em_transito', 'chegou')),
  data_embarque date,
  data_chegada_estimada date,
  valor_total_usd numeric,
  obs text,
  criado_por uuid references public.profiles(id) default auth.uid(),
  criado_em timestamptz not null default now()
);

alter table public.importacoes enable row level security;

create policy "importacoes_select_all" on public.importacoes
  for select using (auth.role() = 'authenticated');
create policy "importacoes_insert_all" on public.importacoes
  for insert with check (auth.role() = 'authenticated');
create policy "importacoes_update_all" on public.importacoes
  for update using (auth.role() = 'authenticated');
create policy "importacoes_delete_all" on public.importacoes
  for delete using (auth.role() = 'authenticated');

alter publication supabase_realtime add table public.importacoes;

create table public.importacao_itens (
  id uuid primary key default gen_random_uuid(),
  importacao_id uuid not null references public.importacoes(id) on delete cascade,
  sku text not null,
  produto text not null,
  quantidade int not null check (quantidade > 0),
  preco_unit_usd numeric
);

create index importacao_itens_importacao_id_idx on public.importacao_itens (importacao_id);

alter table public.importacao_itens enable row level security;

create policy "importacao_itens_select_all" on public.importacao_itens
  for select using (auth.role() = 'authenticated');
create policy "importacao_itens_insert_all" on public.importacao_itens
  for insert with check (auth.role() = 'authenticated');
create policy "importacao_itens_update_all" on public.importacao_itens
  for update using (auth.role() = 'authenticated');
create policy "importacao_itens_delete_all" on public.importacao_itens
  for delete using (auth.role() = 'authenticated');

alter publication supabase_realtime add table public.importacao_itens;
