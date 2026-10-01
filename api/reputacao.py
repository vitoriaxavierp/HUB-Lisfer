"""Endpoint: reputação das 4 contas do Mercado Livre.

Os acessos às contas ficam no serviço "IA do Mercado Livre" (Cloudflare
Worker, protegido pelo Cloudflare Access). O Hub consulta o endereço de
leitura /api/ml/explorar dele com um token de serviço do Access e devolve
somente os campos de reputação, nunca o cadastro completo."""

import json
import os
import sys
import traceback
import urllib.error
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "lib"))
import seguranca  # noqa: E402

WORKER_URL = "https://lisfer-ia-mercadolivre.ellis-ellis2406.workers.dev/api/ml/explorar"

# conta do conector -> nome usado pela equipe (confirmado pela Lisfer)
CONTAS = [
    {"conta": "1", "nome": "Lisfer 1", "user_id": 580034079, "empresa": "Lisfer"},
    {"conta": "2", "nome": "Lisfer 2", "user_id": 454443360, "empresa": "Lisfer"},
    {"conta": "4", "nome": "Lalfer Deus", "user_id": 387545070, "empresa": "Lalfer"},
    {"conta": "3", "nome": "Lalfer 2", "user_id": 1498686683, "empresa": "Lalfer"},
]


def _metrica(metrics, chave):
    m = (metrics or {}).get(chave) or {}
    return {"quantidade": m.get("value"), "taxa": m.get("rate"), "periodo": m.get("period")}


def _credencial(nome):
    """Valor da variável de ambiente sem espaços e sem o nome do cabeçalho
    na frente (o botão de copiar da Cloudflare copia a linha inteira, ex.:
    "CF-Access-Client-Id: xxxx.access")."""
    valor = (os.environ.get(nome) or "").strip().strip('"').strip("'")
    if valor.lower().startswith("cf-access-client-") and ":" in valor:
        valor = valor.split(":", 1)[1].strip()
    return valor


def _consultar(conta):
    cid = _credencial("CF_ACCESS_CLIENT_ID")
    secret = _credencial("CF_ACCESS_CLIENT_SECRET")
    base = {"conta": conta["conta"], "nome": conta["nome"], "empresa": conta["empresa"]}
    if not cid or not secret:
        return {**base, "ok": False, "erro": "Credencial do serviço do Mercado Livre não configurada no servidor."}
    qs = urllib.parse.urlencode({"conta": conta["conta"], "caminho": f"/users/{conta['user_id']}"})
    req = urllib.request.Request(
        f"{WORKER_URL}?{qs}",
        headers={"CF-Access-Client-Id": cid, "CF-Access-Client-Secret": secret, "Accept": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            corpo = json.loads(resp.read() or b"{}")
    except urllib.error.HTTPError as e:
        print(f"[reputacao] conta {conta['conta']}: HTTP {e.code}")
        return {**base, "ok": False, "erro": "O serviço do Mercado Livre recusou a consulta (HTTP %d)." % e.code}
    except json.JSONDecodeError:
        # o Access devolve uma página de login (HTML) quando o token não é aceito
        return {**base, "ok": False, "erro": "O Cloudflare Access não aceitou a credencial do Hub."}
    except Exception as e:
        print(f"[reputacao] conta {conta['conta']}: {type(e).__name__}")
        return {**base, "ok": False, "erro": "Não foi possível falar com o serviço do Mercado Livre."}

    dados = corpo.get("dados") if isinstance(corpo, dict) else None
    if not corpo.get("ok") or not isinstance(dados, dict):
        return {**base, "ok": False, "erro": "O Mercado Livre não devolveu a reputação desta conta."}

    rep = dados.get("seller_reputation") or {}
    metrics = rep.get("metrics") or {}
    trans = rep.get("transactions") or {}
    vendas = metrics.get("sales") or {}
    return {
        **base,
        "ok": True,
        "apelido": dados.get("nickname"),
        "perfil": dados.get("permalink"),
        "nivel": rep.get("level_id"),
        "mercadolider": rep.get("power_seller_status"),
        "vendas_periodo": vendas.get("completed"),
        "periodo": vendas.get("period"),
        "reclamacoes": _metrica(metrics, "claims"),
        "atrasos": _metrica(metrics, "delayed_handling_time"),
        "cancelamentos": _metrica(metrics, "cancellations"),
        "historico": {
            "total": trans.get("total"),
            "concluidas": trans.get("completed"),
            "canceladas": trans.get("canceled"),
            "avaliacoes": trans.get("ratings") or {},
        },
    }


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        try:
            if not seguranca.sessao_valida(self.headers):
                seguranca.recusar_sessao(self)
                return
            if not seguranca.tem_modulo(self.headers, "reputacao"):
                seguranca.recusar_modulo(self)
                return
            with ThreadPoolExecutor(max_workers=4) as pool:
                contas = list(pool.map(_consultar, CONTAS))
            seguranca.responder_json(self, 200, {
                "consultado_em": datetime.now(timezone.utc).isoformat(),
                "contas": contas,
            })
        except Exception:
            traceback.print_exc()
            seguranca.responder_json(self, 500, {"erro": "Erro interno ao consultar a reputação."})
