# -*- coding: utf-8 -*-
"""
estadisticas — lee la actividad real de los repos y la deja en un JSON.

    python3 tools/estadisticas.py

De dónde salen los números: de la API de GitHub, contando *commits por semana
natural* (lunes a domingo) en todos los repos públicos de la cuenta. No hay
nada inventado ni estimado.

Por qué existe: la franja `assets/stats.svg` decía «+38 %» y ese 38 se había
escrito a mano una vez. El resto de cifras del perfil sí se regeneran, así que
esta era la única que envejecía sola. Ahora la lee un robot todas las semanas
(`.github/workflows/actividad.yml`), la escribe en `tools/estadisticas.json`
y vuelve a dibujar el SVG.

El JSON se versiona a propósito: así el número se puede mirar sin ejecutar
nada y el workflow solo comitea cuando de verdad cambió.

Sin token funciona igual: se hace **una petición por repositorio** (la lista
más 6 tandas = 7, de las 60 que da GitHub por hora) y las semanas se reparten
en memoria. Con `GITHUB_TOKEN` en el entorno el límite sube y hay margen de
sobra para reintentos.
"""
import json
import os
import sys
import urllib.error
import urllib.request
from datetime import date, datetime, timedelta, timezone

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.dirname(AQUI)
DESTINO = os.path.join(AQUI, "estadisticas.json")

USUARIO = "riokuroxi-svg"
SEMANAS = 12                 # las que dibuja la minigráfica
BLOQUE = 4                   # el delta compara 4 semanas contra las 4 anteriores
API = "https://api.github.com"
TOKEN = os.environ.get("GITHUB_TOKEN") or os.environ.get("GH_TOKEN") or ""


def _pide(url, intentos=3):
    """GET a la API con reintentos. Devuelve (datos, ok)."""
    cabeceras = {
        "Accept": "application/vnd.github+json",
        "User-Agent": "%s-perfil-estadisticas" % USUARIO,
    }
    if TOKEN:
        cabeceras["Authorization"] = "Bearer " + TOKEN
    for intento in range(intentos):
        try:
            peticion = urllib.request.Request(url, headers=cabeceras)
            with urllib.request.urlopen(peticion, timeout=30) as respuesta:
                return json.loads(respuesta.read().decode("utf-8")), True
        except urllib.error.HTTPError as error:
            # 409 = repositorio vacío; 451 = bloqueado. No es un fallo de red.
            if error.code in (409, 451, 404):
                return [], True
            if error.code in (403, 429) and intento + 1 < intentos:
                continue
            print("  ! la API respondió %d en %s" % (error.code, url), file=sys.stderr)
        except Exception as error:  # red caída, timeout, JSON roto…
            print("  ! %s en %s" % (error, url), file=sys.stderr)
    return None, False


def _lunes(dia):
    return dia - timedelta(days=dia.weekday())


def _fechas_de_commits(repo, desde, hasta, max_paginas=10):
    """Fechas de los commits de `repo` en [desde, hasta).

    Una sola tanda de peticiones por repositorio, no una por semana: el techo
    sin token son 60 peticiones a la hora y 6 repos × 12 semanas se lo comía
    entero (y con él los 403). Aquí se trae el histórico del tramo de una vez
    y las semanas se reparten en memoria sobre las fechas que vienen dentro.
    """
    fechas, pagina = [], 1
    while pagina <= max_paginas:
        url = ("%s/repos/%s/%s/commits?since=%sT00:00:00Z&until=%sT00:00:00Z"
               "&per_page=100&page=%d"
               % (API, USUARIO, repo, desde.isoformat(), hasta.isoformat(), pagina))
        datos, ok = _pide(url)
        if not ok:
            return None
        if not isinstance(datos, list) or not datos:
            break
        for commit in datos:
            # La fecha del commit, no la del push: es la que no cambia cuando
            # GitHub reescribe una rama.
            sello = (commit.get("commit") or {}).get("committer") or {}
            texto = sello.get("date") or ""
            if texto:
                fechas.append(datetime.strptime(texto, "%Y-%m-%dT%H:%M:%SZ").date())
        if len(datos) < 100:
            break
        pagina += 1
    return fechas


