# tools — de dónde salen las piezas del perfil

Nada de lo que se ve en el README está hecho a mano en un editor de imágenes:
las piezas vectoriales (cabecera, divisor, pie, barra de lenguajes y una tarjeta
por proyecto) se **dibujan con código**.

```bash
python3 tools/preparar_arte.py    # ilustraciones: recorte, duotono, miniaturas
python3 tools/build_assets.py     # todas las piezas de assets/
python3 tools/preview.py          # hoja de revisión: assets/preview.svg
```

Solo hacen falta dos cosas:

```bash
python3 -m pip install fonttools cairosvg
# y, para el kanji 反魂, en Debian/Ubuntu: sudo apt install fonts-noto-cjk
```

| Archivo | Qué es |
|---|---|
| `svgkit.py` | lo mínimo para escribir SVG: lienzo, gradientes, recortes y **texto convertido a trazado** |
| `lienzo.py` | la paleta sakura, el pétalo, la flor de cinco pétalos, las pastillas y la lluvia de pétalos |
| `build_assets.py` | las piezas del perfil, una función por pieza |
| `preparar_arte.py` | coge el arte original de `assets/src/`, le quita las bandas negras, lo unifica con la paleta, recorta la mascota y saca las miniaturas 16:9 para las tarjetas |
| `preview.py` | junta todas las piezas en una hoja para revisarlas de un vistazo |

El texto va a **trazado vectorial** (cada letra es un `path`, no un `<text>`), así
que las imágenes se ven idénticas en GitHub, en un móvil o en un navegador viejo,
sin depender de ninguna fuente instalada. Las fuentes de `tools/fuentes/`
(Baloo 2, Nunito y Quicksand, SIL Open Font License 1.1) solo se usan al
regenerar; los SVG finales no las necesitan.

Las ilustraciones de `assets/anime/` son originales de este repositorio. Las
preparadas (recortadas y comprimidas) son las que usa el README; los originales
en PNG viven en `assets/src/` para poder rehacerlas sin perder calidad.

La portada lleva su ilustración **dentro** del SVG, como data URI: cuando GitHub
sirve un SVG por su caché de imágenes, una ruta relativa deja de resolver y la
ilustración desaparecería. Por eso `assets/portada.svg` se basta solo.
