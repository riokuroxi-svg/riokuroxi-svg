#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
preparar_arte.py — deja las ilustraciones listas para el perfil.

    python3 tools/preparar_arte.py

Las ilustraciones de `assets/src/nuevo/` llegan del tamaño en que se pueden
conseguir (736 px de ancho), y GitHub las muestra a más de 800. Si se dejan
así, el navegador las estira y se ven blandas. Aquí se hace lo que sí mejora
la imagen de verdad, sin inventar detalle:

  1. **Se recortan al encuadre que se va a usar**, encima del sujeto (no al
     centro geométrico, que corta cabezas).
  2. **Se reescalan hacia arriba** con LANCZOS a 2–3× el tamaño final, para
     que el navegador siempre reduzca y nunca amplíe: reducir es lo que se ve
     nítido.
  3. **Se afinan** con un `unsharp` suave: sube la acutancia sin el halo
     blanco que deja pasarse.
  4. **Se guardan en JPEG 4:4:4** (sin submuestreo de color). En imágenes de
     neón —que es todo este arte— el 4:2:0 por defecto emborrona los bordes
     de color; el 4:4:4 los mantiene. Cuesta unos KB más y se nota.

Salidas (todas en `assets/anime/`):

    portada-arte.jpg        panel derecho de la portada (1:1)
    sobre-mi.jpg            retrato cuadrado para la columna de «Sobre mí»
    galeria-1..3.jpg        las tres piezas de la galería (4:5)
    banda-escritorio.jpg    banda ancha para «Fuera del teclado»
    thumb-*.jpg             miniaturas 16:9 de las tarjetas de proyecto
