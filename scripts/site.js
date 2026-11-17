(()=>{
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
document.querySelectorAll('.starfield').forEach(el=>{for(let i=0;i<40;i++){const s=document.createElement('i');s.style.left=Math.random()*100+'%';s.style.top=Math.random()*100+'%';s.style.animationDelay=(Math.random()*7)+'s';el.appendChild(s);}});
const nav=document.getElementById('nav');if(nav){const f=()=>nav.classList.toggle('solid',scrollY>40);addEventListener('scroll',f,{passive:true});f();}
const drawer=document.getElementById('drawer'),burger=document.getElementById('burger');
if(drawer&&burger){const set=o=>{drawer.classList.toggle('open',o);burger.setAttribute('aria-expanded',o);document.body.style.overflow=o?'hidden':'';if(o)drawer.querySelector('a').focus();};
burger.onclick=()=>set(true);document.getElementById('drawer-close').onclick=()=>set(false);drawer.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>set(false)));addEventListener('keydown',e=>{if(e.key==='Escape')set(false);});}
const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target);}}),{threshold:.12,rootMargin:'0px 0px -6% 0px'});
document.querySelectorAll('.rv').forEach(el=>io.observe(el));
// tabs
document.querySelectorAll('[role="tablist"]').forEach(list=>{const tabs=[...list.querySelectorAll('[role="tab"]')];
const sel=t=>{tabs.forEach(x=>{const on=x===t;x.setAttribute('aria-selected',on);x.tabIndex=on?0:-1;document.getElementById(x.getAttribute('aria-controls')).hidden=!on;});};
tabs.forEach((t,i)=>{t.addEventListener('click',()=>sel(t));t.addEventListener('keydown',e=>{let j=null;if(e.key==='ArrowDown'||e.key==='ArrowRight')j=(i+1)%tabs.length;if(e.key==='ArrowUp'||e.key==='ArrowLeft')j=(i-1+tabs.length)%tabs.length;if(j!==null){e.preventDefault();tabs[j].focus();sel(tabs[j]);}});});});
// rails
document.querySelectorAll('[data-rail]').forEach(r=>{const rail=document.getElementById(r.dataset.rail);r.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>rail.scrollBy({left:(b.dataset.dir==='prev'?-1:1)*rail.clientWidth*.8,behavior:reduce?'auto':'smooth'})));});
// polls
document.querySelectorAll('.poll').forEach(poll=>{const note=poll.parentElement.querySelector('.poll-note');poll.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{if(poll.classList.contains('answered'))return;poll.classList.add('answered');b.classList.add('picked');poll.querySelectorAll('button').forEach(o=>o.querySelector('.bar').style.width=o.dataset.p+'%');if(note)note.textContent=b.hasAttribute('data-right')?note.dataset.right:note.dataset.wrong;}));});
// sub-nav highlight
const sub=[...document.querySelectorAll('.p-sub a[href^="#"]')];
if(sub.length){const so=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting)sub.forEach(a=>a.classList.toggle('on',a.getAttribute('href')==='#'+e.target.id));}),{rootMargin:'-40% 0px -55% 0px'});sub.forEach(a=>{const t=document.querySelector(a.getAttribute('href'));if(t)so.observe(t);});}
// analytics hook
document.addEventListener('click',e=>{const t=e.target.closest('[data-event]');if(t)(window.dataLayer=window.dataLayer||[]).push({event:t.dataset.event,...t.dataset});});
})();
