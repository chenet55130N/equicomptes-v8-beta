import {environment,household,salaries,charge,bonus,rng,next,record,euro} from './env.mjs';
export function runMath(){
 const {E}=environment();
 const target=['common','p1','p2'],benef=['p1','p2','split','common'];
 const splitRound=(amount,n,total)=>Number((2n*BigInt(amount)*BigInt(n)+BigInt(total))/(2n*BigInt(total)));
 for(const mode of ['joint','separate']){
  for(let i=0;i<2304;i++){
   const seed=220112+7919*i+(mode==='joint'?3:9),draw=rng(seed);
   const month='202'+(5+draw(4))+'-'+String(1+draw(12)).padStart(2,'0'),s=household(E,mode,month);
   const pattern=i%12;
   let n=1+draw(790000),a=1+draw(650000);
   if(pattern===0)n=0;if(pattern===1)a=0;if(pattern===2)a=n;if(pattern===3){n=210000;a=165000}if(pattern===4){n=1;a=1}
   const bn=mode==='joint'&&i%4<2?'joint':'personal',ba=mode==='joint'&&i%2===0?'joint':'personal';
   salaries(s,n,a,bn,ba);
   const half=mode==='separate'&&Math.floor(i/3)%2===0;s.lab.split=half?'half':'prorata';
   const sums={common:0,p1:0,p2:0},debits={joint:0,p1:0,p2:0},credits={common:0,p1:0,p2:0};
   let active=0,nbBonus=0;
   // Centimes entiers, y compris planchers, très petits montants et dépassements de salaire.
   const charges=[],incomes=[];
   const count=1+draw(9),amounts=[0,1,2,99,100,101,10001,1500000];
   for(let j=0;j<count;j++){
    const owner=target[draw(3)],payer=mode==='joint'?['joint','p1','p2'][draw(3)]:['p1','p2'][draw(2)];
    const amt=j===0&&i%5===0?amounts[draw(8)]:1+draw(180000);
    const enabled=draw(8)!==0;
    charge(s,'c'+j,amt,owner,payer,undefined,enabled);
    charges.push([owner,payer,amt,enabled?1:0]);
    if(enabled&&amt>0){sums[owner]+=amt;debits[payer]+=amt;active++}
   }
   const bonusCount=draw(5);
   for(let j=0;j<bonusCount;j++){
    const amt=1+draw(50000),who=benef[draw(4)],enabled=draw(6)!==0,other=draw(9)===0;
    const inc=bonus(s,'r'+j,amt,who,enabled);if(other)inc.month=next(month);
    incomes.push([who,amt,enabled?1:0,other?1:0]);
    if(!enabled||other)continue;nbBonus++;
    if(who==='split'){const low=Math.floor(amt/2);credits.p1+=amt-low;credits.p2+=low}
    else credits[who]+=amt;
   }
   const cn=sums.p1+splitRound(sums.common,half?1:n,half?2:n+a),ca=sums.p2+sums.common-(cn-sums.p1);
   const total=Object.values(debits).reduce((x,y)=>x+y,0);
   const cash1=n-cn+credits.p1,cash2=a-ca+credits.p2;
   // Reconstituer les soldes disponibles de chaque personne avant, puis après la régularisation.
   const balances=mode==='separate'?[n+credits.p1-debits.p1,a+credits.p2-debits.p2]:
    [(bn==='personal'?n:0)-debits.p1,(ba==='personal'?a:0)-debits.p2];
   const expected=[total,active,cn,ca,cash1-balances[0],cash2-balances[1],mode==='separate'?0:debits.joint+credits.common,cash1,cash2,credits.p1,credits.p2,credits.common,nbBonus];
   E.reset(s);const r=E.compute();
   record(mode==='joint'?'JOINT':'PERSO',i+1,{graine:seed,mois:month,salaires:[n,a],banques:[bn,ba],regle:half?'50/50':'prorata',charges,bonus:incomes},expected,[r.total,r.count,r.cn,r.ca,r.netN,r.netA,r.jointKeep,r.disposableN,r.disposableA,r.extra.p1,r.extra.p2,r.extra.common,r.extraCount]);
  }
 }
 let k=0;
 for(const type of ['monthly','ten','quarterly','annual','custom'])for(let m=1;m<=12;m++)for(let p=0;p<24;p++){
  const year=p%4===0?2028:2026,month=year+'-'+String(m).padStart(2,'0'),anchor=1+(p*5+m)%12;
  const start=p%6===0?next(month):p%6===1?month:next(month,-3);
  const end=p%6===2?next(month,-1):p%6===3?month:next(month,5);
  const outside=month<start||month>end;
  const ch={enabled:p%3!==0,amount:6000+17*p+m,owner:'common',schedule:{type,months:[1,2,3,4,5,6,7,8,9,10].map(x=>1+(x+p)%12),anchor,start,end,overrides:{}}};
  const ov=[null,{enabled:false},{amount:0},{enabled:true},{amount:10901+p},{amount:250,enabled:false}][Math.floor(p/2)%6];
  if(ov)ch.schedule.overrides[month]=ov;
  const dueMonths=type==='monthly'?Array.from({length:12},(_,i)=>i+1):type==='ten'?ch.schedule.months:type==='annual'?[anchor]:type==='quarterly'?[0,3,6,9].map(d=>(anchor-1+d)%12+1):[];
  const regular=ch.enabled&&dueMonths.includes(m)?ch.amount:0;
  let expected=regular;if(ov?.amount!==undefined)expected=ov.amount;else if(ov?.enabled)expected=ch.amount;if(outside||ov?.enabled===false)expected=0;
  const r=E.effectiveCharge(ch,month);
  record('CALEND',++k,{mois:month,type,ancre:anchor,debut:start,fin:end,actif:ch.enabled,moisActifs:ch.schedule.months,montant:ch.amount,exception:ov},[expected,expected>0,outside?0:regular],[r.amount,r.active,r.planned]);
 }
 for(let i=0;i<768;i++){
  const draw=rng(891+613*i),s=household(E),adv=[];
  let n=0,a=0,nFull=0,aFull=0,halfN=0,halfA=0,open=0;
  const length=i===0?0:1+draw(12);
  for(let j=0;j<length;j++){
   const payer=draw(2)?'p1':'p2',full=!!draw(2),settled=draw(5)===0,amount=i===608?9:i%8===0?1+draw(7):1+draw(140000);
   s.expenses.push({id:'x'+j,label:'Avance '+j,date:s.month+'-10',payer,repayment:full?'full':'half',settlementId:settled?'clos':'',amount});adv.push([payer,amount,full?100:50,!settled]);
   if(settled)continue;open++;
   if(payer==='p1'){n+=amount;if(full)nFull+=amount;else halfN+=amount}
   else {a+=amount;if(full)aFull+=amount;else halfA+=amount}
  }
  const doubled=(nFull-aFull)*2+halfN-halfA,expected=[open,n,a,Math.floor((Math.abs(doubled)+1)/2),doubled>0?'p2':doubled<0?'p1':null,doubled>0?'p1':doubled<0?'p2':null];
  E.reset(s);const r=E.debtState();
  record('AVANCE',i+1,{avances:adv},expected,[r.pending.length,r.n,r.a,r.amount,r.from,r.to]);
 }
 k=0;
 for(const mode of ['joint','separate'])for(const owner of benef)for(let p=0;p<8;p++)for(const amount of [1,2,9999,30000])for(const enabled of [true,false]){
  const s=household(E,mode);s.lab.split='half';salaries(s,210000,165000);charge(s,'loyer',90000,'common',mode==='joint'?'joint':'p1');
  const paid={p1:!!(p&1),p2:!!(p&2),common:!!(p&4)};bonus(s,'prime',amount,owner,enabled,paid);
  const b1=enabled?(owner==='p1'?amount:owner==='split'?amount-Math.floor(amount/2):0):0,b2=enabled?(owner==='p2'?amount:owner==='split'?Math.floor(amount/2):0):0,bc=enabled&&owner==='common'?amount:0;
  E.reset(s);const r=E.compute();let exp,act;
  if(mode==='joint'){
   s.monthlySalaries[s.month].moveN=159600;s.monthlySalaries[s.month].moveA=125400;
   const q=E.movementState(r);
   exp=[b1,b2,bc,159600,125400,paid.p1?0:b1,paid.p2?0:b2];act=[r.extra.p1,r.extra.p2,r.extra.common,q.base.p1,q.base.p2,q.remaining.p1,q.remaining.p2];
  }else{
   s.lab.paid[s.month]=45000;exp=[b1,b2,bc,45000,0];act=[r.extra.p1,r.extra.p2,r.extra.common,r.netN,E.labRemainder()];
  }
  record('BONUS',++k,{mode,owner,amount,enabled,paid},exp,act);
 }
 k=0;
 for(const mode of ['joint','separate'])for(const period of ['2025-12','2026-01','2026-11','2028-02'])for(const locked of ['libre','validé','archivé','antérieur'])for(const future of [false,true]){
  const s=household(E,mode,period),from=future?next(period):period;
  s.lab.split='prorata';charge(s,'crédit',50000,'common',mode==='joint'?'joint':'p1');
  if(locked==='validé'){if(mode==='joint')s.monthlySalaries[period].moveN=100;else s.lab.paid[period]=100}
  if(locked==='archivé')s.history.push({month:period,result:{},charges:[]});
  if(locked==='antérieur')s.lab.latestMonthSeen=next(period);
  const allowed=future||locked==='libre';
  E.reset(s);const e=E.labSetPayer('crédit',mode,from,'p2'),f=E.labSetSplit(from,'half'),prior=mode==='joint'?'joint':'p1';
  record('DATATION',++k,{mode,periode:period,verrou:locked,effet:from},[allowed,allowed,prior,allowed?'p2':prior,allowed?'half':'prorata'],[!e,!f,E.labPayer('crédit',mode,next(from,-1)),E.labPayer('crédit',mode,from),E.labSplitAt(from)]);
 }
 k=0;
 for(const y of [2026,2028])for(let m=1;m<=12;m++)for(const format of ['fr','iso','nom','deux lignes','ambigu','année différente','total']){
  const mm=String(m).padStart(2,'0'), amount=7801+13*m+(y-2026),word=['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'][m-1],fr='12/'+mm+'/'+y;
  const line=({fr:fr+' '+euro(amount)+' €',iso:y+'-'+mm+'-12 '+euro(amount)+' €',nom:word+' '+y+' '+euro(amount)+' €','deux lignes':fr+'\n'+euro(amount)+' €',ambigu:fr+' '+euro(amount)+' € 21,00 €','année différente':'12/'+mm+'/'+(y-1)+' '+euro(amount)+' €',total:'Total '+fr+' '+euro(amount)+' €'})[format];
  const v=E.ocrParseSchedule(line,y),ok=!['ambigu','année différente','total'].includes(format);
  record('LECTURE',++k,{annee:y,mois:m,format,texte:line},[ok?amount:null,format==='ambigu',ok?1:0],[v.rows[m-1].amount,v.rows[m-1].conflict,v.count]);
 }
 k=0;
 for(const year of [2023,2024,2026,2028])for(let m=1;m<=12;m++)for(const freq of ['7','15','month','off']){
  const last=new Date(Date.UTC(year,m,0,12)),date=last.toISOString(),expect=new Date(last);
  if(freq==='month'){const limit=new Date(Date.UTC(year,m+1,0)).getUTCDate();expect.setUTCDate(1);expect.setUTCMonth(m);expect.setUTCDate(Math.min(last.getUTCDate(),limit))}
  else if(freq!=='off')expect.setUTCDate(expect.getUTCDate()+Number(freq));
  const actual=E.v82Due({copies:[{at:date}],frequency:freq});
  record('COPIES',++k,{derniereCopie:date,frequence:freq},freq==='off'?null:expect.toISOString(),actual?.toISOString()??null);
 }
}
