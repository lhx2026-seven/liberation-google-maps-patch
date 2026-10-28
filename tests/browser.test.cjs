const {test,before,after}=require('node:test');
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const {chromium}=require('playwright');
const origin='http://127.0.0.1:3100';
let server,browser;
before(async()=>{
 server=spawn(process.execPath,['server.js'],{cwd:require('node:path').join(__dirname,'..'),env:{...process.env,PORT:'3100'},stdio:'ignore'});
 let ready=false;for(let i=0;i<80;i++){try{if((await fetch(origin)).ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,100));}
 assert(ready,'local server must start');
 browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH||undefined,args:['--no-sandbox']});
});
after(async()=>{await browser?.close();server?.kill();});
const sdk=(callback,transitBehavior)=>`(()=>{
 window.mapCalls={options:null,routes:[],markers:[],lines:[]};
 class MockMap {constructor(element,options){mapCalls.options=options;}addListener(){}fitBounds(){}panTo(){}setZoom(){}getZoom(){return 16;}}
 class Marker {constructor(options){this.options=options;mapCalls.markers.push(this);}setMap(map){this.options.map=map;}addListener(){}}
 class Bounds {extend(){}isEmpty(){return false;}}
 class Place {constructor({id}){this.id=id;this.location={lat:25,lng:121};this.displayName=id;}async fetchFields(){}static async searchByText({textQuery}){return {places:[new Place({id:textQuery})]};}}
 window.google={maps:{Marker,LatLngBounds:Bounds,ControlPosition:{TOP_RIGHT:1},importLibrary:async name=>{
 if(name==='maps')return {Map:MockMap};
 if(name==='places')return {Place,AutocompleteSessionToken:class{},SearchNearbyRankPreference:{DISTANCE:'DISTANCE'},AutocompleteSuggestion:{fetchAutocompleteSuggestions:async({input})=>({suggestions:[{placePrediction:{placeId:input,text:{toString:()=>input},toPlace:()=>new Place({id:input})}}]})}};
 return {Route:{computeRoutes:async request=>{mapCalls.routes.push(request);if(request.travelMode==='TRANSIT'){const behavior=${JSON.stringify(transitBehavior)};if(behavior==='denied')throw Object.assign(Error('Permission denied'),{code:'PERMISSION_DENIED'});if(behavior==='empty'||((behavior==='fallback'||behavior==='zero')&&request.origin.id)){if(behavior==='zero')throw Object.assign(Error('No routes'),{code:'ZERO_RESULTS'});return {routes:[]};}}if(request.travelMode==='DRIVING'&&Object.hasOwn(request,'departureTime'))throw Error('Timestamp must be set to a future time.');return {routes:[{distanceMeters:2000,durationMillis:600000,warnings:[],createPolylines:options=>{const line={options:options.polylineOptions,map:null,setMap(map){this.map=map;},setOptions(options){Object.assign(this.options,options);}};mapCalls.lines.push(line);return [line];}}]};}}};
 }}};window[${JSON.stringify(callback)}]();})();`;
