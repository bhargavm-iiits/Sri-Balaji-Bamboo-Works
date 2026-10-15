import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFile,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {randomBytes} from 'node:crypto';
import {handle} from '../server/handler.mjs';
import {OrderStore} from '../server/orders.mjs';
import {seal,unseal,totp,random} from '../server/security.mjs';
import {findProduct} from '../server/catalogue/store.js';
class D1 {
 constructor(file){this.db=new DatabaseSync(file);}
 prepare(sql){const query=this.db.prepare(sql);let args=[];return {bind(...values){args=values;return this;},async first(){return query.get(...args)||null;},async all(){return {results:query.all(...args)};},async run(){const result=query.run(...args);return {meta:{changes:result.changes}};}};}
 async batch(queries){this.db.exec('BEGIN');try{const result=[];for(const q of queries)result.push(await q.run());this.db.exec('COMMIT');return result;}catch(e){this.db.exec('ROLLBACK');throw e;}}
}
const details={name:'QA Customer',email:'qa@example.test',phone:'9000000000',address:'Synthetic address',city:'Test city',state:'Karnataka',pincode:'562105'};
const input=()=>({clientKey:random(32),details,items:[{id:'bechanage',size:findProduct('bechanage').options[0],quantity:1}]});
const setup=async()=>{const dir=await mkdtemp(path.join(tmpdir(),'bamboo-d1-'));const db=new D1(path.join(dir,'orders.db'));db.db.exec(await readFile(new URL('../drizzle/0000_stormy_carmella_unuscione.sql',import.meta.url),'utf8'));return {dir,db,env:{DB:db,ORDER_ENCRYPTION_KEY:randomBytes(32).toString('base64'),OWNER_EMAIL:'owner@example.test',OWNER_TOTP_SECRET:'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ',INDEXING_ENABLED:'true'}};};
const ownerHeaders={'oai-authenticated-user-id':'synthetic-owner','oai-authenticated-user-email':'owner@example.test'};
const call=async(env,url,{body,token,cookie,owner=false,foreign=false}={})=>handle(new Request('https://shop.example.test'+url,{method:body?'POST':'GET',headers:{Origin:foreign?'https://other.example':'https://shop.example.test',...(body?{'Content-Type':'application/json'}:{}),...(owner?ownerHeaders:{}),...(token?{Authorization:'Bearer '+token}:{}),...(cookie?{Cookie:cookie}:{})},body:body?JSON.stringify(body):undefined}),env);

