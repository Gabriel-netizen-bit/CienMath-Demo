// Notificaciones de presentación. No alteran el almacén ni las operaciones.
// Mantiene el mensaje persistente original y muestra una confirmación temporal.
export function createNotifier(message,area){
 let timeout;
 return function notify(text,kind='info'){
  message.textContent=text;
  message.dataset.kind=kind;
  clearTimeout(timeout);
  area.replaceChildren();
  if(!text)return;
  const toast=document.createElement('div');toast.className='cm-toast';toast.dataset.kind=kind;
  const icon=document.createElement('span');icon.className='cm-toast-icon';icon.setAttribute('aria-hidden','true');
  icon.textContent=kind==='success'?'✓':kind==='warning'?'!':kind==='error'?'×':'i';
  const body=document.createElement('span');body.className='cm-toast-text';body.textContent=text;
  const close=document.createElement('button');close.type='button';close.className='cm-toast-close';close.textContent='×';close.setAttribute('aria-label','Cerrar aviso');
  close.onclick=()=>{clearTimeout(timeout);toast.remove()};
  toast.append(icon,body,close);area.append(toast);
  timeout=setTimeout(()=>toast.remove(),5000);
 };
}
