-- Rastreio dos envios do Melhor Envio (página Coletas › Rastreio Melhor Envio).
-- Rode este script inteiro UMA vez no SQL Editor do Supabase
-- (Painel do projeto > SQL Editor > New query > colar tudo > Run).
-- Precisa do permissoes.sql e do tarefas.sql já rodados.
--
-- Quem grava aqui é o serviço lisfer-hub-dados (Cloudflare), com a chave secreta
-- do Supabase. As pessoas do Hub só leem, e só podem mudar o vínculo com a coleta.
-- Dados do destinatário guardados: só nome, cidade e UF (nada de endereço,
-- documento ou telefone).

create table if not exists public.me_envios (
  id text primary key,                 -- id da etiqueta no Melhor Envio
  protocolo text,
  status text,                         -- pending, released, generated, received, posted, delivered, undelivered, paused, suspended, canceled, expired
  rastreio text,
  rastreio_me text,
  servico text,
  transportadora text,
  destinatario text,
  cidade text,
  uf text,
  nf_numero text,
  nf_chave text,
  prazo_min integer,
  prazo_max integer,                   -- dias úteis informados pelo Melhor Envio
  preco numeric(12, 2),
  criado_me timestamptz,
  pago_em timestamptz,
  gerado_em timestamptz,
  postado_em timestamptz,
  entregue_em timestamptz,
  cancelado_em timestamptz,
  expirado_em timestamptz,
  prazo_entrega date,                  -- postagem + prazo máximo em dias úteis (calculado pelo Hub)
  alerta text,                         -- atrasado, nao_entregue, interrompido, suspenso, sem_postar
  coleta_id uuid references public.pedidos(id) on delete set null,
  coleta_manual boolean not null default false,
  tarefas jsonb not null default '{}'::jsonb,   -- tarefas automáticas já criadas, por motivo
  lido_em timestamptz,
  atualizado_em timestamptz not null default now()
);
create index if not exists me_envios_status_idx on public.me_envios (status);
create index if not exists me_envios_criado_idx on public.me_envios (criado_me desc);
create index if not exists me_envios_coleta_idx on public.me_envios (coleta_id);

-- mudanças de status percebidas pelo Hub (o Melhor Envio não envia as
-- movimentações detalhadas da transportadora, só o status atual)
create table if not exists public.me_eventos (
  id bigint generated always as identity primary key,
  envio_id text not null references public.me_envios(id) on delete cascade,
  status_de text,
  status_para text not null,
  em timestamptz not null default now()
);
create index if not exists me_eventos_envio_idx on public.me_eventos (envio_id, em);

alter table public.me_envios enable row level security;
alter table public.me_eventos enable row level security;

drop policy if exists "me_envios_select" on public.me_envios;
create policy "me_envios_select" on public.me_envios for select using (public.tem_modulo('coletas'));
drop policy if exists "me_envios_update" on public.me_envios;
create policy "me_envios_update" on public.me_envios for update using (public.tem_modulo('coletas'));
drop policy if exists "me_eventos_select" on public.me_eventos;
create policy "me_eventos_select" on public.me_eventos for select using (public.tem_modulo('coletas'));

-- pelo Hub, só o vínculo com a coleta pode mudar
create or replace function public.me_envios_proteger() returns trigger
language plpgsql as $$
declare
  vinculo_novo uuid := new.coleta_id;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    new := old;
    new.coleta_id := vinculo_novo;
    new.coleta_manual := true;
    new.atualizado_em := now();
  end if;
  return new;
end $$;

drop trigger if exists me_envios_proteger_trg on public.me_envios;
create trigger me_envios_proteger_trg before update on public.me_envios
  for each row execute function public.me_envios_proteger();

do $$ begin alter publication supabase_realtime add table public.me_envios; exception when duplicate_object then null; end $$;

notify pgrst, 'reload schema';
