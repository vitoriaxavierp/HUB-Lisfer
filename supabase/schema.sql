-- Rode este script inteiro uma vez no SQL Editor do Supabase
-- (Painel do projeto > SQL Editor > New query > colar tudo > Run)

-- ==========================================================
-- Perfis (um por funcionária, criado automaticamente no cadastro)
-- ==========================================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_all" on public.profiles
  for select using (auth.role() = 'authenticated');

create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

-- Cria o perfil automaticamente quando uma conta nova é adicionada
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, nome)
  values (new.id, coalesce(new.raw_user_meta_data->>'nome', split_part(new.email, '@', 1)));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ==========================================================
-- Pedidos (a mesma informação que já tínhamos no painel)
-- ==========================================================
create table public.pedidos (
  id uuid primary key default gen_random_uuid(),
  data_coleta date not null,
  cliente text not null,
  documento text,
  documento_tipo text check (documento_tipo in ('cpf', 'cnpj')),
  whatsapp text,
  vendedora_id uuid references public.profiles(id),
  numero_pedido text,
  nf text not null,
  volumes int not null check (volumes > 0),
  obs text,
  tipo_coleta text not null check (tipo_coleta in ('transportadora', 'uber', 'retirada', 'melhor_envio')),
  transportadora_nome text,
  melhor_envio_servico text check (melhor_envio_servico in ('jadlog_com', 'jadlog_package', 'jadlog_package_centralizado', 'correios')),
  link_rastreio text,
  status text not null default 'pendente' check (status in ('pendente', 'coletado')),
  criado_por uuid references public.profiles(id) default auth.uid(),
  criado_em timestamptz not null default now(),
  coletado_por uuid references public.profiles(id),
  coletado_em timestamptz
);

create index pedidos_data_coleta_idx on public.pedidos (data_coleta);

alter table public.pedidos enable row level security;

-- Time inteiro compartilha os mesmos pedidos: todo mundo logado lê e escreve.
create policy "pedidos_select_all" on public.pedidos
  for select using (auth.role() = 'authenticated');

create policy "pedidos_insert_all" on public.pedidos
  for insert with check (auth.role() = 'authenticated');

create policy "pedidos_update_all" on public.pedidos
  for update using (auth.role() = 'authenticated');

create policy "pedidos_delete_all" on public.pedidos
  for delete using (auth.role() = 'authenticated');

-- Liga o tempo real (as outras telas atualizam sozinhas)
alter publication supabase_realtime add table public.pedidos;
