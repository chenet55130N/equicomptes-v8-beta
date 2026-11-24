import vm from 'node:vm';
import {environment,household,salaries,charge,record,syncSource} from './env.mjs';
const clone=x=>x==null?null:JSON.parse(JSON.stringify(x));
const fmt=x=>JSON.stringify(x);
function service(){
 const db=new Map(),writes=[];
 let down=false;
 const get=k=>clone(db.get(k));
 const put=(k,v)=>{if(down){const e=Error('indisponible');e.code='unavailable';throw e}if(v===null)db.delete(k);else db.set(k,clone(v));writes.push([k,clone(v)])};
 const sdk={doc:(_,root,hid,g,id)=>g+'/'+id,collection:(_,root,hid,g)=>g,setDoc:async(k,v)=>put(k,v),deleteDoc:async k=>put(k,null),
   getDocsFromServer:async g=>({forEach:fn=>{for(const [key,v] of db)if(key.startsWith(g+'/'))fn({id:key.slice(g.length+1),data:()=>clone(v)})}}),
   onSnapshot:()=>()=>{},runTransaction:async(_db,handler)=>{let set=null;await handler({get:async k=>({exists:()=>db.has(k),data:()=>get(k)}),set:(k,v)=>{set=[k,v]},delete:k=>{set=[k,null]}});if(set)put(...set)}};
 return {db,writes,get,sdk,setDown(v){down=v}};
}
const expose=`
 window.port={
  prepare(fake,uid,baselines){
   sdk=fake;db={};PATH[1]='foyer-fictif';currentUserUID=uid;user={uid,email:uid+'@example.invalid'};onlineReady=true;disconnected=false;navigator.onLine=true;
   shadow=new Map(Object.entries(baselines));observed=flatten(B.state());dirty=Object.create(null);conflicts=new Map();inFlight=new Set();saveDiskQueue();saveBaseline();
  },
  queue(key,value){dirty[key]={value,deleted:value===null,base:shadow.has(key)?shadow.get(key):null,rev:(dirty[key]?.rev||0)+1};saveDiskQueue()},
  flush:syncPending,receive:(g,id,v)=>applyCloudSnapshot(g,id,v,{hasPendingWrites:false}),
  refresh:()=>readRemoteAndMerge(user),resolve:resolveConflicts,
  status:()=>({pending:Object.keys(dirty),conflicts:[...conflicts.keys()],shadow:Object.fromEntries(shadow)}),
  offline(){onlineReady=false;navigator.onLine=false;disconnected=true},
  online(){onlineReady=true;navigator.onLine=true;disconnected=false},
  reloadJournal:readDiskQueue, getDiskKey:queueKey,
 };
`;
async function device(){
 const h=environment();await vm.runInContext('(async()=>{'+syncSource+'\n'+expose+'})()',h.context,{filename:'sync-release.instrumented.js'});return {...h,p:h.context.port};
}
export async function run(){
 const alice=await device(),bob=await device();let k=0;
 for(const kind of ['bancaire','charge','salaire du mois','prime','avance','clôture de remboursement','historique','paramètres du foyer'])for(const notify of [true,false])for(const op of ['modification','suppression']){
  if(kind==='bancaire'&&op==='suppression')continue; // Non proposé dans les parcours bancaires normaux.
  const db=service();const [group,id]=({'bancaire':['settings','v9-banking'],'charge':['charges','électricité'],'salaire du mois':['months','2026-11'],'prime':['incomes','allocation'],'avance':['expenses','courses'],'clôture de remboursement':['settlements','remb1'],'historique':['history','2026-11'],'paramètres du foyer':['settings','main']})[kind],key=group+'/'+id;
  const v=n=>kind==='bancaire'?{schema:9,lab:{initial:'joint',split:'prorata',paid:{'2026-11':n}}}:kind==='salaire du mois'?{n:(n/100).toFixed(2),a:'1000',bankN:'joint',bankA:'personal'}:kind==='historique'?{month:'2026-11',savedAt:'2026-11-22',result:{total:n},charges:[]}:kind==='paramètres du foyer'?{settings:{defaultN:n,nameN:'Camille'},incomeTemplates:[]}:{id,name:'Essai',amount:n};
  const base=v(10000),vA=v(12000),vB=op==='suppression'?null:v(13000);
  db.db.set(key,base);
  for(const [h,u] of [[alice,'A'],[bob,'B']])h.p.prepare(db.sdk,u,{[key]:base});
  alice.p.queue(key,vA);bob.p.queue(key,vB);await alice.p.flush();
  if(notify)bob.p.receive(group,id,vA);
  await bob.p.flush();
  const conflict=bob.p.status().conflicts.includes(key),kept=fmt(db.get(key))===fmt(vA);
  record('SYNCHRO',++k,{objet:kind,operationDuSecond:op,avisDistantAvantSecondEnvoi:notify,initial:10000,appareilA:12000,appareilB:op==='modification'?13000:null},[true,true],[conflict,kept],'CONCUR');
 }
 for(const choice of [true,false]){
  const db=service(),key='charges/crédit',a={id:'crédit',amount:12000},b={id:'crédit',amount:10700},base={id:'crédit',amount:10000};db.db.set(key,a);bob.p.prepare(db.sdk,'B',{[key]:base});bob.p.queue(key,b);bob.p.receive('charges','crédit',a);
  bob.io.nextAnswer=choice;bob.p.resolve();await bob.p.flush();
  record('SYNCHRO',++k,{action:'arbitrage explicite',choix:choice?'local':'partagé'},[choice?10700:12000,0,0],[db.get(key).amount,bob.p.status().pending.length,bob.p.status().conflicts.length]);
 }
 for(const [key,field] of [['charges/c','charges'],['incomes/c','additionalIncome'],['expenses/c','expenses']]){
  const db=service(),base={id:'c',name:'Fictif',amount:10000},newDoc={...base,amount:9962};
  db.db.set(key,base);alice.p.prepare(db.sdk,'A',{[key]:base});alice.p.offline();alice.p.queue(key,newDoc);await alice.p.flush();const offline=db.get(key).amount;
  alice.p.reloadJournal();const held=alice.p.status().pending.includes(key);alice.p.online();await alice.p.flush();
  record('SYNCHRO',++k,{action:'journal hors ligne puis reconnexion',collection:field},[10000,true,9962,0],[offline,held,db.get(key).amount,alice.p.status().pending.length]);
 }
 {
  const db=service(),key='charges/assurance',base={id:'assurance',amount:7500},newDoc={...base,amount:7900};
  db.db.set(key,base);alice.p.prepare(db.sdk,'A',{[key]:base});alice.p.queue(key,newDoc);db.setDown(true);await alice.p.flush();const held=alice.p.status().pending.includes(key);
  db.setDown(false);await alice.p.flush();record('SYNCHRO',++k,{action:'envoi interrompu puis repris'},[true,7900,0],[held,db.get(key).amount,alice.p.status().pending.length]);
 }
 for(const mode of ['joint','separate']){
  const db=service(),s=household(alice.E,mode);salaries(s,210000,165000);charge(s,'loyer',90000,'common',mode==='joint'?'joint':'p1');s.lab.split='half';
  const docs={'settings/main':{settings:s.settings,incomeTemplates:[]},'settings/v9-banking':{schema:9,lab:s.lab},'months/2026-11':s.monthlySalaries['2026-11'],'charges/loyer':s.charges[0]};
  for(const [key,val] of Object.entries(docs))db.db.set(key,clone(val));
  const clean=household(alice.E,'joint','2026-11');alice.E.reset(clean);alice.p.prepare(db.sdk,'A',docs);await alice.p.refresh();
  const r=alice.E.compute();record('SYNCHRO',++k,{action:'reconstruction du foyer depuis les collections simulées',mode},[mode,90000,mode==='joint'?159600:45000],[alice.E.get().lab.initial,r.total,r.netN]);
 }
 // Two independent documents may be edited without conflict.
 {
  const db=service(),docs={'charges/eau':{id:'eau',amount:1000},'charges/gaz':{id:'gaz',amount:2000}};
  for(const [key,v] of Object.entries(docs))db.db.set(key,v);
  alice.p.prepare(db.sdk,'A',docs);bob.p.prepare(db.sdk,'B',docs);
  alice.p.queue('charges/eau',{id:'eau',amount:1199});bob.p.queue('charges/gaz',{id:'gaz',amount:2199});await Promise.all([alice.p.flush(),bob.p.flush()]);
  record('SYNCHRO',++k,{action:'deux charges différentes modifiées'},[1199,2199,0],[db.get('charges/eau').amount,db.get('charges/gaz').amount,bob.p.status().conflicts.length]);
 }
}
