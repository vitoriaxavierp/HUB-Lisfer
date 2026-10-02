-- Anúncios novos no formato Trello: colunas livres, ordem dos cartões,
-- prioridade, comentários e histórico.
-- Rode este script inteiro UMA vez no SQL Editor do Supabase, depois do
-- anuncios.sql (Painel do projeto > SQL Editor > New query > colar tudo > Run).
-- Não apaga nada: os cartões atuais vão para as colunas Pendente,
-- Em andamento e Pronto, na mesma ordem de hoje.

-- ---------- colunas ----------
create table if not exists public.anuncios_colunas (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (length(btrim(nome)) between 1 and 60),
  ordem double precision not null default 0,
  concluida boolean not null default false,   -- cartões aqui contam como prontos
  criado_em timestamptz not null default now()
);

insert into public.anuncios_colunas (nome, ordem, concluida)
select v.nome, v.ordem, v.concluida
from (values ('Pendente', 1000, false), ('Em andamento', 2000, false), ('Pronto', 3000, true)) as v(nome, ordem, concluida)
where not exists (select 1 from public.anuncios_colunas);

alter table public.anuncios_colunas enable row level security;
drop policy if exists "anuncios_colunas_select" on public.anuncios_colunas;
create policy "anuncios_colunas_select" on public.anuncios_colunas for select using (public.tem_modulo('anuncios'));
drop policy if exists "anuncios_colunas_insert" on public.anuncios_colunas;
create policy "anuncios_colunas_insert" on public.anuncios_colunas for insert with check (public.tem_modulo('anuncios'));
drop policy if exists "anuncios_colunas_update" on public.anuncios_colunas;
create policy "anuncios_colunas_update" on public.anuncios_colunas for update using (public.tem_modulo('anuncios'));
drop policy if exists "anuncios_colunas_delete" on public.anuncios_colunas;
create policy "anuncios_colunas_delete" on public.anuncios_colunas for delete using (public.tem_modulo('anuncios'));

-- ---------- cartões: coluna, posição e prioridade ----------
alter table public.anuncios add column if not exists coluna_id uuid references public.anuncios_colunas(id) on delete restrict;
alter table public.anuncios add column if not exists posicao double precision;
alter table public.anuncios add column if not exists prioridade text;
alter table public.anuncios drop constraint if exists anuncios_prioridade_check;
alter table public.anuncios add constraint anuncios_prioridade_check check (prioridade in ('urgente', 'alta', 'normal'));
-- o status antigo fica só como registro; quem manda agora é a coluna
alter table public.anuncios drop constraint if exists anuncios_status_check;
alter table public.anuncios alter column status drop not null;
create index if not exists anuncios_coluna_idx on public.anuncios (coluna_id, posicao);

update public.anuncios a set coluna_id = c.id
from public.anuncios_colunas c
where a.coluna_id is null
  and c.nome = case a.status when 'andamento' then 'Em andamento' when 'pronto' then 'Pronto' else 'Pendente' end;

update public.anuncios a set posicao = o.n * 1000
from (select id, row_number() over (partition by coluna_id order by criado_em) as n from public.anuncios) o
where a.id = o.id and a.posicao is null;

-- ---------- comentários ----------
create table if not exists public.anuncios_comentarios (
  id uuid primary key default gen_random_uuid(),
  anuncio_id uuid not null references public.anuncios(id) on delete cascade,
  autor_id uuid references public.profiles(id) on delete set null default auth.uid(),
  texto text not null check (length(btrim(texto)) between 1 and 4000),
  criado_em timestamptz not null default now()
);
create index if not exists anuncios_comentarios_idx on public.anuncios_comentarios (anuncio_id, criado_em);

