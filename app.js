const KEY='roam-trip-v1';
const routeColors={red:{label:'紅',hex:'#d93025'},yellow:{label:'黃',hex:'#fbbc04'},blue:{label:'藍',hex:'#1a73e8'},green:{label:'綠',hex:'#188038'},orange:{label:'橘',hex:'#f57c00'},purple:{label:'紫',hex:'#9334e6'}};
function routeColor(stop){return Object.hasOwn(routeColors,stop.color)?stop.color:'orange';}
const defaults={name:'我的行程',days:[{stops:[]}]};
let trip;try{trip=JSON.parse(localStorage.getItem(KEY));if(!trip||typeof trip.name!=='string'||!Array.isArray(trip.days)||!trip.days.length||!trip.days.every(d=>Array.isArray(d.stops)&&d.stops.every(s=>typeof s.name==='string'&&['walk','transit','drive','bike'].includes(s.mode))))trip=null;}catch{}trip=trip||structuredClone(defaults);
let selectedMapPlace=null,mapSelectionVersion=0;
let current=0;const $=id=>document.getElementById(id);const modes={walk:'步行',transit:'大眾運輸',drive:'開車',bike:'自行車'};let timer;
function toast(message){$('toast').textContent=message;$('toast').style.display='block';clearTimeout(timer);timer=setTimeout(()=>$('toast').style.display='none',3500);}
function save(){try{localStorage.setItem(KEY,JSON.stringify(trip));$('save-status').textContent='已儲存';}catch{$('save-status').textContent='尚未儲存';toast('裝置無法儲存，請匯出行程以保留變更');}}
function button(label,title,fn){const b=document.createElement('button');b.textContent=label;b.title=title;b.setAttribute('aria-label',title);b.onclick=fn;return b;}
function render(){
 $('trip-name').value=trip.name;$('trip-count').textContent=`${trip.days.length} 天 · ${trip.days.reduce((n,d)=>n+d.stops.length,0)} 個停靠點`;
 $('days').replaceChildren();trip.days.forEach((d,i)=>{const b=button(`第 ${i+1} 天`,`第 ${i+1} 天`,()=>{current=i;render();});b.className=i===current?'active':'';b.setAttribute('role','tab');b.setAttribute('aria-selected',i===current);$('days').append(b);});
 $('day-title').textContent=`第 ${current+1} 天`;$('delete-day').hidden=trip.days.length===1;
 const stops=trip.days[current].stops;$('stops').replaceChildren();
 stops.forEach((stop,i)=>{const row=document.createElement('div');row.className='stop';const marker=document.createElement('div');marker.className='stop-marker';marker.textContent=i+1;const main=document.createElement('div');main.className='stop-main';const card=document.createElement('div');card.className='stop-card';const text=document.createElement('div');text.style.cssText='flex:1;min-width:0';const input=document.createElement('input');input.value=stop.name;input.maxLength=160;input.setAttribute('aria-label',`停靠點 ${i+1}`);input.ondblclick=()=>showPlace(stop.name);input.onchange=()=>{if(input.value.trim()){stop.name=input.value.trim();delete stop.placeId;save();render();}else input.value=stop.name;};text.append(input);const tools=document.createElement('div');tools.className='stop-tools';tools.append(button('⌖','在地圖顯示',()=>showPlace(stop.name)));if(i>0)tools.append(button('↑','向上移動',()=>{[stops[i-1],stops[i]]=[stops[i],stops[i-1]];save();render();}));if(i<stops.length-1)tools.append(button('↓','向下移動',()=>{[stops[i+1],stops[i]]=[stops[i],stops[i+1]];save();render();}));tools.append(button('×','移除停靠點',()=>{stops.splice(i,1);save();render();}));card.append(text,tools);main.append(card);if(i<stops.length-1){const leg=document.createElement('div');leg.className='leg';const icon=document.createElement('span');icon.textContent='↳';const select=document.createElement('select');select.setAttribute('aria-label',`從 ${stop.name} 出發的交通方式`);Object.entries(modes).forEach(([value,label])=>{const option=document.createElement('option');option.value=value;option.textContent=label;option.selected=stop.mode===value;select.append(option);});select.onchange=()=>{stop.mode=select.value;save();render();};const navigate=button('路線 ↗','在 Google Maps 開啟此路段',()=>openLeg(i));const estimate=document.createElement('span');estimate.className='leg-estimate';estimate.dataset.leg=i;estimate.textContent='預估時間：待查詢';const colorSelect=document.createElement('details');colorSelect.className='route-color';const swatch=document.createElement('summary');swatch.setAttribute('aria-label',`路段 ${i+1} 顏色`);swatch.title='路線顏色';swatch.style.backgroundColor=routeColors[routeColor(stop)].hex;const palette=document.createElement('div');palette.className='color-palette';palette.setAttribute('role','group');palette.setAttribute('aria-label','路線顏色');Object.entries(routeColors).forEach(([value,color])=>{const choice=button('',color.label+'色',()=>{stop.color=value;swatch.style.backgroundColor=color.hex;palette.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b===choice)));colorSelect.open=false;save();mapController?.setLegColor(i,value);swatch.focus();});choice.style.backgroundColor=color.hex;choice.setAttribute('aria-pressed',String(value===routeColor(stop)));palette.append(choice);});colorSelect.append(swatch,palette);leg.append(select,colorSelect,navigate,estimate);main.append(leg);}row.append(marker,main);$('stops').append(row);});
 if(!stops.length){const empty=document.createElement('p');empty.textContent='新增目的地';empty.style.cssText='color:#80868b;font-size:13px;padding:8px 0';$('stops').append(empty);}
 queueMapUpdate();

}
$('trip-name').onchange=()=>{trip.name=$('trip-name').value.trim()||'我的旅程';save();render();};
$('add-day').onclick=()=>{trip.days.push({stops:[]});current=trip.days.length-1;save();render();$('place').focus();};
$('delete-day').onclick=()=>{if(trip.days.length>1&&confirm('確定刪除這一天及其所有停靠點？')){trip.days.splice(current,1);current=Math.min(current,trip.days.length-1);save();render();}};
$('add-form').onsubmit=e=>{e.preventDefault();const name=$('place').value.trim();if(!name)return;mapSelectionVersion++;trip.days[current].stops.push({name,...(selectedMapPlace?.name===name?{placeId:selectedMapPlace.placeId}:{}),mode:'walk'});selectedMapPlace=null;$('place').value='';save();render();$('place').focus();};
function showPlace(name){if(mapController){mapController.focus(name);return;}const url='https://maps.google.com/maps?'+new URLSearchParams({q:name,hl:'zh-TW',z:'14',t:'k',output:'embed'});if($('map').getAttribute('src')!==url)$('map').src=url;}
function openLeg(index){const stops=trip.days[current].stops;const start=stops[index],end=stops[index+1];const params=new URLSearchParams({api:'1',origin:start.name,destination:end.name,travelmode:{walk:'walking',drive:'driving',transit:'transit',bike:'bicycling'}[start.mode]});window.open('https://www.google.com/maps/dir/?'+params,'_blank','noopener,noreferrer');}
$('toggle-panel').onclick=()=>{const hidden=document.body.classList.toggle('panel-hidden');$('toggle-panel').textContent=hidden?'›':'‹';$('toggle-panel').setAttribute('aria-expanded',String(!hidden));$('toggle-panel').setAttribute('aria-label',hidden?'展開行程面板':'收合行程面板');};
$('export').onclick=()=>{const content=[trip.name,...trip.days.flatMap((d,i)=>['',`Day ${i+1}`,...d.stops.map((s,j)=>`${j+1}. ${s.name}${j<d.stops.length-1?' → '+modes[s.mode]:''}`)])].join('\n');const url=URL.createObjectURL(new Blob([content],{type:'text/plain;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='roam-trip.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('已匯出行程');};


let mapController=null, mapUpdateTimer,userLocation=null;
function locateUser(){
 if(!navigator.geolocation){toast('此瀏覽器不支援定位，可直接搜尋地點');return;}
 navigator.geolocation.getCurrentPosition(position=>{
  userLocation={lat:position.coords.latitude,lng:position.coords.longitude};
  if(mapController)mapController.setUserLocation(userLocation);
  else if(!trip.days[current].stops.length)$('map').src='https://maps.google.com/maps?'+new URLSearchParams({q:`${userLocation.lat},${userLocation.lng}`,hl:'zh-TW',z:'16',t:'k',output:'embed'});
 },error=>{toast(error.code===1?'未允許定位，可直接搜尋地點':error.code===3?'定位逾時，可直接搜尋地點':'無法取得位置，可直接搜尋地點');},{enableHighAccuracy:true,timeout:12000,maximumAge:60000});
}
const API_KEY_STORAGE='trip-maps-api-key';
function mapStatus(text){$('map-status').textContent=text;}
function queueMapUpdate(){clearTimeout(mapUpdateTimer);mapUpdateTimer=setTimeout(()=>{
 if(mapController)mapController.draw(trip.days[current].stops.map(s=>({...s})));
 else {const stop=trip.days[current].stops[0];if(stop)showPlace(stop.name);}
},250);}
$('settings').onclick=()=>{$('api-key').value='';$('key-dialog').showModal();};
$('cancel-key').onclick=()=>$('key-dialog').close();
$('remove-key').onclick=()=>{try{localStorage.removeItem(API_KEY_STORAGE);}catch{}location.reload();};
$('key-form').onsubmit=e=>{e.preventDefault();const key=$('api-key').value.trim();if(!key)return;try{localStorage.setItem(API_KEY_STORAGE,key);}catch{toast('無法儲存金鑰，請允許此網站使用瀏覽器儲存空間');return;}$('api-key').value='';$('key-dialog').close();location.reload();};
window.gm_authFailure=()=>{mapStatus('金鑰驗證失敗，請確認網站限制、API 與帳務設定。');$('settings').hidden=false;};
function formatTravelTime(milliseconds){
 if(!Number.isFinite(milliseconds))return '時間未知';
 const minutes=Math.max(1,Math.ceil(milliseconds/60000));
 return minutes<60?`${minutes} 分鐘`:`${Math.floor(minutes/60)} 小時${minutes%60?` ${minutes%60} 分鐘`:''}`;
}
function apiError(error){
 const raw=[error?.code,error?.status,error?.message].filter(Boolean).join(' · ')||'未知錯誤';
 const safe=raw.replace(/AIza[\w-]+/g,'[已隱藏金鑰]').replace(/([?&]key=)[^&\s]+/gi,'$1[已隱藏金鑰]').slice(0,500);
 if(/REQUEST_DENIED|PERMISSION_DENIED|not authorized|not enabled|ApiNotActivated|API_KEY|referer|referrer|403/i.test(safe))return 'API 權限被拒絕。請確認同一把金鑰允許 Maps JavaScript API、Places API (New)、Routes API，網站限制允許 https://lhx2026-seven.github.io/*。Google：'+safe;
 if(/BILLING|billing/i.test(safe))return '請確認 Google Cloud 帳務已啟用。Google：'+safe;
 if(/QUOTA|RESOURCE_EXHAUSTED|OVER_QUERY_LIMIT|429/i.test(safe))return 'API 配額或速率限制，請稍後重試或檢查 Google Cloud 配額。Google：'+safe;
 if(/ZERO_RESULTS|NOT_FOUND|無路線|找不到地點/i.test(safe))return '找不到符合的地點或交通路線，可從搜尋建議重新選點或更換交通方式。Google：'+safe;
 return safe;
}
async function connectGoogleMaps(key){
 mapStatus('正在載入 Google Maps…');
 try{
 await new Promise((resolve,reject)=>{
  const callback='initializeTripGoogleMaps';window[callback]=()=>{delete window[callback];resolve();};
  const script=document.createElement('script');script.async=true;script.src='https://maps.googleapis.com/maps/api/js?'+new URLSearchParams({key,v:'weekly',loading:'async',language:'zh-TW',callback});script.onerror=()=>reject(Error('載入失敗'));document.head.append(script);
 });
 const {Map}=await google.maps.importLibrary('maps');
 const {Place,AutocompleteSuggestion,AutocompleteSessionToken}=await google.maps.importLibrary('places');
 const {Route}=await google.maps.importLibrary('routes');
 const map=new Map($('google-map'),{center:userLocation||{lat:23.7,lng:121},zoom:userLocation?16:7,gestureHandling:'greedy',mapTypeId:'hybrid',mapTypeControl:true,mapTypeControlOptions:{position:google.maps.ControlPosition?.TOP_RIGHT},streetViewControl:true,fullscreenControl:false});
 $('google-map').hidden=false;$('map').hidden=true;
 let version=0,markers=[],lines=[],userMovedMap=false;const legLines=new globalThis.Map();
 map.addListener('dragstart',()=>{userMovedMap=true;});
 const locations=new globalThis.Map(),routeCache=new globalThis.Map();
 async function locate(stop){
  const id=stop.placeId||stop.name;if(locations.has(id))return locations.get(id);
  let place;
  if(stop.placeId){place=new Place({id:stop.placeId});await place.fetchFields({fields:['location','displayName']});}
  else {const result=await Place.searchByText({textQuery:stop.name,fields:['id','location','displayName'],language:'zh-TW'});place=result.places?.[0];}
  if(!place?.location)throw Error('找不到地點：'+stop.name);
  const result={location:place.location,id:place.id};locations.set(id,result);locations.set(stop.name,result);return result;
 }
 mapController={
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
   let distance=0,seconds=0,routeCount=0;const warnings=new Set();const startTime=Date.now();let timelineKnown=true;
   for(let i=0;i<stops.length-1;i++){
    if(request!==version)return;const estimate=document.querySelector(`[data-leg="${i}"]`);if(!points[i]||!points[i+1]){if(estimate)estimate.textContent='預估時間：地點查詢失敗';timelineKnown=false;continue;}
    const travelMode={walk:'WALKING',drive:'DRIVING',transit:'TRANSIT',bike:'BICYCLING'}[stops[i].mode];
    const departureTime=new Date(startTime+seconds*1000);
    const cacheId=JSON.stringify([points[i].id,points[i+1].id,travelMode,Math.floor(departureTime.getTime()/300000)]);
    const timing=travelMode==='DRIVING'?{departureTime,routingPreference:'TRAFFIC_AWARE'}:travelMode==='TRANSIT'?{departureTime}:{};
    try{
     let route=routeCache.get(cacheId);
     if(!route){const result=await Route.computeRoutes({origin:points[i].location,destination:points[i+1].location,travelMode,...timing,fields:['path','distanceMeters','durationMillis','warnings']});route=result.routes?.[0];if(!route)throw Error('無路線');routeCache.set(cacheId,route);}
     if(request!==version)return;
     const selectedStop=trip.days[current].stops[i]||stops[i];const segmentLines=route.createPolylines({polylineOptions:{strokeColor:routeColors[routeColor(selectedStop)].hex,strokeOpacity:.85,strokeWeight:5}});legLines.set(i,segmentLines);for(const line of segmentLines){line.setMap(map);lines.push(line);}for(const warning of route.warnings||[])warnings.add(warning);if(estimate)estimate.textContent='預估時間：約 '+formatTravelTime(route.durationMillis);if(!timelineKnown&&travelMode==='TRANSIT')warnings.add('部分前段時間未知，後續班次時間僅供參考。');distance+=route.distanceMeters||0;if(Number.isFinite(route.durationMillis))seconds+=route.durationMillis/1000;else{timelineKnown=false;warnings.add('部分路段未回傳時間，合計未包含該段。');}routeCount++;
    }catch(error){if(request!==version)return;if(estimate)estimate.textContent='預估時間：查詢失敗';timelineKnown=false;failures.push(`路段 ${i+1}（${stops[i].name} → ${stops[i+1].name}，${modes[stops[i].mode]}）：${apiError(error)}`);}
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
  try{const result=await AutocompleteSuggestion.fetchAutocompleteSuggestions({input,sessionToken:session,language:'zh-TW'});if(n!==searchVersion)return;suggestions.replaceChildren();for(const item of result.suggestions||[]){if(!item.placePrediction)continue;const prediction=item.placePrediction;const b=button(prediction.text.toString(),'加入 '+prediction.text.toString(),async()=>{const chosenDay=trip.days[current];try{const place=prediction.toPlace();await place.fetchFields({fields:['location']});if(place.location)locations.set(place.id,{id:place.id,location:place.location});}catch{toast('地點詳細資料載入失敗，將於路線查詢時重試');}chosenDay.stops.push({name:prediction.text.toString(),placeId:prediction.placeId,mode:'walk'});$('place').value='';suggestions.replaceChildren();searchVersion++;session=new AutocompleteSessionToken();save();render();});b.type='button';suggestions.append(b);}if(suggestions.childElementCount){const attribution=document.createElement('small');attribution.textContent='Google Maps';suggestions.append(attribution);}}
  catch(error){if(n===searchVersion)mapStatus('地點建議：'+apiError(error));}
 },300);});
 function fillFromMap(name,placeId){
  mapSelectionVersion++;selectedMapPlace={name,placeId};$('place').value=name;
  clearTimeout(searchTimer);searchVersion++;suggestions.replaceChildren();
  document.body.classList.remove('panel-hidden');$('toggle-panel').textContent='‹';$('toggle-panel').setAttribute('aria-expanded','true');$('toggle-panel').setAttribute('aria-label','收合行程面板');
  $('place').scrollIntoView({block:'nearest'});$('place').focus({preventScroll:true});
 }
 map.addListener('click',async event=>{
  if(!event.placeId)return;
  event.stop();const request=++mapSelectionVersion;const inputBefore=$('place').value;
  try{
   const place=new Place({id:event.placeId});await place.fetchFields({fields:['displayName','formattedAddress','location']});
   if(request!==mapSelectionVersion||$('place').value!==inputBefore)return;
   const name=place.displayName||place.formattedAddress;if(!name){toast('無法取得此地點名稱');return;}
   if(place.location)locations.set(place.id,{id:place.id,location:place.location});
   fillFromMap(name,place.id);
  }catch(error){if(request===mapSelectionVersion)toast(apiError(error));}
 });
 $('add-form').addEventListener('submit',()=>{searchVersion++;suggestions.replaceChildren();});
 mapStatus('');queueMapUpdate();
 }catch(error){mapStatus('Google Maps 載入失敗：'+apiError(error));}
}
render();
let storedKey;try{storedKey=localStorage.getItem(API_KEY_STORAGE);}catch{}
if(storedKey)connectGoogleMaps(storedKey);
locateUser();
