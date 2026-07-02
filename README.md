# SerpScan

CLI de auditoría SEO — analiza cualquier página web y recibe sugerencias de mejora accionables. Creado por [Carriedo](https://www.linkedin.com/in/marcos-gongora-carriedo/) · Patrocinador: [Klara Automation](https://klara-automation.com).

## Cómo se inicia

```bash
npm start          # uso normal
npm run dev         # modo desarrollo (reinicia al guardar cambios)
```

Al arrancar te recibe un menú interactivo. Esto es lo que hace cada apartado:

---

## 🔍 Auditoría SEO

Analiza una única URL a fondo. Descarga el HTML de la página y ejecuta 7 comprobaciones en paralelo:

| Categoría | Qué revisa | Peso en el score |
|---|---|---|
| **Meta Tags y Social** | title, meta description, canonical, robots, Open Graph, Twitter Card, viewport, `lang`, hreflang, favicon | 25% |
| **Encabezados** | presencia de un único H1, jerarquía lógica (sin saltar de H1 a H4), uso de H2 | 15% |
| **Imágenes** | atributos `alt`, `width`/`height` (evita layout shift), lazy loading, formatos modernos (WebP/AVIF) | 10% |
| **Enlaces** | enlaces internos/externos, texto de anclaje, y una muestra de hasta 10 enlaces internos comprobados en vivo para detectar enlaces rotos (404/500) | 10% |
| **Rendimiento** | tiempo de respuesta del servidor (TTFB), tamaño del HTML, scripts que bloquean el renderizado, contenido mixto HTTP | 20% |
| **Datos Estructurados** | bloques JSON-LD válidos (Schema.org), microdata | 10% |
| **Robots y Sitemap** | si `robots.txt` existe y bloquea la página, y si hay un sitemap declarado y accesible | 10% |

Al terminar, cada categoría tiene una puntuación 0-100 y el conjunto se combina en un **score global ponderado**. Después puedes:
- **Guardar el informe** en HTML (visual, para compartir con un cliente), CSV (tabla plana para Excel) o JSON (datos en bruto).
- **Analizar una subpágina** — te ofrece los enlaces internos detectados para seguir auditando el sitio sin volver a escribir la URL.
- Si repites la misma URL en menos de 10 minutos, se sirve desde caché en vez de volver a descargarla.

---

## 📍 Posición en Google (Keyword Ranking)

Comprueba en qué posición aparece tu página para una keyword concreta, usando [SerpAPI](https://serpapi.com) (requiere clave gratuita configurada en Ajustes).

- Busca la keyword en Google (top 100 resultados) y localiza tu dominio.
- Muestra el **top 3 de competidores**, si incluyen la keyword en el título, "**Preguntas que la gente también busca**" y **búsquedas relacionadas** — todo pensado para generar ideas de contenido.
- Da **consejos accionables distintos según tu posición** (no encontrado / página 2+ / top 10 / top 3).
- Opcionalmente lanza un **análisis competitivo**: compara tu página contra el top 3 en palabras, H2, imágenes, keyword en título/H1, schema markup, Open Graph y velocidad — y te dice qué te falta frente a ellos. Detecta si tu página es una SPA (React/Vue sin SSR) y avisa de que esos datos no son fiables.

---

## 🚀 PageSpeed & Core Web Vitals

Usa la API oficial de Google PageSpeed Insights para traer métricas **reales** de Lighthouse (no estimaciones propias):

- Puntuaciones de Performance, Accesibilidad, Buenas Prácticas y SEO.
- Core Web Vitals: FCP, LCP, TBT, CLS, Speed Index, TTI.
- Las 6 principales oportunidades de mejora (imágenes sin optimizar, JS/CSS sin usar, compresión, etc.).
- Puedes analizar mobile, desktop, o ambos.

---

## 📊 Comparar URLs

Audita dos URLs a la vez (en paralelo) y las pone lado a lado: score global, desglose por categoría con el "ganador" de cada una, y los principales problemas de cada página. Útil para compararte directamente con un competidor concreto.

---

## 📦 Análisis en Lote

Audita varias URLs de una sola vez a partir de un archivo de texto (una URL por línea, máximo 30). Analiza cada una, la guarda en el historial, y al final muestra una tabla resumen (score, críticos, avisos) exportable a CSV. Pensado para cuando gestionas varias páginas o clientes y no quieres repetir el flujo manual una por una.

---

## 📋 Historial

Guarda tus últimos 20 análisis (deduplicados por URL) en `~/.serpscan/history.json`. Muestra un resumen de los 3 más recientes y una tabla completa; puedes reanalizar cualquier URL del historial con un clic.

---

## 🔧 Ajustes

Configura y persiste (en `~/.serpscan/config.json`):
- **Clave SerpAPI** — necesaria para el posicionamiento en Google.
- **Clave Google API** — opcional, aumenta los límites de PageSpeed.
- **URL por defecto** — se autocompleta en los prompts.
- **Idioma** — español o inglés.
- Opción de borrar todos los ajustes.

Como alternativa más segura a guardar las claves en disco, también puedes definirlas como variables de entorno: `SERPSCAN_SERP_API_KEY` y `SERPSCAN_GOOGLE_API_KEY` (tienen prioridad sobre el archivo de config).

---

## Windows

En Windows Terminal o en la terminal integrada de VS Code los iconos se ven perfectos. En la consola clásica (`cmd.exe` o PowerShell fuera de Windows Terminal), SerpScan detecta automáticamente que faltan fuentes de emoji y usa símbolos ASCII en su lugar (`>`, `[OK]`, `[!]`...) — no hace falta configurar nada. Si aun así prefieres forzar un modo u otro:

```bash
set SERPSCAN_NO_EMOJI=1     # forzar símbolos ASCII
set SERPSCAN_FORCE_EMOJI=1  # forzar emoji aunque no se detecten
```

---

## Desarrollo

```bash
npm test      # ejecuta los tests (vitest)
npm run lint  # eslint
npm run format # prettier
```