def leer(hoy=None):
    """Devuelve el bloque de estadísticas, listo para el JSON."""
    hoy = hoy or datetime.now(timezone.utc).date()
    lunes_actual = _lunes(hoy)

    repos, ok = _pide("%s/users/%s/repos?per_page=100&sort=pushed" % (API, USUARIO))
    if not ok or not isinstance(repos, list):
        return None
    nombres = [r["name"] for r in repos if not r.get("fork") and not r.get("archived")]
    if not nombres:
        return None

    # 12 columnas: las 11 semanas cerradas + la que está en curso. La última
    # se dibuja igual; el JSON dice cuál es parcial para que nadie compare peras.
    desde = lunes_actual - timedelta(weeks=SEMANAS - 1)
    hasta = lunes_actual + timedelta(days=7)

    por_repo, total_ok = {}, True
    for nombre in nombres:
        fechas = _fechas_de_commits(nombre, desde, hasta)
        if fechas is None:
            total_ok = False
            continue
        por_repo[nombre] = fechas

    if not total_ok:
        # Preferimos no publicar una semana a medias antes que publicar un cero
        # que no es verdad: el workflow no comitea y se reintenta la semana que
        # viene.
        return None

    semanas, parciales = [], []
    for i in range(SEMANAS - 1, -1, -1):
        inicio = lunes_actual - timedelta(weeks=i)
        fin = inicio + timedelta(days=7)
        semanas.append(sum(1 for fechas in por_repo.values()
                           for dia in fechas if inicio <= dia < fin))
        parciales.append(inicio >= lunes_actual)

    if not total_ok:
        # Preferimos no publicar una semana a medias antes que publicar un cero
        # que no es verdad: el workflow no comitea y se reintenta la semana que
        # viene.
        return None

    # Delta honesto: las últimas 4 semanas *cerradas* contra las 4 anteriores.
    cerradas = [v for v, p in zip(semanas, parciales) if not p]
    if len(cerradas) >= 2 * BLOQUE:
        recientes = sum(cerradas[-BLOQUE:])
        previas = sum(cerradas[-2 * BLOQUE:-BLOQUE])
    else:                                    # cuenta recién nacida o sin datos
        return None

    if previas == 0:
        if recientes == 0:
            return None
        delta = "+100 %"                     # de nada a algo: no hay % que valga
        delta_num = None
    else:
        delta_num = round((recientes - previas) * 100.0 / previas)
        delta = "%s%d %%" % ("+" if delta_num >= 0 else "", delta_num)

    return {
        "_nota": "Lo escribe tools/estadisticas.py desde la API de GitHub. No editar a mano.",
        "usuario": USUARIO,
        "repos": nombres,
        "semanas": semanas,
        "semana_parcial": parciales[-1],
        "ultimas_4": recientes,
        "cuatro_anteriores": previas,
        "delta": delta,
        "delta_num": delta_num,
        "actualizado": date.today().isoformat(),
    }


def main():
    print("leyendo la actividad de %s…" % USUARIO)
    datos = leer()
    if not datos:
        print("✖ no se pudo leer la actividad: se deja el JSON como estaba",
              file=sys.stderr)
        return 1

    anterior = None
    if os.path.exists(DESTINO):
        try:
            with open(DESTINO, encoding="utf-8") as fh:
                anterior = json.load(fh)
        except Exception:
            anterior = None

    if anterior and {k: v for k, v in anterior.items() if k != "actualizado"} == \
            {k: v for k, v in datos.items() if k != "actualizado"}:
        # Nada cambió de verdad: no se toca el archivo para no ensuciar el
        # commit del robot con una fecha nueva cada semana.
        print("  = sin cambios · %s (%s commits en 4 semanas)"
              % (datos["delta"], datos["ultimas_4"]))
        return 0

    with open(DESTINO, "w", encoding="utf-8") as fh:
        json.dump(datos, fh, ensure_ascii=False, indent=1)
        fh.write("\n")
    print("  ✓ %s · %s" % (DESTINO, datos["delta"]))
    print("  semanas: %s" % datos["semanas"])
    return 0


if __name__ == "__main__":
    sys.exit(main())
