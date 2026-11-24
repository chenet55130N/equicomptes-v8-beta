import fs from 'node:fs';
import vm from 'node:vm';
import {parseHTML,NodeFilter,Event,HTMLSelectElement,HTMLInputElement,HTMLFormElement,HTMLElement} from './dom.mjs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
export const dir=process.env.EQUICOMPTES_SOURCE||path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
export const source=fs.readFileSync(path.join(dir,'index.html'),'utf8');
export const syncSource=fs.readFileSync(path.join(dir,'sync-v8.js'),'utf8');
const themeSource=fs.readFileSync(path.join(dir,'themes-v9.js'),'utf8');
Object.defineProperty(HTMLSelectElement.prototype,'value',{get(){return (this.querySelector('option[selected]')||this.options[0])?.value??''},set(v){for(const opt of this.options){if(opt.value===String(v))opt.setAttribute('selected','');else opt.removeAttribute('selected')}}});
Object.defineProperty(HTMLInputElement.prototype,'checked',{get(){return this.hasAttribute('checked')},set(v){if(v)this.setAttribute('checked','');else this.removeAttribute('checked')}});
HTMLElement.prototype.reset=function(){for(const e of this.querySelectorAll('input')){if(e.type!=='checkbox')e.value=''}};
HTMLElement.prototype.scrollIntoView=function(){};
HTMLElement.prototype.focus=function(){};
const exportsList='seed,validate,adaptOldBackup,compute,chargeAt,labMonthCharges,bonusParts,movementState,debtState,effectiveCharge,normalizeSchedule,ocrParseSchedule,labSetSplit,labSetPayer,labReasons,labModeAt,labPayer,labSplitAt,labClockChange,labIsClosed,labUnconfigured,labRemainder,labSchedule,labRenderBanking,labFreezeMonth,v82Due,switchMonth,renderIncome,renderCharges,renderResults,renderHistory,renderDebts,saveMonth,applyTheme,copyResult,exportData,importData,v82Read,v82Change,v82Snapshot,v82RenderBackups,openCharge,closeCharge,settleDebts,undoSettlement';
const marker='applyPeopleLabels();applyTheme();renderCharges();renderIncome();\n})();';
export const mainScripts=[...source.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].map(m=>m[1]).filter(Boolean);
export function environment({disk=new Map(),extraScripts=false,now='2026-11-22T12:00:00Z'}={}){
 const {document}=parseHTML(source);
 for(const dialog of document.querySelectorAll('dialog')){
  Object.defineProperty(dialog,'open',{get:()=>dialog.hasAttribute('open')});
  dialog.showModal=()=>dialog.setAttribute('open','');
  dialog.close=()=>{dialog.removeAttribute('open');dialog.dispatchEvent(new Event('close'))};
 }
 // Keep document shape/handlers from the release. Model only host services.
 const io={clipboard:'',nextAnswer:true,blob:null,filename:null,dialogs:[]}, storage={getItem:k=>disk.get(k)??null,setItem:(k,v)=>disk.set(k,String(v)),removeItem:k=>disk.delete(k),key:i=>[...disk.keys()][i],get length(){return disk.size}};
 const id='equicomptes-v8-beta-local:invité';
 let timer=1;
 const instant=Date.parse(now);class TestDate extends Date{constructor(...args){super(...(args.length?args:[instant]))}static now(){return instant}}
 const loc={replace(url){io.navigation=url},href:'https://simulation.invalid/',protocol:'file:',pathname:'/'};
 const context={Date:TestDate,document,navigator:{onLine:false,clipboard:{writeText:async t=>{io.clipboard=t}},userAgent:'simulation'},NodeFilter,Event,console,localStorage:storage,crypto:globalThis.crypto,location:loc,
 Blob,URL:class extends URL{static createObjectURL(b){io.blob=b;return 'blob:simulation'}static revokeObjectURL(){}},FileReader:class{readAsText(f){this.result=f.text;this.onload()}},
 MutationObserver:class{observe(){}disconnect(){}},setTimeout:()=>timer++,setInterval:()=>timer++,clearTimeout(){},clearInterval(){},
 isSecureContext:true,scrollTo(){},addEventListener(){},alert(){},confirm(s){io.dialogs.push(s);return io.nextAnswer},prompt:(_s,d)=>d};
 context.window=context;vm.createContext(context);
 let main=mainScripts.find(s=>s.includes('const KEY=window.EQUI_V82_DEMO'));
 if(!main.includes(marker))throw Error('Point d’observation introuvable');
 const hook='window.probe={'+exportsList+',get:()=>state,reset:x=>{state=x},persist,refresh:betaRefresh};\n';
 main=main.replace(marker,hook+marker);
 vm.runInContext(mainScripts[0],context);
 vm.runInContext(themeSource,context);
 vm.runInContext(main,context,{filename:'index.inline.js'});
 if(extraScripts){vm.runInContext(mainScripts[mainScripts.length-1],context,{filename:'masquage.inline.js'})}
 const E=context.probe;
 const q=s=>document.querySelector(s), by=id=>document.getElementById(id);
 const click=s=>{const el=q(s);if(!el)throw Error('Contrôle absent '+s);if(!el.disabled)el.click();return el};
 const fire=(el,type)=>el.dispatchEvent(new Event(type,{bubbles:true,cancelable:true}));
 const set=(sel,v,type='change')=>{const e=q(sel);if(!e)throw Error('Champ absent '+sel);e.value=v;fire(e,type);return e};
 return {E,by,q,click,fire,set,context,disk,storage,id,io,document};
}
export function household(E,mode='joint',month='2026-11'){
 const s=E.seed();s.month=month;s.lab.latestMonthSeen=month;s.lab.clock=month+'-15';s.lab.initial=mode;
 s.monthlySalaries={};s.salaryN=s.salaryA='0,00';s.bankN=s.bankA=mode==='joint'?'joint':'personal';
 s.settings.bankN=s.bankN;s.settings.bankA=s.bankA;
 s.settings.nameN='Camille';s.settings.nameA='Alex';
 s.monthlySalaries[month]={n:s.salaryN,a:s.salaryA,bankN:s.bankN,bankA:s.bankA,moveN:0,moveA:0};
 return s;
}
export const euro=c=>(c/100).toFixed(2).replace('.',',');
export function salaries(s,n,a,bn=s.bankN,ba=s.bankA){
 s.salaryN=euro(n);s.salaryA=euro(a);s.bankN=bn;s.bankA=ba;
 Object.assign(s.monthlySalaries[s.month],{n:s.salaryN,a:s.salaryA,bankN:bn,bankA:ba});
}
export function charge(s,id,amount,owner='common',payer='joint',schedule,enabled=true){
 const ch={id,name:id,owner,amount,enabled,schedule:schedule??{type:'monthly',months:[],anchor:1,start:'',end:'',overrides:{}}};
 s.charges.push(ch);
 if(mode(s)==='separate'){if(payer)s.lab.payers[id]=payer}
 else s.lab.jointPayers[id]=payer;
 return ch;
}
const mode=s=>s.lab.initial;
export function bonus(s,id,amount,owner,enabled=true,paid={}){const v={id,name:id,amount,owner,month:s.month,enabled,paid};s.additionalIncome.push(v);return v}
export function next(m,d=1){const [y,mo]=m.split('-').map(Number);return new Date(Date.UTC(y,mo-1+d,1)).toISOString().slice(0,7)}
export function rng(seed){let x=seed>>>0;return n=>{x=(Math.imul(x,1664525)+1013904223)>>>0;return Math.floor(x/4294967296*n)}}
export const rows=[];
export function record(group,key,input,expected,actual,issue=''){
 const ok=JSON.stringify(expected)===JSON.stringify(actual);
 rows.push({id:group+'-'+String(key).padStart(4,'0'),group,ok,issue:ok?'':issue,input,expected,actual});
 if(!ok&&!issue)console.log('Écart à qualifier',group,key,JSON.stringify(expected).slice(0,180),JSON.stringify(actual).slice(0,240));
}
