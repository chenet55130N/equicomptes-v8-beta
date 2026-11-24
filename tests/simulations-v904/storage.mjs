import vm from 'node:vm';
import fs from 'node:fs';
import {environment,household,salaries,charge,next,dir,record} from './env.mjs';
const clone=v=>v===undefined?undefined:structuredClone(v);
export function idb(){
 const all=new Map();
 const db={
  createObjectStore(){},
  transaction(){const tx={};tx.objectStore=()=>({
   get(key){const r={result:clone(all.get(key))};queueMicrotask(()=>{r.onsuccess?.();queueMicrotask(()=>tx.oncomplete?.())});return r},
   put(value,key){all.set(key,clone(value))}
  });return tx}
 };
 let created=false;
 return {all,open(){const r={result:db};queueMicrotask(()=>{if(!created){created=true;r.onupgradeneeded?.()}r.onsuccess?.()});return r}};
}
export async function run(){
 let n=0;
 const local='equicomptes-v8-beta-local:essai:fictif',identity=JSON.stringify({uid:'essai',hid:'fictif',email:'a@example.invalid'});
 const disk=new Map([['equi-v8-verified',identity]]),h=environment({disk}),{E}=h,store=idb();h.context.indexedDB=store;
 h.context.EQUI_V82_CONTEXT=()=>({uid:'essai',hid:'fictif',ready:true,synced:false});
 const s=household(E,'joint');salaries(s,210000,165000,'personal','personal');E.reset(s);
 for(const freq of ['7','15','month','off']){
  await E.v82Change(local,r=>({...r,frequency:freq,copies:[]}));
  const a=await E.v82Snapshot(),b=await E.v82Snapshot();
  record('STOCKAGE',++n,{action:'copie automatique puis second appel',frequence:freq},[freq!=='off',false,freq==='off'?0:1],[a,b,(await E.v82Read(local)).copies.length]);
 }
 await E.v82Change(local,r=>({...r,copies:[]}));
 for(let i=0;i<7;i++){salaries(s,100000+i,200000,'personal','personal');await E.v82Snapshot('manual')}
 let copies=(await E.v82Read(local)).copies;
 record('STOCKAGE',++n,{action:'sept copies manuelles'},['1000,06','1000,05','1000,04','1000,03','1000,02'],copies.map(v=>v.payload.salaryN));
 await E.v82RenderBackups();
 const target=copies[4];const btn=h.q('[data-v82-restore="'+target.id+'"]');await btn.onclick();
 copies=(await E.v82Read(local)).copies;
 record('STOCKAGE',++n,{action:'restaurer la cinquième copie',avant:'1000,06',copie:'1000,02'},['1000,02','before-restore','1000,06'],[E.get().salaryN,copies[0].reason,copies[0].payload.salaryN]);
 for(const mode of ['joint','separate']){
  const dec=environment({disk:new Map([['equi-v8-verified',identity]]),now:'2026-12-01T12:00:00Z'}),D=dec.E;
  dec.context.indexedDB=idb();dec.context.EQUI_V82_CONTEXT=()=>({uid:'essai',hid:'fictif',ready:true,synced:true});
  const ss=household(D,mode);salaries(ss,100000,100000,'personal','personal');D.reset(ss);D.refresh();
  ss.lab.pending={from:ss.month,effective:next(ss.month),to:mode==='joint'?'separate':'joint'};
  await D.v82Change(local,r=>({...r,frequency:'15',copies:[{id:'précédente',at:'2026-11-25T12:00:00Z',reason:'automatic',payload:JSON.parse(JSON.stringify(ss))}]}));
  await dec.context.EquiBetaBridge.advanceRealDate();await new Promise(resolve=>setImmediate(resolve));
  if(ss.lab.pending||D.labModeAt('2026-12')===mode)throw Error('Le scénario de sauvegarde doit activer le nouveau mode');
  const newCopies=(await D.v82Read(local)).copies.filter(c=>c.id!=='précédente');
  record('STOCKAGE',++n,{action:'copie complète avant transition effective',mode,derniereCopie:'2026-11-25',dateTransition:'2026-12-01',frequenceJours:15,archivesMensuelles:Object.keys(ss.lab.frozen).length},true,newCopies.some(c=>c.payload?.lab?.initial===mode),'PREBAK');
 }
 {
  const ss=household(E);salaries(ss,210000,165000,'personal','personal');ss.lab.clock='2026-11-01';E.reset(ss);await h.context.EquiBetaBridge.advanceRealDate();E.labRenderBanking();
  record('STOCKAGE',++n,{action:'actualiser la date réelle le 22 novembre',derniereDate:'2026-11-01'},'2026-11-22',h.by('lab-clock').value,'DATE');
 }
 // Offline access to a previously loaded household and on-disk monthly state.
 E.reset(household(E));salaries(E.get(),150000,123000);charge(E.get(),'taxe',20000,'p2');E.persist();
 const reload=environment({disk});
 record('STOCKAGE',++n,{action:'fermer puis relire le stockage du membre'},[150000,123000,20000],[reload.E.compute().n,reload.E.compute().a,reload.E.compute().total]);
 // The cache API and transport are doubles. The entire release service worker is executed as shipped.
 const html=fs.readFileSync(dir+'/index.html','utf8'),worker=fs.readFileSync(dir+'/service-worker.js','utf8'),base='https://foyer-simulation.invalid/ec/',origin=new URL(base).origin;
 const cacheSet=new Map(),events={};const abs=u=>new URL(typeof u==='string'?u:u.url,base).href;
 let online=true,activated=false;
 const net=async req=>{if(!online)throw Error('hors ligne');const u=new URL(abs(req)),f=u.pathname.replace('/ec/','')||'index.html';
  if(u.origin!==origin)return new Response('module de test');
  const p=dir+'/'+f;return fs.existsSync(p)?new Response(fs.readFileSync(p)):new Response('absent',{status:404})};
 async function open(k){if(!cacheSet.has(k))cacheSet.set(k,new Map());const m=cacheSet.get(k);
  return {async addAll(list){for(const x of list){const r=await net(x);if(!r.ok)throw Error('ressource absente');m.set(abs(x),r.clone())}},match:async req=>m.get(abs(req))?.clone(),put:async(req,res)=>m.set(abs(req),res.clone())}}
 const caches={open,keys:async()=>[...cacheSet.keys()],delete:async k=>cacheSet.delete(k),match:async req=>{for(const m of cacheSet.values())if(m.has(abs(req)))return m.get(abs(req)).clone()}};
 const self={addEventListener:(e,f)=>events[e]=f,registration:{scope:base},location:{origin},skipWaiting:async()=>{},clients:{claim:async()=>{activated=true}}};
 vm.runInNewContext(worker,{caches,self,URL,Response,fetch:net});
 const lifecycle=async name=>{let pending;events[name]({waitUntil:p=>pending=p});await pending};
 await open('equi-v9-précédent');await open('autre-application');await lifecycle('install');await lifecycle('activate');const keys=await caches.keys(),current=keys.find(k=>k!=='autre-application');
 record('PWA',1,{action:'installation puis activation du cache'},[true,false,true,10],[activated,keys.includes('equi-v9-précédent'),keys.includes('autre-application'),cacheSet.get(current).size]);
 const dispatch=async (file,mode)=>{let p;events.fetch({request:{url:abs(file),mode,method:'GET'},respondWith:resp=>p=resp});return await p};
 for(const [i,file] of ['./','./index.html','./manifest.webmanifest','./themes-v9.js?v=1','./themes-v9.css?v=1',html.match(/src="(\.\/sync-v8\.js\?[^"]+)"/)[1],'./firebase-config.json','./icon-v9-192.png','./icon-v9-512.png'].entries()){
  online=false;const nav=i<2,hit=await dispatch(file,nav?'navigate':'cors');
  const expected=fs.readFileSync(dir+'/'+(i===0?'index.html':new URL(abs(file)).pathname.slice(4)));
  record('PWA',2+i,{action:'ressource hors ligne dans un cache préchargé',fichier:file},[200,true],[hit.status,Buffer.from(await hit.arrayBuffer()).equals(expected)]);
 }
}
