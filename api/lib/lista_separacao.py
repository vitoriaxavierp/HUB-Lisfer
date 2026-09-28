"""Monta a Lista de Separação a partir de um PDF do Full: mantem os itens
exatamente como estao no envio (kit continua kit, sem desmembrar) e agrupa
por marca/fornecedor para facilitar quem vai buscar no estoque."""

import time
from collections import defaultdict

import full_pdf
import kits
import tiny

_PAUSA = 0.3


def _marca_do_item(sku, nome, cache):
    if sku in cache:
        return cache[sku]

    marca = None
    for empresa in tiny.EMPRESAS:
        produto = tiny.buscar_produto_por_codigo(empresa, sku)
        time.sleep(_PAUSA)
        if produto:
            detalhe = tiny.obter_produto(empresa, produto["id"])
            time.sleep(_PAUSA)
            marca = kits.normalizar_marca((detalhe.get("marca") or "").strip()) or None
            break

    if not marca:
        marca = kits.resolver_marca(sku, nome)
    if not marca:
        marca = "Marca não identificada"

    cache[sku] = marca
    return marca


def gerar_lista_separacao(caminho_pdf):
    dados = full_pdf.ler_pdf_full(caminho_pdf)

    cache_marca = {}
    itens = []
    for item in dados["itens"]:
        marca = _marca_do_item(item["sku"], item["nome"], cache_marca)
        itens.append({**item, "marca": marca})

    por_marca = defaultdict(list)
    for item in itens:
        por_marca[item["marca"]].append(item)

    # ordena as marcas alfabeticamente, e dentro de cada marca mantem a
    # ordem em que os itens aparecem no PDF
    itens_por_marca = {marca: por_marca[marca] for marca in sorted(por_marca.keys())}

    return {
        "frete": dados.get("frete"),
        "produtos_declarados": dados.get("produtos_declarados"),
        "total_unidades_declarado": dados.get("total_unidades_declarado"),
        "itens": itens,
        "itens_por_marca": itens_por_marca,
    }
