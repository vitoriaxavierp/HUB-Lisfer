-- Cor de cada lista do quadro de Anúncios novos.
-- Rode UMA vez no SQL Editor do Supabase, depois do anuncios_trello.sql.
-- Não apaga nada; só adiciona a coluna "cor" e dá cores às listas que já existem.

alter table public.anuncios_colunas add column if not exists cor text;
alter table public.anuncios_colunas drop constraint if exists anuncios_colunas_cor_check;
alter table public.anuncios_colunas add constraint anuncios_colunas_cor_check
  check (cor in ('cinza', 'amarelo', 'azul', 'roxo', 'turquesa', 'laranja', 'rosa', 'verde'));

update public.anuncios_colunas set cor = case
  when concluida then 'verde'
  when lower(nome) like 'pendente%' then 'amarelo'
  when lower(nome) like '%andamento%' then 'azul'
  when lower(nome) like '%revis%' then 'roxo'
  else 'cinza' end
where cor is null;

-- avisa a API do Supabase que a tabela ganhou uma coluna nova
notify pgrst, 'reload schema';
