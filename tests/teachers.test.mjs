import assert from 'node:assert/strict';
import { loadTeachers, saveTeacher, setTeacherActive, loadTeacherClasses, teacherClassesKey, deleteTeacher, ADMIN_ID } from '../js/teacher-repository.js';
import { createStore } from '../js/store.js';
import { loadStudentCatalog } from '../js/student-data.js';
const memory = new Map();
globalThis.localStorage = {
  getItem: key => memory.get(key) ?? null,
  setItem: (key, value) => memory.set(key, value),
  removeItem: key => memory.delete(key)
};
assert.equal(loadTeachers().length, 1, 'administrador demo presente');
assert.equal(loadTeachers()[0].id, ADMIN_ID);
assert.throws(() => saveTeacher({ name:'Ana', subjects:[] }), /materia/);
const ana = saveTeacher({name:'Ana Solís', email:'ana@example.com', subjects:['Matemática','Física']});
const luis = saveTeacher({name:'Luis Mora', subjects:['Química']});
assert.equal(loadTeachers().length,3);
assert.throws(() => saveTeacher({name:'Otro Profesor',email:'ana@example.com',subjects:['Biología']}), /correo/);
const edited = saveTeacher({...ana, name:'Ana Solís Q.', subjects:['Biología']});
assert.equal(edited.id,ana.id);
assert.deepEqual(loadTeachers().find(t=>t.id===ana.id).subjects,['Biología']);
const store = createStore(teacherClassesKey(ana.id));
store.add([{date:'2026-11-12',start:420,end:470,booked:false,group:false}]);
assert.equal(loadTeacherClasses(ana.id).length,1);
assert.equal(loadStudentCatalog().classes.length,0,'borradores no son públicos');
store.publish();
assert.equal(loadStudentCatalog().classes.length,1);
assert.equal(loadStudentCatalog().classes[0].teacherId,ana.id);
assert.equal(createStore(teacherClassesKey(ana.id)).classes.length,1,'horarios persisten por profesor');
assert.equal(createStore(teacherClassesKey(luis.id)).classes.length,0,'horarios separados');
setTeacherActive(ana.id,false);
assert.equal(loadStudentCatalog().teachers.length,2);
assert.equal(loadStudentCatalog().classes.length,0,'profesor inactivo no aparece públicamente');
console.log('Gestión de profesores, validación, persistencia local y aislamiento: OK.');

// Eliminar un profesor no afecta a los demás; también elimina sus clases locales.
assert.equal(deleteTeacher(ana.id).id, ana.id);
assert.equal(loadTeachers().length, 2);
assert.ok(loadTeachers().some(t=>t.id===luis.id));
assert.equal(loadTeacherClasses(ana.id).length, 0);
assert.throws(() => deleteTeacher(ana.id), /no encontrado/i);

assert.throws(() => deleteTeacher(ADMIN_ID), /administrador/);
assert.throws(() => setTeacherActive(ADMIN_ID, false), /administrador/);
