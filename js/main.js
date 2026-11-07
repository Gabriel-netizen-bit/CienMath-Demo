import { todayCR, shift, weekday, pretty, minutes, clock, overlap, validTime, makeSlots, conflictsFor } from './schedule.js';
import { createStore, clone } from './store.js';
import { createNotifier } from './notifications.js';
import { batchReplacementPlan } from './conflict-actions.js';
import { createBulkDelete } from './bulk-delete.js';
import { renderWeeklyGrid } from './weekly-calendar.js';
import { initRepeatWindow } from './repeat-window.js';
import { loadTeachers, teacherClassesKey } from './teacher-repository.js';
import { currentDemoProfile, endDemoSession } from './demo-session.js';
import { canManageTeachers, canOpenCalendar } from './access-service.js';
const profile = currentDemoProfile();
const requestedTeacherId = new URLSearchParams(location.search).get('profesor');
if (!canOpenCalendar(profile, requestedTeacherId, loadTeachers())) {
    location.replace(profile && canManageTeachers(profile) ? 'profesores.html' : 'acceso.html');
    throw new Error('Calendario fuera del perfil de demostración seleccionado.');
}
document.body.style.visibility = 'visible';
if (canManageTeachers(profile)) document.querySelector('.site-header .site-back').href = 'panel.html';
document.getElementById('calendar-role-caption').textContent = canManageTeachers(profile) ? 'Academia Virtual · Administración' : 'Academia Virtual · Profesor';
document.getElementById('demo-logout').addEventListener('click', () => { endDemoSession(); location.href = 'index.html'; });
const $ = id => document.getElementById(id), root = $('app');
// La misma herramienta se abre para cada profesor, sin duplicar el constructor.
const teacherId = requestedTeacherId;
const teacher = teacherId ? loadTeachers().find(t => t.id === teacherId) : null;
const store = createStore(teacher ? teacherClassesKey(teacher.id) : null);
const weekdays = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
let view = 'day', weekDate = todayCR(), days = [weekday(todayCR())], batch = null, selected = null, previewCount = 0, drag = null;
// Fechas y días del constructor: seguimiento de cambios manuales.
let repeatFromTouched = false, repeatDaysTouched = false;
let reserveMode = false, reserveExcluded = new Set(); // V13.7: gestión manual de reservas en rango.
// V13.8: selección directa de clases existentes, conservada entre vistas.
let selectMode = false, selectedIds = new Set();
// V13.8.2: días de replicación propios de la selección; independientes de Desde/Hasta.
let copyDays = [], copyDaysTouched = false, copyDatesTouched = false, lastCopySelection = "";
$('date').value = todayCR();
$('jump').value = todayCR();
$('from').value = todayCR();
$('until').value = monthLater(todayCR());
$('copy-to').value = todayCR();
$('copy-until').value = todayCR();

// ===========================================================================
// 01 — Fechas, estado inicial y utilidades del constructor
// ===========================================================================
function monthLater(d) { const [y, m, day] = d.split('-').map(Number); const first = new Date(y, m, 1, 12); const last = new Date(first.getFullYear(), first.getMonth() + 1, 0, 12).getDate(); return `${first.getFullYear()}-${String(first.getMonth() + 1).padStart(2, '0')}-${String(Math.min(day, last)).padStart(2, '0')}`; }
function syncUntil() { if (!$('until').value || $('until').value < $('from').value)
    $('until').value = $('from').value; }
for (let i = 5; i <= 240; i += 5) {
    const o = new Option(i + ' minutos', String(i), false, i === 50);
    $('duration').add(o);
}
for (let i = 1; i <= 30; i++)
    $('count').add(new Option(i + (i === 1 ? ' clase' : ' clases'), String(i), false, i === 1));

// ===========================================================================
// 02 — Estado compartido, almacén y dependencias modulares
// ===========================================================================
const current = () => batch ? batch.existing : store.classes;
const proposals = () => batch ? batch.proposals : [];
const all = () => [...current(), ...proposals()];
const identity = b => b.proposed ? 'p:' + b.key : 'e:' + b.id;
const findSelected = () => all().find(x => identity(x) === selected);
const blockers = b => conflictsFor(b, all());
const conflicts = () => batch ? batch.proposals.filter(b => blockers(b).length) : [];
const notify = createNotifier($('message'), $('toast-area'));
// Borrado masivo centralizado: rango, selección directa y limpieza de borradores.
// main.js conserva el calendario, los controles y las operaciones individuales.
const bulkDelete = createBulkDelete({
    $, root, store, pretty, weekday, notify, selectedIds,
    getDays: () => days, hasBatch: () => !!batch,
    hasReserveMode: () => reserveMode, disableReserveMode: () => toggleReserveMode(false),
    hasSelectMode: () => selectMode, disableSelectMode: () => toggleSelectMode(false),
    getSelectionItems: () => selectionItems(), closeEditor, render
});
// V13.6: atributos independientes por clase, replicables con cada horario.

// ===========================================================================
// 03 — Atributos de clase y controles del formulario
// ===========================================================================
const classAttrs = b => ({ group: !!b.group, capacity: b.group ? (Number.isInteger(Number(b.capacity)) && Number(b.capacity) >= 2 ? Number(b.capacity) : 2) : 1, online: !!b.online, bachillerato: !!b.bachillerato });
function readAttributes(prefix) {
    const group = $(prefix + 'group').checked, online = $(prefix + 'online').checked;
    const bachillerato = $(prefix + 'bachillerato').checked;
    const capacity = group ? Number($(prefix + 'capacity').value) : 1;
    if (group && (!Number.isInteger(capacity) || capacity < 2 || capacity > 999))
        return null;
    return { group, capacity, online, bachillerato, booked: prefix === '' ? $('booked').checked : undefined };
}
function syncAttributeControls(prefix) {
    const group = $(prefix + 'group').checked;
    $(prefix + 'capacity').disabled = !group;
    $(prefix === 'edit-' ? 'edit-mode-description' : 'mode-description').textContent = $(prefix + 'online').checked ? 'Virtual' : 'Presencial';
    if (prefix === '')
        $('booking-description').textContent = $('booked').checked ? 'Reservada' : 'No reservada';
}
// Reserva manual por rango: no sustituye la futura inscripción de estudiantes.

