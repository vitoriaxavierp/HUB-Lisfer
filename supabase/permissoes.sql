-- Permissões por módulo + usuárias master.
-- Rode este script inteiro UMA vez no SQL Editor do Supabase
-- (Painel do projeto > SQL Editor > New query > colar tudo > Run).
-- Rode ANTES de publicar a versão do site que usa permissões.

-- ==========================================================
-- 1. Masters: só quem está nesta lista administra permissões.
--    A tabela não tem nenhuma política de acesso, então ninguém
--    consegue alterá-la pelo site; só por aqui (SQL Editor).
-- ==========================================================
create table if not exists public.hub_masters (
  email text primary key
);
alter table public.hub_masters enable row level security;

insert into public.hub_masters (email) values
  ('mktvilisfer@gmail.com'),
  ('elisangela@lisfer.com.br')
on conflict do nothing;

-- ==========================================================
-- 2. Módulos liberados para cada usuária
--    chaves: coletas, full_compras, full_separacao, importacao,
--            calc_precos, calc_lucro
-- ==========================================================
create table if not exists public.permissoes (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  modulos text[] not null default '{}',
  atualizado_por uuid references public.profiles(id),
  atualizado_em timestamptz not null default now()
);
alter table public.permissoes enable row level security;

-- ==========================================================
-- 3. Funções usadas pelas regras de acesso (security definer:
--    rodam com permissão do banco, mas só respondem sobre a
--    própria pessoa logada)
-- ==========================================================
create or replace function public.is_master()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from auth.users u
    join public.hub_masters m on lower(m.email) = lower(u.email)
    where u.id = auth.uid()
  );
$$;

create or replace function public.tem_modulo(m text)
returns boolean
language sql stable security definer set search_path = public
as $$
  select public.is_master() or exists (
    select 1 from public.permissoes p
    where p.user_id = auth.uid() and m = any (p.modulos)
  );
$$;

-- o que a pessoa logada pode acessar (o site usa para montar o menu)
create or replace function public.meus_acessos()
returns json
language sql stable security definer set search_path = public
as $$
  select json_build_object(
    'is_master', public.is_master(),
    'modulos', coalesce((select p.modulos from public.permissoes p where p.user_id = auth.uid()), '{}')
  );
$$;

-- lista de usuárias para a tela de administração (só masters)
create or replace function public.listar_usuarios()
returns table (id uuid, nome text, email text, criado_em timestamptz, ultimo_acesso timestamptz, is_master boolean, modulos text[])
language plpgsql stable security definer set search_path = public
as $$
begin
  if not public.is_master() then
    raise exception 'acesso negado';
  end if;
  return query
    select pr.id, pr.nome, u.email::text, u.created_at, u.last_sign_in_at,
           exists (select 1 from public.hub_masters m where lower(m.email) = lower(u.email)),
           coalesce(pe.modulos, '{}')
    from public.profiles pr
    join auth.users u on u.id = pr.id
    left join public.permissoes pe on pe.user_id = pr.id
    order by pr.nome;
end;
$$;

revoke all on function public.listar_usuarios() from anon;
revoke all on function public.meus_acessos() from anon;
revoke all on function public.tem_modulo(text) from anon;
revoke all on function public.is_master() from anon;

-- ==========================================================
-- 4. Regras da tabela de permissões
-- ==========================================================
drop policy if exists "permissoes_select" on public.permissoes;
drop policy if exists "permissoes_insert_master" on public.permissoes;
drop policy if exists "permissoes_update_master" on public.permissoes;
drop policy if exists "permissoes_delete_master" on public.permissoes;
create policy "permissoes_select" on public.permissoes
  for select using (user_id = auth.uid() or public.is_master());
create policy "permissoes_insert_master" on public.permissoes
  for insert with check (public.is_master());
create policy "permissoes_update_master" on public.permissoes
  for update using (public.is_master()) with check (public.is_master());
