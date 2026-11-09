#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
build_assets.py — dibuja las piezas vectoriales del perfil.

    python3 tools/build_assets.py            (todo)
    python3 tools/build_assets.py hero cards (solo esas piezas)

Genera:

    assets/hero.svg              la cabecera
    assets/divisor.svg           la línea con la flor de cerezo
    assets/pie.svg               la despedida
    assets/cards/*.svg           una tarjeta por proyecto

Todo el texto va convertido a trazado: no hace falta ninguna fuente instalada
para que se vea bien, ni en GitHub ni en un móvil. Lo único que necesita el
sistema es el kanji 反魂 (paquete fonts-noto-cjk); si no está, se omite sin
romper nada.
"""

from __future__ import annotations

import sys

import lienzo
from lienzo import P, Lienzo, formato

BALOO = None
QUICK = None
NUNITO = None
CJK = None


def cargar_fuentes():
    global BALOO, QUICK, NUNITO, CJK
    BALOO = lienzo.fuente("Baloo2.ttf", peso=700)
    QUICK = lienzo.fuente("Quicksand.ttf", peso=600)
    NUNITO = lienzo.fuente("Nunito.ttf", peso=400)
    CJK = lienzo.cjk()


# ═══════════════════════════════════════════════════════════ la cabecera ══
def hero():
    """1200×340. El nombre grande, el kanji de la casa y petalos de fondo."""
    ancho, alto = 1200, 340
    c = Lienzo(ancho, alto, "Rioxuroxi · perfil")

    lienzo.fondos(c, ancho, alto)
    # Luna de sakura, muy tenue, detrás de todo.
    c.circulo(1050, 96, 132, P["sakura_palido"], opacidad=0.9)
    c.circulo(1050, 96, 96, P["sakura"], opacidad=0.35)

    # Ramas: tres flores de cerezo a distinta escala, recortadas por el borde.
    lienzo.sakura(c, 1075, 96, 62, P["sakura"], P["blanco"], giro=12, opacidad=0.95)
    lienzo.sakura(c, 1160, 210, 34, P["lila"], P["blanco"], giro=40, opacidad=0.75)
    lienzo.sakura(c, 980, 250, 26, P["sakura_fuerte"], P["blanco"], giro=70, opacidad=0.5)
    lienzo.lluvia(c, ancho, alto, cuantas=14, semilla=41, radio=(4, 9))

    # Antetítulo
    lienzo.texto(c, QUICK, "PERFIL  ·  GITHUB", 15, 70, 84, P["lila_fuerte"], tracking=3.4)

    # Nombre, con degradado de sakura a lavanda
    relleno = lienzo.degradado(c, "nombre", [P["sakura_fuerte"], P["lila_fuerte"]])
    lienzo.texto(c, BALOO, "RIOKUROXI", 104, 66, 186, P["tinta"], relleno=relleno)

    # Una raya y la descripción
    c.linea(72, 212, 300, 212, P["sakura"], 3)
    lienzo.texto(c, NUNITO, "Roxi — arquitecto de software. Bots autónomos, memoria local y nada de magia negra.",
                 20, 72, 246, P["tinta_suave"])

    # Pastillas
    x = 70
    for txt, fondo, color in [
        ("Shin-MD", P["sakura_palido"], P["sakura_fuerte"]),
        ("local-first", P["lila_palido"], P["lila_fuerte"]),
        ("México", P["ambar_palido"], "#B9832B"),
        ("AGPL-3.0", P["menta_palido"], "#2F8A72"),
    ]:
        x += lienzo.pastilla(c, QUICK, txt, x, 268, tam=15, fondo=fondo, color=color) + 12

    # El kanji, en vertical y muy suave, en la esquina: la firma de la casa.
    if CJK is not None:
        lienzo.centrado(c, CJK, "反", 62, 932, 236, P["tinta"], opacidad=0.13)
        lienzo.centrado(c, CJK, "魂", 62, 932, 300, P["tinta"], opacidad=0.13)
    return lienzo.guardar(c, "assets", "hero.svg")


# ══════════════════════════════════════════════════════════════ divisor ══
def divisor():
    """1200×64. Una línea que se desvanece con una flor en el centro."""
    ancho, alto = 1200, 64
    c = Lienzo(ancho, alto, "divisor")
    lienzo.degradado(c, "hilo_izq", [P["papel"], P["sakura"]], x1=0, y1=0, x2=1, y2=0)
    lienzo.degradado(c, "hilo_der", [P["sakura"], P["papel"]], x1=0, y1=0, x2=1, y2=0)
    c.rect(80, 30, 470, 3, 2, "url(#hilo_izq)")
    c.rect(650, 30, 470, 3, 2, "url(#hilo_der)")
    lienzo.sakura(c, 600, 32, 24, P["sakura_fuerte"], P["ambar"], giro=10)
    lienzo.petalo(c, 508, 18, 7, P["sakura"], 25, 0.6)
    lienzo.petalo(c, 692, 46, 6, P["lila"], 300, 0.5)
    return lienzo.guardar(c, "assets", "divisor.svg")


# ═════════════════════════════════════════════════════════════════ pie ══
def pie():
    """1200×150. La frase de cierre."""
    ancho, alto = 1200, 150
    c = Lienzo(ancho, alto, "pie")
    lienzo.fondos(c, ancho, alto, gid="pie")
    lienzo.lluvia(c, ancho, alto, cuantas=16, semilla=3, radio=(6, 14), opacidad=(0.35, 0.7))
    lienzo.centrado(c, QUICK, "TRANSFORMANDO LÓGICA EN ESTÉTICA, UN COMMIT A LA VEZ",
                    17, ancho / 2, 74, P["tinta_suave"], tracking=3.2)
    lienzo.centrado(c, NUNITO, "Hecho en México · con café de olla y pruebas que se ejecutan de verdad",
                    16, ancho / 2, 108, P["tinta_tenue"])
    lienzo.sakura(c, 132, 76, 20, P["sakura"], P["blanco"], giro=20)
    lienzo.sakura(c, 1068, 76, 20, P["lila"], P["blanco"], giro=50)
    return lienzo.guardar(c, "assets", "pie.svg")


# ═════════════════════════════════════════════════════════════ tarjetas ══
# Cada tarjeta es una pieza de 580×188. `color` pinta el filo y el icono.
PROYECTOS = [
    dict(
        archivo="shin-md",
        titulo="Shin-MD",
        lema="反魂",
        texto="Bot de WhatsApp multi-device con núcleo propio: anti-ban nativo, "
              "memoria SQLite y 213 comandos. Se instala con una línea.",
        etiquetas=[("v3.7.0", "sakura"), ("353 pruebas", "menta"), ("AGPL-3.0", "lila")],
        color=P["sakura_fuerte"],
    ),
    dict(
        archivo="shin-md-go",
        titulo="Shin-MD-Go",
        lema="en obras",
        texto="El mismo núcleo, reescrito en Go sobre whatsmeow: un binario, "
              "sin node_modules y sin forks que mantener.",
        etiquetas=[("Go", "lila"), ("1 binario", "menta"), ("beta", "ambar")],
        color=P["lila_fuerte"],
    ),
    dict(
        archivo="kuroxi-platform",
        titulo="kuroxi-platform",
        lema="plataforma",
        texto="Mensajería offline, entrega garantizada y almacenamiento duradero "
              "para cuando la red no está.",
        etiquetas=[("JavaScript", "ambar"), ("durable", "menta")],
        color="#3E7CB1",
    ),
    dict(
        archivo="lab2experimental",
        titulo="Lab2 experimental",
        lema="laboratorio",
        texto="Banco de pruebas del motor de descargas local: yt-dlp turbo con "
              "auto-update e integraciones nuevas.",
        etiquetas=[("experimental", "ambar"), ("yt-dlp", "lila")],
        color=P["ambar"],
    ),
    dict(
        archivo="ginko-covers",
        titulo="Ginko-Covers",
        lema="voz de anime",
        texto="Covers de canciones con voz de anime (RVC) desplegados en GPU "
              "gratuita, para que el bot los cante.",
        etiquetas=[("Python", "menta"), ("RVC", "sakura")],
        color="#57B79B",
    ),
]

FONDOS_ETIQUETA = {
    "sakura": (P["sakura_palido"], P["sakura_fuerte"]),
    "lila": (P["lila_palido"], P["lila_fuerte"]),
    "menta": (P["menta_palido"], "#2F8A72"),
    "ambar": (P["ambar_palido"], "#B9832B"),
}


def tarjeta(datos):
    ancho, alto = 580, 188
    c = Lienzo(ancho, alto, datos["titulo"])
    color = datos["color"]

    lienzo.marco(c, 1, 1, ancho - 2, alto - 2, radio=20, borde=P["borde"], grosor=2)
    # Filo de color a la izquierda, redondeado por dentro del marco.
    c.rect(1, 1, 10, alto - 2, 6, color)
    # Flor tenue en la esquina, para que no quede plano.
    lienzo.sakura(c, ancho - 34, alto - 26, 30, color, P["blanco"], giro=18, opacidad=0.12,
                  estambres=False)

    # Icono: círculo del color del proyecto con la flor dentro.
    c.circulo(62, 62, 30, color)
    lienzo.sakura(c, 62, 62, 15, P["blanco"], color, giro=14, estambres=False)

    lienzo.texto(c, BALOO, datos["titulo"], 27, 108, 60, P["tinta"])
    if datos["lema"]:
        ancho_titulo = BALOO.ancho(datos["titulo"], 27)
        lienzo.texto(c, QUICK, datos["lema"], 12.5, 108 + ancho_titulo + 14, 58,
                     P["tinta_tenue"], tracking=1.4)

    lienzo.parrafo(c, NUNITO, datos["texto"], 15.5, 108, 92, P["tinta_suave"], ancho - 150,
                   interlineado=23, limite=3)

    x = 108
    for txt, tipo in datos["etiquetas"]:
        fondo, tinta = FONDOS_ETIQUETA[tipo]
        x += lienzo.pastilla(c, QUICK, txt, x, alto - 48, tam=13, fondo=fondo, color=tinta) + 9

    # Flecha dibujada (las fuentes no traen el glifo →)
    ax, ay = ancho - 44, 56
    c.linea(ax - 16, ay, ax, ay, color, 2.4)
    c.linea(ax - 6, ay - 6, ax, ay, color, 2.4)
    c.linea(ax - 6, ay + 6, ax, ay, color, 2.4)
    return lienzo.guardar(c, "assets", "cards", datos["archivo"] + ".svg")


# ═══════════════════════════════════════════════ lenguajes (barras) ══
# Los porcentajes salen de sumar los bytes de cada lenguaje en los repositorios
# públicos. Si cambian, se cambian aquí y se vuelve a ejecutar el script.
LENGUAJES = [
    ("JavaScript", 76.7, P["sakura_fuerte"]),
    ("Go", 16.9, P["lila_fuerte"]),
    ("Shell", 2.7, "#3E7CB1"),
    ("Python", 1.9, "#57B79B"),
    ("Rust", 1.5, "#B9832B"),
    ("otros", 0.3, P["tinta_tenue"]),
]


def lenguajes():
    """1200×150. Una barra de un solo tramo con los pesos reales."""
    ancho, alto = 1200, 150
    c = Lienzo(ancho, alto, "lenguajes")
    lienzo.fondos(c, ancho, alto, gid="leng")
    lienzo.texto(c, QUICK, "DE QUÉ ESTÁ HECHO", 14, 60, 52, P["lila_fuerte"], tracking=3.2)

    x0, x1, alto_barra = 60, ancho - 60, 22
    total = x1 - x0
    x = x0
    # La barra: cada tramo con su color, las esquinas redondeadas al final.
    for i, (nombre, pct, color) in enumerate(LENGUAJES):
        w = total * pct / 100.0
        ultimo = i == len(LENGUAJES) - 1
        c.rect(x, 68, max(w - 3, 2), alto_barra, 9 if (i == 0 or ultimo) else 0, color)
        x += w

    # La leyenda, debajo
    x = x0
    for nombre, pct, color in LENGUAJES:
        c.circulo(x + 6, 122, 6, color)
        ancho_nombre = lienzo.texto(c, QUICK, nombre, 15, x + 18, 127, P["tinta_suave"])
        lienzo.texto(c, QUICK, "%.1f%%" % pct, 15, x + 24 + ancho_nombre, 127, P["tinta_tenue"])
        x += 24 + ancho_nombre + QUICK.ancho("%.1f%%" % pct, 15) + 34
    return lienzo.guardar(c, "assets", "lenguajes.svg")


# ═══════════════════════════════════════════════════════════════════ main ══
def main(partes):
    cargar_fuentes()
    hechas = []
    if not partes or "hero" in partes:
        hechas.append(hero())
    if not partes or "divisor" in partes:
        hechas.append(divisor())
    if not partes or "pie" in partes:
        hechas.append(pie())
    if not partes or "lenguajes" in partes:
        hechas.append(lenguajes())
    if not partes or "cards" in partes or "tarjetas" in partes:
        for datos in PROYECTOS:
            hechas.append(tarjeta(datos))
    for ruta in hechas:
        print("  ✓ %s" % ruta)
    print("\n%d piezas. Revísalas abriéndolas o con: python3 tools/preview.py" % len(hechas))


if __name__ == "__main__":
    main([a for a in sys.argv[1:] if not a.startswith("-")])
