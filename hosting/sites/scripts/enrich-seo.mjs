import {readFile,writeFile} from 'node:fs/promises';
import {searchMetadata,structuredData,primaryOrigin,publicPaths,buyingGuide} from '../public/search-content.js';
const pagesUrl=new URL('../server/pages.json',import.meta.url),seoUrl=new URL('../server/seo.json',import.meta.url);
const pages=JSON.parse(await readFile(pagesUrl,'utf8')),seo=JSON.parse(await readFile(seoUrl,'utf8'));
const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
for(const [route,source] of Object.entries(pages)){
 const meta=searchMetadata(route);let html=source.replace(/<title>[\s\S]*?<\/title>/,`<title>${esc(meta.title)}</title>`);
 for(const [key,value] of Object.entries({description:meta.description,'og:title':meta.title,'og:description':meta.description,'og:url':primaryOrigin+route,'og:image':primaryOrigin+'/assets/'+meta.image,'og:type':route.startsWith('/product/')?'product':'website'}))html=html.replace(new RegExp(`<meta (?:name|property)="${key}"[^>]*>`),`<meta ${key.startsWith('og:')?'property':'name'}="${key}" content="${esc(value)}">`);
 html=html.replace(/<script\b(?=[^>]*type="application\/ld\+json")[^>]*>[\s\S]*?<\/script>/g,'').replace('</head>',`<script id="page-structured-data" type="application/ld+json" nonce="__CSP_NONCE__">${JSON.stringify(structuredData(route)).replaceAll('<','\\u003c')}</script></head>`);
 html=html.replace(/<!-- buying-guide:start -->[\s\S]*?<!-- buying-guide:end -->/g,'');
 if(route==='/'||route==='/care')html=html.replace('</main>',`<!-- buying-guide:start -->${buyingGuide()}<!-- buying-guide:end --></main>`);
 pages[route]=html;if(seo.pages[route])Object.assign(seo.pages[route],{title:meta.title,description:meta.description,indexable:meta.indexable});
}
seo.origin=primaryOrigin;seo.publicRoutes=publicPaths;
await writeFile(pagesUrl,JSON.stringify(pages));await writeFile(seoUrl,JSON.stringify(seo));
console.log(`Updated metadata and structured data for ${publicPaths.length} public routes.`);
