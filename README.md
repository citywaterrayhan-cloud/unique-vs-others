# Unique vs Others — Professional Admin Panel (Fixed Product Sync)

This version fixes the product sync issue: when you edit/add/delete a product in Admin Panel and click **Save & Update Code**, the `const products = [...]` database inside `index.html` is regenerated from `data.json`.

## Run
1. Install Node.js LTS.
2. Open this folder in CMD.
3. Run `npm install`.
4. Run `node server.js`.
5. Open `http://localhost:3000/admin.html`.

## Product workflow
Products -> Add/Edit -> Update Product -> **Save & Update Code** -> View Store.

The package starts with the existing products from the supplied website.

## Live Netlify
A static Netlify deployment cannot write its own files. For live automatic updates, connect this backend to GitHub/Netlify deployment or a database/API.
