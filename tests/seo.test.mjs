import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {products} from '../dist/store.js';
const manifest=JSON.parse(await readFile(new URL('../dist/seo-manifest.json',import.meta.url),'utf8'));
test('all products have pre-rendered canonical pages and truthful product data',async()=>{
 for(const p of products){const route='/product/'+p.id;assert.ok(manifest.publicRoutes.includes(route));const html=await readFile(new URL('../dist/'+manifest.pages[route].file,import.meta.url),'utf8');assert.ok(html.includes(p.name));assert.ok(html.includes(p.nameKn));assert.ok(html.includes('href="https://www.balajibambooworks.com'+route+'"'));assert.ok(!html.includes('"aggregateRating"'));assert.ok(!html.includes('"review"'));assert.ok(!html.includes('href="#/'));assert.ok(html.includes('type="module" src="app.js"'));}
});
test('sitemap excludes private workflows and the full shop is present without JavaScript',async()=>{
 const sitemap=await readFile(new URL('../dist/sitemap.xml',import.meta.url),'utf8');for(const route of ['/owner','/orders','/payment','/checkout','/cart']){assert.ok(!manifest.publicRoutes.includes(route));assert.ok(!sitemap.includes('<loc>https://www.balajibambooworks.com'+route+'</loc>'));const html=await readFile(new URL('../dist/'+manifest.pages[route].file,import.meta.url),'utf8');assert.ok(html.includes('noindex, nofollow'));}
 const shop=await readFile(new URL('../dist/'+manifest.pages['/shop'].file,import.meta.url),'utf8');for(const p of products)assert.ok(shop.includes('/product/'+p.id));const home=await readFile(new URL('../dist/'+manifest.pages['/'].file,import.meta.url),'utf8');assert.ok(home.includes('Bamboo shop in Shidlaghatta'));assert.ok(home.includes('"@type":"Store"'));
});
