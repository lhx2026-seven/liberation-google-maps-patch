const fs=require('node:fs');const path=require('node:path');const crypto=require('node:crypto');
const root=path.join(__dirname,'..');const target=path.join(root,'_site');
fs.rmSync(target,{recursive:true,force:true});fs.mkdirSync(target,{recursive:true});
const files=['index.html','app.js','style.css','pwa.js','manifest.webmanifest','sw.js'];
for(const file of files)fs.copyFileSync(path.join(root,file),path.join(target,file));
fs.cpSync(path.join(root,'icons'),path.join(target,'icons'),{recursive:true});
const fingerprint=name=>crypto.createHash('sha256').update(fs.readFileSync(path.join(target,name))).digest('hex').slice(0,12);
let html=fs.readFileSync(path.join(target,'index.html'),'utf8');
const versioned=['app.js','style.css','pwa.js'];
for(const file of versioned){const pattern=new RegExp('\\./'+file.replaceAll('.','\\.')+'(?:\\?v=[^"\\s]+)?','g');html=html.replace(pattern,'./'+file+'?v='+fingerprint(file));}
fs.writeFileSync(path.join(target,'index.html'),html);
const icons=['icons/icon-192.png','icons/icon-512.png','icons/icon-maskable-512.png','icons/apple-touch-icon.png'];
const revision=crypto.createHash('sha256');for(const file of [...files.filter(f=>f!=='sw.js'),...icons])revision.update(fs.readFileSync(path.join(target,file)));
const assets=['./','./index.html',...versioned.map(file=>'./'+file+'?v='+fingerprint(file)),'./manifest.webmanifest',...icons.map(file=>'./'+file)];
let worker=fs.readFileSync(path.join(target,'sw.js'),'utf8').replace('__BUILD_ID__',revision.digest('hex').slice(0,16)).replace(/^const ASSETS = .*;$/m,'const ASSETS = '+JSON.stringify(assets)+';');
fs.writeFileSync(path.join(target,'sw.js'),worker);console.log('Built PWA in _site');
