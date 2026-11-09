<div align="center">

<img src="assets/hero.svg" width="100%" alt="Rioxuroxi — arquitecto de software, bots autónomos y memoria local"/>

<p>
  <a href="#-sobre-mí">Sobre mí</a> ·
  <a href="#-proyectos">Proyectos</a> ·
  <a href="#-lo-que-uso">Stack</a> ·
  <a href="#-en-números">Números</a> ·
  <a href="#-fuera-del-teclado">Fuera del teclado</a> ·
  <a href="#-hablemos">Hablemos</a>
</p>

<img src="https://readme-typing-svg.demolab.com?font=Fira+Code&weight=600&size=20&duration=3200&pause=900&color=E4668F&center=true&vCenter=true&width=780&lines=Bots+de+WhatsApp+que+no+se+caen;Memoria+local%2C+sin+mandar+nada+a+un+servidor;Anti-ban+nativo+y+pruebas+que+se+ejecutan+de+verdad;Y+un+poco+de+sakura+en+la+terminal" alt=""/>

</div>

<img src="assets/divisor.svg" width="100%" alt=""/>

## 🌸 Sobre mí

Soy **Roxi** `riokuroxi-svg`, desarrollador y arquitecto de software desde
**México** 🇲🇽. Mi trabajo es convertir bots de mensajería en sistemas que
**aguantan**: procesos que se separan en lugar de caerse juntos, memoria que vive
en el disco del equipo y no en la nube de nadie, y decisiones heurísticas tomadas
en el momento, sin pedir permiso a una API.

- ⚙️ **Lo que hago:** núcleos de bots, colas de envío, anti-ban, memoria local
  con SQLite y un instalador que funciona igual en Termux, en un VPS y en Docker.
- 🧠 **Cómo lo hago:** primero investigo —protocolo, incidencias, cómo lo resuelve
  quien ya se estrelló— y después escribo. Cero código trampa, cero dependencias
  que sobren.
- 🧪 **Cómo lo compruebo:** con pruebas que se ejecutan solas. Si una frase del
  README se puede medir, hay un archivo en `test/` que la mide.
- 🇲🇽 **Dónde:** México, con café de olla y una playlist de openings de fondo.

<p>
  <a href="https://github.com/riokuroxi-svg/Shin-MD">
    <img src="https://img.shields.io/badge/Shin--MD-v3.7.0-E4668F?style=for-the-badge&logo=whatsapp&logoColor=white" alt="Shin-MD"/>
  </a>
  <a href="https://github.com/riokuroxi-svg?tab=repositories">
    <img src="https://img.shields.io/badge/licencia-AGPL--3.0--only-6E4FB0?style=for-the-badge&logo=gnu&logoColor=white" alt="AGPL-3.0-only"/>
  </a>
  <a href="https://ko-fi.com/kuroxisvg">
    <img src="https://img.shields.io/badge/Ko--fi-invitarme_un_café-F2BE6B?style=for-the-badge&logo=kofi&logoColor=white" alt="Ko-fi"/>
  </a>
</p>

<img src="assets/divisor.svg" width="100%" alt=""/>

## 🚀 Proyectos

Todo cuelga de la misma idea: **un núcleo pequeño y honesto**, y encima de él las
cosas que hacen falta.

<p align="center">
  <a href="https://github.com/riokuroxi-svg/Shin-MD"><img src="assets/cards/shin-md.svg" width="49%" alt="Shin-MD — bot de WhatsApp multi-device, v3.7.0, 353 pruebas"/></a>
  <a href="https://github.com/riokuroxi-svg/Shin-MD-Go"><img src="assets/cards/shin-md-go.svg" width="49%" alt="Shin-MD-Go — el mismo núcleo en Go sobre whatsmeow"/></a>
  <a href="https://github.com/riokuroxi-svg/kuroxi-platform"><img src="assets/cards/kuroxi-platform.svg" width="49%" alt="kuroxi-platform — mensajería offline con entrega garantizada"/></a>
  <a href="https://github.com/riokuroxi-svg/Lab2experimental"><img src="assets/cards/lab2experimental.svg" width="49%" alt="Lab2 experimental — motor de descargas local"/></a>
  <a href="https://github.com/riokuroxi-svg/Ginko-Covers"><img src="assets/cards/ginko-covers.svg" width="49%" alt="Ginko-Covers — covers con voz de anime"/></a>
</p>

**Pruébalo:** Shin-MD se instala con una línea, verifica la huella del instalador
y arranca el bot al terminar. Nada de descargar y ejecutar a ciegas:

```bash
curl -fsSL https://raw.githubusercontent.com/riokuroxi-svg/Shin-MD/v3.7.0/shin.sh | sh
```

<img src="assets/anime/escena.jpg" width="100%" alt="Ilustración: una noche de deploy en la azotea" style="border-radius:18px"/>

<img src="assets/divisor.svg" width="100%" alt=""/>

## 🧰 Lo que uso

<div align="center">

