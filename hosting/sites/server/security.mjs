import {scrypt} from 'node:crypto';
import {Buffer} from 'node:buffer';
const bytes=new TextEncoder();
export const hex=value=>[...new Uint8Array(value)].map(b=>b.toString(16).padStart(2,'0')).join('');
export const random=n=>hex(crypto.getRandomValues(new Uint8Array(n)));
export const hash=async value=>hex(await crypto.subtle.digest('SHA-256',bytes.encode(value)));
const decode=value=>Uint8Array.from(atob(value),c=>c.charCodeAt(0));
const encode=value=>btoa(String.fromCharCode(...new Uint8Array(value)));
export function equal(a,b){if(typeof a!=='string'||typeof b!=='string'||a.length!==b.length)return false;let diff=0;for(let i=0;i<a.length;i++)diff|=a.charCodeAt(i)^b.charCodeAt(i);return diff===0;}
const passwordPattern=/^scrypt\$32768\$8\$3\$([a-f0-9]{32})\$([a-f0-9]{128})$/;
export const passwordConfigured=value=>typeof value==='string'&&passwordPattern.test(value);
const derivePassword=(password,salt)=>new Promise((resolve,reject)=>scrypt(password,Buffer.from(salt,'hex'),64,{N:32768,r:8,p:3,maxmem:64*1024*1024},(error,key)=>error?reject(error):resolve(key.toString('hex'))));
export async function hashPassword(password){if(typeof password!=='string'||password.length<16||password.length>256)throw new Error('Use a password between 16 and 256 characters.');const salt=random(16);return `scrypt$32768$8$3$${salt}$${await derivePassword(password,salt)}`;}
export async function verifyPassword(password,encoded){const match=typeof encoded==='string'&&encoded.match(passwordPattern);if(!match||typeof password!=='string'||password.length<1||password.length>256)return false;return equal(await derivePassword(password,match[1]),match[2]);}
export async function seal(value,keyValue,id){
 const raw=decode(keyValue);if(raw.length!==32)throw new Error('Invalid storage key.');
 const key=await crypto.subtle.importKey('raw',raw,'AES-GCM',false,['encrypt']);const iv=crypto.getRandomValues(new Uint8Array(12));
 const data=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:bytes.encode('sbb-d1:v1:'+id),tagLength:128},key,bytes.encode(JSON.stringify(value)));
 return JSON.stringify({v:1,algorithm:'AES-256-GCM',iv:encode(iv),data:encode(data)});
}
export async function unseal(text,keyValue,id){
 const v=JSON.parse(text);if(v.v!==1||v.algorithm!=='AES-256-GCM')throw new Error('Invalid encrypted record.');
 const raw=decode(keyValue);if(raw.length!==32)throw new Error('Invalid storage key.');
 const key=await crypto.subtle.importKey('raw',raw,'AES-GCM',false,['decrypt']);
 return JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:decode(v.iv),additionalData:bytes.encode('sbb-d1:v1:'+id),tagLength:128},key,decode(v.data))));
}
function decode32(value){if(!/^[A-Z2-7]{32,64}$/.test(value||''))throw new Error('Invalid authenticator configuration.');const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';let bits=0,n=0;const result=[];for(const c of value){n=(n<<5)|alphabet.indexOf(c);bits+=5;if(bits>=8){result.push((n>>>(bits-8))&255);bits-=8;}}return new Uint8Array(result);}
export async function totp(secret,time=Date.now(),digits=6){
 const key=await crypto.subtle.importKey('raw',decode32(secret),{name:'HMAC',hash:'SHA-1'},false,['sign']);const counter=new Uint8Array(8);new DataView(counter.buffer).setBigUint64(0,BigInt(Math.floor(time/30000)));
 const digest=new Uint8Array(await crypto.subtle.sign('HMAC',key,counter));const offset=digest[19]&15;return String((new DataView(digest.buffer).getUint32(offset)&0x7fffffff)%10**digits).padStart(digits,'0');
}
export async function otpStep(secret,code,time=Date.now()){
 if(!/^\d{6}$/.test(code||''))return null;for(const offset of [-1,0,1]){const step=Math.floor(time/30000)+offset;if(step>=0&&equal(await totp(secret,step*30000),code))return step;}return null;
}
export function headers({nonce,indexable=false}={}){return {'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY','Referrer-Policy':'no-referrer','Permissions-Policy':'camera=(), microphone=(), geolocation=(), payment=()','Strict-Transport-Security':'max-age=15552000','Content-Security-Policy':`default-src 'self'; script-src 'self'${nonce?" 'nonce-"+nonce+"'":''}; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'`,...(!indexable?{'X-Robots-Tag':'noindex, nofollow'}:{})};}