alter table public.anuncios_comentarios enable row level security;
drop policy if exists "anuncios_coment_select" on public.anuncios_comentarios;
create policy "anuncios_coment_select" on public.anuncios_comentarios for select using (public.tem_modulo('anuncios'));
drop policy if exists "anuncios_coment_insert" on public.anuncios_comentarios;
create policy "anuncios_coment_insert" on public.anuncios_comentarios for insert
  with check (public.tem_modulo('anuncios') and autor_id = auth.uid());
-- só quem escreveu (ou uma master) apaga o próprio comentário; ninguém edita
drop policy if exists "anuncios_coment_delete" on public.anuncios_comentarios;
create policy "anuncios_coment_delete" on public.anuncios_comentarios for delete
  using (public.tem_modulo('anuncios') and (autor_id = auth.uid() or public.is_master()));

-- ---------- histórico (gravado só pelo banco, ninguém edita) ----------
create table if not exists public.anuncios_historico (
  id bigint generated always as identity primary key,
  anuncio_id uuid not null references public.anuncios(id) on delete cascade,
  autor_id uuid references public.profiles(id) on delete set null,
  acao text not null,
  criado_em timestamptz not null default now()
);
create index if not exists anuncios_historico_idx on public.anuncios_historico (anuncio_id, criado_em);

alter table public.anuncios_historico enable row level security;
drop policy if exists "anuncios_hist_select" on public.anuncios_historico;
create policy "anuncios_hist_select" on public.anuncios_historico for select using (public.tem_modulo('anuncios'));

create or replace function public.anuncios_registrar() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  de text;
  para text;
  rotulo constant jsonb := '{"urgente": "Urgente", "alta": "Alta", "normal": "Normal"}';
begin
  if tg_op = 'INSERT' then
    select nome into para from anuncios_colunas where id = new.coluna_id;
    insert into anuncios_historico (anuncio_id, autor_id, acao)
      values (new.id, auth.uid(), 'criou o cartão' || coalesce(' em ' || para, ''));
    return new;
  end if;

  if new.coluna_id is distinct from old.coluna_id then
    select nome into de from anuncios_colunas where id = old.coluna_id;
    select nome into para from anuncios_colunas where id = new.coluna_id;
    insert into anuncios_historico (anuncio_id, autor_id, acao)
      values (new.id, auth.uid(), 'moveu de ' || coalesce(de, '(sem coluna)') || ' para ' || coalesce(para, '(sem coluna)'));
  end if;
  if new.responsavel_id is distinct from old.responsavel_id then
    insert into anuncios_historico (anuncio_id, autor_id, acao)
      values (new.id, auth.uid(), case when new.responsavel_id is null then 'tirou o responsável'
        else 'passou para ' || coalesce((select nome from profiles where id = new.responsavel_id), 'outra pessoa') end);
  end if;
  if new.prioridade is distinct from old.prioridade then
    insert into anuncios_historico (anuncio_id, autor_id, acao)
      values (new.id, auth.uid(), case when new.prioridade is null then 'tirou a prioridade'
        else 'marcou a prioridade como ' || (rotulo ->> new.prioridade) end);
  end if;
  if new.sku is distinct from old.sku then
    insert into anuncios_historico (anuncio_id, autor_id, acao)
      values (new.id, auth.uid(), 'trocou o SKU de ' || old.sku || ' para ' || new.sku);
  end if;
  if new.produto is distinct from old.produto then
    insert into anuncios_historico (anuncio_id, autor_id, acao) values (new.id, auth.uid(), 'editou o nome do produto');
  end if;
  if new.obs is distinct from old.obs then
    insert into anuncios_historico (anuncio_id, autor_id, acao) values (new.id, auth.uid(), 'editou a descrição');
  end if;
  return new;
end $$;

drop trigger if exists anuncios_registrar_trg on public.anuncios;
create trigger anuncios_registrar_trg after insert or update on public.anuncios
  for each row execute function public.anuncios_registrar();

-- ---------- tempo real ----------
do $$ begin alter publication supabase_realtime add table public.anuncios_colunas; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.anuncios_comentarios; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.anuncios_historico; exception when duplicate_object then null; end $$;
