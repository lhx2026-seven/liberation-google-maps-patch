const {test,before,after}=require('node:test');
const assert=require('node:assert/strict');
const {spawn,execFileSync}=require('node:child_process');
const path=require('node:path');const fs=require('node:fs');
const {chromium}=require('playwright');
const root=path.join(__dirname,'..');
const origin='http://127.0.0.1:3101';const base='/liberation-google-maps-patch/';
let browser,server;
before(async()=>{
 execFileSync(process.execPath,['scripts/build.cjs'],{cwd:root});
 server=spawn(process.execPath,['server.js'],{cwd:root,env:{...process.env,PORT:'3101',SERVE_BUILD:'1',BASE_PATH:base},stdio:'ignore'});
 let ready=false;for(let i=0;i<80;i++){try{if((await fetch(origin+base)).ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,100));}assert(ready);
 browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH||undefined,args:['--no-sandbox']});
});
after(async()=>{await browser?.close();server?.kill();});
test('manifest, iOS icons and scoped worker are published at the repository subpath',async()=>{
 const context=await browser.newContext();const page=await context.newPage();
 await page.addInitScript(()=>{Object.defineProperty(navigator,'geolocation',{value:{getCurrentPosition(){}}});});
 await page.goto(origin+base,{waitUntil:'networkidle'});
 const manifest=await (await context.request.get(origin+base+'manifest.webmanifest')).json();assert.equal(manifest.display,'standalone');assert.equal(new URL(manifest.scope,origin+base).pathname,base);assert.equal(manifest.name,'解放的Google Maps');
 for(const icon of manifest.icons){const result=await context.request.get(new URL(icon.src,origin+base).href);assert(result.ok());assert.match(result.headers()['content-type'],/image\/png/);}
 const apple=await page.locator('link[rel="apple-touch-icon"]').getAttribute('href');assert((await context.request.get(new URL(apple,origin+base).href)).ok());
 await page.evaluate(()=>navigator.serviceWorker.ready);
 const scope=await page.evaluate(async()=>(await navigator.serviceWorker.ready).scope);assert.equal(scope,origin+base);
 await page.locator('#install-app').click();assert.equal(await page.locator('#install-dialog').evaluate(e=>e.open),true);assert.match(await page.locator('#install-dialog').textContent(),/Safari/);await page.locator('#close-install').click();
 assert.equal((await context.request.get(origin+'/manifest.webmanifest')).status(),404,'must not claim unrelated root scope');
 await context.close();
});
test('offline reload keeps saved itinerary and caches neither API calls nor secrets',async()=>{
 const context=await browser.newContext();const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{Object.defineProperty(navigator,'geolocation',{value:{getCurrentPosition(){}}});});
 await page.goto(origin+base,{waitUntil:'networkidle'});await page.evaluate(()=>navigator.serviceWorker.ready);
 await page.evaluate(()=>{localStorage.setItem('roam-trip-v1',JSON.stringify({name:'離線行程',days:[{stops:[{name:'飯店',mode:'walk',modeAuto:true}]}]}));});
 await page.reload({waitUntil:'networkidle'});
 await page.waitForFunction(()=>navigator.serviceWorker.controller!==null);
 await context.setOffline(true);
 // Network emulation and the browser's offline event are asynchronous.
 // isVisible() alone does not wait for the UI to react on faster CI runners.
 await page.waitForFunction(()=>navigator.onLine===false);
 await page.reload({waitUntil:'domcontentloaded'});
 await page.locator('#offline-notice').waitFor({state:'visible',timeout:5000});
 assert.equal(await page.locator('#trip-overview').textContent(),'離線行程');
 assert.equal(await page.locator('.stop input').inputValue(),'飯店');
 assert.equal(await page.locator('#offline-notice').isVisible(),true);
 const entries=await page.evaluate(async()=>{const urls=[];for(const key of await caches.keys()){for(const request of await (await caches.open(key)).keys())urls.push(request.url);}return urls;});
 assert(entries.length>=8);assert(entries.every(url=>url.startsWith(origin+base)),'cache must stay within this app scope');
 assert(entries.every(url=>!url.includes('key=')&&!url.includes('googleapis.com')));
 assert(entries.some(url=>/app\.js\?v=/.test(url)),'offline shell must cache the matching script fingerprint');assert.deepEqual(errors,[]);
 await context.setOffline(false);
 await page.locator('#offline-notice').waitFor({state:'hidden',timeout:5000});
 await context.close();
});
test('offline notice responds when the browser reports connectivity after page startup',async()=>{
 const context=await browser.newContext();const page=await context.newPage();
 await page.addInitScript(()=>{
  Object.defineProperty(navigator,'geolocation',{value:{getCurrentPosition(){}}});
  let connected=true;Object.defineProperty(navigator,'onLine',{get:()=>connected});
  window.testConnectivity=online=>{connected=online;dispatchEvent(new Event(online?'online':'offline'));};
 });
 await page.goto(origin+base,{waitUntil:'domcontentloaded'});
 assert.equal(await page.locator('#offline-notice').isVisible(),false);
 await page.evaluate(()=>setTimeout(()=>window.testConnectivity(false),100));
 await page.locator('#offline-notice').waitFor({state:'visible',timeout:5000});
 assert.equal(await page.locator('#offline-notice').isVisible(),true);
 await page.evaluate(()=>window.testConnectivity(true));
 await page.locator('#offline-notice').waitFor({state:'hidden',timeout:5000});
 await context.close();
});
test('build embeds matching asset versions and changes cache identity when source changes',()=>{
 const worker=fs.readFileSync(path.join(root,'_site/sw.js'),'utf8');assert(!worker.includes('__BUILD_ID__'));assert.match(worker,/PREFIX \+ '[a-f0-9]{16}'/);
 const html=fs.readFileSync(path.join(root,'_site/index.html'),'utf8');for(const asset of ['app.js','style.css','pwa.js']){const url=html.match(new RegExp('\\./'+asset.replaceAll('.','\\.')+'\\?v=[a-f0-9]{12}'))?.[0];assert(url);assert(worker.includes(url));}
 const work=fs.mkdtempSync(path.join(require('node:os').tmpdir(),'maps-pwa-build-'));
 try{
  fs.mkdirSync(path.join(work,'scripts'));for(const file of ['index.html','app.js','style.css','pwa.js','manifest.webmanifest','sw.js'])fs.copyFileSync(path.join(root,file),path.join(work,file));
  fs.cpSync(path.join(root,'icons'),path.join(work,'icons'),{recursive:true});fs.copyFileSync(path.join(root,'scripts/build.cjs'),path.join(work,'scripts/build.cjs'));
  fs.appendFileSync(path.join(work,'pwa.js'),'\n// update regression fixture\n');execFileSync(process.execPath,[path.join(work,'scripts/build.cjs')]);
  const next=fs.readFileSync(path.join(work,'_site/sw.js'),'utf8');assert.notEqual(next.match(/PREFIX \+ '([a-f0-9]+)'/)[1],worker.match(/PREFIX \+ '([a-f0-9]+)'/)[1]);
 }finally{fs.rmSync(work,{recursive:true,force:true});}
});
