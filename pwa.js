(() => {
 const install=document.getElementById('install-app');
 const dialog=document.getElementById('install-dialog');
 const standalone=()=>window.matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
 let prompt;
 function update(){install.hidden=standalone();document.getElementById('offline-notice').hidden=navigator.onLine;}
 window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();prompt=event;});
 window.addEventListener('appinstalled',()=>{prompt=null;install.hidden=true;});
 install.onclick=async()=>{if(prompt){await prompt.prompt();await prompt.userChoice;prompt=null;}else dialog.showModal();};
 document.getElementById('close-install').onclick=()=>dialog.close();
 window.addEventListener('online',update);window.addEventListener('offline',update);update();
 if('serviceWorker' in navigator&&window.isSecureContext){
  window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js',{scope:'./',updateViaCache:'none'}).then(registration=>registration.update()).catch(()=>{
   document.getElementById('install-status').textContent='離線功能暫未啟用；可連網使用，稍後重新開啟再試。';
  }));
 }
})();
