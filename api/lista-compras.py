"""Endpoint: recebe um PDF do Full (base64) e devolve a lista de compras
desmembrada e cruzada com o estoque/custo do Tiny."""

import base64
import io
import json
import os
import sys
import traceback
import urllib.request
from http.server import BaseHTTPRequestHandler

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "lib"))
import lista_compras  # noqa: E402


def _verificar_sessao(token):
    """Confirma que o token pertence a uma sessao valida do Supabase (ou
    seja, alguem realmente logado no Hub) antes de processar qualquer PDF
    ou consultar o Tiny."""
    if not token:
        return False
    url = os.environ.get("SUPABASE_URL")
    anon_key = os.environ.get("SUPABASE_ANON_KEY")
    if not url or not anon_key:
        return False
    req = urllib.request.Request(
        f"{url}/auth/v1/user",
        headers={"Authorization": f"Bearer {token}", "apikey": anon_key},
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            return resp.status == 200
    except Exception:
        return False


class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        try:
            auth_header = self.headers.get("Authorization", "")
            token = auth_header.replace("Bearer ", "").strip()
            if not _verificar_sessao(token):
                self._responder(401, {"erro": "Sessão inválida. Faça login novamente."})
                return

            comprimento = int(self.headers.get("Content-Length", 0))
            corpo = self.rfile.read(comprimento)
            payload = json.loads(corpo or b"{}")
            pdf_base64 = payload.get("pdf_base64")
            if not pdf_base64:
                self._responder(400, {"erro": "Nenhum PDF enviado."})
                return

            pdf_bytes = base64.b64decode(pdf_base64)
            resultado = lista_compras.gerar_lista_compras(io.BytesIO(pdf_bytes))
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
