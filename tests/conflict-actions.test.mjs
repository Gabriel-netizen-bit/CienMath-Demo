import assert from 'node:assert/strict';
import {batchReplacementPlan} from '../js/conflict-actions.js';
import {createStore} from '../js/store.js';
const date='2026-11-12';
const x=(id,start,end,booked=false,published=false)=>({id,date,start,end,booked,published});
const p=(key,start,end)=>({key,proposed:true,date,start,end});
let tests=0;
const check=(name,fn)=>{fn();tests++;console.log('OK',name)};
check('reemplazo de 10 propuestas con 10 existentes disponibles',()=>{
 const batch={existing:Array.from({length:10},(_,i)=>x(i+1,420+i*90,510+i*90)),proposals:Array.from({length:10},(_,i)=>p('n'+i,420+i*90,510+i*90))};
 const plan=batchReplacementPlan(batch);
 assert.equal(plan.existing.length,10);assert.equal(plan.proposals.length,10);
 assert.equal(batch.existing.length,10); // sin mutación
});
check('reservada no se reemplaza ni se modifica',()=>{
 const batch={existing:[x(1,420,510,true)],proposals:[p('a',420,510)]};
 assert.equal(batchReplacementPlan(batch).existing.length,0);
 assert.equal(batch.existing[0].booked,true);
});
check('mezcla publicada sin reservas y borrador: ambas reemplazables',()=>{
 const batch={existing:[x(1,420,510,false,true),x(2,510,600)],proposals:[p('a',420,510),p('b',510,600)]};
 assert.deepEqual(batchReplacementPlan(batch).existing.map(x=>x.id),[1,2]);
});
check('propuesta que toca reserva y clase disponible no reemplaza ninguna',()=>{
 const batch={existing:[x(1,420,450,false),x(2,450,510,true)],proposals:[p('a',420,510)]};
 assert.equal(batchReplacementPlan(batch).existing.length,0);
});
check('propuestas superpuestas no provocan reemplazo grupal',()=>{
 const batch={existing:[x(1,420,540)],proposals:[p('a',420,510),p('b',480,540)]};
 assert.equal(batchReplacementPlan(batch).existing.length,0);
});
check('dos propuestas contiguas pueden sustituir una clase larga',()=>{
 const batch={existing:[x(1,420,600)],proposals:[p('a',420,510),p('b',510,600)]};
 assert.deepEqual(batchReplacementPlan(batch).existing.map(x=>x.id),[1]);
 assert.equal(batchReplacementPlan(batch).proposals.length,2);
});
check('sin lote no hay sustitución',()=>{
 assert.deepEqual(batchReplacementPlan(null),{proposals:[],existing:[]});
});
check('almacén conserva identidad de clase al reemplazar provisionalmente',()=>{
 const s=createStore();s.add([{date,start:420,end:510,booked:false}]);
 const originalId=s.classes[0].id;
 s.replace(s.classes);assert.equal(s.classes[0].id,originalId);
});
console.log(`${tests} pruebas superadas`);
