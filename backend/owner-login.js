const form=document.querySelector('#owner-login-form');
form.addEventListener('submit',async event=>{
 event.preventDefault();if(!form.reportValidity())return;
 const button=form.querySelector('button');if(button.disabled)return;button.disabled=true;
 const feedback=document.querySelector('#order-feedback');feedback.textContent='';
 try{
  const values=Object.fromEntries(new FormData(form));
  const response=await fetch('/api/owner/login',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',cache:'no-store',signal:AbortSignal.timeout(15000),body:JSON.stringify({password:values.password,otp:values.otp})});
  const data=await response.json();if(!response.ok)throw new Error(data.error||'Sign in failed.');
  form.reset();location.reload();
 }catch(error){feedback.className='error-summary';feedback.textContent=error.message||'Cannot reach the server. Please try again.';feedback.focus();}
 finally{button.disabled=false;}
});
