'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),{spawnSync}=require('node:child_process'),{pathToFileURL}=require('node:url'),assert=require('node:assert/strict');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'equicomptes-essai-')),file=path.join(dir,'essai.html'),profile=path.join(dir,'profil');
const html=fs.readFileSync(path.resolve(__dirname,'../../ESSAI_LOCAL.html'),'utf8');
const executable=process.env.CHROME_BIN||'google-chrome';
try{
 for(const step of ['confirmation','relecture']){
  const script='<script>window.addEventListener("load",()=>{try{'+
   'const get=id=>document.getElementById(id),txt=id=>get(id).textContent.replace(/[\\u00a0\\u202f]/g," ");'+
   'if(!get("beta-gate").hidden)throw Error("Le foyer fictif ne s’ouvre pas");'+
   (step==='confirmation'?
    'if(txt("transfer-p1-name")!=="Alex → Camille"||!txt("transfer-p1").includes("250,00"))throw Error("Sens ou montant initial");'+
    'document.querySelector("[data-lab-settle]").click();':'')+
   'if(!txt("monthly-movements").includes("Aucun virement restant"))throw Error("La confirmation manque");'+
   'get("v82-open-menu").click();document.querySelector(\'[data-v82-action="help"]\').click();'+
   'if(!txt("v82-feedback-tech").includes("9.0.4"))throw Error("Version de retour incorrecte");'+
   'document.body.dataset.audit="reussi";}catch(e){document.body.dataset.audit="echec";document.body.dataset.raison=e.message;}});</script>';
  fs.writeFileSync(file,html.replace('</body>',()=>script+'</body>'));
  const result=spawnSync(executable,['--headless','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--disable-background-networking','--no-first-run','--user-data-dir='+profile,'--virtual-time-budget=2000','--dump-dom',pathToFileURL(file).href],{encoding:'utf8',timeout:45000,maxBuffer:8*1024*1024});
  if(result.error)throw result.error;
  assert.equal(result.status,0,'Démarrage de Chrome · '+result.stderr.slice(-500));
  const body=(result.stdout.match(/<body\b[^>]*>/)||[])[0]||'aucun contenu';
  assert.match(body,/data-audit="reussi"/,step+' · '+body);
  console.log('Chrome · '+step+' réussie');
 }
}finally{fs.rmSync(dir,{recursive:true,force:true})}
