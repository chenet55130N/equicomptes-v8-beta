/**
 * ÉquiComptes V8.0 BÊTA — mode hors connexion + synchronisation par document.
 * Données de test : l'application V6.4 n'est jamais consultée ni modifiée.
 * Le serveur est la source commune ; les changements hors ligne sont conservés
 * dans un journal local et transmis au retour de la connexion.
 * Les modifications concurrentes d'un même document nécessitent un arbitrage.
 */
window.EQUI_SYNC_MODULE_LOADED = true;
const B = window.EquiBetaBridge;
const el = id => document.getElementById(id);
const CFGKEY = 'equicomptes-v8-beta-firebase-config';
const FOYERKEY = 'equicomptes-v8-beta-foyer-id';
const VERIFIED_KEY = 'equi-v8-verified';
const GROUPS = ['settings','months','charges','incomes','expenses','settlements','history'];
const fmt = x => JSON.stringify(x);
const gate = el('beta-gate');
const status = el('beta-sync-indicator');
const message = el('beta-gate-message');
const resolveButton = el('beta-resolve-conflicts');
let sdk = null, sdkPromise = null, app = null, auth = null, db = null;
let user = null, onlineReady = false, disconnected = !navigator.onLine;
let subscriptions = [], shadow = new Map(), observed = new Map();
let dirty = Object.create(null), conflicts = new Map(), inFlight = new Set();
let saveTimer = null, reconnectTimer = null, isConnecting = false;
let openingLocal = false, replacingRemote = false, lastServerContact = false;
let currentUserUID = '', currentEmail = '';
let startCloudToken = 0;
const PATH = ['foyers',localStorage.getItem(FOYERKEY) || ''];
let myHome=null, booting=false, lastBootUid='', autoSignedIn=false;

