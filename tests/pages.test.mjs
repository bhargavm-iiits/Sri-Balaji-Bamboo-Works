import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
import vm from 'node:vm';
import {products,priceLabel} from '../dist/store.js';

const files=['config.js','catalogue.js','prices.js','store.js','landing.js','motion.js','order-flow.js','app.js'];
const sources=await Promise.all(files.map(file=>readFile(new URL('../dist/'+file,import.meta.url),'utf8')));
sources[7]=sources[7].slice(0,sources[7].indexOf("document.addEventListener('click',event=>{"));
const code=sources.map(source=>source.replace(/^import .*;\r?\n/gm,'').replace(/^export \{[^}]*\};?\r?\n/gm,'').replace(/\bexport (?=(?:async function|const|let|function|class)\b)/g,'')).join('\n');
const context=vm.createContext({Intl,URLSearchParams,localStorage:{getItem:()=>null},sessionStorage:{getItem:()=>null},matchMedia:()=>({matches:false})});
vm.runInContext(code+'\nglobalThis.views={home,collections,shop,productPage,cartPage,checkout,story,bulk,contact,care,payment,requestPage,requestText,seedRequest:request=>{lastRequest=request;},seed:items=>{cart=normalizeCart(items);}};',context);
const {views}=context;

test('public payment entry requires owner approval and keeps legacy requests unpaid',()=>{
 const html=views.payment();
 assert.ok(html.includes('Payment opens only for an order approved by the workshop.'));
 assert.ok(!html.includes('merchant-upi-qr.jpg'));
 views.seedRequest({kind:'order',reference:'TEST-UNPAID',details:{name:'QA customer'},items:[{id:'bechanage',quantity:1}]});
 const request=views.requestPage();
 assert.ok(request.includes('Prepared on this device. Not yet sent.'));
 assert.doesNotMatch(request,/Payment successful|Payment received|Order confirmed/);
});

test('all catalogue pages render with bilingual names and the correct current price',async()=>{
 for(const p of products){const html=views.productPage(p.id);assert.ok(html.includes(p.name));assert.ok(html.includes(p.nameKn));assert.ok(html.includes(priceLabel(p)));assert.doesNotMatch(html,/undefined|NaN/);for(const [,asset] of html.matchAll(/src="assets\/([^"?]+)"/g))await access(new URL('../dist/assets/'+asset,import.meta.url));}
});
test('main page templates render the complete catalogue and collection journey',()=>{
 const pages=[views.home(),views.collections(),views.shop(new URLSearchParams()),views.cartPage(),views.story(),views.bulk(new URLSearchParams()),views.contact(),views.care()];
 for(const html of pages)assert.doesNotMatch(html,/undefined|NaN/);
 assert.equal((pages[0].match(/class="journey-panel"/g)||[]).length,9);
 for(const p of products)assert.ok(pages[1].includes('/product/'+p.id));
});
test('cart, checkout and share text preserve ladder lengths, pair units and ranges',()=>{
 const items=[{id:'bamboo-ladder',quantity:2,lengthFeet:8},{id:'bamboo-poles',quantity:1},{id:'small-basket',quantity:1}];
 views.seed(items);
 for(const html of [views.cartPage(),views.checkout()]){assert.ok(html.includes('₹2,310–₹2,440'));assert.ok(html.includes('8 ft per ladder'));assert.ok(html.includes('₹800 / pair'));assert.doesNotMatch(html,/undefined|NaN/);}
 const text=views.requestText({kind:'order',reference:'TEST',details:{name:'Customer'},items});
 assert.ok(text.includes('₹2,310–₹2,440'));assert.ok(text.includes('price unit to confirm'));assert.ok(text.includes('₹85–₹90 / foot'));assert.ok(text.includes('Qty 1 pairs'));
});
