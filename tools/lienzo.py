#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
lienzo.py — cositas de dibujo compartidas por los scripts de este repositorio.

Aquí viven la paleta (crema, sakura y lavanda) y los adornos que se repiten en
todas las piezas: el pétalo, la flor de cerezo, las chispas, las pastillas con
texto y el marco redondeado. El texto siempre se convierte a **trazado
vectorial**, así que los SVG se ven idénticos en GitHub, en un móvil o en un
navegador viejo, sin depender de ninguna fuente instalada.

Uso normal (desde un script de tools/):

    import lienzo
    baloo = lienzo.fuente("Baloo2.ttf", peso=700)
    lienzo.titulo(c, baloo, "Hola", 48, 40, 90, lienzo.P["tinta"])
"""

from __future__ import annotations

import math
import os
import random
import sys

AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AQUI)

import svgkit  # noqa: E402  (vive aquí al lado)
from svgkit import Lienzo, formato  # noqa: E402,F401

FUENTES = os.path.join(AQUI, "fuentes")

# ─────────────────────────────────────────────────────────────── la paleta
# Sakura de noche: crema para el papel, rosa para el acento, lavanda para la
# sombra y un azul tinta para el texto. Nada de negro puro: cansa.
P = dict(
    papel="#FFFAF6",
    papel_2="#FFF3F6",
    blanco="#FFFFFF",
    tinta="#2A2340",
    tinta_suave="#5F5478",
    tinta_tenue="#9A8FB2",
    sakura="#F6A8C0",
    sakura_fuerte="#E4668F",
    sakura_palido="#FDE3EC",
    lila="#9B7BD4",
    lila_fuerte="#6E4FB0",
    lila_palido="#EFE8FB",
    ambar="#F2BE6B",
    ambar_palido="#FDEFD6",
    menta="#6FCBB0",
    menta_palido="#DDF5EE",
    borde="#F2DDE6",
)

_cache: dict[tuple, svgkit.Fuente] = {}


def fuente(nombre: str, peso: int | None = None) -> svgkit.Fuente:
    """Carga (y recuerda) una de las fuentes de tools/fuentes."""
    clave = (nombre, peso)
    if clave not in _cache:
        _cache[clave] = svgkit.Fuente(os.path.join(FUENTES, nombre), peso=peso)
    return _cache[clave]


def cjk(peso="Bold"):
    """La fuente del kanji 反魂. Es un archivo del sistema, así que si no está
    se devuelve None y las piezas simplemente no lo dibujan: nunca rompen."""
    candidatos = [
        ("/usr/share/fonts/opentype/noto/NotoSansCJK-%s.ttc" % peso, "CJK JP"),
        ("/usr/share/fonts/opentype/noto/NotoSerifCJK-%s.ttc" % peso, "CJK JP"),
        ("/usr/share/fonts/truetype/noto/NotoSansCJK-%s.ttc" % peso, "CJK JP"),
    ]
    for ruta, familia in candidatos:
        if os.path.exists(ruta):
            try:
                return svgkit.Fuente(ruta, familia_cjk=familia)
            except Exception:
                continue
    return None


# ─────────────────────────────────────────────────────────────── texto
def texto(c, f, txt, tam, x, base, color, tracking=0.0, opacidad=None, relleno=None):
    """Escribe `txt` con su base en `base`. Devuelve el ancho usado."""
    d = f.trazado(txt, tam, x, base, tracking)
    if d:
        c.camino(d, relleno or color, opacidad=opacidad)
    return f.ancho(txt, tam, tracking)


def titulo(c, f, txt, tam, x, base, color, tracking=0.0, opacidad=None, relleno=None):
    """Igual que texto(), pero pensado para leerse de un vistazo."""
    return texto(c, f, txt, tam, x, base, color, tracking, opacidad, relleno)


def centrado(c, f, txt, tam, cx, base, color, tracking=0.0, opacidad=None, relleno=None):
    ancho = f.ancho(txt, tam, tracking)
    texto(c, f, txt, tam, cx - ancho / 2, base, color, tracking, opacidad, relleno)
    return ancho


def derecha(c, f, txt, tam, x_derecha, base, color, tracking=0.0, opacidad=None):
    ancho = f.ancho(txt, tam, tracking)
    texto(c, f, txt, tam, x_derecha - ancho, base, color, tracking, opacidad)
    return ancho


def parrafo(c, f, txt, tam, x, base, color, ancho_max, interlineado=None, tracking=0.2,
            limite=None, opacidad=None):
    """Texto en varias líneas. Devuelve la altura total ocupada."""
    interlineado = interlineado or tam * 1.42
    lineas = f.envolver(txt, tam, ancho_max, tracking)
    if limite:
        lineas = lineas[:limite]
    for i, linea in enumerate(lineas):
        texto(c, f, linea, tam, x, base + i * interlineado, color, tracking, opacidad)
    return len(lineas) * interlineado


# ─────────────────────────────────────────────────────────────── formas
def _petalo_svg(radio, color, giro=0.0, opacidad=None, borde=None, grosor=0.0):
    """El <path> de un pétalo, centrado en 0,0 y girado. Devuelve texto SVG."""
    r = radio
    d = (
        "M 0 0 "
        "C %(a)s %(b)s, %(c)s %(d)s, 0 %(e)s "
        "C %(f)s %(d)s, %(g)s %(b)s, 0 0 Z"
        % dict(
            a=formato(-r * 0.62), b=formato(-r * 0.42), c=formato(-r * 0.52), d=formato(-r * 1.05),
            e=formato(-r * 1.02),
            f=formato(r * 0.52), g=formato(r * 0.62),
        )
    )
    atributos = 'fill="%s"' % color
    if opacidad is not None:
        atributos += ' opacity="%s"' % formato(opacidad)
    if borde:
        atributos += ' stroke="%s" stroke-width="%s"' % (borde, formato(grosor or 1))
    return '<g transform="rotate(%s)"><path d="%s" %s/></g>' % (formato(giro), d, atributos)


def petalo(c, cx, cy, radio, color, giro=0.0, opacidad=None, borde=None, grosor=0.0):
    """Un pétalo suelto, con la muesca de arriba."""
    return c.agrega(
        '<g transform="translate(%s %s)">%s</g>'
        % (formato(cx), formato(cy), _petalo_svg(radio, color, giro, opacidad, borde, grosor))
    )


def sakura(c, cx, cy, radio, color, centro=None, giro=0.0, opacidad=None, estambres=True):
    """La flor de cinco pétalos que aparece por todo el perfil."""
    centro = centro or P["sakura_fuerte"]
    op = ' opacity="%s"' % formato(opacidad) if opacidad is not None else ""
    piezas = "".join(
        _petalo_svg(radio, color, giro + i * 72, opacidad) for i in range(5)
    )
    hilos = ""
    if estambres:
        for i in range(5):
            ang = math.radians(giro + 36 + i * 72)
            x2 = cx + math.cos(ang) * radio * 0.6
            y2 = cy + math.sin(ang) * radio * 0.6
            hilos += (
                '<line x1="%s" y1="%s" x2="%s" y2="%s" stroke="%s" stroke-width="%s" '
                'stroke-linecap="round"%s/>'
                % (formato(cx), formato(cy), formato(x2), formato(y2), centro,
                   formato(max(0.8, radio * 0.055)), op)
            )
            hilos += '<circle cx="%s" cy="%s" r="%s" fill="%s"%s/>' % (
                formato(x2), formato(y2), formato(max(0.9, radio * 0.085)), centro, op)
    yema = '<circle cx="%s" cy="%s" r="%s" fill="%s"%s/>' % (
        formato(cx), formato(cy), formato(radio * 0.24), centro, op)
    return c.agrega(
        '<g transform="translate(%s %s)">%s</g>%s%s'
        % (formato(cx), formato(cy), piezas, hilos, yema)
    )


def petalo_que_cae(c, cx, cy, radio, color, giro=0.0, duracion=11.0, deriva=26.0,
                   caida=34.0, retraso=0.0, opacidad=None):
    """Un pétalo que se mece y baja despacio. Usa SMIL dentro del propio SVG,
    que es lo único que se anima cuando la imagen se sirve como <img>."""
    import random

    azar = random.Random(int(cx * 7 + cy * 13 + duracion * 31))
    giro_final = giro + azar.choice([-1, 1]) * azar.uniform(60, 160)
    cuerpo = _petalo_svg(radio, color, 0, opacidad)
    anim = (
        '<animateTransform attributeName="transform" type="translate" '
        'values="0 0; %(dx)s %(dy1)s; %(d0)s %(dy2)s; 0 0" dur="%(dur)ss" '
        'begin="%(ret)ss" repeatCount="indefinite" calcMode="spline" '
        'keyTimes="0;0.35;0.7;1" keySplines="0.42 0 0.58 1;0.42 0 0.58 1;0.42 0 0.58 1"/>'
        '<animateTransform attributeName="transform" type="rotate" additive="sum" '
        'values="0;%(g1)s;%(g2)s;0" dur="%(dur)ss" begin="%(ret)ss" '
        'repeatCount="indefinite"/>'
        % dict(dx=formato(deriva), dy1=formato(caida * 0.55), d0=formato(-deriva * 0.35),
               dy2=formato(caida), dur=formato(duracion), ret=formato(retraso),
               g1=formato(giro_final * 0.5), g2=formato(giro_final))
    )
    return c.agrega(
        '<g transform="translate(%s %s) rotate(%s)"><g>%s%s</g></g>'
        % (formato(cx), formato(cy), formato(giro), anim, cuerpo)
    )


def lluvia(c, ancho, alto, cuantas=18, semilla=7, colores=None, radio=(5, 13),
           desde=0.0, hasta=None, opacidad=(0.25, 0.7)):
    """Pétalos repartidos por el lienzo. Determinista: misma semilla, mismo dibujo."""
    azar = random.Random(semilla)
    colores = colores or [P["sakura"], P["sakura_palido"], P["lila"], P["lila_palido"]]
    hasta = alto if hasta is None else hasta
    piezas = []
    for _ in range(cuantas):
        x = azar.uniform(0, ancho)
        y = azar.uniform(desde, hasta)
        r = azar.uniform(*radio)
        col = azar.choice(colores)
        op = azar.uniform(*opacidad)
        piezas.append(_petalo_svg(r, col, azar.uniform(0, 360), op))
    return c.agrega("".join(piezas))


def chispas(c, puntos, color=None, radio=4, opacidad=0.9):
    """Las estrellitas de cuatro puntas."""
    color = color or P["ambar"]
    for (x, y, r) in puntos:
        c.agrega(svgkit.estrella(x, y, r or radio, color, giro=0, opacidad=opacidad))


def pastilla(c, f, txt, x, y, tam=14, fondo=None, color=None, alto=None, icono=None,
             radio=None):
    """Una etiqueta redondeada con texto dentro. Devuelve el ancho total."""
    fondo = fondo or P["lila_palido"]
    color = color or P["lila_fuerte"]
    alto = alto or tam * 2.1
    relleno = 14 if not icono else 30
    ancho = f.ancho(txt, tam) + relleno * 2
    radio = alto / 2 if radio is None else radio
    c.rect(x, y, ancho, alto, radio, fondo)
    if icono:
        sakura(x + 15, y + alto / 2, tam * 0.42, color, P["blanco"], estambres=False)
    texto(c, f, txt, tam, x + relleno, y + alto / 2 + f.alto(tam) / 2, color)
    return ancho


def marco(c, x, y, ancho, alto, radio=22, relleno=None, borde=None, grosor=2,
          sombra=True, opacidad=None):
    """La tarjeta blanca con filo de color que usan las piezas."""
    relleno = relleno or P["blanco"]
    borde = borde or P["borde"]
    if sombra:
        c.rect(x + 2, y + 6, ancho, alto, radio, "#E7D3DE", opacidad=0.55)
    return c.rect(x, y, ancho, alto, radio, relleno, trazo=borde, grosor=grosor,
                  opacidad=opacidad)


def fondos(c, ancho, alto, gid="papel", desde=None, hasta=None, radio=0):
    """Fondo crema con un degradado suave de sakura en la esquina."""
    desde = desde or P["papel"]
    hasta = hasta or P["papel_2"]
    c.gradiente_lineal(gid, [("0", desde), ("1", hasta)], x1=0, y1=0, x2=1, y2=1)
    return c.rect(0, 0, ancho, alto, radio, "url(#%s)" % gid)


def degradado(c, gid, colores, x1=0, y1=0, x2=1, y2=1):
    c.gradiente_lineal(gid, [(str(i / (len(colores) - 1)), col) for i, col in enumerate(colores)],
                       x1=x1, y1=y1, x2=x2, y2=y2)
    return "url(#%s)" % gid


def brillo(c, gid, colores, cx=0.5, cy=0.5, r=0.6):
    c.gradiente_radial(gid, [(str(i / (len(colores) - 1)), col) for i, col in enumerate(colores)],
                       cx=cx, cy=cy, r=r)
    return "url(#%s)" % gid


def guardar(c, *partes):
    ruta = os.path.join(os.path.dirname(AQUI), *partes)
    os.makedirs(os.path.dirname(ruta), exist_ok=True)
    c.guardar(ruta)
    return ruta