test('AES GCM authenticates ciphertext, associated order id and key',async()=>{const key=randomBytes(32).toString('base64'),value={details};const a=await seal(value,key,'A'),b=await seal(value,key,'A');assert.notEqual(a,b);assert.deepEqual(await unseal(a,key,'A'),value);assert.ok(!a.includes(details.email));await assert.rejects(unseal(a,key,'B'));await assert.rejects(unseal(a,randomBytes(32).toString('base64'),'A'));});
test('RFC authenticator vector',async()=>assert.equal(await totp('GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ',59000,8),'94287082'));
test('database retains encrypted idempotent orders and rejects competing state changes',async()=>{
 const {dir,db,env}=await setup();try{const s=new OrderStore(env),request=input();const created=await s.create(request);assert.equal(created.created,true);assert.equal((await s.create(request)).created,false);assert.ok(!db.db.prepare('SELECT payload FROM orders').get().payload.includes(details.email));await assert.rejects(s.get(created.order.id,'bad'));assert.equal((await s.get(created.order.id,request.clientKey)).status,'pending');await assert.rejects(s.update(created.order.id,'report',{reference:'TEST12345'}));const outcomes=await Promise.allSettled([s.update(created.order.id,'approve',{total:75,detailsConfirmed:true}),s.update(created.order.id,'approve',{total:100,detailsConfirmed:true})]);assert.equal(outcomes.filter(x=>x.status==='fulfilled').length,1);await s.update(created.order.id,'report',{reference:'QA-NO-PAYMENT'});assert.equal((await s.get(created.order.id,request.clientKey)).status,'payment_reported');await assert.rejects(s.update(created.order.id,'paid',{}));await s.update(created.order.id,'paid',{receiptChecked:true});db.db.close();const restarted=new D1(path.join(dir,'orders.db'));assert.equal((await new OrderStore({...env,DB:restarted}).get(created.order.id,request.clientKey)).status,'paid');restarted.db.close();}finally{try{db.db.close();}catch{}await rm(dir,{recursive:true,force:true});}
});
test('server requires owner identity plus MFA and never grants mutation through tracking keys',async()=>{
 const {dir,db,env}=await setup();try{const request=input(),created=await call(env,'/api/orders',{body:request}),id=(await created.json()).order.id;assert.equal(created.status,201);assert.equal((await call(env,'/api/orders/'+id+'/payment',{token:request.clientKey})).status,409);
 for(const action of ['approve','reject','paid'])assert.equal((await call(env,'/api/owner/orders/'+id+'/'+action,{token:request.clientKey,body:{total:75,detailsConfirmed:true,receiptChecked:true}})).status,401);
 assert.equal((await call(env,'/api/owner/orders',{owner:true})).status,401);assert.equal((await call(env,'/api/owner/app.js')).status,401);const guest=await call(env,'/owner');assert.match(await guest.text(),/Sign in with ChatGPT/);assert.match(guest.headers.get('x-robots-tag'),/noindex/);
 assert.equal((await call(env,'/api/owner/login',{owner:true,body:{otp:'000000'}})).status,401);const otp=await totp(env.OWNER_TOTP_SECRET),login=await call(env,'/api/owner/login',{owner:true,body:{otp}});assert.equal(login.status,200);const cookie=login.headers.get('set-cookie').split(';')[0];assert.match(login.headers.get('set-cookie'),/HttpOnly/);assert.match(login.headers.get('set-cookie'),/Secure/);assert.equal((await call(env,'/api/owner/login',{owner:true,body:{otp}})).status,401);assert.equal((await call(env,'/api/owner/orders',{owner:true,cookie})).status,200);
 assert.equal((await call(env,'/api/owner/orders',{cookie})).status,401);assert.equal((await call(env,'/api/owner/orders/'+id+'/approve',{owner:true,cookie,foreign:true,body:{total:75,detailsConfirmed:true}})).status,403);assert.equal((await call(env,'/api/owner/orders/'+id+'/approve',{owner:true,cookie,body:{total:75,detailsConfirmed:true}})).status,200);assert.equal((await (await call(env,'/api/orders/'+id+'/payment',{token:request.clientKey})).json()).order.approvedTotal,7500);
 const code=await call(env,'/api/owner/app.js',{owner:true,cookie});assert.match(await code.text(),/owner-approve-form/);await call(env,'/api/owner/logout',{owner:true,cookie,body:{}});assert.equal((await call(env,'/api/owner/app.js',{owner:true,cookie})).status,401);
 }finally{db.db.close();await rm(dir,{recursive:true,force:true});}
});
test('crawlable public pages use the deployed origin and omit owner controls',async()=>{
 const {dir,db,env}=await setup();try{for(const route of ['/','/care','/shop','/product/bechanage','/orders']){const r=await call(env,route),html=await r.text();assert.equal(r.status,200);assert.doesNotMatch(html,/href="\/owner|owner-approve-form/);assert.match(html,/https:\/\/shop.example.test/);assert.ok(!html.includes('https://www.balajibambooworks.com'));if(route==='/orders')assert.match(r.headers.get('x-robots-tag'),/noindex/);}const sitemap=await (await call(env,'/sitemap.xml')).text();assert.ok(!sitemap.includes('/owner'));assert.ok(sitemap.includes('https://shop.example.test/product/bechanage'));assert.equal((await call(env,'/backend/owner-app.js')).status,404);}finally{db.db.close();await rm(dir,{recursive:true,force:true});}
});

test('Google verification is escaped and only added to public pages',async()=>{const {dir,db,env}=await setup();try{const configured={...env,GOOGLE_SITE_VERIFICATION:'QA-verification"<test>'};const home=await (await call(configured,'/')).text();assert.ok(home.includes('name="google-site-verification" content="QA-verification&quot;&lt;test&gt;"'));const orderPage=await (await call(configured,'/orders')).text();assert.ok(!orderPage.includes('google-site-verification'));}finally{db.db.close();await rm(dir,{recursive:true,force:true});}});
