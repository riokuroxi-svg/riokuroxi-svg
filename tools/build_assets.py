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

import os

import lienzo
import svgkit
from lienzo import P, Lienzo, formato

BALOO = None
QUICK = None
NUNITO = None
MONO = None
CJK = None


def cargar_fuentes():
    global BALOO, QUICK, NUNITO, MONO, CJK
    BALOO = lienzo.fuente("Baloo2.ttf", peso=700)
    QUICK = lienzo.fuente("Quicksand.ttf", peso=600)
    NUNITO = lienzo.fuente("Nunito.ttf", peso=400)
    MONO = lienzo.mono()
    CJK = lienzo.cjk()


# ═══════════════════════════════════════════════════════════ la cabecera ══
ARTE_PORTADA = ("assets", "anime", "portada-1200.jpg")


def portada():
    """1200×470. La ilustración con la tipografía encima.

    El arte va **dentro** del SVG como data URI, no enlazado: cuando GitHub
    sirve un SVG a través de su caché de imágenes, una ruta relativa deja de
    resolver y la ilustración desaparecería. Así el archivo es autosuficiente.
    """
    ancho, alto = 1200, 470
    c = Lienzo(ancho, alto, "Rioxuroxi — perfil")

    ruta = os.path.join(os.path.dirname(lienzo.AQUI), *ARTE_PORTADA)
    if not os.path.exists(ruta):
        raise SystemExit("falta %s: ejecuta antes tools/preparar_arte.py" % ruta)
    c.imagen(svgkit.uri_imagen(ruta), 0, 0, ancho, alto, r=0)

    # Velo: un degradado con transparencia de verdad (stop-opacity), no una
    # máscara: las máscaras no se pintan igual en todos los visores y esto
    # tiene que verse bien en GitHub, en un móvil y en un navegador viejo.
    c.defs_agrega(
        '<linearGradient id="velo" x1="0" y1="0" x2="1" y2="0">'
        '<stop offset="0" stop-color="#150A20" stop-opacity="0.93"/>'
        '<stop offset="0.30" stop-color="#150A20" stop-opacity="0.88"/>'
        '<stop offset="0.60" stop-color="#150A20" stop-opacity="0.30"/>'
        '<stop offset="1" stop-color="#150A20" stop-opacity="0"/>'
        "</linearGradient>"
        '<linearGradient id="velo_pie" x1="0" y1="0" x2="0" y2="1">'
        '<stop offset="0" stop-color="#150A20" stop-opacity="0"/>'
        '<stop offset="1" stop-color="#150A20" stop-opacity="0.55"/>'
        "</linearGradient>"
    )
    c.rect(0, 0, ancho, alto, 0, "url(#velo)")
    c.rect(0, alto - 150, ancho, 150, 0, "url(#velo_pie)")

    # El nombre, en dos renglones como en las portadas
    lienzo.texto(c, QUICK, "GITHUB  ·  PERFIL  ·  MÉXICO", 14, 64, 92, P["sakura"],
                 tracking=4.2)
    lienzo.texto(c, BALOO, "RIOKUROXI", 92, 60, 196, P["papel"])
    lienzo.texto(c, BALOO, "Roxi", 58, 62, 262, P["sakura"])

    c.linea(66, 288, 268, 288, P["sakura"], 2.5)
    lienzo.texto(c, NUNITO, "Arquitecto de software · bots autónomos,", 19, 64, 320, "#E9DDEB")
    lienzo.texto(c, NUNITO, "memoria local y anti-ban nativo.", 19, 64, 345, "#E9DDEB")

    x = 64
    for txt, fondo, color in [
        ("Shin-MD", P["sakura"], "#2A2340"),
        ("353 pruebas", P["papel"], P["lila_fuerte"]),
        ("AGPL-3.0-only", P["menta"], "#1E3B33"),
    ]:
        x += lienzo.pastilla(c, QUICK, txt, x, 384, tam=14, fondo=fondo, color=color) + 10

    # Marca de agua: el kanji de la casa, abajo a la derecha, muy suave
    if CJK is not None:
        lienzo.derecha(c, CJK, "反魂", 34, ancho - 54, alto - 34, P["papel"], opacidad=0.28)
    lienzo.derecha(c, QUICK, "01", 13, ancho - 54, 62, P["sakura"], tracking=3.0)
    return lienzo.guardar(c, "assets", "portada.svg")


