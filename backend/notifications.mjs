// Server-only opt-in. Tests inject a local mock, never a live WhatsApp recipient.
export function ownerNotifier(env=process.env,send=fetch){
 const configured=env.WHATSAPP_NOTIFICATIONS_ENABLED==='true'&&['WHATSAPP_ACCESS_TOKEN','WHATSAPP_PHONE_NUMBER_ID','WHATSAPP_API_VERSION','WHATSAPP_OWNER_TEMPLATE','PUBLIC_SITE_URL'].every(k=>env[k]);
 return {configured:!!configured,async notify(order){
  if(!configured)return {status:'not_configured'};
  if(!/^v\d+\.\d+$/.test(env.WHATSAPP_API_VERSION)||!/^\d+$/.test(env.WHATSAPP_PHONE_NUMBER_ID))return {status:'failed',reason:'Check the server WhatsApp configuration.'};
  let site;try{site=new URL(env.PUBLIC_SITE_URL);if(site.protocol!=='https:'||site.username||site.password||site.search||site.hash)throw new Error();}catch{return {status:'failed',reason:'Configure a public HTTPS site URL.'};}
  try{const response=await send(`https://graph.facebook.com/${env.WHATSAPP_API_VERSION}/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`,{method:'POST',headers:{Authorization:`Bearer ${env.WHATSAPP_ACCESS_TOKEN}`,'Content-Type':'application/json'},body:JSON.stringify({messaging_product:'whatsapp',to:'919591457484',type:'template',template:{name:env.WHATSAPP_OWNER_TEMPLATE,language:{code:env.WHATSAPP_TEMPLATE_LANGUAGE||'en_US'},components:[{type:'body',parameters:[{type:'text',text:order.id},{type:'text',text:new URL('/owner?order='+order.id,site).href}]}]}}),signal:AbortSignal.timeout(8000)});const result=await response.json();if(!response.ok||!result.messages?.[0]?.id)return {status:'failed',reason:'WhatsApp did not accept the alert. Use the manual notification button.'};return {status:'accepted',at:new Date().toISOString()};}catch{return {status:'failed',reason:'WhatsApp alert unavailable. Use the manual notification button.'};}
 }};
}