function showStatus(t, kind='neutral'){
 if(status){status.textContent = '● ' + t;status.dataset.syncState=kind;}
 if(resolveButton)resolveButton.hidden = !conflicts.size;
}
function note(t){if(message)message.textContent=t;}
function errorText(e){
 const code=String(e?.code||''), desc=String(e?.message||'Erreur inconnue');
 if(code.includes('permission-denied'))return 'Accès Firestore refusé : vérifie les UID et les règles publiées.';
 if(code.includes('wrong-password')||code.includes('invalid-credential')||code.includes('user-not-found'))return 'Adresse e-mail ou mot de passe incorrect.';
 if(code.includes('auth/user-token-expired')||code.includes('user-disabled'))return 'Session expirée : reconnecte-toi avec ton mot de passe.';
 if(code.includes('network')||!navigator.onLine)return 'Connexion Internet indisponible : les changements restent sur ce téléphone.';
 return desc.slice(0,210);
}
function configFromText(raw){
 let v={},s=String(raw||'').trim();try{v=JSON.parse(s)}catch{}
 if(!v.apiKey)for(const k of ['apiKey','authDomain','projectId','appId']){
  const m=s.match(new RegExp('["\\\']?'+k+'["\\\']?\\s*:\\s*["\\\']([^"\\\']+)["\\\']'));
  if(m)v[k]=m[1];
 }
 for(const k of ['apiKey','authDomain','projectId','appId'])if(typeof v[k]!=='string'||!v[k].trim())throw Error('Configuration Firebase : champ '+k+' manquant.');
 if(v.projectId.trim()==='equicomptes-beta-5c981')throw Error('Ce projet est celui de la V7.1. Crée un projet Firebase séparé pour la V8.');
 return Object.fromEntries(['apiKey','authDomain','projectId','appId'].map(k=>[k,v[k].trim()]));
}
function locked(){gate.hidden=false;onlineReady=false;}
function unlocked(){gate.hidden=true;}
function showOnly(section){
 gate.hidden=false;
 for(const id of ['beta-config-panel','v8-auth-panel','v8-verify-panel','v8-house-panel'])el(id).hidden=id!==section;
 el('beta-change-config').hidden=(section==='beta-config-panel');
 el('beta-signout').hidden=!user;
}
function showConfig(){showOnly('beta-config-panel');el('beta-config-text').value=localStorage.getItem(CFGKEY)||'';note('Renseigne le projet Firebase V8 distinct de la V7.1.');}
function showLogin(){showOnly('v8-auth-panel');note('Connecte-toi ou crée ton compte ÉquiComptes BÊTA.');}
function showVerify(){showOnly('v8-verify-panel');note('Vérifie ton adresse e-mail avant de créer ou rejoindre un foyer.');}
function showHouse(){showOnly('v8-house-panel');note('Crée ton foyer privé, ou colle le lien d’invitation reçu.');}
function documentKey(g,id){return g+'/'+id;}
function pathCollection(g){return sdk.collection(db,...PATH,g);}
function pathDoc(g,id){return sdk.doc(db,...PATH,g,id);}
function flatten(s){
 const m=new Map();
 m.set('settings/main',{settings:s.settings,incomeTemplates:s.incomeTemplates});
 for(const [id,v] of Object.entries(s.monthlySalaries||{}))m.set(documentKey('months',id),v);
 for(const [group,field,key] of [['charges','charges','id'],['incomes','additionalIncome','id'],['expenses','expenses','id'],['settlements','settlements','id'],['history','history','month']]){
  for(const v of s[field]||[])if(v&&v[key])m.set(documentKey(group,v[key]),v);
 }
 return m;
}
function scope(){return currentUserUID&&PATH[1]?`equicomptes-v8-beta-offline:${PATH[1]}:${currentUserUID}`:'';}
function verifiedDevice(){try{const v=JSON.parse(localStorage.getItem(VERIFIED_KEY)||'null');if(v&&v.uid&&v.email&&v.hid&&v.hid===PATH[1])return v;}catch{}return null;}
function rememberUser(u){
 currentUserUID=u.uid;currentEmail=u.email||'';
 localStorage.setItem(VERIFIED_KEY,fmt({uid:u.uid,email:currentEmail,hid:PATH[1],verifiedAt:Date.now()}));
}
function queueKey(){return scope()+'::queue';}
function baselineKey(){return scope()+'::baseline';}
function readDiskQueue(){
 dirty=Object.create(null);
 if(!scope())return;
 try{const v=JSON.parse(localStorage.getItem(queueKey())||'{}');if(v&&typeof v==='object'&&!Array.isArray(v))for(const [k,op] of Object.entries(v))if(k.includes('/')&&op&&op.rev)dirty[k]=op;}catch(e){console.warn('Journal local non lisible',e);}
 try{const v=JSON.parse(localStorage.getItem(baselineKey())||'{}');shadow=new Map(Object.entries(v));}catch{shadow=new Map();}
}
function saveDiskQueue(){if(!scope())return;try{localStorage.setItem(queueKey(),fmt(dirty));}catch(e){showStatus('Stockage local saturé — exporter une sauvegarde','error');}}
function saveBaseline(){if(!scope())return;try{localStorage.setItem(baselineKey(),fmt(Object.fromEntries(shadow)));}catch{}}
function backlog(){return Object.keys(dirty).length;}
function refreshStatus(){
 if(conflicts.size){showStatus(`⚠ ${conflicts.size} conflit(s) à examiner — ${backlog()} en attente`,'warning');return;}
 if(!navigator.onLine||disconnected){showStatus(`Hors ligne • ${backlog()} changement(s) en attente`,'offline');return;}
 if(!onlineReady){showStatus(`Mode local • ${backlog()} changement(s) en attente`,'offline');return;}
 if(backlog()){showStatus(`${backlog()} modification(s) à synchroniser…`,'pending');return;}
 showStatus(`Synchronisé : ${currentEmail||'foyer de test'}`,'synced');
}
function openOffline(reason){
 const v=verifiedDevice();
 if(!v){locked();return false;}
 currentUserUID=v.uid;currentEmail=v.email;
 if(!openingLocal){readDiskQueue();observed=flatten(B.state());openingLocal=true;}
 onlineReady=false;disconnected=true;
 unlocked();refreshStatus();
 if(reason)note(reason);
 return true;
}
function bumpDirty(){
 if(!currentUserUID){const v=verifiedDevice();if(!v)return;currentUserUID=v.uid;currentEmail=v.email;readDiskQueue();}
 const latest=flatten(B.state());
 const keys=new Set([...observed.keys(),...latest.keys()]);let changed=false;
 for(const key of keys){
  const before=observed.get(key),after=latest.get(key);
  if(fmt(before)===fmt(after))continue;
  const prev=dirty[key];
  // Baseline de l'élément lors de la première saisie non synchronisée.
  const base=prev?prev.base:(shadow.has(key)?shadow.get(key):null);
  dirty[key]={value:after===undefined?null:after,deleted:after===undefined,rev:(prev?.rev||0)+1,base,at:Date.now()};
  changed=true;
 }
 observed=latest;
 if(changed){saveDiskQueue();refreshStatus();if(onlineReady)scheduleSync();}
}
window.EQUI_BETA_SYNC_HOOK=bumpDirty;

