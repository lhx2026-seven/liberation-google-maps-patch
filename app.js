const KEY='roam-trip-v1';
const defaults={name:'我的行程',days:[{stops:[{name:'台北車站',mode:'walk'},{name:'迪化街',mode:'transit'},{name:'大稻埕碼頭',mode:'walk'}]},{stops:[{name:'華山1914文化創意產業園區',mode:'walk'},{name:'永康街',mode:'transit'}]}]};
let trip;try{trip=JSON.parse(localStorage.getItem(KEY));if(!trip||typeof trip.name!=='string'||!Array.isArray(trip.days)||!trip.days.length||!trip.days.every(d=>Array.isArray(d.stops)&&d.stops.every(s=>typeof s.name==='string'&&['walk','transit','drive','bike'].includes(s.mode))))trip=null;}catch{}trip=trip||structuredClone(defaults);
let current=0;const $=id=>document.getElementById(id);const modes={walk:'步行',transit:'大眾運輸',drive:'開車',bike:'自行車'};let timer;
function toast(message){$('toast').textContent=message;$('toast').style.display='block';clearTimeout(timer);timer=setTimeout(()=>$('toast').style.display='none',3500);}
function save(){try{localStorage.setItem(KEY,JSON.stringify(trip));$('save-status').textContent='已儲存';}catch{$('save-status').textContent='尚未儲存';toast('裝置無法儲存，請匯出行程以保留變更');}}
function button(label,title,fn){const b=document.createElement('button');b.textContent=label;b.title=title;b.setAttribute('aria-label',title);b.onclick=fn;return b;}
function render(){
 $('trip-name').value=trip.name;$('trip-count').textContent=`${trip.days.length} 天 · ${trip.days.reduce((n,d)=>n+d.stops.length,0)} 個停靠點`;
 $('days').replaceChildren();trip.days.forEach((d,i)=>{const b=button(`第 ${i+1} 天`,`第 ${i+1} 天`,()=>{current=i;render();});b.className=i===current?'active':'';b.setAttribute('role','tab');b.setAttribute('aria-selected',i===current);$('days').append(b);});
 $('day-title').textContent=`第 ${current+1} 天`;$('delete-day').hidden=trip.days.length===1;
 const stops=trip.days[current].stops;$('stops').replaceChildren();
 stops.forEach((stop,i)=>{const row=document.createElement('div');row.className='stop';const marker=document.createElement('div');marker.className='stop-marker';marker.textContent=i+1;const main=document.createElement('div');main.className='stop-main';const card=document.createElement('div');card.className='stop-card';const text=document.createElement('div');text.style.cssText='flex:1;min-width:0';const input=document.createElement('input');input.value=stop.name;input.maxLength=160;input.setAttribute('aria-label',`停靠點 ${i+1}`);input.ondblclick=()=>showPlace(stop.name);input.onchange=()=>{if(input.value.trim()){stop.name=input.value.trim();delete stop.placeId;save();render();}else input.value=stop.name;};text.append(input);const tools=document.createElement('div');tools.className='stop-tools';tools.append(button('⌖','在地圖顯示',()=>showPlace(stop.name)));if(i>0)tools.append(button('↑','向上移動',()=>{[stops[i-1],stops[i]]=[stops[i],stops[i-1]];save();render();}));if(i<stops.length-1)tools.append(button('↓','向下移動',()=>{[stops[i+1],stops[i]]=[stops[i],stops[i+1]];save();render();}));tools.append(button('×','移除停靠點',()=>{stops.splice(i,1);save();render();}));card.append(text,tools);main.append(card);if(i<stops.length-1){const leg=document.createElement('div');leg.className='leg';const icon=document.createElement('span');icon.textContent='↳';const select=document.createElement('select');select.setAttribute('aria-label',`從 ${stop.name} 出發的交通方式`);Object.entries(modes).forEach(([value,label])=>{const option=document.createElement('option');option.value=value;option.textContent=label;option.selected=stop.mode===value;select.append(option);});select.onchange=()=>{stop.mode=select.value;save();render();};const navigate=button('路線 ↗','在 Google Maps 開啟此路段',()=>openLeg(i));leg.append(select,navigate);main.append(leg);}row.append(marker,main);$('stops').append(row);});
 if(!stops.length){const empty=document.createElement('p');empty.textContent='新增目的地';empty.style.cssText='color:#80868b;font-size:13px;padding:8px 0';$('stops').append(empty);}
 queueMapUpdate();

}
$('trip-name').onchange=()=>{trip.name=$('trip-name').value.trim()||'我的旅程';save();render();};
$('add-day').onclick=()=>{trip.days.push({stops:[]});current=trip.days.length-1;save();render();$('place').focus();};
$('delete-day').onclick=()=>{if(trip.days.length>1&&confirm('確定刪除這一天及其所有停靠點？')){trip.days.splice(current,1);current=Math.min(current,trip.days.length-1);save();render();}};
$('add-form').onsubmit=e=>{e.preventDefault();const name=$('place').value.trim();if(!name)return;trip.days[current].stops.push({name,mode:'walk'});$('place').value='';save();render();$('place').focus();};
function showPlace(name){if(mapController){mapController.focus(name);return;}const url='https://maps.google.com/maps?'+new URLSearchParams({q:name,hl:'zh-TW',z:'14',output:'embed'});if($('map').getAttribute('src')!==url)$('map').src=url;}
function openLeg(index){const stops=trip.days[current].stops;const start=stops[index],end=stops[index+1];const params=new URLSearchParams({api:'1',origin:start.name,destination:end.name,travelmode:{walk:'walking',drive:'driving',transit:'transit',bike:'bicycling'}[start.mode]});window.open('https://www.google.com/maps/dir/?'+params,'_blank','noopener,noreferrer');}
$('toggle-panel').onclick=()=>{const hidden=document.body.classList.toggle('panel-hidden');$('toggle-panel').textContent=hidden?'›':'‹';$('toggle-panel').setAttribute('aria-expanded',String(!hidden));$('toggle-panel').setAttribute('aria-label',hidden?'展開行程面板':'收合行程面板');};
$('export').onclick=()=>{const content=[trip.name,...trip.days.flatMap((d,i)=>['',`Day ${i+1}`,...d.stops.map((s,j)=>`${j+1}. ${s.name}${j<d.stops.length-1?' → '+modes[s.mode]:''}`)])].join('\n');const url=URL.createObjectURL(new Blob([content],{type:'text/plain;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='roam-trip.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('已匯出行程');};


let mapController=null, mapUpdateTimer;
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
 const map=new Map($('google-map'),{center:{lat:25.0478,lng:121.517},zoom:14,mapTypeControl:false,streetViewControl:true,fullscreenControl:false});
 $('google-map').hidden=false;$('map').hidden=true;
 let version=0,markers=[],lines=[];
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
  async focus(name){try{const p=await locate({name});map.panTo(p.location);map.setZoom(16);}catch{toast('找不到此地點');}},
  async draw(stops){
   const request=++version;markers.forEach(m=>m.setMap(null));lines.forEach(l=>l.setMap(null));markers=[];lines=[];
   if(!stops.length){mapStatus('');return;}mapStatus('正在查詢路線…');
   const bounds=new google.maps.LatLngBounds();const points=[];let failures=0;
   for(let i=0;i<stops.length;i++){
    try{points[i]=await locate(stops[i]);if(request!==version)return;bounds.extend(points[i].location);const marker=new google.maps.Marker({map,position:points[i].location,label:String(i+1),title:stops[i].name});markers.push(marker);}catch{if(request!==version)return;failures++;}
   }
   if(!bounds.isEmpty())map.fitBounds(bounds,{top:60,right:60,bottom:60,left:innerWidth>600?420:40});
   let distance=0,seconds=0,routeCount=0;const warnings=new Set();
   for(let i=0;i<stops.length-1;i++){
    if(request!==version)return;if(!points[i]||!points[i+1])continue;
    const travelMode={walk:'WALKING',drive:'DRIVING',transit:'TRANSIT',bike:'BICYCLING'}[stops[i].mode];
    const cacheId=JSON.stringify([points[i].id,points[i+1].id,travelMode]);
    try{
     let route=routeCache.get(cacheId);
     if(!route){const result=await Route.computeRoutes({origin:points[i].location,destination:points[i+1].location,travelMode,fields:['path','distanceMeters','durationMillis','warnings']});route=result.routes?.[0];if(!route)throw Error('無路線');routeCache.set(cacheId,route);}
     if(request!==version)return;
     for(const line of route.createPolylines({polylineOptions:{strokeColor:stops[i].mode==='transit'?'#188038':'#1a73e8',strokeOpacity:.85,strokeWeight:5}})){line.setMap(map);lines.push(line);}for(const warning of route.warnings||[])warnings.add(warning);distance+=route.distanceMeters||0;seconds+=(route.durationMillis||0)/1000;routeCount++;
    }catch{if(request!==version)return;failures++;}
   }
   if(request!==version)return;
   const info=routeCount?`${(distance/1000).toFixed(1)} 公里 · ${Math.ceil(seconds/60)} 分鐘`:'';
   mapStatus(failures?`${info?info+' · ':''}部分地點或路線查詢失敗，請檢查金鑰設定或改用其他交通方式。`:[info,...warnings].filter(Boolean).join(' · '));
  }
 };
 // Use Google's current Places autocomplete; retain plain text entry as a fallback.
 const suggestions=document.createElement('div');suggestions.id='suggestions';$('add-form').append(suggestions);
 let session=new AutocompleteSessionToken(),searchTimer,searchVersion=0;
 $('place').addEventListener('input',()=>{const n=++searchVersion;clearTimeout(searchTimer);suggestions.replaceChildren();const input=$('place').value.trim();if(!input)return;searchTimer=setTimeout(async()=>{
  try{const result=await AutocompleteSuggestion.fetchAutocompleteSuggestions({input,sessionToken:session,language:'zh-TW'});if(n!==searchVersion)return;suggestions.replaceChildren();for(const item of result.suggestions||[]){if(!item.placePrediction)continue;const prediction=item.placePrediction;const b=button(prediction.text.toString(),'加入 '+prediction.text.toString(),async()=>{const chosenDay=trip.days[current];try{const place=prediction.toPlace();await place.fetchFields({fields:['location']});if(place.location)locations.set(place.id,{id:place.id,location:place.location});}catch{toast('地點詳細資料載入失敗，將於路線查詢時重試');}chosenDay.stops.push({name:prediction.text.toString(),placeId:prediction.placeId,mode:'walk'});$('place').value='';suggestions.replaceChildren();searchVersion++;session=new AutocompleteSessionToken();save();render();});b.type='button';suggestions.append(b);}if(suggestions.childElementCount){const attribution=document.createElement('small');attribution.textContent='Google Maps';suggestions.append(attribution);}}
  catch{if(n===searchVersion)mapStatus('地點建議無法載入，仍可輸入完整地址。');}
 },300);});
 $('add-form').addEventListener('submit',()=>{searchVersion++;suggestions.replaceChildren();});
 mapStatus('');queueMapUpdate();
 }catch{mapStatus('Google Maps 無法載入，請確認網路與 API 設定。');}
}
render();
let storedKey;try{storedKey=localStorage.getItem(API_KEY_STORAGE);}catch{}
if(storedKey)connectGoogleMaps(storedKey);
