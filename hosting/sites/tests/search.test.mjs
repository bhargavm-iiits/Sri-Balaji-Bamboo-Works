import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
import {handle} from '../server/handler.mjs';
import {products} from '../public/store.js';
import {primaryOrigin,publicPaths,searchMetadata,structuredData} from '../public/search-content.js';
const pages=JSON.parse(await readFile(new URL('../server/pages.json',import.meta.url),'utf8'));
test('all 40 public routes have unique metadata, matching schema and crawlable HTML',async()=>{
 assert.equal(publicPaths.length,40);const titles=new Set(),descriptions=new Set();
 for(const route of publicPaths){
  const m=searchMetadata(route);assert.ok(!titles.has(m.title),route);assert.ok(!descriptions.has(m.description),route);titles.add(m.title);descriptions.add(m.description);
  const html=pages[route];assert.ok(html.includes('href="'+primaryOrigin+route+'"'),route);assert.ok(html.includes('id="page-structured-data"'),route);assert.doesNotMatch(m.title,/â€|Â·|�/);
  assert.deepEqual(JSON.parse(html.match(/id="page-structured-data"[^>]*>([\s\S]*?)<\/script>/)[1]),structuredData(route));
  for(const image of html.matchAll(/(?:src|poster)="(?:\/)?assets\/([^"?]+)"/g))await access(new URL('../public/assets/'+image[1],import.meta.url));
 }
 for(const p of products){const html=pages['/product/'+p.id],schema=structuredData('/product/'+p.id).find(x=>x['@type']==='Product');assert.ok(html.includes(p.nameKn));assert.equal(schema.name,p.name);if(!p.unit||p.representative)assert.equal(schema.offers,undefined);else if(p.price!==p.priceMax){assert.equal(schema.offers.lowPrice,String(p.price));assert.equal(schema.offers.highPrice,String(p.priceMax));}assert.ok(!JSON.stringify(schema).includes('aggregateRating'));}
});
test('aliases share www canonical URLs without redirecting private workflows',async()=>{
 for(const origin of [primaryOrigin,'https://balajibambooworks.com','https://sri-balaji-bamboo-works.superolm64.chatgpt.site']){
  const home=await handle(new Request(origin+'/'),{INDEXING_ENABLED:'true'}),html=await home.text();assert.equal(home.status,200);assert.ok(html.includes('rel="canonical" href="'+primaryOrigin+'/"'));
  const sitemap=await (await handle(new Request(origin+'/sitemap.xml'),{INDEXING_ENABLED:'true'})).text();assert.equal((sitemap.match(/<url>/g)||[]).length,40);assert.ok(sitemap.includes(primaryOrigin+'/product/bechanage'));assert.doesNotMatch(sitemap,/<loc>[^<]*(?:\/owner|\/orders|\/cart|\/payment|\/checkout)/);
  const orders=await handle(new Request(origin+'/orders'),{INDEXING_ENABLED:'true'});assert.equal(orders.status,200);assert.match(orders.headers.get('x-robots-tag'),/noindex/);assert.equal(orders.headers.get('location'),null);
 }
});
test('indexing disabled and unknown routes stay noindex, buying guidance is visible in server HTML',async()=>{
 const off=await handle(new Request(primaryOrigin+'/'),{INDEXING_ENABLED:'false'});assert.match(off.headers.get('x-robots-tag'),/noindex/);assert.match(await off.text(),/data-indexing="false"/);
 const missing=await handle(new Request(primaryOrigin+'/product/not-a-product'),{INDEXING_ENABLED:'true'});assert.equal(missing.status,404);assert.match(missing.headers.get('x-robots-tag'),/noindex/);
 for(const route of ['/','/care'])assert.equal((pages[route].match(/id="bamboo-buying-guide"/g)||[]).length,1);
 for(const route of ['/orders','/cart','/payment','/checkout'])assert.equal(searchMetadata(route).indexable,false);
});
