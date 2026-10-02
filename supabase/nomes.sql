-- Masters podem definir o nome de exibição de qualquer usuária.
-- Rode este script inteiro UMA vez no SQL Editor do Supabase
-- (Painel do projeto > SQL Editor > New query > colar tudo > Run).
-- Precisa do permissoes.sql já rodado (usa a função is_master).

drop policy if exists "profiles_update_master" on public.profiles;
create policy "profiles_update_master" on public.profiles
  for update using (public.is_master()) with check (public.is_master());

-- nome não pode ficar vazio nem gigante
alter table public.profiles drop constraint if exists profiles_nome_tamanho;
alter table public.profiles add constraint profiles_nome_tamanho
  check (nome is null or char_length(btrim(nome)) between 1 and 60) not valid;
