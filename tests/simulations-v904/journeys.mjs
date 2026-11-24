import {environment,household,salaries,charge,bonus,next,record,euro} from './env.mjs';
import fs from 'node:fs';
import {idb} from './storage.mjs';
const tidy=s=>s.replace(/[\u00a0\u202f]/g,' ').trim();
const canon=v=>JSON.parse(JSON.stringify(v));
export async function run(){
 const uid='essai',hid='fictif';
 const h=environment({disk:new Map([['equi-v8-verified',JSON.stringify({uid,hid,email:'test@example.invalid'})]])}),{E,by,q,click,fire,set}=h;
 h.id='equicomptes-v8-beta-local:'+uid+':'+hid;
 h.context.indexedDB=idb();h.context.EQUI_V82_CONTEXT=()=>({uid,hid,ready:true,synced:true});
 const load=s=>{E.reset(s);E.refresh()};
 let idx=0;
 function check(name,input,expected,actual,issue=''){record('PARCOURS',++idx,{action:name,...input},expected,actual,issue)}
 function menu(item){click('#v82-open-menu');click('[data-v82-action="'+item+'"]')}
 function closeBank(){click('[data-v82-close="lab-banking"]')}
 function refs(){const s=household(E,'separate');s.lab.split='half';salaries(s,210000,165000);charge(s,'loyer',60000,'common','p1');charge(s,'électricité',10000,'common','p1');charge(s,'courses',20000,'common','p2');return s}
 let k=0;
 for(const mode of ['joint','separate'])for(const month of ['2025-12','2026-11','2028-02'])for(const blocker of ['libre','avance','virement','bonus','après programmation','annuler']){
  const s=household(E,mode,month),other=mode==='joint'?'separate':'joint',to=next(month);salaries(s,200000,200000,'personal','personal');
  if(blocker==='virement'){charge(s,'commun',10000,'common',mode==='joint'?'joint':'p1');s.lab.payers.commun='p1'}
  if(blocker==='bonus')bonus(s,'versement',10000,'p1');
  const addDebt=()=>s.expenses.push({id:'a',label:'achat',date:month+'-04',payer:'p2',repayment:'half',amount:5000,settlementId:''});
  if(blocker==='avance')addDebt();load(s);menu('banking');
  const enabled=!by('lab-schedule').disabled;if(enabled)click('#lab-schedule');
  if(blocker==='après programmation')addDebt();
  if(blocker==='annuler')click('#lab-cancel');
  const preMode=E.labModeAt(month),scheduled=s.lab.pending?.effective??null;
  await E.labClockChange(to+'-01');const allow=['libre','annuler'].includes(blocker),active=allow&&blocker!=='annuler'?other:mode;
  const wanted= !['avance','virement','bonus'].includes(blocker);
  record('BASCULE',++k,{mode,mois:month,jour:to+'-01',cas:blocker},[wanted,mode,wanted&&blocker!=='annuler'?to:null,active,allow?to:month,!allow],[enabled,preMode,scheduled,E.labModeAt(to),s.lab.latestMonthSeen,!!s.lab.blocked]);
  closeBank();
 }
 // Change from joint to separate with an ordinary charge, through the actual charge form.
 {
  const s=household(E);salaries(s,200000,200000,'personal','personal');load(s);
  click('[data-tab="charges"]');click('#add-charge-top');set('#charge-name','Abonnement');set('#charge-amount','100,00','input');set('#charge-owner','common');set('#lab-charge-payer-joint','p1');
  fire(by('charge-form'),'submit');
  const id=s.charges[0].id;
  click('[data-tab="calcul"]');click('[data-base-done="p1"]');click('[data-base-done="p2"]');
  menu('banking');const blocked=by('lab-schedule').disabled;click('#lab-go-charges');click('[data-edit="'+id+'"]');
  const visibleNow=!by('lab-charge-separate-wrap').hidden;set('#lab-charge-effective',next(s.month));const visibleNext=!by('lab-charge-separate-wrap').hidden;click('#cancel-dialog');
  check('Préparer le futur compte payeur depuis la fiche',{mode:'joint',charge:10000,avantProgrammation:true},[true,true],[blocked,visibleNow||visibleNext],'MIG');
 }
 // Manual closure with base transfer or bonus still open: UI locks confirmation.
 for(const outstanding of ['base','bonus']){
  const s=household(E);salaries(s,100000,100000,outstanding==='base'?'joint':'personal',outstanding==='base'?'joint':'personal');
  if(outstanding==='bonus')bonus(s,'prime',30000,'p1');
  load(s);click('[data-tab="calcul"]');click('#save-month');const frozen=E.labIsClosed(s.month),sel=outstanding==='base'?'[data-base-done="p1"]':'[data-bonus-id="prime"]';
  if(q(sel))click(sel);
  const afterClick=outstanding==='base'?s.monthlySalaries[s.month].moveN:!!s.additionalIncome[0].paid.p1;
  const left=E.labReasons();
  await E.labClockChange('2026-12-01');
  check('Enregistrer avant la confirmation du mouvement puis régulariser',{mouvement:outstanding,montant:outstanding==='base'?100000:30000,blocageObserve:s.lab.blocked},
   {peutRegulariser:true},{peutRegulariser:!frozen||!!afterClick||(!left.length&&!s.lab.blocked)},'CLOT');
 }
 // Actual clipboard text from the copy button, signed balances checked separately.
 for(const done of [false,true]){
  const s=refs();load(s);if(done)click('[data-lab-settle]');click('#copy-result');
  const txt=tidy(h.io.clipboard);
  const relevant=txt.split('\n').filter(x=>x.includes('→')||x.includes('aucun virement'));
  check('Copier les virements en mode sans joint',{effectue:done,attenduCentimes:done?0:25000,texteCopie:relevant},
   {compteJointDansLesInstructions:false,virementDejaValideRepropose:false},
   {compteJointDansLesInstructions:relevant.some(x=>/compte joint/i.test(x)),virementDejaValideRepropose:done&&relevant.some(x=>/250,00/.test(x))},'COPIE');
  if(!done){
   const half=[tidy(by('transfer-p1-name').textContent),tidy(by('transfer-p1').textContent)];
   E.labSetSplit(s.month,'prorata');E.renderResults();
   check('Référence écran sans joint, 50/50 puis prorata',{charges:[70000,20000],salaires:[210000,165000]},['Alex → Camille','250,00 €','Alex → Camille','196,00 €'],[...half,tidy(by('transfer-p1-name').textContent),tidy(by('transfer-p1').textContent)]);
  }
 }
 // Opposite signs and fully validated directions, button event and text consistency.
 for(const mode of ['joint','separate']){
  const s=mode==='separate'?refs():household(E);
  if(mode==='joint'){salaries(s,210000,165000);charge(s,'loyer',90000);charge(s,'electricite',10000,'common','p1');bonus(s,'prime',30000,'p1')}
  load(s);
  if(mode==='separate'){
   click('[data-lab-settle]');const after=E.labRemainder();click('[data-lab-undo]');check('Confirmer puis annuler le virement entre personnes',{montant:25000},[0,25000],[after,E.labRemainder()]);
  }else{
   click('[data-base-done="p1"]');click('[data-bonus-id="prime"]');const after=E.movementState().remaining.p1;click('[data-base-undo="p1"]');click('[data-bonus-id="prime"]');
   check('Valider puis annuler un virement et sa prime',{salaire:210000,charges:100000,prime:30000},[0,194000],[after,E.movementState().remaining.p1]);
  }
 }
 // Archive integrity in public handlers.
 for(const action of ['ajouter un bonus','rétablir les salaires habituels','annuler une compensation']){
  const s=action==='annuler une compensation'?refs():household(E);
  if(s.lab.initial==='joint'){salaries(s,100000,100000,'personal','personal');s.settings.defaultN=210000;s.settings.defaultA=165000}
  load(s);if(action==='annuler une compensation')click('[data-lab-settle]');click('#save-month');
  const archived=canon(E.compute());let exp,act;
  if(action==='ajouter un bonus'){
   click('#add-income');set('#income-name','Prime après clôture');set('#income-amount','300,00');set('#income-owner','p1');fire(by('income-form'),'submit');
   exp=[0,0];act=[s.additionalIncome.length,E.compute().extra.p1];if(by('income-dialog').hasAttribute('open'))click('#cancel-income');
  }else if(action==='rétablir les salaires habituels'){
   click('#apply-default-salaries');exp=[100000,100000];act=[Math.round(parseFloat(s.salaryN.replace(',','.'))*100),E.compute().n];
  }else{
   const undo=q('[data-lab-undo]');if(undo&&!undo.disabled)click('[data-lab-undo]');
   exp=[0,25000];act=[E.labRemainder(),s.lab.paid[s.month]];
  }
  check('Archive en lecture seule · '+action,{mode:s.lab.initial,mois:s.month,totalArchive:archived.total},exp,act,'ARCH');
 }
 // Decomposition of the balance left on the joint account.
 {
  const s=household(E);salaries(s,210000,165000);charge(s,'Loyer',80000);charge(s,'Électricité',10000,'common','p1');load(s);
  const warning=tidy(by('warning').textContent);
  check('Décomposer le solde conservé sur le joint',{débitJoint:80000,débitPersonnel:10000},'800,00 € pour les charges',warning.match(/[\d\s]+,\d{2} € pour les charges/)?.[0].trim(),'JOINTTXT');
 }
 // Without an income base, no arbitrary prorata can be validated. 50/50 needs no salary.
 for(const kind of ['prorata','half']){
  const s=household(E,'separate');s.lab.split=kind;charge(s,'facture',10000,'common','p1');load(s);
  const active=!!q('[data-lab-settle]')&&!q('[data-lab-settle]').disabled;
  const detail=tidy(by('monthly-movements').textContent);
  if(kind==='prorata'){
   if(active)click('[data-lab-settle]');
   check('Prorata avec deux salaires nuls',{salaires:[0,0],facture:10000,detail},false,!!s.lab.paid[s.month],'ZERO');
  }else check('50/50 avec deux salaires nuls',{salaires:[0,0],facture:10000,detail},'50,00 €',tidy(by('transfer-p1').textContent),'ZERO');
 }
 {
  const s=household(E,'separate');s.lab.split='half';salaries(s,210000,165000);
  charge(s,'exception',5000,'common','',{type:'monthly',anchor:1,months:[],start:'',end:'',overrides:{'2026-11':{amount:10000,enabled:true}}},false);
  load(s);const r=E.compute(),button=q('[data-lab-settle]');if(button&&!button.disabled)click('[data-lab-settle]');
  check('Exception activée sur une charge désactivée et sans payeur',{chargeDuMois:r.total,payeParLesDeux:r.labPaidN+r.labPaidA},false,!!s.lab.paid[s.month],'PAYEUR');
 }
 // A dormant household resumes after more than one month, with a valid intermediate salary record outstanding.
 {
  const s=household(E,'joint','2026-11');salaries(s,100000,100000,'personal','personal');
  s.monthlySalaries['2026-12']={n:'1000',a:'1000',bankN:'joint',bankA:'joint',moveN:0,moveA:0};
  load(s);await E.labClockChange('2027-01-01');E.switchMonth('2026-12');const closed=E.labIsClosed('2026-12');
  const frozen=!!s.lab.frozen['2026-12'];const remaining=E.movementState().remaining.p1;
  check('Réouverture après deux changements de mois',{derniereOuverture:'2026-11',reprise:'2027-01',virementDeDecembre:remaining},
   {decembreVerrouilleSansArchiveAvecVirementEnAttente:false},{decembreVerrouilleSansArchiveAvecVirementEnAttente:closed&&!frozen&&remaining!==0},'SAUT');
 }
 // Size threshold behavior at import/local reload for all supported arrays.
 const capacityCases=[
  ['charges',300,i=>({id:'c'+i,name:'Charge '+i,owner:'common',amount:100,enabled:true})],
  ['additionalIncome',2000,i=>({id:'r'+i,month:'2026-11',name:'Prime '+i,owner:'p1',amount:100,enabled:true})],
  ['expenses',2500,i=>({id:'a'+i,label:'Avance '+i,repayment:'half',payer:'p1',date:'2026-11-02',amount:100,settlementId:''})],
  ['settlements',500,i=>({id:'s'+i,at:'2026-11-12',from:'p1',to:'p2',amount:100,expenseIds:[]})],
  ['history',120,i=>({month:next('2005-01',i),result:{total:100},charges:[]})]
 ];
 for(const [field,max,create] of capacityCases)for(const n of [max-1,max,max+1]){
  const s=household(E);s[field]=Array.from({length:n},(_,i)=>create(i));
  const imported=E.validate(JSON.parse(JSON.stringify(s)));record('VOLUME',field+'-'+n,{collection:field,entrees:n},n,imported[field].length,'LIM');
 }
 // The 301st charge can be created via the production form then silently dropped on reopening.
 {
  const s=household(E);salaries(s,100000,100000,'personal','personal');for(let i=0;i<300;i++)charge(s,'charge-'+i,10);
  load(s);click('[data-tab="charges"]');click('#add-charge-top');set('#charge-name','Charge numéro 301');set('#charge-amount','89,00','input');fire(by('charge-form'),'submit');
  const before=s.charges.length, disk=h.storage.getItem(h.id),after=E.validate(E.adaptOldBackup(JSON.parse(disk)));
  check('Ajouter une 301e charge puis relire la sauvegarde locale',{avantRelecture:before,libelle:'Charge numéro 301'},[301,true],[after.charges.length,after.charges.some(x=>x.name==='Charge numéro 301')],'LIM');
 }
 // Forward compatibility and actual JSON import/export with hosted I/O replaced by an in-memory file.
 for(const mode of ['joint','separate'])for(const month of ['2026-10','2027-01']){
  const s=household(E,mode,month);salaries(s,210000,165000);charge(s,'loyer',92300,'common',mode==='joint'?'joint':'p1');bonus(s,'prime',30000,'split',true,{p1:true});
  E.reset(s);const before=canon(E.compute());E.exportData();const text=await h.io.blob.text();
  E.reset(household(E,'joint',month));E.importData({text});
  check('Exporter puis importer une sauvegarde V9',{mode,mois:month},[mode,before.netN,30000,true],[E.get().lab.initial,E.compute().netN,E.get().additionalIncome[0].amount,E.get().additionalIncome[0].paid.p1]);
 }
 {
  const s=refs();load(s);const before=canon(E.get());E.importData({text:'{"charges":3}'});const equal=JSON.stringify(before)===JSON.stringify(canon(E.get()));
  check('Importer un fichier invalide',{donnees:'charges = 3'},[true,'Fichier de sauvegarde invalide'],[equal,by('toast').textContent]);
  const old=canon(s);delete old.lab;old.charges[0].owner='ancien';E.importData({text:JSON.stringify(old)});
  check('Importer un foyer antérieur avec correspondance des personnes',{source:'format sans paramètres V9'},['separate','p1'],[E.get().lab.initial,E.get().charges[0].owner]);
 }
 // User input and reimbursement cycle, including cancel, expenses across months.
 for(const mode of ['joint','separate']){
  const s=household(E,mode);load(s);click('[data-tab="partage"]');let j=0;
  for(const [payer,amount,rep] of [['p1','80,01','half'],['p2','10,00','full']]){set('#expense-label','Test '+ ++j);set('#expense-amount',amount);set('#expense-date',j===1?'2026-10-15':'2026-11-02');set('#expense-payer',payer);set('#expense-repayment',rep);fire(by('expense-form'),'submit')}
  const before=E.debtState().amount;click('#settle-debts');const cleared=E.debtState().amount,stamp=s.settlements[0].amount;click('[data-undo-settlement]');
  check('Créer deux avances, clôturer et annuler',{mode,achats:['80,01 € à 50 %','10 € à 100 %']},[3001,0,3001,3001],[before,cleared,stamp,E.debtState().amount]);
  for(const [idx,raw] of ['-12','3,525','vide','0,00'].entries()){set('#expense-label','Test invalide');set('#expense-amount',raw);set('#expense-date','2026-11-12');fire(by('expense-form'),'submit');
   check('Refuser une avance invalide',{mode,saisie:raw},2,s.expenses.length)}
 }
 // Theme selector: use official selectors in both banking modes and validate no financial change.
 for(const mode of ['joint','separate']){
  const s=mode==='separate'?refs():household(E);if(mode==='joint'){salaries(s,123400,87600);charge(s,'loyer',80000)}
  load(s);const before=E.compute().netN;
  const ids=[...h.context.EQUI16_THEMES.map(t=>t.id),'signature','neon','nature','pop','carnet','zen','ocean','retro','luxe','studio'];
  for(const [j,id] of ids.entries()){
   menu('themes');click('[data-theme-filter="'+(j>=16?'Classiques':'Tous')+'"]');click('[data-theme-choice="'+id+'"]');
   record('THEME',mode+'-'+id,{mode,theme:id,netAvant:before},[id,before,false],[h.document.documentElement.dataset.theme,E.compute().netN,by('theme-dialog').hasAttribute('open')]);
  }
 }
 {
  const t=environment({extraScripts:true}),s=household(t.E);salaries(s,210000,165000);charge(s,'loyer',90000);t.E.reset(s);t.E.refresh();
  const text=tidy(t.by('transfer-p1').textContent);t.click('#privacy-toggle');
  const masked=tidy(t.by('transfer-p1').textContent);t.click('#privacy-toggle');
  check('Masquer et réafficher les montants',{avant:text},[true,text,159600],[masked!==text,tidy(t.by('transfer-p1').textContent),t.E.compute().netN]);
 }
 {
  const s=household(E);load(s);menu('help');
  check('Version jointe à une demande d’aide',{versionEcran:h.q('meta[name="application-name"]').content},h.q('meta[name="application-name"]').content.match(/\d+\.\d+\.\d+/)[0],(by('v82-feedback-tech').textContent.match(/\d+\.\d+(?:\.\d+)?/)||[])[0],'VERSION');
  click('[data-v82-close="v82-help"]');
 }
 {
  const s=household(E);salaries(s,100000,100000,'personal','personal');s.settings.defaultN=100000;s.settings.defaultA=100000;s.lab.split='half';load(s);
  click('[data-tab="charges"]');click('#add-charge-top');set('#charge-name','Assurance en veille');set('#charge-amount','100,00','input');by('charge-enabled-default').checked=false;fire(by('charge-enabled-default'),'change');fire(by('charge-form'),'submit');
  const id=s.charges[0].id;menu('banking');if(by('lab-schedule').disabled)throw Error('La bascule avec charge inactive doit être accessible');click('#lab-schedule');closeBank();await E.labClockChange('2026-12-01');
  if(E.labModeAt(s.month)!=='separate')throw Error('Le parcours doit atteindre le mode sans joint');
  click('[data-tab="charges"]');const t=q('[data-toggle="'+id+'"]');t.checked=true;fire(t,'change');click('[data-tab="calcul"]');
  const r=E.compute(),b=q('[data-lab-settle]');if(b&&!b.disabled)click('[data-lab-settle]');
  check('Réactiver après migration une charge initialement désactivée',{mois:s.month,charge:r.total,comptePayeur:E.labPayer(id,'separate'),versementPropose:r.netN},false,!!s.lab.paid[s.month],'PAYEUR');
 }

}
