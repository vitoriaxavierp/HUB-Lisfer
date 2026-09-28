"""Endpoint: recebe um PDF do Full (base64) e devolve a lista de compras
desmembrada e cruzada com o estoque/custo do Tiny."""

import base64
import io
import json
import os
import sys
import traceback
import urllib.error
import urllib.request
from http.server import BaseHTTPRequestHandler

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "lib"))
import lista_compras  # noqa: E402


def _verificar_sessao(token):
    """Confirma que o token pertence a uma sessao valida do Supabase (ou
    seja, alguem realmente logado no Hub) antes de processar qualquer PDF
    ou consultar o Tiny. Devolve (ok, motivo_do_erro)."""
    if not token:
        return False, "nenhum token recebido do navegador"
    url = os.environ.get("SUPABASE_URL")
    anon_key = os.environ.get("SUPABASE_ANON_KEY")
    if not url:
        return False, "SUPABASE_URL nao configurada no servidor"
    if not anon_key:
        return False, "SUPABASE_ANON_KEY nao configurada no servidor"
    req = urllib.request.Request(
        f"{url}/auth/v1/user",
        headers={"Authorization": f"Bearer {token}", "apikey": anon_key},
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            return resp.status == 200, f"status {resp.status}"
    except urllib.error.HTTPError as e:
        detalhe = e.read().decode("utf-8", errors="replace")
        return False, f"HTTPError {e.code}: {detalhe[:300]}"
    except Exception as e:
        return False, f"{type(e).__name__}: {e}"


class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        try:
            auth_header = self.headers.get("Authorization", "")
            token = auth_header.replace("Bearer ", "").strip()
            ok, motivo = _verificar_sessao(token)
            if not ok:
                self._responder(401, {"erro": "Sessão inválida. Faça login novamente.", "debug": motivo})
                return

            comprimento = int(self.headers.get("Content-Length", 0))
            corpo = self.rfile.read(comprimento)
            payload = json.loads(corpo or b"{}")

            # aceita um unico PDF (formato antigo) ou uma lista de PDFs
            # (varios envios do Full na mesma semana, somados numa unica lista)
            arquivos = payload.get("arquivos")
            if not arquivos and payload.get("pdf_base64"):
                arquivos = [{"nome": None, "pdf_base64": payload["pdf_base64"]}]
            if not arquivos:
                self._responder(400, {"erro": "Nenhum PDF enviado."})
                return

            caminhos = [io.BytesIO(base64.b64decode(a["pdf_base64"])) for a in arquivos]
            nomes = [a.get("nome") for a in arquivos]

            resultado = lista_compras.gerar_lista_compras_de_varios(caminhos, nomes)
            self._responder(200, resultado)
        except ValueError as e:
            # erro esperado: ex. soma das unidades nao bate com o total do PDF
            self._responder(400, {"erro": str(e)})
        except Exception as e:
            traceback.print_exc()
            self._responder(500, {"erro": f"Erro interno ao processar o PDF: {e}"})

    def _responder(self, status, obj):
        body = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)
