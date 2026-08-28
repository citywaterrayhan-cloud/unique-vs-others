const express = require("express");
const fs = require("fs");
const path = require("path");
const app = express();

const ROOT = __dirname;
const DATA = path.join(ROOT, "data.json");
const INDEX = path.join(ROOT, "index.html");

app.use(express.json({limit:"10mb"}));
app.use(express.urlencoded({extended:true, limit:"10mb"}));

function readData(){
  const raw = JSON.parse(fs.readFileSync(DATA, "utf8"));

  // Backward compatibility: older data.json files stored products as a root array.
  if (Array.isArray(raw)) {
    return {
      site: {},
      products: raw,
      settings: {},
      homepage: {},
      popup: {},
      store: {}
    };
  }

  return {
    site: raw.site || {},
    products: Array.isArray(raw.products) ? raw.products : [],
    settings: raw.settings || {},
    homepage: raw.homepage || {},
    popup: raw.popup || {},
    store: raw.store || {}
  };
}

function writeData(data){
  fs.writeFileSync(DATA, JSON.stringify(data, null, 2), "utf8");
}

function replaceOrInsert(html, regex, replacement){
  if(regex.test(html)) return html.replace(regex, replacement);
  return html;
}

function extractProductsFromIndex(){
  const html = fs.readFileSync(INDEX, "utf8");
  const match = html.match(/const\s+products\s*=\s*(\[[\s\S]*?\])\s*;/);
  if(!match) return null;

  try {
    const products = JSON.parse(match[1]);
    return Array.isArray(products) ? products : null;
  } catch {
    return null;
  }
}

/*
  Keep product data synchronized in both directions:
  - If data.json was edited manually after index.html, data.json wins.
  - If index.html product code was edited manually after data.json, its products
    are imported into data.json.
*/
function syncProductSource(){
  if(!fs.existsSync(DATA) || !fs.existsSync(INDEX)) return;

  const dataTime = fs.statSync(DATA).mtimeMs;
  const indexTime = fs.statSync(INDEX).mtimeMs;

  if(indexTime > dataTime){
    const products = extractProductsFromIndex();
    if(products){
      const data = readData();
      data.products = products;
      writeData(data);
      return;
    }
  }

  if(dataTime >= indexTime){
    applySiteData();
  }
}

function applySiteData(){
  const d = readData();
  let html = fs.readFileSync(INDEX, "utf8");

  const css = `
<style id="admin-generated-site-settings">
:root{
 --primary:${d.settings.primary || "#111111"};
 --secondary:${d.settings.secondary || "#e53935"};
 --third:${d.settings.third || "#2e7d32"};
 --fourth:${d.settings.fourth || "#6a1b9a"};
 --fifth:${d.settings.fifth || "#f9a825"};
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

  const productCode = JSON.stringify(d.products || [], null, 2);
  html = html.replace(
    /const\s+products\s*=\s*\[[\s\S]*?\];/,
    "const products = " + productCode + ";"
  );

  fs.writeFileSync(INDEX, html, "utf8");
  return html;
}

function escapeHtml(s){
  return String(s ?? "").replace(/[&<>"']/g, c =>
    ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])
  );
}
function escapeAttr(s){ return escapeHtml(s); }

// IMPORTANT: these routes come before express.static so data.json edits
// are synchronized before index.html is served.
app.get(["/", "/index.html"], (req, res) => {
  try {
    syncProductSource();
    res.sendFile(INDEX);
  } catch (err) {
    console.error(err);
    res.status(500).send("Unable to load the store.");
  }
});

app.use(express.static(ROOT));

app.get("/api/data", (req,res)=>{
  try {
    syncProductSource();
    res.json(readData());
  } catch(err) {
    console.error(err);
    res.status(500).json({ok:false, error:"Unable to read data.json"});
  }
});

app.put("/api/data",(req,res)=>{
  try {
    const current = readData();
    const incoming = req.body || {};

    const merged = {
      site: {...current.site, ...(incoming.site || {})},
      products: Array.isArray(incoming.products) ? incoming.products : current.products,
      settings: {...current.settings, ...(incoming.settings || {})},
      homepage: {...current.homepage, ...(incoming.homepage || {})},
      popup: {...current.popup, ...(incoming.popup || {})},
      store: {...current.store, ...(incoming.store || {})}
    };

    writeData(merged);
    applySiteData();

    res.json({
      ok:true,
      message:"Saved to data.json and index.html updated.",
      data:merged
    });
  } catch(err) {
    console.error(err);
    res.status(500).json({ok:false, error:"Unable to save data.json"});
  }
});

app.post("/api/regenerate",(req,res)=>{
  try {
    applySiteData();
    res.json({ok:true, message:"Website regenerated from data.json."});
  } catch(err) {
    console.error(err);
    res.status(500).json({ok:false, error:"Unable to regenerate website"});
  }
});

app.listen(3000, ()=>console.log("Admin Panel: http://localhost:3000/admin.html"));
