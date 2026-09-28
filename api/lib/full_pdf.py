"""Leitor do PDF de 'preparation instructions' do Mercado Livre Full."""

import re
import pdfplumber


def _clean(text):
    return re.sub(r"\s+", " ", text or "").strip()


def _extrair_cabecalho(texto_primeira_pagina):
    """Numero do frete, produtos do envio e total de unidades declarados."""
    frete = re.search(r"Frete\s*#\s*(\d+)", texto_primeira_pagina)
    produtos = re.search(r"Produtos do envio\s*:\s*(\d+)", texto_primeira_pagina)
    total = re.search(r"Total de unidades\s*:\s*(\d+)", texto_primeira_pagina)
    return {
        "frete": frete.group(1) if frete else None,
        "produtos_declarados": int(produtos.group(1)) if produtos else None,
        "total_unidades_declarado": int(total.group(1)) if total else None,
    }


def _parse_linha_produto(celula_produto):
    """Extrai codigo ML, EAN, SKU e nome do produto do texto da 1a coluna."""
    flat = _clean(celula_produto)
    m_ml = re.search(r"C[oó]digo ML\s*:\s*(\S+)", flat)
    m_ean = re.search(r"C[oó]digo universal\s*:\s*(\d+)", flat)
    m_sku = re.search(r"SKU\s*:\s*(\S+)", flat)

    nome = flat
    for m in (m_ml, m_ean, m_sku):
        if m:
            nome = nome.replace(m.group(0), "")
    nome = re.sub(r"\s+", " ", nome).strip(" -")

    return {
        "codigo_ml": m_ml.group(1) if m_ml else None,
        "ean": m_ean.group(1) if m_ean else None,
        "sku": m_sku.group(1) if m_sku else None,
        "nome": nome,
    }


def ler_pdf_full(caminho_ou_arquivo):
    """Le um PDF de preparation instructions do Full e devolve:
        {"frete": ..., "produtos_declarados": ..., "total_unidades_declarado": ...,
         "itens": [{"codigo_ml", "ean", "sku", "nome", "unidades"}, ...],
         "soma_unidades_extraida": int, "bate_com_declarado": bool}

    Levanta ValueError se a soma das unidades extraidas nao bater com o
    total declarado no cabecalho - nunca deve seguir adiante com uma
    extracao que nao foi validada.
    """
    itens = []
    cabecalho = None

    with pdfplumber.open(caminho_ou_arquivo) as pdf:
        for pagina in pdf.pages:
            texto = pagina.extract_text() or ""
            if cabecalho is None:
                cabecalho = _extrair_cabecalho(texto)

            for tabela in pagina.extract_tables():
                if not tabela:
                    continue
                linhas = tabela[1:] if _clean(tabela[0][0]).upper().startswith("PRODUTO") else tabela
                for linha in linhas:
                    if len(linha) < 2:
                        continue
                    produto_info = _parse_linha_produto(linha[0])
                    unidades_txt = _clean(linha[1])
                    if not produto_info["sku"] or not unidades_txt.isdigit():
                        continue
                    itens.append({**produto_info, "unidades": int(unidades_txt)})

    soma = sum(i["unidades"] for i in itens)
    cabecalho = cabecalho or {}
    total_declarado = cabecalho.get("total_unidades_declarado")

    resultado = {
        **cabecalho,
        "itens": itens,
        "soma_unidades_extraida": soma,
        "bate_com_declarado": (total_declarado is None) or (soma == total_declarado),
    }

    if total_declarado is not None and soma != total_declarado:
        raise ValueError(
            f"Extracao nao confere: soma das unidades extraidas ({soma}) "
            f"difere do total declarado no PDF ({total_declarado}). "
            f"Nao prossiga sem revisar o PDF manualmente."
        )

    return resultado
