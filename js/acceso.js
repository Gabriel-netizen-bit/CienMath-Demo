/** CienMath · Pantalla de acceso: solo presentación y navegación. */
import { loadTeachers } from './teacher-repository.js';
import { listAccessProfiles, profileDestination } from './access-service.js';
import { startDemoSession, currentDemoProfile } from './demo-session.js';
const select = document.getElementById('access-profile');
const profiles = listAccessProfiles(loadTeachers());
select.add(new Option('Seleccioná un perfil…', ''));
for (const p of profiles) select.add(new Option(`${p.name} · ${p.role === 'admin' ? 'Administrador' : 'Profesor'}`, p.id));
const active = currentDemoProfile();
if (active) select.value = active.id;
document.getElementById('access-form').addEventListener('submit', event => {
  event.preventDefault();
  try { const profile = startDemoSession(select.value); location.href = profileDestination(profile); }
  catch (error) { document.getElementById('access-feedback').textContent = error.message; }
});
