import vm from 'node:vm';
import fs from 'node:fs';
import {environment,household,salaries,charge,bonus,record,syncSource,dir,next} from './env.mjs';
const bootPick='window.accounts={init(api,u){sdk=api;auth={currentUser:u};user=u;db={};navigator.onLine=true},deletionContext,commitDeletion};';
async function setup(verified=true){
 const h=environment(),docs=new Map(),sent=[],u={uid:'essai',email:'membre@example.invalid',emailVerified:verified};
 const event=()=>new Promise(resolve=>setImmediate(resolve));
 const ref=(...p)=>p.slice(1).join('/');
 const snap=k=>({ref:k,id:k.split('/').at(-1),exists:()=>docs.has(k),data:()=>docs.get(k)});
 const sdk={doc:ref,collection:ref,serverTimestamp:()=>1,setDoc:async(k,v)=>docs.set(k,v),
  getDocFromServer:async k=>snap(k),getDocsFromServer:async pref=>{const keys=[...docs.keys()].filter(k=>k.startsWith(pref+'/')&&!k.slice(pref.length+1).includes('/'));return {size:keys.length,docs:keys.map(snap)}},
  writeBatch(){const ops=[];return {set:(k,v)=>ops.push(()=>docs.set(k,v)),update:(k,v)=>ops.push(()=>docs.set(k,{...docs.get(k),...v})),delete:k=>ops.push(()=>docs.delete(k)),commit:async()=>ops.forEach(f=>f())}},
  createUserWithEmailAndPassword:async()=>{sent.push('création');return {user:u}},
  signInWithEmailAndPassword:async()=>{sent.push('connexion')},sendEmailVerification:async()=>sent.push('vérification'),
  sendPasswordResetEmail:async()=>sent.push('réinitialisation'),signOut:async()=>sent.push('déconnexion')};
 await vm.runInContext('(async()=>{'+syncSource+'\n'+bootPick+'})()',h.context);
 h.context.accounts.init(sdk,u);return {...h,docs,u,sent,api:h.context.accounts,tick:event};
}
export async function run(){
 let k=0;const hid='a'.repeat(36),tok='b'.repeat(40);
 for(const mode of ['joint','separate'])for(const status of ['normal','nom trop court','courriel en attente','écriture bancaire interrompue']){
  const h=await setup(status!=='courriel en attente');const name=status==='nom trop court'?'A':'Foyer de simulation';
  if(status==='écriture bancaire interrompue'){
   // One failing final write. The successful batch still owns the household.
   const api=h.context.accounts;
   const base={doc:(_,...p)=>p.join('/'),serverTimestamp:()=>0,writeBatch:()=>{const staged=[];return {set:(p,v)=>staged.push([p,v]),commit:async()=>staged.forEach(([p,v])=>h.docs.set(p,v))}},setDoc:async()=>{throw Error('coupure simulée')}};
   api.init(base,h.u);
  }
  h.set('#v8-house-name',name);h.set('#v9-create-mode',mode);h.fire(h.by('v8-create-form'),'submit');await h.tick();
  const created=h.storage.getItem('equicomptes-v8-beta-foyer-id');
  const valid=['normal','écriture bancaire interrompue'].includes(status);
  record('COMPTE',++k,{action:'création de foyer',mode,cas:status},[valid,status==='normal'?mode:null,status==='écriture bancaire interrompue'?mode:null],[!!created,h.docs.get('foyers/'+created+'/settings/v9-banking')?.lab?.initial??null,h.storage.getItem('equi-v9-pending-mode:'+created)]);
 }
 for(const c of ['lien','code seul','expiration','déjà utilisée','format vide']){
  const h=await setup();
  h.docs.set('foyers/'+hid+'/invites/'+tok,{status:c==='déjà utilisée'?'used':'open',email:h.u.email,expiresAt:{toMillis:()=>c==='expiration'?1:9999999999999}});
  const input=c==='format vide'?'':c==='lien'?'https://simulation.invalid/?join='+hid+'.'+tok:hid+'.'+tok;
  h.set('#v8-invite-code',input);h.fire(h.by('v8-join-form'),'submit');await h.tick();
  const allowed=['lien','code seul'].includes(c);
  record('COMPTE',++k,{action:'rejoindre le foyer de démonstration',cas:c},[allowed,allowed],[h.docs.has('profils/essai'),!!h.io.navigation]);
 }
 for(const action of ['inscription','connexion','mot de passe oublié','déconnexion']){
  const h=await setup(false);
  h.set('#v8-email',h.u.email);h.set('#v8-password','EXEMPLE_FICTIF');
  if(action==='mot de passe oublié')h.click('#v8-forgot-password');else if(action==='déconnexion')h.click('#beta-signout');
  else{h.click(action==='inscription'?'#v8-mode-register':'#v8-mode-login');h.fire(h.by('v8-auth-form'),'submit')}
  await h.tick();record('COMPTE',++k,{action,execution:'service simulé'},({'inscription':['création','vérification'],'connexion':['connexion'],'mot de passe oublié':['réinitialisation'],'déconnexion':['déconnexion']})[action],h.sent);
 }
 for(const role of ['sans foyer','membre','responsable avec autre membre','dernier membre']){
  const h=await setup();const prefix='foyers/'+hid,other=role==='responsable avec autre membre'||role==='membre';
  if(role!=='sans foyer'){
   h.docs.set('profils/essai',{hid});h.docs.set(prefix,{ownerUid:role==='membre'?'autre':'essai'});
   h.docs.set(prefix+'/members/essai',{role:role==='membre'?'member':'owner'});
   h.docs.set(prefix+'/charges/loyer',{id:'loyer',amount:50000});if(other)h.docs.set(prefix+'/members/autre',{role:role==='membre'?'owner':'member'});
  }
  const ctx=await h.api.deletionContext(h.u);await h.api.commitDeletion(h.u,ctx);
  const kind={'sans foyer':'account-only','membre':'leave','responsable avec autre membre':'transfer','dernier membre':'last'}[role];
  record('COMPTE',++k,{action:'départ du foyer fictif',role},[kind,false,other,other?'owner':null],[ctx.kind,h.docs.has('profils/essai'),h.docs.has(prefix+'/charges/loyer'),h.docs.get(prefix+'/members/autre')?.role??null]);
 }
 // Round trip of payer changes through the actual charge dialog, plus debtor changes and settled locks.
 const h=environment(),E=h.E;
 for(const mode of ['joint','separate'])for(const effect of ['current','next'])for(const confirmed of [false,true]){
  const s=household(E,mode);salaries(s,210000,165000,'personal','personal');charge(s,'facture',50000,'common','p1');
  if(confirmed){if(mode==='joint')s.monthlySalaries[s.month].moveN=22000;else s.lab.paid[s.month]=22000}
  E.reset(s);E.refresh();h.click('[data-tab="charges"]');h.click('[data-edit="facture"]');h.set('#lab-charge-effective',effect==='next'?next(s.month):s.month);h.set('#lab-charge-payer-'+mode,'p2');h.fire(h.by('charge-form'),'submit');
  const allowed=!confirmed||effect==='next';const now=allowed&&effect==='current'?'p2':'p1',later=allowed?'p2':'p1';
  record('FICHE',++k,{mode,effet:effect,moisValide:confirmed},[now,later],[E.labPayer('facture',mode,s.month),E.labPayer('facture',mode,next(s.month))]);
  if(h.by('charge-dialog').open)h.click('#cancel-dialog');
 }
 // Known reference values for two salaries used by this household, plus equivalent ties and 1-cent charges.
 for(const n of [0,1,2,210000,100000000])for(const a of [1,2,165000,100000000])for(const total of [1,10001,90000]){
  const s=household(E,'separate');s.lab.split='prorata';salaries(s,n,a);charge(s,'charge',total,'common','p1');
  const x=BigInt(total)*BigInt(n),d=BigInt(n+a),q=x/d,r=x%d,part=Number(q+(2n*r>=d?1n:0n));E.reset(s);
  const actual=E.compute();record('CENT',++k,{salaires:[n,a],charge:total},[part,total-part,total-part],[actual.cn,actual.ca,actual.netN]);
 }
}
