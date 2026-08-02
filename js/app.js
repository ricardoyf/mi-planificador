const DIAS = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
const DIAS_LABEL = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const TIPOS = ['comida', 'cena'];
const SLOTS = ['primero', 'segundo'];

const app = {
    plan: {},
    selectedPlato: null,
    pendingSlot: null,
    weekOptions: [],
    currentWeekKey: null,
    storagePrefix: 'plan_week_',
    compraStoragePrefix: 'compra_week_',
    compraOverridesPrefix: 'compra_overrides_week_',
    currentWeekStorageKey: 'plan_current_week',
    compraChecked: {},
    slotAction: null,
    shoppingAction: null,
    importMode: 'week',
    
    init() {
        this.setupWeekOptions();
        this.restoreCurrentWeekKey();
        this.loadCurrentWeekPlan();
        this.renderPlatos();
        this.renderRecetario();
        this.renderXls();
        this.renderCompacta();
        this.setupEventListeners();
    },

    getEmptyPlan() {
        const p = {};
        DIAS.forEach(d => {
            p[d] = {
                comida: { primero: '', segundo: '' },
                cena: { primero: '', segundo: '' }
            };
        });
        return p;
    },

    setupWeekOptions() {
        const baseMonday = this.getMondayForDate(new Date());
        this.rebuildWeekOptionsAround(baseMonday);
        this.currentWeekKey = this.buildWeekOptionFromMonday(baseMonday).key;
    },

    getHistoryWeeks() {
        return (typeof planHistoryData !== 'undefined' && Array.isArray(planHistoryData.weeks)) ? planHistoryData.weeks : [];
    },

    getHistorySlots() {
        return (typeof planHistoryData !== 'undefined' && Array.isArray(planHistoryData.slots)) ? planHistoryData.slots : [];
    },

    getMondayForDate(dateInput) {
        const date = new Date(dateInput);
        date.setHours(0,0,0,0);
        const jsDay = date.getDay();
        const mondayOffset = jsDay === 0 ? -6 : 1 - jsDay;
        date.setDate(date.getDate() + mondayOffset);
        return date;
    },

    formatDateInputValue(dateInput) {
        const d = new Date(dateInput);
        const pad = n => n.toString().padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
    },

    getTodayDateKey() {
        return this.formatDateInputValue(new Date());
    },

    rebuildWeekOptionsAround(centerMondayInput) {
        const centerMonday = this.getMondayForDate(centerMondayInput);
        const generated = Array.from({ length: 53 }, (_, offset) => {
            const delta = offset - 26;
            return this.buildWeekOptionFromMonday(this.addDays(centerMonday, delta * 7));
        });
        const historic = this.getHistoryWeeks().map(w => this.buildWeekOptionFromHistoryWeek(w));
        this.weekOptions = this.mergeWeekOptions(generated.concat(historic));
    },

    ensureWeekOptionForMonday(mondayInput) {
        const monday = this.getMondayForDate(mondayInput);
        const option = this.buildWeekOptionFromMonday(monday);
        if (!this.weekOptions.some(w => w.key === option.key)) {
            this.rebuildWeekOptionsAround(monday);
        }
        return option;
    },

    addDays(date, days) {
        const d = new Date(date);
        d.setDate(d.getDate() + days);
        return d;
    },

    buildWeekOptionFromMonday(mondayInput) {
        const monday = new Date(mondayInput);
        monday.setHours(0,0,0,0);
        const sunday = this.addDays(monday, 6);
        const pad = n => n.toString().padStart(2, '0');
        const key = `plan${pad(monday.getDate())}_${pad(monday.getMonth()+1)}-${pad(sunday.getDate())}_${pad(sunday.getMonth()+1)}`;
        return {
            key,
            label: `Semana ${pad(monday.getDate())}/${pad(monday.getMonth()+1)}/${monday.getFullYear()} - ${pad(sunday.getDate())}/${pad(sunday.getMonth()+1)}/${sunday.getFullYear()}`,
            summary: `${pad(monday.getDate())}/${pad(monday.getMonth()+1)} → ${pad(sunday.getDate())}/${pad(sunday.getMonth()+1)}`,
            monday,
            sunday
        };
    },

    buildWeekOptionFromHistoryWeek(week) {
        const monday = this.getMondayForDate(`${week.mondayDate}T12:00:00`);
        const option = this.buildWeekOptionFromMonday(monday);
        return {
            ...option,
            label: `Semana ${week.label || option.summary}`,
            historyWeekId: week.id || week.mondayDate,
            mondayDate: week.mondayDate,
            sundayDate: week.sundayDate
        };
    },

    mergeWeekOptions(options) {
        const byKey = new Map();
        options.forEach(option => {
            const existing = byKey.get(option.key);
            if (!existing || option.historyWeekId) {
                byKey.set(option.key, option);
            }
        });
        return Array.from(byKey.values()).sort((a, b) => a.monday - b.monday);
    },

    parseWeekKey(key) {
        const match = /^plan(\d{2})_(\d{2})-(\d{2})_(\d{2})$/.exec(key || '');
        if (!match) return null;
        const [, sd, sm, ed, em] = match.map(Number);
        const currentYear = new Date().getFullYear();
        for (let year = currentYear - 2; year <= currentYear + 2; year++) {
            const monday = new Date(year, sm - 1, sd);
            monday.setHours(0,0,0,0);
            if (monday.getDay() !== 1) continue;
            const sunday = this.addDays(monday, 6);
            if (sunday.getDate() === ed && (sunday.getMonth() + 1) === em) {
                return monday;
            }
        }
        return null;
    },

    getWeekOption(key = this.currentWeekKey) {
        let option = this.weekOptions.find(w => w.key === key);
        if (!option) {
            const monday = this.parseWeekKey(key);
            if (monday) {
                option = this.ensureWeekOptionForMonday(monday);
            }
        }
        return option || this.weekOptions[26] || this.weekOptions[0];
    },

    getStorageKeyForWeek(key = this.currentWeekKey) {
        return `${this.storagePrefix}${key}`;
    },

    readPlanForWeek(key = this.currentWeekKey) {
        try {
            const data = localStorage.getItem(this.getStorageKeyForWeek(key));
            if (data) {
                const parsed = JSON.parse(data);
                if (!parsed['lunes'] || !parsed['lunes']['comida']) throw new Error('Estructura corrupta');
                return parsed;
            }
            const legacyBase = localStorage.getItem('plan_base');
            if (legacyBase && key === this.weekOptions[0]?.key) {
                const parsed = JSON.parse(legacyBase);
                if (!parsed['lunes'] || !parsed['lunes']['comida']) throw new Error('Estructura corrupta');
                return parsed;
            }
            return this.getSeedPlanForWeek(key) || this.getEmptyPlan();
        } catch (e) {
            console.error('Plan semanal corrupto, reseteando', key, e);
            return this.getEmptyPlan();
        }
    },

    savePlanForWeek(key, plan) {
        localStorage.setItem(this.getStorageKeyForWeek(key), JSON.stringify(plan));
        if (key === this.currentWeekKey) {
            localStorage.setItem('plan_base', JSON.stringify(plan));
        }
    },

    getSeedPlanForWeek(key = this.currentWeekKey) {
        const option = this.getWeekOption(key);
        if (!option || !option.historyWeekId) return null;
        const plan = this.getEmptyPlan();
        let hasData = false;
        this.getHistorySlots()
            .filter(slot => slot.weekId === option.historyWeekId)
            .forEach(slot => {
                const dayIndex = Number.isInteger(slot.dayIndex) ? slot.dayIndex : DIAS.indexOf(this.dayKeyForDate(slot.date));
                const dia = DIAS[dayIndex];
                const tipo = slot.mealType;
                if (!dia || !plan[dia] || !plan[dia][tipo]) return;
                plan[dia][tipo].primero = slot.firstText || '';
                plan[dia][tipo].segundo = slot.secondText || '';
                if (slot.firstText || slot.secondText) hasData = true;
            });
        return hasData ? plan : null;
    },

    dayKeyForDate(dateText) {
        const d = new Date(`${dateText}T12:00:00`);
        const index = d.getDay() === 0 ? 6 : d.getDay() - 1;
        return DIAS[index];
    },

    getCompraStorageKeyForWeek(key = this.currentWeekKey) {
        return `${this.compraStoragePrefix}${key}`;
    },

    restoreCurrentWeekKey() {
        const hashKey = window.location.hash ? window.location.hash.replace(/^#/, '') : '';
        if (!hashKey) return;
        if (!this.weekOptions.some(w => w.key === hashKey)) {
            const monday = this.parseWeekKey(hashKey);
            if (monday) {
                this.rebuildWeekOptionsAround(monday);
            }
        }
        if (this.weekOptions.some(w => w.key === hashKey)) {
            this.currentWeekKey = hashKey;
        }
    },

    persistCurrentWeekKey() {
        if (this.currentWeekKey) {
            history.replaceState(null, '', `#${this.currentWeekKey}`);
        }
    },

    getDayDateLabel(dia, key = this.currentWeekKey) {
        const week = this.getWeekOption(key);
        const index = DIAS.indexOf(dia);
        const d = new Date(week.monday);
        d.setDate(week.monday.getDate() + index);
        const pad = n => n.toString().padStart(2, '0');
        return `${pad(d.getDate())}/${pad(d.getMonth()+1)}`;
    },

    renderWeekSelector() {
        const select = document.getElementById('week-select');
        const summary = document.getElementById('week-summary');
        const dateInput = document.getElementById('week-date-input');
        if (!select) return;
        select.innerHTML = this.weekOptions.map(w => `<option value="${w.key}">${w.label}</option>`).join('');
        select.value = this.currentWeekKey;
        const current = this.getWeekOption();
        if (dateInput && current) {
            dateInput.value = this.formatDateInputValue(current.monday);
        }
        if (summary) {
            summary.textContent = `${current.label} · JSON: ${current.key}.json`;
        }
    },

    switchToWeekByMonday(mondayInput) {
        this.autosaveCurrentWeek();
        const option = this.ensureWeekOptionForMonday(mondayInput);
        this.currentWeekKey = option.key;
        this.loadCurrentWeekPlan();
    },

    moveWeek(deltaWeeks) {
        const current = this.getWeekOption();
        this.switchToWeekByMonday(this.addDays(current.monday, deltaWeeks * 7));
    },

    switchToDate(dateValue) {
        if (!dateValue) return;
        const selected = new Date(`${dateValue}T00:00:00`);
        if (Number.isNaN(selected.getTime())) return;
        this.switchToWeekByMonday(this.getMondayForDate(selected));
    },

    loadPlan(name) {
        try {
            const data = localStorage.getItem(`plan_${name}`);
            if(data) {
                this.plan = JSON.parse(data);
                // Validar estructura básica
                if (!this.plan['lunes'] || !this.plan['lunes']['comida']) throw new Error("Estructura corrupta");
            } else {
                this.plan = this.getEmptyPlan();
            }
        } catch(e) {
            console.error("Plan corrupto, reseteando", e);
            this.plan = this.getEmptyPlan();
        }
        this.renderWeekSelector();
        this.renderPlanificador();
        this.renderCompacta();
    },

    loadCurrentWeekPlan() {
        this.plan = this.readPlanForWeek(this.currentWeekKey);
        this.loadCompraStateForCurrentWeek();
        this.persistCurrentWeekKey();
        this.renderWeekSelector();
        this.renderPlanificador();
        this.renderCompacta();
    },

    autosaveCurrentWeek() {
        this.savePlanForWeek(this.currentWeekKey, this.plan);
        this.persistCurrentWeekKey();
    },

    loadCompraStateForCurrentWeek() {
        try {
            const data = localStorage.getItem(this.getCompraStorageKeyForWeek());
            this.compraChecked = data ? JSON.parse(data) : {};
        } catch (e) {
            console.error('Estado de compra corrupto, reseteando', e);
            this.compraChecked = {};
        }
    },

    autosaveCompraState() {
        localStorage.setItem(this.getCompraStorageKeyForWeek(), JSON.stringify(this.compraChecked || {}));
    },

    getCompraOverridesKeyForWeek() {
        return `${this.compraOverridesPrefix}${this.getWeekFileBase()}`;
    },

    getCompraOverrides() {
        try {
            const parsed = JSON.parse(localStorage.getItem(this.getCompraOverridesKeyForWeek()) || '{}');
            if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
            if (!Array.isArray(parsed._manual)) parsed._manual = [];
            return parsed;
        } catch (_e) {
            return { _manual: [] };
        }
    },

    setCompraOverrides(overrides) {
        localStorage.setItem(this.getCompraOverridesKeyForWeek(), JSON.stringify(overrides || {}));
    },

    normalizeCompraKey(text) {
        return String(text || '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '') || 'ingrediente';
    },

    hiddenRecipeCategoryKeys: new Set(['macu', 'findesemana', 'fin-de-semana', 'finde-semana']),

    compraCanonicalMap: {
        berenjenas: 'Berenjena',
        patatas: 'Patata',
        puerros: 'Puerro',
        tomates: 'Tomate',
        zanahorias: 'Zanahoria'
    },

    categoryParts(item) {
        return String(item && item.categoria ? item.categoria : '')
            .split(',')
            .map(c => c.trim())
            .filter(Boolean);
    },

    visibleCategoryParts(item) {
        return this.categoryParts(item).filter(cat => !this.hiddenRecipeCategoryKeys.has(this.normalizeCompraKey(cat)));
    },

    isHiddenRecipe(item) {
        return !!(item && item.oculta_recetario) || this.visibleCategoryParts(item).length === 0;
    },

    displayCategory(item) {
        return this.visibleCategoryParts(item).join(', ') || 'Sin categoría';
    },

    canonicalCompraText(text) {
        const clean = String(text || '').replace(/\s+/g, ' ').trim();
        if (!clean) return '';
        const key = this.normalizeMatchText(clean).replace(/\s+/g, ' ');
        return this.compraCanonicalMap[key] || clean;
    },

    getVisibleDishRows(options = {}) {
        const byName = new Map();
        this.getAllPlatos().forEach(p => {
            if (!options.includeHidden && this.isHiddenRecipe(p)) return;
            if (options.onlyExcel && !p.en_excel) return;
            const key = this.normalizeMatchText(p.plato);
            const existing = byName.get(key);
            if (!existing || (p.en_excel && !existing.en_excel) || (p.url_receta && !existing.url_receta)) {
                byName.set(key, p);
            }
        });
        return Array.from(byName.values());
    },

    getLocalPlatos() {
        try {
            const parsed = JSON.parse(localStorage.getItem('pcv84_local_platos') || '[]');
            return Array.isArray(parsed) ? parsed : [];
        } catch (_e) {
            return [];
        }
    },

    setLocalPlatos(platos) {
        localStorage.setItem('pcv84_local_platos', JSON.stringify(platos || []));
    },

    getAllPlatos() {
        return (platosData || []).concat(this.getLocalPlatos());
    },

    getCompraItemId(ingrediente) {
        return `ing_${this.normalizeCompraKey(ingrediente)}`;
    },

    escapeHtml(text) {
        return String(text ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    },

    getVisibleCompraChecked() {
        const conteo = this.getCompraConteo();
        return Object.keys(conteo).sort().reduce((acc, ing) => {
            const id = this.getCompraItemId(ing);
            if (this.compraChecked && this.compraChecked[id]) {
                acc[id] = true;
            }
            return acc;
        }, {});
    },

    buildJsonPayload(tipo = 'base') {
        return {
            ...this.plan,
            _meta: {
                tipo,
                nombre: this.getWeekFileBase(),
                version: 2,
                incluyeEstadoCompra: true
            },
            _compra: {
                checked: this.getVisibleCompraChecked(),
                updatedAt: new Date().toISOString()
            }
        };
    },

    getWeekFileBase() {
        return this.currentWeekKey || this.getWeekOption().key;
    },

    downloadJson(filename, payload) {
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },

    savePlan(name) {
        localStorage.setItem(`plan_${name}`, JSON.stringify(this.plan));
        if (name === 'base') {
            const payload = this.buildJsonPayload('base');
            this.downloadJson(`${this.getWeekFileBase()}.json`, payload);
            alert(`BASE guardada y descargada como ${this.getWeekFileBase()}.json`);
        } else {
            alert(`Plan guardado localmente como ${name.toUpperCase()}`);
        }
    },

    action(type, name) {
        if(type === 'load') this.loadPlan(name);
        if(type === 'save') this.savePlan(name);
        document.getElementById('dropdown-menu').classList.add('hidden');
    },

    savePlanAsJson() {
        localStorage.setItem('plan_base', JSON.stringify(this.plan));
        this.autosaveCompraState();
        const payload = this.buildJsonPayload('base');
        this.downloadJson(`${this.getWeekFileBase()}.json`, payload);
        alert(`JSON descargado como ${this.getWeekFileBase()}.json`);
        document.getElementById('dropdown-menu').classList.add('hidden');
    },

    loadJsonFile() {
        this.chooseImportFile('week');
    },

    chooseImportFile(mode = 'week') {
        this.importMode = mode;
        const input = document.getElementById('json-file-input');
        if (!input) return;
        input.value = '';
        input.click();
        document.getElementById('dropdown-menu').classList.add('hidden');
    },

    exportRecipesJson() {
        const payload = {
            version: 'v8.4-web',
            exportedAt: new Date().toISOString(),
            platosData: this.getAllPlatos(),
            recetasData: recetasData || []
        };
        this.downloadJson('recetario_plancomidas_v8_4.json', payload);
        document.getElementById('dropdown-menu').classList.add('hidden');
    },

    importSelectedFile(file) {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            const text = String(reader.result || '');
            if (this.importMode === 'recipes') {
                this.importRecipesJson(text);
            } else if (this.importMode === 'html') {
                this.importRecipeHtmlText(text, file.name);
            } else if (this.importMode === 'txt') {
                this.importRecipePlainText(text, file.name);
            } else {
                this.importJsonText(text);
            }
        };
        reader.readAsText(file);
    },

    importJsonFile(file) {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            this.importJsonText(String(reader.result || ''));
        };
        reader.readAsText(file);
    },

    importJsonText(text) {
        try {
            const parsed = JSON.parse(text);
            if (!parsed['lunes'] || !parsed['lunes']['comida']) throw new Error('Estructura no válida');
            const importedCompra = parsed._compra && parsed._compra.checked ? parsed._compra.checked : {};
            this.plan = parsed;
            delete this.plan._meta;
            delete this.plan._compra;
            this.compraChecked = importedCompra;
            this.autosaveCurrentWeek();
            this.autosaveCompraState();
            this.renderPlanificador();
            this.renderCompacta();
            alert('JSON cargado correctamente');
        } catch (e) {
            alert('No se pudo cargar el JSON');
            console.error(e);
        }
    },

    importRecipesJson(text) {
        try {
            const parsed = JSON.parse(text);
            const imported = parsed.platosData || parsed.platos || [];
            if (!Array.isArray(imported)) throw new Error('Recetario no válido');
            const local = this.getLocalPlatos();
            const byName = new Map(local.map(p => [this.normalizeMatchText(p.plato), p]));
            imported.forEach(p => {
                if (!p || !p.plato) return;
                const shopping = Array.isArray(p.ingredientes) && p.ingredientes.length ? p.ingredientes :
                    Array.isArray(p.listaCompra) && p.listaCompra.length ? p.listaCompra :
                    Array.isArray(p.shoppingIngredients) ? p.shoppingIngredients : [];
                byName.set(this.normalizeMatchText(p.plato), {
                    plato: p.plato,
                    categoria: p.categoria || 'Sin categoría',
                    ingredientes: shopping,
                    url_receta: p.url_receta || '',
                    oculta_recetario: !!p.oculta_recetario,
                    en_excel: !!p.en_excel || shopping.length > 0
                });
            });
            this.setLocalPlatos(Array.from(byName.values()));
            this.renderRecetario();
            this.renderCompacta();
            alert('Recetario importado en este navegador.');
        } catch (e) {
            alert('No se pudo importar el recetario.');
            console.error(e);
        }
    },

    importRecipeHtmlText(text, filename = 'receta.html') {
        const doc = new DOMParser().parseFromString(text, 'text/html');
        const name = doc.querySelector('.name, [itemprop="name"], h1')?.textContent?.trim() || filename.replace(/\.(html?|txt)$/i, '');
        const category = doc.querySelector('.categories, [itemprop="recipeCategory"]')?.textContent?.trim() || 'Sin categoría';
        const ingredients = Array.from(doc.querySelectorAll('[itemprop="recipeIngredient"], .ingredients .line'))
            .map(el => el.textContent.trim())
            .filter(Boolean);
        this.addLocalRecipePlate({ plato: name, categoria: category, ingredientes, en_excel: false });
        alert('Receta HTML importada en este navegador.');
    },

    importRecipePlainText(text, filename = 'receta.txt') {
        const lines = String(text || '').split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        const name = lines[0] || filename.replace(/\.(html?|txt)$/i, '');
        const ingStart = lines.findIndex(l => /^ingredientes:?$/i.test(l));
        const nextSection = ingStart >= 0 ? lines.findIndex((l, i) => i > ingStart && /^(instrucciones|preparaci[oó]n|notas):?$/i.test(l)) : -1;
        const ingredients = ingStart >= 0
            ? lines.slice(ingStart + 1, nextSection > ingStart ? nextSection : undefined)
            : [];
        this.addLocalRecipePlate({ plato: name, categoria: 'Sin categoría', ingredientes, en_excel: false });
        alert('Receta TXT importada en este navegador.');
    },

    addLocalRecipePlate(plate) {
        const local = this.getLocalPlatos();
        const key = this.normalizeMatchText(plate.plato);
        const next = local.filter(p => this.normalizeMatchText(p.plato) !== key);
        next.push({
            ...plate,
            oculta_recetario: this.isHiddenRecipe(plate),
            local_import: true
        });
        this.setLocalPlatos(next);
        this.renderRecetario();
        this.renderCompacta();
    },

    renderPlanificador() {
        const container = document.getElementById('days-container');
        if (!container) return;
        container.innerHTML = '';
        
        DIAS.forEach((dia, idx) => {
            const card = document.createElement('div');
            card.className = 'day-card';
            
            const header = document.createElement('div');
            header.className = 'day-header';
            header.innerHTML = `<span>${DIAS_LABEL[idx]}</span><span class="day-date">${this.getDayDateLabel(dia)}</span>`;
            card.appendChild(header);
            
            TIPOS.forEach(tipo => {
                const section = document.createElement('div');
                section.className = 'meal-section';
                
                const title = document.createElement('div');
                title.className = 'meal-title';
                title.textContent = tipo;
                section.appendChild(title);
                
                const slots = document.createElement('div');
                slots.className = 'slots-container';
                
                SLOTS.forEach(slot => {
                    const slotDiv = document.createElement('div');
                    slotDiv.className = 'slot';
                    const s = slot === 'primero' ? '1º Plato' : '2º Plato';
                    
                    const pName = (this.plan[dia] && this.plan[dia][tipo] && this.plan[dia][tipo][slot]) || '-';
                    
                    slotDiv.innerHTML = `
                        <div class="slot-label">${s}</div>
                        <div class="slot-value">${pName}</div>
                    `;
                    
                    // Interaction
                    let pressTimer = null;
                    let longPressTriggered = false;
                    let pressStartX = 0;
                    let pressStartY = 0;
                    const actual = () => (this.plan[dia] && this.plan[dia][tipo] && this.plan[dia][tipo][slot]) || '';

                    const clearPressTimer = () => {
                        if (pressTimer) {
                            clearTimeout(pressTimer);
                            pressTimer = null;
                        }
                    };

                    const startPress = (event) => {
                        clearPressTimer();
                        longPressTriggered = false;
                        const point = event.touches ? event.touches[0] : event;
                        pressStartX = point?.clientX || 0;
                        pressStartY = point?.clientY || 0;
                        pressTimer = setTimeout(() => {
                            const currentDish = actual();
                            if (currentDish) {
                                longPressTriggered = true;
                                this.openRecipeForDish(currentDish);
                            }
                            clearPressTimer();
                        }, 650);
                    };

                    const maybeCancelByMove = (event) => {
                        const point = event.touches ? event.touches[0] : event;
                        const x = point?.clientX || 0;
                        const y = point?.clientY || 0;
                        if (Math.abs(x - pressStartX) > 10 || Math.abs(y - pressStartY) > 10) {
                            clearPressTimer();
                        }
                    };

                    const endPress = (event) => {
                        clearPressTimer();
                        if (longPressTriggered) {
                            event.preventDefault();
                            event.stopPropagation();
                            longPressTriggered = false;
                            return;
                        }
                    };

                    slotDiv.addEventListener('pointerdown', startPress);
                    slotDiv.addEventListener('pointermove', maybeCancelByMove);
                    slotDiv.addEventListener('pointerup', endPress);
                    slotDiv.addEventListener('click', (event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        if (!longPressTriggered) {
                            this.assignSlot(dia, tipo, slot);
                        }
                    });
                    slotDiv.addEventListener('pointerleave', clearPressTimer);
                    slotDiv.addEventListener('pointercancel', clearPressTimer);
                    
                    slots.appendChild(slotDiv);
                });
                
                section.appendChild(slots);
                card.appendChild(section);
            });
            
            container.appendChild(card);
        });
    },

    renderDishList(containerId, filter = '', options = {}) {
        const container = document.getElementById(containerId);
        if (!container) return;
        container.innerHTML = '';
        
        const f = this.normalizeMatchText(filter);
        
        const groups = {};
        this.getVisibleDishRows(options).forEach(p => {
            const cat = this.displayCategory(p);
            if (f && !this.normalizeMatchText(p.plato).includes(f) && !this.normalizeMatchText(cat).includes(f)) return;
            if (!groups[cat]) groups[cat] = [];
            groups[cat].push(p);
        });
        
        Object.keys(groups).sort().forEach(cat => {
            const grp = document.createElement('div');
            grp.className = 'categoria-group';
            
            const header = document.createElement('div');
            header.className = 'categoria-header';
            header.innerHTML = `<span>${cat}</span> <span>▼</span>`;
            
            const list = document.createElement('div');
            list.className = 'categoria-list';
            if(!f) list.style.display = 'none';
            
            header.onclick = () => {
                list.style.display = list.style.display === 'none' ? 'block' : 'none';
                header.innerHTML = `<span>${cat}</span> <span>${list.style.display === 'none' ? '▼' : '▲'}</span>`;
            };
            
            groups[cat].sort((a,b) => a.plato.localeCompare(b.plato)).forEach(p => {
                const item = document.createElement('div');
                item.className = 'plato-item';
                item.textContent = p.plato;
                item.onclick = () => this.selectPlato(p.plato);
                list.appendChild(item);
            });
            
            grp.appendChild(header);
            grp.appendChild(list);
            container.appendChild(grp);
        });
    },

    renderPlatos(filter = '') {
        this.renderDishList('platos-container', filter);
    },

    renderXls(filter = '') {
        this.renderDishList('xls-container', filter, { onlyExcel: true });
    },

    renderRecetario(filter = '') {
        const container = document.getElementById('recetas-container');
        if (!container) return;
        container.innerHTML = '';
        const f = this.normalizeMatchText(filter);
        const groups = {};
        this.getVisibleDishRows().forEach(p => {
            const cat = this.displayCategory(p);
            if (f && !this.normalizeMatchText(p.plato).includes(f) && !this.normalizeMatchText(cat).includes(f)) return;
            if (!groups[cat]) groups[cat] = [];
            groups[cat].push(p);
        });

        Object.keys(groups).sort().forEach(cat => {
            const grp = document.createElement('div');
            grp.className = 'categoria-group';

            const header = document.createElement('div');
            header.className = 'categoria-header';
            header.innerHTML = `<span>${cat}</span> <span>▼</span>`;

            const list = document.createElement('div');
            list.className = 'categoria-list';
            if(!f) list.style.display = 'none';

            header.onclick = () => {
                list.style.display = list.style.display === 'none' ? 'block' : 'none';
                header.innerHTML = `<span>${cat}</span> <span>${list.style.display === 'none' ? '▼' : '▲'}</span>`;
            };

            groups[cat].sort((a,b) => a.plato.localeCompare(b.plato)).forEach(p => {
                if (p.url_receta) {
                    const item = document.createElement('a');
                    item.className = 'receta-link-item';
                    item.textContent = p.plato;
                    item.href = p.url_receta;
                    item.target = '_blank';
                    list.appendChild(item);
                } else {
                    const item = document.createElement('button');
                    item.className = 'receta-link-item receta-missing-item';
                    item.type = 'button';
                    item.innerHTML = `<span>${p.plato}</span><span class="receta-missing-badge">Sin receta</span>`;
                    item.onclick = () => alert('Este plato aún no tiene receta HTML creada.');
                    list.appendChild(item);
                }
            });

            grp.appendChild(header);
            grp.appendChild(list);
            container.appendChild(grp);
        });
    },

    normalizeMatchText(value) {
        return (value || '')
            .toString()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .replace(/&/g, ' y ')
            .replace(/[\/,().¿?….-]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    },

    tokenSet(value) {
        const stopwords = new Set(['de', 'del', 'la', 'el', 'los', 'las', 'con', 'y', 'en', 'al', 'a', 'o', 'estilo']);
        return this.normalizeMatchText(value).split(' ').filter(t => t && !stopwords.has(t));
    },

    findRecipeUrlForDish(name) {
        const exactPlate = this.getAllPlatos().find(p => p.plato === name && p.url_receta);
        if (exactPlate) return exactPlate.url_receta;

        const nameNorm = this.normalizeMatchText(name);
        const exactRecipe = recetasData.find(r => this.normalizeMatchText(r.nombre) === nameNorm);
        if (exactRecipe) return exactRecipe.url;

        const nameTokens = this.tokenSet(name);
        let best = null;
        recetasData.forEach(recipe => {
            const recipeTokens = this.tokenSet(recipe.nombre);
            const overlap = nameTokens.filter(t => recipeTokens.includes(t)).length;
            if (!overlap) return;
            const dishCoverage = overlap / Math.max(nameTokens.length, 1);
            const recipeCoverage = overlap / Math.max(recipeTokens.length, 1);
            if (nameTokens.length === 1) {
                const recipeNorm = this.normalizeMatchText(recipe.nombre);
                if (!(nameNorm === recipeNorm || recipeNorm.startsWith(`${nameNorm} `))) return;
            } else if (dishCoverage < 0.75) {
                return;
            }
            const recipeNorm = this.normalizeMatchText(recipe.nombre);
            const subsetBonus = nameNorm && recipeNorm.includes(nameNorm) ? 3 : 0;
            const score = (dishCoverage * 4) + (recipeCoverage * 2) + overlap + subsetBonus;
            if (!best || score > best.score) best = { score, url: recipe.url };
        });
        return best && best.score >= 3 ? best.url : null;
    },
    
    openRecipeForDish(name) {
        const recipePath = this.findRecipeUrlForDish(name);
        if (!recipePath) {
            alert('Ese plato no tiene receta enlazada.');
            return;
        }
        const link = document.createElement('a');
        link.href = recipePath;
        link.target = '_blank';
        link.rel = 'noopener';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    },

    closeSlotActions() {
        const existing = document.getElementById('slot-action-backdrop');
        if (existing) existing.remove();
        this.slotAction = null;
    },

    changeSlotPlato() {
        if (!this.slotAction) return;
        const { dia, tipo, slot } = this.slotAction;
        this.closeSlotActions();
        this.openDishChooser(dia, tipo, slot);
    },

    viewSlotRecipe() {
        if (!this.slotAction) return;
        const { dish } = this.slotAction;
        this.closeSlotActions();
        this.openRecipeForDish(dish);
    },

    showSlotActions(dia, tipo, slot, dish) {
        this.closeSlotActions();
        this.slotAction = { dia, tipo, slot, dish };
        const recipePath = this.findRecipeUrlForDish(dish);

        const backdrop = document.createElement('div');
        backdrop.id = 'slot-action-backdrop';
        backdrop.className = 'slot-action-backdrop';
        backdrop.addEventListener('click', (event) => {
            if (event.target === backdrop) this.closeSlotActions();
        });

        const sheet = document.createElement('div');
        sheet.className = 'slot-action-sheet';

        const title = document.createElement('div');
        title.className = 'slot-action-title';
        title.textContent = dish;

        const buttons = document.createElement('div');
        buttons.className = 'slot-action-buttons';

        const changeBtn = document.createElement('button');
        changeBtn.type = 'button';
        changeBtn.className = 'slot-action-btn primary';
        changeBtn.textContent = 'Cambiar plato';
        changeBtn.addEventListener('click', () => this.changeSlotPlato());

        let recipeAction;
        if (recipePath) {
            recipeAction = document.createElement('a');
            recipeAction.href = recipePath;
            recipeAction.target = '_blank';
            recipeAction.rel = 'noopener';
            recipeAction.className = 'slot-action-btn';
            recipeAction.textContent = 'Ver receta';
            recipeAction.addEventListener('click', () => this.closeSlotActions());
        } else {
            recipeAction = document.createElement('button');
            recipeAction.type = 'button';
            recipeAction.className = 'slot-action-btn disabled';
            recipeAction.textContent = 'Sin receta';
            recipeAction.disabled = true;
        }

        buttons.appendChild(changeBtn);
        buttons.appendChild(recipeAction);
        sheet.appendChild(title);
        sheet.appendChild(buttons);

        backdrop.appendChild(sheet);
        document.body.appendChild(backdrop);
    },

    getCompactaRows() {
        return DIAS.map((dia, idx) => {
            const comida1 = this.plan[dia]?.comida?.primero || '';
            const comida2 = this.plan[dia]?.comida?.segundo || '';
            const cena1 = this.plan[dia]?.cena?.primero || '';
            const cena2 = this.plan[dia]?.cena?.segundo || '';
            const comida = [comida1, comida2].filter(Boolean).join(' ');
            const cena = [cena1, cena2].filter(Boolean).join(' ');
            const dateLabel = this.getDayDateLabel(dia).replace('/', '_');
            const initial = idx === 2 ? 'X' : DIAS_LABEL[idx][0];
            return {
                dia,
                label: `${initial}${dateLabel.split('_')[0]}`,
                comida: comida || '—',
                cena: cena || '—'
            };
        });
    },

    renderCompacta() {
        const view = document.getElementById('view-compacta');
        if (!view) return;
        const current = this.getWeekOption();
        const visibleWeeks = this.getVisibleCompactaWeeks();
        const weekOptions = this.weekOptions.map(w => `<option value="${this.escapeHtml(w.key)}" ${w.key === this.getWeekFileBase() ? 'selected' : ''}>${this.escapeHtml(w.label)}</option>`).join('');
        const weekCards = visibleWeeks
            .map(option => this.renderCompactaWeekSection(option))
            .join('');
        view.innerHTML = `
            <div class="week-nav">
                <button class="btn secondary" type="button" onclick="app.moveWeek(-1)">‹</button>
                <select id="week-select">${weekOptions}</select>
                <button class="btn secondary" type="button" onclick="app.moveWeek(1)">›</button>
            </div>
            <div class="week-stack">${weekCards}</div>
            <section class="panel">
                <div class="panel-title">Lista de la compra de la semana enfocada</div>
                <div class="muted compacta-shopping-week">${this.escapeHtml(current.label)}</div>
                <div class="bar">
                    <input id="manual-item" placeholder="Añadir producto libre">
                    <button class="btn green" type="button" onclick="app.addManualCompraItem()">Añadir</button>
                </div>
                <div id="compacta-compra-container"></div>
            </section>
        `;
        const weekSelect = document.getElementById('week-select');
        if (weekSelect) {
            weekSelect.addEventListener('change', (e) => {
                this.autosaveCurrentWeek();
                this.currentWeekKey = e.target.value;
                const option = this.getWeekOption(this.currentWeekKey);
                if (option) this.rebuildWeekOptionsAround(option.monday);
                this.loadCurrentWeekPlan();
            });
        }
        const weekSummary = document.getElementById('week-summary');
        if (weekSummary) weekSummary.textContent = current.label;
        this.renderCompra('compacta-compra-container');
        this.scrollCurrentCompactaWeekIntoView();
    },

    getVisibleCompactaWeeks() {
        const current = this.getWeekOption();
        if (!current) return [];
        return [-1, 0, 1].map(delta => this.ensureWeekOptionForMonday(this.addDays(current.monday, delta * 7)));
    },

    renderCompactaWeekSection(option) {
        const plan = option.key === this.currentWeekKey ? this.plan : this.readPlanForWeek(option.key);
        const dayCards = DIAS.map((dia, idx) => {
            const comida = this.renderCompactaMeal(dia, 'comida', 'Comida', plan, option.key);
            const cena = this.renderCompactaMeal(dia, 'cena', 'Cena', plan, option.key);
            const dateKey = this.formatDateInputValue(this.addDays(option.monday, idx));
            return `<article class="day" id="compacta-day-${this.escapeHtml(dateKey)}">
                <div class="day-head">${this.escapeHtml(this.getCompactaDayLabel(dia, idx, option.key))}</div>
                ${comida}
                ${cena}
            </article>`;
        }).join('');
        const focused = option.key === this.currentWeekKey;
        return `<section id="compacta-week-${this.escapeHtml(option.key)}" class="week-section ${focused ? 'focus' : ''}">
            <button class="week-head" type="button" onclick="app.focusCompactaWeek('${this.escapeHtml(option.key)}')">
                <span class="week-name">${this.escapeHtml(option.label)}</span>
                <span class="week-tag">${focused ? 'Actual' : 'Editar'}</span>
            </button>
            <div class="week-grid">${dayCards}</div>
        </section>`;
    },

    focusCompactaWeek(weekKey) {
        if (weekKey === this.currentWeekKey) return;
        this.autosaveCurrentWeek();
        this.currentWeekKey = weekKey;
        this.plan = this.readPlanForWeek(weekKey);
        this.loadCompraStateForCurrentWeek();
        this.persistCurrentWeekKey();
        this.renderWeekSelector();
        this.renderPlanificador();
        this.renderCompacta();
    },

    scrollCurrentCompactaWeekIntoView() {
        setTimeout(() => {
            const today = document.getElementById(`compacta-day-${this.getTodayDateKey()}`);
            (today || document.getElementById(`compacta-week-${this.currentWeekKey}`))?.scrollIntoView({ block: 'start' });
        }, 80);
    },

    getCompactaDayLabel(dia, idx, key = this.currentWeekKey) {
        const initial = idx === 2 ? 'X' : DIAS_LABEL[idx][0];
        return `${initial} ${this.getDayDateLabel(dia, key)}`;
    },

    renderCompactaMeal(dia, tipo, label, plan = this.plan, weekKey = this.currentWeekKey) {
        const primero = this.renderCompactaSlot(dia, tipo, 'primero', 'Primer plato', plan, weekKey);
        const segundo = this.renderCompactaSlot(dia, tipo, 'segundo', 'Segundo plato', plan, weekKey);
        return `<div class="meal"><div class="meal-label">${label}</div>${primero}${segundo}</div>`;
    },

    renderCompactaSlot(dia, tipo, slot, label, plan = this.plan, weekKey = this.currentWeekKey) {
        const text = plan[dia]?.[tipo]?.[slot] || '';
        return `<button class="slot ${text ? '' : 'empty'}" type="button" onclick="app.assignSlotForWeek('${this.escapeHtml(weekKey)}','${dia}','${tipo}','${slot}')">
            <small>${this.escapeHtml(label)}</small>${this.escapeHtml(text || 'Tocar para elegir')}
        </button>`;
    },

    renderLegacyCompacta() {
        const container = document.getElementById('compacta-container');
        const weekLabel = document.getElementById('compacta-week-label');
        if (!container) return;
        const current = this.getWeekOption();
        if (weekLabel) weekLabel.textContent = current.label;
        const rows = this.getCompactaRows();
        container.innerHTML = rows.map(r => `<div class="compacta-line"><span class="compacta-day">${r.label}</span> ${r.comida} / ${r.cena}</div>`).join('');
        this.renderCompra('compacta-compra-container');
    },

    getCompraConteo() {
        const items = this.getCompraItems();
        const conteo = {};
        Object.keys(items).forEach(ing => {
            conteo[ing] = items[ing].count;
        });
        return conteo;
    },

    getCompraItems() {
        let items = {};
        const overrides = this.getCompraOverrides();
        const addItem = (rawText, source = '', originalText = rawText) => {
            const canonical = this.canonicalCompraText(rawText);
            if (!canonical) return;
            const override = overrides[canonical] || {};
            if (override.deleted) return;
            const finalText = this.canonicalCompraText(override.text || canonical);
            if (!finalText) return;
            if (!items[finalText]) {
                items[finalText] = { count: 0, sources: new Set(), originals: new Set() };
            }
            items[finalText].count += 1;
            items[finalText].originals.add(originalText || canonical);
            if (source) items[finalText].sources.add(source);
        };
        DIAS.forEach(dia => {
            TIPOS.forEach(tipo => {
                SLOTS.forEach(slot => {
                    const pname = this.plan[dia] && this.plan[dia][tipo] && this.plan[dia][tipo][slot];
                    if (pname) {
                        const pnameNorm = this.normalizeMatchText(pname);
                        const allPlatos = this.getAllPlatos();
                        const matchedData = allPlatos.find(p => p.plato === pname && p.en_excel) ||
                            allPlatos.find(p => p.en_excel && this.normalizeMatchText(p.plato) === pnameNorm);
                        if (matchedData && matchedData.ingredientes) {
                            matchedData.ingredientes.forEach(ing => {
                                addItem(ing, pname);
                            });
                        }
                    }
                });
            });
        });
        (overrides._manual || []).forEach(manual => addItem(manual.text, manual.source || 'Manual', manual.id));
        Object.keys(items).forEach(key => {
            items[key].sources = Array.from(items[key].sources);
            items[key].originals = Array.from(items[key].originals);
        });
        return items;
    },

    abbreviateSource(name) {
        const clean = String(name || '').replace(/\s+/g, ' ').trim();
        if (clean.length <= 18) return clean;
        const stop = new Set(['de', 'del', 'la', 'el', 'los', 'las', 'con', 'y', 'en', 'al', 'a']);
        const words = clean.split(' ').filter(w => w && !stop.has(w.toLowerCase()));
        if (words.length <= 2) return clean.slice(0, 20).trim();
        return `${words[0]} ${words.slice(1, 4).map(w => w[0].toUpperCase()).join(' ')}`;
    },

    compraSourceText(sources) {
        const unique = Array.from(new Set(sources || [])).filter(Boolean);
        if (!unique.length) return '';
        if (unique.length === 1) return unique[0];
        return unique.map(s => this.abbreviateSource(s)).join(' + ');
    },

    buildCompactaYCompraText() {
        const current = this.getWeekOption();
        const rows = this.getCompactaRows();
        const conteo = this.getCompraConteo();
        const ingredientes = Object.keys(conteo).sort();
        let texto = `${current.label}\n\n`;
        rows.forEach(r => {
            texto += `${r.label} ${r.comida} / ${r.cena}\n`;
        });
        texto += `\nLISTA DE LA COMPRA\n`;
        if (!ingredientes.length) {
            texto += `- Sin ingredientes calculados\n`;
        } else {
            ingredientes.forEach(ing => {
                const id = this.getCompraItemId(ing);
                const marca = this.compraChecked && this.compraChecked[id] ? '[x]' : '[ ]';
                texto += `${marca} ${ing}${conteo[ing] > 1 ? ` (x${conteo[ing]})` : ''}\n`;
            });
        }
        return texto;
    },

    copyCompactaYCompra() {
        const texto = this.buildCompactaYCompraText();
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(texto).then(() => {
                alert('Compacta + compra copiadas al portapapeles.');
            }).catch(err => {
                alert('Error al copiar: ' + err);
            });
        } else {
            alert('Tu navegador no soporta la copia automática.');
        }
    },

    selectPlato(name) {
        this.selectedPlato = name;
        const selectedName = document.getElementById('selected-plato-name');
        if (selectedName) selectedName.textContent = name;
        document.getElementById('selected-plato-fab')?.classList.remove('hidden');

        if (this.pendingSlot) {
            const { weekKey, dia, tipo, slot } = this.pendingSlot;
            if (!this.plan[dia]) this.plan[dia] = {};
            if (!this.plan[dia][tipo]) this.plan[dia][tipo] = {};
            this.plan[dia][tipo][slot] = name;
            this.pendingSlot = null;
            this.selectedPlato = null;
            document.getElementById('selected-plato-fab')?.classList.add('hidden');
            this.autosaveCurrentWeek();
            this.renderPlanificador();
            this.renderCompacta();
            this.switchTab('view-planificador');
            return;
        }
    },

    clearSelection() {
        this.selectedPlato = null;
        this.pendingSlot = null;
        document.getElementById('selected-plato-fab')?.classList.add('hidden');
    },

    setSlotPlato(dia, tipo, slot, name, weekKey = this.currentWeekKey) {
        if (weekKey !== this.currentWeekKey) {
            this.autosaveCurrentWeek();
            this.currentWeekKey = weekKey;
            this.plan = this.readPlanForWeek(weekKey);
            this.loadCompraStateForCurrentWeek();
        }
        if (!this.plan[dia]) this.plan[dia] = {};
        if (!this.plan[dia][tipo]) this.plan[dia][tipo] = {};
        this.plan[dia][tipo][slot] = name;
        this.pendingSlot = null;
        this.selectedPlato = null;
        document.getElementById('selected-plato-fab')?.classList.add('hidden');
        this.autosaveCurrentWeek();
        this.renderPlanificador();
        this.renderCompacta();
        this.closeSlotModal();
        this.switchTab('view-compacta');
    },

    assignSlotForWeek(weekKey, dia, tipo, slot) {
        if (weekKey !== this.currentWeekKey) {
            this.autosaveCurrentWeek();
            this.currentWeekKey = weekKey;
            this.plan = this.readPlanForWeek(weekKey);
            this.loadCompraStateForCurrentWeek();
            this.persistCurrentWeekKey();
            this.renderWeekSelector();
            this.renderPlanificador();
        }
        this.assignSlot(dia, tipo, slot);
    },

    assignSlot(dia, tipo, slot) {
        const currentDish = this.plan[dia] && this.plan[dia][tipo] && this.plan[dia][tipo][slot];
        if (this.selectedPlato) {
            this.setSlotPlato(dia, tipo, slot, this.selectedPlato);
            return;
        }

        if (currentDish) {
            this.openDishChooser(dia, tipo, slot);
            return;
        }

        this.openDishChooser(dia, tipo, slot);
    },

    openDishChooser(dia, tipo, slot) {
        this.pendingSlot = { weekKey: this.currentWeekKey, dia, tipo, slot };
        const currentDish = this.plan[dia]?.[tipo]?.[slot] || '';
        const title = document.getElementById('slot-title');
        const modal = document.getElementById('slot-modal');
        const search = document.getElementById('dish-search');
        if (!modal || !search) return;
        if (title) title.textContent = currentDish || 'Elegir plato';
        search.value = '';
        modal.classList.add('active');
        if (currentDish) {
            this.drawSlotActions(dia, tipo, slot, currentDish);
        } else {
            this.drawDishResults('');
            setTimeout(() => search.focus(), 80);
        }
    },

    closeSlotModal() {
        document.getElementById('slot-modal')?.classList.remove('active');
    },

    drawSlotActions(dia, tipo, slot, dish) {
        const results = document.getElementById('dish-results');
        if (!results) return;
        const recipePath = this.findRecipeUrlForDish(dish);
        const dishArg = encodeURIComponent(dish);
        results.innerHTML = `
            ${recipePath ? `<button class="choice" type="button" onclick="app.closeSlotModal(); app.openRecipeForDish(decodeURIComponent('${dishArg}'))"><strong>Ver receta</strong><span>${this.escapeHtml(dish)}</span></button>` : ''}
            <button class="choice" type="button" onclick="app.drawDishResults('')"><strong>Cambiar plato</strong><span>Elegir otro plato del recetario</span></button>
            <button class="choice" type="button" onclick="app.setSlotPlato('${dia}','${tipo}','${slot}','','${this.escapeHtml(this.currentWeekKey)}')"><strong>Vaciar campo</strong><span>Quitar este plato del plan</span></button>
        `;
    },

    getDishChoices(filter = '') {
        const f = this.normalizeMatchText(filter);
        return this.getVisibleDishRows()
            .filter(p => !f || this.normalizeMatchText(p.plato).includes(f) || this.normalizeMatchText(this.displayCategory(p)).includes(f))
            .sort((a, b) => a.plato.localeCompare(b.plato, 'es'))
            .slice(0, 120);
    },

    drawDishResults(filter = '') {
        const results = document.getElementById('dish-results');
        if (!results) return;
        const rows = this.getDishChoices(filter);
        const free = String(filter || '').trim();
        const canUseFree = free && !rows.some(r => this.normalizeMatchText(r.plato) === this.normalizeMatchText(free));
        results.innerHTML = `
            <button class="choice" type="button" onclick="app.chooseDish('')"><strong>Vaciar campo</strong><span>Dejar este plato sin asignar</span></button>
            ${canUseFree ? `<button class="choice" type="button" onclick="app.chooseDish(decodeURIComponent('${encodeURIComponent(free)}'))"><strong>Usar texto libre</strong><span>${this.escapeHtml(free)}</span></button>` : ''}
            ${rows.map(p => `<button class="choice" type="button" onclick="app.chooseDish(decodeURIComponent('${encodeURIComponent(p.plato)}'))"><strong>${this.escapeHtml(p.plato)}</strong><span>${this.escapeHtml(this.displayCategory(p))}${p.url_receta ? ' · receta' : ''}</span></button>`).join('')}
        `;
    },

    chooseDish(name) {
        if (!this.pendingSlot) return;
        const { weekKey, dia, tipo, slot } = this.pendingSlot;
        this.setSlotPlato(dia, tipo, slot, name, weekKey || this.currentWeekKey);
    },

    renderCompra(containerId = 'compra-container') {
        const container = document.getElementById(containerId);
        if(!container) return;
        container.innerHTML = '';
        
        let compraItems = this.getCompraItems();
        
        const keys = Object.keys(compraItems).sort();
        if (keys.length === 0) {
            container.innerHTML = '<div class="muted empty-shopping">Sin compra calculada. Asigna platos con ListaCompra o añade productos libres.</div>';
            return;
        }
        
        const ul = document.createElement('ul');
        ul.className = 'shopping-list';

        const dept = document.createElement('li');
        dept.className = 'shopping-dept';
        dept.textContent = 'Compra';
        ul.appendChild(dept);
        
        keys.forEach(ing => {
            const id = this.getCompraItemId(ing);
            const checked = !!(this.compraChecked && this.compraChecked[id]);
            const item = compraItems[ing];
            const sourceText = this.compraSourceText(item.sources);
            const li = document.createElement('li');
            li.className = `shopping-item${checked ? ' checked' : ''}`;

            const label = document.createElement('label');
            label.className = 'shopping-check-label';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = checked;
            checkbox.setAttribute('aria-label', ing);

            const text = document.createElement('span');
            text.className = 'shopping-item-text';
            text.textContent = ing;

            const main = document.createElement('span');
            main.className = 'shopping-item-main';
            main.appendChild(text);

            if (sourceText) {
                const source = document.createElement('span');
                source.className = 'shopping-item-source';
                source.textContent = sourceText;
                source.title = item.sources.join(' · ');
                main.appendChild(source);
            }

            label.appendChild(checkbox);
            label.appendChild(main);
            li.appendChild(label);

            if (item.count > 1) {
                const extra = document.createElement('span');
                extra.className = 'shopping-count';
                extra.textContent = `x${item.count}`;
                li.appendChild(extra);
            }

            const more = document.createElement('button');
            more.type = 'button';
            more.className = 'shop-more';
            more.textContent = '⋮';
            more.setAttribute('aria-label', `Editar ${ing}`);
            more.addEventListener('click', () => this.openShoppingModal(ing));
            li.appendChild(more);

            checkbox.addEventListener('change', () => {
                this.compraChecked[id] = checkbox.checked;
                if (!checkbox.checked) delete this.compraChecked[id];
                li.classList.toggle('checked', checkbox.checked);
                this.autosaveCompraState();
            });

            ul.appendChild(li);
        });
        
        container.appendChild(ul);
    },

    openShoppingModal(ing) {
        this.shoppingAction = ing;
        const modal = document.getElementById('shopping-modal');
        if (!modal) return;
        document.getElementById('shopping-title').textContent = ing;
        document.getElementById('shopping-edit-input').value = ing;
        modal.classList.add('active');
    },

    closeShoppingModal() {
        document.getElementById('shopping-modal')?.classList.remove('active');
        this.shoppingAction = null;
    },

    saveShoppingEdit() {
        if (!this.shoppingAction) return;
        const next = document.getElementById('shopping-edit-input')?.value.trim();
        if (!next) return;
        const overrides = this.getCompraOverrides();
        const item = this.getCompraItems()[this.shoppingAction];
        const originals = item && Array.isArray(item.originals) ? item.originals : [this.shoppingAction];
        originals.forEach(original => {
            if (String(original).startsWith('manual_')) {
                overrides._manual = (overrides._manual || []).map(entry => entry.id === original ? { ...entry, text: next } : entry);
            } else {
                overrides[original] = { text: next };
            }
        });
        this.setCompraOverrides(overrides);
        this.closeShoppingModal();
        this.renderCompacta();
    },

    deleteShoppingSelected() {
        if (!this.shoppingAction) return;
        const overrides = this.getCompraOverrides();
        const item = this.getCompraItems()[this.shoppingAction];
        const originals = item && Array.isArray(item.originals) ? item.originals : [this.shoppingAction];
        originals.forEach(original => {
            if (String(original).startsWith('manual_')) {
                overrides._manual = (overrides._manual || []).filter(entry => entry.id !== original);
            } else {
                overrides[original] = { deleted: true };
            }
        });
        this.setCompraOverrides(overrides);
        delete this.compraChecked[this.getCompraItemId(this.shoppingAction)];
        this.autosaveCompraState();
        this.closeShoppingModal();
        this.renderCompacta();
    },

    addManualCompraItem() {
        const input = document.getElementById('manual-item');
        const text = input?.value.trim();
        if (!text) return;
        const overrides = this.getCompraOverrides();
        overrides._manual = overrides._manual || [];
        overrides._manual.push({
            id: `manual_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            text,
            source: 'Manual'
        });
        this.setCompraOverrides(overrides);
        input.value = '';
        this.renderCompacta();
    },

    copyCompra() {
        const texto = this.buildCompactaYCompraText();
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(texto).then(() => {
                alert('Planificación compacta + compra copiadas al portapapeles.');
            }).catch(err => {
                alert('Error al copiar: ' + err);
            });
        } else {
            alert('Tu navegador no soporta la copia automática. Por favor selecciona el texto y cópialo a mano.');
        }
    },

    getPublicBaseUrl() {
        const href = window.location.href.split('#')[0];
        if (href.startsWith('file:')) return 'https://ricardoyf.github.io/mi-planificador/';
        const base = href.split('index.html')[0];
        return base.endsWith('/') ? base : `${base}/`;
    },

    async fetchTextAsset(path) {
        const normalizedPath = String(path || '').split('?')[0].replace(/^\.\//, '');
        const embeddedAssets = window.STANDALONE_SOURCE_ASSETS || {};
        if (embeddedAssets[normalizedPath]) return embeddedAssets[normalizedPath];
        const response = await fetch(path, { cache: 'no-store' });
        if (!response.ok) throw new Error(`No se pudo leer ${path}`);
        return response.text();
    },

    escapeInlineScript(text) {
        return String(text || '').replace(/<\/script/gi, '<\\/script');
    },

    escapeInlineStyle(text) {
        return String(text || '').replace(/<\/style/gi, '<\\/style');
    },

    getCurrentCssPath() {
        const cssLink = document.querySelector('link[rel="stylesheet"][href*="css/styles.css"]');
        return cssLink ? cssLink.getAttribute('href') : 'css/styles.css';
    },

    getCurrentScriptPath(partial) {
        const script = Array.from(document.scripts).find(s => s.src && s.src.includes(partial));
        if (!script) return partial;
        const src = script.getAttribute('src') || partial;
        return src;
    },

    async collectStandaloneRecipes() {
        const recipes = {};
        const embedded = window.STANDALONE_RECIPES || {};
        const uniqueUrls = Array.from(new Set((recetasData || []).map(r => r.url).filter(Boolean)));
        await Promise.all(uniqueUrls.map(async (url) => {
            if (embedded[url]) {
                recipes[url] = embedded[url];
                return;
            }
            try {
                recipes[url] = await this.fetchTextAsset(url);
            } catch (_e) {
                // Si el navegador no puede leer una receta, el enlace seguirá funcionando con <base>.
            }
        }));
        return recipes;
    },

    buildStandaloneBootstrapScript(exportedState) {
        return `
(function () {
    window.EXPORTED_WEEK_KEY = ${JSON.stringify(exportedState.weekKey)};
    window.EXPORTED_PLAN = ${JSON.stringify(exportedState.plan)};
    window.EXPORTED_COMPRA_CHECKED = ${JSON.stringify(exportedState.compraChecked)};
    window.EXPORTED_BASE_URL = ${JSON.stringify(exportedState.baseUrl)};
    window.STANDALONE_RECIPES = ${JSON.stringify(exportedState.recipes).replace(/<\/script/gi, '<\\/script')};

    const originalOnload = window.onload;
    window.onload = function () {
        if (typeof originalOnload === 'function') originalOnload();
        if (!window.app) return;
        const monday = app.parseWeekKey(window.EXPORTED_WEEK_KEY);
        if (monday) app.rebuildWeekOptionsAround(monday);
        app.currentWeekKey = window.EXPORTED_WEEK_KEY;
        app.plan = JSON.parse(JSON.stringify(window.EXPORTED_PLAN));
        app.compraChecked = Object.assign({}, window.EXPORTED_COMPRA_CHECKED || {});
        app.renderWeekSelector();
        app.persistCurrentWeekKey();
        app.renderPlanificador();
        app.renderCompacta();
    };

    const recipeBlobs = new Map();
    function recipeUrl(path) {
        const html = window.STANDALONE_RECIPES && window.STANDALONE_RECIPES[path];
        if (!html) return null;
        if (!recipeBlobs.has(path)) {
            recipeBlobs.set(path, URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' })));
        }
        return recipeBlobs.get(path);
    }

    function openStandaloneRecipe(path) {
        const url = recipeUrl(path);
        if (url) {
            window.open(url, '_blank');
            return;
        }
        window.open(new URL(path, window.EXPORTED_BASE_URL).href, '_blank');
    }

    document.addEventListener('click', function (event) {
        const link = event.target.closest && event.target.closest('a[href^="Recipes/"]');
        if (!link) return;
        event.preventDefault();
        openStandaloneRecipe(link.getAttribute('href'));
    });

    const patchApp = setInterval(function () {
        if (!window.app) return;
        clearInterval(patchApp);
        app.openRecipeForDish = function (name) {
            const recipePath = app.findRecipeUrlForDish ? app.findRecipeUrlForDish(name) : null;
            if (!recipePath) {
                alert('Ese plato no tiene receta enlazada.');
                return;
            }
            openStandaloneRecipe(recipePath);
        };
    }, 20);
}());
`;
    },

    async exportStandaloneHTML() {
        const menu = document.getElementById('dropdown-menu');
        if (menu) menu.classList.add('hidden');
        const originalTitle = document.title;
        document.title = 'Generando standalone...';
        try {
            const [css, dataJs, appJs, recipes] = await Promise.all([
                this.fetchTextAsset(this.getCurrentCssPath()),
                this.fetchTextAsset(this.getCurrentScriptPath('js/data.js')),
                this.fetchTextAsset(this.getCurrentScriptPath('js/app.js')),
                this.collectStandaloneRecipes()
            ]);

            const exportedState = {
                weekKey: this.getWeekFileBase(),
                plan: this.plan,
                compraChecked: this.getVisibleCompraChecked(),
                baseUrl: this.getPublicBaseUrl(),
                recipes
            };
            const current = this.getWeekOption();
            const title = `Plan semanal ${current.summary}`;
            const bootstrap = this.buildStandaloneBootstrapScript(exportedState);
            const htmlStr = `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <base href="${this.escapeHtml(exportedState.baseUrl)}">
    <title>${this.escapeHtml(title)}</title>
    <style>
${this.escapeInlineStyle(css)}
    </style>
</head>
<body>
    <header class="app-header">
        <div class="header-title-block">
            <h1>Planificador</h1>
            <div id="week-summary" class="week-summary">Semana exportada</div>
        </div>
        <div class="header-actions">
            <div class="week-controls">
                <button id="week-prev-btn" class="week-nav-btn" type="button" aria-label="Semana anterior">‹</button>
                <select id="week-select" class="week-select"></select>
                <button id="week-next-btn" class="week-nav-btn" type="button" aria-label="Semana siguiente">›</button>
                <input id="week-date-input" class="week-date-input" type="date" aria-label="Elegir fecha">
            </div>
            <div class="menu-container">
                <button id="menu-btn" class="icon-btn">⋮</button>
                <div id="dropdown-menu" class="dropdown hidden">
                    <button onclick="app.exportHTML()">Exportar HTML</button>
                    <button onclick="app.exportStandaloneHTML()">Exportar standalone</button>
                </div>
            </div>
        </div>
    </header>

    <main id="main-content">
        <section id="view-planificador" class="view active">
            <div class="days-container" id="days-container"></div>
        </section>
        <section id="view-platos" class="view">
            <div class="search-bar"><input type="text" id="search-platos" placeholder="Buscar platos..."></div>
            <div class="platos-container" id="platos-container"></div>
        </section>
        <section id="view-recetario" class="view">
            <div class="search-bar"><input type="text" id="search-recetas" placeholder="Buscar recetas..."></div>
            <div class="platos-container" id="recetas-container"></div>
        </section>
        <section id="view-xls" class="view">
            <div class="search-bar"><input type="text" id="search-xls" placeholder="Buscar platos del Excel..."></div>
            <div class="platos-container" id="xls-container"></div>
        </section>
        <section id="view-compacta" class="view">
            <div class="compacta-header-row">
                <div class="compacta-title-block">
                    <div class="compacta-kicker">Vista compacta</div>
                    <div id="compacta-week-label" class="compacta-week-label">Semana exportada</div>
                </div>
                <button onclick="app.copyCompactaYCompra()" class="compact-copy-btn">Copiar</button>
            </div>
            <div id="compacta-container" class="compacta-container"></div>
            <div class="compacta-buy-header">Lista de la compra asociada</div>
            <div id="compacta-compra-container" class="compacta-buy-container"></div>
            <div class="compacta-help">Copia planificación + lista de la compra.</div>
        </section>
    </main>

    <div id="selected-plato-fab" class="fab hidden">
        <span>Seleccionado: <strong id="selected-plato-name">Ninguno</strong></span>
        <button onclick="app.clearSelection()">✕</button>
    </div>

    <nav class="bottom-nav">
        <button class="nav-item active" data-target="view-planificador">📅 <span>Plan</span></button>
        <button class="nav-item" data-target="view-platos">🍲 <span>Platos</span></button>
        <button class="nav-item" data-target="view-recetario">📖 <span>Recetario</span></button>
        <button class="nav-item" data-target="view-xls">📊 <span>xls</span></button>
        <button class="nav-item" data-target="view-compacta">🧾 <span>Compacta</span></button>
    </nav>

    <input type="file" id="json-file-input" accept="application/json,.json" style="display:none">
    <script>
${this.escapeInlineScript(dataJs)}
    </script>
    <script>
${this.escapeInlineScript(appJs)}
    </script>
    <script>
${this.escapeInlineScript(bootstrap)}
    </script>
</body>
</html>`;

            const blob = new Blob([htmlStr], { type: 'text/html' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${this.getWeekFileBase()}_standalone.html`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            alert(`No se pudo generar el standalone: ${error.message}`);
        } finally {
            document.title = originalTitle;
        }
    },

    clearCurrentWeek() {
        const current = this.getWeekOption();
        const ok = confirm(`¿Borrar toda la semana ${current.label}?`);
        if (!ok) return;
        this.plan = this.getEmptyPlan();
        this.autosaveCurrentWeek();
        this.renderPlanificador();
        this.renderCompacta();
        document.getElementById('dropdown-menu').classList.add('hidden');
    },

    switchTab(tabId) {
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        
        document.getElementById(tabId).classList.add('active');
        const trigger = document.querySelector(`.nav-item[data-target="${tabId}"]`);
        if(trigger) trigger.classList.add('active');
    },

    setupEventListeners() {
        document.getElementById('menu-btn').onclick = () => {
            document.getElementById('dropdown-menu').classList.toggle('hidden');
        };

        const weekSelect = document.getElementById('week-select');
        if (weekSelect) {
            weekSelect.addEventListener('change', (e) => {
                this.autosaveCurrentWeek();
                this.currentWeekKey = e.target.value;
                const option = this.getWeekOption(this.currentWeekKey);
                if (option) this.rebuildWeekOptionsAround(option.monday);
                this.loadCurrentWeekPlan();
            });
        }

        const prevBtn = document.getElementById('week-prev-btn');
        if (prevBtn) {
            prevBtn.addEventListener('click', () => this.moveWeek(-1));
        }

        const nextBtn = document.getElementById('week-next-btn');
        if (nextBtn) {
            nextBtn.addEventListener('click', () => this.moveWeek(1));
        }

        const dateInput = document.getElementById('week-date-input');
        if (dateInput) {
            dateInput.addEventListener('change', (e) => this.switchToDate(e.target.value));
        }
        
        const searchPlatos = document.getElementById('search-platos');
        if (searchPlatos) {
            searchPlatos.oninput = (e) => this.renderPlatos(e.target.value);
        }
        const searchRecetas = document.getElementById('search-recetas');
        if (searchRecetas) {
            searchRecetas.oninput = (e) => this.renderRecetario(e.target.value);
        }
        const searchXls = document.getElementById('search-xls');
        if (searchXls) {
            searchXls.oninput = (e) => this.renderXls(e.target.value);
        }
        
        document.querySelectorAll('.nav-item').forEach(btn => {
            btn.addEventListener('click', () => {
                this.switchTab(btn.dataset.target);
            });
        });

        const jsonInput = document.getElementById('json-file-input');
        if (jsonInput) {
            jsonInput.addEventListener('change', (e) => {
                const file = e.target.files && e.target.files[0];
                this.importSelectedFile(file);
            });
        }

        const dishSearch = document.getElementById('dish-search');
        if (dishSearch) {
            dishSearch.addEventListener('input', (e) => this.drawDishResults(e.target.value));
        }
    },

    exportHTML() {
        let rows = '';
        TIPOS.forEach(tipo => {
            SLOTS.forEach(slot => {
                const sLabel = slot === 'primero' ? '1º' : '2º';
                const etiqueta = `${tipo.charAt(0).toUpperCase() + tipo.slice(1)} · ${sLabel}`;
                let celdas = '';
                DIAS.forEach(dia => {
                    const pname = this.plan[dia][tipo][slot];
                    let cellHtml = pname || '';
                    if (pname) {
                        const matchedData = platosData.find(p => p.plato === pname);
                        if (matchedData && matchedData.url_receta) {
                            const baseUrl = window.location.href.split('index.html')[0].replace(/\/$/, "");
                            const absoluteUrl = `${baseUrl}/${matchedData.url_receta}`;
                            cellHtml = `<a href="${this.escapeHtml(absoluteUrl)}" target="_blank" style="color:#4990E2; font-weight:bold;">${this.escapeHtml(pname)}</a>`;
                        } else {
                            cellHtml = this.escapeHtml(pname);
                        }
                    }
                    celdas += `<td>${cellHtml}</td>`;
                });
                rows += `<tr><th>${etiqueta}</th>${celdas}</tr>`;
            });
        });
        const conteo = this.getCompraConteo();
        const compraItems = Object.keys(conteo).sort().map(ing => {
            const id = this.getCompraItemId(ing);
            const checked = !!(this.compraChecked && this.compraChecked[id]);
            const extra = conteo[ing] > 1 ? ` <strong class="count">x${conteo[ing]}</strong>` : '';
            return `<li class="${checked ? 'checked' : ''}"><label><input type="checkbox" ${checked ? 'checked' : ''}> <span>${this.escapeHtml(ing)}</span>${extra}</label></li>`;
        }).join('');

        const htmlStr = `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><title>Plan semanal comidas</title>
<style>
body { font-family: Arial, sans-serif; margin: 20px; color:#111; }
h1 { margin-bottom: 8px; }
h2 { margin-top: 24px; }
table { width:100%; border-collapse: collapse; margin-top: 12px; }
th, td { border:1px solid #ccc; padding:10px; text-align:center; vertical-align:top; }
th { background:#f3f6fb; }
ul { list-style:none; padding:0; margin:12px 0 0; columns:2; column-gap:24px; }
li { break-inside:avoid; padding:7px 0; border-bottom:1px solid #eee; }
label { display:flex; gap:8px; align-items:center; }
input { width:18px; height:18px; }
.checked span { color:#777; text-decoration:line-through; }
.count { margin-left:auto; color:#0b57d0; }
.small { color:#555; display:block; margin-bottom: 12px; }
@page { size: A4 landscape; margin: 12mm; }
@media (max-width:700px) { ul { columns:1; } }
</style></head><body>
<h1>Plan semanal de comidas</h1>
<div class="small">Lunes a domingo · comidas y cenas · primer y segundo plato</div>
<table>
<thead><tr><th></th>${DIAS.map(d => `<th>${d.charAt(0).toUpperCase() + d.slice(1)}</th>`).join('')}</tr></thead>
<tbody>${rows}</tbody>
</table>
<h2>Lista de la compra</h2>
${compraItems ? `<ul>${compraItems}</ul>` : '<p>Sin ingredientes calculados.</p>'}
</body></html>`;

        const blob = new Blob([htmlStr], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        
        const pad = n => n.toString().padStart(2, '0');
        const d = new Date();
        const fname = `plan_semanal_${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}.html`;
        
        a.href = url;
        a.download = fname;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        document.getElementById('dropdown-menu').classList.add('hidden');
    }
};

window.onload = () => app.init();
