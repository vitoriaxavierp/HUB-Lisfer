"""Endpoint: recebe um ou mais PDFs do Full (base64) e devolve só o que está
escrito neles (número do frete e itens com SKU e unidades), para salvar no
controle de envios. Não consulta o Tiny."""

import base64
import binascii
import io
import os
import sys
import traceback
from http.server import BaseHTTPRequestHandler

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "lib"))
import full_pdf  # noqa: E402
import seguranca  # noqa: E402
from seguranca import ErroRequisicao  # noqa: E402


class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        try:
            if not seguranca.sessao_valida(self.headers):
                seguranca.recusar_sessao(self)
                return
            if not seguranca.tem_modulo(self.headers, "full_envios"):
                seguranca.recusar_modulo(self)
                return

            payload = seguranca.ler_json(self)
            arquivos = payload.get("arquivos")
            if not arquivos or not isinstance(arquivos, list):
                raise ErroRequisicao(400, "Nenhum PDF enviado.")
            if len(arquivos) > seguranca.LIMITE_PDFS_POR_ENVIO:
                raise ErroRequisicao(400, f"Envie no máximo {seguranca.LIMITE_PDFS_POR_ENVIO} PDFs por vez.")

            envios = []
            for a in arquivos:
                rotulo = str(a.get("nome") or "arquivo")[:120] if isinstance(a, dict) else "arquivo"
                try:
                    pdf = io.BytesIO(base64.b64decode(a["pdf_base64"], validate=True))
                except (KeyError, TypeError, binascii.Error):
                    raise ErroRequisicao(400, f"{rotulo}: arquivo inválido.")
                try:
                    dados = full_pdf.ler_pdf_full(pdf)
                except ValueError as e:
                    raise ValueError(f"{rotulo}: {e}") from e
                envios.append({
                    "arquivo": rotulo,
                    "frete": dados.get("frete"),
                    "produtos_declarados": dados.get("produtos_declarados"),
                    "total_unidades_declarado": dados.get("total_unidades_declarado"),
                    "itens": [
                        {"sku": i["sku"], "titulo": i.get("nome"), "codigo_ml": i.get("codigo_ml"), "unidades": i["unidades"]}
                        for i in dados["itens"]
                    ],
                })
            seguranca.responder_json(self, 200, {"envios": envios})
        except ErroRequisicao as e:
            seguranca.responder_json(self, e.status, {"erro": e.mensagem})
        except ValueError as e:
            seguranca.responder_json(self, 400, {"erro": str(e)})
        except Exception:
            traceback.print_exc()
            seguranca.responder_json(self, 500, {"erro": "Erro interno ao ler o PDF. Tente de novo em alguns minutos."})
