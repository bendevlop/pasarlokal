// Cloudflare Worker: endpoint pengiriman push OneSignal.
// Set Worker secrets: ONESIGNAL_APP_ID, ONESIGNAL_REST_API_KEY, INTERNAL_TOKEN.
// Panggil hanya dari backend tepercaya; jangan panggil endpoint ini langsung dari frontend.
export default {
  async fetch(request, env) {
    const cors = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Content-Type": "application/json"
    };
    if (request.method === "OPTIONS") return new Response(null, { headers: cors });
    if (request.method !== "POST") return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: cors });
    // This bearer token must only be used by a trusted server, never embedded in app JavaScript.
    if (!env.INTERNAL_TOKEN || request.headers.get("Authorization") !== `Bearer ${env.INTERNAL_TOKEN}`)
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: cors });
    if (!env.ONESIGNAL_APP_ID || !env.ONESIGNAL_REST_API_KEY)
      return new Response(JSON.stringify({ error: "OneSignal Worker secrets belum diatur" }), { status: 500, headers: cors });
    let body; try { body = await request.json(); } catch { return new Response(JSON.stringify({ error: "JSON tidak valid" }), { status: 400, headers: cors }); }
    const { title, message, externalId, url } = body || {};
    if (!title || !message || !externalId) return new Response(JSON.stringify({ error: "title, message, dan externalId wajib" }), { status: 400, headers: cors });
    const payload = { app_id: env.ONESIGNAL_APP_ID, target_channel: "push", include_aliases: { external_id: [String(externalId)] }, headings: { id: String(title).slice(0, 100) }, contents: { id: String(message).slice(0, 500) }, url: url || undefined };
    const response = await fetch("https://api.onesignal.com/notifications", { method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Key ${env.ONESIGNAL_REST_API_KEY}` }, body: JSON.stringify(payload) });
    const result = await response.json().catch(() => ({}));
    return new Response(JSON.stringify(result), { status: response.status, headers: cors });
  }
};
