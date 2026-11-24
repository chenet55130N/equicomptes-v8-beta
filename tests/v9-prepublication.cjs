'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const sync=fs.readFileSync(path.join(__dirname,'../sync-v8.js'),'utf8');
function section(text,start,end){
 const i=text.indexOf(start),j=text.indexOf(end,i);
 assert(i>=0&&j>i,'Sections de source disponibles : '+start);
 return text.slice(i,j).trim();
}
(async()=>{
 const inline=[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].map(m=>m[1]).filter(Boolean);
 assert.equal(inline.length,6);
 for(const script of inline)new Function(script);
 new (Object.getPrototypeOf(async function(){}).constructor)(sync);
 assert.match(html,/const seed=\(\)=>/);
 // Test des 16 univers de la maquette officielle (aucun changement financier).
 const vm=require('node:vm');
 const studio=fs.readFileSync(path.join(__dirname,'../themes-v9.js'),'utf8');
 const styles=fs.readFileSync(path.join(__dirname,'../themes-v9.css'),'utf8');
 const palette=new Map();
 const context={window:{},document:{documentElement:{
  style:{setProperty:(k,v)=>palette.set(k,v),removeProperty:k=>palette.delete(k)},
  dataset:{}
 }}};
 vm.runInNewContext(studio,context);
 const univers=context.window.EQUI16_THEMES;
 assert.equal(univers.length,16,'Seize nouveaux univers devaient être installés');
 assert.equal(new Set(univers.map(x=>x.id)).size,16,'IDs uniques');
 assert.equal(univers.filter(x=>x.cat==='Finance').length,5);
 assert.equal(univers.filter(x=>x.cat==='Équité').length,4);
 assert.equal(univers.filter(x=>x.cat==='Nature').length,5);
 assert.equal(univers.filter(x=>x.cat==='Créatifs').length,2);
 assert.ok(univers.every(x=>x.equiNew&&x.c.length===3&&x.meta&&x.icons.length>=4&&x.chart),'Thèmes compatibles avec le moteur actuel');
 assert.equal(univers.find(x=>x.name==='Capital Émeraude').h1,'#143c31');
 assert.equal(univers.find(x=>x.name==='Aurore Magnétique').look,'aurora');
 assert.equal(univers.find(x=>x.name==='Océan de Verre').id,'ocean-glass','Ne pas écraser le thème Océan historique');
 assert.match(html,/THEMES\.unshift\(\.\.\.window\.EQUI16_THEMES\)/);
 assert.match(html,/window\.EQUI16_applySkin\(t\)/);
 assert.match(html,/data-theme-filter="Finance"/);
 assert.match(html,/data-theme-filter="Classiques"/);
 assert.match(html,/themes-v9\.css\?v=1/);
 assert.match(html,/themes-v9\.js\?v=1/);
 assert.ok(html.indexOf('src="./themes-v9.js?v=1"')<html.indexOf('const KEY='),'Charger les thèmes avant le moteur');
 assert.match(fs.readFileSync(path.join(__dirname,'../service-worker.js'),'utf8'),/themes-v9\.css\?v=1/);
 assert.match(fs.readFileSync(path.join(__dirname,'../service-worker.js'),'utf8'),/themes-v9\.js\?v=1/);
 for(const look of new Set(univers.map(x=>x.look))){
  assert.ok(styles.includes('data-equi-look="'+look+'"'),'Rendu spécifique manquant : '+look);
 }
 context.window.EQUI16_applySkin(univers[0]);
 assert.equal(palette.get('--t-primary'),'#227e65');
 assert.equal(context.document.documentElement.dataset.equiLook,'heritage');
 context.window.EQUI16_applySkin(null);
 assert.equal(palette.size,0,'Les thèmes classiques doivent récupérer leurs variables d’origine');
 assert.equal(context.document.documentElement.dataset.equiLook,undefined);

 // Identité de la version installable : l'ancien libellé V8.3 ne doit pas subsister
 // sur l'écran de connexion. Conserver le même identifiant PWA et le même lien.
 const manifest=JSON.parse(fs.readFileSync(path.join(__dirname,'../manifest.webmanifest'),'utf8'));
 const serviceWorker=fs.readFileSync(path.join(__dirname,'../service-worker.js'),'utf8');
 assert.equal(manifest.id,'./?equicomptes-v8-beta');
 const displayed=html.match(/name="application-name" content="([^"]+)"/)[1];
 assert.equal(manifest.name,displayed);
 assert.equal(manifest.short_name,'ÉquiComptes V9');
 assert.deepEqual(manifest.icons.map(icon=>icon.src),['icon-v9-192.png','icon-v9-512.png']);
 for(const icon of manifest.icons){
  assert.ok(fs.existsSync(path.join(__dirname,'..',icon.src)),'Icône PWA absente : '+icon.src);
 }
 assert.ok(html.includes('<strong>'+displayed+'</strong>'));
 assert.doesNotMatch(html,/<strong>ÉquiComptes V8\.3<\/strong>/);
 assert.match(html,/rel="manifest" href="\.\/manifest\.webmanifest"/);
 // Le lien n'est pas affiché sous le QR, mais reste dans le DOM
 // pour préserver les boutons Copier le lien / Partager…
 assert.match(html,/<a id="v82-share-link" href="https:\/\/chenet55130n\.github\.io\/equicomptes-v8-beta\/" hidden aria-hidden="true" tabindex="-1"><\/a>/);
 assert.doesNotMatch(html,/>chenet55130n\.github\.io\/equicomptes-v8-beta\/<\/a>/);
 assert.match(html,/id="v82-share-copy"/);
 assert.match(html,/id="v82-share-system"/);
 assert.match(html,/const url=by\('v82-share-link'\)\.href/);
 assert.ok(serviceWorker.includes('equi-v'+displayed.split(' V')[1].replaceAll('.','-')));
 assert.match(serviceWorker,/icon-v9-192\.png/);
 assert.match(serviceWorker,/icon-v9-512\.png/);
 // Régression UI : ni message de prépublication ni configuration bancaire
 // imposée dans le calcul. Le changement de mode reste dans le menu.
 assert.doesNotMatch(html,/candidate de prépublication/i);
 assert.doesNotMatch(html,/document\.createElement\('div'\);labBanner/);
 assert.doesNotMatch(html,/by\('pane-calcul'\)\.prepend\(labBanner\)/);
 assert.match(html,/data-v82-action="banking">⇄ Changer de mode bancaire/);
 assert.match(html,/id="v9-menu-version">ÉquiComptes V9\.0/);
 assert.match(html,/function labUpdateTop\(\)/);
 assert.match(html,/document\.documentElement\.dataset\.bankMode=mode/);
 assert.match(html,/by\('lab-charge-joint-wrap'\)\.hidden=mode!=='joint'/);
 assert.match(html,/by\('lab-charge-separate-wrap'\)\.hidden=mode!=='separate'/);
 assert.match(html,/html\[data-bank-mode="separate"\] #pane-calcul \.account-label/);
 assert.match(html,/id="v9-income-intro"/);
 assert.match(html,/separate\?'Bonus commun'/);
 assert.match(html,/id="v9-default-bank-p1-wrap"/);
 const syncUrl=html.match(/src="(\.\/sync-v8\.js\?v=[^"]+)"/)[1];assert.ok(serviceWorker.includes(syncUrl));
 assert.match(html,/if\(!v82Demo\)setInterval\([\s\S]{0,220}v82Snapshot\(\);[\s\S]{0,30}60000\)/);
 assert.match(html,/version:v,exportedAt:new Date\(\)\.toISOString\(\)/);
 assert.match(html,/labFrozenAt\(state.month\)\?\.result\|\|state.history.find/);
 assert.match(sync,/await batch.commit\(\);[\s\S]{0,600}await sdk.setDoc\(sdk.doc\(db,'foyers',hid,'settings','v9-banking'\)/);
 assert.match(sync,/createdAt:sdk.serverTimestamp\(\),version:8/);
 assert.match(sync,/sdk.runTransaction\(db,async transaction/);
 const helpers={
  monthNow:()=> '2026-11',
  SETTINGS_DEFAULT:{defaultN:210000,defaultA:165000,rent:0,bankN:'joint',bankA:'joint',nameN:'Personne 1',nameA:'Personne 2'},
  newSalaries:()=>({n:'2100',a:'1650',bankN:'joint',bankA:'joint'}),
  defaultIncomeTemplates:()=>[],DEFAULTS:[],cents:n=>Math.round(n*100),
  validMonth:m=>/^\d{4}-(0[1-9]|1[0-2])$/.test(m),
  safeCents:n=>Number.isFinite(Number(n))?Math.round(Number(n)):0,
  normalizeBank:b=>b==='personal'?'personal':'joint',
  normalizeIncomeTemplates:a=>Array.isArray(a)?a:[],
  normalizePersonName:(a,b)=>typeof a==='string'&&a?a:b,
  formatInput:n=>(Number(n)/100).toString(),
  normalizeSchedule:v=>v||{},
  THEMES:[{id:'signature'}],
  window:{EQUI_LAB_TEST:true}
 };
 const keys=Object.keys(helpers),values=Object.values(helpers);
 const seed=new Function(...keys,section(html,'const seed=()=>{','function adaptOldBackup')+';return seed')(...values);
 const validate=new Function(...keys,'seed',section(html,'function validate(data){','\nlet state;try{')+';return validate')(...values,seed);
 let prompts=0;
 const adapt=new Function('confirm','prompt',section(html,'function adaptOldBackup(data){','function validate(data){')+';return adaptOldBackup')(
  ()=>{prompts++;return true},()=>{prompts++;return 'nico'});
 let current=seed();
 current.settings.nameN='Alex';
 current.monthlySalaries['2026-10']={n:'2200',a:'1550',moveN:0,moveA:100,bankN:'joint',bankA:'personal'};
 current.incomeTemplates=[{id:'tpl',name:'Prime'}];
 current.charges=[{id:'c1',name:'Loyer',owner:'common',amount:65000,enabled:true,schedule:{overrides:{'2026-12':75000}}}];
 current.additionalIncome=[{id:'i1',month:'2026-11',name:'Bonus',amount:30000,owner:'p1',enabled:true,paid:{p1:true}}];
 current.expenses=[{id:'e1',label:'Courses',amount:4500,payer:'p1',repayment:'half',date:'2026-11-15',settlementId:''}];
 current.settlements=[{id:'s1',at:'2026-11-16',amount:2250,from:'p2',to:'p1',expenseIds:['e1']}];
 current.history=[{month:'2026-10',savedAt:'2026-11-01',result:{cn:34243,ca:22013},charges:current.charges,additionalIncome:[]}];
 const remote={
  settings:{main:{settings:current.settings,incomeTemplates:current.incomeTemplates}},
  months:current.monthlySalaries,
  charges:Object.fromEntries(current.charges.map(x=>[x.id,x])),
  incomes:Object.fromEntries(current.additionalIncome.map(x=>[x.id,x])),
  expenses:Object.fromEntries(current.expenses.map(x=>[x.id,x])),
  settlements:Object.fromEntries(current.settlements.map(x=>[x.id,x])),
  history:Object.fromEntries(current.history.map(x=>[x.month,x]))
 };
 const bridge='let localReadFailed=false;'+section(html,'function betaReplace(remote){','\nlet betaRenderTimer');
 const restored=new Function('state','seed','validate','betaRefresh','remote',bridge+';betaReplace(remote);return state')(current,seed,validate,()=>{},remote);
 assert.equal(restored.settings.nameN,'Alex');
 assert.equal(restored.monthlySalaries['2026-10'].moveA,100);
 assert.equal(restored.charges[0].schedule.overrides['2026-12'],75000);
 assert.equal(restored.additionalIncome[0].paid.p1,true);
 assert.equal(restored.expenses[0].amount,4500);
 assert.equal(restored.settlements[0].expenseIds[0],'e1');
 assert.equal(restored.history[0].result.cn,34243);
 assert.equal(restored.lab.initial,'joint');
 assert.equal(restored.lab.configured,true);
 const bank={initial:'joint',transitions:[{effective:'2026-12',to:'separate'}],
  pending:{from:'2026-11',effective:'2026-12',to:'separate'},payerChanges:{joint:{},separate:{}},
  frozen:{},payers:{},jointPayers:{},paid:{},split:'prorata',splitChanges:[],clock:'2026-11-16',latestMonthSeen:'2026-11',configured:true};
 const imported=adapt({lab:bank,charges:[{id:'c1',owner:'common'}],settlements:[{from:'p1',to:'p2'}]});
 assert.equal(prompts,0,'La sauvegarde V9 ne doit pas déclencher la conversion des personnes V8');
 assert.deepEqual(imported.lab,bank,'Les transitions bancaires ne doivent pas être modifiées');
 const importedV8=adapt({charges:[{owner:'nico'}],settlements:[{from:'audrey',to:'nico'}]});
 assert.equal(importedV8.charges[0].owner,'p1');
 assert.equal(importedV8.settlements[0].from,'p2');
 const roundtrip=validate({...restored,lab:bank});
 assert.deepEqual(roundtrip.lab,bank,'Import/export V9 doit conserver le mode');
 const stable=new Function(section(sync,'const stableBank =','const gate =')+';return stableBank')();
 const pendingFn=section(sync,'async function syncPending(){','function reconnectSoon(){');
 async function mockSync(doc,base,local){
  const dirty={'settings/v9-banking':{value:local,base,rev:1,deleted:false}},
   conflicts=new Map(),inFlight=new Set(),shadow=new Map();
  let currentDoc=doc,writes=0;
  const sdk={runTransaction:async(_db,fn)=>fn({
   get:async()=>({exists:()=>currentDoc!==null,data:()=>currentDoc}),
   set:(r,v)=>{writes++;currentDoc=v}
  }),setDoc:async()=>{throw Error('setDoc non transactionnel')},deleteDoc:async()=>{throw Error('deleteDoc inattendu')}};
  const ctx={onlineReady:true,navigator:{onLine:true},user:{uid:'test'},db:{},
   dirty,inFlight,conflicts,GROUPS:['settings','months','charges','incomes','expenses','settlements','history'],
   sdk,pathDoc:(g,id)=>g+'/'+id,saveDiskQueue:()=>{},shadow,saveBaseline:()=>{},
   disconnected:false,note:()=>{},errorText:e=>String(e),refreshStatus:()=>{},scheduleSync:()=>{},
   stableBank:stable,fmt:JSON.stringify};
  const args=Object.keys(ctx);
  await new Function(...args,pendingFn+';return syncPending()')(...args.map(x=>ctx[x]));
  return {writes,conflicts:conflicts.size,pending:Object.keys(dirty).length};
 }
 const base={schema:9,lab:{initial:'joint',split:'half'}},local={schema:9,lab:{initial:'separate',split:'half'}};
 const success=await mockSync({lab:{split:'half',initial:'joint'},schema:9},base,local);
 const conflict=await mockSync({schema:9,lab:{initial:'joint',split:'prorata'}},base,local);
 assert.deepEqual(success,{writes:1,conflicts:0,pending:0});
 assert.deepEqual(conflict,{writes:0,conflicts:1,pending:1});
 const labFns=section(html,'function labModeAt(month){','function labRenderBanking(){');
 const makeTimeline=async unpaid=>{
  const state={month:'2026-11',charges:[],additionalIncome:[],history:[],settings:{bankN:'joint',bankA:'joint'},monthlySalaries:{'2026-11':{moveN:0,moveA:0}},lab:{
   initial:'joint',transitions:[],pending:{from:'2026-11',effective:'2026-12',to:'separate'},
   payers:{},jointPayers:{},payerChanges:{joint:{},separate:{}},clock:'2026-11-16',latestMonthSeen:'2026-11',
   paid:{},configured:true,blocked:'',split:'prorata',splitChanges:[],frozen:{}
  }};
  const deps={
   state,v82Context:()=>({scope:'fixture'}),v82Snapshot:async()=>true,labToday:()=> '2026-12-01',labNextMonth:m=>{const [y,mm]=m.split('-').map(Number);const d=new Date(y,mm,1);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')},
   debtState:()=>({pending:[]}),movementState:()=>({base:{p1:unpaid,p2:0},done:{p1:0,p2:0}}),
   monthIncome:()=>[],bonusParts:()=>({}),compute:()=>({netN:0,netA:0,groups:{common:0,p1:0,p2:0}}),
   personName:v=>v,switchMonth:m=>{state.month=m},persist:()=>true,labRenderBanking:()=>{},
   renderCharges:()=>{},renderHistory:()=>{},toast:()=>{},labelMonth:m=>m,effectiveCharge:()=>({active:true})};
  const k=Object.keys(deps);
  const clock=new Function(...k,labFns+';return labClockChange')(...k.map(x=>deps[x]));
  await clock('2026-12-01');
  return state;
 };
 const ok=await makeTimeline(0),blocked=await makeTimeline(2500);
 assert.equal(ok.lab.initial,'joint');
 assert.equal(ok.lab.pending,null);
 assert.equal(ok.lab.latestMonthSeen,'2026-12');
 assert.equal(ok.lab.transitions[0].to,'separate');
 assert.equal(ok.history[0].month,'2026-11');
 assert.equal(blocked.lab.pending.to,'separate');
 assert.equal(blocked.lab.latestMonthSeen,'2026-11');
 assert.match(blocked.lab.blocked,/non validé/);
 assert.equal(blocked.lab.clock,'2026-12-01','La date réelle doit avancer même si la clôture est suspendue');
 if(process.env.GITHUB_ACTIONS==='true'){
  const {execFileSync}=require('node:child_process');
  execFileSync(process.execPath,[path.join(__dirname,'simulations-v904/run.mjs')],{stdio:'inherit'});
  execFileSync(process.execPath,[path.join(__dirname,'simulations-v904/navigateur.cjs')],{stdio:'inherit'});
 }
 console.log('V9 PREPUBLICATION PASS: syntaxe, 9 catégories V8, import V9, sauvegardes, conflit Firestore, passage de mois, blocages');
})().catch(err=>{console.error(err);process.exitCode=1});
