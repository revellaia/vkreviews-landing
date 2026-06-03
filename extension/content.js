// Injeta botao de importacao nas paginas de produto da Shopee
;(function () {
  if (!location.href.match(/shopee\.com\.br\/.*-i\.\d+\.\d+/) &&
      !location.href.match(/shopee\.com\.br\/product\/\d+\/\d+/)) return

  if (document.getElementById('vk-reviews-btn')) return

  const btn = document.createElement('button')
  btn.id = 'vk-reviews-btn'
  btn.textContent = 'Importar Reviews'
  Object.assign(btn.style, {
    position: 'fixed',
    bottom: '24px',
    right: '24px',
    zIndex: '999999',
    background: '#f59e0b',
    color: '#000',
    border: 'none',
    borderRadius: '10px',
    padding: '12px 20px',
    fontSize: '14px',
    fontWeight: '700',
    cursor: 'pointer',
    boxShadow: '0 4px 20px rgba(245,158,11,0.4)',
    fontFamily: '-apple-system, sans-serif',
    transition: 'opacity 0.2s',
  })

  document.body.appendChild(btn)

  btn.addEventListener('click', async () => {
    chrome.storage.local.get(
      ['shopifyStore', 'shopifyToken', 'productHandle', 'vkApiUrl'],
      async (config) => {
        if (!config.shopifyStore || !config.shopifyToken || !config.productHandle) {
          alert('Configure a extensao primeiro:\nClique no icone VK Reviews na barra do Chrome e preencha os dados.')
          return
        }

        setBtn('Extraindo reviews...', '#64748b', true)

        let reviews
        try {
          reviews = await extractReviews()
        } catch (err) {
          setBtn('Erro na extracao', '#ef4444', false)
          console.error('[VK Reviews] extracao:', err)
          setTimeout(reset, 3000)
          return
        }

        if (reviews.length === 0) {
          alert('Nenhum review encontrado nesta pagina.')
          reset()
          return
        }

        setBtn(`Importando ${reviews.length} reviews...`, '#3b82f6', true)

        chrome.runtime.sendMessage(
          {
            type: 'IMPORT_REVIEWS',
            reviews,
            shopifyStore: config.shopifyStore,
            shopifyToken: config.shopifyToken,
            productHandle: config.productHandle,
            vkApiUrl: config.vkApiUrl,
          },
          (response) => {
            if (!response || !response.ok || !response.data?.success) {
              const msg = response?.data?.error || response?.error || 'Erro desconhecido'
              setBtn('Erro — veja console', '#ef4444', false)
              console.error('[VK Reviews] import:', msg)
            } else {
              const { imported, withPhotos } = response.data
              setBtn(`${imported} reviews importados! (${withPhotos} com foto)`, '#22c55e', false)
            }
            setTimeout(reset, 5000)
          }
        )
      }
    )
  })

  function setBtn(text, bg, disabled) {
    btn.textContent = text
    btn.style.background = bg
    btn.disabled = disabled
    btn.style.opacity = disabled ? '0.8' : '1'
  }

  function reset() {
    btn.textContent = 'Importar Reviews'
    btn.style.background = '#f59e0b'
    btn.disabled = false
    btn.style.opacity = '1'
  }

  async function extractReviews() {
    const m = location.href.match(/i\.(\d+)\.(\d+)/)
    if (!m) throw new Error('URL de produto nao reconhecida')
    const [, shopid, itemid] = m
    let all = []

    for (let offset = 0; offset < 80; offset += 20) {
      const resp = await fetch(
        `/api/v2/item/get_ratings?itemid=${itemid}&shopid=${shopid}&type=0&limit=20&offset=${offset}&filter=0`,
        { headers: { 'x-requested-with': 'XMLHttpRequest', accept: 'application/json' } }
      )
      const d = await resp.json()
      const batch = d.data?.ratings || []
      if (batch.length === 0) break
      all = all.concat(batch)
      await new Promise(r => setTimeout(r, 800))
    }

    return all
      .filter(item => item.comment && item.comment.trim().length > 2)
      .map(item => {
        const obj = {
          author: (item.author_username || 'Comprador verificado').replace(/[<>"]/g, ''),
          rating: Math.min(5, Math.max(1, item.rating_star || 5)),
          content: item.comment.trim().replace(/[<>]/g, ''),
          date: new Date(item.ctime * 1000).toISOString().split('T')[0],
        }
        const imgs = (item.images || []).concat(item.medias || [])
        if (imgs.length > 0) {
          obj.images = imgs
            .map(img => {
              const p = img.img_path || img.url || img
              return typeof p === 'string' && p
                ? `https://down-br.img.susercontent.com/file/${p}`
                : null
            })
            .filter(Boolean)
          if (obj.images.length === 0) delete obj.images
        }
        return obj
      })
  }
})()