async function loadLibraries(){
 if(!sdkPromise){
  sdkPromise=Promise.all([
   import('https://www.gstatic.com/firebasejs/13.2.0/firebase-app.js'),
   import('https://www.gstatic.com/firebasejs/13.2.0/firebase-auth.js'),
   import('https://www.gstatic.com/firebasejs/13.2.0/firebase-firestore.js')
  ]).then(([a,b,c])=>{
   sdk={...a,...b,...c};return sdk;
  }).catch(e=>{sdkPromise=null;throw Error('Bibliothèques Firebase inaccessibles : '+String(e?.message||e).slice(0,130));});
 }
 return sdkPromise;
}
function resetListeners(){for(const off of subscriptions)try{off()}catch{}subscriptions=[];startCloudToken++;onlineReady=false;}
function updateObserved(){observed=flatten(B.state());}
function remoteDocsToMap(remote){const result=new Map();for(const [g,items]of Object.entries(remote))for(const [id,v]of Object.entries(items))result.set(documentKey(g,id),v);return result;}
function refreshRemoteBaseline(remote){shadow=remoteDocsToMap(remote);saveBaseline();}
function flagConflict(key,remote){
 const op=dirty[key];if(!op)return false;
 // Le document distant a changé pendant l'absence de connexion.
 if(fmt(op.base)!==fmt(remote===undefined?null:remote)){
  conflicts.set(key,{remote:remote===undefined?null:remote});return true;
 }
 return false;
}
function applyCloudSnapshot(group,id,v,metadata){
 const key=documentKey(group,id),value=v===undefined?null:v;
 if(metadata?.hasPendingWrites)return;
 if(dirty[key]){
  // Le changement local a priorité tant que le conflit n'est pas résolu.
  if(!conflicts.has(key))flagConflict(key,value);
  refreshStatus();return;
 }
 const old=shadow.has(key)?shadow.get(key):null;
 if(fmt(old)===fmt(value))return;
 if(value===null)shadow.delete(key);else shadow.set(key,value);
 saveBaseline();B.patch(group,id,value);updateObserved();refreshStatus();
}
async function readRemoteAndMerge(u){
 if(!navigator.onLine)throw Error('Hors connexion');
 const token=++startCloudToken;const remote={};
 await Promise.all(GROUPS.map(async group=>{
  const data=await sdk.getDocsFromServer(pathCollection(group));
  remote[group]={};data.forEach(d=>{remote[group][d.id]=d.data()});
 }));
 if(token!==startCloudToken||!user||user.uid!==u.uid)return;
 const savedLocal=flatten(B.state());
 // On conserve les saisies hors ligne avant la réinitialisation de l'état à partir du serveur.
 B.replaceAll(remote);
 const freshRemote=remoteDocsToMap(remote);
 for(const [key,op] of Object.entries(dirty)){
  const pos=key.indexOf('/'),group=key.slice(0,pos),id=key.slice(pos+1);
  if(!GROUPS.includes(group)||!id)continue;
  const remoteValue=freshRemote.has(key)?freshRemote.get(key):null;
  if(fmt(remoteValue)===fmt(op.deleted?null:op.value)){delete dirty[key];saveDiskQueue();continue;}
  B.patch(group,id,op.deleted?null:op.value);
  flagConflict(key,remoteValue);
 }
 updateObserved();shadow=freshRemote;saveBaseline();
 for(const group of GROUPS){
  const off=sdk.onSnapshot(pathCollection(group),{includeMetadataChanges:true},snapshot=>{
   if(snapshot.metadata.fromCache){if(!navigator.onLine)disconnected=true;refreshStatus();}
   else {disconnected=false;lastServerContact=true;}
   for(const ch of snapshot.docChanges())applyCloudSnapshot(group,ch.doc.id,ch.type==='removed'?null:ch.doc.data(),ch.doc.metadata);
   refreshStatus();
  },err=>{onlineReady=false;disconnected=true;note(errorText(err));refreshStatus();});
  subscriptions.push(off);
 }
 onlineReady=true;disconnected=false;lastServerContact=true;
 rememberUser(u);unlocked();refreshStatus();scheduleSync();
}
async function startCloud(u){
 if(isConnecting)return;
 if(!PATH[1]){locked();showHouse();note('Crée ou rejoins un foyer pour commencer.');return;}
 isConnecting=true;user=u;currentUserUID=u.uid;currentEmail=u.email||'';
 resetListeners();readDiskQueue();
 const verified=verifiedDevice();
 if(verified&&verified.uid===u.uid)openOffline('Données locales accessibles en attendant le serveur.');
 else {locked();showHouse();}
 try{await readRemoteAndMerge(u)}
 catch(e){onlineReady=false;disconnected=true;
  if(verifiedDevice()?.uid===u.uid)openOffline('Serveur momentanément inaccessible. Tu peux saisir tes dépenses hors ligne.');
  else{locked();showHouse();note('Le foyer n’a pas pu être chargé : '+errorText(e));}
  refreshStatus();
 }
 finally{isConnecting=false;}
}
function scheduleSync(){if(!onlineReady||!navigator.onLine||!user)return;clearTimeout(saveTimer);saveTimer=setTimeout(syncPending,480);}
async function syncPending(){
 if(!onlineReady||!navigator.onLine||!user||!db)return;
 for(const [key,op]of Object.entries(dirty)){
  if(inFlight.has(key)||conflicts.has(key))continue;
  const p=key.indexOf('/'),group=key.slice(0,p),id=key.slice(p+1);
  if(!GROUPS.includes(group)||!id)continue;
  inFlight.add(key);
  const rev=op.rev;
  try{
   if(op.deleted)await sdk.deleteDoc(pathDoc(group,id));
   else await sdk.setDoc(pathDoc(group,id),op.value);
   // N'effacer le journal que si l'utilisateur n'a pas modifié l'entrée entre-temps.
   if(dirty[key]?.rev===rev){
    delete dirty[key];saveDiskQueue();
    if(op.deleted)shadow.delete(key);else shadow.set(key,op.value);
    saveBaseline();
   }
  }catch(e){disconnected=String(e?.code||'').includes('unavailable')||!navigator.onLine;note('Synchronisation suspendue : '+errorText(e));}
  finally{inFlight.delete(key);refreshStatus();if(dirty[key]&&dirty[key].rev!==rev)scheduleSync();}
 }
}
function reconnectSoon(){
 clearTimeout(reconnectTimer);reconnectTimer=setTimeout(async()=>{
  if(!navigator.onLine)return;
  disconnected=false;
  if(user&&auth&&db&&PATH[1]){if(!onlineReady)await startCloud(user);else scheduleSync();}
  else if(auth&&auth.currentUser){await bootUser(auth.currentUser);}
  else{const cfg=await loadConfig();if(cfg)await startFirebase(cfg);}
 },900);
}
function resolveConflicts(){
 if(!conflicts.size)return;
 for(const [key,c]of [...conflicts]){
  const op=dirty[key];if(!op){conflicts.delete(key);continue;}
  const [group,id]=key.split('/');
  // Présentation du conflit : texte simplifié, sans changer la décision OK / Annuler.
  const groupNames={settings:'Paramètres',months:'Salaires du mois',charges:'Charge',incomes:'Revenu complémentaire',expenses:'Achat partagé',settlements:'Remboursement',history:'Historique'};
  const item=op.value||c.remote||{};
  const rawName=item.label||item.name||((group==='months'||group==='history')?id:groupNames[group]||'Élément');
  const itemName=String(rawName).replace(/[\r\n\t]+/g,' ').trim().slice(0,85);
  const money=(v)=>{
   if(v===null)return 'Élément supprimé';
   return v && typeof v.amount==='number' && Number.isFinite(v.amount)
    ?new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR'}).format(v.amount/100)
    :null;
  };
  const localAmount=['charges','incomes','expenses'].includes(group)?money(op.deleted?null:op.value):null;
  const sharedAmount=['charges','incomes','expenses'].includes(group)?money(c.remote):null;
  const comparison=localAmount!==null && sharedAmount!==null
   ?`\nSur cet appareil : ${localAmount}\nDans le foyer partagé : ${sharedAmount}\n` : '';
  const yes=confirm(`DEUX MODIFICATIONS DIFFÉRENTES\n\n« ${itemName} » a été modifié sur deux appareils.${comparison}\nQuelle version veux-tu conserver ?\n\nOK : garder MA modification et l'envoyer au foyer.\n\nAnnuler : garder la VERSION PARTAGÉE et remplacer ma modification.\n\nSeul cet élément est concerné.`);
  if(yes){op.base=c.remote;saveDiskQueue();}
  else{
   delete dirty[key];saveDiskQueue();
   B.patch(group,id,c.remote);updateObserved();
   if(c.remote===null)shadow.delete(key);else shadow.set(key,c.remote);saveBaseline();
  }
  conflicts.delete(key);
 }
 refreshStatus();scheduleSync();
}
if(resolveButton)resolveButton.addEventListener('click',resolveConflicts);

