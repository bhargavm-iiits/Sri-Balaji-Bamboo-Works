import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {landingHero} from '../dist/landing.js';

const source=await readFile(new URL('../dist/landing.js',import.meta.url),'utf8');
function mountScene(){
 const classes=new Set();
 const control=()=>({disabled:false,textContent:'',attributes:{},events:{},setAttribute(k,v){this.attributes[k]=v;},addEventListener(k,v){this.events[k]=v;},removeEventListener(k){delete this.events[k];}});
 const pause=control(),replay=control();
 const scene={offsetWidth:1200,classList:{add:c=>classes.add(c),remove:c=>classes.delete(c),toggle(c,on){if(on)classes.add(c);else classes.delete(c);}},querySelector:s=>s==='[data-landing-pause]'?pause:replay};
 const ctx=vm.createContext({document:{querySelector:()=>scene}});
 vm.runInContext(source.replaceAll('export ','')+'\nglobalThis.api=setupLandingScene();',ctx);
 return {api:ctx.api,classes,pause,replay};
}
test('landing offers real shop navigation and named animation controls',()=>{
 const html=landingHero();assert.ok(html.includes('href="/shop"'));assert.ok(html.includes('id="landing-title"'));assert.ok(html.includes('aria-label="Landing animation controls"'));assert.ok(html.includes('aria-hidden="true"'));assert.ok(html.includes('Pause animation'));assert.ok(html.includes('Replay intro'));
 // Only the store itself supplies navigation; no baked video navigation or autoplay audio.
 assert.ok(!html.includes('<video'));assert.ok(!html.includes('<iframe'));
});
test('reduced-motion path starts at the static final frame and disables replay',()=>{
 const {api,classes,pause,replay}=mountScene();api.setEnabled(false);
 assert.ok(classes.has('landing-static'));assert.ok(!classes.has('landing-animate'));assert.equal(pause.disabled,true);assert.equal(replay.disabled,true);assert.equal(pause.textContent,'Animation off');
 api.destroy();assert.equal(Object.keys(pause.events).length,0);
});
test('animation pauses, resumes, replays and responds to the global motion preference',()=>{
 const {api,classes,pause,replay}=mountScene();api.setEnabled(true);
 assert.ok(classes.has('landing-animate'));pause.events.click();assert.ok(classes.has('landing-paused'));assert.equal(pause.textContent,'Resume animation');assert.equal(pause.attributes['aria-pressed'],'true');
 pause.events.click();assert.ok(!classes.has('landing-paused'));
 pause.events.click();replay.events.click();assert.ok(!classes.has('landing-paused'));assert.ok(classes.has('landing-animate'));
 api.setEnabled(false);assert.ok(classes.has('landing-static'));api.setEnabled(true);assert.ok(!classes.has('landing-static'));assert.equal(replay.disabled,false);
 api.destroy();assert.equal(Object.keys(replay.events).length,0);
});
