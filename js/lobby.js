/* CienMath · navegación del lobby y acceso a selección local de perfiles (Demo). */
(() => {
 'use strict';
 const menu=document.getElementById('mobile-menu');
 const nav=document.getElementById('site-nav');
 menu?.addEventListener('click',()=>{const open=menu.getAttribute('aria-expanded')!=='true';menu.setAttribute('aria-expanded',String(open));menu.setAttribute('aria-label',open?'Cerrar menú':'Abrir menú');nav.classList.toggle('open',open)});
 nav?.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{nav.classList.remove('open');menu.setAttribute('aria-expanded','false')}));
 const access=document.getElementById('access-dialog');
 document.querySelectorAll('[data-open-access]').forEach(button=>button.addEventListener('click',()=>access.showModal()));
 const info=document.getElementById('info-dialog');
 const content={
  tarifas:{title:'Horarios y tarifas',html:'<p>La academia todavía debe confirmar y aprobar los precios, paquetes y cupos antes de publicarlos.</p><p>La herramienta actual permite explorar horarios en modo demostración, pero no procesa pagos.</p>'},
  pagos:{title:'Política de pagos',html:'<ul><li>Pago mensual y anticipado.</li><li>El pago asegura la reserva del cupo.</li><li>Las sesiones no asistidas se consideran no reembolsables.</li><li>El atraso en el pago puede implicar la liberación del cupo.</li><li>La academia indica que no realiza devoluciones parciales ni totales.</li><li>La academia se reserva el derecho de reorganizar grupos.</li></ul>'},
  reglamento:{title:'Reglamento para familias',html:'<ul><li>Puntualidad y asistencia responsable.</li><li>Comunicación respetuosa y formal.</li><li>Compromiso con el proceso académico.</li><li>Respeto a la metodología institucional.</li><li>Optimizar el espacio de estudio del estudiante.</li><li>La academia acompaña el trabajo del estudiante, no lo sustituye.</li></ul>'}
 };
 document.querySelectorAll('[data-open-info]').forEach(button=>button.addEventListener('click',()=>{const item=content[button.dataset.openInfo];if(!item)return;document.getElementById('info-dialog-title').textContent=item.title;document.getElementById('info-dialog-body').innerHTML=item.html;info.showModal()}));
 document.querySelectorAll('[data-close-dialog]').forEach(button=>button.addEventListener('click',()=>button.closest('dialog').close()));
 for(const dialog of [access,info]){dialog?.addEventListener('click',e=>{if(e.target===dialog)dialog.close()})}
 const links=[...nav.querySelectorAll('a[href^="#"]')];
 const sections=links.map(a=>({a,el:document.querySelector(a.getAttribute('href'))}));
 if('IntersectionObserver' in window){const obs=new IntersectionObserver(entries=>{const visible=entries.filter(e=>e.isIntersecting).sort((a,b)=>b.intersectionRatio-a.intersectionRatio)[0];if(visible){for(const x of sections)x.a.classList.toggle('active',x.el===visible.target)}},{rootMargin:'-15% 0px -55% 0px',threshold:[0,.1,.3]});for(const x of sections)if(x.el)obs.observe(x.el)}
})();