'use strict';
const statusEl=document.getElementById('consentStatus');
const button=document.getElementById('confirmConsent');
const token=new URLSearchParams(location.search).get('token')||'';
if(token.length<20){statusEl.textContent='رابط الموافقة غير صالح أو ناقص.';}else{statusEl.textContent='اضغط على الزر لتأكيد الموافقة. لن يتم التأكيد بمجرد فتح الرابط.';button.disabled=false;}
button.addEventListener('click',async()=>{button.disabled=true;statusEl.textContent='جارٍ تأكيد الموافقة…';try{const r=await fetch('/api/guardian-consent/confirm',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify({token})});const data=await r.json().catch(()=>({}));if(!r.ok)throw new Error(data.error||'تعذر تأكيد الموافقة.');statusEl.textContent=data.message||'تم تأكيد الموافقة.';button.textContent='تم التأكيد';}catch(e){statusEl.textContent=e.message;button.disabled=false;}});