// ===========================================================================
// 04 — Gestión de reservas manuales por rango (no es borrado)
// ===========================================================================
function reserveSelection() {
    if (!reserveMode)
        return { targets: [], invalid: false };
    const from = $('from').value, to = $('until').value;
    if (!from || !to || from > to || !days.length)
        return { targets: [], invalid: true };
    const desired = $('reserve-action').value === 'book';
    return { targets: store.classes.filter(b => b.date >= from && b.date <= to && days.includes(weekday(b.date)) && b.booked !== desired && Number(b.enrolled || 0) === 0 && !reserveExcluded.has(b.id)), invalid: false };
}
function updateReservePreview() {
    if (!reserveMode)
        return;
    const { targets, invalid } = reserveSelection();
    const booking = $('reserve-action').value === 'book';
    $('reserve-summary').textContent = invalid ? 'Selecciona fechas y días válidos.' : `${targets.length} clase(s) para ${booking ? 'reservar' : 'liberar'} · pulsa una tarjeta resaltada para excluirla.`;
    $('apply').disabled = invalid || !targets.length;
    $('apply').textContent = targets.length ? `${booking ? 'Reservar' : 'Liberar'} ${targets.length} clase(s)` : 'Sin clases para cambiar';
}
function toggleReserveMode(enabled) {
    if (enabled && batch) {
        $('reserve-mode').checked = false;
        notify('Resuelve las coincidencias antes de gestionar reservas.');
        return;
    }
    if (enabled && bulkDelete.isActive())
        bulkDelete.toggleMode(false);
    if (enabled && selectMode)
        toggleSelectMode(false);
    reserveMode = enabled;
    reserveExcluded.clear();
    $('reserve-mode').checked = enabled;
    root.classList.toggle('reserve-mode', enabled);
    $('reserve-options').hidden = !enabled;
    $('reserve-summary').hidden = !enabled;
    $('repeat-title').textContent = enabled ? 'Gestionar reservas' : 'Repetir horario';
    $('repeat-hint').textContent = enabled ? 'Días de las clases que cambiarán' : 'Días de la semana';
    if (!enabled) {
        $('apply').disabled = false;
        $('apply').textContent = 'Aplicar repetición';
    }
    if (enabled) {
        closeEditor();
        notify('Reserva manual: elige días y fechas; revisa las tarjetas resaltadas antes de confirmar.');
    }
    render();
}
function applyReservations() {
    if (!reserveMode || batch)
        return;
    const { targets, invalid } = reserveSelection();
    if (invalid || !targets.length) {
        notify('No hay clases para cambiar.', 'warning');
        return;
    }
    const booked = $('reserve-action').value === 'book', verb = booked ? 'RESERVAR' : 'QUITAR LA RESERVA DE';
    if (!confirm(`¿${verb} ${targets.length} clase(s) del rango seleccionado?\n\nEsta es una reserva manual de demostración, sin estudiantes asociados.`)) {
        notify('Sin cambios en las reservas.');
        return;
    }
    const ids = new Set(targets.map(x => x.id));
    store.classes.forEach(b => { if (ids.has(b.id))
        b.booked = booked; });
    store.persist();
    toggleReserveMode(false);
    notify(`${ids.size} clase(s) ${booked ? 'marcadas como reservadas' : 'liberadas'}.`, 'success');
}
// Selección directa: funciona en Día, Semana y Año, sin depender del último lote creado.

// ===========================================================================
// 05 — Selección directa y replicación de clases
// ===========================================================================
function selectionItems() { return store.classes.filter(b => selectedIds.has(b.id)).sort((a, b) => a.date.localeCompare(b.date) || a.start - b.start); }
function renderCopyDays() {
    $('copy-days').replaceChildren();
    ['L', 'M', 'X', 'J', 'V', 'S', 'D'].forEach((letter, i) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.textContent = letter;
        b.className = copyDays.includes(i) ? 'active' : '';
        b.setAttribute('aria-pressed', String(copyDays.includes(i)));
        b.setAttribute('aria-label', weekdays[i]);
        b.onclick = () => { copyDaysTouched = true; copyDays = copyDays.includes(i) ? copyDays.filter(x => x !== i) : [...copyDays, i].sort((a, b) => a - b); renderCopyDays(); updateSelectionSummary(); };
        $('copy-days').append(b);
    });
}
function updateSelectionSummary() {
    if (!selectMode)
        return;
    const items = selectionItems(), reserved = items.filter(b => b.booked).length;
    const signature = items.map(b => b.id).join(',');
    if (signature !== lastCopySelection) {
        // Los días originales son el valor predeterminado, incluso para clases antiguas.
        if (!copyDaysTouched)
            copyDays = [...new Set(items.map(b => weekday(b.date)))].sort((a, b) => a - b);
        if (items.length && !copyDatesTouched) {
            $('copy-to').value = items[0].date;
            $('copy-until').value = monthLater(items[0].date);
        }
        if (!items.length) {
            copyDays = [];
            copyDaysTouched = false;
            copyDatesTouched = false;
        }
        lastCopySelection = signature;
        renderCopyDays();
    }
    $('selection-summary').textContent = `${items.length} clase(s) seleccionada(s)` + (reserved ? ` · ${reserved} reservada(s) requieren autorización para liberar` : '');
    $('copy-selection').disabled = !items.length || !copyDays.length || !$('copy-to').value || !$('copy-until').value || $('copy-until').value < $('copy-to').value;
    $('delete-selection').disabled = !items.length;
    $('clear-selection').disabled = !items.length;
}
function toggleSelectMode(enabled) {
    if (enabled && batch) {
        $('select-mode').checked = false;
        notify('Confirma o cancela las coincidencias antes de seleccionar clases.');
        return;
    }
    if (enabled && bulkDelete.isActive())
        bulkDelete.toggleMode(false);
    if (enabled && reserveMode)
        toggleReserveMode(false);
    selectMode = enabled;
    selectedIds.clear();
    copyDays = [];
    copyDaysTouched = false;
    copyDatesTouched = false;
    lastCopySelection = "";
    $('select-mode').checked = enabled;
    $('selection-tools').hidden = !enabled;
    $('range-controls').hidden = enabled;
    $('select-day').hidden = !enabled || view !== 'day';
    root.classList.toggle('select-mode', enabled);
    if (enabled) {
        closeEditor();
        $('rep').hidden = false;
        notify('Seleccioná tarjetas, días completos o fechas del año. No se modifica nada hasta confirmar.');
    }
    render();
}
function toggleSelectedDay(d) {
    if (!selectMode)
        return;
    const matches = store.classes.filter(b => b.date === d);
    if (!matches.length) {
        notify('Este día no tiene clases existentes.');
        return;
    }
    const allMarked = matches.every(b => selectedIds.has(b.id));
    for (const b of matches) {
        if (allMarked)
            selectedIds.delete(b.id);
        else
            selectedIds.add(b.id);
    }
    render();
}
function copySelection() {
    const items = selectionItems(), target = $('copy-to').value, until = $('copy-until').value;
    if (!items.length || !target || !until || until < target || !copyDays.length) {
        notify('Seleccioná clases, al menos un día y un rango Desde / Hasta válido.', 'warning');
        return;
    }
    const span = Math.round((new Date(until + 'T12:00:00') - new Date(target + 'T12:00:00')) / 86400000);
    if (span > 1095) {
        notify('Máximo tres años por lote.', 'warning');
        return;
    }
    // Cada clase es una plantilla de horario/atributos. Se aplica a TODOS los días
    // elegidos; el día de la fecha Desde nunca cambia los días seleccionados.
    const copies = [], seen = new Set();
    for (let i = 0; i <= span; i++) {
        const date = shift(target, i);
        if (!copyDays.includes(weekday(date)))
            continue;
        for (const b of items) {
            const copy = { date, start: b.start, end: b.end, group: !!b.group, capacity: b.capacity, online: !!b.online, bachillerato: !!b.bachillerato, booked: false };
            const key = [date, copy.start, copy.end, copy.group, copy.capacity, copy.online, copy.bachillerato].join('|');
            if (!seen.has(key)) {
                seen.add(key);
                copies.push(copy);
            }
        }
    }
    if (!copies.length) {
        notify('No hay días seleccionados dentro del rango indicado.', 'warning');
        return;
    }
    if (copies.some(b => !validTime(b.start, b.end))) {
        notify('Hay clases con horarios inválidos.', 'warning');
        return;
    }
    // No crear superposiciones internas entre las plantillas de una misma operación.
    if (copies.some((a, i) => copies.some((b, j) => j > i && overlap(a, b)))) {
        notify('Los horarios seleccionados se superponen al replicarlos en los mismos días. Seleccioná horarios compatibles o replicá cada grupo por separado.', 'warning');
        return;
    }
    if (!confirm(`¿Replicar ${copies.length} clase(s) del ${pretty(target)} al ${pretty(until)}?\nDías: ${copyDays.map(i => weekdays[i]).join(', ')}.\nSe conservarán los horarios y atributos de cada clase. Las copias serán borradores SIN reservas.\nSi coinciden con clases existentes, podrás resolver las coincidencias.`))
        return;
    toggleSelectMode(false);
    submit(copies, true);
}

