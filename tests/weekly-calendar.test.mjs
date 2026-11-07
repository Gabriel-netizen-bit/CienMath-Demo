import assert from 'node:assert/strict';
import { renderWeeklyGrid } from '../js/weekly-calendar.js';

// DOM mínimo para verificar geometría, navegación y accesibilidad sin navegador.
class FakeElement {
    constructor(tag) {
        this.tag = tag;
        this.children = [];
        this.style = {};
        this.dataset = {};
        this.scrollTop = 0;
        this.attributes = {};
        this.classes = new Set();
        Object.defineProperty(this, 'className', {
            get: () => [...this.classes].join(' '),
            set: value => { this.classes = new Set(value.split(/\s+/).filter(Boolean)); }
        });
        this.classList = { add: (...items) => items.forEach(item => this.classes.add(item)) };
    }
    append(...items) { this.children.push(...items); }
    replaceChildren(...items) {
        this.children = items.flatMap(item => item.tag === 'fragment' ? item.children : [item]);
    }
    setAttribute(key, value) { this.attributes[key] = value; }
}
globalThis.document = {
    createElement: tag => new FakeElement(tag),
    createDocumentFragment: () => new FakeElement('fragment')
};

const shift = (date, delta) => {
    const d = new Date(`${date}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + delta);
    return d.toISOString().slice(0, 10);
};
const weekday = date => (new Date(`${date}T12:00:00Z`).getUTCDay() + 6) % 7;
const weekdays = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const container = new FakeElement('div');
const scrollContainer = new FakeElement('div');
let chosen = null, selected = null;
const base = {
    container, scrollContainer, date: '2026-12-18', shift, weekday, weekdays,
    classes: [], selectedDate: '2026-12-18', selectMode: false,
    identity: item => item.id, overlap: (a, b) => a.start < b.end && b.start < a.end,
    createCard: (item, _weekly, top, height) => {
        const card = new FakeElement('button');
        card.item = item;
        card.style.top = `${top}px`;
        card.style.height = `${height}px`;
        return card;
    },
    onNavigateDay: day => chosen = day,
    onSelectDay: day => selected = day,
    isDayFullySelected: () => false
};

// Una semana vacía siempre muestra 7 días y escala completa 07–22.
renderWeeklyGrid(base);
assert.equal(container.children.length, 9);
assert.equal(container.children[0].className, 'week-headers');
assert.equal(container.children[0].children.length, 8);
const axis = container.children[1].children[0];
assert.equal(axis.children.length, 16);
assert.equal(axis.children[0].textContent, '07:00');
assert.equal(axis.children.at(-1).textContent, '22:00');
assert.equal(container.children[2].children[0].style.height, '1172px');
assert.equal(container.children[2].children[0].children.filter(el => el.classes.has('week-hour-line')).length, 16);
assert.ok(container.children[2].children[0].children.some(el => el.classes.has('noon')));

// El encabezado sincroniza la fecha sin cambiar de vista.
const thursday = container.children[0].children[4];
assert.equal(thursday.textContent, 'Jue 17');
thursday.onclick();
assert.equal(chosen, '2026-12-17');
assert.equal(thursday.attributes.tabindex, '0');

// En modo selección, conservar la selección masiva previa.
renderWeeklyGrid({ ...base, selectMode: true });
container.children[0].children[4].onclick();
assert.equal(selected, '2026-12-17');

// Horario extraordinario de madrugada y noche: solo crece el contenido.
const unusual = [
    { id: 1, date: '2026-12-17', start: 120, end: 180 },
    { id: 2, date: '2026-12-18', start: 1380, end: 1430 }
];
renderWeeklyGrid({ ...base, classes: unusual });
assert.equal(scrollContainer.dataset.weekOrigin, '120');
assert.ok(Math.abs(Number.parseFloat(container.children[2].children[0].style.height) - 1718) < .01);
assert.equal(Number.parseFloat(container.children[5].children[0].children.at(-1).style.top), 0);
assert.ok(Math.abs(Number.parseFloat(container.children[6].children[0].children.at(-1).style.top) - 1638) < .01);
assert.ok(scrollContainer.scrollTop > 0, 'Inicio normal visible aunque existan clases de madrugada');
// La escala permite tarjetas completas de 50 min; las breves no cortan texto.
const shortSlots = [
    { id: 3, date: '2026-12-18', start: 600, end: 650 },
    { id: 4, date: '2026-12-18', start: 660, end: 700 }
];
renderWeeklyGrid({ ...base, classes: shortSlots });
const fridayLane = container.children[6].children[0];
const fifty = fridayLane.children.find(el => el.item?.id === 3);
const forty = fridayLane.children.find(el => el.item?.id === 4);
assert.ok(fifty && forty);
assert.equal(fifty.classes.has('compact'), false);
assert.equal(forty.classes.has('compact'), true);
assert.ok(Number.parseFloat(fifty.style.height) > 60);
console.log('Vista semanal: 8 comprobaciones superadas.');
