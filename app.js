const KEY='roam-trip-v1';
const routeColors={red:{label:'紅',hex:'#d93025'},yellow:{label:'黃',hex:'#fbbc04'},blue:{label:'藍',hex:'#1a73e8'},green:{label:'綠',hex:'#188038'},orange:{label:'橘',hex:'#f57c00'},purple:{label:'紫',hex:'#9334e6'}};
function routeColor(stop){return Object.hasOwn(routeColors,stop.color)?stop.color:'orange';}
const defaults={name:'我的行程',days:[{stops:[]}]};
let trip;try{trip=JSON.parse(localStorage.getItem(KEY));if(!trip||typeof trip.name!=='string'||!Array.isArray(trip.days)||!trip.days.length||!trip.days.every(d=>Array.isArray(d.stops)&&d.stops.every(s=>typeof s.name==='string'&&['walk','transit','drive','bike'].includes(s.mode))))trip=null;}catch{}trip=trip||structuredClone(defaults);
// Legacy versions saved default walking without recording whether it was automatic.
for(const day of trip.days)for(const stop of day.stops){if(stop.modeAuto===undefined&&stop.mode==='walk')stop.modeAuto=true;}
let selectedMapPlace=null,mapSelectionVersion=0;
let current=0;const $=id=>document.getElementById(id);const modes={walk:'步行',transit:'大眾運輸',drive:'開車',bike:'自行車'};let timer;
function toast(message){$('toast').textContent=message;$('toast').style.display='block';clearTimeout(timer);timer=setTimeout(()=>$('toast').style.display='none',3500);}
function save(){try{localStorage.setItem(KEY,JSON.stringify(trip));$('save-status').textContent='已儲存';}catch{$('save-status').textContent='尚未儲存';toast('裝置無法儲存，請匯出行程以保留變更');}}
function button(label,title,fn){const b=document.createElement('button');b.type='button';b.textContent=label;b.title=title;b.setAttribute('aria-label',title);b.onclick=fn;return b;}
function samePlace(a,b){return Boolean(a&&b&&(a.placeId&&b.placeId?a.placeId===b.placeId:a.name===b.name));}
function render(){
 $('trip-name').value=trip.name;$('trip-count').textContent=`${trip.days.length} 天 · ${trip.days.reduce((n,d)=>n+d.stops.length,0)} 個停靠點`;
 $('days').replaceChildren();trip.days.forEach((d,i)=>{const b=button(`第 ${i+1} 天`,`第 ${i+1} 天`,()=>{current=i;render();});b.className=i===current?'active':'';b.setAttribute('role','tab');b.setAttribute('aria-selected',i===current);$('days').append(b);});
 $('day-title').textContent=`第 ${current+1} 天`;$('delete-day').hidden=trip.days.length===1;$('clear-day').disabled=trip.days[current].stops.length===0;$('move-day-before').disabled=current===0;$('move-day-after').disabled=current===trip.days.length-1;
 const stops=trip.days[current].stops;$('stops').replaceChildren();const previousEnd=current>0?trip.days[current-1].stops.at(-1):null;$('carry-start').hidden=current===0;$('carry-start').disabled=!previousEnd||samePlace(stops[0],previousEnd);$('carry-start').title=!previousEnd?'前一天沒有停靠點':samePlace(stops[0],previousEnd)?'起點已是前一天終點':previousEnd.name;
 stops.forEach((stop,i)=>{const row=document.createElement('div');row.className='stop';const marker=document.createElement('div');marker.className='stop-marker';marker.textContent=i+1;const main=document.createElement('div');main.className='stop-main';const card=document.createElement('div');card.className='stop-card';const text=document.createElement('div');text.style.cssText='flex:1;min-width:0';const input=document.createElement('input');input.value=stop.name;input.maxLength=160;input.setAttribute('aria-label',`停靠點 ${i+1}`);input.ondblclick=()=>showPlace(stop.name);input.onchange=()=>{if(input.value.trim()){stop.name=input.value.trim();delete stop.placeId;save();render();}else input.value=stop.name;};text.append(input);const tools=document.createElement('div');tools.className='stop-tools';tools.append(button('⌖','在地圖顯示',()=>showPlace(stop.name)));if(i>0)tools.append(button('↑','向上移動',()=>{[stops[i-1],stops[i]]=[stops[i],stops[i-1]];save();render();}));if(i<stops.length-1)tools.append(button('↓','向下移動',()=>{[stops[i+1],stops[i]]=[stops[i],stops[i+1]];save();render();}));tools.append(button('×','移除停靠點',()=>{stops.splice(i,1);save();render();}));card.append(text,tools);main.append(card);if(i<stops.length-1){const leg=document.createElement('div');leg.className='leg';const icon=document.createElement('span');icon.textContent='↳';const select=document.createElement('select');select.setAttribute('aria-label',`從 ${stop.name} 出發的交通方式`);select.dataset.modeIndex=i;Object.entries(modes).forEach(([value,label])=>{const option=document.createElement('option');option.value=value;option.textContent=label;option.selected=stop.mode===value;select.append(option);});select.onchange=()=>{stop.mode=select.value;stop.modeAuto=false;save();render();};const navigate=button('路線 ↗','在 Google Maps 開啟此路段',()=>openLeg(i));const estimate=document.createElement('span');estimate.className='leg-estimate';estimate.dataset.leg=i;estimate.textContent='預估時間：待查詢';const colorSelect=document.createElement('details');colorSelect.className='route-color';const swatch=document.createElement('summary');swatch.setAttribute('aria-label',`路段 ${i+1} 顏色`);swatch.title='路線顏色';swatch.style.backgroundColor=routeColors[routeColor(stop)].hex;const palette=document.createElement('div');palette.className='color-palette';palette.setAttribute('role','group');palette.setAttribute('aria-label','路線顏色');Object.entries(routeColors).forEach(([value,color])=>{const choice=button('',color.label+'色',()=>{stop.color=value;swatch.style.backgroundColor=color.hex;palette.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b===choice)));colorSelect.open=false;save();mapController?.setLegColor(i,value);swatch.focus();});choice.style.backgroundColor=color.hex;choice.setAttribute('aria-pressed',String(value===routeColor(stop)));palette.append(choice);});colorSelect.append(swatch,palette);leg.append(select,colorSelect,navigate,estimate);main.append(leg);}row.append(marker,main);$('stops').append(row);});
 if(!stops.length){const empty=document.createElement('p');empty.textContent='新增目的地';empty.style.cssText='color:#80868b;font-size:13px;padding:8px 0';$('stops').append(empty);}
 queueMapUpdate();

}
$('trip-name').onchange=()=>{trip.name=$('trip-name').value.trim()||'我的旅程';save();render();};
$('carry-start').onclick=()=>{
 const endpoint=current>0?trip.days[current-1].stops.at(-1):null;
 const stops=trip.days[current].stops;
 if(!endpoint||samePlace(stops[0],endpoint))return;
 stops.unshift({name:endpoint.name,...(endpoint.placeId?{placeId:endpoint.placeId}:{}),mode:'walk',modeAuto:true});
 save();render();$('stops').scrollIntoView({block:'nearest'});
};
$('add-day').onclick=()=>{trip.days.push({stops:[]});current=trip.days.length-1;save();render();$('place').focus();};
function resetDestinationInput(){
 mapSelectionVersion++;selectedMapPlace=null;$('place').value='';$('place').dispatchEvent(new Event('input'));
}
$('clear-day').onclick=()=>{
 if(!trip.days[current].stops.length||!confirm(`確定清空第 ${current+1} 天的所有停靠點？`))return;
 trip.days[current].stops=[];resetDestinationInput();save();render();
};
function moveCurrentDay(offset){
 const target=current+offset;if(target<0||target>=trip.days.length)return;
 [trip.days[current],trip.days[target]]=[trip.days[target],trip.days[current]];current=target;
 save();render();$('days').children[current]?.scrollIntoView({block:'nearest',inline:'nearest'});
}
$('move-day-before').onclick=()=>moveCurrentDay(-1);
$('move-day-after').onclick=()=>moveCurrentDay(1);
$('delete-day').onclick=()=>{if(trip.days.length>1&&confirm('確定刪除這一天及其所有停靠點？')){trip.days.splice(current,1);current=Math.min(current,trip.days.length-1);resetDestinationInput();save();render();}};
$('add-form').onsubmit=e=>{e.preventDefault();const name=$('place').value.trim();if(!name)return;mapSelectionVersion++;trip.days[current].stops.push({name,...(selectedMapPlace?.name===name?{placeId:selectedMapPlace.placeId}:{}),mode:'walk',modeAuto:true});selectedMapPlace=null;$('place').value='';save();render();$('place').focus();};
function showPlace(name){if(mapController){mapController.focus(name);return;}toast('地圖尚未連線，請按「重新連線」。');}
function openLeg(index){const stops=trip.days[current].stops;const start=stops[index],end=stops[index+1];const params=new URLSearchParams({api:'1',origin:start.name,destination:end.name,travelmode:{walk:'walking',drive:'driving',transit:'transit',bike:'bicycling'}[start.mode]});window.open('https://www.google.com/maps/dir/?'+params,'_blank','noopener,noreferrer');}
$('toggle-panel').onclick=()=>{const hidden=document.body.classList.toggle('panel-hidden');$('toggle-panel').textContent=hidden?'›':'‹';$('toggle-panel').setAttribute('aria-expanded',String(!hidden));$('toggle-panel').setAttribute('aria-label',hidden?'展開行程面板':'收合行程面板');};
$('export').onclick=()=>{const content=[trip.name,...trip.days.flatMap((d,i)=>['',`Day ${i+1}`,...d.stops.map((s,j)=>`${j+1}. ${s.name}${j<d.stops.length-1?' → '+modes[s.mode]:''}`)])].join('\n');const url=URL.createObjectURL(new Blob([content],{type:'text/plain;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='roam-trip.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('已匯出行程');};


let mapController=null, mapUpdateTimer,userLocation=null;
function locateUser(){
 if(!navigator.geolocation){toast('此瀏覽器不支援定位，可直接搜尋地點');return;}
 navigator.geolocation.getCurrentPosition(position=>{
  userLocation={lat:position.coords.latitude,lng:position.coords.longitude};
  if(mapController)mapController.setUserLocation(userLocation);

 },error=>{toast(error.code===1?'未允許定位，可直接搜尋地點':error.code===3?'定位逾時，可直接搜尋地點':'無法取得位置，可直接搜尋地點');},{enableHighAccuracy:true,timeout:12000,maximumAge:60000});
}
const API_KEY_STORAGE='trip-maps-api-key';
function mapStatus(text){$('map-status').textContent=text;}
function queueMapUpdate(){mapController?.cancelPending();clearTimeout(mapUpdateTimer);mapUpdateTimer=setTimeout(()=>{
 if(mapController)mapController.draw(trip.days[current].stops.map(s=>({...s})));

},250);}
let activeApiKey='',connectionPromise=null;
function connectionState(message){$('map-recovery-message').textContent=message;}
function readApiKey(){try{return localStorage.getItem(API_KEY_STORAGE)||'';}catch{return '';}}
function updateKeyStatus(){
 const configured=Boolean(activeApiKey||readApiKey());
 $('key-state').textContent=configured?'已設定金鑰，搜尋時不需重新輸入。輸入新金鑰才會替換。':'尚未設定金鑰。';
 $('api-key').required=!configured;
 $('api-key').placeholder=configured?'保留現有金鑰，或輸入新金鑰':'輸入 API 金鑰';
}
$('settings').onclick=()=>{updateKeyStatus();$('api-key').value='';$('key-dialog').showModal();};
$('cancel-key').onclick=()=>$('key-dialog').close();
$('remove-key').onclick=()=>{try{localStorage.removeItem(API_KEY_STORAGE);}catch{}activeApiKey='';location.reload();};
$('key-form').onsubmit=e=>{
 e.preventDefault();const key=$('api-key').value.trim()||activeApiKey||readApiKey();if(!key)return;
 const replacing=Boolean(activeApiKey&&activeApiKey!==key);
 try{localStorage.setItem(API_KEY_STORAGE,key);}catch{toast('此瀏覽器無法永久儲存金鑰；本次頁面仍可使用，請勿重新整理。');}
 $('api-key').value='';$('key-dialog').close();
 if(replacing){location.reload();return;}
 if(activeApiKey===key&&mapController)return;
 activeApiKey=key;connectGoogleMaps(key);
};
window.gm_authFailure=()=>{const message='Google 拒絕金鑰驗證，請檢查網站限制、API 權限或帳務。';mapStatus(message);connectionState(message);$('map-recovery').hidden=false;};
$('reconnect-map').onclick=()=>{const key=activeApiKey||readApiKey();if(!key){updateKeyStatus();$('key-dialog').showModal();return;}activeApiKey=key;connectGoogleMaps(key);};
function formatTravelTime(milliseconds){
 if(!Number.isFinite(milliseconds))return '時間未知';
 const minutes=Math.max(1,Math.ceil(milliseconds/60000));
 return minutes<60?`${minutes} 分鐘`:`${Math.floor(minutes/60)} 小時${minutes%60?` ${minutes%60} 分鐘`:''}`;
}
function apiError(error){
 const raw=[error?.code,error?.status,error?.message].filter(Boolean).join(' · ')||'未知錯誤';
 const safe=raw.replace(/AIza[\w-]+/g,'[已隱藏金鑰]').replace(/([?&]key=)[^&\s]+/gi,'$1[已隱藏金鑰]').slice(0,500);
 if(error?.code==='TRANSIT_NO_ROUTES')return 'Google API 在此出發時間沒有回傳大眾運輸路線，不代表地點錯誤。可點「路線 ↗」在 Google Maps 查詢；兩者的資料涵蓋可能不同。';
 if(/REQUEST_DENIED|PERMISSION_DENIED|not authorized|not enabled|ApiNotActivated|API_KEY|referer|referrer|403/i.test(safe))return 'API 權限被拒絕。請確認同一把金鑰允許 Maps JavaScript API、Places API (New)、Routes API，網站限制允許 https://lhx2026-seven.github.io/*。Google：'+safe;
 if(/BILLING|billing/i.test(safe))return '請確認 Google Cloud 帳務已啟用。Google：'+safe;
 if(/QUOTA|RESOURCE_EXHAUSTED|OVER_QUERY_LIMIT|429/i.test(safe))return 'API 配額或速率限制，請稍後重試或檢查 Google Cloud 配額。Google：'+safe;
 if(/ZERO_RESULTS|NOT_FOUND|無路線|找不到地點/i.test(safe))return '找不到符合的地點或交通路線，可從搜尋建議重新選點或更換交通方式。Google：'+safe;
 return safe;
}
function connectGoogleMaps(key){
 if(connectionPromise)return connectionPromise;
 if(mapController){queueMapUpdate();return Promise.resolve();}
 connectionPromise=initializeGoogleMaps(key).finally(()=>{connectionPromise=null;$('reconnect-map').disabled=false;});return connectionPromise;
}
async function initializeGoogleMaps(key){
 $('reconnect-map').disabled=true;connectionState('正在連線 Google Maps…');mapStatus('正在載入 Google Maps…');
 try{
 if(!globalThis.google?.maps?.importLibrary)await new Promise((resolve,reject)=>{
  const callback='initializeTripGoogleMaps';
  const script=document.createElement('script');
  const timeout=setTimeout(()=>{cleanup();script.remove();reject(Error('Google Maps 載入逾時，請檢查網路後重新連線'));},20000);
  function cleanup(){clearTimeout(timeout);window[callback]=()=>{};}
  window[callback]=()=>{cleanup();resolve();};
  script.async=true;script.src='https://maps.googleapis.com/maps/api/js?'+new URLSearchParams({key,v:'weekly',loading:'async',language:'zh-TW',callback});script.onerror=()=>{cleanup();script.remove();reject(Error('Google Maps 程式載入失敗，請檢查網路後重新連線'));};document.head.append(script);
 });
 const {Map}=await google.maps.importLibrary('maps');
 const {Place,AutocompleteSuggestion,AutocompleteSessionToken,SearchNearbyRankPreference}=await google.maps.importLibrary('places');
 let routeLibrary;
 async function getRouteLibrary(){
  if(!routeLibrary)routeLibrary=google.maps.importLibrary('routes').catch(error=>{routeLibrary=null;throw error;});
  return routeLibrary;
 }
 $('google-map').hidden=false;
 const map=new Map($('google-map'),{center:userLocation||{lat:23.7,lng:121},zoom:userLocation?16:7,gestureHandling:'greedy',scrollwheel:true,draggable:true,mapTypeId:'hybrid',mapTypeControl:true,mapTypeControlOptions:{position:google.maps.ControlPosition?.TOP_RIGHT},streetViewControl:true,fullscreenControl:false});
 $('google-map').hidden=false;$('map-recovery').hidden=true;
 let version=0,markers=[],lines=[],userMovedMap=false;const legLines=new globalThis.Map();
 map.addListener('dragstart',()=>{userMovedMap=true;});
 const locations=new globalThis.Map(),routeCache=new globalThis.Map(),walkingRouteCache=new globalThis.Map();
 async function locate(stop){
  const id=stop.placeId||stop.name;if(locations.has(id))return locations.get(id);
  let place;
  if(stop.placeId){place=new Place({id:stop.placeId});await place.fetchFields({fields:['location','displayName']});}
  else {const result=await Place.searchByText({textQuery:stop.name,fields:['id','location','displayName'],language:'zh-TW'});place=result.places?.[0];}
  if(!place?.location)throw Error('找不到地點：'+stop.name);
  const result={location:place.location,id:place.id};locations.set(id,result);locations.set(stop.name,result);return result;
 }
 mapController={
  cancelPending(){version++;},
  setLegColor(index,color){for(const line of legLines.get(index)||[])line.setOptions({strokeColor:routeColors[color].hex});},
  setUserLocation(location){if(!trip.days[current].stops.length&&!userMovedMap){map.panTo(location);map.setZoom(16);}},
  async focus(name){try{const p=await locate({name});map.panTo(p.location);map.setZoom(16);}catch(error){toast(apiError(error));}},
  async draw(stops){
   const request=++version;markers.forEach(m=>m.setMap(null));lines.forEach(l=>l.setMap(null));markers=[];lines=[];legLines.clear();
   if(!stops.length){mapStatus('');return;}mapStatus('正在查詢路線…');
   const bounds=new google.maps.LatLngBounds();const points=[];const failures=[];
   document.querySelectorAll('.leg-estimate').forEach(el=>{el.textContent='預估時間：查詢中…';});
   for(let i=0;i<stops.length;i++){
    try{points[i]=await locate(stops[i]);if(request!==version)return;bounds.extend(points[i].location);const marker=new google.maps.Marker({map,position:points[i].location,label:String(i+1),title:stops[i].name});marker.addListener('click',()=>fillFromMap(stops[i].name,points[i].id));markers.push(marker);}catch(error){if(request!==version)return;failures.push(`地點 ${i+1}（${stops[i].name}）：${apiError(error)}`);}
   }
   if(!bounds.isEmpty())map.fitBounds(bounds,{top:60,right:60,bottom:60,left:innerWidth>600?420:40});
   let distance=0,seconds=0,routeCount=0;const warnings=new Set();const startTime=Date.now()+60000;let timelineKnown=true;
   for(let i=0;i<stops.length-1;i++){
    if(request!==version)return;const estimate=document.querySelector(`[data-leg="${i}"]`);if(!points[i]||!points[i+1]){if(estimate)estimate.textContent='預估時間：地點查詢失敗';timelineKnown=false;continue;}
    let automaticWalkingRoute;
    if(stops[i].modeAuto===true){
     let automaticMode='drive';
     try{
      const walkingKey=JSON.stringify([points[i].id,points[i+1].id]);
      automaticWalkingRoute=walkingRouteCache.get(walkingKey);
      if(!automaticWalkingRoute){
       const {Route}=await getRouteLibrary();
       const response=await Route.computeRoutes({origin:points[i].location,destination:points[i+1].location,travelMode:'WALKING',fields:['path','distanceMeters','durationMillis','warnings']});
       automaticWalkingRoute=response.routes?.[0];
       if(!Number.isFinite(automaticWalkingRoute?.distanceMeters))throw Error('無法取得步行距離');
       walkingRouteCache.set(walkingKey,automaticWalkingRoute);
      }
      automaticMode=automaticWalkingRoute.distanceMeters<=1000?'walk':'drive';
     }catch{warnings.add(`路段 ${i+1} 無法取得步行距離，暫用開車；可手動更改。`);}
     if(request!==version)return;
     stops[i].mode=automaticMode;
     const actual=trip.days[current].stops[i];
     if(actual?.modeAuto===true&&actual.mode!==automaticMode){actual.mode=automaticMode;save();}
     const control=document.querySelector(`[data-mode-index="${i}"]`);if(control)control.value=automaticMode;
    }
    const travelMode={walk:'WALKING',drive:'DRIVING',transit:'TRANSIT',bike:'BICYCLING'}[stops[i].mode];
    // Transit uses a chained time; driving omits departureTime so Google uses
    // server-side now, independent of the device clock or network latency.
    const departureTime=new Date(Math.max(startTime+seconds*1000,Date.now()+60000));
    const cacheId=JSON.stringify([points[i].id,points[i+1].id,travelMode,Math.floor(departureTime.getTime()/300000)]);
    const timing=travelMode==='DRIVING'?{routingPreference:'TRAFFIC_AWARE'}:travelMode==='TRANSIT'?{departureTime}:{};
    try{
     let route=travelMode==='WALKING'&&automaticWalkingRoute?automaticWalkingRoute:routeCache.get(cacheId);
     if(!route){const {Route}=await getRouteLibrary();const result=await Route.computeRoutes({origin:new Place({id:points[i].id}),destination:new Place({id:points[i+1].id}),travelMode,...timing,fields:['path','distanceMeters','durationMillis','warnings']});route=result.routes?.[0];if(!route){const error=Error('無路線');if(travelMode==='TRANSIT')error.code='TRANSIT_NO_ROUTES';throw error;}routeCache.set(cacheId,route);}
     if(request!==version)return;
     const selectedStop=trip.days[current].stops[i]||stops[i];const segmentLines=route.createPolylines({polylineOptions:{strokeColor:routeColors[routeColor(selectedStop)].hex,strokeOpacity:.85,strokeWeight:5}});legLines.set(i,segmentLines);for(const line of segmentLines){line.setMap(map);lines.push(line);}for(const warning of route.warnings||[])warnings.add(warning);if(estimate)estimate.textContent='預估時間：約 '+formatTravelTime(route.durationMillis);if(!timelineKnown&&travelMode==='TRANSIT')warnings.add('部分前段時間未知，後續班次時間僅供參考。');distance+=route.distanceMeters||0;if(Number.isFinite(route.durationMillis))seconds+=route.durationMillis/1000;else{timelineKnown=false;warnings.add('部分路段未回傳時間，合計未包含該段。');}routeCount++;
    }catch(error){if(request!==version)return;if(travelMode==='TRANSIT'&&/ZERO_RESULTS/.test([error?.code,error?.message].join(' '))){const missing=Error('無路線');missing.code='TRANSIT_NO_ROUTES';error=missing;}if(estimate)estimate.textContent=error?.code==='TRANSIT_NO_ROUTES'?'此時段未提供大眾運輸路線':'預估時間：查詢失敗';timelineKnown=false;failures.push(`路段 ${i+1}（${stops[i].name} → ${stops[i+1].name}，${modes[stops[i].mode]}）：${apiError(error)}`);}
   }
   if(request!==version)return;
   const info=routeCount?`${(distance/1000).toFixed(1)} 公里 · 交通約 ${formatTravelTime(seconds*1000)}（不含停留）`:'';
   mapStatus([info?(failures.length?'已成功路段：':'')+info:'',...failures,...warnings].filter(Boolean).join('\n'));
  }
 };
 // Use Google's current Places autocomplete; retain plain text entry as a fallback.
 const suggestions=document.createElement('div');suggestions.id='suggestions';$('add-form').append(suggestions);
 let session=new AutocompleteSessionToken(),searchTimer,searchVersion=0;
 $('place').addEventListener('input',()=>{selectedMapPlace=null;mapSelectionVersion++;const n=++searchVersion;clearTimeout(searchTimer);suggestions.replaceChildren();const input=$('place').value.trim();if(!input)return;searchTimer=setTimeout(async()=>{
  try{const result=await AutocompleteSuggestion.fetchAutocompleteSuggestions({input,sessionToken:session,language:'zh-TW'});if(n!==searchVersion)return;suggestions.replaceChildren();for(const item of result.suggestions||[]){if(!item.placePrediction)continue;const prediction=item.placePrediction;const b=button(prediction.text.toString(),'加入 '+prediction.text.toString(),async()=>{const chosenDay=trip.days[current];const selectionRequest=++mapSelectionVersion;try{const place=prediction.toPlace();await place.fetchFields({fields:['location']});if(place.location)locations.set(place.id,{id:place.id,location:place.location});}catch(error){toast('地點資料：'+apiError(error));}if(selectionRequest!==mapSelectionVersion||!trip.days.includes(chosenDay))return;chosenDay.stops.push({name:prediction.text.toString(),placeId:prediction.placeId,mode:'walk',modeAuto:true});$('place').value='';suggestions.replaceChildren();searchVersion++;session=new AutocompleteSessionToken();save();render();});b.type='button';suggestions.append(b);}if(suggestions.childElementCount){const attribution=document.createElement('small');attribution.textContent='Google Maps';suggestions.append(attribution);}}
  catch(error){if(n===searchVersion)mapStatus('地點建議：'+apiError(error));}
 },300);});
 function fillFromMap(name,placeId){
  mapSelectionVersion++;selectedMapPlace={name,placeId};$('place').value=name;
  clearTimeout(searchTimer);searchVersion++;suggestions.replaceChildren();
  document.body.classList.remove('panel-hidden');$('toggle-panel').textContent='‹';$('toggle-panel').setAttribute('aria-expanded','true');$('toggle-panel').setAttribute('aria-label','收合行程面板');
  $('place').scrollIntoView({block:'nearest'});$('place').focus({preventScroll:true});
 }
 map.addListener('click',async event=>{
  if(!event.placeId&&!event.latLng)return;
  if(event.placeId)event.stop();
  const request=++mapSelectionVersion;const inputBefore=$('place').value;
  try{
   let place;
   if(event.placeId){
    place=new Place({id:event.placeId});await place.fetchFields({fields:['displayName','formattedAddress','location']});
   }else{
    // Some station icons emit coordinates without a place ID. Only look for
    // stations in a small radius at street-level zoom, not arbitrary landmarks.
    if(map.getZoom()<13)return;
    const result=await Place.searchNearby({fields:['id','displayName','location'],locationRestriction:{center:event.latLng,radius:60},includedTypes:['train_station','subway_station','light_rail_station','transit_station','bus_station'],rankPreference:SearchNearbyRankPreference.DISTANCE,maxResultCount:5});
    if(request!==mapSelectionVersion||$('place').value!==inputBefore)return;
    const stations=(result.places||[]).filter(p=>p.id&&p.displayName);
    if(!stations.length)return;
    if(stations.length>1){
     clearTimeout(searchTimer);searchVersion++;suggestions.replaceChildren();
     for(const station of stations){const b=button(station.displayName,'選取 '+station.displayName,()=>{if(station.location)locations.set(station.id,{id:station.id,location:station.location});fillFromMap(station.displayName,station.id);});suggestions.append(b);}
     const attribution=document.createElement('small');attribution.textContent='Google Maps';suggestions.append(attribution);
     document.body.classList.remove('panel-hidden');$('toggle-panel').textContent='‹';$('toggle-panel').setAttribute('aria-expanded','true');$('toggle-panel').setAttribute('aria-label','收合行程面板');
     suggestions.scrollIntoView({block:'nearest'});toast('附近有多個車站，請選擇目的地');return;
    }
    place=stations[0];
   }
   if(request!==mapSelectionVersion||$('place').value!==inputBefore)return;
   const name=place.displayName||place.formattedAddress;if(!name){toast('無法取得此地點名稱');return;}
   if(place.location)locations.set(place.id,{id:place.id,location:place.location});
   fillFromMap(name,place.id);
  }catch(error){if(request===mapSelectionVersion)toast(apiError(error));}
 });
 $('add-form').addEventListener('submit',()=>{searchVersion++;suggestions.replaceChildren();});
 $('key-state').textContent='金鑰已連線，搜尋時不需重新輸入。';mapStatus('');queueMapUpdate();
 }catch(error){const message='Google Maps 載入失敗：'+apiError(error);mapStatus(message);connectionState(message);$('map-recovery').hidden=false;}
}
render();
activeApiKey=readApiKey();
updateKeyStatus();
if(activeApiKey)connectGoogleMaps(activeApiKey);else{connectionState('這個瀏覽器尚未儲存 API 金鑰，請在「管理員功能」設定一次。');}
locateUser();
