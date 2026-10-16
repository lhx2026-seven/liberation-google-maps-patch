const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = __dirname;
http.createServer((req,res)=>{
 const pathname = new URL(req.url,'http://localhost').pathname;
 const file = path.join(root, pathname === '/' ? 'index.html' : pathname);
 if (!['index.html','app.js','style.css'].includes(path.relative(root,file))) {res.writeHead(404);res.end('Not found');return;}
 fs.readFile(file,(err,data)=>{if(err){res.writeHead(404);res.end('Not found');return;}res.setHeader('Content-Type',({'html':'text/html; charset=utf-8','js':'text/javascript; charset=utf-8','css':'text/css; charset=utf-8'})[file.split('.').pop()]);res.end(data);});
}).listen(process.env.PORT || 3000,'0.0.0.0',()=>console.log('ROAM listening on port '+(process.env.PORT || 3000)));
