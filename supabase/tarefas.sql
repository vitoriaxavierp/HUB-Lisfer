-- Tarefas entre pessoas da equipe (painel "Tarefas" no Início).
-- Rode este script inteiro UMA vez no SQL Editor do Supabase
-- (Painel do projeto > SQL Editor > New query > colar tudo > Run).
-- Precisa do permissoes.sql já rodado (usa is_master e tem_modulo).
--
-- Regras:
--   * Quem tem o módulo "tarefas" (Agendar tarefas) cria tarefas para qualquer pessoa.
--   * Cada pessoa vê só as tarefas que recebeu ou que pediu (masters veem todas).
--   * Só quem recebeu (ou uma master) marca como feita ou desfaz.
--   * Quem pediu pode editar, excluir e dar "ciente" depois que a tarefa foi feita.
--   * Quem pediu e a data/hora são gravados pelo banco, não pelo site.

create table if not exists public.tarefas (
  id uuid primary key default gen_random_uuid(),
  titulo text not null check (char_length(btrim(titulo)) between 1 and 200),
  detalhes text check (detalhes is null or char_length(detalhes) <= 4000),
  para_id uuid not null references public.profiles(id) on delete cascade,
  de_id uuid references public.profiles(id) on delete set null default auth.uid(),
  prazo date,
  feita_em timestamptz,
  feita_por uuid references public.profiles(id) on delete set null,
  ciente_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index if not exists tarefas_para_idx on public.tarefas (para_id, feita_em);
create index if not exists tarefas_de_idx on public.tarefas (de_id, ciente_em);

alter table public.tarefas enable row level security;

drop policy if exists "tarefas_select" on public.tarefas;
create policy "tarefas_select" on public.tarefas for select
  using (para_id = auth.uid() or de_id = auth.uid() or public.is_master());

drop policy if exists "tarefas_insert" on public.tarefas;
create policy "tarefas_insert" on public.tarefas for insert
  with check (public.tem_modulo('tarefas') and de_id = auth.uid());

drop policy if exists "tarefas_update" on public.tarefas;
create policy "tarefas_update" on public.tarefas for update
  using (para_id = auth.uid() or de_id = auth.uid() or public.is_master());

drop policy if exists "tarefas_delete" on public.tarefas;
create policy "tarefas_delete" on public.tarefas for delete
  using (de_id = auth.uid() or public.is_master());

-- o banco garante quem pode mudar o quê, mesmo que alguém tente pelo navegador
create or replace function public.tarefas_proteger() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  eu uuid := auth.uid();
  master boolean := public.is_master();
begin
  if tg_op = 'INSERT' then
    new.de_id := eu;
    new.criado_em := now();
    new.atualizado_em := now();
    new.feita_em := null;
    new.feita_por := null;
    new.ciente_em := null;
    return new;
  end if;

  new.de_id := old.de_id;
  new.criado_em := old.criado_em;
  -- quem só recebeu a tarefa não muda o texto, a pessoa nem o prazo
  if not master and eu is distinct from old.de_id then
    new.titulo := old.titulo;
    new.detalhes := old.detalhes;
    new.para_id := old.para_id;
    new.prazo := old.prazo;
    new.ciente_em := old.ciente_em;
  end if;
  -- só quem recebeu (ou uma master) marca como feita
  if not master and eu is distinct from old.para_id then
    new.feita_em := old.feita_em;
  end if;
  if new.feita_em is distinct from old.feita_em then
    if new.feita_em is null then
      new.feita_por := null;
      new.ciente_em := null;
    else
      new.feita_em := now();
      new.feita_por := eu;
    end if;
  else
    new.feita_por := old.feita_por;
  end if;
  -- "ciente" só existe depois de feita
  if new.feita_em is null then new.ciente_em := null; end if;
  if new.ciente_em is distinct from old.ciente_em and new.ciente_em is not null then new.ciente_em := now(); end if;
  new.atualizado_em := now();
  return new;
end $$;

drop trigger if exists tarefas_proteger_trg on public.tarefas;
create trigger tarefas_proteger_trg before insert or update on public.tarefas
  for each row execute function public.tarefas_proteger();

-- tempo real (o painel atualiza sozinho e avisa quando a tarefa é feita)
do $$ begin alter publication supabase_realtime add table public.tarefas; exception when duplicate_object then null; end $$;

notify pgrst, 'reload schema';