// ===========================================================================
// 06 — Cálculo y vista previa de clases nuevas
// ===========================================================================
function plan() { const s = minutes($('start').value), duration = Number($('duration').value), byCount = $('mode').value === 'count', end = byCount ? s + duration * Number($('count').value) : minutes($('end').value), count = byCount ? Number($('count').value) : Math.max(0, Math.floor((end - s) / duration)); return { slots: validTime(s, end) && count > 0 ? makeSlots($('date').value, s, duration, count) : [], remaining: byCount ? 0 : Math.max(0, end - s - count * duration) }; }
function durationWarning() {
    if ($('mode').value !== 'end')
        return '';
    const start = minutes($('start').value), end = minutes($('end').value), duration = Number($('duration').value);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start || !duration)
        return '';
    const available = end - start;
    return available < duration ? `El intervalo es de ${available} minutos; la clase necesita ${duration}. Ampliá la hora final o reducí la duración.` : '';
}
function updatePlan() {
    const p = plan(), warning = durationWarning();
    previewCount = p.slots.length;
    $('calc').textContent = warning || (p.slots.length ? `${p.slots.length} ${p.slots.length === 1 ? 'clase' : 'clases'} · ${p.remaining ? 'Sobran ' + p.remaining + ' minutos' : 'Sin minutos sobrantes'}` : 'Selecciona horas válidas de cinco en cinco');
    for (const id of ['calc', 'duration', 'end'])
        $(id).classList.toggle('duration-warning', !!warning);
    $('calc').dataset.kind = warning ? 'warning' : '';
    render();
}

