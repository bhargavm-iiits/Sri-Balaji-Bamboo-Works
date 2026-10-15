import test from 'node:test';
import assert from 'node:assert/strict';
import {access} from 'node:fs/promises';
import {products,categoryInfo,findProduct,normalizeCart,quoteTotals,cartCount,filterProducts,priceLabel,validateCheckout} from '../dist/store.js';

test('24 bilingual products in nine collections have real local assets',async()=>{
 assert.equal(products.length,24);assert.equal(Object.keys(categoryInfo).length,9);
 assert.equal(new Set(products.map(p=>p.id)).size,24);
 for(const p of products){assert.ok(categoryInfo[p.category]);assert.match(p.nameKn,/[\u0c80-\u0cff]/);await access(new URL('../dist/assets/'+p.image,import.meta.url));for(const file of p.photos)await access(new URL('../dist/assets/'+file,import.meta.url));}
});
test('latest owner prices override earlier units and values',()=>{
 assert.equal(priceLabel(findProduct('bechanage')),'₹50 / piece');
 assert.equal(priceLabel(findProduct('bamboo-galuvu')),'₹350 / piece');
 assert.equal(priceLabel(findProduct('bamboo-poles')),'₹800 / pair');
 assert.equal(priceLabel(findProduct('bamboo-ladder')),'₹85–₹90 / foot');
 assert.equal(findProduct('small-basket').category,'butti');
 assert.deepEqual([findProduct('small-basket').price,findProduct('small-basket').priceMax],[150,200]);
 assert.equal(findProduct('mara-small').price,150);assert.equal(findProduct('hammer-sticks').unit,null);
});
test('range and pair totals remain ranges in the quotation',()=>{
 const cart=[{id:'small-basket',quantity:2},{id:'bamboo-poles',quantity:2},{id:'shibbilu-pair',quantity:1},{id:'bechanage',quantity:3}];
 assert.deepEqual(quoteTotals(cart),{low:2450,high:2550,pending:false});assert.equal(cartCount(cart),8);
});
test('ladder prices multiply feet by ladder count and keep lengths separate',()=>{
 const cart=normalizeCart([{id:'bamboo-ladder',quantity:2,lengthFeet:8},{id:'bamboo-ladder',quantity:1,lengthFeet:10.5}]);
 assert.equal(cart.length,2);assert.deepEqual(quoteTotals(cart),{low:2252.5,high:2385,pending:false});
 for(const lengthFeet of [undefined,null,'',0,-2,Infinity,'oops',1001])assert.deepEqual(normalizeCart([{id:'bamboo-ladder',quantity:1,lengthFeet}]),[]);
});
test('legacy IDs migrate, duplicate lines merge, invalid items are discarded',()=>{
 const cart=normalizeCart([{id:'round-utility-basket',quantity:98},{id:'biryani-basket',quantity:8},{id:'unknown',quantity:1},null,{id:'bechanage',quantity:-4}]);
 assert.equal(cart.length,1);assert.equal(cart[0].id,'biryani-basket');assert.equal(cart[0].quantity,99);assert.deepEqual(normalizeCart(null),[]);
});
test('English and Kannada search combine with collection filters',()=>{
 assert.equal(filterProducts({query:'ಬೀಸಣಿಗೆ'})[0].id,'bechanage');
 assert.equal(filterProducts({category:'mara',query:'small'})[0].id,'mara-small');
 assert.equal(filterProducts({query:'not-a-product'}).length,0);
 assert.equal(filterProducts({sort:'price-low'})[0].id,'jatree-dabbe');
});
test('checkout validates Indian phone, PIN, email and required fields',()=>{
 const valid={name:'Customer',email:'customer@example.com',phone:'+91 9999999999',address:'Test address',city:'Bengaluru',state:'Karnataka',pincode:'560001'};
 assert.deepEqual(validateCheckout(valid),{});
 assert.deepEqual(Object.keys(validateCheckout({...valid,name:'',email:'bad',phone:'123',pincode:'000000'})).sort(),['email','name','phone','pincode']);
});
