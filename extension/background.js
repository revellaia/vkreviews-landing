// Proxies the /api/import call so it runs in extension context (no CORS issues)
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type !== 'IMPORT_REVIEWS') return

  const { reviews, shopifyStore, shopifyToken, productHandle, vkApiUrl } = msg
  const apiUrl = (vkApiUrl || 'https://vkreviews-app.vercel.app') + '/api/import'

  fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reviews, shopifyStore, shopifyToken, productHandle }),
  })
    .then(r => r.json())
    .then(data => sendResponse({ ok: true, data }))
    .catch(err => sendResponse({ ok: false, error: err.message }))

  return true // keep message channel open for async response
})