// ===========================================================================
// 07 — Representación e interacción de tarjetas
// ===========================================================================
function createCard(b, weekly, top, height) {
    const el = document.createElement('button'), isNew = !!b.proposed;
    const conflict = isNew && batch && blockers(b).length > 0;
    el.type = 'button';
    el.className = (weekly ? 'weekcard' : 'timecard') + (isNew ? ' new' : '') + (b.published ? ' published' : '') + (b.booked ? ' booked' : '') + (selected === identity(b) ? ' active' : '') + (!weekly && height < 36 ? ' tiny' : !weekly && height < 68 ? ' compact' : '');
    el.style.top = top + 'px';
    el.style.height = height + 'px';
    const hour = document.createElement('span');
    hour.className = 'hours';
    hour.textContent = clock(b.start) + (weekly ? '–' : ' – ') + clock(b.end);
    const tag = document.createElement('span');
    tag.className = 'tag';
    tag.textContent = conflict ? 'Coincidencia' : b.booked ? 'Reservada' : isNew ? 'Disponible' : b.published ? 'Publicada' : 'Disponible';
    const meta = document.createElement('span');
    meta.className = 'class-meta';
    const attrs = classAttrs(b), kind = document.createElement('span'), mode = document.createElement('span');
    kind.textContent = attrs.group ? 'Grupal · ' + attrs.capacity + ' cupos' : 'Individual';
    mode.textContent = attrs.online ? 'En línea' : 'Presencial';
    meta.append(kind, mode);
    if (attrs.bachillerato) {
        const bach = document.createElement('span');
        bach.className = 'bach-label';
        bach.textContent = 'Bachillerato';
        meta.prepend(bach);
        el.classList.add('bach-class');
    }
    el.append(hour, tag, meta);
    el.title = clock(b.start) + '–' + clock(b.end) + ' · ' + tag.textContent + ' · ' + (attrs.bachillerato ? 'Bachillerato · ' : '') + kind.textContent + ' · ' + mode.textContent;
    if (selectMode && !isNew)
        el.classList.toggle('direct-selected', selectedIds.has(b.id));
    if (bulkDelete.isActive() && !isNew) {
        const { targets, protectedClasses } = bulkDelete.selection();
        const marked = [...targets, ...protectedClasses].some(x => x.id === b.id);
        el.classList.toggle('erase-target', marked);
        el.title = marked ? (b.booked ? 'Reservada: requiere autorización para liberar · clic para excluirla' : 'Seleccionada para eliminar · clic para excluirla') : 'Clic para incluir/excluir del borrado';
    }
    if (bulkDelete.isActive() && b.booked)
        el.classList.add('erase-protected');
    if (reserveMode && !isNew) {
        const { targets } = reserveSelection(), marked = targets.some(x => x.id === b.id);
        el.classList.toggle('reserve-target', marked);
        if (marked)
            el.title = 'Seleccionada para cambiar reserva · clic para excluirla';
    }
    el.onclick = () => {
        if (selectMode) {
            if (b.proposed)
                return;
            if (selectedIds.has(b.id))
                selectedIds.delete(b.id);
            else
                selectedIds.add(b.id);
            render();
            return;
        }
        if (bulkDelete.isActive()) {
            if (b.proposed)
                return;
            bulkDelete.toggleExcluded(b);
            render();
            return;
        }
        if (reserveMode) {
            if (b.proposed)
                return;
            const desired = $('reserve-action').value === 'book';
            if (b.date < $('from').value || b.date > $('until').value || !days.includes(weekday(b.date)) || b.booked === desired) {
                notify('Esta clase está fuera del rango o ya tiene ese estado.');
                return;
            }
            if (reserveExcluded.has(b.id))
                reserveExcluded.delete(b.id);
            else
                reserveExcluded.add(b.id);
            render();
            return;
        }
        openEditor(identity(b));
    };
    return el;
}

// ===========================================================================
// 08 — Calendarios diario, semanal y anual
// ===========================================================================
function renderDay() {
    const d = $('date').value, old = current().filter(x => x.date === d), news = proposals().filter(x => x.date === d), two = batch && news.length > 0;
    const items = [...old, ...news];
    $('daylegend').classList.toggle('conflicting', two);
    $('timeline').classList.toggle('conflicting', two);
    $('proposed-label').hidden = !two;
    $('empty').hidden = items.length > 0;
    const low = items.length ? Math.max(0, Math.floor(Math.min(...items.map(x => x.start)) / 30) * 30) : 420;
    const high = items.length ? Math.min(1440, Math.ceil(Math.max(...items.map(x => x.end)) / 30) * 30) : 660;
    const shortest = items.length ? Math.min(...items.map(x => x.end - x.start)) : 50;
    const span = Math.max(1, high - low);
    const scale = Math.max(1.14, Math.min(3.3, 88 / Math.max(5, shortest), 1600 / span));
    const h = Math.max(230, span * scale + 9);
    const axis = document.createElement('div');
    axis.className = 'axis';
    axis.style.height = h + 'px';
    const oldTrack = document.createElement('div'), newTrack = document.createElement('div');
    oldTrack.className = newTrack.className = 'track';
    oldTrack.style.height = newTrack.style.height = h + 'px';
    for (let t = low; t <= high; t += 30) {
        const label = document.createElement('div');
        label.className = 'axislabel';
        label.style.top = (t - low) * scale + 'px';
        label.textContent = clock(t);
        axis.append(label);
        for (const track of [oldTrack, newTrack]) {
            const line = document.createElement('div');
            line.className = 'tick';
            line.style.top = (t - low) * scale + 'px';
            track.append(line);
        }
    }
    old.forEach(b => oldTrack.append(createCard(b, false, (b.start - low) * scale, Math.max(3, (b.end - b.start) * scale - 2))));
    news.forEach(b => (two ? newTrack : oldTrack).append(createCard(b, false, (b.start - low) * scale, Math.max(3, (b.end - b.start) * scale - 2))));
    $('timeline').replaceChildren(axis, oldTrack, ...(two ? [newTrack] : []));
}
function renderWeek() {
    // La cuadrícula y la escala horaria viven en un módulo independiente.
    // Las acciones existentes (selección, reservas y edición) se conservan.
    renderWeeklyGrid({
        container: $('week'),
        scrollContainer: $('weekarea'),
        date: weekDate,
        shift, weekday, weekdays,
        classes: all(),
        createCard, identity, overlap,
        selectedDate: $('date').value,
        selectMode,
        onSelectDay: toggleSelectedDay,
        onNavigateDay: syncDateFromMap,
        isDayFullySelected: d => {
            const existing = store.classes.filter(b => b.date === d);
            return existing.length > 0 && existing.every(b => selectedIds.has(b.id));
        }
    });
}
// V13.5: vista anual de solo navegación. No modifica clases ni el almacén.
function renderYear() {
    const year = Number(weekDate.slice(0, 4));
    $('yearlabel').textContent = String(year);
    const indexed = new Map();
    // Misma selección por rango que utilizan las tarjetas diarias y semanales.
    const reserveDates = new Set(reserveSelection().targets.map(b => b.date));
    const { targets: eraseTargets, protectedClasses: eraseProtected } = bulkDelete.selection();
    const eraseDates = new Set([...eraseTargets, ...eraseProtected].map(b => b.date));
    for (const b of all()) {
        if (!b.date.startsWith(String(year)))
            continue;
        if (!indexed.has(b.date))
            indexed.set(b.date, { draft: false, published: false, booked: false, conflict: false });
        const states = indexed.get(b.date);
        if (b.booked)
            states.booked = true;
        else if (b.proposed)
            states.conflict = true;
        else if (b.published)
            states.published = true;
        else
            states.draft = true;
    }
    const fragment = document.createDocumentFragment();
    const weekdayLabels = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
    for (let month = 0; month < 12; month++) {
        const panel = document.createElement('section');
        panel.className = 'year-month';
        const heading = document.createElement('h4');
        heading.textContent = new Intl.DateTimeFormat('es-CR', { month: 'long' }).format(new Date(year, month, 1));
        panel.append(heading);
        const daysGrid = document.createElement('div');
        daysGrid.className = 'year-days';
        for (const label of weekdayLabels) {
            const w = document.createElement('span');
            w.className = 'year-weekday';
            w.textContent = label;
            daysGrid.append(w);
        }
        const first = (new Date(year, month, 1).getDay() + 6) % 7;
        const count = new Date(year, month + 1, 0).getDate();
        for (let k = 0; k < 42; k++) {
            const day = k - first + 1;
            if (day < 1 || day > count) {
                const blank = document.createElement('span');
                blank.className = 'year-blank';
                daysGrid.append(blank);
                continue;
            }
            const date = String(year) + '-' + String(month + 1).padStart(2, '0') + '-' + String(day).padStart(2, '0');
            const cell = document.createElement('button');
            cell.type = 'button';
            cell.className = 'year-day';
            cell.textContent = String(day);
            cell.setAttribute('aria-label', pretty(date));
            if (date === $('date').value)
                cell.classList.add('today-selected');
            const status = indexed.get(date);
            if (status) {
                cell.classList.add('has-classes');
                const dots = document.createElement('span');
                dots.className = 'year-dots';
                for (const kind of ['draft', 'published', 'booked', 'conflict'])
                    if (status[kind]) {
                        const dot = document.createElement('i');
                        dot.className = 'dot ' + kind;
                        dots.append(dot);
                    }
                cell.append(dots);
                cell.setAttribute('aria-label', pretty(date) + ' · ' + [status.draft ? 'borradores' : null, status.published ? 'publicadas' : null, status.booked ? 'reservadas' : null, status.conflict ? 'coincidencias' : null].filter(Boolean).join(', '));
            }
            if (reserveMode && reserveDates.has(date)) {
                cell.classList.add('reserve-target');
                cell.title = 'Clases seleccionadas para cambiar reserva';
            }
            if (bulkDelete.isActive() && eraseDates.has(date)) {
                cell.classList.add('erase-target');
                cell.title = 'Clases seleccionadas para eliminar';
            }
            if (selectMode) {
                cell.classList.add('year-selectable');
                if (store.classes.some(b => b.date === date) && store.classes.filter(b => b.date === date).every(b => selectedIds.has(b.id)))
                    cell.classList.add('day-selected');
            }
            cell.onclick = () => { if (selectMode)
                toggleSelectedDay(date);
            else {
                view = 'day';
                syncDateFromMap(date);
            } };
            daysGrid.append(cell);
        }
        panel.append(daysGrid);
        fragment.append(panel);
    }
    $('yeargrid').replaceChildren(fragment);
}

