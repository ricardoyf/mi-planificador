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
    currentWeekStorageKey: 'plan_current_week',
    compraChecked: {},
    slotAction: null,
    
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

    rebuildWeekOptionsAround(centerMondayInput) {
        const centerMonday = this.getMondayForDate(centerMondayInput);
        this.weekOptions = Array.from({ length: 53 }, (_, offset) => {
            const delta = offset - 26;
            return this.buildWeekOptionFromMonday(this.addDays(centerMonday, delta * 7));
        });
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
        try {
            const data = localStorage.getItem(this.getStorageKeyForWeek());
            if (data) {
                this.plan = JSON.parse(data);
                if (!this.plan['lunes'] || !this.plan['lunes']['comida']) throw new Error('Estructura corrupta');
            } else {
                const legacyBase = localStorage.getItem('plan_base');
                if (legacyBase && this.currentWeekKey === this.weekOptions[0].key) {
                    this.plan = JSON.parse(legacyBase);
                    if (!this.plan['lunes'] || !this.plan['lunes']['comida']) throw new Error('Estructura corrupta');
                    this.autosaveCurrentWeek();
                } else {
                    this.plan = this.getEmptyPlan();
                }
            }
        } catch (e) {
            console.error('Plan semanal corrupto, reseteando', e);
            this.plan = this.getEmptyPlan();
        }
        this.loadCompraStateForCurrentWeek();
        this.persistCurrentWeekKey();
        this.renderWeekSelector();
        this.renderPlanificador();
        this.renderCompacta();
    },

    autosaveCurrentWeek() {
        localStorage.setItem(this.getStorageKeyForWeek(), JSON.stringify(this.plan));
        localStorage.setItem('plan_base', JSON.stringify(this.plan));
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

    normalizeCompraKey(text) {
        return String(text || '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '') || 'ingrediente';
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
        const input = document.getElementById('json-file-input');
        if (!input) return;
        input.value = '';
        input.click();
        document.getElementById('dropdown-menu').classList.add('hidden');
    },

    importJsonFile(file) {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            try {
                const parsed = JSON.parse(reader.result);
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
        };
        reader.readAsText(file);
    },

    renderPlanificador() {
        const container = document.getElementById('days-container');
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
        
        const f = filter.toLowerCase();
        
        const groups = {};
        platosData.forEach(p => {
            if (options.onlyExcel && !p.en_excel) return;
            if (f && !p.plato.toLowerCase().includes(f) && !p.categoria.toLowerCase().includes(f)) return;
            if (!groups[p.categoria]) groups[p.categoria] = [];
            groups[p.categoria].push(p);
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
        const f = filter.toLowerCase();
        const groups = {};
        platosData.forEach(p => {
            if (f && !p.plato.toLowerCase().includes(f) && !p.categoria.toLowerCase().includes(f)) return;
            if (!groups[p.categoria]) groups[p.categoria] = [];
            groups[p.categoria].push(p);
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
        const exactPlate = platosData.find(p => p.plato === name && p.url_receta);
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
        this.pendingSlot = { dia, tipo, slot };
        this.selectedPlato = null;
        document.getElementById('selected-plato-fab').classList.add('hidden');
        this.switchTab('view-platos');
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
        let conteo = {};
        DIAS.forEach(dia => {
            TIPOS.forEach(tipo => {
                SLOTS.forEach(slot => {
                    const pname = this.plan[dia] && this.plan[dia][tipo] && this.plan[dia][tipo][slot];
                    if (pname) {
                        const matchedData = platosData.find(p => p.plato === pname);
                        if (matchedData && matchedData.ingredientes) {
                            matchedData.ingredientes.forEach(ing => {
                                if (ing) conteo[ing] = (conteo[ing] || 0) + 1;
                            });
                        }
                    }
                });
            });
        });
        return conteo;
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
        document.getElementById('selected-plato-name').textContent = name;
        document.getElementById('selected-plato-fab').classList.remove('hidden');

        if (this.pendingSlot) {
            const { dia, tipo, slot } = this.pendingSlot;
            if (!this.plan[dia]) this.plan[dia] = {};
            if (!this.plan[dia][tipo]) this.plan[dia][tipo] = {};
            this.plan[dia][tipo][slot] = name;
            this.pendingSlot = null;
            this.selectedPlato = null;
            document.getElementById('selected-plato-fab').classList.add('hidden');
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
        document.getElementById('selected-plato-fab').classList.add('hidden');
    },

    setSlotPlato(dia, tipo, slot, name) {
        if (!this.plan[dia]) this.plan[dia] = {};
        if (!this.plan[dia][tipo]) this.plan[dia][tipo] = {};
        this.plan[dia][tipo][slot] = name;
        this.pendingSlot = null;
        this.selectedPlato = null;
        document.getElementById('selected-plato-fab').classList.add('hidden');
        this.autosaveCurrentWeek();
        this.renderPlanificador();
        this.renderCompacta();
        this.switchTab('view-planificador');
    },

    assignSlot(dia, tipo, slot) {
        const currentDish = this.plan[dia] && this.plan[dia][tipo] && this.plan[dia][tipo][slot];
        if (this.selectedPlato) {
            this.setSlotPlato(dia, tipo, slot, this.selectedPlato);
            return;
        }

        if (currentDish) {
            this.showSlotActions(dia, tipo, slot, currentDish);
            return;
        }

        this.pendingSlot = { dia, tipo, slot };
        this.selectedPlato = null;
        document.getElementById('selected-plato-fab').classList.add('hidden');
        this.switchTab('view-platos');
    },

    renderCompra(containerId = 'compra-container') {
        const container = document.getElementById(containerId);
        if(!container) return;
        container.innerHTML = '';
        
        let conteo = this.getCompraConteo();
        
        const keys = Object.keys(conteo).sort();
        if (keys.length === 0) {
            container.innerHTML = '<div style="color:#555; text-align:center; padding:20px;">Aún no hay ingredientes cargados o seleccionados en tu planificador.</div>';
            return;
        }
        
        const ul = document.createElement('ul');
        ul.className = 'shopping-list';
        
        keys.forEach(ing => {
            const id = this.getCompraItemId(ing);
            const checked = !!(this.compraChecked && this.compraChecked[id]);
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

            label.appendChild(checkbox);
            label.appendChild(text);
            li.appendChild(label);

            if (conteo[ing] > 1) {
                const extra = document.createElement('span');
                extra.className = 'shopping-count';
                extra.textContent = `x${conteo[ing]}`;
                li.appendChild(extra);
            }

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
        
        document.getElementById('search-platos').oninput = (e) => this.renderPlatos(e.target.value);
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
                this.importJsonFile(file);
            });
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
