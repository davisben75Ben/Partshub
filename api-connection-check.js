// PartsHub AutoPartsAPI readiness check.
// Import checkAutoPartsApiConfiguration into the Cloudflare Worker router.
// This deliberately does not guess undocumented provider endpoints or expose credentials.
export function checkAutoPartsApiConfiguration(env) {
  return new Response(JSON.stringify({
    provider: "AutoPartsAPI",
    secretConfigured: Boolean(env.AUTOPARTS_API_KEY),
    liveRequestTested: false,
    status: env.AUTOPARTS_API_KEY ? "ready_for_endpoint_validation" : "missing_secret",
    nextStep: "Verify provider base URL, authentication header, and part-number lookup endpoint from official account documentation."
  }), {
    status: 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}
