import {environment,household,salaries,charge,record,next,euro} from './env.mjs';
const names=['common','p1','p2'],m='2026-11';
export async function run(){
 const h=environment(),{E,click,set,fire,by,q}=h;
 const blank=(mode)=>{
  const s=household(E,mode,m);salaries(s,210000,165000,'personal','personal');
  Object.assign(s.settings,{defaultN:210000,defaultA:165000,bankN:'personal',bankA:'personal'});
  s.lab.split='half';return s;
 };
 const load=s=>{E.reset(s);E.refresh();click('[data-tab="charges"]')};
 const select=period=>{if(E.get().month!==period)set('#month',period)};
 const edit=id=>click('[data-edit="'+id+'"]');
 const effect=period=>{if(by('lab-charge-effective').value!==period)set('#lab-charge-effective',period)};
 const form=(mode,name,amount,owner,payer)=>{
  set('#charge-name',name);set('#charge-amount',euro(amount),'input');set('#charge-owner',owner);set('#lab-charge-payer-'+mode,payer)
 };
 const submit=()=>fire(by('charge-form'),'submit');
 const saved=()=>{if(by('charge-dialog').open)throw Error('La fiche est restée ouverte : '+by('charge-error').textContent)};
 const dismiss=()=>{if(by('charge-dialog').open)click('#cancel-dialog')};
 const capture=(s,id,period)=>{
  select(period);const r=E.compute();return [r.total,r.groups.common,r.groups.p1,r.groups.p2,E.labPayer(id,s.lab.initial,period)];
 };
 const wanted=(amount,owner,payer)=>[amount,...names.map(k=>k===owner?amount:0),payer];
 let k=0;
 // Exercise the full lifecycle with a real charge ID, a date-valued form control, and the actual event handlers.
 for(const mode of ['joint','separate'])for(const distance of [0,1,2,3,6,12,24,36])for(const owner of names)for(const payer of (mode==='joint'?['joint','p1','p2']:['p1','p2'])){
  const s=blank(mode),start=next(m,distance),change=next(start),end=next(start,2);
  const initial=5000+137*distance+43*names.indexOf(owner)+['joint','p1','p2'].indexOf(payer),revised=initial+401;
  const newOwner=names[(names.indexOf(owner)+1)%3],newPayer=payer==='p2'?'p1':'p2',entry=(k%2===0?'fiche depuis novembre':'fiche depuis le mois choisi');
  load(s);if(entry==='fiche depuis le mois choisi')select(start);
  click('#add-charge-top');effect(start);form(mode,'Assurance',initial,owner,payer);submit();saved();
  const id=s.charges[0].id;select(start);edit(id);effect(change);form(mode,'Assurance modifiée',revised,newOwner,newPayer);submit();saved();
  select(change);edit(id);effect(end);click('#delete-charge');saved();
  const prior=E.effectiveCharge(s.charges[0],next(start,-1)).amount;
  const first=capture(s,id,start),second=capture(s,id,change),after=capture(s,id,end)[0];
  const relu=E.validate(JSON.parse(JSON.stringify(s)));E.reset(relu);const firstAfterRead=capture(relu,id,start),secondAfterRead=capture(relu,id,change),final=E.effectiveCharge(relu.charges[0],next(end)).amount;
  record('CHARGES903',++k,{mode,depuis:entry,moisCreation:start,moisRevision:change,moisSuppression:end,proprietaire:owner,payeur:payer,nouveauProprietaire:newOwner,nouveauPayeur:newPayer,montants:[initial,revised]},
   [0,wanted(initial,owner,payer),wanted(revised,newOwner,newPayer),0,wanted(initial,owner,payer),wanted(revised,newOwner,newPayer),0,1],
   [prior,first,second,after,firstAfterRead,secondAfterRead,final,relu.charges.length]);
 }
 const special=(input,expect,actual,issue='')=>record('LIMITES903',++k,input,expect,actual,issue);
 for(const mode of ['joint','separate'])for(const action of ['nouveau tarif','suppression']){
  const s=blank(mode);charge(s,'Assurance',10000,'p1','p1');load(s);edit('Assurance');effect('2026-12');
  if(action==='suppression')click('#delete-charge');else{form(mode,'Assurance révisée',12500,'p1','p1');submit()}saved();
  await E.labClockChange('2026-12-01');
  if(!s.lab.frozen[m])throw Error('Le modèle doit produire une archive officielle');
  select(m);click('[data-tab="charges"]');const liste=h.q('[data-amount="Assurance"]').value;edit('Assurance');
  const actual=[liste,by('charge-name').value,by('charge-amount').value,by('charge-amount').disabled];
  special({action:'Consulter la fiche du mois archivé',mode,suite:action,archive:m,periodeSuivante:'2026-12'},['100,00','Assurance','100,00',true],actual,'FICHEARCH');dismiss();
 }
 for(const mode of ['joint','separate'])for(const lock of ['virement confirmé','mois archivé'])for(const end of ['2026-12','2027-02']){
  const s=blank(mode);s.settings.bankN=mode==='joint'?'joint':'personal';if(mode==='separate')charge(s,'Base',20000,'common','p1');load(s);
  select('2027-02');click('[data-tab="calcul"]');
  click(mode==='joint'?'[data-base-done="p1"]':'[data-lab-settle]');
  if(lock==='mois archivé')click('#save-month');
  const before=E.compute().netN;select('2026-12');click('[data-tab="charges"]');click('#add-charge-top');
  form(mode,'Facture de décembre',6000,'common','p1');set('#schedule-end',end);submit();
  const refused=by('charge-dialog').open,msg=refused?by('charge-error').textContent:'';dismiss();select('2027-02');
  special({action:'Ajouter une charge à durée finie avant une période validée',mode,validation:lock,debut:'2026-12',fin:end,moisValide:'2027-02',message:msg},[end==='2027-02',before],[refused,E.compute().netN],'PROTEC');
 }
 for(const mode of ['joint','separate'])for(const payer of ['p1','p2']){
  const s=blank(mode);charge(s,'Abonnement',8000,'common',payer);load(s);
  edit('Abonnement');effect('2027-02');click('#delete-charge');saved();
  edit('Abonnement');effect('2027-03');const newPayer=payer==='p1'?'p2':'p1';
  form(mode,'Abonnement repris',10000,'common',newPayer);submit();saved();
  select('2027-03');const r=E.compute(),expectedP1Share=mode==='separate'?5000:5600;
  const expNet=(newPayer==='p1'?10000:0)-expectedP1Share;const actualPayer=E.labPayer('Abonnement',mode,'2027-03');
  special({action:'Réactiver une charge après sa suppression programmée',mode,ancienPayeur:payer,nouveauPayeur:newPayer,montant:10000},[10000,newPayer,expNet],[r.total,actualPayer,r.netN],'REPRISE');
 }
 // Verify exceptions, revision insertion order, and user choices at the form boundary.
 for(const mode of ['joint','separate'])for(const order of ['proche en premier','lointain en premier']){
  const s=blank(mode);charge(s,'Contrat',10000,'common','p1');load(s);
  const seq=order==='proche en premier'?[['2027-02',11000],['2027-05',13500]]:[['2027-05',13500],['2027-02',11000]];
  for(const [period,amount] of seq){edit('Contrat');effect(period);form(mode,'Contrat',amount,'common','p1');submit();saved()}
  edit('Contrat');effect('2027-02');form(mode,'Contrat',11500,'common','p1');submit();saved();
  select('2027-03');set('[data-amount="Contrat"]','132,75');select('2027-04');
  const amounts=['2026-12','2027-02','2027-03','2027-04','2027-05'].map(t=>E.effectiveCharge(s.charges[0],t).amount);
  select('2027-03');click('[data-reset-month="Contrat"]');
  special({action:'Insérer, remplacer et remettre à zéro des révisions datées',mode,ordre:order},[10000,11500,13275,11500,13500,11500],[...amounts,E.effectiveCharge(s.charges[0],'2027-03').amount]);
 }
 for(const mode of ['joint','separate'])for(const problem of ['montant invalide','nom vide','fin antérieure','payeur manquant','annulation volontaire']){
  if(mode==='joint'&&problem==='payeur manquant')continue;
  const s=blank(mode);load(s);select('2027-06');click('#add-charge-top');form(mode,'Test',8100,'common','p1');
  if(problem==='montant invalide')set('#charge-amount','81,001','input');
  if(problem==='nom vide')set('#charge-name','');
  if(problem==='fin antérieure')set('#schedule-end','2027-03');
  if(problem==='payeur manquant')set('#lab-charge-payer-separate','');
  if(problem==='annulation volontaire')click('#cancel-dialog');else submit();
  const error=by('charge-dialog').open&&!by('charge-error').hidden&&!!by('charge-error').textContent;
  special({action:'Saisie ou annulation dans la fiche',mode,cas:problem},[0,problem!=='annulation volontaire'],[s.charges.length,error]);dismiss();
 }
 for(const mode of ['joint','separate']){
  const s=blank(mode);charge(s,'Arrêt',10000,'common','p1');load(s);edit('Arrêt');effect('2027-04');h.io.nextAnswer=false;click('#delete-charge');
  const amount=E.effectiveCharge(s.charges[0],'2027-04').amount;h.io.nextAnswer=true;
  special({action:'Refuser une suppression datée',mode,date:'2027-04'},[10000,true],[amount,by('charge-dialog').open]);dismiss();
 }
 for(const mode of ['joint','separate'])for(const type of ['monthly','ten','quarterly','annual','custom']){
  const s=blank(mode);load(s);select('2026-12');click('#add-charge-top');form(mode,'Échéancier',8000,'common','p1');submit();saved();
  const id=s.charges[0].id;select('2027-03');edit(id);form(mode,'Nouvel échéancier',12500,'common','p1');set('#schedule-type',type);set('#schedule-end','2028-01');
  if(type==='quarterly'||type==='annual')set('#schedule-anchor',type==='quarterly'?'4':'6');
  set('[data-schedule-month="2027-09"]','123,45');set('[data-schedule-month="2027-10"]','0,00');submit();saved();
  const periods=Array.from({length:16},(_,j)=>next('2026-11',j));const expected=periods.map(t=>{
   if(t<'2026-12'||t>'2028-01')return 0;if(t<'2027-03')return 8000;
   if(t==='2027-09')return 12345;if(t==='2027-10')return 0;
   const mo=Number(t.slice(5)),active={monthly:true,ten:mo<=10,quarterly:[1,4,7,10].includes(mo),annual:mo===6,custom:false}[type];return active?12500:0;
  });
  const savedCopy=E.validate(JSON.parse(JSON.stringify(s))),values=periods.map(t=>E.effectiveCharge(savedCopy.charges[0],t).amount);
  record('ECHEANCE903',++k,{mode,frequence:type,premierMois:'2026-12',dateRevision:'2027-03',derniereEcheance:'2028-01',exceptions:{'2027-09':12345,'2027-10':0},periodes:periods},expected,values);
 }

}