async function pageWith({key=true,trip,failFirst=false,transitBehavior}={}){
 const page=await browser.newPage({viewport:{width:390,height:780}});const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(({origin,key,trip})=>{if(location.origin!==origin)return;Object.defineProperty(navigator,'geolocation',{value:{getCurrentPosition(){}}});if(!sessionStorage.getItem('test-seeded')){if(key)localStorage.setItem('trip-maps-api-key','fake-test-key');if(trip)localStorage.setItem('roam-trip-v1',JSON.stringify(trip));sessionStorage.setItem('test-seeded','yes');}},{origin,key,trip});
 let requests=0;
 await page.route('**/maps.googleapis.com/maps/api/js?*',async route=>{
  requests++;if(failFirst&&requests===1){await route.abort('failed');return;}
  await route.fulfill({contentType:'text/javascript',body:sdk(new URL(route.request().url()).searchParams.get('callback'),transitBehavior)});
 });
 await page.goto(origin,{waitUntil:'domcontentloaded'});
 return {page,errors,requests:()=>requests};
}
const itinerary={name:'Regression trip',days:[{stops:[{name:'A',placeId:'A',mode:'walk',modeAuto:true},{name:'B',placeId:'B',mode:'walk',modeAuto:true}]},{stops:[]}]};
test('saved-key boot draws route, preserves gestures, estimates, colors and day controls',async()=>{
 const {page,errors}=await pageWith({trip:itinerary});
 await page.waitForFunction(()=>document.querySelector('.leg-estimate')?.textContent.includes('10 分鐘'));
 assert.equal(await page.locator('iframe').count(),0,'never silently substitute a limited embed');
 assert.equal(await page.locator('#map-recovery').isVisible(),false);
 const options=await page.evaluate(()=>mapCalls.options);
 assert.equal(options.gestureHandling,'greedy');assert.equal(options.scrollwheel,true);assert.equal(options.mapTypeId,'hybrid');
 assert.equal(await page.locator('[data-mode-index="0"]').inputValue(),'drive','2km must select driving');
 const driving=await page.evaluate(()=>mapCalls.routes.find(r=>r.travelMode==='DRIVING'));
 assert(driving,'driving request must execute');assert.equal(driving.routingPreference,'TRAFFIC_AWARE');assert.equal(Object.hasOwn(driving,'departureTime'),false,'Google must supply server-side now');
 assert(await page.evaluate(()=>mapCalls.lines.some(l=>l.map&&l.options.strokeColor==='#f57c00')),'route must actually be attached to map');
 await page.locator('.route-color summary').click();await page.locator('.color-palette button[aria-label="紫色"]').click();
 assert(await page.evaluate(()=>mapCalls.lines.some(l=>l.map&&l.options.strokeColor==='#9334e6')));
 await page.locator('#days button').nth(1).click();await page.locator('#carry-start').click();assert.equal(await page.locator('.stop input').inputValue(),'B');
 await page.locator('#move-day-before').click();assert.equal(await page.locator('#day-title').textContent(),'第 1 天');
 page.once('dialog',dialog=>dialog.accept());await page.locator('#clear-day').click();assert.equal(await page.locator('.stop').count(),0);
 assert.deepEqual(errors,[]);await page.close();
});
test('without a key explains disconnected state instead of showing Ctrl-only embed',async()=>{
 const {page,errors}=await pageWith({key:false});
 assert.equal(await page.locator('iframe').count(),0);assert.match(await page.locator('#map-recovery-message').textContent(),/尚未儲存 API/);
 await page.locator('#reconnect-map').click();await page.locator('#api-key').fill('fake-test-key');await page.locator('#key-form button[type=submit]').click();
 await page.waitForFunction(()=>Boolean(document.querySelector('#suggestions')));
 await page.locator('#place').fill('新地點');await page.locator('#suggestions button').click();assert.equal(await page.locator('.stop input').inputValue(),'新地點');
 assert.equal(await page.locator('#key-dialog').evaluate(e=>e.open),false);assert.deepEqual(errors,[]);await page.close();
});
test('failed SDK load can reconnect with saved key without re-entry',async()=>{
 const {page,errors,requests}=await pageWith({trip:itinerary,failFirst:true});
 await page.waitForFunction(()=>document.querySelector('#map-recovery-message').textContent.includes('載入失敗'));
 assert.equal(await page.locator('#key-dialog').evaluate(e=>e.open),false);
 await page.locator('#reconnect-map').click();await page.waitForFunction(()=>document.querySelector('.leg-estimate')?.textContent.includes('10 分鐘'));
 assert.equal(requests(),2);assert.equal(await page.evaluate(()=>localStorage.getItem('trip-maps-api-key')),'fake-test-key');
 assert.equal(await page.locator('#map-recovery').isVisible(),false);assert.deepEqual(errors,[]);await page.close();
});

const transitTrip={name:'Japan transit',days:[{stops:[{name:'松山空港',placeId:'MYJ',mode:'transit',modeAuto:false},{name:'松山城',placeId:'castle',mode:'walk',modeAuto:false}]}]};
for(const transitBehavior of ['fallback','zero'])test(`empty transit results retry once with coordinates and server time (${transitBehavior})`,async()=>{
 const {page,errors}=await pageWith({trip:transitTrip,transitBehavior});
 await page.waitForFunction(()=>document.querySelector('.leg-estimate')?.textContent.includes('現在出發'));
 const calls=await page.evaluate(()=>mapCalls.routes);assert.equal(calls.length,2);assert.equal(calls[0].origin.id,'MYJ');assert.equal(calls[1].origin.id,undefined);assert.equal(calls[1].origin.lat,25);assert.equal(Object.hasOwn(calls[1],'departureTime'),false);assert.equal(calls[1].travelMode,'TRANSIT');
 assert.equal(await page.locator('[data-mode-index="0"]').inputValue(),'transit');assert(await page.evaluate(()=>mapCalls.lines.some(l=>l.map)));assert.deepEqual(errors,[]);await page.close();
});
test('missing transit data offers an exact-place Maps link and labels incomplete totals',async()=>{
 const trip=structuredClone(transitTrip);trip.days[0].stops[1].mode='drive';trip.days[0].stops.push({name:'飯店',placeId:'hotel',mode:'walk',modeAuto:false});
 const {page,errors}=await pageWith({trip,transitBehavior:'empty'});
 await page.waitForFunction(()=>document.querySelector('#map-status').textContent.includes('缺 1 段交通時間'));
 const link=page.locator('.leg-estimate a');assert.equal(await link.count(),1);const url=new URL(await link.getAttribute('href'));assert.equal(url.searchParams.get('travelmode'),'transit');assert.equal(url.searchParams.get('origin_place_id'),'MYJ');assert.equal(url.searchParams.get('destination_place_id'),'castle');
 assert.match(await page.locator('#map-status').textContent(),/已取得路段/);assert.match(await page.locator('#map-status').textContent(),/無法估算完整行程/);assert.equal(await page.locator('[data-mode-index="0"]').inputValue(),'transit');assert.equal(await page.evaluate(()=>mapCalls.routes.filter(r=>r.travelMode==='TRANSIT').length),2);assert.deepEqual(errors,[]);await page.close();
});
test('transit permission errors never trigger fallback requests',async()=>{
 const {page,errors}=await pageWith({trip:transitTrip,transitBehavior:'denied'});
 await page.waitForFunction(()=>document.querySelector('#map-status').textContent.includes('PERMISSION_DENIED'));
 assert.equal(await page.evaluate(()=>mapCalls.routes.length),1);assert.equal(await page.locator('.leg-estimate a').count(),0);assert.deepEqual(errors,[]);await page.close();
});
