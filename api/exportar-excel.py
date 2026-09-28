"""Endpoint: recebe o resultado ja calculado da lista de compras (JSON) e
devolve o arquivo .xlsx pronto para download - nao reprocessa o PDF nem
consulta o Tiny de novo."""

import json
import os
import sys
import traceback
import urllib.error
import urllib.request
from http.server import BaseHTTPRequestHandler

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "lib"))
import excel_export  # noqa: E402


def _verificar_sessao(token):
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
                self._responder_erro(401, "Sessão inválida. Faça login novamente.")
                return

            comprimento = int(self.headers.get("Content-Length", 0))
            corpo = self.rfile.read(comprimento)
            resultado = json.loads(corpo or b"{}")

            conteudo_xlsx = excel_export.gerar_excel_lista_compras(resultado)

            frete = resultado.get("frete") or "lista"
            nome_arquivo = f"lista-de-compras-full-{frete}.xlsx"

            self.send_response(200)
            self.send_header(
                "Content-Type",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            )
            self.send_header("Content-Disposition", f'attachment; filename="{nome_arquivo}"')
            self.send_header("Content-Length", str(len(conteudo_xlsx)))
            self.end_headers()
            self.wfile.write(conteudo_xlsx)
        except Exception as e:
            traceback.print_exc()
            self._responder_erro(500, f"Erro ao gerar o Excel: {e}")

    def _responder_erro(self, status, mensagem):
        body = json.dumps({"erro": mensagem}, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)
