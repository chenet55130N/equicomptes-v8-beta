import {createHash} from 'node:crypto';
import {readFile,mkdtemp,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
const hash='0f4d0c736eac11c98c1d7b7a041a0c36c8d5aa706dfeae64d84747d8b333f3d3';
const remote='https://raw.githubusercontent.com/WebReflection/linkedom/6e2ae0ca56adc00f9e6e7d35971f22d676a454ff/worker.js';
let data;
if(process.env.EQUICOMPTES_DOM)data=await readFile(process.env.EQUICOMPTES_DOM);
else{
 const response=await fetch(remote);
 if(!response.ok)throw Error('Téléchargement de LinkeDOM impossible · HTTP '+response.status);
 data=Buffer.from(await response.arrayBuffer());
}
if(createHash('sha256').update(data).digest('hex')!==hash)throw Error('Version de LinkeDOM inattendue.');
const temp=await mkdtemp(join(tmpdir(),'equicomptes-dom-')),file=join(temp,'worker.mjs');
await writeFile(file,data);
const dom=await import(pathToFileURL(file));
export const {parseHTML,NodeFilter,Event,HTMLSelectElement,HTMLInputElement,HTMLFormElement,HTMLElement}=dom;