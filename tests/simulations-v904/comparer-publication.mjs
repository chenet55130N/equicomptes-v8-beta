// Rejouer l’état publié de référence sans ouvrir un compte ni écrire dans Firebase.
import fs from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const baseUrl='https://chenet55130n.github.io/equicomptes-v8-beta/';
const assets=[
 [
  "firebase-config.json",
  "d1b98408618870bf11d263d1786bcc6f7c8cfcdc3e49e4d2fca9df505c8f83d6"
 ],
 [
  "icon-192.png",
  "b94654d068024f76e5e21d2889a775b42eead3da1236c148ec8f62733f1fb6f9"
 ],
 [
  "icon-512.png",
  "035d82400d14bf693604937cfef1ed9f6bcbc85fb31bfa5324eea7e42d910210"
 ],
 [
  "icon-v9-192.png",
  "b94654d068024f76e5e21d2889a775b42eead3da1236c148ec8f62733f1fb6f9"
 ],
 [
  "icon-v9-512.png",
  "035d82400d14bf693604937cfef1ed9f6bcbc85fb31bfa5324eea7e42d910210"
 ],
 [
  "index.html",
  "0f173f2de4915e0fa55bfcf71ac5e3c90f16f054a95ebb3d7b293f266fd7e794"
 ],
 [
  "manifest.webmanifest",
  "3f55b2fd0c27c7394c224a7f53d7c519f2d2b814a5207820ab5a5bd66de94737"
 ],
 [
  "service-worker.js",
  "d01f333a5f84b91b1e65782f6257c2e3e32057c14a34aa76d4c37ee2eb28c77f"
 ],
 [
  "sync-v8.js",
  "a045c349ebfae4eee5f8909be0446431de35435df3a5c1fd33a0291ba7db81b1"
 ],
 [
  "themes-v9.css",
  "a7ddce861ef7a1c9209b168b5270867e50ddbd9c874c840e9f6f78859c6ca0b0"
 ],
 [
  "themes-v9.js",
  "8e8d56feca1d1b11c531c96fe37b43d6200da411fdbec2c00600b50cd0120a73"
 ]
];
const expected={"MIG":1,"CLOT":2,"COPIE":2,"ARCH":3,"JOINTTXT":1,"ZERO":2,"PAYEUR":2,"SAUT":1,"LIM":6,"VERSION":1,"CONCUR":14,"PREBAK":2,"DATE":1,"FICHEARCH":4,"PROTEC":4,"REPRISE":4};
const root=await fs.mkdtemp(path.join(tmpdir(),'equicomptes-public-'));
try{
 await Promise.all(assets.map(async ([name,hash])=>{
  const response=await fetch(new URL(name==='index.html'?'':name,baseUrl),{cache:'no-store',signal:AbortSignal.timeout(30000)});
  if(!response.ok)throw Error(name+' · HTTP '+response.status);
  const bytes=Buffer.from(await response.arrayBuffer());
  assert.equal(createHash('sha256').update(bytes).digest('hex'),hash,'La publication a changé · '+name);
  await fs.writeFile(path.join(root,name),bytes);
 }));
 console.log('Fichiers publics téléchargés et vérifiés · '+assets.length+' · V9.0.3 a110fc0');
 const journal=path.join(root,'journal.json');
 const run=spawnSync(process.execPath,[fileURLToPath(new URL('./run.mjs',import.meta.url)),'--comparaison','--json',journal],
  {env:{...process.env,TZ:'UTC',EQUICOMPTES_SOURCE:root},encoding:'utf8',maxBuffer:8*1024*1024});
 if(run.error)throw run.error;
 let rows;
 try{rows=JSON.parse(await fs.readFile(journal,'utf8'))}catch{throw Error(run.stderr||run.stdout||'Journal de comparaison absent')}
 const failures=rows.filter(x=>!x.ok),counts={};
 for(const x of failures)counts[x.issue]=(counts[x.issue]||0)+1;
 assert.equal(rows.length,8200);assert.deepEqual(counts,expected);
 console.log('SITE PUBLIC · '+rows.length+' scénarios · '+(rows.length-failures.length)+' réussis · '+failures.length+' écarts · '+Object.keys(counts).length+' anomalies');
 console.log(JSON.stringify(counts));
}finally{await fs.rm(root,{recursive:true,force:true})}