// ===========================================================================
// 09 — Renderizado central y resumen de estado
// ===========================================================================
function render() {
    const d = view === 'day' ? $('date').value : weekDate, monday = shift(d, -weekday(d));
    $('title').textContent = view === 'day' ? weekdays[weekday(d)] + ' ' + pretty(d) : view === 'week' ? 'Semana · ' + pretty(monday) + ' al ' + pretty(shift(monday, 6)) : 'Calendario · ' + weekDate.slice(0, 4);
    $('subtitle').textContent = view === 'day' ? 'Vista diaria · horarios reales' : view === 'week' ? 'Siete días · vista operativa' : 'Doce meses · selecciona un día para ver sus clases';
    root.classList.toggle('weekmode', view === 'week');
    root.classList.toggle('yearmode', view === 'year');
    for (const kind of ['day', 'week', 'year']) {
        const btn = $('view-' + kind);
        btn.classList.toggle('active', view === kind);
        btn.setAttribute('aria-pressed', String(view === kind));
    }
    $('dayarea').hidden = view !== 'day';
    $('weekarea').hidden = view !== 'week';
    $('yeararea').hidden = view !== 'year';
    $('nav').hidden = view === 'year';
    $('yearnav').hidden = view !== 'year';
    $('select-day').hidden = !selectMode || view !== 'day';
    $('jump').value = weekDate;
    if (view === 'day')
        renderDay();
    else if (view === 'week')
        renderWeek();
    else
        renderYear();
    const drafts = store.classes.filter(x => !x.published).length;
    $('summary').textContent = drafts + ' en borrador · ' + store.classes.filter(x => x.published).length + ' publicadas · ' + store.classes.filter(x => x.booked).length + ' reservadas';
    $('badge').textContent = batch ? 'Coincidencias' : drafts + ' borradores';
    $('batchbar').hidden = !batch;
    bulkDelete.updatePreview();
    updateReservePreview();
    updateSelectionSummary();
    if (batch) {
        const n = conflicts().length;
        $('batchtitle').textContent = n ? n + ' propuestas con coincidencias' : 'Coincidencias resueltas';
        $('batchinfo').textContent = `${batch.proposals.length} nuevas · ${batch.existing.length} existentes · cambios provisionales`;
        $('confirm').disabled = !!n;
        const free = freeProposals();
        $('addfree').hidden = !free.length;
        $('addfree').textContent = 'Agregar ' + free.length + ' sin coincidencia' + (free.length === 1 ? '' : 's');
        const plan = batchReplacementPlan(batch);
        $('replace-batch').hidden = !plan.existing.length;
        $('replace-batch').textContent = 'Reemplazar ' + plan.existing.length + ' disponible' + (plan.existing.length === 1 ? '' : 's');
    }
}

