
const { getStore } = require("@netlify/blobs");

exports.handler = async (event) => {
  try {
    const store = getStore("customer-requests");

    // GET = সব customer request দেখাবে
    if (event.httpMethod === "GET") {
      const requests =
        (await store.get("requests", { type: "json" })) || [];

      return {
        statusCode: 200,
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          ok: true,
          requests
        })
      };
    }

    // POST = নতুন customer request save করবে
    if (event.httpMethod === "POST") {
      const incoming = JSON.parse(event.body || "{}");

      if (!incoming.name) {
        return {
          statusCode: 400,
          body: JSON.stringify({
            ok: false,
            message: "Customer name is required."
          })
        };
      }

      if (!incoming.phone) {
        return {
          statusCode: 400,
          body: JSON.stringify({
            ok: false,
            message: "Customer phone is required."
          })
        };
      }

      const requests =
        (await store.get("requests", { type: "json" })) || [];

      const request = {
        ...incoming,
        requestId:
          incoming.requestId ||
          "REQ-" + Date.now().toString(36).toUpperCase(),
        status: incoming.status || "Received",
        serverReceivedAt: new Date().toISOString()
      };

      requests.push(request);

      await store.setJSON("requests", requests);

      return {
        statusCode: 200,
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          ok: true,
          message: "Customer request saved successfully.",
          request
        })
      };
    }

    return {
      statusCode: 405,
      body: JSON.stringify({
        ok: false,
        message: "Method not allowed."
      })
    };
  } catch (error) {
    console.error("Customer request error:", error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        ok: false,
        message: "Could not process customer request.",
        error: error.message
      })
    };
  }
};
