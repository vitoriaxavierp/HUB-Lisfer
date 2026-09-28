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
  c) "BASE1-N1/BASE2-N2/..." (varios trechos separados por "/", cada um
     com seu proprio sufixo numerico) = a combinacao dos dois casos acima.
     Aqui o "-N" de cada trecho JA E a quantidade daquele componente (ex:
     "LX-0105-1/LX-0106-1/LX-0107-1" = 1 peca de LX-0105 + 1 de LX-0106 +
     1 de LX-0107) - nao precisa o nome confirmar "kit de N pecas" como no
     caso (b), porque a propria estrutura com varios componentes diferentes
     ja e a confirmacao. So exige que cada BASE exista sozinha no cadastro.

Quando ha um UNICO trecho (sem "/") no formato "BASE-N", a base existe
sozinha no cadastro, mas o nome NAO confirma claramente um kit de N pecas,
o item fica marcado como pendente de confirmacao manual - nunca inventamos
a composicao nesse caso, so aplicamos o fallback seguro (tratar como SKU
proprio, multiplicador 1) e avisamos. Esse caso so se aplica ao (b); no
caso (c), com varias partes, a decomposicao e aplicada direto.
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
        pendente_confirmacao: bool - True se um UNICO trecho (sem "/")
            bateu com o padrao "base+sufixo numerico", a base existe
            sozinha no catalogo, mas o nome do produto nao confirmou
            claramente que e um kit repetido - nesse caso o item precisa
            de revisao manual.
    """
    partes = [p.strip() for p in sku_kit.split("/") if p.strip()]
    varias_partes = len(partes) > 1
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
                if varias_partes:
                    # regra (c): a propria estrutura "base-n/base-n/..."
                    # ja e a confirmacao, nao precisa o nome citar "kit".
                    componentes.append({"sku": base, "multiplicador": n})
                    tratado_como_kit_repetido = True
                elif _nome_confirma_kit_de_n_pecas(nome_produto, n):
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