// ===========================================================================
// 10 — Creación de clases y gestión de coincidencias
// ===========================================================================
function submit(items, preserveAttrs = false) {
    if (bulkDelete.isActive() || reserveMode || selectMode) {
        notify('Desactiva la gestión por rango antes de crear clases.');
        return;
    }
    if (batch) {
        notify('Confirma o cancela primero las coincidencias abiertas.', 'warning');
        return;
    }
    if (!items.length) {
        notify(durationWarning() || 'No hay clases válidas.', 'warning');
        return;
    }
    const attrs = preserveAttrs ? null : readAttributes('');
    if (!preserveAttrs && !attrs) {
        notify('El cupo grupal debe ser un número entero entre 2 y 999.', 'warning');
        return;
    }
    const candidates = items.map((b, i) => ({ ...b, ...(preserveAttrs ? {} : attrs), proposed: true, key: 'n' + i }));
    const existing = clone(store.classes);
    // Las clases libres se crean directamente en verde. Solo las conflictivas
    // pasan al editor provisional, tanto en creación normal como en repetición.
    const free = candidates.filter((b, i) => !existing.some(x => overlap(x, b)) &&
        !candidates.some((x, j) => i !== j && overlap(x, b)));
    const freeKeys = new Set(free.map(x => x.key));
    const pending = candidates.filter(x => !freeKeys.has(x.key));
    if (free.length)
        store.add(free.map(({ date, start, end, group, capacity, online, bachillerato, booked }) => ({ date, start, end, group, capacity, online, bachillerato, booked })));
    if (!pending.length) {
        render();
        notify(free.length + ' clases agregadas directamente al calendario.', 'success');
        return;
    }
    batch = { existing: clone(store.classes), proposals: pending };
    view = 'day';
    $('date').value = pending.find(x => existing.some(y => overlap(x, y)))?.date || pending[0].date;
    weekDate = $('date').value;
    selected = null;
    $('floating').hidden = true;
    $('rep').hidden = true;
    render();
    notify(free.length + ' clases libres agregadas en verde; ' + pending.length + ' pendientes por coincidencias. Las clases libres permanecerán si cancelas.', 'warning');
}

// ===========================================================================
// 11 — Editor individual (no es borrado masivo)
// ===========================================================================
function openEditor(key) {
    const b = all().find(x => identity(x) === key);
    if (!b)
        return;
    selected = key;
    const other = blockers(b);
    $('edittitle').textContent = b.proposed ? 'Clase nueva propuesta' : 'Clase existente';
    $('editsubtitle').textContent = pretty(b.date) + ' · ' + (b.proposed ? 'Sin guardar' : b.booked ? 'Reservada' : 'Disponible');
    $('edithours').textContent = clock(b.start) + ' – ' + clock(b.end);
    $('editbadge').textContent = b.proposed ? (other.length ? 'Coincidencia' : 'Nueva') : b.booked ? 'Reservada' : 'Existente';
    $('editstart').value = clock(b.start);
    $('editend').value = clock(b.end);
    const attrs = classAttrs(b);
    $('edit-group').checked = attrs.group;
    $('edit-capacity').value = attrs.group ? attrs.capacity : 5;
    $('edit-online').checked = attrs.online;
    $('edit-bachillerato').checked = attrs.bachillerato;
    syncAttributeControls('edit-');
    for (const id of ['edit-group', 'edit-capacity', 'edit-online', 'edit-bachillerato'])
        $(id).disabled = !!b.booked;
    $('saveattributes').disabled = !!b.booked;
    $('togglebooking').textContent = b.booked ? 'Quitar reserva' : 'Marcar como reservada';
    $('togglebooking').classList.toggle('is-booked', !!b.booked);
    $('editinfo').textContent = b.booked ? 'Clase reservada: protegida. Requiere reprogramación controlada.' : b.proposed ? `${other.length} coincidencia(s). Puedes mover la propuesta o sustituir clases disponibles.` : 'Clase existente: conserva su identidad al moverla.';
    $('timefields').hidden = !!b.booked;
    $('delete').hidden = !!b.booked;
    $('delete').textContent = b.proposed ? 'Descartar propuesta' : 'Eliminar clase existente';
    const available = b.proposed ? other.filter(x => !x.proposed && !x.booked) : [];
    $('replace').hidden = !b.proposed || !batch;
    $('replace').disabled = !available.length;
    $('replace').textContent = 'Reemplazar ' + available.length + ' clases disponibles';
    $('feedback').textContent = batch ? 'Cambios provisionales hasta confirmar el lote.' : 'Cambios sobre el calendario actual.';
    $('floating').hidden = false;
    render();
}
function closeEditor() { selected = null; $('floating').hidden = true; render(); }
function move() { const b = findSelected(); if (!b || b.booked)
    return; const start = minutes($('editstart').value), end = minutes($('editend').value); if (!validTime(start, end)) {
    $('feedback').textContent = 'Horario inválido. Usa intervalos de cinco minutos.';
    return;
} const candidate = { ...b, start, end }; if (!b.proposed && all().some(x => identity(x) !== identity(b) && !x.proposed && overlap(x, candidate))) {
    $('feedback').textContent = 'Este horario coincide con otra clase existente. Prueba otro.';
    return;
} b.start = start; b.end = end; openEditor(identity(b)); notify('Horario actualizado en el mapa' + (batch ? ' provisionalmente.' : '.'), 'success'); }
function saveAttributes() {
    const b = findSelected();
    if (!b || b.booked)
        return;
    const attrs = readAttributes('edit-');
    if (!attrs) {
        $('feedback').textContent = 'El cupo grupal debe ser un número entero entre 2 y 999.';
        return;
    }
    Object.assign(b, { group: attrs.group, capacity: attrs.capacity, online: attrs.online, bachillerato: attrs.bachillerato });
    if (!batch) store.persist();
    openEditor(identity(b));
    notify('Atributos de esta clase actualizados' + (batch ? ' provisionalmente.' : '.'), 'success');
}
function toggleBooking() {
    const b = findSelected();
    if (!b)
        return;
    const next = !b.booked;
    if (Number(b.enrolled || 0) > 0) { notify('Esta clase tiene estudiantes inscritos. La cancelación requiere gestionar sus reservaciones.', 'warning'); return; }
    if (!next && !confirm('¿Quitar la reserva manual de esta clase? En una versión con estudiantes inscritos, esto requerirá validar sus inscripciones.'))
        return;
    b.booked = next;
    if (!batch) store.persist();
    openEditor(identity(b));
    notify(next ? 'Clase marcada como reservada (demostración).' : 'Reserva manual retirada. La clase vuelve a estar disponible.', 'success');
}
function remove() { const b = findSelected(); if (!b || b.booked)
    return; const msg = b.proposed ? '¿Descartar esta clase nueva?' : '¿Eliminar esta clase disponible de ' + pretty(b.date) + '?'; if (!confirm(msg))
    return; if (b.proposed) {
    batch.proposals = batch.proposals.filter(x => x.key !== b.key);
}
else if (batch) {
    batch.existing = batch.existing.filter(x => x.id !== b.id);
}
else
    store.remove(b.id); closeEditor(); notify('Clase retirada' + (batch ? ' provisionalmente.' : '.'), 'success'); }
