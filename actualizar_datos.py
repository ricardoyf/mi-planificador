import os
import json
from pathlib import Path
from openpyxl import load_workbook

BASE = Path(__file__).resolve().parent
PLATOS_EDITABLE_PATH = BASE / 'base_platos_editable.xlsx'
LEGACY_EXCEL_PATH = BASE / 'platos_ingredientes.xlsx'
RECIPES_DIR = BASE / 'Recipes'
DATA_JS = BASE / 'js' / 'data.js'

def main():
    print("Iniciando actualización de datos para la Web App...")
    
    # Load Excel
    excel_path = PLATOS_EDITABLE_PATH if PLATOS_EDITABLE_PATH.exists() else LEGACY_EXCEL_PATH
    platos = []
    
    if excel_path.exists():
        print(f"Leyendo base de platos desde: {excel_path.name}")
        wb = load_workbook(excel_path, data_only=True)
        ws = wb['Platos'] if 'Platos' in wb.sheetnames else wb.active
        encabezados = [str(c.value).strip().lower() if c.value is not None else '' for c in ws[1]]
        idx_plato = encabezados.index('plato') if 'plato' in encabezados else 0
        idx_categoria = encabezados.index('categoria') if 'categoria' in encabezados else 1
        
        for row in ws.iter_rows(min_row=2, values_only=True):
            if not row or idx_plato >= len(row) or not row[idx_plato]:
                continue
            nombre = str(row[idx_plato]).strip()
            categoria = str(row[idx_categoria]).strip() if idx_categoria < len(row) and row[idx_categoria] else 'Sin categoría'
            platos.append({
                'plato': nombre,
                'categoria': categoria
            })
    else:
        print("Advertencia: No se encontró ningún archivo Excel de platos.")

    # Read Recipes
    recetas = []
    if RECIPES_DIR.exists():
        for f in os.listdir(RECIPES_DIR):
            if f.endswith('.html'):
                nombre_receta = f[:-5]
                recetas.append({
                    'nombre': nombre_receta,
                    'url': f'Recipes/{f}'
                })
        # Ordenar alfabéticamente
        recetas.sort(key=lambda x: x['nombre'].lower())
        print(f"Se han encontrado {len(recetas)} recetas en la carpeta Recipes.")
    
    # Match plates to recipes
    recetas_lower = {r['nombre'].lower(): r['url'] for r in recetas}
    for p in platos:
        nombre_lower = p['plato'].lower()
        if nombre_lower in recetas_lower:
            p['url_receta'] = recetas_lower[nombre_lower]
            
    # Write to data.js
    DATA_JS.parent.mkdir(exist_ok=True)
    js_content = f"const platosData = {json.dumps(platos, ensure_ascii=False, indent=2)};\n"
    js_content += f"const recetasData = {json.dumps(recetas, ensure_ascii=False, indent=2)};\n"
    
    DATA_JS.write_text(js_content, encoding='utf-8')
    print(f"✅ Se han exportado {len(platos)} platos extraídos de tu Excel.")
    print(f"✅ Datos guardados correctamente en {DATA_JS}")
    print("--------------------------------------------------")
    print("Sube los cambios a GitHub para actualizar la web.")

if __name__ == '__main__':
    main()
