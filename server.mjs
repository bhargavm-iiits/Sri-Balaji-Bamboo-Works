import http from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {randomBytes} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {OrderStore,OrderError,hash,publicOrder,ownerOrder,ownerCredentials,verifyPassword} from './backend/orders.mjs';
import {ownerNotifier} from './backend/notifications.mjs';
import {business} from './dist/config.js';
import {securityHeaders,validateTotpSecret,checkTotp} from './backend/security.mjs';
import {ownerPage} from './backend/owner-page.mjs';
const here=path.dirname(fileURLToPath(import.meta.url));
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.xml':'application/xml; charset=utf-8','.txt':'text/plain; charset=utf-8','.json':'application/json; charset=utf-8'};
const json=(res,status,data,extra={})=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...extra});res.end(JSON.stringify(data));};
const error=(message,status=400)=>{throw new OrderError(message,status);};
async function body(req){if(!req.headers['content-type']?.startsWith('application/json'))error('Use a JSON request.',415);let text='';for await(const chunk of req){text+=chunk;if(Buffer.byteLength(text)>64000)error('Request is too large.',413);}let value;try{value=JSON.parse(text);}catch{error('Invalid JSON request.');}if(!value||typeof value!=='object'||Array.isArray(value))error('A JSON object is required.');return value;}
export async function createStorefrontServer(options={}){
 const production=process.env.NODE_ENV==='production';
 const directory=options.dataDir||process.env.DATA_DIR||path.join(here,'.private');const root=path.join(here,'dist');
 const configuredOrigin=options.publicOrigin||process.env.PUBLIC_SITE_URL;
 const indexingEnabled=production&&process.env.INDEXING_ENABLED==='true';
 const seo=JSON.parse(await readFile(path.join(root,'seo-manifest.json'),'utf8'));
 if(production&&(!configuredOrigin||new URL(configuredOrigin).protocol!=='https:'))throw new Error('Configure PUBLIC_SITE_URL as the public HTTPS origin.');
 if(configuredOrigin){const parsed=new URL(configuredOrigin);if(parsed.username||parsed.password||parsed.pathname!=='/'||parsed.search||parsed.hash)throw new Error('PUBLIC_SITE_URL must be an origin without a path or credentials.');}
 const mfaSecret=options.mfaSecret??process.env.OWNER_TOTP_SECRET;if(mfaSecret)validateTotpSecret(mfaSecret);if(production&&!mfaSecret)throw new Error('Configure OWNER_TOTP_SECRET before production.');
 let lastOtpStep=-1,loginBusy=false;
 const store=new OrderStore(directory,{encryptionKey:options.encryptionKey});await store.init();const credentials=await ownerCredentials(directory,options.ownerPassword??process.env.OWNER_PASSWORD);
 const notifier=options.notifier||ownerNotifier();const sessions=new Map();const limits=new Map();
 const limit=(key,max,window)=>{const now=Date.now();for(const [k,v] of limits)if(v.until<now)limits.delete(k);let entry=limits.get(key);if(!entry){entry={count:0,until:now+window};limits.set(key,entry);}if(++entry.count>max)error('Too many attempts. Please try again later.',429);};
 const auth=req=>{for(const [key,value] of sessions)if(value.expires<Date.now())sessions.delete(key);const cookie=(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('sbb_owner='))?.slice(10);const session=cookie?sessions.get(hash(cookie)):null;if(!session)error('Please sign in as the owner.',401);return session;};
 const token=req=>req.headers.authorization?.startsWith('Bearer ')?req.headers.authorization.slice(7):'';
 const server=http.createServer(async(req,res)=>{
  try{
   const host=req.headers.host;if(!host||/[\s/@\\]/.test(host))error('Invalid host.');
   const origin=configuredOrigin||`http://${host}`;
   for(const [key,value] of Object.entries(securityHeaders({production})))res.setHeader(key,value);
   if(!options.publicOrigin&&!process.env.PUBLIC_SITE_URL&&!/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host))error('Host is not configured.',403);
   const url=new URL(req.url,'http://'+host);const route=url.pathname;
   if(production&&!new Set([new URL(origin).hostname,process.env.RENDER_EXTERNAL_HOSTNAME,'127.0.0.1','localhost']).has(url.hostname))error('Host is not configured.',403);
   if(route.startsWith('/api/')){
    limit('api:'+req.socket.remoteAddress,400,60000);
    if(req.method==='POST'&&(![new URL(origin).origin,...(production&&process.env.RENDER_EXTERNAL_HOSTNAME===host?['https://'+host]:[])].includes(req.headers.origin)||req.headers['sec-fetch-site']==='cross-site'))error('Open the store directly before submitting.',403);
    if(route==='/api/health'&&req.method==='GET')return json(res,200,{ok:true,orderWorkflow:true,whatsappConfigured:notifier.configured});
    if(route==='/api/owner/app.js'&&['GET','HEAD'].includes(req.method)){
     auth(req);res.writeHead(200,{'Content-Type':'text/javascript; charset=utf-8','Cache-Control':'private, no-store','Vary':'Cookie'});return res.end(req.method==='HEAD'?undefined:await readFile(path.join(here,'backend/owner-app.js'),'utf8'));
    }
    if(route==='/api/owner/session'&&req.method==='GET'){try{auth(req);return json(res,200,{authenticated:true,ownerPhone:'9591457484',whatsappConfigured:notifier.configured,mfaRequired:!!mfaSecret});}catch{return json(res,200,{authenticated:false,mfaRequired:!!mfaSecret});}}
    if(route==='/api/owner/login'&&req.method==='POST'){
     limit('login:'+req.socket.remoteAddress,8,15*60000);if(loginBusy)error('An owner sign-in is being checked. Try again shortly.',429);const input=await body(req);loginBusy=true;try{const valid=await verifyPassword(input.password,credentials);const otp=mfaSecret?checkTotp(mfaSecret,input.otp,lastOtpStep):null;if(!valid||(mfaSecret&&otp===null))error('Owner sign-in details are incorrect.',401);if(mfaSecret)lastOtpStep=otp;}finally{loginBusy=false;}
     const session=randomBytes(32).toString('hex');sessions.set(hash(session),{expires:Date.now()+30*60000});return json(res,200,{authenticated:true},{'Set-Cookie':`sbb_owner=${session}; HttpOnly; SameSite=Strict; Path=/; Max-Age=1800${origin.startsWith('https:')?'; Secure':''}`});
    }
    if(route==='/api/owner/logout'&&req.method==='POST'){auth(req);const cookie=(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('sbb_owner='))?.slice(10);if(cookie)sessions.delete(hash(cookie));return json(res,200,{ok:true},{'Set-Cookie':'sbb_owner=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0'});}
    if(route==='/api/owner/orders'&&req.method==='GET'){auth(req);return json(res,200,{orders:(await store.all()).map(ownerOrder).reverse()});}
    const ownerMatch=route.match(/^\/api\/owner\/orders\/(SBB-[A-F0-9]{12})\/(approve|reject|paid)$/);
    if(ownerMatch&&req.method==='POST'){auth(req);return json(res,200,{order:ownerOrder(await store.update(ownerMatch[1],ownerMatch[2],await body(req)))});}
    if(route==='/api/orders'&&req.method==='POST'){
     limit('create:'+req.socket.remoteAddress,20,10*60000);const result=await store.create(await body(req));let order=result.order;
     if(result.created)order=await store.notification(order.id,await notifier.notify(order));
     return json(res,result.created?201:200,{order:publicOrder(order)});
    }
    const match=route.match(/^\/api\/orders\/(SBB-[A-F0-9]{12})(?:\/(payment|report))?$/);
    if(match){const order=await store.get(match[1],token(req));
     if(req.method==='GET'&&!match[2])return json(res,200,{order:publicOrder(order)});
     if(req.method==='GET'&&match[2]==='payment'){if(!['approved','payment_reported'].includes(order.status))error('Payment is available after owner approval.',409);return json(res,200,{order:publicOrder(order),payment:business.payment});}
     if(req.method==='POST'&&match[2]==='report')return json(res,200,{order:publicOrder(await store.update(order.id,'report',await body(req)))});
    }
    return json(res,404,{error:'API route not found.'});
   }
   if(!['GET','HEAD'].includes(req.method))error('Method not allowed.',405);
   if(route==='/owner'||route==='/owner/'){
    let authenticated=false;try{auth(req);authenticated=true;}catch{}
    res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'private, no-store','Vary':'Cookie','X-Robots-Tag':'noindex, nofollow'});return res.end(req.method==='HEAD'?undefined:ownerPage({authenticated,mfaRequired:!!mfaSecret}));
   }
   if(route==='/owner-login.js'){
    res.writeHead(200,{'Content-Type':'text/javascript; charset=utf-8','Cache-Control':'no-store'});return res.end(req.method==='HEAD'?undefined:await readFile(path.join(here,'backend/owner-login.js'),'utf8'));
   }
   if(route==='/robots.txt'&&!indexingEnabled){res.writeHead(200,{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-cache'});return res.end(req.method==='HEAD'?undefined:'User-agent: *\nDisallow: /\n');}
   if(['/index.html','/shell.html','/offline.html'].includes(route)){res.writeHead(308,{Location:'/'});return res.end();}
   if(seo.pages[route]){
    const page=seo.pages[route],nonce=randomBytes(18).toString('base64');for(const [key,value] of Object.entries(securityHeaders({nonce,production,indexable:indexingEnabled&&page.indexable})))res.setHeader(key,value);if(indexingEnabled&&page.indexable)res.removeHeader('X-Robots-Tag');
    const html=(await readFile(path.join(root,page.file),'utf8')).replaceAll('__CSP_NONCE__',nonce);res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-cache'});return res.end(req.method==='HEAD'?undefined:html);
   }
   const pathname=decodeURIComponent(route);if(pathname.split('/').some(p=>p.startsWith('.')))error('Not found.',404);
   const file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));if(!file.startsWith(root+path.sep))error('Not found.',404);
   if(!(await stat(file)).isFile())error('Not found.',404);
   if(indexingEnabled&&pathname.startsWith('/assets/')&&!pathname.includes('merchant-upi-qr'))res.removeHeader('X-Robots-Tag');
   res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'});res.end(req.method==='HEAD'?undefined:await readFile(file));
  }catch(e){if(!res.headersSent)json(res,e.status||(e.code==='ENOENT'?404:500),{error:e.status?e.message:e.code==='ENOENT'?'Not found.':'Something went wrong. Please try again.'});else res.end();}
 });server.requestTimeout=15000;server.headersTimeout=10000;server.keepAliveTimeout=5000;server.maxHeadersCount=50;return server;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const server=await createStorefrontServer();process.on('SIGTERM',()=>server.close(()=>process.exit(0)));
 server.listen(Number(process.env.PORT)||4173,process.env.HOST||'127.0.0.1',()=>console.log('Local: http://localhost:'+server.address().port+' | Owner: /owner | Local owner access: .private/owner-access.txt'));
}
