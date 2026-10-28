const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = process.env.SERVE_BUILD==='1'?path.join(__dirname,'_site'):__dirname;
const base = (process.env.BASE_PATH||'').replace(/\/$/,'');
const files = new Set(['index.html','app.js','style.css','pwa.js','sw.js','manifest.webmanifest','icons/icon.svg','icons/icon-192.png','icons/icon-512.png','icons/icon-maskable-512.png','icons/apple-touch-icon.png']);
const types = {html:'text/html; charset=utf-8',js:'text/javascript; charset=utf-8',css:'text/css; charset=utf-8',webmanifest:'application/manifest+json',png:'image/png',svg:'image/svg+xml'};
http.createServer((req,res)=>{
 const pathname = new URL(req.url,'http://localhost').pathname;
 if(base&&pathname===base){res.writeHead(302,{Location:base+'/'});res.end();return;}
 if(base&&!pathname.startsWith(base+'/')){res.writeHead(404);res.end('Not found');return;}
 const relative=pathname.slice(base.length).replace(/^\//,'')||'index.html';
 if(!files.has(relative)){res.writeHead(404);res.end('Not found');return;}
 fs.readFile(path.join(root,relative),(err,data)=>{
  if(err){res.writeHead(404);res.end('Not found');return;}
  res.setHeader('Content-Type',types[relative.split('.').pop()]);
  res.setHeader('Cache-Control','no-cache');res.end(data);
 });
}).listen(process.env.PORT || 3000,'0.0.0.0',()=>console.log('Map app listening on port '+(process.env.PORT || 3000)));
