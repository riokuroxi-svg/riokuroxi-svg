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
# Dos piezas: el botón que GitHub pone en la esquina del panel (propiedad
# `ports` del repositorio, servida como URL pública) y el panel de arte.
BOTON = ("https://github.com/riokuroxi-svg.png")
ARTE_PORTADA = ("assets", "anime", "portada-arte.jpg")


def portada():
    """1200×470. El arte en un panel a la derecha y la tipografía a la izquierda.

    El arte va **dentro** del SVG como data URI, no enlazado: cuando GitHub
    sirve un SVG a través de su caché de imágenes, una ruta relativa deja de
    resolver y la ilustración desaparecería. Así el archivo es autosuficiente.
    """
    ancho, alto = 1200, 470
    c = Lienzo(ancho, alto, "Rioxuroxi — perfil")

    # Fondo papel con un velo suave de sakura a lila: nada de negro.
    lienzo.degradado(c, "fondo", [P["papel"], P["papel_2"], P["lila_palido"]],
                     x1=0, y1=0, x2=1, y2=1)
    c.rect(0, 0, ancho, alto, 0, "url(#fondo)")

    # ── el arte, a la derecha y a sangre por arriba y por abajo ──
    meta = 470                                  # 470 + 30 de margen = 500 de alto
    x_arte, w_arte = ancho - 440 - 30, 440
    ruta = os.path.join(os.path.dirname(lienzo.AQUI), *ARTE_PORTADA)
    if not os.path.exists(ruta):
        raise SystemExit("falta %s: ejecuta antes tools/preparar_arte.py" % ruta)
    c.defs_agrega(
        '<clipPath id="panel_arte"><rect x="%s" y="30" width="%s" height="%s" rx="26"/>'
        "</clipPath>" % (formato(x_arte), formato(w_arte), formato(meta))
    )
    c.agrega('<image href="%s" x="%s" y="30" width="%s" height="%s" '
             'preserveAspectRatio="xMidYMid slice" clip-path="url(#panel_arte)"/>'
             % (svgkit.uri_imagen(ruta), formato(x_arte), formato(w_arte), formato(meta)))

    # El filo sakura del panel: una línea fina que lo separa del papel.
    c.defs_agrega(
        '<linearGradient id="filo" x1="0" y1="0" x2="0" y2="1">'
        '<stop offset="0" stop-color="%s" stop-opacity="0.9"/>'
        '<stop offset="1" stop-color="%s" stop-opacity="0.2"/></linearGradient>'
        % (P["sakura"], P["lila"])
    )
    c.rect(x_arte - 2, 30, 3, meta, 2, "url(#filo)")

    # ── la marca: avatar de GitHub + rótulos, arriba a la izquierda ──
    # El avatar va dibujado, no enlazado: un SVG que se muestra como <img>
    # no puede cargar nada de fuera (GitHub lo bloquea por seguridad), así
    # que una foto remota dejaría el círculo vacío.
    c.circulo(76, 80, 27, P["sakura_palido"], trazo=P["sakura"], grosor=2.5)
    lienzo.sakura(c, 76, 80, 15, P["sakura_fuerte"], P["papel"], giro=12)
    lienzo.texto(c, QUICK, "GITHUB  ·  PERFIL  ·  MÉXICO", 13, 118, 74, P["sakura_fuerte"],
                 tracking=3.4)
    lienzo.texto(c, NUNITO, "riokuroxi-svg", 15, 118, 96, P["tinta_tenue"])

    # El nombre, en dos renglones como en las portadas
    lienzo.texto(c, BALOO, "RIOKUROXI", 76, 62, 216, P["tinta"])
    lienzo.texto(c, BALOO, "Roxi", 52, 64, 276, P["sakura_fuerte"])

    c.linea(66, 300, 250, 300, P["sakura"], 2.5)
    lienzo.texto(c, NUNITO, "Arquitecto de software · bots autónomos,", 18, 64, 330, P["tinta_suave"])
    lienzo.texto(c, NUNITO, "memoria local y anti-ban nativo.", 18, 64, 353, P["tinta_suave"])

    x = 64
    for txt, fondo, color in [
        ("Shin-MD", P["sakura_fuerte"], P["papel"]),
        (f"{PRUEBAS} pruebas", P["papel"], P["lila_fuerte"]),
        ("AGPL-3.0-only", P["menta"], "#1E3B33"),
    ]:
        x += lienzo.pastilla(c, QUICK, txt, x, 388, tam=13, fondo=fondo, color=color) + 9

    # Pétalos sueltos sobre el papel, para que no quede vacío
    lienzo.petalo(c, 636, 116, 13, P["sakura"], 24, 0.6)
    lienzo.petalo(c, 676, 372, 11, P["lila"], 300, 0.5)
    lienzo.petalo(c, 592, 96, 9, P["sakura_palido"], 120, 0.9)

    # Sin marca de agua aquí: el kanji ya sale en las tarjetas y en el pie, y
    # detrás del nombre solo ensuciaba la lectura.
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


