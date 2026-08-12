const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();

const ROOT = __dirname;
const DATA = path.join(ROOT, "data.json");
const INDEX = path.join(ROOT, "index.html");

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(express.static(ROOT));

/* =========================================================
   DATA HELPERS
========================================================= */

function readData() {
  try {
    if (!fs.existsSync(DATA)) {
      const initialData = {
        site: {},
        products: [],
        settings: {},
        homepage: {},
        popup: {},
        store: {},
        orders: [],
        customerRequests: []
      };

      fs.writeFileSync(
        DATA,
        JSON.stringify(initialData, null, 2),
        "utf8"
      );

      return initialData;
    }

    const data = JSON.parse(fs.readFileSync(DATA, "utf8"));

    return {
      site: data.site || {},
      products: Array.isArray(data.products) ? data.products : [],
      settings: data.settings || {},
      homepage: data.homepage || {},
      popup: data.popup || {},
      store: data.store || {},
      orders: Array.isArray(data.orders) ? data.orders : [],
      customerRequests: Array.isArray(data.customerRequests)
        ? data.customerRequests
        : []
    };
  } catch (error) {
    console.error("readData error:", error);

    return {
      site: {},
      products: [],
      settings: {},
      homepage: {},
      popup: {},
      store: {},
      orders: [],
      customerRequests: []
    };
  }
}

function writeData(data) {
  fs.writeFileSync(
    DATA,
    JSON.stringify(data, null, 2),
    "utf8"
  );
}

/* =========================================================
   SECURITY / HTML HELPERS
========================================================= */

function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[c]));
}

function escapeAttr(s) {
  return escapeHtml(s);
}

/* =========================================================
   WEBSITE GENERATOR
========================================================= */

function applySiteData() {
  const d = readData();

  if (!fs.existsSync(INDEX)) {
    throw new Error("index.html not found");
  }

  let html = fs.readFileSync(INDEX, "utf8");

  const css = `
<style id="admin-generated-site-settings">
:root {
  --primary: ${d.settings?.primary || "#111111"};
  --secondary: ${d.settings?.secondary || "#d90429"};
  --third: ${d.settings?.third || "#16a34a"};
  --fourth: ${d.settings?.fourth || "#7c3aed"};
  --fifth: ${d.settings?.fifth || "#eab308"};
}
</style>`;

  /* Remove previously generated admin CSS */
  html = html.replace(
    /<style id="admin-generated-site-settings">[\s\S]*?<\/style>/g,
    ""
  );

  /* Add latest admin CSS */
  html = html.replace(
    "</head>",
    css + "\n</head>"
  );

  /* Delivery message */
  html = html.replace(
    /(<div class="delivery-message">)[\s\S]*?(<\/div>)/,
    `$1${escapeHtml(d.site?.deliveryText || "")}$2`
  );

  /* Social links */
  html = html.replace(
    /\(YOUR FACEBOOK LINK HERE\)/g,
    escapeAttr(d.site?.facebook || "")
  );

  html = html.replace(
    /\(YOUR INSTAGRAM LINK HERE\)/g,
    escapeAttr(d.site?.instagram || "")
  );

  html = html.replace(
    /\(YOUR TIKTOK LINK HERE\)/g,
    escapeAttr(d.site?.tiktok || "")
  );

  /* Footer video */
  html = html.replace(
    /\(YOUR VIDEO HERE\)/g,
    escapeAttr(d.site?.footerVideo || "")
  );

  /* Product data */
  const productCode = JSON.stringify(
    d.products || [],
    null,
    2
  );

  html = html.replace(
    /const\s+products\s*=\s*\[[\s\S]*?\];/,
    "const products = " + productCode + ";"
  );

  fs.writeFileSync(
    INDEX,
    html,
    "utf8"
  );

  return html;
}

/* =========================================================
   BASIC API
========================================================= */

app.get("/api/data", (req, res) => {
  try {
    const data = readData();

    res.json(data);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      ok: false,
      message: "Could not read data.json"
    });
  }
});

/* =========================================================
   ADMIN SAVE API
   Keeps existing products/site/settings/etc.
   Also keeps orders and customer requests.
========================================================= */

app.put("/api/data", (req, res) => {
  try {
    const current = readData();
    const incoming = req.body || {};

    const merged = {
      site: {
        ...(current.site || {}),
        ...(incoming.site || {})
      },

      products: Array.isArray(incoming.products)
        ? incoming.products
        : (current.products || []),

      settings: {
        ...(current.settings || {}),
        ...(incoming.settings || {})
      },

      homepage: {
        ...(current.homepage || {}),
        ...(incoming.homepage || {})
      },

      popup: {
        ...(current.popup || {}),
        ...(incoming.popup || {})
      },

      store: {
        ...(current.store || {}),
        ...(incoming.store || {})
      },

      /* IMPORTANT:
         Orders are NOT overwritten by Admin Save.
      */
      orders: Array.isArray(incoming.orders)
        ? incoming.orders
        : (current.orders || []),

      /* IMPORTANT:
         Customer requests are NOT overwritten by Admin Save.
      */
      customerRequests: Array.isArray(incoming.customerRequests)
        ? incoming.customerRequests
        : (current.customerRequests || [])
    };

    writeData(merged);

    applySiteData();

    res.json({
      ok: true,
      message: "Saved and index.html updated.",
      data: merged
    });

  } catch (error) {
    console.error("Save error:", error);

    res.status(500).json({
      ok: false,
      message: "Save failed.",
      error: error.message
    });
  }
});

