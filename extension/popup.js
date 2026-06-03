const fields = ['shopifyStore', 'shopifyToken', 'productHandle', 'vkApiUrl']

// Load saved values on open
chrome.storage.local.get(fields, (data) => {
  fields.forEach(key => {
    if (data[key]) document.getElementById(key).value = data[key]
  })
})

document.getElementById('saveBtn').addEventListener('click', () => {
  const values = {}
  fields.forEach(key => {
    values[key] = document.getElementById(key).value.trim()
  })

  chrome.storage.local.set(values, () => {
    const status = document.getElementById('status')
    status.textContent = 'Salvo!'
    setTimeout(() => { status.textContent = '' }, 2000)
  })
})
