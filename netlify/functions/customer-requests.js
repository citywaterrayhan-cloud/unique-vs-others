const GOOGLE_SHEET_API =
  "https://script.google.com/macros/s/AKfycbxmp9iqWULp2VKnZYiWnP9v3feQPylt3uUaqC_avYOacZH0uOTTYjpB58BDw9z50OfA/exec";

exports.handler = async (event) => {
  try {
    // GET — Customer Requests নেওয়া
    if (event.httpMethod === "GET") {
      const response = await fetch(GOOGLE_SHEET_API);

      const data = await response.json();

      return {
        statusCode: 200,
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(data)
      };
    }

    // POST — নতুন Customer Request পাঠানো
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

      const response = await fetch(GOOGLE_SHEET_API, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          type: "customer-request",
          ...incoming
        })
      });

      const data = await response.json();

      return {
        statusCode: response.ok ? 200 : 500,
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(data)
      };
    }

    return {
      statusCode: 405,
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        ok: false,
        message: "Method not allowed."
      })
    };

  } catch (error) {
    console.error("Customer request error:", error);

    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        ok: false,
        message: "Could not process customer request.",
        error: error.message
      })
    };
  }
};
