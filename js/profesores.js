/** CienMath · Panel administrativo de demostración con selección local de perfiles. */
import { SUBJECTS, ADMIN_ID, loadTeachers, saveTeacher, setTeacherActive, deleteTeacher, loadTeacherClasses } from './teacher-repository.js';
import { currentDemoProfile, endDemoSession } from './demo-session.js';
import { canManageTeachers } from './access-service.js';
const profile = currentDemoProfile();
if (!canManageTeachers(profile)) {
  location.replace('acceso.html');
  throw new Error('Acceso de demostración reservado al administrador.');
}
document.body.style.visibility = 'visible';
const logout = document.getElementById('demo-logout');
logout.addEventListener('click', () => { endDemoSession(); location.href = 'index.html'; });
const $ = id => document.getElementById(id);
const form = $('teacher-form');
const subjectArea = $('teacher-subjects');

// Los controles de materias comparten un catálogo: se evita duplicar listas.
for (const subject of SUBJECTS) {
  const label = document.createElement('label');
  label.className = 'teachers-subject-option';
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox'; checkbox.value = subject; checkbox.name = 'subjects';
  label.append(checkbox, document.createTextNode(subject));
  subjectArea.append(label);
}

function feedback(message = '', kind = '') {
  $('teacher-feedback').textContent = message;
  $('teacher-feedback').className = `teachers-feedback ${kind}`;
}
// El botón de creación es también el cierre, en la misma posición visual.
function syncEditorToggle(open) {
  const button = $('teacher-new');
  button.setAttribute('aria-expanded', String(open));
  button.textContent = open ? 'Cerrar formulario' : '+ Nuevo profesor';
  button.setAttribute('aria-label', open ? 'Cerrar formulario de profesor' : 'Nuevo profesor');
  $('teachers-creation').classList.toggle('is-open', open);
}
function resetForm() {
  $('teacher-editor').hidden = true;
  syncEditorToggle(false);
  form.reset(); $('teacher-id').value = '';
  $('form-title').textContent = 'Nuevo profesor';
  $('teacher-submit').textContent = '+ Crear profesor';
  feedback();
}
function editTeacher(id) {
  $('teachers-toast').hidden = true;
  const teacher = loadTeachers().find(t => t.id === id);
  if (!teacher) return;
  $('teacher-id').value = teacher.id;
  $('teacher-name').value = teacher.name;
  $('teacher-email').value = teacher.email;
  for (const input of subjectArea.querySelectorAll('input')) input.checked = teacher.subjects.includes(input.value);
  $('form-title').textContent = 'Editar profesor';
  $('teacher-submit').textContent = 'Guardar cambios';
  $('teacher-editor').hidden = false;
  syncEditorToggle(true);
  feedback();
  $('teacher-name').focus();
  document.querySelector('.teachers-editor').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
function node(tag, cls, content) {
  const el = document.createElement(tag);
  if (cls) el.className = cls;
  if (content !== undefined) el.textContent = content;
  return el;
}
// El borrado es irreversible para esta demo local: se pide confirmación.
function confirmDeleteTeacher(teacher) {
  const count = loadTeacherClasses(teacher.id).length;
  const warning = count ? `\nTambién se eliminarán sus ${count} clase(s) guardadas en este navegador.` : '';
  if (!window.confirm(`¿Eliminar a ${teacher.name}?${warning}\nEsta acción no se puede deshacer.`)) return;
  try {
    deleteTeacher(teacher.id);
    resetForm();
    render();
    const toast = $('teachers-toast');
    toast.textContent = `${teacher.name} eliminado del equipo docente local.`;
    toast.hidden = false;
  } catch (error) {
    const toast = $('teachers-toast');
    toast.textContent = error.message;
    toast.hidden = false;
  }
}
function makeCard(t) {
  const card = node('article', `teacher-card${t.active ? '' : ' inactive'}`);
  const top = node('div', 'teacher-card-top');
  const initials = t.name.split(/\s+/).slice(0,2).map(word => word[0]?.toUpperCase() || '').join('');
  top.append(node('div', 'teacher-avatar', initials));
  const identity = node('div', 'teacher-identity');
  identity.append(node('h3', '', t.name), node('p', '', t.email || 'Sin correo configurado'));
  top.append(identity);
  const state = node('span', 'teacher-state', t.id === ADMIN_ID ? 'Administrador · Activo' : (t.active ? 'Activo' : 'Inactivo'));
  const chips = node('div', 'teacher-chips');
  for (const subject of t.subjects) chips.append(node('span', 'teacher-chip', subject));
  const actions = node('div', 'teacher-actions');
  const schedule = node('a', 'btn primary', 'Horarios');
  schedule.href = `horarios.html?profesor=${encodeURIComponent(t.id)}`;
  schedule.setAttribute('aria-label', `Abrir calendario de ${t.name}`);
  const edit = node('button', 'btn', 'Editar');
  edit.type = 'button'; edit.addEventListener('click', () => editTeacher(t.id));
  const toggleLabel = node('label', 'teacher-toggle');
  const toggle = document.createElement('input');
  toggle.type = 'checkbox'; toggle.checked = t.active; toggle.disabled = t.id === ADMIN_ID;
  toggle.setAttribute('aria-label', `${t.active ? 'Desactivar' : 'Activar'} a ${t.name}`);
  toggle.addEventListener('change', () => {
    try { setTeacherActive(t.id, toggle.checked); render(); }
    catch (err) { toggle.checked = !toggle.checked; feedback(err.message, 'error'); }
  });
  toggleLabel.append(toggle, document.createTextNode('Activo'));
  const remove = node('button', 'btn teacher-delete', 'Eliminar');
  remove.type = 'button';
  remove.setAttribute('aria-label', `Eliminar a ${t.name}`);
  remove.addEventListener('click', () => confirmDeleteTeacher(t));
  if (t.id === ADMIN_ID) actions.append(schedule, edit, toggleLabel);
  else actions.append(schedule, edit, remove, toggleLabel);
  card.append(top, chips, state, actions);
  return card;
}
function render() {
  const teachers = loadTeachers();
  const active = teachers.filter(t => t.active).length;
  $('teacher-count').textContent = `${teachers.length} profesor${teachers.length === 1 ? '' : 'es'}`;
  $('teacher-active-count').textContent = String(active);
  $('teacher-inactive-count').textContent = String(teachers.length - active);
  const list = $('teacher-list');
  list.replaceChildren();
  if (!teachers.length) {
    const empty = node('div', 'teachers-empty');
    empty.append(node('div', 'teachers-empty-icon', '♙'), node('h3', '', 'Todavía no hay profesores'), node('p', '', 'Registrá al primero para comenzar a organizar sus materias y horarios.'));
    list.append(empty);
  } else {
    for (const teacher of teachers) list.append(makeCard(teacher));
  }
}
form.addEventListener('submit', event => {
  event.preventDefault();
  const data = {
    id: $('teacher-id').value || undefined,
    name: $('teacher-name').value,
    email: $('teacher-email').value,
    subjects: [...subjectArea.querySelectorAll('input:checked')].map(input => input.value)
  };
  try {
    const teacher = saveTeacher(data);
    resetForm(); render();
    $('teachers-toast').textContent = `${teacher.name}: ${data.id ? 'cambios guardados' : 'profesor registrado'} en este navegador.`;
    $('teachers-toast').hidden = false;
  } catch (err) { feedback(err.message, 'error'); }
});
$('teacher-cancel').addEventListener('click', resetForm);
$('teacher-new').addEventListener('click', () => {
  if (!$('teacher-editor').hidden) { resetForm(); return; }
  $('teachers-toast').hidden = true;
  resetForm();
  $('teacher-editor').hidden = false;
  syncEditorToggle(true);
  $('teacher-name').focus();
});
render();
