/** Panel administrativo · presentación de los registros de reserva locales. */
import { ADMIN_ID } from './teacher-repository.js';
import { currentDemoProfile, endDemoSession } from './demo-session.js';
import { canManageTeachers } from './access-service.js';
import { listReservations } from './reservation-service.js';
import { pretty, clock } from './schedule.js';
const profile = currentDemoProfile();
if (!profile) { location.replace('acceso.html'); throw new Error('Seleccioná un perfil de demostración.'); }
document.body.style.visibility = 'visible';
const isAdmin = canManageTeachers(profile);
const teacherMode = document.getElementById('panel-teacher-mode');
const adminMode = document.getElementById('panel-admin-mode');
adminMode.hidden = !isAdmin;
teacherMode.hidden = isAdmin;
if (!isAdmin) {
  document.title = 'CienMath | Panel del profesor';
  document.getElementById('panel-role-label').textContent = 'Profesor';
  document.getElementById('panel-teacher-name').textContent = profile.name;
  document.getElementById('panel-teacher-calendar').href = `horarios.html?profesor=${encodeURIComponent(profile.id)}`;
} else {
  document.getElementById('panel-my-calendar').href = `horarios.html?profesor=${encodeURIComponent(ADMIN_ID)}`;
}
document.getElementById('panel-logout').onclick = () => { endDemoSession(); location.href = 'index.html'; };
if (isAdmin) {
const rows = listReservations().reverse();
document.getElementById('panel-reservation-count').textContent = `${rows.length} registro${rows.length === 1 ? '' : 's'}`;
document.getElementById('panel-reservation-empty').hidden = rows.length > 0;
const tbody = document.getElementById('panel-reservation-list');
for (const r of rows) {
 const tr = document.createElement('tr');
 for (const value of [r.id, r.name, r.teacherName, `${r.subject}${r.bachillerato ? ' · Bachillerato' : ''}`, `${pretty(r.date)} · ${clock(r.start)}`, 'Confirmada · Local']) {
   const td = document.createElement('td'); td.textContent = value; tr.append(td);
 }
 tbody.append(tr);
}
}
