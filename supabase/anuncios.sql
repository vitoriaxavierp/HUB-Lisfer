-- Anúncios novos (quadro Pendente → Em andamento → Pronto).
-- Rode este script inteiro UMA vez no SQL Editor do Supabase
-- (Painel do projeto > SQL Editor > New query > colar tudo > Run).
-- Precisa do permissoes.sql já rodado (usa a função tem_modulo).

create table if not exists public.anuncios (
  id uuid primary key default gen_random_uuid(),
  sku text not null,
  produto text not null,
  status text not null default 'pendente' check (status in ('pendente', 'andamento', 'pronto')),
  responsavel_id uuid references public.profiles(id) on delete set null,
  obs text,
  criado_por uuid references public.profiles(id) default auth.uid(),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  concluido_em timestamptz
);

create index if not exists anuncios_status_idx on public.anuncios (status);

alter table public.anuncios enable row level security;

drop policy if exists "anuncios_select_modulo" on public.anuncios;
create policy "anuncios_select_modulo" on public.anuncios for select using (public.tem_modulo('anuncios'));
drop policy if exists "anuncios_insert_modulo" on public.anuncios;
create policy "anuncios_insert_modulo" on public.anuncios for insert with check (public.tem_modulo('anuncios'));
drop policy if exists "anuncios_update_modulo" on public.anuncios;
create policy "anuncios_update_modulo" on public.anuncios for update using (public.tem_modulo('anuncios'));
drop policy if exists "anuncios_delete_modulo" on public.anuncios;
create policy "anuncios_delete_modulo" on public.anuncios for delete using (public.tem_modulo('anuncios'));

-- tempo real (as outras telas atualizam sozinhas)
do $$
begin
  alter publication supabase_realtime add table public.anuncios;
exception when duplicate_object then null;
end $$;

-- primeiros anúncios a fazer (só entram se o SKU ainda não estiver no quadro)
insert into public.anuncios (sku, produto)
select v.sku, v.produto
from (values
  ('LF-0335', 'Chave Saca Filtros Filtro 80mm A 105mm - Lisfer'),
  ('LF-0337', 'Chave Saca Filtros Filtro 105mm A 145mm - Lisfer'),
  ('LF-0338', 'Ferramenta para Remoção da Tampa do Tanque de Combustível - Lisfer'),
  ('LF-0339', 'Ferramenta para Remoção da Tampa do Tanque de Combustível - Lisfer'),
  ('LF-0340', 'Ferramenta para Remoção da Tampa do Tanque de Combustivel Com 4 Garras - Lisfer'),
  ('LF-0341', 'Transformador De Graus Com Encaixe de 1/2" - Lisfer'),
  ('LF-0342', 'Ferramenta Para Abrir Tampa Da Mecatrônica Do Câmbio 7 Vel. DSG - Lisfer'),
  ('LF-0343', 'Esticador Hidráulico 4 Toneladas - Lisfer'),
  ('LF-0344', 'Macaco Jacaré Rebaixado 3 Ton. Bomba Dupla - Lisfer'),
  ('LF-0345', 'Macaco Hidráulico Jacaré 3 Toneladas - Lisfer'),
  ('LF-0346', 'Multiplicador De Torque 2 Soquetes - Lisfer')
) as v(sku, produto)
where not exists (select 1 from public.anuncios a where upper(a.sku) = upper(v.sku));
