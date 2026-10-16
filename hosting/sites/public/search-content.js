import {products,categoryInfo,priceLabel} from './store.js';

export const primaryOrigin='https://www.balajibambooworks.com';
const brand='Sri Balaji Bamboo Works';
const sections={
 '/':['Bamboo Shop in Shidlaghatta, Karnataka', 'Explore bamboo baskets, Mara trays, hand fans, poles and ladders at Sri Balaji Bamboo Works, Garden Road, Shidlaghatta. English and Kannada product names.'],
 '/shop':['Bamboo Baskets, Trays, Fans & Poles', 'Browse our bamboo product catalogue with owner-supplied INR prices, English and Kannada names, photographs and specifications. Confirm availability before payment.'],
 '/collections':['Nine Bamboo Collections in English & Kannada', 'Explore Butti baskets, Koolu materials, Kuduru, Makkari, Mara trays, Panjara, Shibbilu, Thottilu and Bechanage. Compare uses and ask the Shidlaghatta workshop.'],
 '/story':['Our Bamboo Workshop in Shidlaghatta', 'Meet Sri Balaji Bamboo Works on Garden Road in Shidlaghatta, Chikkaballapur. Discover traditional woven forms and bamboo products for everyday use.'],
 '/bulk':['Bulk Bamboo Baskets, Poles & Materials', 'Ask Sri Balaji Bamboo Works about bulk quantities, sizes, materials and delivery. Send your requirements to our Shidlaghatta workshop for a confirmed quotation.'],
 '/contact':['Contact Our Bamboo Shop in Shidlaghatta', 'Visit 5, Garden Road, Shidlaghatta, Chikkaballapur, Karnataka 562105. Call +91 9591457484 or email balajibambooworks@gmail.com for bamboo product enquiries.'],
 '/care':['Bamboo Product Care & Ordering Guide', 'Learn how to keep woven bamboo clean and dry, choose a product, confirm measurements and request an order. Pay by UPI only after the workshop approves your total.']
};
export const publicPaths=[...Object.keys(sections),...Object.keys(categoryInfo).map(id=>'/collections/'+id),...products.map(p=>'/product/'+p.id)];
export const sitemapEntries=publicPaths.map(path=>({path,images:products.filter(p=>path==='/product/'+p.id).flatMap(p=>[...new Set([p.image,...p.photos])])}));
export function searchMetadata(route){
 const product=products.find(p=>route==='/product/'+p.id),category=Object.entries(categoryInfo).find(([id])=>route==='/collections/'+id)?.[1];
 if(product)return {title:`${product.name} | ${brand}, Shidlaghatta`,description:`${product.name} (${product.nameKn}): ${priceLabel(product)}. ${product.description} Confirm measurements, availability and delivery with our Shidlaghatta workshop.`,image:product.image,indexable:true};
 if(category)return {title:`${category.short} Bamboo Collection | ${brand}`,description:`${category.short} (${category.kn}) at our Shidlaghatta bamboo shop. ${category.description}`,image:category.image,indexable:true};
 const entry=sections[route];return {title:entry?`${entry[0]} | ${brand}`:`${route==='/404'?'Page not found':'Your order'} | ${brand}`,description:entry?.[1]||'Private order and payment workflow for Sri Balaji Bamboo Works.',image:'enhanced-workshop.png',indexable:!!entry};
}
export function structuredData(route){
 const meta=searchMetadata(route);if(!meta.indexable)return [];
 const url=primaryOrigin+route,p=products.find(p=>route==='/product/'+p.id),family=route.split('/')[2];
 const store={'@context':'https://schema.org','@type':'Store','@id':primaryOrigin+'/#business',name:brand,alternateName:'ಶ್ರೀ ಬಾಲಾಜಿ ಬ್ಯಾಂಬೂ ವರ್ಕ್ಸ್',url:primaryOrigin+'/',telephone:'+919591457484',email:'balajibambooworks@gmail.com',image:primaryOrigin+'/assets/enhanced-workshop.png',description:sections['/'][1],address:{'@type':'PostalAddress',streetAddress:'5, Garden Road',addressLocality:'Shidlaghatta',addressRegion:'Karnataka',postalCode:'562105',addressCountry:'IN'}};
 const data=[store,{'@context':'https://schema.org','@type':route==='/contact'?'ContactPage':route==='/story'?'AboutPage':route==='/shop'||route.startsWith('/collections')?'CollectionPage':'WebPage','@id':url+'#page',url,name:meta.title,description:meta.description,inLanguage:['en-IN','kn-IN'],about:{'@id':store['@id']}}];
 if(route==='/')data.push({'@context':'https://schema.org','@type':'WebSite','@id':primaryOrigin+'/#website',url:primaryOrigin+'/',name:brand,inLanguage:['en-IN','kn-IN'],publisher:{'@id':store['@id']}});
 if(route!=='/'){
  const crumbs=[{name:'Home',item:primaryOrigin+'/'}];
  if(p)crumbs.push({name:categoryInfo[p.category].short,item:primaryOrigin+'/collections/'+p.category});
  else if(route.startsWith('/collections/'))crumbs.push({name:'Collections',item:primaryOrigin+'/collections'});
  crumbs.push({name:p?.name||categoryInfo[family]?.short||sections[route]?.[0],item:url});
  data.push({'@context':'https://schema.org','@type':'BreadcrumbList',itemListElement:crumbs.map((c,i)=>({'@type':'ListItem',position:i+1,...c}))});
 }
 if(p){
  const product={'@context':'https://schema.org','@type':'Product','@id':url+'#product',name:p.name,alternateName:p.nameKn,description:p.description,image:[...new Set([p.image,...p.photos])].map(f=>primaryOrigin+'/assets/'+f),sku:p.id,url,brand:{'@type':'Brand',name:brand}};
  // An enquiry catalogue does not establish stock, shipping terms or a completed sale.
  if(p.unit&&p.price!==null&&!p.representative)product.offers=p.price===p.priceMax?{'@type':'Offer',url,priceCurrency:'INR',price:String(p.price),seller:{'@id':store['@id']}}:{'@type':'AggregateOffer',url,priceCurrency:'INR',lowPrice:String(p.price),highPrice:String(p.priceMax),seller:{'@id':store['@id']}};
  data.push(product);
 }else if(route==='/shop'||categoryInfo[family]){
  data.push({'@context':'https://schema.org','@type':'ItemList',itemListElement:products.filter(p=>route==='/shop'||p.category===family).map((p,i)=>({'@type':'ListItem',position:i+1,name:p.name,url:primaryOrigin+'/product/'+p.id}))});
 }
 return data;
}
export function buyingGuide(){return `<section id="bamboo-buying-guide" class="container section"><span class="eyebrow">A LITTLE HELP FROM THE WORKSHOP</span><h2>Choose your bamboo.<br><em>Know what to ask.</em></h2><p>Explore our English and Kannada catalogue, then confirm the right form, size and quantity with Sri Balaji Bamboo Works.</p><div class="collection-guidance"><details><summary>Which bamboo product should I choose?</summary><p>Compare <a href="/collections/butti">Butti baskets</a>, <a href="/collections/mara">Mara trays</a> and the <a href="/collections">complete collection</a>. Each product page explains its form, material, care and available price information. Ask us to confirm measurements for your purpose.</p></details><details><summary>Are prices per piece, pair or foot?</summary><p>Read the unit beside each price. Bamboo poles are priced per pair; Galuvu per piece; ladders per foot. A range is an estimate for different specifications. The workshop confirms the final total before you pay.</p></details><details><summary>How do I order and arrange delivery?</summary><p>Add your selection to the bag and submit an order request. We confirm specifications, availability and delivery arrangements before approving payment. Open <a href="/orders">My orders</a> to check your request on this device. UPI receipts are checked manually.</p></details><details><summary>Where is the bamboo shop?</summary><p>Visit 5, Garden Road, Shidlaghatta, Chikkaballapur, Karnataka 562105. <a href="tel:+919591457484">Call +91 9591457484</a> before visiting to confirm availability, or <a href="/contact">get contact details and directions</a>.</p></details><details><summary>How do I care for woven bamboo?</summary><p>Remove dust gently, wipe with a lightly damp cloth when needed and let the piece dry completely. Keep woven products in a ventilated place and avoid prolonged soaking. Read our <a href="/care">bamboo care guide</a> for more guidance.</p></details></div></section>`;}