<img src="https://skillicons.dev/icons?i=js,ts,nodejs,go,python,sqlite,bash,docker,linux,git,githubactions,vscode&perline=12" alt="Stack"/>

<br/><br/>

<img src="https://raw.githubusercontent.com/riokuroxi-svg/riokuroxi-svg/main/assets/lenguajes.svg" width="100%" alt="JavaScript 77 %, Go 17 %, Shell 3 %, Python 2 %"/>

</div>

| Terreno | Con qué lo trabajo |
| :--- | :--- |
| **Núcleo de bots** | `Node.js 22` (ESM, sin transpilar) · `Baileys` con parches propios · `whatsmeow` en Go |
| **Memoria y datos** | `SQLite` en modo WAL · `FTS5` para búsqueda · respaldos que no se llevan los datos por delante |
| **Inmunidad** | anti-ban con jitter, colas con prioridad, límites por capacidad, aislamiento de sub-procesos |
| **Herramientas** | `Bash` POSIX puro para los instaladores · `systemd` para el servicio · `Docker` |
| **Calidad** | runner de pruebas propio · `tsc` sobre JSDoc · cero errores de lint o no entra |

<img src="assets/anime/prado.jpg" width="100%" alt="Ilustración: un prado de margaritas al amanecer" style="border-radius:18px"/>

<img src="assets/divisor.svg" width="100%" alt=""/>

## 📊 En números

<div align="center">

|  |  |  |
| :---: | :---: | :---: |
| **213**<br/>comandos en Shin-MD | **353**<br/>pruebas en verde | **520**<br/>commits propios |
| **13**<br/>repositorios | **2**<br/>lenguajes de verdad | **1**<br/>línea para instalar |

<br/>

<a href="https://github.com/riokuroxi-svg/Shin-MD">
  <img src="assets/destacado.svg" width="100%" alt="Shin-MD — v3.7.0, 353 pruebas, AGPL-3.0-only, y el comando de instalación"/>
</a>

</div>

<img src="assets/divisor.svg" width="100%" alt=""/>

## 🐈 Fuera del teclado

<table>
  <tr>
    <td width="42%" align="center" valign="middle">
      <img src="assets/anime/gato.jpg" width="100%" alt="Ilustración: un gato negro sobre el escritorio" style="border-radius:18px"/>
    </td>
    <td width="58%" valign="top">

- 🎧 **Sonando:** openings de los 2000 y lo-fi para las horas raras.
- 🌙 **Se programa de noche.** La mejor hora para cazar un `EEXIST` es cuando ya
  no hay nadie mirando.
- 🍵 **Café de olla**, no espresso. La taza aparece en cuanto uno se descuida.
- 🐈‍⬛ **Supervisor de calidad:** un gato negro que aprueba las releases caminando
  sobre el teclado.
- 📝 **Si algo no está escrito, no existe.** Por eso cada proyecto trae su guía
  de instalación y su informe de lo que se rompió por el camino.

  </td>
  </tr>
</table>

<img src="assets/divisor.svg" width="100%" alt=""/>

```zsh
roxi@shin-md:~$ neofetch --perfil
        /\_/\        Sistema .... Debian y Termux
       ( o.o )       Núcleo ..... Shin-MD v3.7.0
        > ^ <        Memoria .... SQLite WAL · FTS5
                     Anti-ban ... jitter + aclimatación
                     Pruebas .... 353 en verde
                     Licencia ... AGPL-3.0-only
                     Sakura ..... siempre
```

<img src="assets/divisor.svg" width="100%" alt=""/>

## 📬 Hablemos

<div align="center">

¿Un bot que se cae cada semana? ¿Una migración que da miedo?

<p>
  <a href="https://github.com/riokuroxi-svg?tab=repositories"><img src="https://img.shields.io/badge/Repositorios-riokuroxi--svg-2A2340?style=for-the-badge&logo=github&logoColor=white" alt="GitHub"/></a>
  <a href="https://ko-fi.com/kuroxisvg"><img src="https://img.shields.io/badge/Ko--fi-kuroxisvg-F2BE6B?style=for-the-badge&logo=kofi&logoColor=white" alt="Ko-fi"/></a>
  <a href="https://github.com/riokuroxi-svg/Shin-MD/issues"><img src="https://img.shields.io/badge/Issues-abrir_uno-E4668F?style=for-the-badge&logo=githubissues&logoColor=white" alt="Issues"/></a>
</p>

</div>

<img src="assets/pie.svg" width="100%" alt="Transformando lógica en estética, un commit a la vez"/>

<!--
  Las piezas de assets/ (hero, divisor, pie, lenguajes y tarjetas) se dibujan
  solas, con código:  python3 tools/build_assets.py   (ver tools/LEEME.md)
  El texto va convertido a trazado vectorial, así que se ven igual en cualquier
  navegador o móvil, sin depender de fuentes instaladas.
  Las ilustraciones de assets/anime/ son originales de este repositorio.
-->
