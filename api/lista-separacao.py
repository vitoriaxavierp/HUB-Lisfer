"""Endpoint: recebe um PDF do Full (base64) e devolve o PDF pronto da
Lista de Separação (itens como estao no envio, agrupados por marca)."""

import base64
import binascii
import io
import os
import sys
import traceback
from http.server import BaseHTTPRequestHandler

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "lib"))
import lista_separacao  # noqa: E402
import pdf_separacao  # noqa: E402
import seguranca  # noqa: E402
from seguranca import ErroRequisicao  # noqa: E402


class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        try:
            if not seguranca.sessao_valida(self.headers):
                seguranca.recusar_sessao(self)
                return

            payload = seguranca.ler_json(self)
            pdf_base64 = payload.get("pdf_base64")
            if not pdf_base64:
                raise ErroRequisicao(400, "Nenhum PDF enviado.")
            try:
                pdf_bytes = base64.b64decode(pdf_base64, validate=True)
            except (TypeError, binascii.Error):
                raise ErroRequisicao(400, "Arquivo inválido.")

            resultado = lista_separacao.gerar_lista_separacao(io.BytesIO(pdf_bytes))
            pdf_final = pdf_separacao.gerar_pdf_separacao(resultado)

            frete = seguranca.nome_arquivo_seguro(resultado.get("frete"))
            seguranca.responder_arquivo(
                self,
                pdf_final,
                "application/pdf",
                f'inline; filename="lista-de-separacao-full-{frete}.pdf"',
            )
        except ErroRequisicao as e:
            seguranca.responder_json(self, e.status, {"erro": e.mensagem})
        except ValueError as e:
            seguranca.responder_json(self, 400, {"erro": str(e)})
        except Exception:
            traceback.print_exc()
            seguranca.responder_json(self, 500, {"erro": "Erro interno ao gerar a lista de separação. Tente de novo em alguns minutos."})
