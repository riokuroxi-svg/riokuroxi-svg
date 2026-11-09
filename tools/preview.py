#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
preview.py — junta todas las piezas vectoriales en una sola hoja.

    python3 tools/preview.py

Deja `assets/preview.svg` con la cabecera, el divisor, las tarjetas, la barra de
lenguajes y el pie, uno debajo de otro, para revisar de un vistazo que todo
cuadra antes de subirlo. No forma parte del perfil.
"""

from __future__ import annotations

import os
import re
import sys

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.dirname(AQUI)
sys.path.insert(0, AQUI)

PIEZAS = [
    ("assets/hero.svg", 1200),
    ("assets/divisor.svg", 1200),
    ("assets/cards/shin-md.svg", 580),
    ("assets/cards/shin-md-go.svg", 580),
    ("assets/cards/kuroxi-platform.svg", 580),
    ("assets/cards/lab2experimental.svg", 580),
    ("assets/cards/ginko-covers.svg", 580),
    ("assets/lenguajes.svg", 1200),
    ("assets/pie.svg", 1200),
]


def medidas(svg: str):
    """Saca ancho y alto del atributo viewBox."""
    m = re.search(r'viewBox="([\d.\- ]+)"', svg)
    if not m:
        raise ValueError("pieza sin viewBox")
    _, _, w, h = (float(v) for v in m.group(1).split())
    return w, h


def cuerpo(svg: str) -> str:
    """El contenido, sin la cabecera <svg …> ni el cierre."""
    svg = re.sub(r"^<\?xml[^>]*\?>\s*", "", svg.strip())
    dentro = svg[svg.index(">") + 1: svg.rindex("</svg>")]
    # Los id de los <defs> se repiten entre piezas: se les pone un prefijo.
    return dentro


def main():
    piezas = []
    y = 40
    for ruta, ancho_obj in PIEZAS:
        ruta_abs = os.path.join(RAIZ, ruta)
        if not os.path.exists(ruta_abs):
            print("  · falta %s, se salta" % ruta)
            continue
        with open(ruta_abs, encoding="utf-8") as fh:
            svg = fh.read()
        w, h = medidas(svg)
        alto_obj = h * ancho_obj / w
        piezas.append(
            '<g transform="translate(40 %s) scale(%s)">%s</g>'
            % (y, ancho_obj / w, cuerpo(svg))
        )
        y += alto_obj + 40

    alto_total = y
    lienzo = (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" '
        'viewBox="0 0 1280 %s" width="1280" height="%s" role="img" '
        'aria-label="Vista previa de las piezas del perfil">\n'
        '<rect width="1280" height="%s" fill="#FFFFFF"/>%s</svg>\n'
        % (alto_total, alto_total, alto_total, "".join(piezas))
    )
    destino = os.path.join(RAIZ, "assets", "preview.svg")
    with open(destino, "w", encoding="utf-8") as fh:
        fh.write(lienzo)
    print("  ✓ %s (%d piezas)" % (destino, len(piezas)))


if __name__ == "__main__":
    main()
