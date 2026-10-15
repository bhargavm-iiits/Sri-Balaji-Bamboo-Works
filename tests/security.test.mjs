import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {randomBytes} from 'node:crypto';
import {orderEncryption,totp,checkTotp,hashOwnerPassword,encodeOwnerHash,parseOwnerHash,checkOwnerPassword} from '../backend/security.mjs';
import {OrderStore} from '../backend/orders.mjs';
import {createStorefrontServer} from '../server.mjs';
test('AES-256-GCM has fresh nonces, authenticated ciphertext and fail-closed key checks',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'sbb-crypto-'));try{const key=randomBytes(32).toString('base64');const codec=await orderEncryption(dir,key),payload=[{name:'Private QA name',address:'Private QA address'}];const first=codec.encrypt(payload),second=codec.encrypt(payload);assert.notEqual(first,second);assert.ok(!first.includes('Private QA'));assert.deepEqual(codec.decrypt(first),payload);const changed=JSON.parse(first);const ciphertext=Buffer.from(changed.data,'base64');ciphertext[0]^=1;changed.data=ciphertext.toString('base64');assert.throws(()=>codec.decrypt(JSON.stringify(changed)));const wrong=await orderEncryption(dir,randomBytes(32).toString('base64'));assert.throws(()=>wrong.decrypt(first),/does not match/);await assert.rejects(orderEncryption(dir,'short'),/32-byte/);
 }finally{await rm(dir,{recursive:true,force:true});}
});
test('existing plaintext orders migrate without exposing their contents at rest',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'sbb-migrate-'));try{const old=[{id:'QA-LEGACY',details:{email:'private@example.test'}}];await writeFile(path.join(dir,'orders.json'),JSON.stringify(old));const store=new OrderStore(dir);await store.init();assert.deepEqual(await store.all(),old);const disk=await readFile(path.join(dir,'orders.json'),'utf8');assert.ok(!disk.includes('private@example.test'));assert.equal(JSON.parse(disk).algorithm,'AES-256-GCM');const again=new OrderStore(dir);await again.init();assert.deepEqual(await again.all(),old);
 }finally{await rm(dir,{recursive:true,force:true});}
});
test('TOTP matches RFC 6238 and rejects replayed, expired and malformed codes',()=>{
 const secret='GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';assert.equal(totp(secret,59000,8),'94287082');const now=1650000000000,code=totp(secret,now),step=checkTotp(secret,code,-1,now);assert.equal(step,Math.floor(now/30000));assert.equal(checkTotp(secret,code,step,now),null);assert.equal(checkTotp(secret,code,-1,now+120000),null);assert.equal(checkTotp(secret,'abcdef',-1,now),null);
});
test('production password hashes retain strong scrypt parameters',async()=>{
 const c=await hashOwnerPassword('QA-only-strong-owner-passphrase');const encoded=encodeOwnerHash(c);assert.equal(parseOwnerHash(encoded).N,131072);assert.ok(await checkOwnerPassword('QA-only-strong-owner-passphrase',parseOwnerHash(encoded)));assert.equal(await checkOwnerPassword('incorrect',c),false);assert.throws(()=>parseOwnerHash(encoded.replace('$131072$','$16384$')),/invalid/);
});
test('real HTTP pages are crawlable and CSP-protected; owner login requires configured MFA',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'sbb-headers-'));const secret='GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ',password='QA-only-owner-password-123';const server=await createStorefrontServer({dataDir:dir,ownerPassword:password,mfaSecret:secret});
 try{await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin='http://127.0.0.1:'+server.address().port;
 const page=await fetch(origin+'/product/bechanage');const html=await page.text();assert.equal(page.status,200);assert.ok(html.includes('Bechanage · Hand Fan'));assert.ok(html.includes('<base href="/">'));assert.ok(html.includes('rel="canonical" href="https://www.balajibambooworks.com/product/bechanage"'));assert.ok(html.includes('application/ld+json'));assert.ok(!html.includes('__CSP_NONCE__'));assert.ok(page.headers.get('content-security-policy').includes("frame-ancestors 'none'"));assert.equal(page.headers.get('referrer-policy'),'no-referrer');assert.equal((await fetch(origin+'/owner')).headers.get('x-robots-tag'),'noindex, nofollow');assert.ok((await (await fetch(origin+'/robots.txt')).text()).includes('Disallow: /'));
 const call=async body=>{const r=await fetch(origin+'/api/owner/login',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(body)});return r.status;};assert.equal(await call({password}),401);assert.equal(await call({password,otp:'000000'}),401);const code=totp(secret);assert.equal(await call({password,otp:code}),200);assert.equal(await call({password,otp:code}),401);
 }finally{await new Promise(resolve=>server.close(resolve));await rm(dir,{recursive:true,force:true});}
});
