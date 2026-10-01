"""Verificacoes de seguranca compartilhadas pelos endpoints da pasta /api.

Tudo que expoe dados do Tiny passa por aqui antes: confirma a sessao do
Supabase, limita o tamanho do que chega e padroniza as respostas de erro
(sem detalhes internos que ajudem um invasor)."""

import json
import os
import re
import urllib.error
import urllib.request

# A Vercel ja corta corpos acima de ~4,5 MB; este limite e uma segunda trava.
LIMITE_CORPO_BYTES = 4 * 1024 * 1024
LIMITE_PDFS_POR_ENVIO = 10


class ErroRequisicao(Exception):
    """Erro esperado, com mensagem segura para mostrar ao usuario."""

    def __init__(self, status, mensagem):
        super().__init__(mensagem)
        self.status = status
        self.mensagem = mensagem


def sessao_valida(headers):
    """True se o header Authorization traz um token de sessao valido do
    Supabase (alguem realmente logado no Hub). O motivo de uma recusa so
    vai para o log do servidor, nunca para a resposta."""
    auth_header = headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return False
    token = auth_header[len("Bearer "):].strip()
    url = os.environ.get("SUPABASE_URL")
    anon_key = os.environ.get("SUPABASE_ANON_KEY")
    if not token or not url or not anon_key:
        print("[seguranca] sessao recusada: token ausente ou Supabase nao configurado")
        return False
    req = urllib.request.Request(
        f"{url}/auth/v1/user",
        headers={"Authorization": f"Bearer {token}", "apikey": anon_key},
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            if resp.status != 200:
                return False
            usuario = json.loads(resp.read() or b"{}")
            return bool(usuario.get("id"))
    except urllib.error.HTTPError as e:
        print(f"[seguranca] sessao recusada: HTTP {e.code}")
        return False
    except Exception as e:
        print(f"[seguranca] falha ao verificar sessao: {type(e).__name__}")
        return False


def tem_modulo(headers, modulo):
    """True se a pessoa logada tem o modulo liberado (ou e master). Usa a
    funcao tem_modulo do banco com o token da propria pessoa, entao vale a
    mesma regra das tabelas. Qualquer falha nega o acesso."""
    token = headers.get("Authorization", "")[len("Bearer "):].strip()
    url = os.environ.get("SUPABASE_URL")
    anon_key = os.environ.get("SUPABASE_ANON_KEY")
    if not token or not url or not anon_key:
        return False
    req = urllib.request.Request(
        f"{url}/rest/v1/rpc/tem_modulo",
        data=json.dumps({"m": modulo}).encode("utf-8"),
        headers={"Authorization": f"Bearer {token}", "apikey": anon_key, "Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            return json.loads(resp.read() or b"false") is True
    except urllib.error.HTTPError as e:
        print(f"[seguranca] checagem de modulo recusada: HTTP {e.code}")
        return False
    except Exception as e:
        print(f"[seguranca] falha ao checar modulo: {type(e).__name__}")
        return False


def recusar_modulo(handler):
    responder_json(handler, 403, {"erro": "Você não tem acesso a este módulo. Peça a uma administradora do Hub para liberar."})


def ler_json(handler):
    """Le e decodifica o corpo JSON, recusando corpos grandes demais."""
    try:
        comprimento = int(handler.headers.get("Content-Length", 0))
    except ValueError:
        raise ErroRequisicao(400, "Requisição inválida.")
    if comprimento <= 0:
        raise ErroRequisicao(400, "Requisição vazia.")
    if comprimento > LIMITE_CORPO_BYTES:
        raise ErroRequisicao(413, "Arquivo grande demais (limite de 4 MB por envio).")
    try:
        payload = json.loads(handler.rfile.read(comprimento))
    except ValueError:
        raise ErroRequisicao(400, "Requisição inválida.")
    if not isinstance(payload, dict):
        raise ErroRequisicao(400, "Requisição inválida.")
    return payload


def nome_arquivo_seguro(texto, padrao="lista"):
    """Deixa so letras, numeros, - e _ (o texto vem do PDF enviado e vai
    para o header Content-Disposition)."""
    limpo = re.sub(r"[^A-Za-z0-9_-]", "", str(texto or ""))[:60]
    return limpo or padrao


def responder_json(handler, status, obj):
    body = json.dumps(obj, ensure_ascii=False).encode("utf-8")
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json; charset=utf-8")
    handler.send_header("Content-Length", str(len(body)))
    handler.send_header("Cache-Control", "no-store")
    handler.end_headers()
    handler.wfile.write(body)


def responder_arquivo(handler, conteudo, content_type, disposition):
    handler.send_response(200)
    handler.send_header("Content-Type", content_type)
    handler.send_header("Content-Disposition", disposition)
    handler.send_header("Content-Length", str(len(conteudo)))
    handler.send_header("Cache-Control", "no-store")
    handler.end_headers()
    handler.wfile.write(conteudo)


def recusar_sessao(handler):
    responder_json(handler, 401, {"erro": "Sessão inválida. Faça login novamente."})
