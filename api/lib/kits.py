"""Regras de desmembramento de SKU de kit em SKUs componentes.

Regra da operacao Lisfer: "-N" no FINAL de um codigo e sempre a quantidade
daquele produto no kit.

  a) "SKU1/SKU2/SKU3" (codigos diferentes separados por "/") = 1 peca de
     cada SKU listado por kit vendido. So aplicavel quando cada SKUn,
     sozinho, existe como produto individual no cadastro - se QUALQUER
     pedaco nao existir sozinho (ex: "KA015/17" onde "17" nao e um produto
     de verdade, so faz parte do codigo "KA015/17"), o codigo inteiro e
     mantido como UM UNICO produto, sem decompor nada.
  b) "BASE-N" = N pecas do SKU base (ex: "LF-0276-3" = 3x LF-0276;
     "LF-0253-2" = 2x LF-0253), desde que o codigo BASE exista sozinho no
     cadastro. A checagem do cadastro e o que impede ler o proprio codigo
     como kit: em "LF-0253" a "base" seria "LF", que nao e um produto, entao
     o codigo fica como esta.
  c) "BASE1-N1/BASE2-N2/..." = a combinacao das duas regras: o "-N" de cada
     trecho e a quantidade daquele componente (ex: "LX-0109-2/LX-0108-1" =
     2x LX-0109 + 1x LX-0108). Cada BASE precisa existir no cadastro.
"""

import re

_PADRAO_BASE_N = re.compile(r"^(.+)-(\d+)$")


def decompor_sku_kit(sku_kit, nome_produto, sku_existe_no_catalogo):
    """Decompoe um SKU (possivelmente um kit) em seus componentes reais.

    `sku_existe_no_catalogo` e uma funcao (sku: str) -> bool.

    Devolve (componentes, pendente_confirmacao):
        componentes: lista de {"sku": str, "multiplicador": int}
        pendente_confirmacao: mantido por compatibilidade; sempre False
            agora que "-N" no final e sempre quantidade.
    """
    partes = [p.strip() for p in sku_kit.split("/") if p.strip()]

    componentes = []
    for parte in partes:
        m = _PADRAO_BASE_N.match(parte)
        if m and int(m.group(2)) > 0 and sku_existe_no_catalogo(m.group(1)):
            # regras (b)/(c): "-N" no final = N pecas da base
            componentes.append({"sku": m.group(1), "multiplicador": int(m.group(2))})
        elif len(partes) == 1 or sku_existe_no_catalogo(parte):
            # codigo sem sufixo de quantidade (ou cuja "base" nao e um
            # produto): conta como 1 peca dele mesmo
            componentes.append({"sku": parte, "multiplicador": 1})
        else:
            # trecho de um codigo com "/" que nao e produto sozinho (ex: o
            # "17" de "KA015/17"): o codigo inteiro e UM UNICO produto,
            # nunca inventamos a composicao
            return [{"sku": sku_kit, "multiplicador": 1}], False

    return componentes, False


def extrair_marca(nome_produto):
    """Marca/fornecedor por heuristica: o texto depois do ultimo ' - ' no
    nome do produto (ex: 'Sacador ... Gdi Dt-sac07' sem marca -> desconhecida;
    'Hélice ... - Super Soldas' -> 'Super Soldas')."""
    if " - " in nome_produto:
        return normalizar_marca(nome_produto.rsplit(" - ", 1)[1].strip())
    return None


# Prefixo do codigo do SKU -> marca (convencao interna: cada marca propria
# usa um prefixo fixo de codigo).
_PREFIXO_MARCA = [
    (re.compile(r"^(KA|KF)", re.IGNORECASE), "Kitest"),
    (re.compile(r"^LF", re.IGNORECASE), "Lisfer"),
    (re.compile(r"^LX", re.IGNORECASE), "Loxer"),
]

# Marcas conhecidas que podem aparecer em qualquer parte do nome do
# produto (nao so depois de ' - ').
_MARCAS_CONHECIDAS = [
    "Lisfer", "Loxer", "Kitest", "Raven", "Delta", "Fame", "Vonder",
    "Mave", "Super Soldas", "Potente", "Chiaperini",
]


def _marca_por_prefixo_sku(sku):
    for padrao, marca in _PREFIXO_MARCA:
        if padrao.match(sku):
            return marca
    return None


def _marca_por_palavra_no_nome(nome):
    for marca in _MARCAS_CONHECIDAS:
        if re.search(rf"\b{re.escape(marca)}\b", nome, re.IGNORECASE):
            return marca
    return None


def resolver_marca(sku, nome_produto):
    """Tenta identificar a marca/fornecedor quando o campo 'marca' do
    proprio Tiny nao estiver preenchido, nesta ordem:
      1) prefixo do codigo do SKU (KA-/KF- = Kitest, LF- = Lisfer, LX- = Loxer)
      2) uma marca conhecida citada em qualquer parte do nome do produto
         (ex: 'Teste De Pressão De Bomba De Combustível Kitest-ka015' -> Kitest)
      3) o texto depois do ultimo ' - ' no nome (heuristica mais antiga)
    Devolve None se nenhuma das tres encontrar nada - nesse caso o
    chamador decide o rotulo final ("Marca não identificada")."""
    return (
        _marca_por_prefixo_sku(sku)
        or _marca_por_palavra_no_nome(nome_produto)
        or extrair_marca(nome_produto)
    )


_SUFIXOS_MARCA_IGNORAR = re.compile(
    r"\s*[-/]?\s*(promo(cional)?|promoção)\s*$", re.IGNORECASE
)


def normalizar_marca(marca):
    """Remove variações tipo 'PROMO'/'PROMOÇÃO' do nome da marca, para que
    'Kitest' e 'Kitest Promo' caiam no mesmo grupo na lista de compras."""
    if not marca:
        return marca
    return _SUFIXOS_MARCA_IGNORAR.sub("", marca).strip()
