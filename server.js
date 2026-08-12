
const express = require("express");
const fs = require("fs");
const path = require("path");
const app = express();

const ROOT = __dirname;
const DATA = path.join(ROOT, "data.json");
const INDEX = path.join(ROOT, "index.html");

app.use(express.json({limit:"10mb"}));
app.use(express.urlencoded({extended:true, limit:"10mb"}));
app.use(express.static(ROOT));

function readData(){ return JSON.parse(fs.readFileSync(DATA,"utf8")); }
function writeData(data){ fs.writeFileSync(DATA, JSON.stringify(data,null,2), "utf8"); }

function replaceOrInsert(html, regex, replacement){
  if(regex.test(html)) return html.replace(regex, replacement);
  return html;
}

/*
  This generator updates the actual index.html, so changes made in Admin
  become real code changes instead of only browser localStorage changes.
*/
function applySiteData(){
  const d = readData();
  let html = fs.readFileSync(INDEX,"utf8");

  const css = `
<style id="admin-generated-site-settings">
:root{
 --primary:${d.settings.primary};
 --secondary:${d.settings.secondary};
 --third:${d.settings.third};
 --fourth:${d.settings.fourth};
 --fifth:${d.settings.fifth};
}
</style>`;

  html = html.replace(/<style id="admin-generated-site-settings">[\s\S]*?<\/style>/, "");
  html = html.replace("</head>", css + "\n</head>");

  html = replaceOrInsert(html, /(<div class="delivery-message">)[\s\S]*?(<\/div>)/,
    `$1${escapeHtml(d.site.deliveryText)}$2`);

  html = html.replace(/\(YOUR FACEBOOK LINK HERE\)/g, escapeAttr(d.site.facebook));
  html = html.replace(/\(YOUR INSTAGRAM LINK HERE\)/g, escapeAttr(d.site.instagram));
  html = html.replace(/\(YOUR TIKTOK LINK HERE\)/g, escapeAttr(d.site.tiktok));
  html = html.replace(/\(YOUR VIDEO HERE\)/g, escapeAttr(d.site.footerVideo));

  // Keep the website product database in sync with Admin Panel data.
  // The store uses `const products = [...]` directly in index.html.
  const productCode = JSON.stringify(d.products || [], null, 2);
  html = html.replace(/const\s+products\s*=\s*\[[\s\S]*?\];/, "const products = " + productCode + ";");

  fs.writeFileSync(INDEX, html, "utf8");
  return html;
}

function escapeHtml(s){
  return String(s ?? "").replace(/[&<>"']/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}
function escapeAttr(s){ return escapeHtml(s); }

app.get("/api/data",(req,res)=>res.json(readData()));

app.put("/api/data",(req,res)=>{
  const current = readData();
  const incoming = req.body || {};
  const merged = {
    site: {...current.site, ...(incoming.site||{})},
    products: Array.isArray(incoming.products) ? incoming.products : current.products,
    settings: {...current.settings, ...(incoming.settings||{})},
    homepage: {...(current.homepage||{}), ...(incoming.homepage||{})},
    popup: {...(current.popup||{}), ...(incoming.popup||{})},
    store: {...(current.store||{}), ...(incoming.store||{})}
  };
  writeData(merged);
  applySiteData();
  res.json({ok:true, message:"Saved and index.html updated.", data:merged});
});

app.post("/api/regenerate",(req,res)=>{
  applySiteData();
  res.json({ok:true, message:"Website code regenerated from admin settings."});
});

app.listen(3000, ()=>console.log("Admin Panel: http://localhost:3000/admin.html"));
