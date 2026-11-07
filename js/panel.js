/** Panel administrativo · presentación de los registros de reserva locales. */
import { ADMIN_ID } from './teacher-repository.js';
import { currentDemoProfile, endDemoSession } from './demo-session.js';
import { canManageTeachers } from './access-service.js';
import { listReservations } from './reservation-service.js';
import { pretty, clock } from './schedule.js';
const profile = currentDemoProfile();
if (!canManageTeachers(profile)) { location.replace('acceso.html'); throw new Error('Panel exclusivo del administrador demo.'); }
document.body.style.visibility = 'visible';
document.getElementById('panel-my-calendar').href = `horarios.html?profesor=${encodeURIComponent(ADMIN_ID)}`;
document.getElementById('panel-logout').onclick = () => { endDemoSession(); location.href = 'index.html'; };
const rows = listReservations().reverse();
document.getElementById('panel-reservation-count').textContent = `${rows.length} registro${rows.length === 1 ? '' : 's'}`;
document.getElementById('panel-reservation-empty').hidden = rows.length > 0;
const tbody = document.getElementById('panel-reservation-list');
for (const r of rows) {
 const tr = document.createElement('tr');
 for (const value of [r.id, r.name, r.teacherName, `${r.subject}${r.bachillerato ? ' · Bachillerato' : ''}`, `${pretty(r.date)} · ${clock(r.start)}`, 'Confirmada · Demo']) {
   const td = document.createElement('td'); td.textContent = value; tr.append(td);
 }
 tbody.append(tr);
}
