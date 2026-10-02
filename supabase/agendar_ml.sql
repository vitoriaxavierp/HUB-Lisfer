-- Agenda a leitura do Mercado Livre (serviço lisfer-hub-dados) a cada 2 minutos,
-- usando o agendador do próprio Supabase (a conta Cloudflare gratuita já usa
-- os 5 agendamentos permitidos).
--
-- ANTES DE RODAR: troque SUA_CHAVE (na linha do net.http_get) pela senha que
-- você cadastrou como CHAVE no serviço lisfer-hub-dados da Cloudflare.
-- Rode no SQL Editor do Supabase.

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- se já existir um agendamento com esse nome, troca pelo novo
select cron.unschedule(jobid) from cron.job where jobname = 'ml-hub-dados';

select cron.schedule(
  'ml-hub-dados',
  '*/2 * * * *',
  $$
  select net.http_get(
    url := 'https://lisfer-hub-dados.ellis-ellis2406.workers.dev/rodar?chave=SUA_CHAVE',
    timeout_milliseconds := 60000
  );
  $$
);

-- Para conferir depois (rode separado):
--   select status_code, left(content::text, 300), created
--   from net._http_response order by created desc limit 5;
-- Para parar o agendamento:
--   select cron.unschedule('ml-hub-dados');
