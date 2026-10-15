import {randomBytes,createHash,timingSafeEqual} from 'node:crypto';
import {mkdir,readFile,writeFile,rename} from 'node:fs/promises';
import path from 'node:path';
import {findProduct,normalizeCart,quoteTotals,validateCheckout} from '../dist/store.js';
import {orderEncryption,hashOwnerPassword,checkOwnerPassword,parseOwnerHash} from './security.mjs';
export const hash=value=>createHash('sha256').update(value).digest('hex');
export const equal=(a,b)=>typeof a==='string'&&typeof b==='string'&&a.length===b.length&&timingSafeEqual(Buffer.from(a),Buffer.from(b));
export class OrderError extends Error{constructor(message,status=400){super(message);this.status=status;}}
const fail=(message,status=400)=>{throw new OrderError(message,status);};
const clean=(value,max=500)=>typeof value==='string'?value.trim().slice(0,max):'';
export const publicOrder=o=>({id:o.id,status:o.status,createdAt:o.createdAt,updatedAt:o.updatedAt,items:o.items,estimate:o.estimate,approvedTotal:o.approvedTotal??null,ownerNote:o.ownerNote||'',paymentReference:o.paymentReference||'',notification:o.notification});
export const ownerOrder=o=>({...publicOrder(o),details:o.details,paidAt:o.paidAt??null});
export class OrderStore{
 constructor(directory,options={}){this.directory=directory;this.file=path.join(directory,'orders.json');this.queue=Promise.resolve();this.keyValue=options.encryptionKey;}
 async init(){await mkdir(this.directory,{recursive:true});this.encryption=await orderEncryption(this.directory,this.keyValue??process.env.ORDER_ENCRYPTION_KEY);try{await writeFile(this.file,this.encryption.encrypt([]),{flag:'wx',mode:0o600});}catch(e){if(e.code!=='EEXIST')throw e;}const existing=await readFile(this.file,'utf8');if(Array.isArray(JSON.parse(existing))){await writeFile(this.file+'.tmp',this.encryption.encrypt(JSON.parse(existing)),{mode:0o600});await rename(this.file+'.tmp',this.file);}else this.encryption.decrypt(existing);}
 async all(){if(!this.encryption)await this.init();return this.encryption.decrypt(await readFile(this.file,'utf8'));}
 mutate(fn){const result=this.queue.then(async()=>{const orders=await this.all();const value=await fn(orders);await writeFile(this.file+'.tmp',this.encryption.encrypt(orders),{mode:0o600});await rename(this.file+'.tmp',this.file);return value;});this.queue=result.catch(()=>{});return result;}
 async get(id,token){const o=(await this.all()).find(o=>o.id===id);if(!o||!equal(o.tokenHash,hash(token||'')))fail('Order not found. Use your private tracking link.',404);return o;}
 async create(input){
  const key=clean(input.clientKey,100);if(!/^[a-f0-9]{64}$/.test(key))fail('A valid private order key is required.');
  const details=Object.fromEntries(['name','email','phone','address','landmark','city','state','pincode','notes'].map(k=>[k,clean(input.details?.[k],k==='notes'?1500:500)]));
  if(Object.keys(validateCheckout(details)).length)fail('Please check your contact and delivery details.');
  if(!Array.isArray(input.items)||!input.items.length||input.items.length>100)fail('Choose at least one product.');
  for(const item of input.items){const p=findProduct(item?.id);if(!p||!Number.isInteger(item.quantity)||item.quantity<1||item.quantity>99||!p.options.includes(item.size)||(p.unit==='foot'&&(!Number.isFinite(item.lengthFeet)||item.lengthFeet<1||item.lengthFeet>1000||item.lengthFeet*2%1)))fail('A product selection is invalid. Please review your bag.');}
  const items=normalizeCart(input.items).map(item=>{const p=findProduct(item.id);return {...item,name:p.name,nameKn:p.nameKn,unit:p.unit,price:p.price,priceMax:p.priceMax};});const fingerprint=hash(JSON.stringify({details,items}));
  return this.mutate(orders=>{const old=orders.find(o=>o.tokenHash===hash(key));if(old){if(old.fingerprint!==fingerprint)fail('This submission was already used. Start a new order request.',409);return {order:old,created:false};}const now=new Date().toISOString();const o={id:'SBB-'+randomBytes(6).toString('hex').toUpperCase(),tokenHash:hash(key),fingerprint,details,items,estimate:quoteTotals(items),status:'pending',createdAt:now,updatedAt:now,notification:{status:'not_configured'}};orders.push(o);return {order:o,created:true};});
 }
 async update(id,action,input={}){return this.mutate(orders=>{const o=orders.find(x=>x.id===id);if(!o)fail('Order not found.',404);
  if(action==='approve'){if(o.status!=='pending')fail('Only a pending order can be approved.',409);const amount=Number(input.total);if(!Number.isFinite(amount)||amount<=0||amount>10000000||Math.abs(amount*100-Math.round(amount*100))>0.00001)fail('Enter a valid final total with at most two decimal places.');if(input.detailsConfirmed!==true)fail('Confirm availability, specifications and the final total with delivery.');o.approvedTotal=Math.round(amount*100);o.ownerNote=clean(input.note,1500);o.status='approved';}
  else if(action==='reject'){if(o.status!=='pending')fail('Only a pending request can be declined.',409);if(!clean(input.note))fail('Please explain why this request cannot be accepted.');o.ownerNote=clean(input.note,1500);o.status='rejected';}
  else if(action==='paid'){if(!['approved','payment_reported'].includes(o.status))fail('This order is not awaiting payment verification.',409);if(input.receiptChecked!==true)fail('Confirm you checked receipt in your merchant account.');o.status='paid';o.paidAt=new Date().toISOString();}
  else if(action==='report'){if(!['approved','payment_reported'].includes(o.status))fail('Payment is available after owner approval.',409);if(!/^[A-Za-z0-9 -]{6,80}$/.test(clean(input.reference,81)))fail('Enter your UPI reference (6–80 letters or numbers).');o.paymentReference=clean(input.reference,80);o.status='payment_reported';}
  else fail('Unknown order action.');o.updatedAt=new Date().toISOString();return o;});}
 async notification(id,notification){return this.mutate(orders=>{const o=orders.find(x=>x.id===id);if(o)o.notification=notification;return o;});}
}
export async function ownerCredentials(directory,password){
 await mkdir(directory,{recursive:true});const file=path.join(directory,'owner-auth.json');
 if(!password&&process.env.OWNER_PASSWORD_HASH)return parseOwnerHash(process.env.OWNER_PASSWORD_HASH);
 if(process.env.NODE_ENV==='production')throw new Error('Set OWNER_PASSWORD_HASH before running in production.');
 if(password){if(password.length<16)throw new Error('OWNER_PASSWORD must contain at least 16 characters.');return hashOwnerPassword(password);}
 try{return JSON.parse(await readFile(file,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
 if(process.env.NODE_ENV==='production')throw new Error('Set OWNER_PASSWORD before running in production.');
 const generated=randomBytes(24).toString('base64url');const credentials=await hashOwnerPassword(generated);
 await writeFile(file,JSON.stringify(credentials),{mode:0o600,flag:'wx'});
 await writeFile(path.join(directory,'owner-access.txt'),`Local owner access\nOpen http://localhost:4173/#/owner\nOwner number: 9591457484\nPassword: ${generated}\n\nKeep this file private. It is excluded from the website and ZIP. For hosting, set OWNER_PASSWORD in the server secret environment.\n`,{mode:0o600,flag:'wx'});return credentials;
}
export const verifyPassword=checkOwnerPassword;