# ══════════════════════════════════════════════════════════════ divisor ══# ══════════════════════════════════════════════════════════════ divisor ══
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
        miniatura="thumb-portada.jpg",
    ),
    dict(
        archivo="shin-md-go",
        titulo="Shin-MD-Go",
        lema="en obras",
        texto="El mismo núcleo, reescrito en Go sobre whatsmeow: un binario, "
              "sin node_modules y sin forks que mantener.",
        etiquetas=[("Go", "lila"), ("1 binario", "menta"), ("beta", "ambar")],
        color=P["lila_fuerte"],
        miniatura="thumb-escena.jpg",
    ),
    dict(
        archivo="kuroxi-platform",
        titulo="kuroxi-platform",
        lema="plataforma",
        texto="Mensajería offline, entrega garantizada y almacenamiento duradero "
              "para cuando la red no está.",
        etiquetas=[("JavaScript", "ambar"), ("durable", "menta")],
        color="#3E7CB1",
        miniatura="thumb-gato.jpg",
    ),
    dict(
        archivo="lab2experimental",
        titulo="Lab2 experimental",
        lema="laboratorio",
        texto="Banco de pruebas del motor de descargas local: yt-dlp turbo con "
              "auto-update e integraciones nuevas.",
        etiquetas=[("experimental", "ambar"), ("yt-dlp", "lila")],
        color=P["ambar"],
        miniatura="thumb-mascota.jpg",
    ),
    dict(
        archivo="ginko-covers",
        titulo="Ginko-Covers",
        lema="voz de anime",
        texto="Covers de canciones con voz de anime (RVC) desplegados en GPU "
              "gratuita, para que el bot los cante.",
        etiquetas=[("Python", "menta"), ("RVC", "sakura")],
        color="#57B79B",
        miniatura="thumb-prado.jpg",
    ),
]

FONDOS_ETIQUETA = {
    "sakura": (P["sakura_palido"], P["sakura_fuerte"]),
    "lila": (P["lila_palido"], P["lila_fuerte"]),
    "menta": (P["menta_palido"], "#2F8A72"),
    "ambar": (P["ambar_palido"], "#B9832B"),
}


def tarjeta(datos):
    """Tarjeta con miniatura arriba y ficha abajo (estilo tarjeta de personaje)."""
    ancho, alto = 580, 342
    color = datos["color"]
    c = Lienzo(ancho, alto, datos["titulo"])
    lienzo.marco(c, 1, 1, ancho - 2, alto - 2, radio=20, borde=P["borde"], grosor=2)

    # La miniatura ocupa la mitad de arriba, con el marco redondeado.
    miniatura = os.path.join(os.path.dirname(lienzo.AQUI), "assets", "anime", datos["miniatura"])
    if os.path.exists(miniatura):
        c.defs_agrega(
            '<clipPath id="mini_%s"><rect x="11" y="11" width="%s" height="152" rx="14"/></clipPath>'
            % (datos["archivo"], formato(ancho - 22))
        )
        c.agrega('<image href="%s" x="11" y="11" width="%s" height="152" '
                 'preserveAspectRatio="xMidYMid slice" clip-path="url(#mini_%s)"/>'
                 % (svgkit.uri_imagen(miniatura), formato(ancho - 22), datos["archivo"]))
        # Velo inferior de la miniatura, para que el título respire
        c.defs_agrega(
            '<linearGradient id="velo_%s" x1="0" y1="0" x2="0" y2="1">'
            '<stop offset="0.45" stop-color="#150A20" stop-opacity="0"/>'
            '<stop offset="1" stop-color="#150A20" stop-opacity="0.72"/></linearGradient>'
            % datos["archivo"]
        )
        c.agrega('<rect x="11" y="83" width="%s" height="80" fill="url(#velo_%s)"/>'
                 % (formato(ancho - 22), datos["archivo"]))

    # Ficha: icono, título y lema
    c.circulo(48, 200, 21, color)
    lienzo.sakura(c, 48, 200, 10, P["blanco"], color, giro=14, estambres=False)
    lienzo.texto(c, BALOO, datos["titulo"], 24, 80, 208, P["tinta"])
    if datos["lema"]:
        ancho_titulo = BALOO.ancho(datos["titulo"], 24)
        lienzo.texto(c, QUICK, datos["lema"], 12, 82 + ancho_titulo + 12, 207,
                     P["tinta_tenue"], tracking=1.4)

    lienzo.parrafo(c, NUNITO, datos["texto"], 14.5, 26, 258, P["tinta_suave"],
                   ancho - 52, interlineado=20, limite=2)

    x = 26
    for txt, tipo in datos["etiquetas"]:
        fondo, tinta = FONDOS_ETIQUETA[tipo]
        x += lienzo.pastilla(c, QUICK, txt, x, 296, tam=12, fondo=fondo, color=tinta) + 8
    return lienzo.guardar(c, "assets", "cards", datos["archivo"] + ".svg")


