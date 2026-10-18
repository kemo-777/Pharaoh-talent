'use strict';
const form=document.querySelector('#reset');
const status=document.querySelector('#status');
const token=new URLSearchParams(location.search).get('token')||'';
form.addEventListener('submit',async event=>{
  event.preventDefault();
  const password=document.querySelector('#password').value;
  const confirm=document.querySelector('#confirm').value;
  if(password!==confirm){status.textContent='كلمتا المرور غير متطابقتين.';return;}
  try{
    const response=await fetch('/api/auth/reset-password',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token,password})});
    const data=await response.json();
    status.textContent=data.message||data.error||(response.ok?'تم بنجاح':'تعذر إتمام الطلب');
    if(response.ok)form.remove();
  }catch{status.textContent='تعذر الاتصال بالخادم. حاول لاحقًا.';}
});
if(!token){status.textContent='رابط الاستعادة غير مكتمل. افتح الرابط الذي وصلك بالبريد.';form.querySelector('button').disabled=true;}
