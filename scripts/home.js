(()=>{
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
// stars
['stars','stars2'].forEach(id=>{const el=document.getElementById(id);if(!el)return;for(let i=0;i<46;i++){const s=document.createElement('i');s.style.left=Math.random()*100+'%';s.style.top=Math.random()*100+'%';s.style.animationDelay=(Math.random()*7)+'s';if(Math.random()>.8){s.style.width=s.style.height='3px';}el.appendChild(s);}});
// nav
const nav=document.getElementById('nav');const onScroll=()=>nav.classList.toggle('solid',scrollY>40);addEventListener('scroll',onScroll,{passive:true});onScroll();
const drawer=document.getElementById('drawer'),burger=document.getElementById('burger');
const setDrawer=o=>{drawer.classList.toggle('open',o);burger.setAttribute('aria-expanded',o);document.body.style.overflow=o?'hidden':'';if(o)drawer.querySelector('a').focus();};
burger.onclick=()=>setDrawer(true);document.getElementById('drawer-close').onclick=()=>setDrawer(false);
drawer.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>setDrawer(false)));
addEventListener('keydown',e=>{if(e.key==='Escape')setDrawer(false);});
// reveal
const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target);}}),{threshold:.15,rootMargin:'0px 0px -6% 0px'});
document.querySelectorAll('.rv').forEach(el=>io.observe(el));
// hero parallax
const stage=document.getElementById('heroStage');
if(!reduce&&matchMedia('(pointer:fine)').matches){addEventListener('mousemove',e=>{const x=e.clientX/innerWidth-.5,y=e.clientY/innerHeight-.5;stage.querySelectorAll('[data-depth]').forEach(f=>{const d=+f.dataset.depth;f.style.translate=`${x*d}px ${y*d}px`;});},{passive:true});}
// worlds: one open at a time on pointer/focus
const worlds=[...document.querySelectorAll('.world')];
worlds.forEach(w=>{const open=()=>{worlds.forEach(o=>o.classList.toggle('is-open',o===w));};w.addEventListener('mouseenter',open);w.addEventListener('focusin',open);});
// poll
const poll=document.getElementById('poll'),note=document.getElementById('pollNote');
poll.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{if(poll.classList.contains('answered'))return;poll.classList.add('answered');b.classList.add('picked');poll.querySelectorAll('button').forEach(o=>o.querySelector('.bar').style.width=o.dataset.p+'%');note.textContent=b.hasAttribute('data-right')?'Good prediction! Lemons usually float, limes usually sink. Now find out why.':'Interesting guess! Most lemons float and most limes sink. Want to find out why?';}));
// curiosity sequence
const lab=document.getElementById('lab'),steps=[...document.querySelectorAll('.seq-step')],dots=[...document.querySelectorAll('#dots i')],thought=document.getElementById('thought'),why=document.getElementById('why'),capChip=document.getElementById('capChip'),capText=document.getElementById('capText'),names=['See','Predict','Do','Observe','Understand','Explore'];
const grains=document.getElementById('grains');for(let i=0;i<14;i++){const g=document.createElement('i');g.style.left=(30+Math.random()*40)+'%';g.style.animationDelay=(Math.random()*1.8)+'s';grains.appendChild(g);}
const setStep=i=>{steps.forEach((s,k)=>s.classList.toggle('on',k===i));dots.forEach((d,k)=>d.classList.toggle('on',k<=i));
lab.classList.toggle('pouring',i===2);lab.classList.toggle('salty',i>=2);lab.classList.toggle('floaty',i>=3);
const t=steps[i].dataset.thought;thought.textContent=t;thought.classList.toggle('show',!!t);why.classList.toggle('show',i===4);
capChip.textContent=String(i+1).padStart(2,'0')+' · '+names[i];capText.textContent=steps[i].dataset.cap;};
const so=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting)setStep(steps.indexOf(e.target));}),{rootMargin:'-45% 0px -45% 0px'});
steps.forEach(s=>so.observe(s));
// analytics hook
document.addEventListener('click',e=>{const t=e.target.closest('[data-event]');if(t){(window.dataLayer=window.dataLayer||[]).push({event:t.dataset.event,...t.dataset});}});
})();
