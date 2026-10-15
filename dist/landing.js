// Native SVG/CSS choreography inspired by the two owner-supplied bamboo films.
// The logo, controls and shop link remain real HTML throughout the animation.
function bambooRod(id,x,y,length,angle=0,width=21,extra=''){
 const joints=Array.from({length:Math.floor(length/91)},(_,i)=>91*(i+1));
 return `<g class="bamboo-rod ${extra}" transform="translate(${x} ${y}) rotate(${angle})"><g class="rod-motion" style="--rod-order:${id}"><rect x="${-width/2}" y="0" width="${width}" height="${length}" rx="3" fill="url(#bamboo-skin)"/><path d="M${-width*.25} 4 V${length-3}" stroke="#d4e797" stroke-width="1" opacity=".5"/><path d="M${width*.26} 3 V${length-2}" stroke="#193919" stroke-width=".8" opacity=".45"/>${joints.map(v=>`<path d="M${-width/2-1} ${v} Q0 ${v+3} ${width/2+1} ${v}" stroke="#283f20" stroke-width="4"/><path d="M${-width/2-1} ${v-2} Q0 ${v} ${width/2+1} ${v-2}" stroke="#b2bf71" stroke-width="2"/>`).join('')}<ellipse cx="0" cy="2" rx="${width/2}" ry="3" fill="#aab878"/><ellipse cx="0" cy="2" rx="${width/2-3}" ry="1.6" fill="#617b35"/></g></g>`;
}
const bambooSprig=(x,y,scale=1,angle=0,cls='')=>`<g class="bamboo-sprig ${cls}" transform="translate(${x} ${y}) rotate(${angle}) scale(${scale})"><g class="sprig-sway"><path d="M0 0 Q42 -20 96 -108 M22 -19 L4 -49 M44 -41 L77 -43 M64 -65 L53 -91" fill="none" stroke="#617640" stroke-width="1.8"/><path d="M15 -24 Q-18 -34 -27 -69 Q6 -59 15 -24Z M31 -31 Q21 -66 34 -85 Q45 -56 31 -31Z M45 -43 Q77 -67 100 -61 Q80 -43 45 -43Z M59 -60 Q38 -89 43 -113 Q62 -95 59 -60Z M71 -76 Q102 -91 121 -83 Q99 -72 71 -76Z M85 -93 Q78 -121 88 -139 Q98 -117 85 -93Z M95 -106 Q111 -129 129 -133 Q120 -113 95 -106Z" fill="url(#leaf-skin)"/></g></g>`;
function bambooScene(frameOnly=false){
 const vertical=Array.from({length:7},(_,i)=>bambooRod(i,442+i*34,169,290+(i%3)*19,0,14,'weave-piece weave-vertical'));
 const horizontal=Array.from({length:7},(_,i)=>bambooRod(i,406,204+i*31,302+(i%2)*16,-90,14,'weave-piece weave-horizontal'));
 const ties=[[289,126],[911,126],[289,454],[911,454]].map(([x,y])=>`<g class="frame-tie" transform="translate(${x} ${y})"><path d="M-13 -10 L12 12 M-13 -5 L7 15 M-9 -13 L15 8 M-13 11 L12 -11 M-13 6 L7 -15 M-9 14 L15 -7" stroke="#d1bb80" stroke-width="2.7"/><path d="M-13 11 L12 -11 M-9 -13 L15 8" stroke="#8d7950" stroke-width=".7"/></g>`);
 if(frameOnly){
  const cornerTies=[[28,28],[972,28],[28,672],[972,672]].map(([x,y])=>`<g class="frame-tie" transform="translate(${x} ${y})"><path d="M-13 -10 L12 12 M-13 -5 L7 15 M-9 -13 L15 8 M-13 11 L12 -11 M-13 6 L7 -15 M-9 14 L15 -7" stroke="#d1bb80" stroke-width="2.7"/></g>`);
  return `<svg class="landing-frame-art" viewBox="0 0 1000 700" preserveAspectRatio="none" fill="none" aria-hidden="true" focusable="false"><g class="landing-frame" filter="url(#bamboo-shadow)">${bambooRod(0,8,28,984,-90,22,'frame-rail frame-top')}${bambooRod(1,8,672,984,-90,22,'frame-rail frame-bottom')}${bambooRod(2,28,8,684,0,22,'frame-rail frame-left')}${bambooRod(3,972,8,684,0,22,'frame-rail frame-right')}${cornerTies.join('')}</g></svg>`;
 }
 return `<svg class="landing-bamboo-art" viewBox="0 0 1200 580" preserveAspectRatio="none" fill="none" aria-hidden="true" focusable="false"><defs><linearGradient id="bamboo-skin" x1="-12" y1="0" x2="12" y2="0" gradientUnits="userSpaceOnUse"><stop stop-color="#355723"/><stop offset=".23" stop-color="#718a39"/><stop offset=".42" stop-color="#9eae58"/><stop offset=".61" stop-color="#6c8636"/><stop offset=".88" stop-color="#3e6025"/><stop offset="1" stop-color="#263f20"/></linearGradient><linearGradient id="leaf-skin" x1="-10" y1="-20" x2="105" y2="-110" gradientUnits="userSpaceOnUse"><stop stop-color="#7a9344"/><stop offset=".65" stop-color="#41652e"/><stop offset="1" stop-color="#a2ad69"/></linearGradient><filter id="bamboo-shadow" x="-45%" y="-30%" width="190%" height="190%"><feDropShadow dx="5" dy="9" stdDeviation="6" flood-color="#263722" flood-opacity=".2"/></filter></defs><g class="landing-back-stalks" opacity=".68">${bambooRod(0,90,90,650,-13,28,'growing-stalk')}${bambooRod(1,130,0,720,9,24,'growing-stalk')}${bambooRod(2,1096,-30,720,-7,23,'growing-stalk')}${bambooRod(3,1152,80,650,13,30,'growing-stalk')}</g><g class="landing-weave" filter="url(#bamboo-shadow)">${horizontal.join('')}${vertical.join('')}</g><g class="landing-foliage">${bambooSprig(105,232,1.1,15,'sprig-left-top')}${bambooSprig(71,478,1.4,38,'sprig-left-bottom')}${bambooSprig(1118,165,1.3,165,'sprig-right-top')}${bambooSprig(1147,452,1.25,160,'sprig-right-bottom')}${bambooSprig(294,151,.43,-35,'sprig-knot-top')}${bambooSprig(906,455,.43,145,'sprig-knot-bottom')}</g><g class="landing-falling-leaves" fill="url(#leaf-skin)">${Array.from({length:8},(_,i)=>`<g class="falling-leaf leaf-${i}" style="--leaf-delay:${i*.8}s;--leaf-duration:${9+i%3}s"><path d="M0 0 Q19 -15 38 -8 Q23 3 0 0Z"/></g>`).join('')}</g></svg>`;
}
export function landingHero(){return `<section class="landing-intro" aria-labelledby="landing-title"><div class="landing-light" aria-hidden="true"></div><div class="landing-scene"><div class="landing-background" aria-hidden="true">${bambooScene()}</div><div class="landing-frame-box">${bambooScene(true)}<div class="landing-box-content"><div class="landing-brand"><span class="landing-kicker">SHIDLAGHATTA · KARNATAKA</span><h1 id="landing-title">Sri Balaji<span>Bamboo Works</span></h1><p class="kn landing-kannada" lang="kn">ಶ್ರೀ ಬಾಲಾಜಿ ಬ್ಯಾಂಬೂ ವರ್ಕ್ಸ್</p><p class="landing-description">Handwoven baskets. Traditional trays.<br>Bamboo for everyday life.</p></div><div class="landing-actions"><a class="button" href="/shop">Shop the collection <span aria-hidden="true">↗</span></a><a class="landing-explore" href="#workshop-welcome" data-scroll="workshop-welcome">Discover our workshop <span aria-hidden="true">↓</span></a></div><div class="landing-bottom"><span>ROOTED IN CRAFT. MADE FOR EVERYDAY.</span><div class="landing-controls" role="group" aria-label="Landing animation controls"><button type="button" data-landing-replay>Replay intro <span aria-hidden="true">↻</span></button><button type="button" data-landing-pause aria-pressed="false">Pause animation</button></div></div></div></div></div></section>`;}