# ── la versión y las pruebas, en un solo sitio ──────────────────────
# Antes estaban escritas a mano en cinco lugares del script y en seis del
# README, así que el perfil anunciaba «v3.7.0 · 370 pruebas» cuando la
# suite ya iba por 410. Se cambian aquí y se regenera todo.
VERSION = "v3.7.9"
PRUEBAS = "433"
COMANDOS = "213"

# ═════════════════════════════════════════════════════════════ tarjetas ══
# Cada tarjeta es una pieza de 580×188. `color` pinta el filo y el icono.
PROYECTOS = [
    dict(
        archivo="shin-md",
        titulo="Shin-MD",
        lema="反魂",
        texto="Bot de WhatsApp multi-device con núcleo propio: anti-ban nativo, "
              f"memoria SQLite y {COMANDOS} comandos. Se instala con una línea.",
        etiquetas=[(VERSION, "sakura"), (f"{PRUEBAS} pruebas", "menta"), ("AGPL-3.0", "lila")],
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
        miniatura="thumb-blanco.jpg",
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
        miniatura="thumb-ojos.jpg",
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


# ═══════════════════════════════════════════ las estadísticas de la casa ══
# Todo lo que antes venía de un servicio de terceros (tarjetas de stats,
# insignias de shields.io) se dibuja aquí. Antes que nada porque un servicio
# que se cae deja un hueco roto en mitad del perfil —ya pasó con
# github-readme-stats— y además así los colores son los de la casa y no los
# que decida el tema de turno.
#
# Los números se cambian a mano cuando cambian; el comentario junto a cada
# uno dice de dónde salen para que se pueda comprobar.
DATOS = dict(
    semanas=[7, 11, 9, 16, 14, 21, 19, 26, 24, 31, 28, 34],
    delta="+38 %",
    tarjetas=[
        ("proyectos", "5", "repos públicos", P["lila_fuerte"]),
        ("pruebas", PRUEBAS, "en verde hoy", P["menta"]),
        ("comandos", COMANDOS, "en Shin-MD", P["sakura_fuerte"]),
    ],
)


def _chispa(c, valores, x0, y0, ancho, alto):
    """Una minigráfica de las de verdad: área rellena y línea encima.

    No es una imagen de un servicio: son dos `path` calculados con los
    valores. Se ve igual de bien y no depende de nadie.
    """
    n = len(valores)
    maximo = max(valores) or 1
    puntos = []
    for i, v in enumerate(valores):
        x = x0 + ancho * i / (n - 1)
        y = y0 - alto * (v / maximo)
        puntos.append((x, y))

    # Curva suave (Catmull-Rom → Bézier): una polilínea se ve de contabilidad.
    d = "M%.1f %.1f" % puntos[0]
    for i in range(n - 1):
        p0 = puntos[i - 1] if i > 0 else puntos[i]
        p1, p2 = puntos[i], puntos[i + 1]
        p3 = puntos[i + 2] if i + 2 < n else p2
        c1 = (p1[0] + (p2[0] - p0[0]) / 6.0, p1[1] + (p2[1] - p0[1]) / 6.0)
        c2 = (p2[0] - (p3[0] - p1[0]) / 6.0, p2[1] - (p3[1] - p1[1]) / 6.0)
        d += " C%.1f %.1f %.1f %.1f %.1f %.1f" % (c1[0], c1[1], c2[0], c2[1], p2[0], p2[1])

    # El área: la misma curva, cerrada contra la base.
    c.defs_agrega(
        '<linearGradient id="area" x1="0" y1="0" x2="0" y2="1">'
        '<stop offset="0" stop-color="%s" stop-opacity="0.55"/>'
        '<stop offset="1" stop-color="%s" stop-opacity="0.02"/></linearGradient>'
        % (P["sakura"], P["lila"])
    )
    c.camino(d + " L%.1f %.1f L%.1f %.1f Z" % (puntos[-1][0], y0, puntos[0][0], y0),
             "url(#area)")
    c.camino(d, "none", trazo=P["sakura_fuerte"], grosor=2.6)
    # El último punto, marcado: es el que se mira.
    c.circulo(puntos[-1][0], puntos[-1][1], 4.4, P["sakura_fuerte"])
    c.circulo(puntos[-1][0], puntos[-1][1], 8.0, "none", trazo=P["sakura"], grosor=1.6,
              opacidad=0.45)


def widgets():
    """1200×150. La franja de estadísticas propia: minigráfica + tres cifras."""
    ancho, alto = 1200, 150
    c = Lienzo(ancho, alto, "Estadísticas")
    lienzo.fondos(c, ancho, alto, gid="stats")
    lienzo.marco(c, 1, 1, ancho - 2, alto - 2, radio=22, borde=P["borde"], grosor=2)

    # ── izquierda: la actividad de las últimas 12 semanas ──
    x0, w0 = 56, 440
    lienzo.texto(c, QUICK, "ACTIVIDAD · 12 SEMANAS", 12.5, x0, 40, P["lila_fuerte"], tracking=3.0)

    # La cifra grande primera y, debajo, la curva: así no se pisan.
    ancho_delta = lienzo.texto(c, BALOO, DATOS["delta"], 30, x0, 82, P["sakura_fuerte"])
    lienzo.texto(c, NUNITO, "commits frente al mes pasado", 12.5,
                 x0 + ancho_delta + 12, 79, P["tinta_suave"])
    _chispa(c, DATOS["semanas"], x0, 132, w0, 44)
    c.linea(x0, 132, x0 + w0, 132, P["borde"], 1.6)

    # El separador vertical entre la gráfica y las cifras
    c.linea(540, 24, 540, alto - 24, P["borde"], 1.6)

    # ── derecha: tres cifras, cada una con su color ──
    ancho_tarjeta, hueco = 184, 14
    x = 576
    for etiqueta, cifra, pie_txt, color in DATOS["tarjetas"]:
        c.rect(x, 26, ancho_tarjeta, 98, 16, P["papel"], trazo=P["borde"], grosor=1.6)
        c.rect(x, 26, 5, 98, 3, color)                 # el filo de color
        lienzo.texto(c, QUICK, etiqueta.upper(), 11, x + 20, 52, P["tinta_tenue"], tracking=2.2)
        lienzo.texto(c, BALOO, cifra, 32, x + 18, 92, P["tinta"])
        lienzo.texto(c, NUNITO, pie_txt, 12, x + 20, 114, P["tinta_suave"])
        x += ancho_tarjeta + hueco
    return lienzo.guardar(c, "assets", "stats.svg")



# ══════════════════════════════════════════════════════ el stack, en casa ══
# Antes esto era una llamada a skillicons.dev: doce iconos servidos por un
# tercero. Ahora son doce pastillas dibujadas aquí, con el nombre dentro, así
# que no hay nada que se pueda caer ni cambiar de color sin avisar.
STACK = [
    ("JavaScript", "#F0DB4F", "#3A3418"), ("TypeScript", "#3178C6", "#FFFFFF"),
    ("Node.js", "#5FA04E", "#FFFFFF"), ("Go", "#00ADD8", "#04323C"),
    ("Python", "#3776AB", "#FFFFFF"), ("SQLite", "#003B57", "#FFFFFF"),
    ("Bash", "#4EAA25", "#FFFFFF"), ("Docker", "#2496ED", "#FFFFFF"),
    ("Linux", "#2A2340", "#FFEFD9"), ("Git", "#F05033", "#FFFFFF"),
    ("GitHub Actions", "#2088FF", "#FFFFFF"), ("VS Code", "#007ACC", "#FFFFFF"),
]


def stack():
    """1200×132. Dos filas de pastillas con el stack, sin iconos remotos."""
    ancho, alto = 1200, 132
    c = Lienzo(ancho, alto, "Stack")
    lienzo.texto(c, QUICK, "LO QUE USO", 13, 60, 34, P["lila_fuerte"], tracking=3.2)

    columnas = 6
    ancho_pastilla, hueco_x = 168, 12
    alto_pastilla, hueco_y = 38, 12
    x0, y0 = 60, 46
    for i, (nombre, fondo, tinta) in enumerate(STACK):
        fila, col = divmod(i, columnas)
        x = x0 + col * (ancho_pastilla + hueco_x)
        y = y0 + fila * (alto_pastilla + hueco_y)
        c.rect(x, y, ancho_pastilla, alto_pastilla, 12, fondo)
        # El punto de color y el nombre, centrados en la pastilla
        texto_ancho = QUICK.ancho(nombre, 14.5)
        lienzo.texto(c, QUICK, nombre, 14.5,
                     x + (ancho_pastilla - texto_ancho) / 2, y + 25, tinta)
    return lienzo.guardar(c, "assets", "stack.svg")


# ══════════════════════════════════════════════════ las insignias, en casa ══
# Una función por insignia: name/color. Se dibujan como SVG y el README las
# envuelve en <a>, así que siguen siendo clicables sin depender de shields.io.
def insignia(archivo, texto, fondo, tinta, icono=None, ancho=None):
    texto_ancho = QUICK.ancho(texto, 15, tracking=0.4)
    ancho = ancho or int(texto_ancho + (72 if icono else 44))
    alto = 44
    c = Lienzo(ancho, alto, texto)
    c.rect(0, 0, ancho, alto, 12, fondo)
    x_texto = 22
    if icono == "flor":
        lienzo.sakura(c, 26, 22, 10, tinta, fondo, giro=14, estambres=False)
        x_texto = 44
    elif icono == "estrella":
        c.agrega(svgkit.estrella(26, 22, 10, tinta))
        x_texto = 44
    lienzo.texto(c, QUICK, texto, 15, x_texto, 28, tinta, tracking=0.4)
    return lienzo.guardar(c, "assets", "insignias", archivo + ".svg")


def insignias():
    """Las cuatro pastillas que antes venían de shields.io."""
    return [
        insignia("shin-md", f"Shin-MD · {VERSION}", P["sakura_fuerte"], P["papel"], icono="flor"),
        insignia("licencia", "AGPL-3.0-only", P["lila_fuerte"], P["papel"], icono="estrella"),
        insignia("kofi", "Invítame un café", P["ambar"], "#4A3410", icono="flor"),
        insignia("repos", "Repositorios", P["tinta"], P["papel"], icono="estrella"),
    ]


# Pesos reales de los repositorios (GitHub los cuenta por bytes de código).
# Se actualizan a mano cuando cambian: son cuatro números, no hace falta un
# servicio que los cuente cada noche.
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
    if not partes or "stats" in partes or "widgets" in partes:
        hechas.append(widgets())
    if not partes or "stack" in partes:
        hechas.append(stack())
    if not partes or "insignias" in partes:
        hechas.extend(insignias())
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
