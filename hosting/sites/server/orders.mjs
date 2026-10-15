import {findProduct,normalizeCart,quoteTotals,validateCheckout} from './catalogue/store.js';
import {hash,random,seal,unseal,equal} from './security.mjs';
export class OrderError extends Error{constructor(message,status=400){super(message);this.status=status;}}
export const fail=(message,status=400)=>{throw new OrderError(message,status);};
const clean=(value,max=500)=>typeof value==='string'?value.trim().slice(0,max):'';
export const publicOrder=o=>({id:o.id,status:o.status,createdAt:o.createdAt,updatedAt:o.updatedAt,items:o.items,estimate:o.estimate,approvedTotal:o.approvedTotal??null,ownerNote:o.ownerNote||'',paymentReference:o.paymentReference||'',notification:o.notification});
export const ownerOrder=o=>({...publicOrder(o),details:o.details,paidAt:o.paidAt??null});
export class OrderStore{
 constructor(env){this.db=env.DB;this.key=env.ORDER_ENCRYPTION_KEY;}
 async record(id){const row=await this.db.prepare('SELECT * FROM orders WHERE id = ?').bind(id).first();if(!row)fail('Order not found.',404);return {row,order:await unseal(row.payload,this.key,id)};}
 async page(before){
  const cursor=before?.match(/^(\d{4}-\d{2}-\d{2}T[\d:.]+Z)\|(SBB-[A-F0-9]{12})$/);
  if(before&&!cursor)fail('Invalid inbox page.');
  const query=cursor?this.db.prepare('SELECT id, payload, created_at FROM orders WHERE created_at < ? OR (created_at = ? AND id < ?) ORDER BY created_at DESC, id DESC LIMIT 101').bind(cursor[1],cursor[1],cursor[2]):this.db.prepare('SELECT id, payload, created_at FROM orders ORDER BY created_at DESC, id DESC LIMIT 101');
  const {results}=await query.all(),visible=results.slice(0,100),last=visible.at(-1);
  return {orders:await Promise.all(visible.map(row=>unseal(row.payload,this.key,row.id))),nextCursor:results.length>100?last.created_at+'|'+last.id:null};
 }
 async get(id,token){const {row,order}=await this.record(id);if(!equal(row.token_hash,await hash(token||'')))fail('Order not found. Use your private tracking link.',404);return order;}
 async create(input){
  const key=clean(input.clientKey,100);if(!/^[a-f0-9]{64}$/.test(key))fail('A valid private order key is required.');
  const details=Object.fromEntries(['name','email','phone','address','landmark','city','state','pincode','notes'].map(k=>[k,clean(input.details?.[k],k==='notes'?1500:500)]));
  if(Object.keys(validateCheckout(details)).length)fail('Please check your contact and delivery details.');
  if(!Array.isArray(input.items)||!input.items.length||input.items.length>100)fail('Choose at least one product.');
  for(const item of input.items){const p=findProduct(item?.id);if(!p||!Number.isInteger(item.quantity)||item.quantity<1||item.quantity>99||!p.options.includes(item.size)||(p.unit==='foot'&&(!Number.isFinite(item.lengthFeet)||item.lengthFeet<1||item.lengthFeet>1000||item.lengthFeet*2%1)))fail('A product selection is invalid. Please review your bag.');}
  const items=normalizeCart(input.items).map(item=>{const p=findProduct(item.id);return {...item,name:p.name,nameKn:p.nameKn,unit:p.unit,price:p.price,priceMax:p.priceMax};});const fingerprint=await hash(JSON.stringify({details,items})),tokenHash=await hash(key),now=new Date().toISOString();
  const order={id:'SBB-'+random(6).toUpperCase(),details,items,estimate:quoteTotals(items),status:'pending',createdAt:now,updatedAt:now,notification:{status:'not_configured'}};
  const result=await this.db.prepare('INSERT INTO orders(id, token_hash, fingerprint, payload, created_at) VALUES(?, ?, ?, ?, ?) ON CONFLICT(token_hash) DO NOTHING').bind(order.id,tokenHash,fingerprint,await seal(order,this.key,order.id),now).run();
  if(result.meta.changes===1)return {order,created:true};
  const old=await this.db.prepare('SELECT * FROM orders WHERE token_hash = ?').bind(tokenHash).first();if(!old||!equal(old.fingerprint,fingerprint))fail('This submission was already used. Start a new order request.',409);
  return {order:await unseal(old.payload,this.key,old.id),created:false};
 }
 async update(id,action,input={}){
  const {row,order:o}=await this.record(id);
  if(action==='approve'){if(o.status!=='pending')fail('Only a pending order can be approved.',409);const amount=Number(input.total);if(!Number.isFinite(amount)||amount<=0||amount>10000000||Math.abs(amount*100-Math.round(amount*100))>0.00001)fail('Enter a valid final total with at most two decimal places.');if(input.detailsConfirmed!==true)fail('Confirm availability, specifications and the final total with delivery.');o.approvedTotal=Math.round(amount*100);o.ownerNote=clean(input.note,1500);o.status='approved';}
  else if(action==='reject'){if(o.status!=='pending')fail('Only a pending request can be declined.',409);if(!clean(input.note))fail('Please explain why this request cannot be accepted.');o.ownerNote=clean(input.note,1500);o.status='rejected';}
  else if(action==='paid'){if(!['approved','payment_reported'].includes(o.status))fail('This order is not awaiting payment verification.',409);if(input.receiptChecked!==true)fail('Confirm you checked receipt in your merchant account.');o.status='paid';o.paidAt=new Date().toISOString();}
  else if(action==='report'){if(!['approved','payment_reported'].includes(o.status))fail('Payment is available after owner approval.',409);if(!/^[A-Za-z0-9 -]{6,80}$/.test(clean(input.reference,81)))fail('Enter your UPI reference (6–80 letters or numbers).');o.paymentReference=clean(input.reference,80);o.status='payment_reported';}
  else fail('Unknown order action.');
  o.updatedAt=new Date().toISOString();const result=await this.db.prepare('UPDATE orders SET payload = ?, version = version + 1 WHERE id = ? AND version = ?').bind(await seal(o,this.key,id),id,row.version).run();
  if(result.meta.changes!==1)fail('This order changed. Refresh before trying again.',409);return o;
 }
}
