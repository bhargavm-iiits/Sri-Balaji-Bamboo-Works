import {setupLandingScene} from './landing.js';
const motionQuery=matchMedia('(prefers-reduced-motion: reduce)');
let motionPaused=false;
try{motionPaused=localStorage.getItem('sbb-motion')==='off';}catch{}
let motionCleanup=()=>{};
export const motionEnabled=()=>!motionPaused&&!motionQuery.matches;
export function setupMotion(){
 motionCleanup();
 const landingMotion=setupLandingScene();
 const journey=document.querySelector('.collection-journey');
 const track=journey?.querySelector('.journey-track');
 const panels=journey?[...journey.querySelectorAll('.journey-panel')]:[];
 const wide=matchMedia('(min-width: 1000px) and (min-height: 700px)');
 let motionFrame=0;
 let observer;
 const sync=()=>{
  const active=motionEnabled();
  landingMotion.setEnabled(active);
  document.documentElement.classList.toggle('motion-off',!active);
  document.querySelectorAll('[data-motion]').forEach(b=>{b.textContent=active?'Motion: On':'Motion: Off';b.setAttribute('aria-pressed',String(active));b.disabled=motionQuery.matches;});
  const horizontal=active&&wide.matches&&!!journey;
  journey?.classList.toggle('journey-horizontal',horizontal);
  if(journey)journey.style.setProperty('--chapters',panels.length);
  if(!horizontal&&track)track.style.removeProperty('transform');
  update();
 };
 const update=()=>{
  cancelAnimationFrame(motionFrame);
  motionFrame=requestAnimationFrame(()=>{
   if(!journey?.classList.contains('journey-horizontal'))return;
   const rect=journey.getBoundingClientRect();
   const top=document.getElementById('header').offsetHeight;
   const travel=journey.offsetHeight-innerHeight+top;
   const progress=Math.max(0,Math.min(1,(top-rect.top)/Math.max(1,travel)));
   track.style.transform=`translate3d(${-progress*(track.scrollWidth-track.parentElement.clientWidth)}px,0,0)`;
   journey.style.setProperty('--progress',progress);
   const chapter=Math.round(progress*(panels.length-1));
   journey.querySelectorAll('[data-chapter]').forEach((b,i)=>{b.classList.toggle('active',i===chapter);b.setAttribute('aria-current',i===chapter?'step':'false');});
   const counter=journey.querySelector('.journey-counter');if(counter)counter.textContent=String(chapter+1).padStart(2,'0')+' / '+String(panels.length).padStart(2,'0');
  });
 };
 const choose=event=>{
  const button=event.target.closest('[data-chapter]');if(!button||!journey)return;
  const index=Number(button.dataset.chapter);
  if(journey.classList.contains('journey-horizontal')){
   const top=document.getElementById('header').offsetHeight;
   const start=journey.getBoundingClientRect().top+scrollY-top;
   scrollTo({top:start+(journey.offsetHeight-innerHeight+top)*index/(panels.length-1),behavior:'smooth'});
  }else panels[index]?.scrollIntoView({behavior:motionEnabled()?'smooth':'instant',block:'start'});
 };
 // Keyboard focus moves the native page to the corresponding chapter too.
 const focusChapter=event=>{
  if(!journey?.classList.contains('journey-horizontal'))return;
  const panel=event.target.closest('.journey-panel');if(!panel)return;
  const top=document.getElementById('header').offsetHeight;
  const index=panels.indexOf(panel);const start=journey.getBoundingClientRect().top+scrollY-top;
  scrollTo({top:start+(journey.offsetHeight-innerHeight+top)*index/(panels.length-1),behavior:'instant'});
 };
 if('IntersectionObserver' in window){
  observer=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('revealed');observer.unobserve(e.target);}}),{threshold:.06});
  document.querySelectorAll('[data-reveal]').forEach(el=>observer.observe(el));
 }
 journey?.addEventListener('click',choose);journey?.addEventListener('focusin',focusChapter);
 addEventListener('scroll',update,{passive:true});addEventListener('resize',sync);motionQuery.addEventListener('change',sync);
 const toggle=()=>{motionPaused=!motionPaused;try{localStorage.setItem('sbb-motion',motionPaused?'off':'on');}catch{}sync();};
 document.querySelectorAll('[data-motion]').forEach(b=>b.addEventListener('click',toggle));
 sync();
 motionCleanup=()=>{landingMotion.destroy();cancelAnimationFrame(motionFrame);observer?.disconnect();removeEventListener('scroll',update);removeEventListener('resize',sync);motionQuery.removeEventListener('change',sync);journey?.removeEventListener('click',choose);journey?.removeEventListener('focusin',focusChapter);document.querySelectorAll('[data-motion]').forEach(b=>b.removeEventListener('click',toggle));};
}
