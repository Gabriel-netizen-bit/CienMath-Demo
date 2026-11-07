import {overlap} from './schedule.js';

// Prepara la misma sustitución permitida en el editor individual:
// únicamente clases existentes disponibles; nunca reservas ni propuestas superpuestas.
// Es una planificación de solo lectura: no modifica el lote.
export function batchReplacementPlan(batch){
 if(!batch)return {proposals:[],existing:[]};
 const proposals=batch.proposals.filter(proposal=>{
  if(batch.proposals.some(other=>other.key!==proposal.key&&overlap(other,proposal)))return false;
  const existing=batch.existing.filter(other=>overlap(other,proposal));
  return existing.length>0&&existing.every(other=>!other.booked);
 });
 const ids=new Set();
 for(const proposal of proposals){
  for(const item of batch.existing)if(overlap(item,proposal))ids.add(item.id);
 }
 return {proposals,existing:batch.existing.filter(item=>ids.has(item.id))};
}