/* =========================================================
   REGENERATE WEBSITE
========================================================= */

app.post("/api/regenerate", (req, res) => {
  try {
    applySiteData();

    res.json({
      ok: true,
      message: "Website code regenerated from admin settings."
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      ok: false,
      message: "Regeneration failed.",
      error: error.message
    });
  }
});

/* =========================================================
   ORDER API
   Website → Backend → data.json → Admin Panel
========================================================= */

app.post("/api/orders", (req, res) => {
  try {
    const data = readData();

    const incoming = req.body || {};

    if (!incoming.customer) {
      return res.status(400).json({
        ok: false,
        message: "Customer name is required."
      });
    }

    if (!incoming.phone) {
      return res.status(400).json({
        ok: false,
        message: "Customer phone is required."
      });
    }

    const order = {
      ...incoming,

      serverReceivedAt: new Date().toISOString(),

      status: incoming.status || "Received"
    };

    data.orders.push(order);

    writeData(data);

    res.json({
      ok: true,
      message: "Order saved successfully.",
      order
    });

  } catch (error) {
    console.error("Order save error:", error);

    res.status(500).json({
      ok: false,
      message: "Could not save order.",
      error: error.message
    });
  }
});

/* =========================================================
   GET ORDERS
========================================================= */

app.get("/api/orders", (req, res) => {
  try {
    const data = readData();

    res.json({
      ok: true,
      orders: data.orders || []
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      ok: false,
      message: "Could not load orders."
    });
  }
});

/* =========================================================
   UPDATE ORDER STATUS
========================================================= */

app.put("/api/orders/:orderId", (req, res) => {
  try {
    const data = readData();

    const orderId = String(req.params.orderId);

    const order = data.orders.find(
      x =>
        String(x.orderId) === orderId ||
        String(x.orderNo) === orderId
    );

    if (!order) {
      return res.status(404).json({
        ok: false,
        message: "Order not found."
      });
    }

    if (req.body.status) {
      order.status = req.body.status;
    }

    order.updatedAt = new Date().toISOString();

    writeData(data);

    res.json({
      ok: true,
      message: "Order updated.",
      order
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      ok: false,
      message: "Could not update order."
    });
  }
});

/* =========================================================
   CUSTOMER PRODUCT REQUEST API
========================================================= */

app.post("/api/customer-requests", (req, res) => {
  try {
    const data = readData();

    const incoming = req.body || {};

    if (!incoming.name) {
      return res.status(400).json({
        ok: false,
        message: "Customer name is required."
      });
    }

    if (!incoming.phone) {
      return res.status(400).json({
        ok: false,
        message: "Customer phone is required."
      });
    }

    const request = {
      ...incoming,

      requestId:
        incoming.requestId ||
        "REQ-" +
          Date.now().toString(36).toUpperCase(),

      serverReceivedAt: new Date().toISOString(),

      status: incoming.status || "Received"
    };

    data.customerRequests.push(request);

    writeData(data);

    res.json({
      ok: true,
      message: "Customer request saved successfully.",
      request
    });

  } catch (error) {
    console.error("Customer request error:", error);

    res.status(500).json({
      ok: false,
      message: "Could not save customer request.",
      error: error.message
    });
  }
});

/* =========================================================
   GET CUSTOMER REQUESTS
========================================================= */

app.get("/api/customer-requests", (req, res) => {
  try {
    const data = readData();

    res.json({
      ok: true,
      requests: data.customerRequests || []
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      ok: false,
      message: "Could not load customer requests."
    });
  }
});

/* =========================================================
   UPDATE CUSTOMER REQUEST STATUS
========================================================= */

app.put("/api/customer-requests/:requestId", (req, res) => {
  try {
    const data = readData();

    const requestId = String(req.params.requestId);

    const request = data.customerRequests.find(
      x => String(x.requestId) === requestId
    );

    if (!request) {
      return res.status(404).json({
        ok: false,
        message: "Customer request not found."
      });
    }

    if (req.body.status) {
      request.status = req.body.status;
    }

    request.updatedAt = new Date().toISOString();

    writeData(data);

    res.json({
      ok: true,
      message: "Customer request updated.",
      request
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      ok: false,
      message: "Could not update customer request."
    });
  }
});

/* =========================================================
   SERVER
========================================================= */

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(
    `Admin Panel running on port ${PORT}`
  );
});
