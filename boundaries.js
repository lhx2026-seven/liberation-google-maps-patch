(() => {
 'use strict';
 const KEY='admin-boundaries-v1';
 const status=document.getElementById('boundary-status');
 const add=document.getElementById('add-boundary');
 const selection=document.getElementById('boundary-selection');
 const list=document.getElementById('boundary-list');
 const choices=document.getElementById('boundary-choices');
 let candidate=null,map=null,layer=null,busy=false,selecting=false,epoch=0,configPromise,searchPlaces=null;
 const lookupCache=new Map();
 let features=[];
 try{const stored=JSON.parse(localStorage.getItem(KEY));if(Array.isArray(stored))features=stored.filter(validFeature);}catch{}
 function message(text){status.textContent=text;}
 function openPanel(){document.getElementById('boundary-panel').hidden=false;document.body.classList.remove('boundary-panel-hidden');const toggle=document.getElementById('boundary-tool-toggle');toggle.setAttribute('aria-expanded','true');toggle.setAttribute('aria-label','收合行政區邊界標示');toggle.textContent='‹';}
 function closePanel(){epoch++;setSelecting(false);document.getElementById('boundary-panel').hidden=true;document.body.classList.add('boundary-panel-hidden');const toggle=document.getElementById('boundary-tool-toggle');toggle.setAttribute('aria-expanded','false');toggle.setAttribute('aria-label','展開行政區邊界標示');toggle.textContent='行政區邊界標示 ›';}
 openPanel();
 document.getElementById('boundary-tool-toggle').onclick=()=>{if(document.getElementById('boundary-panel').hidden)openPanel();else closePanel();};
 function reveal(){openPanel();selection.scrollIntoView({block:'nearest'});}
 function setSelecting(value){selecting=value;document.getElementById('cancel-boundary-selection').hidden=!value;}
 document.getElementById('select-boundary').onclick=()=>{epoch++;candidate=null;choices.replaceChildren();setSelecting(true);message('請點地圖上的行政區；若地圖未提供選取資訊，可直接使用上方搜尋。');render();};
 document.getElementById('cancel-boundary-selection').onclick=()=>{epoch++;setSelecting(false);message('');render();};
 document.getElementById('boundary-search-form').onsubmit=async event=>{
  event.preventDefault();const name=document.getElementById('boundary-search').value.trim();if(!name||busy)return;
  if(!searchPlaces){message('Google 地圖尚未連線，請先連線後再搜尋行政區。');return;}
  const request=++epoch;busy=true;choices.replaceChildren();message('正在搜尋行政區…');render();
  try{
   const result=await searchPlaces(name);if(request!==epoch)return;
   const places=(result||[]).filter(eligible);
   const exact=places.filter(place=>normalize(place.displayName)===normalize(name));const matches=exact.length?exact:places;
   if(!matches.length){message('Google 沒有回傳可識別的行政區，請使用完整名稱，例如「台北市」或「新北市板橋區」。');return;}
   const choose=place=>{if(!window.adminBoundaries.setCandidate(place)){message('未取得此行政區的完整定位資訊，請使用更完整的地名重試。');return;}document.getElementById('boundary-search').blur();add.click();};
   busy=false;render();
   if(matches.length===1){choose(matches[0]);return;}
   message('請選擇要顯示的行政區：');
   for(const place of matches){const button=document.createElement('button');button.type='button';button.textContent=place.formattedAddress||place.displayName;button.onclick=()=>choose(place);choices.append(button);}
  }catch(error){if(request===epoch)message('行政區搜尋失敗：'+(error.message||'請稍後再試'));}
  finally{if(request===epoch){busy=false;render();}}
 };

 function updateKeyboardInset(){const viewport=window.visualViewport;const inset=viewport?Math.max(0,innerHeight-viewport.height-viewport.offsetTop):0;document.documentElement.style.setProperty('--boundary-keyboard-inset',inset+'px');document.body.classList.toggle('boundary-keyboard-open',inset>80);}
 window.visualViewport?.addEventListener('resize',updateKeyboardInset);window.addEventListener('resize',updateKeyboardInset);updateKeyboardInset();
 function point(position){return {lat:typeof position?.lat==='function'?position.lat():position?.lat,lng:typeof position?.lng==='function'?position.lng():position?.lng};}
 function validGeometry(g){
  if(!g||!['Polygon','MultiPolygon'].includes(g.type)||!Array.isArray(g.coordinates)||!g.coordinates.length)return false;
  let count=0;const polygons=g.type==='Polygon'?[g.coordinates]:g.coordinates;
  return polygons.every(rings=>Array.isArray(rings)&&rings.length&&rings.every(ring=>Array.isArray(ring)&&ring.length>=4&&ring.every(c=>++count<=200000&&Array.isArray(c)&&Number.isFinite(c[0])&&Number.isFinite(c[1])&&Math.abs(c[0])<=180&&Math.abs(c[1])<=90)&&ring[0][0]===ring.at(-1)[0]&&ring[0][1]===ring.at(-1)[1]));
 }

 function validFeature(f){return f?.type==='Feature'&&typeof f.id==='string'&&typeof f.properties?.name==='string'&&validGeometry(f.geometry);}
 function normalize(text){return String(text||'').normalize('NFKC').toLowerCase().replace(/台/g,'臺').replace(/[\p{P}\p{Z}\s]/gu,'');}
 function eligible(place){
  const types=place?.types||[];
  const country=place?.addressComponents?.find(c=>c.types?.includes('country'))?.shortText;
  return types.some(type=>type==='country'||/^administrative_area_level_[123]$/.test(type)||type==='locality'||(country==='TW'&&(type==='neighborhood'||/^administrative_area_level_[4-7]$/.test(type)||/^sublocality(?:_level_[1-5])?$/.test(type))));
 }
 function ringContains(ring,p){
  let inside=false;
  for(let i=0,j=ring.length-1;i<ring.length;j=i++){
   const a=ring[i],b=ring[j];
   if((a[1]>p.lat)!==(b[1]>p.lat)&&p.lng<(b[0]-a[0])*(p.lat-a[1])/(b[1]-a[1])+a[0])inside=!inside;
  }
  return inside;
 }
 function contains(g,p){
  const polygons=g.type==='Polygon'?[g.coordinates]:g.coordinates;
  return polygons.some(rings=>rings.length&&ringContains(rings[0],p)&&!rings.slice(1).some(ring=>ringContains(ring,p)));
 }
 function asFeature(result,selected){
  if((result.category||result.class)!=='boundary'||result.type!=='administrative'||!validGeometry(result.geojson))return null;
  const names=[result.name,...Object.values(result.namedetails||{})].map(normalize);
  if(!names.includes(normalize(selected.name))||!contains(result.geojson,selected.location))return null;
  const level=Number(result.extratags?.admin_level);
  const adminLevel=Number.isInteger(level)&&level>=2&&level<=12?level:null;
  if(!['relation','way'].includes(result.osm_type)||!/^\d+$/.test(String(result.osm_id)))return null;
  return {type:'Feature',id:`${result.osm_type}/${result.osm_id}`,properties:{name:result.name||selected.name,selectedName:selected.name,label:result.display_name||selected.name,adminLevel,source:'OpenStreetMap',osmType:result.osm_type,osmId:String(result.osm_id)},geometry:result.geojson};
 }
 function save(){
  try{
   const value=JSON.stringify(features);
   if(value.length>2000000)throw Error('too large');
   localStorage.setItem(KEY,value);
  }catch{message('範圍已顯示，但本機儲存空間不足；本次新增未能保存。');}
 }
 function updateLayer(){
  if(!layer)return;
  layer.forEach(feature=>layer.remove(feature));
  try{layer.addGeoJson({type:'FeatureCollection',features});}catch{message('部分邊界資料無法繪製，行程地圖仍可使用。');}
 }
 function mapPadding(){
  let left=40;
  if(innerWidth>600){for(const id of ['boundary-panel']){const panel=document.getElementById(id);if(panel.getClientRects().length)left=Math.max(left,panel.getBoundingClientRect().right+32);}const tripPanel=document.querySelector('.sidebar');if(tripPanel.getClientRects().length)left=Math.max(left,tripPanel.getBoundingClientRect().right+32);}
  return {top:60,right:40,bottom:60,left:Math.min(left,innerWidth-120)};
 }
 function focus(feature){
  if(!map)return;
  const bounds=new google.maps.LatLngBounds();
  const polygons=feature.geometry.type==='Polygon'?[feature.geometry.coordinates]:feature.geometry.coordinates;
  for(const rings of polygons)for(const coordinate of rings[0])bounds.extend({lat:coordinate[1],lng:coordinate[0]});
  if(!bounds.isEmpty())map.fitBounds(bounds,mapPadding());
 }
 function render(){
  selection.hidden=!candidate;add.disabled=busy;document.getElementById('search-boundary').disabled=busy;document.getElementById('search-boundary').textContent=busy?'查詢中…':'顯示範圍';list.replaceChildren();
  document.getElementById('boundary-name').textContent=candidate?.name||'';
  document.getElementById('clear-boundaries').hidden=!features.length;
  document.getElementById('boundary-attribution').hidden=!features.length&&!choices.children.length;
  for(const feature of features){
   const row=document.createElement('div');row.className='boundary-row';
   const name=document.createElement('button');name.type='button';name.textContent=feature.properties.name;name.title=feature.properties.label;name.onclick=()=>focus(feature);
   const remove=document.createElement('button');remove.type='button';remove.textContent='×';remove.setAttribute('aria-label','移除範圍 '+feature.properties.name);remove.onclick=()=>{features=features.filter(f=>f.id!==feature.id);save();updateLayer();render();};
   row.append(name,remove);list.append(row);
  }
 }
 function accept(feature){
  if(!features.some(f=>f.id===feature.id)){features.push(feature);message('已加入行政區範圍');save();updateLayer();}else message('此行政區已加入');
  choices.replaceChildren();render();focus(feature);
 }
 async function config(){
  if(!configPromise)configPromise=fetch('./boundary-config.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('無法讀取範圍查詢設定');return r.json();}).then(c=>{
   const endpoint=new URL(c.endpoint);if(endpoint.protocol!=='https:')throw Error('範圍服務必須使用 HTTPS');
   return {endpoint:endpoint.href,minimumIntervalMs:Math.max(1500,Number(c.minimumIntervalMs)||1500)};
  }).catch(error=>{configPromise=null;throw error;});
  return configPromise;
 }
 async function lookup(selected){
  const cacheKey=JSON.stringify([selected.name,selected.country,selected.location]);
  if(lookupCache.has(cacheKey))return lookupCache.get(cacheKey);
  const c=await config();
  const run=async()=>{
   let last=0;try{last=Number(localStorage.getItem('boundary-last-request'))||0;}catch{}
   const delay=Math.min(c.minimumIntervalMs,Math.max(0,c.minimumIntervalMs-(Date.now()-last)));
   if(delay)await new Promise(resolve=>setTimeout(resolve,delay));
   try{localStorage.setItem('boundary-last-request',String(Date.now()));}catch{}
   const url=new URL(c.endpoint);
   const params={format:'jsonv2',q:[selected.name,selected.countryName].filter(Boolean).join(', '),polygon_geojson:'1',polygon_threshold:'0.00005',namedetails:'1',extratags:'1',addressdetails:'1',limit:'8','accept-language':'zh-TW,zh,en'};
   if(selected.country)params.countrycodes=selected.country.toLowerCase();
   if(selected.viewport){params.viewbox=[selected.viewport.west,selected.viewport.north,selected.viewport.east,selected.viewport.south].join(',');}
   for(const [key,value] of Object.entries(params))url.searchParams.set(key,value);
   const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),20000);
   try{
    const response=await fetch(url,{credentials:'omit',referrerPolicy:'strict-origin-when-cross-origin',signal:controller.signal});
    if(response.status===429)throw Error('邊界服務暫時限流，請稍後再試');
    if(!response.ok)throw Error('邊界服務目前無法使用，請稍後再試');
    const results=await response.json();if(!Array.isArray(results))throw Error('邊界服務回應格式不符');
    return results.map(result=>asFeature(result,selected)).filter(Boolean);
   }finally{clearTimeout(timeout);}
  };
  const found=await (navigator.locks?navigator.locks.request('admin-boundary-lookup',run):run());lookupCache.set(cacheKey,found);return found;
 }
 add.onclick=async()=>{
  if(!candidate||busy)return;
  const selected=candidate,request=epoch;
  const existing=features.find(f=>[f.properties.name,f.properties.selectedName].map(normalize).includes(normalize(selected.name))&&contains(f.geometry,selected.location));
  if(existing){message('此行政區已加入');focus(existing);return;}
  busy=true;message('正在查詢行政區邊界…');render();
  try{
   const matches=await lookup(selected);if(request!==epoch)return;
   if(!matches.length){message('沒有找到名稱、位置都相符的行政區邊界；不會改用上層行政區或方框代替。');return;}
   if(matches.length===1){accept(matches[0]);return;}
   message('有多個相符邊界，請選擇：');choices.replaceChildren();
   for(const feature of matches){const button=document.createElement('button');button.type='button';button.textContent=`${feature.properties.label}${feature.properties.adminLevel?`（OSM 層級 ${feature.properties.adminLevel}）`:''}`;button.onclick=()=>accept(feature);choices.append(button);}
  }catch(error){if(request===epoch)message(error.name==='AbortError'?'邊界服務回應逾時，請稍後再試':error instanceof TypeError?'邊界服務連線失敗，可能是網路或服務限制；行程功能仍可使用。':error.message||'邊界查詢失敗');}
  finally{busy=false;render();}
 };
 document.getElementById('clear-boundaries').onclick=()=>{epoch++;features=[];choices.replaceChildren();message('');save();updateLayer();render();};
 window.adminBoundaries={
  isSelecting(){return selecting;},
  mapPadding,
  selectPlace(place){if(window.adminBoundaries.setCandidate(place))add.click();},
  attachSearch(fn){searchPlaces=fn;},
  reveal,
  attachMap(value){map=value;try{layer=new google.maps.Data({map,style:{strokeColor:'#f57c00',strokeWeight:2,strokeOpacity:1,fillColor:'#f57c00',fillOpacity:0.04,clickable:false}});updateLayer();}catch{message('行政區圖層暫時無法啟用，行程地圖仍可使用。');}},
  setCandidate(place){
   epoch++;choices.replaceChildren();message('');
   if(!eligible(place)){candidate=null;if(selecting)message('這個結果不是可識別的行政區；請改選城市、鄉鎮或村里。');render();return false;}
   const country=place.addressComponents?.find(c=>c.types?.includes('country'));
   const location=point(place.location);
   candidate=Number.isFinite(location.lat)&&Number.isFinite(location.lng)?{name:place.displayName,location,country:country?.shortText,countryName:country?.longText,viewport:place.viewport?.toJSON?.()}:null;
   if(selecting)setSelecting(false);
   if(candidate)document.getElementById('boundary-search').blur();
   render();if(candidate)reveal();return Boolean(candidate);
  }
 };
 render();
})();