function projectConfigFromText(raw){return configFromText(raw);}
async function loadConfig(){
 let cfg=null;
 try{const t=localStorage.getItem(CFGKEY);if(t)cfg=projectConfigFromText(t);}catch{}
 if(!cfg&&navigator.onLine){try{const r=await fetch('./firebase-config.json',{cache:'no-store'});if(r.ok)cfg=projectConfigFromText(await r.text());}catch{}}
 if(cfg)try{localStorage.setItem(CFGKEY,fmt(cfg));}catch{}
 return cfg;
}
function authError(e){
 const code=String(e?.code||'');
 if(code.includes('email-already-in-use'))return 'Cette adresse possède déjà un compte. Utilise « J’ai un compte ».';
 if(code.includes('weak-password'))return 'Choisis un mot de passe plus solide (6 caractères minimum).';
 if(code.includes('email-not-verified'))return 'Vérifie ton adresse e-mail.';
 if(code.includes('permission-denied'))return 'Accès refusé. Vérifie les règles Firestore V8 et l’adresse e-mail de l’invitation.';
 return errorText(e);
}
function randId(bytes=18){
 const a=new Uint8Array(bytes);crypto.getRandomValues(a);
 return [...a].map(x=>x.toString(16).padStart(2,'0')).join('');
}
function currentJoin(){
 const raw=new URL(location.href).searchParams.get('join');
 if(!raw)return '';
 const m=raw.match(/^([a-f0-9]{30,48})\.([a-f0-9]{32,64})$/);
 return m?m[0]:'';
}
function loadJoinLink(){const code=currentJoin();if(code){el('v8-invite-code').value=code;el('v8-mode-join').click();}}
function setHomeAndReload(u,hid){
 localStorage.setItem(FOYERKEY,hid);
 localStorage.setItem(VERIFIED_KEY,fmt({uid:u.uid,email:u.email||'',hid,verifiedAt:Date.now()}));
 note('Foyer lié à ton compte. Ouverture sécurisée…');
 const clean=new URL(location.href);clean.searchParams.delete('join');
 location.replace(clean.toString());
}
function memberPath(hid,uid){return sdk.doc(db,'foyers',hid,'members',uid)}
function userProfile(uid){return sdk.doc(db,'profils',uid)}
async function bootUser(u){
 if(!u||booting)return;
 booting=true;user=u;
 try{
  if(!navigator.onLine){if(openOffline('Sans Internet : données du dernier foyer consultables localement.'))return;showLogin();note('Une première connexion en ligne est nécessaire.');return;}
  await sdk.reload(u);
  if(u.emailVerified)await sdk.getIdToken(u,true);
  if(!u.emailVerified){showVerify();return;}
  const profile=await sdk.getDocFromServer(userProfile(u.uid));
  if(!profile.exists()){
   const prev=verifiedDevice();
   if(prev&&prev.uid===u.uid&&prev.hid===PATH[1]){openOffline('Profil indisponible, données locales encore accessibles.');return;}
   showHouse();loadJoinLink();return;
  }
  const hid=profile.data().hid;
  if(!/^[a-f0-9]{30,48}$/.test(hid)){showHouse();note('Identifiant du foyer invalide dans le profil.');return;}
  if(PATH[1]!==hid || verifiedDevice()?.uid!==u.uid){setHomeAndReload(u,hid);return;}
  myHome=hid;PATH[1]=hid;
  try{const home=await sdk.getDocFromServer(sdk.doc(db,'foyers',hid));
   if(home.exists()){const node=el('v8-home-label');if(node){node.textContent=home.data().name||'Foyer privé';node.hidden=false;}}
  }catch{}
  el('beta-signout').hidden=false;
  const member=await sdk.getDocFromServer(memberPath(hid,u.uid));
  const isOwner=member.exists()&&member.data().role==='owner';
  el('v8-invite-button').hidden=!isOwner;
  await startCloud(u);
 }catch(e){if(!openOffline('Serveur indisponible : '+authError(e))){showLogin();note(authError(e));}}
 finally{booting=false;}
}
async function startFirebase(cfg){
 if(!navigator.onLine){if(!openOffline('Hors ligne : tes données locales restent disponibles.'))showLogin();return;}
 try{
  await loadLibraries();
  if(!app)app=sdk.initializeApp(cfg,'equicomptes-v8-multifoyers');
  auth=sdk.getAuth(app);
  if(!db){try{db=sdk.initializeFirestore(app,{localCache:sdk.persistentLocalCache({tabManager:sdk.persistentMultipleTabManager()})});}
    catch(e){console.warn('Persistance Firebase indisponible',e);db=sdk.getFirestore(app);}}
  await sdk.setPersistence(auth,sdk.browserLocalPersistence);
  if(!window.EQUI_V8_AUTH_LISTENER){
   window.EQUI_V8_AUTH_LISTENER=true;
   sdk.onAuthStateChanged(auth, async u=>{
    if(u)await bootUser(u);
    else{user=null;onlineReady=false;resetListeners();el('beta-signout').hidden=true;
     if(navigator.onLine)showLogin();else openOffline('Connexion interrompue.');}
   },e=>{if(!openOffline(authError(e))){showLogin();note(authError(e));}});
  }
 }catch(e){if(!openOffline('Bibliothèques Firebase indisponibles : '+authError(e))){showConfig();note(authError(e));}}
}
el('beta-save-config').addEventListener('click',async()=>{
 const b=el('beta-save-config');b.disabled=true;
 try{const cfg=projectConfigFromText(el('beta-config-text').value);
  localStorage.setItem(CFGKEY,fmt(cfg));note('Configuration enregistrée.');await startFirebase(cfg);
 }catch(e){note('Configuration invalide : '+authError(e));}finally{b.disabled=false;}
});
el('beta-change-config').addEventListener('click',()=>{
 if(user){note('Déconnecte-toi avant de changer de projet Firebase.');return;}
 showConfig();
});
let registerMode=false;
function toggleRegister(enabled){registerMode=enabled;
 el('v8-mode-register').classList.toggle('active',enabled);el('v8-mode-login').classList.toggle('active',!enabled);
 el('v8-submit-auth').textContent=enabled?'Créer mon compte':'Se connecter';
 el('v8-password').autocomplete=enabled?'new-password':'current-password';
}
el('v8-mode-login').addEventListener('click',()=>toggleRegister(false));
el('v8-mode-register').addEventListener('click',()=>toggleRegister(true));
el('v8-forgot-password').addEventListener('click',async()=>{
 if(!auth){note('Configure Firebase avant de réinitialiser ton mot de passe.');return;}
 const email=el('v8-email').value.trim().toLowerCase();if(!email){note('Saisis d’abord ton adresse e-mail.');return;}
 try{await sdk.sendPasswordResetEmail(auth,email);note('Si ce compte existe, un courriel de réinitialisation a été envoyé.');}
 catch(e){note(authError(e));}
});
el('v8-auth-form').addEventListener('submit',async e=>{
 e.preventDefault();if(!auth){note('Configure Firebase V8 avant de te connecter.');return;}
 const email=el('v8-email').value.trim().toLowerCase();const password=el('v8-password').value;
 const b=el('v8-submit-auth');b.disabled=true;
 try{
  if(registerMode){const cred=await sdk.createUserWithEmailAndPassword(auth,email,password);
    await sdk.sendEmailVerification(cred.user);showVerify();note('Compte créé ! Vérifie le courriel reçu, puis reviens dans l’application.');}
  else{await sdk.signInWithEmailAndPassword(auth,email,password);note('Connexion réussie.');}
  el('v8-password').value='';
 }catch(err){note(authError(err));}finally{b.disabled=false;}
});
el('v8-check-verified').addEventListener('click',async()=>{
 if(!auth?.currentUser){showLogin();return;}
 try{await sdk.reload(auth.currentUser);if(auth.currentUser.emailVerified){await sdk.getIdToken(auth.currentUser,true);await bootUser(auth.currentUser);}
 else note('Adresse non encore confirmée. Ouvre le lien reçu par e-mail puis réessaie.');}
 catch(e){note(authError(e));}
});
el('v8-resend-verify').addEventListener('click',async()=>{try{await sdk.sendEmailVerification(auth.currentUser);note('E-mail de vérification renvoyé.');}catch(e){note(authError(e));}});
let joining=false;
function toggleJoin(on){joining=on;el('v8-mode-join').classList.toggle('active',on);el('v8-mode-create').classList.toggle('active',!on);el('v8-create-form').hidden=on;el('v8-join-form').hidden=!on;}
el('v8-mode-create').addEventListener('click',()=>toggleJoin(false));
el('v8-mode-join').addEventListener('click',()=>toggleJoin(true));
el('v8-create-form').addEventListener('submit',async e=>{
 e.preventDefault();const u=auth?.currentUser;if(!u?.emailVerified){showVerify();return;}
 const name=el('v8-house-name').value.trim();if(name.length<2||name.length>55){note('Nom du foyer : 2 à 55 caractères.');return;}
 const b=e.target.querySelector('button');b.disabled=true;
 try{
  const hid=randId(18);const batch=sdk.writeBatch(db);
  batch.set(sdk.doc(db,'foyers',hid),{name,ownerUid:u.uid,createdAt:sdk.serverTimestamp(),version:8});
  batch.set(memberPath(hid,u.uid),{role:'owner',joinedAt:sdk.serverTimestamp(),inviteId:'',email:u.email});
  batch.set(userProfile(u.uid),{hid,createdAt:sdk.serverTimestamp()});
  await batch.commit();setHomeAndReload(u,hid);
 }catch(err){note('Création impossible : '+authError(err));}finally{b.disabled=false;}
});
function parseInvitation(raw){
 let s=raw.trim();try{if(s.startsWith('https://'))s=new URL(s).searchParams.get('join')||'';}catch{}
 const m=s.match(/^([a-f0-9]{30,48})\.([a-f0-9]{32,64})$/);if(!m)throw Error('Invitation non reconnue. Copie le lien complet reçu.');
 return {hid:m[1],token:m[2]};
}
el('v8-join-form').addEventListener('submit',async e=>{
 e.preventDefault();const u=auth?.currentUser;if(!u?.emailVerified){showVerify();return;}
 const b=e.target.querySelector('button');b.disabled=true;
 try{
  const {hid,token}=parseInvitation(el('v8-invite-code').value);
  const invitePath=sdk.doc(db,'foyers',hid,'invites',token);
  const snapshot=await sdk.getDocFromServer(invitePath);
  if(!snapshot.exists())throw Error('Invitation introuvable ou non autorisée pour cette adresse.');
  const inv=snapshot.data();
  if(inv.email!==u.email.toLowerCase())throw Error('Cette invitation concerne une autre adresse e-mail.');
  if(inv.status!=='open'||inv.expiresAt.toMillis()<Date.now())throw Error('Invitation expirée ou déjà utilisée.');
  const batch=sdk.writeBatch(db);
  batch.update(invitePath,{status:'used',usedBy:u.uid,usedAt:sdk.serverTimestamp()});
  batch.set(memberPath(hid,u.uid),{role:'member',joinedAt:sdk.serverTimestamp(),inviteId:token,email:u.email});
  batch.set(userProfile(u.uid),{hid,createdAt:sdk.serverTimestamp()});
  await batch.commit();setHomeAndReload(u,hid);
 }catch(err){note('Impossible de rejoindre le foyer : '+authError(err));}finally{b.disabled=false;}
});
const dlg=el('v8-invite-dialog');
el('v8-invite-button').addEventListener('click',()=>{el('v8-invite-status').textContent='';el('v8-invite-result').hidden=true;dlg.showModal();});
el('v8-close-invite').addEventListener('click',()=>dlg.close());
el('v8-invite-form').addEventListener('submit',async e=>{
 e.preventDefault();const u=auth?.currentUser;if(!u||!myHome||!navigator.onLine)return;
 const email=el('v8-invite-email').value.trim().toLowerCase();const b=e.target.querySelector('button');b.disabled=true;
 try{
  if(email===u.email?.toLowerCase())throw Error('Utilise une adresse différente pour le second membre.');
  const token=randId(24);
  await sdk.setDoc(sdk.doc(db,'foyers',myHome,'invites',token),{
   email,createdBy:u.uid,createdAt:sdk.serverTimestamp(),expiresAt:sdk.Timestamp.fromDate(new Date(Date.now()+7*86400*1000)),status:'open'});
  const link=new URL(location.href);link.search='';link.hash='';link.searchParams.set('join',myHome+'.'+token);
  el('v8-invite-link').value=link.href;el('v8-invite-result').hidden=false;
  el('v8-invite-status').textContent='Invitation créée. Envoie ce lien à la personne invitée. Il est valable 7 jours.';
 }catch(err){el('v8-invite-status').textContent=authError(err);}finally{b.disabled=false;}
});
el('v8-copy-invite').addEventListener('click',async()=>{
 try{await navigator.clipboard.writeText(el('v8-invite-link').value);el('v8-invite-status').textContent='Lien copié, tu peux l’envoyer par message.';}
 catch{el('v8-invite-link').select();el('v8-invite-status').textContent='Sélectionne et copie le lien ci-dessus.';}
});
el('beta-signout').addEventListener('click',async()=>{
 if(backlog()&&!confirm(`${backlog()} modification(s) ne sont pas encore synchronisées. Exporte une sauvegarde de test avant de te déconnecter. Continuer ?`))return;
 resetListeners();clearTimeout(saveTimer);clearTimeout(reconnectTimer);
 try{if(auth)await sdk.signOut(auth)}catch{}
 localStorage.removeItem(VERIFIED_KEY);localStorage.removeItem(FOYERKEY);
 user=null;currentUserUID='';currentEmail='';dirty=Object.create(null);conflicts.clear();
 location.replace(location.pathname);
});
el('beta-account-button').addEventListener('click',()=>{
 if(user){if(confirm(`Compte Firebase : ${user.email}\n\nSe déconnecter de la V8 BÊTA ?`))el('beta-signout').click();}
 else if(!navigator.onLine)note('Une connexion Internet est nécessaire pour ouvrir un nouveau compte.');
 else showLogin();
});
window.addEventListener('offline',()=>{disconnected=true;onlineReady=false;resetListeners();openOffline('Hors connexion : tes modifications restent enregistrées localement.');refreshStatus();});
window.addEventListener('online',()=>{disconnected=false;showStatus('Connexion rétablie : reprise en cours…','pending');reconnectSoon();});
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&navigator.onLine&&!onlineReady)reconnectSoon();});
window.addEventListener('focus',()=>{if(navigator.onLine&&!onlineReady)reconnectSoon();});
// Première ouverture : les comptes doivent être créés/validés en ligne.
const prev=verifiedDevice();
if(prev){currentUserUID=prev.uid;currentEmail=prev.email;readDiskQueue();openingLocal=true;observed=flatten(B.state());unlocked();refreshStatus();}
else locked();
const cfg=await loadConfig();
if(cfg){if(navigator.onLine)await startFirebase(cfg);else if(prev)openOffline('Mode hors ligne : accès au dernier foyer validé.');else showConfig();}
else if(prev)openOffline('Fichier de configuration momentanément inaccessible.');
else showConfig();
