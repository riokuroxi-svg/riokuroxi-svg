#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
preparar_arte.py — deja las ilustraciones listas para el perfil.

    python3 tools/preparar_arte.py

Hace tres cosas, que son las que hay que hacer a mano y siempre se olvidan:

  1. Portada: recorta las bandas negras del arte original y lo unifica con un
     duotono suave (ciruela → rosa) para que combine con las piezas
     vectoriales. Guarda `assets/anime/portada-1200.jpg` a 1200 px de ancho.
  2. Mascota: recorta la pegatina y le deja el fondo transparente.
     Guarda `assets/anime/mascota.png`.
  3. Miniaturas 16:9 de las ilustraciones para las tarjetas de proyecto, a
     480 px y calidad moderada: van dentro de los SVG como data URI, así que
     cada KB se paga dos veces (aquí y en base64).

Los arte originales viven en `assets/src/`. Esto solo hace falta si se cambia
una ilustración; los archivos ya preparados están en el repositorio.
"""

from __future__ import annotations

import os
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageEnhance, ImageOps

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.dirname(AQUI)
SRC = os.path.join(RAIZ, "assets", "src")
ANIME = os.path.join(RAIZ, "assets", "anime")


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


def portada():
    origen = os.path.join(SRC, "hero_arte.png")
    if not os.path.exists(origen):
        print("  · falta %s, se salta la portada" % origen)
        return
    im = recortar_bandas(Image.open(origen).convert("RGB"))
    gris = ImageOps.grayscale(im)
    duotono = ImageOps.colorize(gris, black=(30, 16, 40), white=(255, 220, 232),
                                mid=(120, 84, 176))
    im = Image.blend(im, duotono, 0.32)
    im = ImageEnhance.Contrast(im).enhance(1.08)
    im = ImageEnhance.Brightness(im).enhance(1.04)
    im = im.resize((1200, round(im.height * 1200 / im.width)), Image.LANCZOS)
    destino = os.path.join(ANIME, "portada-1200.jpg")
    im.save(destino, "JPEG", quality=84, optimize=True, progressive=True)
    print("  ✓ %s %s · %d KB" % (destino, im.size, os.path.getsize(destino) // 1024))


def mascota():
    origen = os.path.join(SRC, "mascota2.png")
    if not os.path.exists(origen):
        print("  · falta %s, se salta la mascota" % origen)
        return
    im = Image.open(origen).convert("RGBA")
    a = np.asarray(im).astype(np.int16)
    fondo = a[8, 8, :3]
    # Distancia al color del fondo: lo que está lejos es dibujo, lo que está
    # cerca desaparece. El corte es suave para no dejar sierra en el borde.
    dist = np.sqrt(((a[:, :, :3] - fondo) ** 2).sum(axis=2))
    alfa = np.clip((dist - 26) * 8, 0, 255).astype(np.uint8)
    im.putalpha(Image.fromarray(alfa))
    im = im.crop(im.getbbox())
    im.thumbnail((520, 520), Image.LANCZOS)
    destino = os.path.join(ANIME, "mascota.png")
    im.quantize(colors=200, method=Image.FASTOCTREE).save(destino, optimize=True)
    print("  ✓ %s %s · %d KB" % (destino, im.size, os.path.getsize(destino) // 1024))


def miniaturas():
    pares = [
        ("portada.jpg", "thumb-portada.jpg"),
        ("escena.jpg", "thumb-escena.jpg"),
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
        escala = max(ancho / im.width, alto / im.height)
        im = im.resize((round(im.width * escala), round(im.height * escala)), Image.LANCZOS)
        x = (im.width - ancho) // 2
        y = (im.height - alto) // 2
        im = im.crop((x, y, x + ancho, y + alto))
        salida = os.path.join(ANIME, destino)
        im.save(salida, "JPEG", quality=80, optimize=True, progressive=True)
        print("  ✓ %s · %d KB" % (salida, os.path.getsize(salida) // 1024))

    # La miniatura de Lab2 es la mascota sobre un degradado sakura.
    mascara = os.path.join(ANIME, "mascota.png")
    if os.path.exists(mascara):
        lienzo = Image.new("RGB", (ancho, alto))
        lapiz = ImageDraw.Draw(lienzo)
        for i in range(alto):
            t = i / (alto - 1)
            lapiz.line([(0, i), (ancho, i)],
                       fill=(int(253 + (233 - 253) * t),
                             int(227 + (150 - 227) * t),
                             int(236 + (196 - 236) * t)))
        m = Image.open(mascara).convert("RGBA")
        m.thumbnail((int(alto * 0.82), int(alto * 0.82)), Image.LANCZOS)
        lienzo.paste(m, ((ancho - m.width) // 2, (alto - m.height) // 2 + 6), m)
        salida = os.path.join(ANIME, "thumb-mascota.jpg")
        lienzo.save(salida, "JPEG", quality=80, optimize=True, progressive=True)
        print("  ✓ %s · %d KB" % (salida, os.path.getsize(salida) // 1024))


def main():
    os.makedirs(ANIME, exist_ok=True)
    print("Portada")
    portada()
    print("Mascota")
    mascota()
    print("Miniaturas")
    miniaturas()
    print("\nlisto. Después: python3 tools/build_assets.py && python3 tools/preview.py")
    return 0


if __name__ == "__main__":
    sys.exit(main())
