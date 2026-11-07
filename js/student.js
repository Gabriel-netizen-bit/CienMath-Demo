/**
 * CienMath · Vista de estudiantes.
 * UI independiente: reutiliza el calendario semanal y el módulo de fechas.
 * El constructor del profesor no se importa ni se modifica.
 */
import { todayCR, shift, weekday, pretty, clock, overlap } from './schedule.js';
import { renderWeeklyGrid } from './weekly-calendar.js';
import { loadStudentCatalog, isClosed, classTone, placesText } from './student-data.js';
import { reserveDemoClass } from './reservation-service.js';

const $ = id => document.getElementById(id);
const WEEKDAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
let { teachers, classes } = loadStudentCatalog();
let date = todayCR();
let view = 'week';
let selected = null;

// Sin profesores creados, no se presentan identidades ni horarios ficticios.
if (!teachers.length) {
    $('student-teacher').add(new Option('Sin profesores registrados', ''));
    $('student-teacher').disabled = true;
} else {
    for (const teacher of teachers) $('student-teacher').add(new Option(teacher.name, teacher.id));
}
$('student-teacher').onchange = render;
$('student-week').onclick = () => { view = 'week'; render(); };
$('student-year').onclick = () => { view = 'year'; render(); };
$('student-prev').onclick = () => { date = view === 'week' ? shift(date, -7) : shiftYear(date, -1); render(); };
$('student-next').onclick = () => { date = view === 'week' ? shift(date, 7) : shiftYear(date, 1); render(); };
$('student-date').onchange = () => { if ($('student-date').value) { date = $('student-date').value; render(); } };
$('student-close').onclick = () => $('student-booking').close();

