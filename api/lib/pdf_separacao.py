"""Gera o PDF da Lista de Separação (para o colaborador levar ao estoque)."""

import io

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.platypus import (
    SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer,
)
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT

PRETO = colors.HexColor("#16191C")
AMARELO = colors.HexColor("#F5AD00")
CINZA_TEXTO = colors.HexColor("#5B6B77")
CINZA_LINHA = colors.HexColor("#D7DEE3")
FUNDO_ZEBRA = colors.HexColor("#F1F4F6")

_estilo_titulo = ParagraphStyle(
    "titulo", fontName="Helvetica-Bold", fontSize=17, textColor=PRETO, leading=20,
)
_estilo_subtitulo = ParagraphStyle(
    "subtitulo", fontName="Helvetica", fontSize=9.5, textColor=CINZA_TEXTO, leading=13,
)
_estilo_marca = ParagraphStyle(
    "marca", fontName="Helvetica-Bold", fontSize=12, textColor=colors.white, leading=15,
)
_estilo_celula = ParagraphStyle(
    "celula", fontName="Helvetica", fontSize=9, textColor=PRETO, leading=12, alignment=TA_LEFT,
)
_estilo_celula_bold = ParagraphStyle(
    "celula_bold", fontName="Helvetica-Bold", fontSize=9.5, textColor=PRETO, leading=12,
)


def gerar_pdf_separacao(resultado):
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer, pagesize=A4,
        topMargin=16 * mm, bottomMargin=16 * mm, leftMargin=16 * mm, rightMargin=16 * mm,
    )

    story = []
    story.append(Paragraph(f"Lista de Separação — Frete #{resultado.get('frete') or '-'}", _estilo_titulo))
    story.append(Spacer(1, 4))
    story.append(Paragraph(
        f"{resultado.get('produtos_declarados') or 0} produtos · "
        f"{resultado.get('total_unidades_declarado') or 0} unidades no total · "
        "separe por marca, confira a unidade e marque ao concluir cada item.",
        _estilo_subtitulo,
    ))
    story.append(Spacer(1, 14))

    largura_util = A4[0] - 32 * mm
    larguras_colunas = [12 * mm, 26 * mm, largura_util - 12 * mm - 26 * mm - 22 * mm, 22 * mm]

    for marca, itens in resultado["itens_por_marca"].items():
        header = Table(
            [[Paragraph(marca, _estilo_marca), Paragraph(f"{len(itens)} item(ns)", _estilo_subtitulo)]],
            colWidths=[largura_util - 40 * mm, 40 * mm],
        )
        header.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), PRETO),
            ("TEXTCOLOR", (1, 0), (1, 0), colors.white),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("LEFTPADDING", (0, 0), (-1, -1), 10),
            ("RIGHTPADDING", (0, 0), (-1, -1), 10),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ]))
        story.append(header)

        linhas = [[
            Paragraph("OK", _estilo_celula_bold),
            Paragraph("SKU", _estilo_celula_bold),
            Paragraph("Produto", _estilo_celula_bold),
            Paragraph("Unid.", _estilo_celula_bold),
        ]]
        for item in itens:
            linhas.append([
                "",
                Paragraph(item["sku"], _estilo_celula),
                Paragraph(item["nome"], _estilo_celula),
                Paragraph(str(item["unidades"]), _estilo_celula_bold),
            ])

        tabela = Table(linhas, colWidths=larguras_colunas, repeatRows=1)
        estilo = [
            ("BACKGROUND", (0, 0), (-1, 0), FUNDO_ZEBRA),
            ("LINEBELOW", (0, 0), (-1, 0), 0.75, CINZA_LINHA),
            ("LINEBELOW", (0, 1), (-1, -1), 0.5, CINZA_LINHA),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("ALIGN", (0, 1), (0, -1), "CENTER"),
            ("ALIGN", (3, 1), (3, -1), "CENTER"),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ("LEFTPADDING", (0, 0), (-1, -1), 6),
            ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ]
        # uma caixinha de verificacao (quadrado) por linha, nao uma so
        # envolvendo tudo
        for r in range(1, len(linhas)):
            estilo.append(("BOX", (0, r), (0, r), 0.9, PRETO))
        tabela.setStyle(TableStyle(estilo))
        story.append(tabela)
        story.append(Spacer(1, 14))

    doc.build(story)
    buffer.seek(0)
    return buffer.read()
