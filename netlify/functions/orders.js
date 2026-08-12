exports.handler = async (event) => {
  try {
    const { getStore } = await import("@netlify/blobs");

    const store = getStore("orders");

    // GET — সব order দেখাবে
    if (event.httpMethod === "GET") {
      const orders =
        (await store.get("orders", { type: "json" })) || [];

      return {
        statusCode: 200,
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          ok: true,
          orders
        })
      };
    }

    // POST — নতুন order save করবে
    if (event.httpMethod === "POST") {
      const incoming = JSON.parse(event.body || "{}");

      if (!incoming.customer) {
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

      const orders =
        (await store.get("orders", { type: "json" })) || [];

      const order = {
        ...incoming,
        orderId:
          incoming.orderId ||
          "ORD-" + Date.now().toString(36).toUpperCase(),
        status: incoming.status || "Received",
        serverReceivedAt: new Date().toISOString()
      };

      orders.push(order);

      await store.setJSON("orders", orders);

      return {
        statusCode: 200,
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          ok: true,
          message: "Order saved successfully.",
          order
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
    console.error("Orders function error:", error);

    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        ok: false,
        message: "Could not process order.",
        error: error.message
      })
    };
  }
};
