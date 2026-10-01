"""Endpoint: recebe um PDF do Full (base64) e devolve a lista de compras
desmembrada e cruzada com o estoque/custo do Tiny."""

import base64
import binascii
import io
import os
import sys
import traceback
from http.server import BaseHTTPRequestHandler

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "lib"))
import lista_compras  # noqa: E402
import seguranca  # noqa: E402
from seguranca import ErroRequisicao  # noqa: E402


class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        try:
            # sessao confirmada ANTES de ler o corpo ou consultar o Tiny
            if not seguranca.sessao_valida(self.headers):
                seguranca.recusar_sessao(self)
                return

            payload = seguranca.ler_json(self)

            # aceita um unico PDF (formato antigo) ou uma lista de PDFs
            # (varios envios do Full na mesma semana, somados numa unica lista)
            arquivos = payload.get("arquivos")
            if not arquivos and payload.get("pdf_base64"):
                arquivos = [{"nome": None, "pdf_base64": payload["pdf_base64"]}]
            if not arquivos or not isinstance(arquivos, list):
                raise ErroRequisicao(400, "Nenhum PDF enviado.")
            if len(arquivos) > seguranca.LIMITE_PDFS_POR_ENVIO:
                raise ErroRequisicao(400, f"Envie no máximo {seguranca.LIMITE_PDFS_POR_ENVIO} PDFs por vez.")

            try:
                caminhos = [io.BytesIO(base64.b64decode(a["pdf_base64"], validate=True)) for a in arquivos]
            except (KeyError, TypeError, binascii.Error):
                raise ErroRequisicao(400, "Arquivo inválido.")
            nomes = [str(a.get("nome") or "")[:120] or None for a in arquivos]

            resultado = lista_compras.gerar_lista_compras_de_varios(caminhos, nomes)
            seguranca.responder_json(self, 200, resultado)
        except ErroRequisicao as e:
            seguranca.responder_json(self, e.status, {"erro": e.mensagem})
        except ValueError as e:
            # erro esperado: ex. soma das unidades nao bate com o total do PDF
            seguranca.responder_json(self, 400, {"erro": str(e)})
        except Exception:
            traceback.print_exc()
            seguranca.responder_json(self, 500, {"erro": "Erro interno ao processar o PDF. Tente de novo em alguns minutos."})
