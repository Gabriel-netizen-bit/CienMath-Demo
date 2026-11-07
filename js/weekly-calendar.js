/**
 * Vista semanal reutilizable: cuadrícula horaria y navegación por días.
 * No conoce reservas, almacenamiento ni formularios: recibe esos comportamientos
 * mediante funciones del módulo principal.
 */

// Horario habitual. Fuera de este intervalo la cuadrícula se extiende,
// pero la ventana mantiene su altura máxima y permite desplazamiento interno.
const BASE_START = 7 * 60;
const BASE_END = 22 * 60;
// Escala compartida para profesores y estudiantes: 78 px por hora.
// Referencia visual: antes 100 minutos ocupaban ~72 px; ahora una hora ~78 px.
const PIXELS_PER_MINUTE = 1.3;
const COMPACT_HEIGHT = 58;
const MICRO_HEIGHT = 22;
const HOUR = 60;

function hourLabel(minutes) {
    const h = String(Math.floor(minutes / HOUR)).padStart(2, '0');
    return `${h}:00`;
}

function makeLine(minute, origin) {
    const line = document.createElement('div');
    line.className = 'week-hour-line' + (minute === 12 * HOUR ? ' noon' : '');
    line.style.top = (minute - origin) * PIXELS_PER_MINUTE + 'px';
    line.setAttribute('aria-hidden', 'true');
    return line;
}

/**
 * Dibuja una semana conservando siempre la misma escala temporal.
 * Si hay clases extraordinarias (madrugada/noche), extiende solo el contenido.
 */
export function renderWeeklyGrid({
    container, scrollContainer, date, shift, weekday, weekdays, classes, createCard,
    identity, overlap, selectedDate, selectMode, onSelectDay, onNavigateDay,
    isDayFullySelected
}) {
    const monday = shift(date, -weekday(date));
    const dates = Array.from({ length: 7 }, (_, i) => shift(monday, i));
    const inWeek = classes.filter(item => dates.includes(item.date));

    const earliest = inWeek.length ? Math.min(...inWeek.map(item => item.start)) : BASE_START;
    const latest = inWeek.length ? Math.max(...inWeek.map(item => item.end)) : BASE_END;
    const origin = Math.max(0, Math.min(BASE_START, Math.floor(earliest / HOUR) * HOUR));
    const finish = Math.min(24 * HOUR, Math.max(BASE_END, Math.ceil(latest / HOUR) * HOUR));
    const height = (finish - origin) * PIXELS_PER_MINUTE + 2;

    // Conservar la hora visible cuando se vuelve a renderizar o se cambia de semana.
    // Así una semana atípica no desplaza la navegación habitual hacia la madrugada.
    const previousOrigin = Number(scrollContainer.dataset.weekOrigin ?? BASE_START);
    const previousMinute = scrollContainer.dataset.weekRendered === 'true'
        ? previousOrigin + scrollContainer.scrollTop / PIXELS_PER_MINUTE
        : BASE_START;

    const grid = document.createDocumentFragment();
    // Encabezado único: queda encima de todas las tarjetas durante el scroll.
    const headers = document.createElement('div');
    headers.className = 'week-headers';
    const axisHeader = document.createElement('div');
    axisHeader.className = 'weekday week-axis-header';
    axisHeader.textContent = 'Hora';
    headers.append(axisHeader);
    const axisColumn = document.createElement('div');
    axisColumn.className = 'week-axis-column';
    const axis = document.createElement('div');
    axis.className = 'week-time-axis';
    axis.style.height = height + 'px';

    for (let minute = origin; minute <= finish; minute += HOUR) {
        const label = document.createElement('span');
        label.className = 'week-hour-label' + (minute === 12 * HOUR ? ' noon' : '');
        label.style.top = (minute - origin) * PIXELS_PER_MINUTE + 'px';
        label.textContent = hourLabel(minute);
        axis.append(label);
    }
    axisColumn.append(axis);
    grid.append(axisColumn);

    dates.forEach((day, index) => {
        const column = document.createElement('div');
        column.className = 'week-day-column';
        const header = document.createElement('div');
        header.className = 'weekday week-day-header';
        header.textContent = weekdays[index].slice(0, 3) + ' ' + Number(day.slice(-2));
        header.setAttribute('role', 'button');
        header.setAttribute('tabindex', '0');
        header.setAttribute('aria-label', 'Elegir ' + weekdays[index] + ' ' + day);
        header.title = selectMode
            ? 'Seleccionar todas las clases de este día'
            : 'Sincronizar el calendario con este día';
        header.classList.add('day-selectable');
        if (day === selectedDate) header.classList.add('week-current-day');
        if (selectMode && isDayFullySelected(day)) header.classList.add('day-selected');

        const chooseDay = () => selectMode ? onSelectDay(day) : onNavigateDay(day);
        header.onclick = chooseDay;
        header.onkeydown = event => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                chooseDay();
            }
        };

        const lane = document.createElement('div');
        lane.className = 'lane week-hour-lane';
        lane.style.height = height + 'px';
        for (let minute = origin; minute <= finish; minute += HOUR) {
            lane.append(makeLine(minute, origin));
        }

        const items = inWeek.filter(item => item.date === day)
            .sort((a, b) => a.start - b.start || Number(a.proposed) - Number(b.proposed));
        for (const item of items) {
            const cardHeight = Math.max(3, (item.end - item.start) * PIXELS_PER_MINUTE - 3);
            const card = createCard(item, true, (item.start - origin) * PIXELS_PER_MINUTE, cardHeight);
            if (cardHeight < COMPACT_HEIGHT) card.classList.add('compact');
            if (cardHeight < MICRO_HEIGHT) card.classList.add('micro');
            if (items.some(other => identity(other) !== identity(item) && overlap(other, item))) {
                card.classList.add('fanned');
            }
            lane.append(card);
        }
        headers.append(header);
        column.append(lane);
        grid.append(column);
    });

    // El encabezado se inserta primero, ocupando toda la fila superior.
    container.replaceChildren(headers, grid);
    scrollContainer.dataset.weekOrigin = String(origin);
    scrollContainer.dataset.weekRendered = 'true';
    scrollContainer.scrollTop = Math.max(0, (previousMinute - origin) * PIXELS_PER_MINUTE);
}