export function setupLandingScene(){
 const scene=document.querySelector('.landing-intro');
 if(!scene)return {setEnabled(){},destroy(){}};
 const pause=scene.querySelector('[data-landing-pause]');
 const replay=scene.querySelector('[data-landing-replay]');
 let enabled=true;let paused=false;let initialised=false;
 const sync=()=>{
  scene.classList.toggle('landing-static',!enabled);
  scene.classList.toggle('landing-paused',paused);
  pause.disabled=!enabled;replay.disabled=!enabled;
  pause.textContent=!enabled?'Animation off':paused?'Resume animation':'Pause animation';
  pause.setAttribute('aria-pressed',String(paused));
 };
 const onPause=()=>{paused=!paused;sync();};
 const onReplay=()=>{
  if(!enabled)return;
  paused=false;scene.classList.remove('landing-animate');
  void scene.offsetWidth;
  scene.classList.add('landing-animate');sync();
 };
 pause.addEventListener('click',onPause);replay.addEventListener('click',onReplay);
 let visibilityObserver;
 if(typeof IntersectionObserver!=='undefined'){
  visibilityObserver=new IntersectionObserver(entries=>{scene.classList.toggle('landing-offscreen',!entries[0].isIntersecting);},{threshold:.02});
  visibilityObserver.observe(scene);
 }
 return {
  setEnabled(value){enabled=value;if(!initialised){initialised=true;if(enabled)scene.classList.add('landing-animate');}sync();},
  destroy(){visibilityObserver?.disconnect();pause.removeEventListener('click',onPause);replay.removeEventListener('click',onReplay);}
 };
}
