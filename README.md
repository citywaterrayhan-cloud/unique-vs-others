# Unique vs Others

## Website + Admin Panel

`data.json` is the main product database. `index.html` does not contain the product list; it loads products from `data.json` when the website is served.

### Run locally
1. Install Node.js LTS.
2. Double-click `Start Admin Panel.bat`.
3. The website opens at `http://localhost:3000/`.
4. The Admin Panel opens at `http://localhost:3000/admin.html`.
5. Keep the black server window open while using the website/admin panel.

**Important:** Do not double-click `index.html` directly. Modern browsers block JavaScript from fetching a local JSON file when an HTML file is opened with `file://`. Use the BAT launcher/server instead.

### Netlify/static hosting
Deploy the whole folder. The website loads `data.json` directly from the same folder.