function replace() { const b = findSelected(); if (!batch || !b?.proposed)
    return; const other = blockers(b), available = other.filter(x => !x.proposed && !x.booked); if (!available.length)
    return; const booked = other.filter(x => x.booked); if (!confirm(`¿Reemplazar ${available.length} clases disponibles con la propuesta ${clock(b.start)}–${clock(b.end)}?${booked.length ? ' Las clases reservadas permanecerán intactas.' : ''}`))
    return; const ids = new Set(available.map(x => x.id)); batch.existing = batch.existing.filter(x => !ids.has(x.id)); openEditor(identity(b)); notify('Clases disponibles sustituidas provisionalmente. Revisa los bloqueos restantes.', 'warning'); }
// Acceso grupal a la misma sustitución de clases disponibles del editor.
// No modifica clases reservadas ni propuestas que se bloquean entre sí.
function replaceBatchAvailable() {
    if (!batch)
        return;
    const plan = batchReplacementPlan(batch);
    if (!plan.existing.length) {
        notify('No hay coincidencias disponibles para sustituir en grupo.', 'warning');
        return;
    }
    const published = plan.existing.filter(x => x.published).length;
    const drafts = plan.existing.length - published;
    const warning = `¿Reemplazar ${plan.existing.length} clase(s) disponibles (${drafts} borrador(es), ${published} publicada(s)) por ${plan.proposals.length} propuesta(s)?\n\nLas reservadas no se modificarán. Las coincidencias protegidas o entre propuestas se resolverán individualmente.\n\nLos cambios serán provisionales hasta confirmar el lote.`;
    if (!confirm(warning))
        return;
    const ids = new Set(plan.existing.map(x => x.id));
    batch.existing = batch.existing.filter(x => !ids.has(x.id));
    closeEditor();
    notify(plan.existing.length + ' clase(s) disponibles sustituidas provisionalmente. Revisá las coincidencias restantes.', 'warning');
}
// Se calcula sobre el estado provisional, NO sobre las clases originales:
// una clase retirada del lote ya no debe bloquear la plaza que acaba de liberar.
function freeProposals() {
    if (!batch)
        return [];
    return batch.proposals.filter(p => !batch.existing.some(x => overlap(x, p)) &&
        !batch.proposals.some(x => x.key !== p.key && overlap(x, p)));
}
function addFree() {
    if (!batch)
        return;
    const free = freeProposals();
    if (!free.length) {
        notify('Todavía no hay propuestas libres. Libera una plaza o mueve una clase.');
        return;
    }
    // Operación atómica: se confirman juntos los retiros provisionales y las
    // nuevas clases libres. Las otras propuestas continúan pendientes.
    const combined = [...batch.existing, ...free];
    if (combined.some((a, i) => combined.some((b, j) => j > i && overlap(a, b)))) {
        notify('No se puede guardar: todavía existe una superposición.', 'warning');
        return;
    }
    store.replace(batch.existing);
    store.add(free.map(({ date, start, end, group, capacity, online, bachillerato, booked }) => ({ date, start, end, group, capacity, online, bachillerato, booked })));
    const keys = new Set(free.map(x => x.key));
    batch.existing = clone(store.classes);
    batch.proposals = batch.proposals.filter(x => !keys.has(x.key));
    if (selected && free.some(x => identity(x) === selected))
        closeEditor();
    if (!batch.proposals.length) {
        batch = null;
        closeEditor();
    }
    render();
    notify(free.length + ' clase(s) incorporadas en verde. Los cambios confirmados se conservan; las otras propuestas siguen pendientes.', 'success');
}
function confirmBatch() { if (!batch)
    return; const arr = all(); if (arr.some((a, i) => arr.some((b, j) => j > i && overlap(a, b)))) {
    notify('Quedan coincidencias. Resuélvelas antes de confirmar.', 'warning');
    return;
} store.replace(batch.existing); store.add(batch.proposals.map(({ date, start, end, group, capacity, online, bachillerato, booked }) => ({ date, start, end, group, capacity, online, bachillerato, booked }))); batch = null; closeEditor(); notify('Cambios confirmados: clases existentes conservan sus identificadores.', 'success'); }
function cancelBatch() { batch = null; closeEditor(); notify('Cancelado: todas las clases originales permanecen intactas.'); }

// ===========================================================================
// 12 — Días de repetición y conexión de eventos
// ===========================================================================
function renderDays() { $('days').replaceChildren(); ['L', 'M', 'X', 'J', 'V', 'S', 'D'].forEach((letter, i) => { const b = document.createElement('button'); b.textContent = letter; b.className = days.includes(i) ? 'active' : ''; b.onclick = () => { repeatDaysTouched = true; days = days.includes(i) ? days.filter(x => x !== i) : [...days, i]; bulkDelete.clearExclusions(); renderDays(); if (bulkDelete.isActive() || reserveMode)
    render(); }; $('days').append(b); }); }
$('enter').onclick = () => { $('home').hidden = true; $('work').hidden = false; $('back').hidden = false; updatePlan(); };
$('teachers').onclick = () => { location.href = 'profesores.html'; };
$('back').onclick = () => { if (teacher) { location.href = canManageTeachers(profile) ? 'profesores.html' : 'index.html'; return; } $('work').hidden = true; $('home').hidden = false; $('back').hidden = true; };
for (const kind of ['day', 'week', 'year'])
    $('view-' + kind).onclick = () => { view = kind; render(); };
$('prevyear').onclick = () => { weekDate = String(Number(weekDate.slice(0, 4)) - 1) + '-01-01'; render(); };
$('nextyear').onclick = () => { weekDate = String(Number(weekDate.slice(0, 4)) + 1) + '-01-01'; render(); };
function syncDefaultRepeatDay(d) { if (!repeatDaysTouched) {
    days = [weekday(d)];
    renderDays();
} }
function syncDateFromMap(d) { weekDate = d; $('date').value = d; $('from').value = d; syncUntil(); syncDefaultRepeatDay(d); updatePlan(); }
$('prev').onclick = () => syncDateFromMap(shift(weekDate, view === 'day' ? -1 : -7));
$('next').onclick = () => syncDateFromMap(shift(weekDate, view === 'day' ? 1 : 7));
$('jump').onchange = () => { if ($('jump').value)
    syncDateFromMap($('jump').value); };
