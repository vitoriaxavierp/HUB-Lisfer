"""Monta a Lista de Compras final a partir de um PDF do Full: desmembra os
kits, cruza com o estoque/custo do Tiny e agrupa por marca/fornecedor."""

from collections import defaultdict

import full_pdf
import kits
import tiny


def gerar_lista_compras(caminho_pdf):
    """Mantido por compatibilidade: gera a lista a partir de um unico PDF."""
    return gerar_lista_compras_de_varios([caminho_pdf])


def gerar_lista_compras_de_varios(caminhos_pdfs, nomes_arquivos=None):
    """Mesma coisa, mas aceita VARIOS PDFs do Full (ex: dois envios da
    mesma semana) e junta tudo numa unica lista de compras combinada -
    cada PDF continua validado individualmente (soma das unidades bate com
    o total declarado nele), mas a necessidade de compra e' somada entre
    todos antes de cruzar com o estoque, evitando comprar demais ou de
    menos por tratar os envios separadamente."""
    nomes_arquivos = nomes_arquivos or [None] * len(caminhos_pdfs)

    dados_pdfs = []
    for caminho, nome_arquivo in zip(caminhos_pdfs, nomes_arquivos):
        try:
            dados_pdfs.append(full_pdf.ler_pdf_full(caminho))
        except ValueError as e:
            rotulo = nome_arquivo or "arquivo"
            raise ValueError(f"{rotulo}: {e}") from e

    todos_itens = []
    for dados in dados_pdfs:
        todos_itens.extend(dados["itens"])

    fretes = [d.get("frete") for d in dados_pdfs if d.get("frete")]

    _cache_existencia = {}

    def sku_existe(sku):
        if sku not in _cache_existencia:
            _cache_existencia[sku] = any(
                tiny.buscar_produto_por_codigo(empresa, sku) for empresa in tiny.EMPRESAS
            )
        return _cache_existencia[sku]

    # 1) desmembrar cada item do PDF em componentes reais, somando por SKU componente
    necessario_por_componente = defaultdict(float)
    origem_por_componente = defaultdict(list)  # p/ rastreabilidade (aba "desmembramento")
    pendentes_confirmacao = []

    for item in todos_itens:
        componentes, pendente = kits.decompor_sku_kit(item["sku"], item["nome"], sku_existe)
        if pendente:
            pendentes_confirmacao.append(
                {
                    "sku_kit": item["sku"],
                    "nome": item["nome"],
                    "codigo_ml": item["codigo_ml"],
                    "motivo": (
                        "Código tem formato base+sufixo numérico e a base existe sozinha "
                        "no cadastro, mas o nome não confirma claramente um kit repetido. "
                        "Confirme manualmente a composição."
                    ),
                }
            )
        for comp in componentes:
            qtd_necessaria = item["unidades"] * comp["multiplicador"]
            necessario_por_componente[comp["sku"]] += qtd_necessaria
            origem_por_componente[comp["sku"]].append(
                {
                    "sku_kit": item["sku"],
                    "nome_kit": item["nome"],
                    "unidades_no_full": item["unidades"],
                    "multiplicador": comp["multiplicador"],
                    "qtd_componente": qtd_necessaria,
                }
            )

    # 2) cruzar com estoque/custo do Tiny
    skus_componentes = list(necessario_por_componente.keys())
    info_tiny = tiny.estoque_e_custo_por_sku(skus_componentes)

    # 3) montar a lista final, item por SKU componente
    itens_finais = []
    for sku, necessario in necessario_por_componente.items():
        info = info_tiny.get(sku, {})
        estoque = info.get("estoque_total")
        nao_cadastrado = estoque is None
        estoque_calc = 0.0 if nao_cadastrado else estoque
        qtd_comprar = max(0.0, necessario - estoque_calc)

        nome = info.get("nome")
        if not nome:
            # usa o nome do primeiro kit de origem como aproximacao, se o
            # componente em si nao foi encontrado no cadastro
            nome = origem_por_componente[sku][0]["nome_kit"]

        marca = None
        if info.get("produto_id"):
            detalhe = tiny.obter_produto(info["empresa_do_produto"], info["produto_id"])
            marca = kits.normalizar_marca((detalhe.get("marca") or "").strip()) or None
        if not marca:
            # fallback: o campo "marca" do Tiny esta vazio (ou o SKU nem
            # esta cadastrado) - tenta prefixo do SKU, depois palavra-chave
            # no nome do produto, depois a heuristica do ' - '
            marca = kits.resolver_marca(sku, nome)
        if not marca:
            marca = "Marca não identificada"

        itens_finais.append(
            {
                "sku": sku,
                "nome": nome,
                "marca": marca,
                "necessario": necessario,
                "estoque_atual": estoque,
                "quantidade_comprar": qtd_comprar,
                "custo_unitario": info.get("custo"),
                "situacao": "COMPRAR" if qtd_comprar > 0 else "OK - estoque cobre",
                "sku_nao_cadastrado_no_tiny": nao_cadastrado,
                "origem": origem_por_componente[sku],
            }
        )

    # 4) só o que precisa comprar, agrupado por marca/fornecedor
    para_comprar = [i for i in itens_finais if i["quantidade_comprar"] > 0]
    por_marca = defaultdict(list)
    for item in para_comprar:
        por_marca[item["marca"]].append(item)

    return {
        "fretes": fretes,
        "frete": " + ".join(fretes) if fretes else None,
        "produtos_declarados": sum(d.get("produtos_declarados") or 0 for d in dados_pdfs),
        "total_unidades_declarado": sum(d.get("total_unidades_declarado") or 0 for d in dados_pdfs),
        "itens_pdf": todos_itens,
        "itens_consolidados": itens_finais,
        "lista_compras_por_marca": dict(por_marca),
        "pendentes_confirmacao": pendentes_confirmacao,
    }
