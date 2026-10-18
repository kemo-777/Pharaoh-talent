'use strict';
const button=document.querySelector('#verifyButton');
const status=document.querySelector('#status');
const token=new URLSearchParams(location.search).get('token')||'';
button.addEventListener('click',async()=>{
  button.disabled=true;
  try{
    const response=await fetch('/api/auth/verify-email',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token})});
    const data=await response.json();status.textContent=data.message||data.error||'تعذر إتمام التأكيد.';
    if(response.ok)button.remove();else button.disabled=false;
  }catch{status.textContent='تعذر الاتصال بالخادم. حاول لاحقًا.';button.disabled=false;}
});
if(token.length<20){button.disabled=true;status.textContent='رابط التأكيد غير مكتمل.';}
