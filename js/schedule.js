export function todayCR(){const p=new Intl.DateTimeFormat('en-US',{timeZone:'America/Costa_Rica',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());const v=k=>p.find(x=>x.type===k).value;return `${v('year')}-${v('month')}-${v('day')}`}
export function shift(d,n){const x=new Date(d+'T12:00:00');x.setDate(x.getDate()+n);return x.getFullYear()+'-'+String(x.getMonth()+1).padStart(2,'0')+'-'+String(x.getDate()).padStart(2,'0')}
export function weekday(d){return(new Date(d+'T12:00:00').getDay()+6)%7}
export function pretty(d){return new Date(d+'T12:00:00').toLocaleDateString('es-CR',{day:'numeric',month:'short',year:'numeric'})}
export function minutes(t){if(!/^\d\d:\d\d$/.test(t||''))return NaN;const [h,m]=t.split(':').map(Number);return h*60+m}
export function clock(n){return String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0')}
export function overlap(a,b){return a.date===b.date&&a.start<b.end&&b.start<a.end}
export function validTime(s,e){return Number.isFinite(s)&&Number.isFinite(e)&&s>=0&&e<=1440&&s%5===0&&e%5===0&&e>s}
export function makeSlots(date,start,duration,count){return Array.from({length:count},(_,i)=>({date,start:start+i*duration,end:start+(i+1)*duration}))}
export function conflictsFor(item,items){return items.filter(x=>!(item.proposed?x.proposed&&x.key===item.key:!x.proposed&&x.id===item.id)&&overlap(item,x))}
