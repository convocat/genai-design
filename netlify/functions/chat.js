// Netlify serverless function: proxies chat requests to Anthropic or OpenAI
// API keys are read from environment variables — never exposed to the client.

export async function handler(event) {
  // Only allow POST
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  // CORS headers for local dev
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  };

  // Handle preflight
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers, body: "" };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: "Invalid JSON" }) };
  }

  const { provider, model, messages, system, temperature, max_tokens } = body;

  if (!provider || !model || !messages) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: "Missing required fields: provider, model, messages" }),
    };
  }

  try {
    if (provider === "anthropic") {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        return { statusCode: 500, headers, body: JSON.stringify({ error: "Anthropic API key not configured on the server." }) };
      }

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model,
          max_tokens: max_tokens || 1500,
          temperature: temperature ?? 0.3,
          system: system || "",
          messages,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          statusCode: response.status,
          headers,
          body: JSON.stringify({ error: data.error?.message || `Anthropic error ${response.status}` }),
        };
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ text: data.content?.[0]?.text || "No response" }),
      };

    } else if (provider === "openai") {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        return { statusCode: 500, headers, body: JSON.stringify({ error: "OpenAI API key not configured on the server." }) };
      }

      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          max_tokens: max_tokens || 1500,
          temperature: temperature ?? 0.3,
          messages: [
            ...(system ? [{ role: "system", content: system }] : []),
            ...messages,
          ],
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          statusCode: response.status,
          headers,
          body: JSON.stringify({ error: data.error?.message || `OpenAI error ${response.status}` }),
        };
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ text: data.choices?.[0]?.message?.content || "No response" }),
      };

    } else {
      return { statusCode: 400, headers, body: JSON.stringify({ error: `Unknown provider: ${provider}` }) };
    }

  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message || "Internal server error" }),
    };
  }
}