def _tarjeta_vieja(datos):
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


# ══════════════════════════════════════════════ el repositorio destacado ══
def destacado():
    """1200×236. Shin-MD, con el comando de instalación a la vista.

    Existe porque la tarjeta automática de estadísticas de GitHub depende de un
    servicio de terceros que se cae (y cuando se cae deja un hueco roto en el
    perfil). Esto se dibuja aquí y no depende de nadie.
    """
    ancho, alto = 1200, 236
    c = Lienzo(ancho, alto, "Shin-MD, repositorio destacado")

    lienzo.degradado(c, "dest", [P["sakura_palido"], P["lila_palido"]], x1=0, y1=0, x2=1, y2=1)
    c.rect(0, 0, ancho, alto, 22, "url(#dest)")
    lienzo.lluvia(c, ancho, 110, cuantas=10, semilla=17, radio=(4, 10), opacidad=(0.25, 0.55))

    # Flor tenue abajo a la derecha: no toca ni el título ni la terminal.
    lienzo.sakura(c, 1178, 226, 36, P["blanco"], P["sakura"], giro=14, opacidad=0.35,
                  estambres=False)

    lienzo.texto(c, QUICK, "DESTACADO", 13, 56, 52, P["lila_fuerte"], tracking=3.6)
    lienzo.texto(c, BALOO, "Shin-MD", 52, 52, 112, P["tinta"])
    if CJK is not None:
        lienzo.texto(c, CJK, "反魂", 30, 56 + BALOO.ancho("Shin-MD", 52) + 16, 108,
                     P["sakura_fuerte"], opacidad=0.9)

    x = 56
    for txt, fondo, color in [
        ("v3.7.0", P["sakura"], P["blanco"]),
        ("353 pruebas", P["blanco"], P["lila_fuerte"]),
        ("AGPL-3.0-only", P["blanco"], "#2F8A72"),
    ]:
        x += lienzo.pastilla(c, QUICK, txt, x, 146, tam=14, fondo=fondo, color=color) + 10

    lienzo.texto(c, NUNITO, "Bot de WhatsApp multi-device con núcleo propio y anti-ban nativo.",
                 15, 56, 212, P["tinta_suave"])

    # La caja del comando, como una terminal pequeña
    caja_x, caja_y, caja_w, caja_h = 552, 44, 592, 148
    c.rect(caja_x + 2, caja_y + 6, caja_w, caja_h, 14, "#D9C8E8", opacidad=0.6)
    c.rect(caja_x, caja_y, caja_w, caja_h, 14, P["tinta"])
    for i, color in enumerate([P["sakura_fuerte"], P["ambar"], P["menta"]]):
        c.circulo(caja_x + 22 + i * 18, caja_y + 22, 5.5, color)
    lienzo.texto(c, MONO, "roxi@shin-md", 13, caja_x + 22, caja_y + 60, P["tinta_tenue"])

    linea1 = "curl -fsSL https://raw.githubusercontent.com/"
    linea2 = "riokuroxi-svg/Shin-MD/v3.7.0/shin.sh | sh"
    lienzo.texto(c, MONO, "$", 14, caja_x + 22, caja_y + 92, P["menta"])
    lienzo.texto(c, MONO, linea1, 14, caja_x + 40, caja_y + 92, "#E9E4F5")
    lienzo.texto(c, MONO, linea2, 14, caja_x + 22, caja_y + 116, P["sakura"])
    lienzo.texto(c, MONO, "· descarga, comprueba la huella y arranca", 12.5,
                 caja_x + 22, caja_y + 140, P["tinta_tenue"])
    return lienzo.guardar(c, "assets", "destacado.svg")


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
    if not partes or "portada" in partes or "hero" in partes:
        hechas.append(portada())
    if not partes or "divisor" in partes:
        hechas.append(divisor())
    if not partes or "pie" in partes:
        hechas.append(pie())
    if not partes or "destacado" in partes:
        hechas.append(destacado())
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
