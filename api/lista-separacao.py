"""Endpoint: recebe um PDF do Full (base64) e devolve o PDF pronto da
Lista de Separação (itens como estao no envio, agrupados por marca)."""

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
import lista_separacao  # noqa: E402
import pdf_separacao  # noqa: E402


def _verificar_sessao(token):
    if not token:
        return False, "nenhum token recebido do navegador"
    url = os.environ.get("SUPABASE_URL")
    anon_key = os.environ.get("SUPABASE_ANON_KEY")
    if not url or not anon_key:
        return False, "Supabase nao configurado no servidor"
    req = urllib.request.Request(
        f"{url}/auth/v1/user",
        headers={"Authorization": f"Bearer {token}", "apikey": anon_key},
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            return resp.status == 200, f"status {resp.status}"
    except urllib.error.HTTPError as e:
        return False, f"HTTPError {e.code}: {e.read().decode('utf-8', errors='replace')[:300]}"
    except Exception as e:
        return False, f"{type(e).__name__}: {e}"


class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        try:
            auth_header = self.headers.get("Authorization", "")
            token = auth_header.replace("Bearer ", "").strip()
            ok, motivo = _verificar_sessao(token)
            if not ok:
                self._responder_erro(401, "Sessão inválida. Faça login novamente.", motivo)
                return

            comprimento = int(self.headers.get("Content-Length", 0))
            corpo = self.rfile.read(comprimento)
            payload = json.loads(corpo or b"{}")
            pdf_base64 = payload.get("pdf_base64")
            if not pdf_base64:
                self._responder_erro(400, "Nenhum PDF enviado.")
                return

            pdf_bytes = base64.b64decode(pdf_base64)
            resultado = lista_separacao.gerar_lista_separacao(io.BytesIO(pdf_bytes))
            pdf_final = pdf_separacao.gerar_pdf_separacao(resultado)

            nome_arquivo = f"lista-de-separacao-full-{resultado.get('frete') or 'lista'}.pdf"
            self.send_response(200)
            self.send_header("Content-Type", "application/pdf")
            self.send_header("Content-Disposition", f'inline; filename="{nome_arquivo}"')
            self.send_header("Content-Length", str(len(pdf_final)))
            self.end_headers()
            self.wfile.write(pdf_final)
        except ValueError as e:
            self._responder_erro(400, str(e))
        except Exception as e:
            traceback.print_exc()
            self._responder_erro(500, f"Erro interno ao gerar a lista de separação: {e}")

    def _responder_erro(self, status, mensagem, debug=None):
        obj = {"erro": mensagem}
        if debug:
            obj["debug"] = debug
        body = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)
