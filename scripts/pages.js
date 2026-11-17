(()=>{
const q=new URLSearchParams(location.search);
// Explore hub filtering
const hub=document.getElementById('hub');
if(hub){
 const cards=[...hub.querySelectorAll('.card')],empty=document.getElementById('hubEmpty'),count=document.getElementById('hubCount'),search=document.getElementById('hubSearch');
 const types=[...document.querySelectorAll('#typeFilters .fchip')],worlds=[...document.querySelectorAll('#worldFilters .wstrip')];
 let type='all',world=q.get('world')||'';
 const run=()=>{const term=(search.value||'').trim().toLowerCase();let n=0;
  cards.forEach(c=>{const ok=(type==='all'||c.dataset.type===type)&&(!world||c.dataset.world===world)&&(!term||c.textContent.toLowerCase().includes(term));c.hidden=!ok;if(ok){n++;c.classList.add('in');}});
  empty.hidden=n>0;count.textContent=n+(n===1?' discovery':' discoveries');
  types.forEach(b=>b.setAttribute('aria-pressed',b.dataset.type===type));
  worlds.forEach(b=>{const on=b.dataset.world===world;b.setAttribute('aria-pressed',on);b.style.outline=on?'3px solid var(--navy-900)':'';b.style.outlineOffset=on?'3px':'';});};
 types.forEach(b=>b.addEventListener('click',()=>{type=b.dataset.type;run();}));
 worlds.forEach(b=>b.addEventListener('click',()=>{world=world===b.dataset.world?'':b.dataset.world;run();(window.dataLayer=window.dataLayer||[]).push({event:'world_click',world:b.dataset.world});}));
 search.addEventListener('input',run);
 document.getElementById('hubReset').addEventListener('click',()=>{type='all';world='';search.value='';run();});
 run();
}
// Forms
document.querySelectorAll('form[data-form]').forEach(f=>{
 // ?topic= pre-selects a topic. Compare values instead of building a CSS selector from the URL
 // (a crafted link could otherwise throw and disable the whole form).
 const t=q.get('topic');if(t){f.querySelectorAll('input[name="topic"]').forEach(r=>{if(r.value===t)r.checked=true;});}
 const TO='support@theyounglegends.co.in';
 const btn=f.querySelector('button[type="submit"]'),label=btn.innerHTML;
 let err=f.querySelector('.form-err');if(!err){err=document.createElement('p');err.className='form-err';err.setAttribute('role','alert');err.hidden=true;btn.after(err);}
 f.addEventListener('submit',async e=>{e.preventDefault();
  if(!f.checkValidity()){const bad=f.querySelector(':invalid');if(bad)bad.focus();f.reportValidity&&f.reportValidity();return;}
  const fd=new FormData(f),data={};
  fd.forEach((v,k)=>{data[k]=data[k]?data[k]+', '+v:v;});
  // Spam bots fill the hidden "_honey" field: pretend success, send nothing.
  if(data._honey){f.classList.add('sent');if(!f.querySelector('.form-done'))btn.textContent='You’re on the list ✓';return;}
  delete data._honey;
  const oneLine=s=>String(s||'').replace(/[\r\n\t]+/g,' ').trim().slice(0,100);
  const kind=f.dataset.form==='newsletter_signup'?'Dare to Dream waitlist sign-up':f.dataset.form==='educator_enquiry'?'Educator enquiry':'Website enquiry ('+oneLine(data.topic||'general')+')';
  const payload={...data,_subject:'The Young Legends — '+kind+' from '+(oneLine(data.name)||'website'),_replyto:data.email||'',_template:'table',_captcha:'false',page:location.href};
  btn.disabled=true;btn.textContent='Sending…';err.hidden=true;
  try{
   const r=await fetch('https://formsubmit.co/ajax/'+TO,{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify(payload)});
   if(!r.ok)throw new Error(r.status);
   const j=await r.json().catch(()=>({}));
   if(String(j.success)==='false')throw new Error(j.message||'not delivered');
   f.classList.add('sent');(window.dataLayer=window.dataLayer||[]).push({event:f.dataset.form});
   const done=f.querySelector('.form-done');if(done){done.tabIndex=-1;done.focus();}else{btn.textContent='You\u2019re on the list \u2713';}
  }catch(x){
   const body=Object.entries(data).map(([k,v])=>k+': '+v).join('\n');
   const mail='mailto:'+TO+'?subject='+encodeURIComponent(payload._subject)+'&body='+encodeURIComponent(body);
   err.innerHTML='We couldn&rsquo;t send that just now. <a href="'+mail+'">Email us directly</a> at <a href="mailto:'+TO+'">'+TO+'</a>.';
   err.hidden=false;btn.disabled=false;btn.innerHTML=label;
  }
 });
});
// Legal template
if(window.__LEGAL){
 // Only accept the document's own keys (not inherited ones like "constructor" or "__proto__").
 const docs=window.__LEGAL,want=q.get('doc'),key=Object.prototype.hasOwnProperty.call(docs,want)?want:'privacy';
 if(key==='privacy'){location.replace('https://sites.google.com/view/azadi-tales-privacy');return;}
 const [title,secs]=docs[key];
 document.getElementById('docTitle').textContent=title;document.title=title+' | The Young Legends';
 document.querySelectorAll('.doc-tabs a').forEach(a=>{if(a.dataset.doc===key)a.setAttribute('aria-current','page');});
 const toc=document.getElementById('toc'),prose=document.getElementById('prose');
 [['s1','Status'],['s2','What this document will cover']].forEach(([id,t])=>{const a=document.createElement('a');a.href='#'+id;a.textContent=t;toc.appendChild(a);});
  prose.innerHTML='<h2 id="s1"><span>01</span>Status</h2><p>We are finalising the full text of this document and will publish it here shortly. If you have any question in the meantime, please email <a href="mailto:support@theyounglegends.co.in">support@theyounglegends.co.in</a>. Our Privacy Policy is already available <a href="https://sites.google.com/view/azadi-tales-privacy" target="_blank" rel="noopener">here</a>.</p><h2 id="s2"><span>02</span>What this document will cover</h2>';
 const ol=document.createElement('ol');secs.forEach(s=>{const li=document.createElement('li');li.textContent=s;ol.appendChild(li);});prose.appendChild(ol);
 const links=[...toc.querySelectorAll('a')];
 const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting)links.forEach(a=>a.classList.toggle('on',a.getAttribute('href')==='#'+e.target.id));}),{rootMargin:'-30% 0px -60% 0px'});
 prose.querySelectorAll('h2').forEach(h=>io.observe(h));
}
})();
