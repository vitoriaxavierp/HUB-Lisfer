"""Cliente para a API v2 do Tiny ERP (Lisfer e Lalfer).

Cada empresa (Lisfer, Lalfer) e uma conta Tiny separada, com seu proprio
token e seu proprio catalogo de produtos (IDs internos diferentes, mesmo
quando o codigo/SKU e o mesmo texto nas duas).
"""

import json
import os
import tempfile
import time
import requests

BASE_URL = "https://api.tiny.com.br/api2"

EMPRESAS = ("lisfer", "lalfer")

_CACHE_DIR = os.path.join(tempfile.gettempdir(), "tiny_catalogo_cache")
_CACHE_TTL_SEGUNDOS = 15 * 60


def _token(empresa):
    env_var = f"TINY_{empresa.upper()}_TOKEN"
    token = os.environ.get(env_var)
    if not token:
        raise RuntimeError(f"Variavel de ambiente {env_var} nao configurada.")
    return token


def _post(endpoint, token, **params):
    data = {"token": token, "formato": "json", **params}
    resp = requests.post(f"{BASE_URL}/{endpoint}", data=data, timeout=30)
    resp.raise_for_status()
    body = resp.json().get("retorno", {})
    if body.get("status") == "Erro":
        erros = body.get("erros", [])
        msg = "; ".join(e.get("erro", "") for e in erros) or "erro desconhecido"
        raise RuntimeError(f"Tiny API ({endpoint}) retornou erro: {msg}")
    return body


def buscar_produtos_pagina(empresa, pesquisa="", pagina=1):
    """Uma pagina (ate 100 itens) da listagem de produtos de uma empresa."""
    body = _post(
        "produtos.pesquisa.php",
        _token(empresa),
        pesquisa=pesquisa,
        pagina=pagina,
    )
    produtos = [p["produto"] for p in body.get("produtos", [])]
    return produtos, int(body.get("numero_paginas", 1))


def buscar_catalogo_completo(empresa, pesquisa="", pausa=0.35):
    """Todo o catalogo de uma empresa (todas as paginas), com pequena pausa
    entre chamadas para respeitar o limite de requisicoes da API do Tiny."""
    pagina = 1
    todos = []
    while True:
        produtos, total_paginas = buscar_produtos_pagina(empresa, pesquisa, pagina)
        todos.extend(produtos)
        if pagina >= total_paginas:
            break
        pagina += 1
        time.sleep(pausa)
    return todos


def buscar_produto_por_codigo(empresa, sku):
    """Busca pontual de UM SKU especifico (rapido, 1 chamada) - preferido a
    indexar o catalogo inteiro quando so precisamos de alguns SKUs (ex: os
    SKUs de um unico PDF do Full)."""
    body = _post("produtos.pesquisa.php", _token(empresa), pesquisa=sku, pagina=1)
    for item in body.get("produtos", []):
        produto = item["produto"]
        if (produto.get("codigo") or "").strip() == sku:
            return produto
    return None


def obter_estoque(empresa, produto_id):
    """Estoque (saldo, deposito por deposito) de um produto especifico,
    usando o ID interno do Tiny daquela empresa."""
    body = _post("produto.obter.estoque.php", _token(empresa), id=produto_id)
    return body.get("produto", {})


def _cache_arquivo(empresa, pesquisa):
    chave = f"{empresa}_{pesquisa or 'todos'}".replace("/", "_")
    return os.path.join(_CACHE_DIR, f"{chave}.json")


def indexar_catalogo_por_sku(empresa, pesquisa="", usar_cache=True):
    """{sku: produto} para uma empresa - usado para achar rapido o ID Tiny
    de um SKU sem repetir a busca paginada toda vez.

    Guarda um cache local em disco (TTL de 15 min) para nao esbarrar no
    limite de requisicoes do Tiny quando a mesma empresa e consultada
    varias vezes seguidas (ex: durante testes, ou varios PDFs em sequencia)."""
    caminho_cache = _cache_arquivo(empresa, pesquisa)

    if usar_cache and os.path.exists(caminho_cache):
        idade = time.time() - os.path.getmtime(caminho_cache)
        if idade < _CACHE_TTL_SEGUNDOS:
            with open(caminho_cache, encoding="utf-8") as f:
                return json.load(f)

    catalogo = buscar_catalogo_completo(empresa, pesquisa)
    por_sku = {}
    for produto in catalogo:
        sku = (produto.get("codigo") or "").strip()
        if sku:
            por_sku.setdefault(sku, produto)

    if usar_cache:
        os.makedirs(_CACHE_DIR, exist_ok=True)
        with open(caminho_cache, "w", encoding="utf-8") as f:
            json.dump(por_sku, f, ensure_ascii=False)

    return por_sku


def estoque_e_custo_por_sku(skus, indices_por_empresa=None, pausa=0.3):
    """Para uma lista de SKUs, retorna um dict:
        {sku: {"estoque_total": float, "custo": float|None, "preco": float|None,
               "cadastrado_em": [empresas], "nome": str|None}}

    IMPORTANTE: a conta Tiny da Lisfer e da Lalfer usa a extensao
    MultiEmpresas, que mostra um estoque JA COMBINADO das duas empresas em
    qualquer uma das duas contas (confirmado testando o mesmo SKU pelos dois
    lados: o campo `saldo` retornado bate exatamente igual dos dois jeitos).
    Por isso, aqui consultamos o estoque em UMA SO empresa (a primeira em
    que o SKU estiver cadastrado) - nunca somamos as duas, senao o total
    fica em dobro.

    Por padrao faz uma busca pontual por SKU (rapido, poucas chamadas -
    ideal para os ~10-50 SKUs de um unico PDF do Full). Se voce ja tiver o
    catalogo inteiro em cache (via `indexar_catalogo_por_sku`), pode passar
    em `indices_por_empresa` para pular a busca pontual.
    """
    resultado = {}
    for sku in skus:
        info = {
            "estoque_total": None,
            "custo": None,
            "preco": None,
            "cadastrado_em": [],
            "nome": None,
        }
        produto_para_consultar = None
        empresa_para_consultar = None
        for empresa in EMPRESAS:
            if indices_por_empresa is not None:
                produto = indices_por_empresa.get(empresa, {}).get(sku)
            else:
                produto = buscar_produto_por_codigo(empresa, sku)
                time.sleep(pausa)
            if not produto:
                continue
            info["cadastrado_em"].append(empresa)
            if produto_para_consultar is None:
                produto_para_consultar = produto
                empresa_para_consultar = empresa
            if info["custo"] is None and produto.get("preco_custo"):
                info["custo"] = float(produto["preco_custo"])
            if info["preco"] is None and produto.get("preco"):
                info["preco"] = float(produto["preco"])
            if info["nome"] is None:
                info["nome"] = produto.get("nome")

        if produto_para_consultar is not None:
            estoque = obter_estoque(empresa_para_consultar, produto_para_consultar["id"])
            info["estoque_total"] = float(estoque.get("saldo", 0) or 0)
            time.sleep(pausa)

        resultado[sku] = info
    return resultado
