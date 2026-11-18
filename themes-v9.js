/* ÉquiComptes V9.0 — 16 univers fidèles à l'atelier visuel de référence.
   Cette couche ne modifie ni calculs, ni persistance, ni Firebase. */
(function(){
"use strict";
const rows=[["vault","Capital Émeraude","Émeraude · laiton · prestige","Finance","heritage","€","#edf3ea","#fffef8","#e5eee2","#274035","#60796b","#d3e0ce","#227e65","#c3a462","#fff","#143c31","#3a6750","#b5eea466",20,"Georgia,serif","0 10px 30px #27483717","#208d69"],["market","Marchés de Minuit","Graphiques · néons · nuit","Finance","night","↗","#091422","#132338","#182d43","#f0f8ff","#a5bdd1","#2b4356","#4de6bf","#c4a5ff","#062d2b","#071827","#163d4f","#4de6bf48",14,"system-ui,sans-serif","0 13px 35px #02081080","#4de6bf"],["heritage","Héritage & Or","Ivoire · bordeaux · or","Finance","heritage","◆","#f7f0e4","#fffaf2","#f4eadc","#493b38","#82716a","#e5d5c5","#8b4c46","#b39a56","#fffdf6","#402d34","#774653","#ffd9a94d",12,"Georgia,serif","0 8px 25px #583e2d18","#627c59"],["sapphire","Saphir Privé","Bleu profond · argent · verre","Finance","minimal","◇","#edf3fb","#fff","#e8f0fa","#193755","#617d99","#cddbec","#2c70b2","#7cb4d8","#fff","#102c54","#256ba1","#90d3ff55",17,"system-ui,sans-serif","0 9px 26px #204d8518","#218e80"],["quant","Fintech Quantique","Ardoise · menthe électrique","Finance","futurist","⌁","#0d1724","#18293c","#1d3347","#f4fbff","#a4b9cb","#30485e","#45e1ce","#f8ad6c","#093d37","#0b1c2d","#24485e","#4be1d355",11,"system-ui,sans-serif","0 11px 28px #030a17b0","#42d5b8"],["royal","Équilibre Royal","Indigo · équilibre · dorure","Équité","heritage","⚖","#eef0fa","#fdfdff","#e5e9f8","#292c55","#70749e","#d4d8ea","#51428b","#c89e65","#fff","#231d55","#4d4b8a","#f2dbba44",16,"Georgia,serif","0 9px 27px #34397622","#4e957d"],["equalia","Équité Douce","Lavande · pêche · confiance","Équité","soft","=","#f8f4fc","#fffefd","#f2ebfa","#51436d","#8c7e9a","#e4d9ef","#8a63ac","#e8a17f","#fff","#7463a7","#c099b2","#ffe1dc66",29,"Georgia,serif","0 9px 25px #67438a13","#6b9d80"],["prism","Prisme Commun","Turquoise · corail · énergie","Équité","bold","◈","#f0f9fb","#fff","#e6f5f5","#163d46","#547c83","#cce5e7","#078d99","#f18b73","#fff","#085a6c","#df746c","#f4c6ae8a",13,"system-ui,sans-serif","4px 5px 0 #116d7b15","#078f7b"],["harmony","Harmonie","Sauge · rose poudré","Équité","soft","∞","#f3f5f0","#fffefa","#eaf0e7","#41574c","#7e9084","#dce5d9","#648d7d","#d9a996","#fff","#56796e","#8fa998","#fbdfcc66",29,"Georgia,serif","0 12px 28px #54695712","#608a6d"],["forest","Forêt Boréale","Sapin · mousse · lumière","Nature","nature","♣","#eef2e7","#fffef5","#e7efdd","#304a37","#6b846b","#d7e1ce","#3a8357","#c3aa67","#fff","#173b2e","#4d7650","#d1ff8b66",31,"Georgia,serif","0 12px 32px #3a64421a","#427e4f"],["garden","Jardin Botanique","Lin · olive · floraison","Nature","nature","❧","#f4f0e6","#fffdf6","#eae9dc","#484d34","#83856b","#dedecb","#758b4a","#d7a275","#fff","#536742","#8d9b67","#ffedb355",21,"Georgia,serif","0 10px 25px #736e3e19","#6b9654"],["ocean-glass","Océan de Verre","Profondeur · lagon · fluidité","Nature","waves","≈","#eaf6f8","#faffff","#def1f5","#1d4a5c","#57818e","#c7e6ea","#158ca5","#7cd2ca","#fff","#063e5b","#078ea8","#89edfb77",25,"system-ui,sans-serif","0 11px 27px #0c77931a","#248d89"],["alps","Aube Alpine","Bleu glacier · rose du matin","Nature","minimal","△","#f2f6fb","#fff","#e8eef7","#36465d","#8190a4","#d8e2ee","#678fb0","#e6ab9b","#fff","#49667f","#ba93a7","#f8d4d699",20,"Georgia,serif","0 10px 26px #406a8515","#548f83"],["terra","Terre Sauvage","Argile · sable · minéral","Nature","warm","◌","#f5eee6","#fffaf3","#eee0d2","#553e31","#896c5d","#e4d0bd","#ab6952","#d4ae78","#fff","#543b30","#995b44","#ffdfb277",15,"Georgia,serif","0 10px 25px #83503b21","#728f5e"],["aurora","Aurore Magnétique","Boréal · violet · lumière","Créatifs","aurora","✧","#100f24","#201d3c","#2b2850","#f8f4ff","#beb7df","#45416b","#7debd3","#d09cff","#102e38","#1a1745","#493b79","#4fffbf80",21,"system-ui,sans-serif","0 18px 43px #050412a3","#7becc4"],["copper","Atelier Cuivre","Cacao · cuivre · matière","Créatifs","warm","◈","#f4e9df","#fff9f1","#eee0d4","#49372f","#866b5e","#e5d0c0","#b16c44","#d5ab71","#fff","#392a29","#85553a","#ffbc7366",11,"Georgia,serif","0 10px 30px #63362226","#638b6d"]];
const charts={heritage:"double-ring",night:"ring",minimal:"columns",futurist:"histogram",soft:"waves",bold:"tiles",nature:"leaves",waves:"waves",warm:"stitch",aurora:"ring"};
const iconsFor=t=>[t.mark,"◈","▤","◷","↗"];
window.EQUI16_THEMES=rows.map(r=>{
 const [id,name,subtitle,cat,look,mark,bg,card,card2,ink,muted,line,a,a2,aText,h1,h2,glow,radius,heading,shadow,good]=r;
 return {id,name,subtitle,cat,look,mark,badge:mark,equiNew:true,icons:iconsFor({mark}),chart:charts[look]||"ring",c:[h1,a,a2],meta:h1,
   bg,card,card2,ink,muted,line,a,a2,aText,h1,h2,glow,radius,heading,shadow,good};
});
const varkeys=[
 "--t-bg","--t-card","--t-card2","--t-ink","--t-muted","--t-line","--t-primary","--t-primary-text",
 "--t-h1","--t-h2","--t-headtext","--t-tabs","--t-highlight","--t-highlight-text",
 "--t-input","--t-border","--t-n","--t-a","--t-radius","--t-shadow","--t-heading","--t-font",
 "--equi-glow","--equi-h1","--equi-h2","--equi-soft","--equi-accent2","--equi-strong","--equi-fine"];
window.EQUI16_applySkin=function(t){
 const el=document.documentElement,css=el.style;
 if(!t||!t.equiNew){
  varkeys.forEach(k=>css.removeProperty(k));
  delete el.dataset.equiLook;
  delete el.dataset.equiUniverse;
  return;
 }
 const vars={
  "--t-bg":t.bg,"--t-card":t.card,"--t-card2":t.card2,"--t-ink":t.ink,"--t-muted":t.muted,
  "--t-line":t.line,"--t-primary":t.a,"--t-primary-text":t.aText,
  "--t-h1":t.h1,"--t-h2":t.h2,"--t-headtext":"#fff","--t-tabs":"#edf8ff",
  "--t-highlight":"linear-gradient(128deg,color-mix(in srgb,"+t.a+", "+t.card+" 90%),"+t.card+")",
  "--t-highlight-text":t.ink,"--t-input":t.card,"--t-border":t.line,
  "--t-n":t.a,"--t-a":t.a2,"--t-radius":t.radius+"px","--t-shadow":t.shadow,
  "--t-heading":t.heading,"--t-font":"system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif",
  "--equi-glow":t.glow,"--equi-h1":t.h1,"--equi-h2":t.h2,"--equi-soft":t.card2,
  "--equi-accent2":t.a2,"--equi-strong":t.ink,"--equi-fine":t.line
 };
 Object.entries(vars).forEach(([k,v])=>css.setProperty(k,v));
 el.dataset.equiLook=t.look;
 el.dataset.equiUniverse=t.id;
};
})();