$('date').addEventListener('change', () => {
    const d = $('date').value;
    if (!d)
        return;
    weekDate = d;
    if (!repeatFromTouched) {
        $('from').value = d;
        $('until').value = monthLater(d);
    }
    syncDefaultRepeatDay(d);
    updatePlan();
});
$('from').addEventListener('change', () => { repeatFromTouched = true; bulkDelete.clearExclusions(); reserveExcluded.clear(); syncUntil(); if ($('from').value) {
    weekDate = $('from').value;
    $('date').value = $('from').value;
} updatePlan(); });
$('until').addEventListener('change', () => { bulkDelete.clearExclusions(); reserveExcluded.clear(); render(); });
$('erase-mode').addEventListener('change', () => bulkDelete.toggleMode($('erase-mode').checked));
$('reserve-mode').addEventListener('change', () => toggleReserveMode($('reserve-mode').checked));
$('select-mode').addEventListener('change', () => toggleSelectMode($('select-mode').checked));
$('select-day').onclick = () => toggleSelectedDay($('date').value);
$('copy-selection').onclick = copySelection;
$('delete-selection').onclick = bulkDelete.deleteSelection;
$('clear-selection').onclick = () => { selectedIds.clear(); render(); };
$('copy-to').addEventListener('change', () => {
    copyDatesTouched = true;
    if (!$('copy-until').value || $('copy-until').value < $('copy-to').value)
        $('copy-until').value = $('copy-to').value;
    updateSelectionSummary();
});
$('copy-until').addEventListener('change', () => { copyDatesTouched = true; updateSelectionSummary(); });
$('reserve-action').addEventListener('change', () => { reserveExcluded.clear(); render(); });
for (const id of ['date', 'start', 'duration', 'end', 'count']) {
    $(id).addEventListener('input', updatePlan);
    $(id).addEventListener('change', updatePlan);
}
for (const id of ['start', 'end', 'editstart', 'editend', 'duration'])
    $(id).addEventListener('change', () => $(id).blur());
$('mode').onchange = () => { const count = $('mode').value === 'count'; $('count').hidden = !count; $('end').hidden = count; $('targetlabel').textContent = count ? 'Cantidad' : 'Hasta las'; updatePlan(); };
$('add').onclick = () => submit(plan().slots);
initRepeatWindow({ panel: $('rep'), trigger: $('repeat') });
$('repeat').onclick = () => { $('rep').hidden = !$('rep').hidden; if ($('rep').hidden && bulkDelete.isActive())
    bulkDelete.toggleMode(false); if ($('rep').hidden && reserveMode)
    toggleReserveMode(false); if ($('rep').hidden && selectMode)
    toggleSelectMode(false); };
$('apply').onclick = () => { if (bulkDelete.isActive()) {
    bulkDelete.eraseSelected();
    return;
} if (reserveMode) {
    applyReservations();
    return;
} if (batch) {
    notify('Finaliza primero las coincidencias actuales.', 'warning');
    return;
} const p = plan(), from = $('from').value, to = $('until').value; if (!p.slots.length || !days.length || !from || !to || to < from) {
    notify(durationWarning() || 'Configura días y fechas válidos en Desde y Hasta.', 'warning');
    return;
} const n = Math.round((new Date(to + 'T12:00:00') - new Date(from + 'T12:00:00')) / 86400000); if (n > 1095) {
    notify('Máximo tres años por lote.', 'warning');
    return;
} const items = []; for (let i = 0; i <= n; i++) {
    const d = shift(from, i);
    if (days.includes(weekday(d)))
        p.slots.forEach(x => items.push({ ...x, date: d }));
} if (!items.length) {
    notify('No hay días seleccionados dentro del rango Desde / Hasta.', 'warning');
    return;
} submit(items); };
$('booked').addEventListener('change', () => syncAttributeControls(''));
for (const prefix of ['', 'edit-'])
    for (const kind of ['group', 'online'])
        $(prefix + kind).addEventListener('change', () => syncAttributeControls(prefix));
$('saveattributes').onclick = saveAttributes;
$('togglebooking').onclick = toggleBooking;
$('closeedit').onclick = closeEditor;
$('saveedit').onclick = move;
$('delete').onclick = remove;
$('replace').onclick = replace;
$('replace-batch').onclick = replaceBatchAvailable;
$('addfree').onclick = addFree;
$('confirm').onclick = confirmBatch;
$('cancel').onclick = cancelBatch;
$('publish').onclick = () => { if (batch) {
    notify('Confirma o cancela las coincidencias primero.');
    return;
} const n = store.classes.filter(x => !x.published).length; if (!n) {
    notify('No hay borradores.', 'warning');
    return;
} if (confirm('¿Publicar ' + n + ' clases?')) {
    store.publish();
    render();
    notify('Clases publicadas en esta demostración.', 'success');
} };
$('clear').onclick = bulkDelete.clearDrafts;
const handle = $('drag'), floating = $('floating');
handle.addEventListener('pointerdown', e => { if (e.target.closest('button'))
    return; const r = floating.getBoundingClientRect(); drag = { dx: e.clientX - r.left, dy: e.clientY - r.top }; floating.style.transform = 'none'; floating.style.left = r.left + 'px'; floating.style.top = r.top + 'px'; handle.setPointerCapture(e.pointerId); });
handle.addEventListener('pointermove', e => { if (!drag)
    return; floating.style.left = Math.max(0, Math.min(innerWidth - floating.offsetWidth, e.clientX - drag.dx)) + 'px'; floating.style.top = Math.max(0, Math.min(innerHeight - 48, e.clientY - drag.dy)) + 'px'; });
handle.addEventListener('pointerup', () => drag = null);
handle.addEventListener('pointercancel', () => drag = null);
// Contexto visible sin añadir otra franja: nombre del profesor en el encabezado.
if (teacherId) {
    if (!teacher) {
        alert('El profesor no existe en esta demostración.');
        location.replace('profesores.html');
    } else {
        const heading = document.getElementById('schedule-context-title');
        if (heading) heading.textContent = canManageTeachers(profile) ? `Horarios de ${teacher.name}` : `Mi calendario · ${teacher.name}`;
        $('home').hidden = true;
        $('work').hidden = false;
        $('back').hidden = false;
    }
}
syncAttributeControls('');
renderDays();
updatePlan();
