import {environment,household,salaries,charge,bonus,record,next} from './env.mjs';
import {idb} from './storage.mjs';
const simple=t=>t.replace(/[\u00a0\u202f]/g,' ');
export async function run(){
 let n=0;
 const test=(action,expected,actual)=>record('REPRISE904',++n,{action},expected,actual);
 const uid='essai904',hid='foyer904',identity=JSON.stringify({uid,hid,email:'app@example.invalid'});
 const disk=new Map([['equi-v8-verified',identity]]),h=environment({disk}),{E,click,set,by,fire}=h;
 const storageKey='equicomptes-v8-beta-local:'+uid+':'+hid;
 h.context.EQUI_V82_CONTEXT=()=>({uid,hid,ready:true,synced:true});h.context.indexedDB=idb();
 const load=s=>{E.reset(s);E.refresh()};
 const make=mode=>{const s=household(E,mode);salaries(s,100000,100000,'personal','personal');s.settings.bankN=s.settings.bankA='personal';s.lab.split='half';return s};
 const bank=()=>{click('#v82-open-menu');click('[data-v82-action="banking"]')};
 for(const mode of ['joint','separate'])for(const original of ['p1','p2']){
  const s=make(mode),m=s.month,ch=charge(s,'c',10000,'common',original),older=next(m,-1);
  ch.revisions=[{...ch,from:older,removed:true},{...ch,from:m,removed:false}];
  if(original==='p1')s.lab.payerChanges[mode].null=[{from:m,value:'p2'}];
  load(s);
  const before=mode==='separate'?simple(by('monthly-movements').textContent):simple(by('warning').textContent);
  E.openCharge('c');const fill=by('lab-charge-payer-'+mode).value;
  set('#lab-charge-payer-'+mode,original);fire(by('charge-form'),'submit');
  const locked=by('charge-dialog').open;if(locked)click('#cancel-dialog');
  test('Ancienne reprise ambiguë · '+mode+' / '+original,[true,'',false,original,true],[/payeur/i.test(before),fill,locked,E.labPayer('c',mode,m),s.lab.payerChanges[mode].c?.some(x=>x.from===m&&x.value===original)||false]);
 }
 for(const type of ['base','prime']){
  const s=make('joint');if(type==='base')salaries(s,100000,100000,'joint','joint');else bonus(s,'prime',30000,'p1');
  load(s);E.labFreezeMonth(s.month);E.persist();const before=JSON.stringify(E.compute());E.refresh();
  if(type==='base'){click('[data-base-done="p1"]');click('[data-base-done="p2"]')}else click('[data-bonus-id="prime"]');
  const current=JSON.stringify(E.compute()),blocked=E.labReasons().length,frozen=s.lab.frozen[s.month].result,previous=s.month;
  await E.labClockChange(next(previous)+'-01');
  test('Régulariser un mois figé en V9.0.3 · '+type,[true,0,next(previous),true],[before===current,blocked,s.lab.latestMonthSeen,JSON.stringify(frozen)===before]);
 }
 for(const op of ['annulation','activation']){
  const s=make('joint'),old=s.month,newMonth=next(old);charge(s,'gaz',10000,'p1','p1');
  load(s);bank();set('[data-future-payer="gaz"]','p2');click('#lab-schedule');
  test('Préparation du payeur depuis le menu · '+op,[newMonth,'joint','p1'],[s.lab.pending?.effective,E.labModeAt(old),E.labPayer('gaz','joint',old)]);
  if(op==='annulation')click('#lab-cancel');
  await E.labClockChange(newMonth+'-01');
  test('Effet du choix au mois suivant · '+op,op==='annulation'?['joint','',false]:['separate','p2',true],[E.labModeAt(newMonth),E.labPayer('gaz','separate',newMonth),s.lab.transitions.length>0]);
  if(by('lab-banking').open)click('[data-v82-close="lab-banking"]');
 }
 {
  const s=make('joint');load(s);s.lab.pending={from:s.month,effective:next(s.month),to:'separate'};
  const original=h.context.EQUI_V82_CONTEXT;h.context.EQUI_V82_CONTEXT=()=>null;
  await E.labClockChange('2026-12-01');
  test('Copie obligatoire indisponible',['2026-11','separate',0,0],[s.lab.latestMonthSeen,s.lab.pending?.to,s.lab.transitions.length,Object.keys(s.lab.frozen).length]);
  h.context.EQUI_V82_CONTEXT=original;await E.labClockChange('2026-12-01');await E.labClockChange('2026-12-01');
  const rec=await E.v82Read(storageKey);
  test('Reprise après échec de copie, puis double ouverture',[1,true],[s.lab.transitions.length,rec.copies.some(c=>c.reason==='before-migration'&&c.payload.lab.latestMonthSeen==='2026-11')]);
 }
 {
  const s=make('joint');s.monthlySalaries['2026-12']={n:'1000',a:'1000',bankN:'joint',bankA:'joint',moveN:0,moveA:0};
  load(s);await E.labClockChange('2027-01-01');
  test('Réouverture après deux mois · première étape',['2026-12','2026-12',false],[s.month,s.lab.latestMonthSeen,!!s.lab.frozen['2026-12']]);
  click('[data-base-done="p1"]');click('[data-base-done="p2"]');await E.labClockChange('2027-01-01');await E.labClockChange('2027-01-01');
  test('Reprise du mois intermédiaire · une archive par mois',['2027-01','2026-11,2026-12',2],[s.lab.latestMonthSeen,Object.keys(s.lab.frozen).sort().join(','),s.history.length]);
 }
 {
  const s=make('separate');for(let i=0;i<301;i++)charge(s,'c'+i,i===300?8900:101,'common','p1');
  load(s);E.persist();E.exportData();const contents=await h.io.blob.text();
  E.reset(make('joint'));E.importData({text:contents});const reopened=environment({disk});
  test('301 charges · export, restauration, redémarrage',[301,8900,301,8900],[E.get().charges.length,E.get().charges[300]?.amount,reopened.E.get().charges.length,reopened.E.get().charges[300]?.amount]);
 }
 {
  const s=make('joint');load(s);E.persist();const before=h.storage.getItem(storageKey);
  click('#add-charge-top');set('#charge-name','Test de capacité');set('#charge-amount','89,00','input');
  const original=h.storage.setItem;h.storage.setItem=()=>{throw Error('quota')};fire(by('charge-form'),'submit');h.storage.setItem=original;
  test('Stockage plein · enregistrement refusé intégralement',[true,0,true],[by('charge-dialog').open,s.charges.length,h.storage.getItem(storageKey)===before]);click('#cancel-dialog');
 }
 {
  const s=make('separate');salaries(s,0,0);charge(s,'facture',10000,'common','p1');
  load(s);click('#copy-result');test('50/50 à salaires nuls · copie avant paiement',[true,true],[h.io.clipboard.includes('Alex → Camille'),simple(h.io.clipboard).includes('50,00 €')]);
  click('[data-lab-settle]');click('#copy-result');test('50/50 à salaires nuls · copie après paiement',true,h.io.clipboard.includes('Aucun virement restant'));
 }
 {
  const s=make('joint');charge(s,'assurance',11000,'p1','p1');load(s);E.labFreezeMonth(s.month);s.charges=[];E.refresh();
  E.openCharge('assurance');test('Fiche archivée absente de la liste actuelle',['assurance','110,00',true],[by('charge-name').value,by('charge-amount').value,by('charge-amount').disabled]);click('#cancel-dialog');
 }
}