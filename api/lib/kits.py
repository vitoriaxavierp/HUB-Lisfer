"""Regras de desmembramento de SKU de kit em SKUs componentes.

Ordem de confianca (da especificacao do Analista de Compras FULL):

  a) "SKU1/SKU2/SKU3" (codigos diferentes separados por "/") = 1 peca de
     cada SKU listado por kit vendido. So aplicavel quando cada SKUn,
     sozinho, existe como produto individual no cadastro.
  b) "BASE-N" (um unico codigo-base com sufixo numerico, SEM barra) pode
     significar N pecas do SKU base por kit - MAS SO quando (i) o codigo
     sem o sufixo existe sozinho no cadastro E (ii) o nome do produto no
     PDF sugere claramente um kit de N pecas (contem "kit" e o numero N).
     Fora isso, o sufixo numerico faz parte do codigo normalmente (ex:
     "109671-02" e "109671-16" sao SKUs pai distintos, nao kits).
  c) Combina os dois casos acima.

Quando um trecho bate com o padrao "BASE-N" e a base existe sozinha no
cadastro mas o nome NAO confirma claramente um kit de N pecas, o item fica
marcado como pendente de confirmacao manual - nunca inventamos a
composicao nesse caso, so aplicamos o fallback seguro (tratar como SKU
proprio, multiplicador 1) e avisamos.
"""

import re

_PADRAO_BASE_N = re.compile(r"^(.+)-(\d+)$")


def _nome_confirma_kit_de_n_pecas(nome, n):
    if not re.search(r"\bkit\b", nome, re.IGNORECASE):
        return False
    return re.search(rf"\b{n}\b", nome) is not None


def decompor_sku_kit(sku_kit, nome_produto, sku_existe_no_catalogo):
    """Decompoe um SKU (possivelmente um kit) em seus componentes reais.

    `sku_existe_no_catalogo` e uma funcao (sku: str) -> bool.

    Devolve (componentes, pendente_confirmacao):
        componentes: lista de {"sku": str, "multiplicador": int}
        pendente_confirmacao: bool - True se algum trecho do codigo bateu
            com o padrao "base+sufixo numerico" e a base existe sozinha no
            catalogo, mas o nome do produto nao confirmou claramente que e
            um kit repetido - nesse caso o item precisa de revisao manual.
    """
    partes = [p.strip() for p in sku_kit.split("/") if p.strip()]
    componentes = []
    pendente_confirmacao = False

    for parte in partes:
        m = _PADRAO_BASE_N.match(parte)
        tratado_como_kit_repetido = False

        if m:
            base, n_str = m.group(1), m.group(2)
            n = int(n_str)
            base_existe_sozinha = sku_existe_no_catalogo(base)
            if base_existe_sozinha:
                if _nome_confirma_kit_de_n_pecas(nome_produto, n):
                    componentes.append({"sku": base, "multiplicador": n})
                    tratado_como_kit_repetido = True
                else:
                    pendente_confirmacao = True

        if not tratado_como_kit_repetido:
            componentes.append({"sku": parte, "multiplicador": 1})

    return componentes, pendente_confirmacao


def extrair_marca(nome_produto):
    """Marca/fornecedor por heuristica: o texto depois do ultimo ' - ' no
    nome do produto (ex: 'Sacador ... Gdi Dt-sac07' sem marca -> desconhecida;
    'Hélice ... - Super Soldas' -> 'Super Soldas')."""
    if " - " in nome_produto:
        return nome_produto.rsplit(" - ", 1)[1].strip()
    return "Marca não identificada"
