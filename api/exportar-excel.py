"""Endpoint: recebe o resultado ja calculado da lista de compras (JSON) e
devolve o arquivo .xlsx pronto para download - nao reprocessa o PDF nem
consulta o Tiny de novo."""

import os
import sys
import traceback
from http.server import BaseHTTPRequestHandler

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "lib"))
import excel_export  # noqa: E402
import seguranca  # noqa: E402
from seguranca import ErroRequisicao  # noqa: E402


class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        try:
            if not seguranca.sessao_valida(self.headers):
                seguranca.recusar_sessao(self)
                return

            resultado = seguranca.ler_json(self)
            conteudo_xlsx = excel_export.gerar_excel_lista_compras(resultado)

            frete = seguranca.nome_arquivo_seguro(resultado.get("frete"))
            seguranca.responder_arquivo(
                self,
                conteudo_xlsx,
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                f'attachment; filename="lista-de-compras-full-{frete}.xlsx"',
            )
        except ErroRequisicao as e:
            seguranca.responder_json(self, e.status, {"erro": e.mensagem})
        except Exception:
            traceback.print_exc()
            seguranca.responder_json(self, 500, {"erro": "Erro ao gerar o Excel."})
