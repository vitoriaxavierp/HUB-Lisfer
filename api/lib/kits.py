"""Regras de desmembramento de SKU de kit em SKUs componentes.

Ordem de confianca (da especificacao do Analista de Compras FULL):

  a) "SKU1/SKU2/SKU3" (codigos diferentes separados por "/") = 1 peca de
     cada SKU listado por kit vendido. So aplicavel quando cada SKUn,
     sozinho, existe como produto individual no cadastro - se QUALQUER
     pedaco nao existir sozinho (ex: "KA015/17" onde "17" nao e um produto
     de verdade, so faz parte do codigo "KA015/17"), o codigo inteiro e
     mantido como UM UNICO produto, sem decompor nada.
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

    if len(partes) == 1:
        # caso (b): um unico trecho, sem "/"
        parte = partes[0]
        m = _PADRAO_BASE_N.match(parte)
        if m:
            base, n_str = m.group(1), m.group(2)
            n = int(n_str)
            if sku_existe_no_catalogo(base):
                if _nome_confirma_kit_de_n_pecas(nome_produto, n):
                    return [{"sku": base, "multiplicador": n}], False
                # ambiguo: base existe, mas o nome nao confirma o kit de N
                # pecas - fallback seguro (SKU proprio) + pede confirmacao
                return [{"sku": parte, "multiplicador": 1}], True
        return [{"sku": parte, "multiplicador": 1}], False

    # varios trechos separados por "/": candidato as regras (a)/(c). So
    # aplicamos a decomposicao se CADA trecho puder ser confirmado como um
    # componente de verdade - senao, o codigo inteiro vira um unico item.
    componentes_candidatos = []
    for parte in partes:
        m = _PADRAO_BASE_N.match(parte)
        confirmado = False

        if m:
            base, n_str = m.group(1), m.group(2)
            n = int(n_str)
            if sku_existe_no_catalogo(base):
                # regra (c): a propria estrutura "base-n/base-n/..." ja e a
                # confirmacao, nao precisa o nome citar "kit".
                componentes_candidatos.append({"sku": base, "multiplicador": n})
                confirmado = True

        if not confirmado:
            # regra (a): o trecho so conta como componente proprio se ELE
            # MESMO existir sozinho no cadastro (ex: "LF-0213" e valido por
            # si so; "17" em "KA015/17" nao e).
            if sku_existe_no_catalogo(parte):
                componentes_candidatos.append({"sku": parte, "multiplicador": 1})
                confirmado = True

        if not confirmado:
            # nao deu pra confirmar este trecho com seguranca - o codigo
            # inteiro (com a barra e tudo) e mantido como UM UNICO produto,
            # nunca inventamos a composicao.
            return [{"sku": sku_kit, "multiplicador": 1}], False

    return componentes_candidatos, False


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
