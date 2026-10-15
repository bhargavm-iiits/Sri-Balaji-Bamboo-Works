import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {randomBytes} from 'node:crypto';
import {OrderStore,ownerCredentials,verifyPassword} from '../backend/orders.mjs';
import {createStorefrontServer} from '../server.mjs';
import {ownerNotifier} from '../backend/notifications.mjs';
import {findProduct} from '../dist/store.js';
const details={name:'QA Customer',email:'qa@example.test',phone:'9000000000',address:'Test address',city:'Test city',state:'Karnataka',pincode:'562105'};
const item={id:'bechanage',size:findProduct('bechanage').options[0],quantity:1};
const input=()=>({clientKey:randomBytes(32).toString('hex'),details,items:[item]});
const temporary=()=>mkdtemp(path.join(tmpdir(),'sbb-orders-test-'));

test('persisted requests are idempotent, keep catalogue prices and enforce approval transitions',async()=>{
 const directory=await temporary();try{const store=new OrderStore(directory);await store.init();const request=input();request.items=[{...item,price:1}];const first=await store.create(request);assert.equal(first.order.estimate.low,50);assert.equal(first.order.status,'pending');assert.equal((await store.create(request)).created,false);
 await assert.rejects(store.get(first.order.id,'bad-key'),/not found/);await assert.rejects(store.update(first.order.id,'report',{reference:'123456789012'}),/after owner approval/);await assert.rejects(store.update(first.order.id,'approve',{total:0}),/valid final total/);
 await assert.rejects(store.update(first.order.id,'approve',{total:75}),/Confirm availability/);
 await store.update(first.order.id,'approve',{total:75.50,note:'Includes delivery',detailsConfirmed:true});const restarted=new OrderStore(directory);assert.equal((await restarted.get(first.order.id,request.clientKey)).approvedTotal,7550);
 await assert.rejects(store.update(first.order.id,'approve',{total:40}),/Only a pending/);await store.update(first.order.id,'report',{reference:'TEST12345678'});assert.equal((await store.get(first.order.id,request.clientKey)).status,'payment_reported');await assert.rejects(store.update(first.order.id,'paid',{}),/merchant account/);assert.equal((await store.update(first.order.id,'paid',{receiptChecked:true})).status,'paid');
 }finally{await rm(directory,{recursive:true,force:true});}
});
test('owner credentials use a salted password hash',async()=>{const directory=await temporary();try{const password='QA-only-password-123456';const credentials=await ownerCredentials(directory,password);assert.ok(await verifyPassword(password,credentials));assert.equal(await verifyPassword('wrong',credentials),false);assert.ok(!JSON.stringify(credentials).includes(password));}finally{await rm(directory,{recursive:true,force:true});}});
test('declined orders cannot unlock payment and competing approvals cannot overwrite a total',async()=>{
 const directory=await temporary();try{const store=new OrderStore(directory);await store.init();const declined=(await store.create(input())).order;await assert.rejects(store.update(declined.id,'reject',{}),/explain/);await store.update(declined.id,'reject',{note:'Selected size unavailable'});await assert.rejects(store.update(declined.id,'approve',{total:50,detailsConfirmed:true}),/Only a pending/);await assert.rejects(store.update(declined.id,'report',{reference:'TEST12345'}),/after owner approval/);
 const pending=(await store.create(input())).order;const results=await Promise.allSettled([store.update(pending.id,'approve',{total:50,detailsConfirmed:true}),store.update(pending.id,'approve',{total:100,detailsConfirmed:true})]);assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal((await store.all()).find(o=>o.id===pending.id).approvedTotal,5000);
 }finally{await rm(directory,{recursive:true,force:true});}
});
test('WhatsApp is opt-in and mocked provider acceptance is not reported as delivery',async()=>{
 let calls=0;const send=async(url,options)=>{calls++;const body=JSON.parse(options.body);assert.equal(body.to,'919591457484');assert.equal(body.type,'template');assert.ok(!options.body.includes(details.email));return {ok:true,json:async()=>({messages:[{id:'mock-id'}]})};};
 assert.equal((await ownerNotifier({},send).notify({id:'TEST'})).status,'not_configured');assert.equal(calls,0);
 const env={WHATSAPP_NOTIFICATIONS_ENABLED:'true',WHATSAPP_ACCESS_TOKEN:'synthetic',WHATSAPP_PHONE_NUMBER_ID:'12345',WHATSAPP_API_VERSION:'v99.0',WHATSAPP_OWNER_TEMPLATE:'qa_order_alert',PUBLIC_SITE_URL:'https://example.test'};
 assert.equal((await ownerNotifier(env,send).notify({id:'SBB-000000000000'})).status,'accepted');assert.equal(calls,1);
 assert.equal((await ownerNotifier(env,async()=>{throw new Error('private provider detail');}).notify({id:'TEST'})).status,'failed');
});
test('HTTP API protects the owner inbox, private orders and payment access',async()=>{
 const directory=await temporary();const password='QA-only-owner-password-123';let alerts=0;const server=await createStorefrontServer({dataDir:directory,ownerPassword:password,notifier:{configured:false,notify:async()=>{alerts++;return {status:'not_configured'};}}});
 try{await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});const origin='http://127.0.0.1:'+server.address().port;
 const call=async(route,{body,token,cookie,foreign=false}={})=>{const r=await fetch(origin+route,{method:body?'POST':'GET',headers:{Origin:foreign?'https://foreign.test':origin,...(body?{'Content-Type':'application/json'}:{}),...(token?{Authorization:'Bearer '+token}:{}),...(cookie?{Cookie:cookie}:{})},body:body?JSON.stringify(body):undefined});return {status:r.status,cookie:r.headers.get('set-cookie'),data:await r.json()};};
 assert.equal((await call('/api/owner/orders')).status,401);assert.equal((await call('/api/owner/login',{body:{password},foreign:true})).status,403);assert.equal((await call('/api/owner/login',{body:{password:'wrong'}})).status,401);
 const request=input();const created=await call('/api/orders',{body:request});assert.equal(created.status,201);const id=created.data.order.id;assert.ok(!JSON.stringify(created.data).includes(request.clientKey));assert.equal((await call('/api/orders',{body:request})).status,200);assert.equal(alerts,1);assert.equal((await call('/api/orders/'+id)).status,404);assert.equal((await call('/api/orders/'+id+'/payment',{token:request.clientKey})).status,409);
 for(const action of ['approve','reject','paid'])assert.equal((await call('/api/owner/orders/'+id+'/'+action,{body:{total:100,note:'Customer attempt',detailsConfirmed:true,receiptChecked:true},token:request.clientKey})).status,401);
 const guestOwner=await fetch(origin+'/owner');assert.equal(guestOwner.headers.get('cache-control'),'private, no-store');assert.match(guestOwner.headers.get('x-robots-tag'),/noindex/);const guestHtml=await guestOwner.text();assert.match(guestHtml,/owner-login-form/);assert.doesNotMatch(guestHtml,/api\/owner\/app.js|Approve &amp; unlock|app.js"/);
 assert.equal((await fetch(origin+'/api/owner/app.js')).status,401);
 const login=await call('/api/owner/login',{body:{password}});assert.ok(login.cookie.includes('HttpOnly'));assert.ok(login.cookie.includes('SameSite=Strict'));const cookie=login.cookie.split(';')[0];
 const ownerPage=await fetch(origin+'/owner',{headers:{Cookie:cookie}});assert.match(await ownerPage.text(),/src="\/api\/owner\/app.js"/);
 const ownerApp=await fetch(origin+'/api/owner/app.js',{headers:{Cookie:cookie}});assert.equal(ownerApp.status,200);assert.match(ownerApp.headers.get('cache-control'),/no-store/);assert.match(await ownerApp.text(),/owner-approve-form/);
 const inbox=await call('/api/owner/orders',{cookie});assert.equal(inbox.data.orders.length,1);assert.ok(!JSON.stringify(inbox.data).includes('tokenHash'));
 assert.equal((await call('/api/owner/orders/'+id+'/approve',{body:{total:75,detailsConfirmed:true},cookie,foreign:true})).status,403);
 assert.equal((await call('/api/orders/'+id,{token:request.clientKey})).data.order.status,'pending');
 assert.equal((await call('/api/owner/orders/'+id+'/approve',{body:{total:75,note:'Delivery included',detailsConfirmed:true},cookie})).status,200);const payment=await call('/api/orders/'+id+'/payment',{token:request.clientKey});assert.equal(payment.status,200);assert.equal(payment.data.order.approvedTotal,7500);
 assert.equal((await call('/api/orders/'+id+'/report',{body:{reference:'TEST12345678'},token:request.clientKey})).data.order.status,'payment_reported');assert.equal((await call('/api/orders/'+id+'/payment',{token:'wrong'})).status,404);
 assert.equal((await call('/api/owner/orders/'+id+'/paid',{body:{receiptChecked:false},cookie})).status,400);assert.equal((await call('/api/owner/orders/'+id+'/paid',{body:{receiptChecked:true},cookie})).data.order.status,'paid');assert.equal((await call('/api/orders/'+id+'/payment',{token:request.clientKey})).status,409);
 assert.equal((await call('/api/owner/logout',{body:{},cookie})).status,200);assert.equal((await call('/api/owner/orders',{cookie})).status,401);
 assert.equal((await fetch(origin+'/api/owner/app.js',{headers:{Cookie:cookie}})).status,401);
 for(const route of ['/.private/orders.json','/.env','/backend/orders.mjs','/backend/owner-app.js','/backend/owner-page.mjs'])assert.equal((await fetch(origin+route)).status,404);
 }finally{await new Promise(resolve=>server.close(resolve));await rm(directory,{recursive:true,force:true});}
});
