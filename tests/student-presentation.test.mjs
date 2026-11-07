/** Contrato visual de estudiantes: solo modifica el portal, no el constructor. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadStudentCatalog, classTone } from '../js/student-data.js';

const html = readFileSync(new URL('../estudiantes.html', import.meta.url), 'utf8');
const css = readFileSync(new URL('../css/student.css', import.meta.url), 'utf8');
const js = readFileSync(new URL('../js/student.js', import.meta.url), 'utf8');
for (const tone of ['common-open', 'bach-open', 'common-closed', 'bach-closed']) {
  assert.match(css, new RegExp(`\\.student-slot\\.${tone}`), `Estado ${tone} tiene estilo`);
}
assert.equal(loadStudentCatalog().teachers.length, 1);
assert.deepEqual(loadStudentCatalog().classes, []);
assert.equal(classTone({bachillerato: true, group: false, booked: false}), 'bach-open');
assert.doesNotMatch(js, /'Clase común'/);
assert.match(js, /'Reservada'/);
for (const label of ['Hora de inicio', 'Hora de finalización', 'Profesor']) assert.ok(js.includes(label));
assert.match(css, /\.student-fields > select \{ width: min\(100%, 150px\); \}/);
assert.match(css, /\.student-dialog \{ width: min\(410px,/);
assert.match(html, /role="radiogroup" aria-labelledby="student-mode-label"/);
assert.match(html, /value="onsite" checked required/);
assert.match(html, /value="online" required/);
assert.doesNotMatch(html, /<select id="student-mode"/);
assert.match(css, /--student-pumpkin: #b85824/);
assert.match(css, /--student-pumpkin-fill: rgba\(204, 100, 38, \.29\)/);
assert.match(css, /--student-pumpkin-fill: rgba\(236, 125, 58, \.34\)/);
assert.match(css, /\.student-slot\.common-open \.student-state[\s\S]*?color: var\(--green\)/);
assert.match(css, /\.student-slot\.common-closed \.student-state[\s\S]*?color: var\(--violet\)/);
assert.match(css, /\.student-slot\.bach-open \.student-type[\s\S]*?color: var\(--student-pumpkin\)/);
assert.match(css, /background: var\(--card-published\)/);
assert.match(css, /background: var\(--card-booked\)/);
assert.match(html, /class="btn site-back student-back" href="index.html"/);
assert.match(html, /id="student-empty-state"/);
assert.doesNotMatch(html, /Vista de demostración|Solicitud simulada/);
assert.doesNotMatch(js, /simulateReservation|makeSampleClasses/);
console.log('Portal de estudiantes: estados, paleta, modalidad y formulario compactado verificados.');
