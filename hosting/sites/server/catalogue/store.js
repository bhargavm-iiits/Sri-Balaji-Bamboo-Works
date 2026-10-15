import {catalogue,categoryInfo} from './catalogue.js';
import {pricing} from './prices.js';
export {categoryInfo};
export const categories=Object.fromEntries(Object.entries(categoryInfo).map(([id,value])=>[id,value.name]));
export const products=catalogue.map(item=>({...item,position:'50% 50%',...{price:pricing[item.id]?.min??null,priceMax:pricing[item.id]?.max??null,unit:pricing[item.id]?.unit??null}}));
export const productAliases={'round-utility-basket':'biryani-basket','deep-woven-basket':'marriage-basket','shallow-woven-tray':'shibbilu-pair','traditional-winnowing-tray':'mara-medium','accent-weave-tray':'mara-small'};
export const findProduct=id=>products.find(p=>p.id===(productAliases[id]||id));
export const money=value=>new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',minimumFractionDigits:0,maximumFractionDigits:2}).format(value);
export const amountRange=(low,high=low)=>low===high?money(low):money(low)+'–'+money(high);
export const priceLabel=p=>p.price===null?'Price on request':amountRange(p.price,p.priceMax??p.price)+(p.unit?' / '+p.unit:'');
export function normalizeCart(value){
 if(!Array.isArray(value))return [];
 const result=[];
 for(const item of value){
  if(!item)continue;
  const p=findProduct(item.id);if(!p)continue;
  const number=Number(item.quantity);if(!Number.isFinite(number))continue;
  const quantity=Math.min(99,Math.max(0,Math.trunc(number)));if(!quantity)continue;
  const size=p.options.includes(item.size)?item.size:p.options[0];
  const lengthFeet=p.unit==='foot'?Number(item.lengthFeet):null;
  if(p.unit==='foot'&&(!Number.isFinite(lengthFeet)||lengthFeet<1||lengthFeet>1000))continue;
  const existing=result.find(x=>x.id===p.id&&x.size===size&&x.lengthFeet===lengthFeet);
  if(existing)existing.quantity=Math.min(99,existing.quantity+quantity);
  else result.push({id:p.id,size,quantity,lengthFeet});
 }
 return result;
}
export function lineQuote(item){
 const p=findProduct(item.id);if(!p||p.price===null)return {low:0,high:0,pending:true};
 const factor=item.quantity*(p.unit==='foot'?item.lengthFeet:1);
 return {low:Math.round(p.price*factor*100)/100,high:Math.round((p.priceMax??p.price)*factor*100)/100,pending:false};
}
export function quoteTotals(cart){
 return normalizeCart(cart).reduce((total,item)=>{const line=lineQuote(item);return {low:Math.round((total.low+line.low)*100)/100,high:Math.round((total.high+line.high)*100)/100,pending:total.pending||line.pending};},{low:0,high:0,pending:false});
}
export const cartTotal=cart=>quoteTotals(cart).low;
export const cartCount=cart=>normalizeCart(cart).reduce((sum,item)=>sum+item.quantity,0);
export function filterProducts({category='',query='',sort='featured'}={}){
 const needle=query.toLocaleLowerCase().trim();
 let result=products.filter(p=>(!category||p.category===category)&&(!needle||[p.name,p.nameKn,p.localName,p.description,categories[p.category],categoryInfo[p.category].kn].join(' ').toLocaleLowerCase().includes(needle)));
 if(sort==='featured'&&needle){const score=p=>[p.name,p.nameKn,p.localName].join(' ').toLocaleLowerCase().includes(needle)?1:0;result.sort((a,b)=>score(b)-score(a));}
 if(sort==='price-low')result.sort((a,b)=>(a.price??Infinity)-(b.price??Infinity));
 if(sort==='price-high')result.sort((a,b)=>(b.price??-Infinity)-(a.price??-Infinity));
 if(sort==='name')result.sort((a,b)=>a.name.localeCompare(b.name));
 return result;
}
export function validateCheckout(data){
 const errors={};
 for(const key of ['name','email','phone','address','city','state','pincode'])if(!String(data[key]||'').trim())errors[key]='Please complete this field.';
 if(data.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email))errors.email='Enter a valid email address.';
 if(data.phone&&!/^(?:\+91[ -]?)?[6-9]\d{9}$/.test(data.phone.replace(/[\s()-]/g,'')))errors.phone='Enter a valid 10-digit Indian mobile number.';
 if(data.pincode&&!/^[1-9]\d{5}$/.test(data.pincode))errors.pincode='Enter a valid 6-digit PIN code.';
 return errors;
}
