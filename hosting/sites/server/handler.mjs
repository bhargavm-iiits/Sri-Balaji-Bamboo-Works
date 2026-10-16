import {primaryOrigin,sitemapEntries} from '../public/search-content.js';
import {OrderStore,fail,publicOrder,ownerOrder} from './orders.mjs';
import {hash,random,otpStep,headers,equal,passwordConfigured,verifyPassword} from './security.mjs';
import {business} from './catalogue/config.js';
import pages from './pages.json' with {type:'json'};
import seo from './seo.json' with {type:'json'};
import ownerApp from './owner-script.mjs';
const htmlEsc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const json=(value,status=200,extra={})=>new Response(JSON.stringify(value),{status,headers:{...headers(),'Content-Type':'application/json; charset=utf-8',...extra}});
const text=(value,type='text/html; charset=utf-8',extra={})=>new Response(value,{headers:{...headers(),'Content-Type':type,...extra}});
async function body(request){
 if(!request.headers.get('content-type')?.startsWith('application/json'))fail('Use a JSON request.',415);
 const reader=request.body?.getReader();if(!reader)fail('A JSON object is required.');let size=0,parts=[];
 for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>64000){await reader.cancel();fail('Request is too large.',413);}parts.push(value);}
 let result;try{result=JSON.parse(await new Blob(parts).text());}catch{fail('Invalid JSON request.');}if(!result||typeof result!=='object'||Array.isArray(result))fail('A JSON object is required.');return result;
}
async function ownerPrincipal(env){if(!passwordConfigured(env.OWNER_PASSWORD_HASH))fail('Owner website sign-in is not configured. Please contact the workshop.',503);return 'website-owner:'+await hash(env.OWNER_EMAIL.toLowerCase()+'|'+env.OWNER_PASSWORD_HASH);}
const cookieName=request=>new URL(request.url).protocol==='https:'?'__Host-sbb_owner':'sbb_owner_dev';
const ownerCookie=request=>(request.headers.get('cookie')||'').split(';').map(s=>s.trim()).find(s=>s.startsWith(cookieName(request)+'='))?.slice(cookieName(request).length+1);
async function auth(request,env){
 const userId=await ownerPrincipal(env),cookie=ownerCookie(request);
 if(!cookie||!/^[a-f0-9]{64}$/.test(cookie))fail('Please sign in as the owner.',401);
 const session=await env.DB.prepare('SELECT user_id, expires FROM owner_sessions WHERE hash = ?').bind(await hash(cookie)).first();if(!session||session.user_id!==userId||session.expires<=Date.now())fail('Please sign in as the owner.',401);return userId;
}
async function limit(request,env,prefix,max,window){
 const key=prefix+':'+await hash(request.headers.get('cf-connecting-ip')||'unknown'),now=Date.now();
 const row=await env.DB.prepare('INSERT INTO request_limits(key, count, until) VALUES(?, 1, ?) ON CONFLICT(key) DO UPDATE SET count = CASE WHEN until <= ? THEN 1 ELSE count + 1 END, until = CASE WHEN until <= ? THEN excluded.until ELSE until END RETURNING count').bind(key,now+window,now,now).first();if(row.count>max)fail('Too many attempts. Please try again later.',429);
}
const loginScript=`const form=document.querySelector('#owner-login-form');if(form)form.addEventListener('submit',async event=>{event.preventDefault();if(!form.reportValidity())return;const button=form.querySelector('button');if(button.disabled)return;button.disabled=true;const box=document.querySelector('#order-feedback');box.textContent='';try{const fields=new FormData(form);const response=await fetch('/api/owner/login',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify({email:fields.get('email'),password:fields.get('password'),otp:fields.get('otp')})});const data=await response.json();if(!response.ok)throw new Error(data.error||'Sign in failed.');form.reset();location.reload();}catch(e){form.elements.password.value='';form.elements.otp.value='';box.className='error-summary';box.textContent=e.message;box.focus();}finally{button.disabled=false;}});`;
function ownerPage(authenticated){
 const login='<form id="owner-login-form" class="form-panel owner-login"><h2>Sign in to your workshop</h2><p>Use your owner email, website password and authenticator code.</p><label for="owner-email">Owner email</label><input id="owner-email" name="email" type="email" autocomplete="username" maxlength="254" required><label for="owner-password">Website password</label><input id="owner-password" name="password" type="password" autocomplete="current-password" maxlength="256" required><label for="owner-otp">Authenticator code</label><input id="owner-otp" name="otp" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6" aria-describedby="owner-code-help" required><p id="owner-code-help" class="muted">Open your authenticator app and enter its current 6-digit code. The code changes every 30 seconds.</p><button class="button" type="submit">Open owner inbox →</button></form>';
 return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Private workshop access | Sri Balaji Bamboo Works</title><link rel="icon" href="/assets/favicon.svg"><link rel="stylesheet" href="/styles.css"><link rel="stylesheet" href="/orders.css">${authenticated?'<script type="module" src="/api/owner/app.js"></script>':'<script type="module" src="/owner-login.js"></script>'}</head><body><main class="container section order-page owner-page"><a class="text-link" href="/">Sri Balaji Bamboo Works</a><p class="eyebrow">PRIVATE WORKSHOP ACCESS</p><h1>${authenticated?'The workshop <em>inbox.</em>':'Owner <em>sign in.</em>'}</h1><p class="intro">${authenticated?'Review requests and confirm final totals.':'Private order management for the workshop.'}</p><div id="order-feedback" role="status" tabindex="-1"></div><div id="order-flow" aria-live="polite">${authenticated?'<p>Loading the private inbox…</p>':login}</div></main></body></html>`;
}
export async function handle(request,env){
 const url=new URL(request.url),route=url.pathname,origin=url.origin;
 try{
  if(route.startsWith('/api/')||route==='/owner'||route==='/owner/'){
   if(!env.DB||!env.ORDER_ENCRYPTION_KEY||!env.OWNER_EMAIL||!env.OWNER_TOTP_SECRET)return json({error:'The order service is not configured yet. Please contact the workshop.'},503);
  }
  const store=new OrderStore(env),token=request.headers.get('authorization')?.startsWith('Bearer ')?request.headers.get('authorization').slice(7):'';
  if(route.startsWith('/api/')){
   await limit(request,env,'api',400,60000);
   if(request.method==='POST'&&(request.headers.get('origin')!==origin||request.headers.get('sec-fetch-site')==='cross-site'))fail('Open the store directly before submitting.',403);
   if(route==='/api/health'&&request.method==='GET'){await env.DB.prepare('SELECT id FROM orders LIMIT 1').first();return json({ok:true,orderWorkflow:true,whatsappConfigured:false});}
   if(route==='/api/owner/session'&&request.method==='GET'){let authenticated=false;try{await auth(request,env);authenticated=true;}catch{}return json({authenticated,mfaRequired:true});}
   if(route==='/api/owner/login'&&request.method==='POST'){
    await limit(request,env,'login',8,15*60000);const userId=await ownerPrincipal(env),input=await body(request),validPassword=await verifyPassword(input.password,env.OWNER_PASSWORD_HASH),validEmail=typeof input.email==='string'&&equal(input.email.trim().toLowerCase(),env.OWNER_EMAIL.toLowerCase());if(!validPassword||!validEmail)fail('Owner sign-in details are incorrect.',401);const step=await otpStep(env.OWNER_TOTP_SECRET,input.otp);if(step===null)fail('Owner sign-in details are incorrect.',401);
    const otpIdentity='website-owner:'+await hash(env.OWNER_EMAIL.toLowerCase());const accepted=await env.DB.prepare('INSERT INTO owner_otp(user_id, last_step) VALUES(?, ?) ON CONFLICT(user_id) DO UPDATE SET last_step = excluded.last_step WHERE owner_otp.last_step < excluded.last_step RETURNING last_step').bind(otpIdentity,step).first();if(!accepted)fail('Owner sign-in details are incorrect.',401);
    const session=random(32);await env.DB.batch([env.DB.prepare('DELETE FROM owner_sessions WHERE expires <= ?').bind(Date.now()),env.DB.prepare('INSERT INTO owner_sessions(hash, user_id, expires) VALUES(?, ?, ?)').bind(await hash(session),userId,Date.now()+1800000)]);
    return json({authenticated:true},200,{'Set-Cookie':`${cookieName(request)}=${session}; HttpOnly; SameSite=Strict; Path=/; Max-Age=1800${url.protocol==='https:'?'; Secure':''}`});
   }
   if(route==='/api/owner/logout'&&request.method==='POST'){await auth(request,env);await env.DB.prepare('DELETE FROM owner_sessions WHERE hash = ?').bind(await hash(ownerCookie(request))).run();return json({ok:true},200,{'Set-Cookie':`${cookieName(request)}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0${url.protocol==='https:'?'; Secure':''}`});}
   if(route==='/api/owner/app.js'&&['GET','HEAD'].includes(request.method)){await auth(request,env);return text(request.method==='HEAD'?null:ownerApp,'text/javascript; charset=utf-8',{'Vary':'Cookie'});}
   if(route==='/api/owner/orders'&&request.method==='GET'){await auth(request,env);if(url.searchParams.has('order')){const id=url.searchParams.get('order');if(!/^SBB-[A-F0-9]{12}$/.test(id))fail('Invalid order reference.');return json({orders:[ownerOrder((await store.record(id)).order)],nextCursor:null});}const page=await store.page(url.searchParams.get('before'));return json({...page,orders:page.orders.map(ownerOrder)});}
   const ownerMatch=route.match(/^\/api\/owner\/orders\/(SBB-[A-F0-9]{12})\/(approve|reject|paid)$/);
   if(ownerMatch&&request.method==='POST'){await auth(request,env);return json({order:ownerOrder(await store.update(ownerMatch[1],ownerMatch[2],await body(request)))});}
   if(route==='/api/orders'&&request.method==='POST'){await limit(request,env,'create',20,10*60000);const result=await store.create(await body(request));return json({order:publicOrder(result.order)},result.created?201:200);}
   const match=route.match(/^\/api\/orders\/(SBB-[A-F0-9]{12})(?:\/(payment|report))?$/);
   if(match){const order=await store.get(match[1],token);if(request.method==='GET'&&!match[2])return json({order:publicOrder(order)});if(request.method==='GET'&&match[2]==='payment'){if(!['approved','payment_reported'].includes(order.status))fail('Payment is available after owner approval.',409);return json({order:publicOrder(order),payment:business.payment});}if(request.method==='POST'&&match[2]==='report')return json({order:publicOrder(await store.update(order.id,'report',await body(request)))});}
   return json({error:'API route not found.'},404);
  }
  if(!['GET','HEAD'].includes(request.method))fail('Method not allowed.',405);
  if(route==='/owner'||route==='/owner/'){let authenticated=false;try{await auth(request,env);authenticated=true;}catch{}return text(request.method==='HEAD'?null:ownerPage(authenticated),'text/html; charset=utf-8',{'Vary':'Cookie'});}
  if(route==='/owner-login.js')return text(request.method==='HEAD'?null:loginScript,'text/javascript; charset=utf-8');
  const indexing=env.INDEXING_ENABLED==='true';
  if(route==='/robots.txt')return text(indexing?`User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /owner\nDisallow: /orders\nDisallow: /cart\nDisallow: /checkout\nDisallow: /payment\nDisallow: /request\nSitemap: ${primaryOrigin}/sitemap.xml\n`:'User-agent: *\nDisallow: /\n','text/plain; charset=utf-8');
  if(route==='/sitemap.xml')return text(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">${sitemapEntries.map(entry=>`<url><loc>${htmlEsc(primaryOrigin+entry.path)}</loc>${entry.images.map(image=>`<image:image><image:loc>${htmlEsc(primaryOrigin+'/assets/'+image)}</image:loc></image:image>`).join('')}</url>`).join('')}</urlset>`,'application/xml; charset=utf-8',{'Cache-Control':'public, max-age=300'});
  if(['/index.html','/shell.html','/offline.html'].includes(route))return Response.redirect(origin+'/',308);
  const source=pages[route]||pages['/404'],indexable=!!seo.pages[route]?.indexable&&indexing,nonce=random(18);
  let html=source.replace('<html ',`<html data-indexing="${indexing}" `).replaceAll('__CSP_NONCE__',nonce).replace('content="index, follow"',`content="${indexable?'index, follow':'noindex, nofollow'}"`);
  if(env.GOOGLE_SITE_VERIFICATION&&seo.pages[route]?.indexable)html=html.replace('</head>',`<meta name="google-site-verification" content="${htmlEsc(env.GOOGLE_SITE_VERIFICATION)}"></head>`);
  return new Response(request.method==='HEAD'?null:html,{status:pages[route]?200:404,headers:{...headers({nonce,indexable}),'Content-Type':'text/html; charset=utf-8'}});
 }catch(error){return json({error:error.status?error.message:'Something went wrong. Please try again.'},error.status||500);}
}
