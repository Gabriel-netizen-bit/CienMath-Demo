/** Pruebas sin navegador: tema global y contrato visual del panel de profesores. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const files = ['index.html', 'estudiantes.html', 'profesores.html'];
for (const file of files) {
  const html = fs.readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
  assert.match(html, /<script src="js\/theme\.js"><\/script>/);
  assert.match(html, /data-theme-toggle/);
}
const teachers = fs.readFileSync(new URL('../profesores.html', import.meta.url), 'utf8');
assert.doesNotMatch(teachers, /id="teacher-close"/);
assert.match(teachers, /id="teacher-new"[^>]+aria-expanded="false"/);
const css = fs.readFileSync(new URL('../css/profesores.css', import.meta.url), 'utf8');
assert.match(css, /\.teachers-creation-toggle\{position:absolute/);
assert.match(css, /:root:not\(\.dark\) \.teacher-card/);

// Simula los elementos mínimos para verificar persistencia sin jsdom.
const storage = new Map();
const handlers = new Map();
const button = {textContent:'',attrs:{},listeners:{},setAttribute(k,v){this.attrs[k]=v},addEventListener(k,fn){this.listeners[k]=fn}};
const classes = new Set();
const root = {classList:{contains:k=>classes.has(k),toggle(k,force){if(force)classes.add(k);else classes.delete(k)}}};
const document = {documentElement:root,querySelectorAll:()=>[button],addEventListener:(k,fn)=>handlers.set(k,fn)};
const window = {addEventListener:(k,fn)=>handlers.set(k,fn)};
const localStorage = {getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)};
vm.runInNewContext(fs.readFileSync(new URL('../js/theme.js', import.meta.url),'utf8'),{document,window,localStorage});
handlers.get('DOMContentLoaded')();
assert.equal(button.textContent,'☾');
button.listeners.click();
assert.equal(button.textContent,'☀');
assert.equal(storage.get('cienmath:appearance'),'dark');
assert.equal(button.attrs['aria-pressed'],'true');
storage.set('cienmath:appearance','light');
handlers.get('storage')({key:'cienmath:appearance'});
assert.equal(button.textContent,'☾');
console.log('Tema compartido, persistencia y control único de profesores: OK.');
