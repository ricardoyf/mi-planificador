import base64
import json
import re
import sys
from pathlib import Path


BASE = Path(__file__).resolve().parents[1]
STANDALONE_DIR = BASE / "standalone"


def get_version_dir(requested=None):
    STANDALONE_DIR.mkdir(exist_ok=True)
    if requested:
        if not re.fullmatch(r"v\d+", requested):
            raise SystemExit("La versión debe tener formato vN, por ejemplo v2.")
        return int(requested[1:]), STANDALONE_DIR / requested

    existing = []
    for path in STANDALONE_DIR.iterdir():
        if path.is_dir() and re.fullmatch(r"v\d+", path.name):
            existing.append(int(path.name[1:]))
    version = max(existing, default=0) + 1
    return version, STANDALONE_DIR / f"v{version}"


def main():
    requested_version = sys.argv[1] if len(sys.argv) > 1 else None
    index = (BASE / "index.html").read_text(encoding="utf-8")
    css = (BASE / "css" / "styles.css").read_text(encoding="utf-8")
    data_js = (BASE / "js" / "data.js").read_text(encoding="utf-8")
    app_js = (BASE / "js" / "app.js").read_text(encoding="utf-8")
    data_js = data_js.replace("</script", "<\\/script")
    app_js = app_js.replace("</script", "<\\/script")

    recipes = {}
    for recipe_path in sorted((BASE / "Recipes").glob("*.html")):
        key = f"Recipes/{recipe_path.name}"
        recipes[key] = recipe_path.read_text(encoding="utf-8", errors="ignore")

    version_num, out_dir = get_version_dir(requested_version)
    out_dir.mkdir(parents=True, exist_ok=True)
    version = f"v{version_num}"

    html = re.sub(
        r'\s*<link rel="stylesheet" href="css/styles.css">\s*',
        lambda _m: f"\n    <style>\n{css}\n    </style>\n",
        index,
    )
    html = re.sub(
        r'\s*<script src="js/data.js\?v=[^"]+"></script>\s*',
        lambda _m: f"\n    <script>\n{data_js}\n    </script>\n",
        html,
    )
    html = re.sub(
        r'\s*<script src="js/app.js\?v=[^"]+"></script>\s*',
        lambda _m: f"\n    <script>\n{app_js}\n    </script>\n",
        html,
    )

    recipes_json = json.dumps(recipes, ensure_ascii=False)
    recipes_b64 = base64.b64encode(recipes_json.encode("utf-8")).decode("ascii")
    standalone_script = f"""
    <script>
window.STANDALONE_VERSION = "{version}";
window.STANDALONE_RECIPES = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob("{recipes_b64}"), c => c.charCodeAt(0))));
    </script>
    <script>
(function () {{
    const recipeBlobs = new Map();

    function recipeUrl(path) {{
        const html = window.STANDALONE_RECIPES && window.STANDALONE_RECIPES[path];
        if (!html) return null;
        if (!recipeBlobs.has(path)) {{
            recipeBlobs.set(path, URL.createObjectURL(new Blob([html], {{ type: "text/html;charset=utf-8" }})));
        }}
        return recipeBlobs.get(path);
    }}

    function openStandaloneRecipe(path) {{
        const url = recipeUrl(path);
        if (!url) {{
            alert("Esta receta no está incrustada en el standalone.");
            return;
        }}
        window.open(url, "_blank");
    }}

    document.addEventListener("click", function (event) {{
        const link = event.target.closest && event.target.closest('a[href^="Recipes/"]');
        if (!link) return;
        event.preventDefault();
        openStandaloneRecipe(link.getAttribute("href"));
    }});

    if (window.app) {{
        const originalRenderRecetario = app.renderRecetario.bind(app);
        app.renderRecetario = function (filter = "") {{
            originalRenderRecetario(filter);
            document.querySelectorAll('a.receta-link-item[href^="Recipes/"]').forEach(link => {{
                link.removeAttribute("target");
                link.title = "Abrir receta incrustada en este standalone";
            }});
        }};

        app.openRecipeForDish = function (name) {{
            const recipePath = app.findRecipeUrlForDish ? app.findRecipeUrlForDish(name) : null;
            if (!recipePath) {{
                alert("Ese plato no tiene receta enlazada.");
                return;
            }}
            openStandaloneRecipe(recipePath);
        }};
    }}
}}());
    </script>
"""
    body_close = html.rfind("</body>")
    if body_close == -1:
        raise SystemExit("No se encontró </body> en index.html.")
    html = html[:body_close] + standalone_script + "\n" + html[body_close:]

    out_file = out_dir / f"mi-planificador-standalone-{version}.html"
    out_file.write_text(html, encoding="utf-8")
    (out_dir / "README.md").write_text(
        f"# mi-planificador standalone {version}\n\n"
        "Archivo principal:\n\n"
        f"- `mi-planificador-standalone-{version}.html`\n\n"
        f"Incluye `index.html`, `css/styles.css`, `js/data.js`, `js/app.js` y {len(recipes)} recetas HTML incrustadas.\n\n"
        "Uso: abrir el HTML directamente en el navegador.\n",
        encoding="utf-8",
    )
    print(out_file)


if __name__ == "__main__":
    main()