create policy "permissoes_delete_master" on public.permissoes
  for delete using (public.is_master());

-- ==========================================================
-- 5. Coletas e Importação passam a exigir o módulo liberado
-- ==========================================================
drop policy if exists "pedidos_select_all" on public.pedidos;
drop policy if exists "pedidos_insert_all" on public.pedidos;
drop policy if exists "pedidos_update_all" on public.pedidos;
drop policy if exists "pedidos_delete_all" on public.pedidos;
drop policy if exists "pedidos_select_modulo" on public.pedidos;
create policy "pedidos_select_modulo" on public.pedidos for select using (public.tem_modulo('coletas'));
drop policy if exists "pedidos_insert_modulo" on public.pedidos;
create policy "pedidos_insert_modulo" on public.pedidos for insert with check (public.tem_modulo('coletas'));
drop policy if exists "pedidos_update_modulo" on public.pedidos;
create policy "pedidos_update_modulo" on public.pedidos for update using (public.tem_modulo('coletas'));
drop policy if exists "pedidos_delete_modulo" on public.pedidos;
create policy "pedidos_delete_modulo" on public.pedidos for delete using (public.tem_modulo('coletas'));

drop policy if exists "importacoes_select_all" on public.importacoes;
drop policy if exists "importacoes_insert_all" on public.importacoes;
drop policy if exists "importacoes_update_all" on public.importacoes;
drop policy if exists "importacoes_delete_all" on public.importacoes;
drop policy if exists "importacoes_select_modulo" on public.importacoes;
create policy "importacoes_select_modulo" on public.importacoes for select using (public.tem_modulo('importacao'));
drop policy if exists "importacoes_insert_modulo" on public.importacoes;
create policy "importacoes_insert_modulo" on public.importacoes for insert with check (public.tem_modulo('importacao'));
drop policy if exists "importacoes_update_modulo" on public.importacoes;
create policy "importacoes_update_modulo" on public.importacoes for update using (public.tem_modulo('importacao'));
drop policy if exists "importacoes_delete_modulo" on public.importacoes;
create policy "importacoes_delete_modulo" on public.importacoes for delete using (public.tem_modulo('importacao'));

drop policy if exists "importacao_itens_select_all" on public.importacao_itens;
drop policy if exists "importacao_itens_insert_all" on public.importacao_itens;
drop policy if exists "importacao_itens_update_all" on public.importacao_itens;
drop policy if exists "importacao_itens_delete_all" on public.importacao_itens;
drop policy if exists "importacao_itens_select_modulo" on public.importacao_itens;
create policy "importacao_itens_select_modulo" on public.importacao_itens for select using (public.tem_modulo('importacao'));
drop policy if exists "importacao_itens_insert_modulo" on public.importacao_itens;
create policy "importacao_itens_insert_modulo" on public.importacao_itens for insert with check (public.tem_modulo('importacao'));
drop policy if exists "importacao_itens_update_modulo" on public.importacao_itens;
create policy "importacao_itens_update_modulo" on public.importacao_itens for update using (public.tem_modulo('importacao'));
drop policy if exists "importacao_itens_delete_modulo" on public.importacao_itens;
create policy "importacao_itens_delete_modulo" on public.importacao_itens for delete using (public.tem_modulo('importacao'));

-- ==========================================================
-- 6. Quem já existe mantém tudo; conta nova começa sem nada
-- ==========================================================
insert into public.permissoes (user_id, modulos)
select id, array['coletas','full_compras','full_separacao','importacao','calc_precos','calc_lucro']
from public.profiles
on conflict (user_id) do nothing;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, nome)
  values (new.id, coalesce(new.raw_user_meta_data->>'nome', split_part(new.email, '@', 1)));
  insert into public.permissoes (user_id, modulos) values (new.id, '{}')
  on conflict (user_id) do nothing;
  return new;
end;
$$;