function shiftYear(day, n) {
    const [y, m, d] = day.split('-').map(Number);
    const last = new Date(y + n, m, 0).getDate();
    return `${y + n}-${String(m).padStart(2, '0')}-${String(Math.min(d, last)).padStart(2, '0')}`;
}
function visibleClasses() {
    return classes.filter(item => item.published && item.teacherId === $('student-teacher').value);
}
function chooseDay(day) {
    date = day;
    view = 'week';
    render();
}
/** Ficha de reserva: datos fijos y explícitos antes de pedir información personal. */
function openBooking(item) {
    if (isClosed(item)) return;
    selected = item;
    $('student-booking-form').hidden = false;
    $('student-booking-success').hidden = true;
    $('student-reservation-status').textContent = 'Confirmación local de demostración. No se enviarán correos ni SMS reales.';
    $('student-booking-form').reset();
    const teacherRecord = teachers.find(t => t.id === item.teacherId);
    const subjectSelect = $('student-subject');
    for (const option of subjectSelect.options) option.disabled = !!option.value && !teacherRecord?.subjects.includes(option.value);
    const mode = item.online ? 'online' : 'onsite';
    for (const input of document.querySelectorAll('input[name=mode]')) { input.checked = input.value === mode; input.disabled = input.value !== mode; }
    $('student-mode-hint').textContent = item.online ? 'Modalidad en línea definida por el profesor.' : 'Modalidad presencial definida por el profesor.';
    const summary = $('student-booking-summary');
    summary.replaceChildren();
    const teacher = teachers.find(t => t.id === item.teacherId)?.name || 'Profesor';
    const details = [
        ['Fecha', `${WEEKDAYS[weekday(item.date)]} ${pretty(item.date)}`],
        ['Hora de inicio', clock(item.start)],
        ['Hora de finalización', clock(item.end)],
        ['Profesor', teacher],
        ['Tipo de clase', `${item.bachillerato ? 'Bachillerato · ' : ''}${placesText(item)}`]
    ];
    for (const [label, value] of details) {
        const row = document.createElement('div');
        row.className = 'student-summary-row';
        const dt = document.createElement('dt');
        const dd = document.createElement('dd');
        dt.textContent = label;
        dd.textContent = value;
        row.append(dt, dd);
        summary.append(row);
    }
    // Modalidad visible y seleccionable con un toque. Presencial inicia marcada.
    $('student-booking').showModal();
    $('student-name').focus();
}
/** Tarjetas de hasta cuatro líneas; sin la etiqueta redundante «Clase común». */
function createStudentCard(item, _weekly, top, height) {
    const closed = isClosed(item);
    const card = document.createElement('button');
    card.type = 'button';
    card.className = `weekcard student-slot published ${closed ? 'booked' : ''} ${classTone(item)}`;
    card.style.top = `${top}px`;
    card.style.height = `${height}px`;
    card.disabled = closed;
    const state = closed ? 'Reservada' : 'Disponible';
    const texts = item.bachillerato
        ? [`${clock(item.start)}–${clock(item.end)}`, 'Bachillerato', state, placesText(item)]
        : item.group
            ? [`${clock(item.start)}–${clock(item.end)}`, state, 'Grupal', `${Number(item.enrolled || 0)}/${item.capacity} cupos`]
            : [`${clock(item.start)}–${clock(item.end)}`, state, 'Individual'];
    const kinds = item.bachillerato
        ? ['hours', 'student-type', 'student-state', 'student-places']
        : ['hours', 'student-state', 'student-type', 'student-places'];
    for (const [i, value] of texts.entries()) {
        const line = document.createElement('span');
        line.className = kinds[i];
        line.textContent = value;
        card.append(line);
    }
    card.title = texts.join(' · ') + (closed ? ' · Sin cupos' : ' · Seleccionar para reservar');
    card.setAttribute('aria-label', card.title);
    if (!closed) card.onclick = () => openBooking(item);
    return card;
}
function renderWeek(items) {
    renderWeeklyGrid({
        container: $('week'), scrollContainer: $('weekarea'), date,
        shift, weekday, weekdays: WEEKDAYS, classes: items,
        createCard: createStudentCard, identity: c => c.id, overlap,
        selectedDate: date, selectMode: false,
        onSelectDay: chooseDay, onNavigateDay: chooseDay,
        isDayFullySelected: () => false
    });
}
function yearMonth(year, month, items) {
    const panel = document.createElement('section');
    panel.className = 'year-month';
    const title = document.createElement('h4');
    title.textContent = new Intl.DateTimeFormat('es-CR', { month: 'long' }).format(new Date(year, month, 1));
    panel.append(title);
    const days = document.createElement('div');
    days.className = 'year-days';
    for (const label of ['L', 'M', 'X', 'J', 'V', 'S', 'D']) {
        const el = document.createElement('span');
        el.className = 'year-weekday';
        el.textContent = label;
        days.append(el);
    }
    const first = (new Date(year, month, 1).getDay() + 6) % 7;
    for (let i = 0; i < first; i++) {
        const blank = document.createElement('span');
        blank.className = 'year-blank';
        days.append(blank);
    }
    const last = new Date(year, month + 1, 0).getDate();
    for (let d = 1; d <= last; d++) {
        const day = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'year-day student-year-day';
        button.textContent = String(d);
        if (day === date) button.classList.add('today-selected');
        const events = items.filter(c => c.date === day);
        if (events.length) {
            const dots = document.createElement('span');
            dots.className = 'year-dots';
            for (const tone of [...new Set(events.map(classTone))]) {
                const dot = document.createElement('i');
                dot.className = `student-dot ${tone}`;
                dots.append(dot);
            }
            button.append(dots);
        }
        button.setAttribute('aria-label', `${pretty(day)} · ${events.length} clase(s). Ver semana`);
        button.onclick = () => chooseDay(day);
        days.append(button);
    }
    panel.append(days);
    return panel;
}
function renderYear(items) {
    const year = Number(date.slice(0, 4));
    const fragment = document.createDocumentFragment();
    for (let month = 0; month < 12; month++) fragment.append(yearMonth(year, month, items));
    $('student-yeargrid').replaceChildren(fragment);
}
function render() {
    const items = visibleClasses();
    const monday = shift(date, -weekday(date));
    const end = shift(monday, 6);
    $('student-title').textContent = view === 'week'
        ? `Semana · ${pretty(monday)} al ${pretty(end)}`
        : `Calendario · ${date.slice(0, 4)}`;
    const visible = view === 'week' ? items.filter(c => c.date >= monday && c.date <= end) : items.filter(c => c.date.startsWith(date.slice(0, 4)));
    const available = visible.filter(c => !isClosed(c)).length;
    $('student-summary').textContent = !teachers.length
        ? 'Sin profesores registrados'
        : `${available} disponible${available === 1 ? '' : 's'} · ${visible.length} clase${visible.length === 1 ? '' : 's'}`;
    $('student-empty-state').hidden = visible.length > 0;
    $('student-empty-state').textContent = !teachers.length
        ? 'Todavía no hay profesores registrados. Sus horarios aparecerán aquí cuando estén configurados.'
        : 'Este profesor aún no tiene horarios publicados en el período seleccionado.';
    $('student-date').value = date;
    $('student-week').classList.toggle('active', view === 'week');
    $('student-year').classList.toggle('active', view === 'year');
    $('student-week').setAttribute('aria-pressed', String(view === 'week'));
    $('student-year').setAttribute('aria-pressed', String(view === 'year'));
    $('weekarea').hidden = view !== 'week';
    $('student-yeararea').hidden = view !== 'year';
    if (view === 'week') renderWeek(items);
    else renderYear(items);
}

// Reservación DEMO con cupos persistentes en el mismo navegador.
$('student-booking-form').addEventListener('submit', event => {
    event.preventDefault();
    if (!$('student-booking-form').reportValidity() || !selected) return;
    const status = $('student-reservation-status');
    try {
        const reservation = reserveDemoClass({
            teacherId: selected.teacherId, classId: selected.id.split(':').slice(-1)[0],
            name: $('student-name').value, email: $('student-email').value,
            subject: $('student-subject').value, grade: $('student-grade').value,
            mode: document.querySelector('input[name=mode]:checked')?.value
        });
        $('student-booking-form').hidden = true;
        $('student-booking-success').hidden = false;
        $('student-success-reference').textContent = reservation.id;
        $('student-success-detail').textContent = `${reservation.teacherName} · ${pretty(reservation.date)} · ${clock(reservation.start)}–${clock(reservation.end)}`;
        ({ teachers, classes } = loadStudentCatalog());
        selected = null;
        render();
    } catch (error) {
        status.textContent = error.message;
        ({ teachers, classes } = loadStudentCatalog());
        render();
    }
});
$('student-success-close').addEventListener('click', () => $('student-booking').close());
render();
