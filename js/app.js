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
    currentWeekStorageKey: 'plan_current_week',
    
    init() {
        this.setupWeekOptions();
        this.restoreCurrentWeekKey();
        this.loadCurrentWeekPlan();
        this.renderPlatos();
        this.renderRecetario();
        this.renderCompra();
        this.renderCompacta();
        this.setupEventListeners();
        
        // Build desktop navigation if screen is large
        if (window.innerWidth >= 600) {
            this.buildDesktopNav();
        }
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
        const now = new Date();
        const jsDay = now.getDay();
        const mondayOffset = jsDay === 0 ? -6 : 1 - jsDay;
        const baseMonday = new Date(now);
        baseMonday.setHours(0,0,0,0);
        baseMonday.setDate(now.getDate() + mondayOffset);
        this.weekOptions = Array.from({ length: 12 }, (_, offset) => this.buildWeekOptionFromMonday(this.addDays(baseMonday, offset * 7)));
        this.currentWeekKey = this.weekOptions[0].key;
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
            label: `Semana ${pad(monday.getDate())}/${pad(monday.getMonth()+1)} - ${pad(sunday.getDate())}/${pad(sunday.getMonth()+1)}`,
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
        return this.weekOptions.find(w => w.key === key) || this.weekOptions[0];
    },

    getStorageKeyForWeek(key = this.currentWeekKey) {
        return `${this.storagePrefix}${key}`;
    },

    restoreCurrentWeekKey() {
        const hashKey = window.location.hash ? window.location.hash.replace(/^#/, '') : '';
        const savedKey = hashKey || localStorage.getItem(this.currentWeekStorageKey);
        if (!savedKey) return;
        if (!this.weekOptions.some(w => w.key === savedKey)) {
            const monday = this.parseWeekKey(savedKey);
            if (monday) {
                this.weekOptions.push(this.buildWeekOptionFromMonday(monday));
                this.weekOptions.sort((a, b) => a.monday - b.monday);
            }
        }
        if (this.weekOptions.some(w => w.key === savedKey)) {
            this.currentWeekKey = savedKey;
        }
    },

    persistCurrentWeekKey() {
        localStorage.setItem(this.currentWeekStorageKey, this.currentWeekKey);
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
        if (!select) return;
        select.innerHTML = this.weekOptions.map(w => `<option value="${w.key}">${w.label}</option>`).join('');
        select.value = this.currentWeekKey;
        if (summary) {
            const current = this.getWeekOption();
            summary.textContent = `${current.label} · JSON: ${current.key}.json`;
        }
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
        this.renderCompra();
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
        this.persistCurrentWeekKey();
        this.renderWeekSelector();
        this.renderPlanificador();
        this.renderCompra();
        this.renderCompacta();
    },

    autosaveCurrentWeek() {
        localStorage.setItem(this.getStorageKeyForWeek(), JSON.stringify(this.plan));
        localStorage.setItem('plan_base', JSON.stringify(this.plan));
        this.persistCurrentWeekKey();
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
            const payload = { ...this.plan, _meta: { tipo: 'base', nombre: this.getWeekFileBase() } };
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
        const payload = { ...this.plan, _meta: { tipo: 'base', nombre: this.getWeekFileBase() } };
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
                this.plan = parsed;
                delete this.plan._meta;
                this.autosaveCurrentWeek();
                this.renderPlanificador();
                this.renderCompra();
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
                        this.assignSlot(dia, tipo, slot);
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

    renderPlatos(filter = '') {
        const container = document.getElementById('platos-container');
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

    renderRecetario(filter = '') {
        const container = document.getElementById('recetas-container');
        if (!container) return;
        container.innerHTML = '';
        const f = filter.toLowerCase();
        const groups = {};
        platosData.forEach(p => {
            if (!p.url_receta) return;
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
                const item = document.createElement('a');
                item.className = 'receta-link-item';
                item.textContent = p.plato;
                item.href = p.url_receta;
                item.target = '_blank';
                list.appendChild(item);
            });

            grp.appendChild(header);
            grp.appendChild(list);
            container.appendChild(grp);
        });
    },
    
    openRecipeForDish(name) {
        const matched = platosData.find(p => p.plato === name && p.url_receta);
        if (!matched || !matched.url_receta) {
            alert('Ese plato no tiene receta enlazada.');
            return;
        }
        const baseUrl = window.location.href.split('index.html')[0].replace(/\/$/, '');
        const absoluteUrl = `${baseUrl}/${matched.url_receta}`;
        window.open(absoluteUrl, '_blank');
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
                texto += `- ${ing}${conteo[ing] > 1 ? ` (x${conteo[ing]})` : ''}\n`;
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
            this.renderCompra();
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

    assignSlot(dia, tipo, slot) {
        const currentDish = this.plan[dia] && this.plan[dia][tipo] && this.plan[dia][tipo][slot];
        if (currentDish) {
            const action = confirm('Aceptar para cambiar este plato. Cancelar para eliminarlo.');
            if (!action) {
                this.plan[dia][tipo][slot] = '';
                this.pendingSlot = null;
                this.selectedPlato = null;
                document.getElementById('selected-plato-fab').classList.add('hidden');
                this.autosaveCurrentWeek();
                this.renderPlanificador();
                this.renderCompra();
                this.renderCompacta();
                return;
            }
        }

        this.pendingSlot = { dia, tipo, slot };
        this.selectedPlato = null;
        document.getElementById('selected-plato-fab').classList.add('hidden');
        this.switchTab('view-platos');
        const search = document.getElementById('search-platos');
        if (search) {
            search.focus();
            search.select?.();
        }
    },

    renderCompra() {
        const container = document.getElementById('compra-container');
        if(!container) return;
        container.innerHTML = '';
        
        let conteo = this.getCompraConteo();
        
        const keys = Object.keys(conteo).sort();
        if (keys.length === 0) {
            container.innerHTML = '<div style="color:#555; text-align:center; padding:20px;">Aún no hay ingredientes cargados o seleccionados en tu planificador.</div>';
            return;
        }
        
        const ul = document.createElement('ul');
        ul.style.listStyleType = 'none';
        ul.style.padding = '0';
        ul.style.background = 'var(--card-bg)';
        ul.style.borderRadius = '12px';
        ul.style.boxShadow = 'var(--shadow)';
        
        keys.forEach(ing => {
            const li = document.createElement('li');
            li.style.padding = '12px 16px';
            li.style.borderBottom = '1px solid var(--border)';
            li.style.fontSize = '14px';
            let extra = conteo[ing] > 1 ? '<span style="color:var(--primary); font-weight:600; float:right;">x' + conteo[ing] + '</span>' : '';
            li.innerHTML = '<strong>- ' + ing + '</strong> ' + extra;
            ul.appendChild(li);
        });
        
        if (ul.lastChild) ul.lastChild.style.borderBottom = 'none';
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

    switchTab(tabId) {
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        
        document.getElementById(tabId).classList.add('active');
        const trigger = document.querySelector(`.nav-item[data-target="${tabId}"]`);
        if(trigger) trigger.classList.add('active');
    },
    
    buildDesktopNav() {
        const header = document.querySelector('.app-header');
        const nav = document.createElement('div');
        nav.className = 'desktop-nav';
        nav.style.display = 'flex';
        nav.style.gap = '20px';
        
        document.querySelectorAll('.nav-item').forEach(btn => {
            const clone = document.createElement('button');
            clone.className = 'nav-item';
            clone.innerHTML = btn.innerHTML;
            clone.onclick = () => this.switchTab(btn.dataset.target);
            nav.appendChild(clone);
        });
        
        header.insertBefore(nav, document.querySelector('.menu-container'));
        document.querySelector('.bottom-nav').style.display = 'none';
        
        // Re-bind to new desktop tabs
        document.querySelectorAll('.desktop-nav .nav-item').forEach(n => {
            n.addEventListener('click', function() {
                document.querySelectorAll('.desktop-nav .nav-item').forEach(x => x.classList.remove('active'));
                this.classList.add('active');
            });
        });
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
                this.loadCurrentWeekPlan();
            });
        }
        
        document.getElementById('search-platos').oninput = (e) => this.renderPlatos(e.target.value);
        const searchRecetas = document.getElementById('search-recetas');
        if (searchRecetas) {
            searchRecetas.oninput = (e) => this.renderRecetario(e.target.value);
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
                            cellHtml = `<a href="${absoluteUrl}" target="_blank" style="color:#4990E2; font-weight:bold;">${pname}</a>`;
                        }
                    }
                    celdas += `<td>${cellHtml}</td>`;
                });
                rows += `<tr><th>${etiqueta}</th>${celdas}</tr>`;
            });
        });

        const htmlStr = `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><title>Plan semanal comidas</title>
<style>
body { font-family: Arial, sans-serif; margin: 20px; color:#111; }
h1 { margin-bottom: 8px; }
table { width:100%; border-collapse: collapse; margin-top: 12px; }
th, td { border:1px solid #ccc; padding:10px; text-align:center; vertical-align:top; }
th { background:#f3f6fb; }
.small { color:#555; display:block; margin-bottom: 12px; }
@page { size: A4 landscape; margin: 12mm; }
</style></head><body>
<h1>Plan semanal de comidas</h1>
<div class="small">Lunes a domingo · comidas y cenas · primer y segundo plato</div>
<table>
<thead><tr><th></th>${DIAS.map(d => `<th>${d.charAt(0).toUpperCase() + d.slice(1)}</th>`).join('')}</tr></thead>
<tbody>${rows}</tbody>
</table>
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
