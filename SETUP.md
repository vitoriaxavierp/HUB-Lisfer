# Como colocar o Sistema Lisfer no ar

Siga esta ordem. Nenhum destes passos eu posso fazer por você — são contas suas.

## 1. Criar o banco de dados (Supabase)

1. Acesse **https://supabase.com** e crie uma conta gratuita (pode ser com Google ou GitHub).
2. Clique em **New project**. Dê um nome (ex: `lisfer`), crie uma senha de banco (guarde-a) e escolha a região mais perto do Brasil (`South America (São Paulo)`).
3. Espere o projeto terminar de criar (leva ~2 minutos).
4. No menu lateral, abra **SQL Editor** > **New query**.
5. Abra o arquivo `supabase/schema.sql` (está nesta mesma pasta), copie todo o conteúdo, cole no editor e clique em **Run**.
6. No menu lateral, vá em **Project Settings > API**. Copie dois valores:
   - **Project URL**
   - **anon public key**
7. Abra o arquivo `config.js` (nesta pasta) e cole os dois valores nos lugares indicados.

## 2. Cadastrar as funcionárias

Como não vai ter cadastro público (só quem você autorizar entra), você mesma cria a conta de cada uma:

1. No Supabase, vá em **Authentication > Users > Add user > Create new user**.
2. Preencha e-mail e uma senha provisória para cada funcionária. Marque **Auto Confirm User** para não precisar confirmar e-mail.
3. Depois de criada, ela pode entrar no site com esse e-mail/senha e trocar a senha depois em "Esqueci minha senha".
4. (Opcional) No **Table Editor > profiles**, edite a coluna `nome` de cada uma para o nome que deve aparecer no sistema (por padrão usa a parte antes do @ do e-mail).

## 3. Publicar o site (Vercel)

1. Acesse **https://vercel.com** e crie uma conta gratuita.
2. Clique em **Add New > Project**.
3. Escolha **upload/arrastar pasta** (ou conecte um repositório do GitHub, se preferir) e envie esta pasta inteira (`Sistema Lisfer`), já com o `config.js` preenchido.
4. Clique em **Deploy**. Em menos de um minuto você recebe um link (ex: `lisfer.vercel.app`).
5. (Opcional) Em **Project Settings > Domains**, adicione um domínio próprio se você tiver um.

## 4. Testar

1. Abra o link que a Vercel te deu.
2. Entre com um e-mail/senha que você cadastrou.
3. Lance um pedido de teste e veja se aparece certinho.

---

Qualquer ajuste depois disso (campo novo, cor, outro módulo) é só me chamar — eu edito os arquivos aqui e te aviso o que fazer para atualizar o site publicado.