"""

from __future__ import annotations

import os
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageOps

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.dirname(AQUI)
SRC = os.path.join(RAIZ, "assets", "src")
NUEVO = os.path.join(SRC, "nuevo")
ANIME = os.path.join(RAIZ, "assets", "anime")

SUPER = 3          # cuántas veces se agranda antes de bajar al tamaño final
CALIDAD = 88


def recortar_bandas(im):
    """Las ilustraciones generadas a veces traen barras negras arriba y abajo."""
    a = np.asarray(im.convert("RGB")).astype(np.int16)
    oscuras = a.mean(axis=(1, 2)) < 22
    arriba = 0
    while arriba < len(oscuras) and oscuras[arriba]:
        arriba += 1
    abajo = len(oscuras)
    while abajo > 0 and oscuras[abajo - 1]:
        abajo -= 1
    if abajo - arriba < 50:  # no era una banda, era una imagen oscura
        return im
    return im.crop((0, arriba, im.width, abajo))


def encuadrar(im, ancho, alto, foco_x=0.5, foco_y=0.5):
    """Recorta a la proporción pedida alrededor del sujeto.

    `foco_*` dice dónde está lo que no se puede perder: 0 es el borde
    izquierdo/arriba y 1 el derecho/abajo. Con 0.5 sale centrado; con 0.42
    sube un poco, que es lo que conviene cuando el sujeto es una cara.
    """
    objetivo = ancho / alto
    actual = im.width / im.height
    if actual > objetivo:                      # sobra ancho
        w = round(im.height * objetivo)
        x = round((im.width - w) * foco_x)
        im = im.crop((x, 0, x + w, im.height))
    elif actual < objetivo:                    # sobra alto
        h = round(im.width / objetivo)
        y = round((im.height - h) * foco_y)
        im = im.crop((0, y, im.width, y + h))
    return im


def afinar(im):
    """Nitidez sin halo: un `unsharp` moderado sobre el canal de luz."""
    return im.filter(ImageFilter.UnsharpMask(radius=1.6, percent=68, threshold=3))


def escalar(im, ancho_final, alto_final):
    """Sube con LANCZOS y baja al tamaño final: el navegador solo reduce."""
    grande = im.resize((im.width * SUPER, im.height * SUPER), Image.LANCZOS)
    grande = afinar(grande)
    # Un pelín de contraste y color: el arte de neón pierde viveza al comprimir.
    grande = ImageEnhance.Contrast(grande).enhance(1.04)
    grande = ImageEnhance.Color(grande).enhance(1.05)
    return grande.resize((ancho_final, alto_final), Image.LANCZOS)


def guardar(im, nombre, calidad=CALIDAD):
    ruta = os.path.join(ANIME, nombre)
    im.convert("RGB").save(
        ruta, "JPEG", quality=calidad, optimize=True, progressive=True,
        subsampling=0,          # 4:4:4: sin basura de color en los bordes
    )
    print("  ✓ %-24s %-11s · %d KB" % (nombre, "%dx%d" % im.size, os.path.getsize(ruta) // 1024))
    return ruta


def preparar(origen, nombre, ancho, alto, foco_x=0.5, foco_y=0.5, calidad=CALIDAD):
    ruta = os.path.join(NUEVO, origen)
    if not os.path.exists(ruta):
        print("  · falta %s, se salta %s" % (ruta, nombre))
        return None
    im = recortar_bandas(Image.open(ruta).convert("RGB"))
    im = encuadrar(im, ancho, alto, foco_x, foco_y)
    im = escalar(im, ancho, alto)
    return guardar(im, nombre, calidad)


# ══════════════════════════════════════════════════════════════ el arte ══
def arte():
    print("Portada y retratos")
    # El panel de la portada es de 470×500: casi cuadrado. El foco va alto
    # (0.38) porque lo que hay que ver es la cara y el filo de la katana.
    preparar("katana.jpg", "portada-arte.jpg", 760, 800, 0.44, 0.36)
    # Retrato de «Sobre mí»: cuadrado, sobre la cara.
    preparar("neon.jpg", "sobre-mi.jpg", 720, 720, 0.62, 0.45)

    print("Galería")
    preparar("glitch-ojos.jpg", "galeria-1.jpg", 640, 800, 0.5, 0.42)
    preparar("glitch-audifonos.jpg", "galeria-2.jpg", 640, 800, 0.5, 0.35)
    preparar("glitch-blanco.jpg", "galeria-3.jpg", 640, 800, 0.5, 0.36)

    print("Banda")
    preparar("escritorio.jpg", "banda-escritorio.jpg", 1760, 680, 0.6, 0.5)
    # El prado es el único que no viene de `nuevo/`: ya estaba preparado.
    prado = os.path.join(ANIME, "prado.jpg")
    if os.path.exists(prado):
        guardar(Image.open(prado).convert("RGB"), "prado.jpg")


def miniaturas():
    """Miniaturas 16:9 para las tarjetas: van dentro del SVG como data URI,
    así que cada KB se paga dos veces (aquí y en base64)."""
    pares = [
        ("portada-arte.jpg", "thumb-portada.jpg"),
        ("galeria-3.jpg", "thumb-blanco.jpg"),
        ("galeria-1.jpg", "thumb-ojos.jpg"),
        ("gato.jpg", "thumb-gato.jpg"),
        ("prado.jpg", "thumb-prado.jpg"),
    ]
    ancho, alto = 480, 270
    for origen, destino in pares:
        ruta = os.path.join(ANIME, origen)
        if not os.path.exists(ruta):
            print("  · falta %s, se salta" % ruta)
            continue
        im = Image.open(ruta).convert("RGB")
        im = encuadrar(im, ancho, alto, 0.5, 0.4)
        im = im.resize((ancho, alto), Image.LANCZOS)
        guardar(im, destino, calidad=80)


def limpiar_viejas():
    """Borra lo que ya no se usa: el balcón y la mascota chibi salieron del
    perfil y no deben quedarse ocupando peso en el repositorio."""
    fuera = ["escena.jpg", "thumb-escena.jpg", "mascota.png", "thumb-mascota.jpg"]
    for nombre in fuera:
        ruta = os.path.join(ANIME, nombre)
        if os.path.exists(ruta):
            os.remove(ruta)
            print("  ✕ %s (ya no se usa)" % nombre)


def main():
    os.makedirs(ANIME, exist_ok=True)
    arte()
    print("Miniaturas")
    miniaturas()
    print("Limpieza")
    limpiar_viejas()
    print("\nlisto. Después: python3 tools/build_assets.py && python3 tools/preview.py")
    return 0


if __name__ == "__main__":
    sys.exit(main())
