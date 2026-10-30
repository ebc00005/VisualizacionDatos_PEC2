# Sunburst PEC 2 — Exploración espacial

## Archivos
- `index.html`: estructura de la página.
- `style.css`: estilo compartido con el árbol hiperbólico.
- `main.js`: construcción e interacción del Sunburst.
- `datos_sunburst.json`: datos exportados desde Jupyter (debes generarlo).

## Generar el JSON desde Jupyter

Cuando `datos_sunburst` esté creado, ejecuta esta celda en el mismo notebook:

```python
import json

datos_exportar = datos_sunburst[["familia", "destino", "short_name", "name", "mision"]].copy()

with open("datos_sunburst.json", "w", encoding="utf-8") as archivo:
    json.dump(
        datos_exportar.to_dict(orient="records"),
        archivo,
        ensure_ascii=False,
        indent=2
    )

print("datos_sunburst.json generado")
```

Copia `datos_sunburst.json` a la misma carpeta que `index.html`, `style.css` y `main.js`.

## Probar en local
No abras `index.html` haciendo doble clic si el navegador bloquea la carga del JSON local. Desde esa carpeta, ejecuta:

```bash
python -m http.server 8000
```

Abre `http://localhost:8000`.

## Publicar en GitHub Pages
Sube los cuatro archivos al mismo directorio del repositorio publicado y habilita GitHub Pages como en tus otras visualizaciones. Plotly se carga desde CDN, por lo que la página necesita conexión a internet para cargar la biblioteca.
