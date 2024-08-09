const ecomUtils = require('@ecomplus/utils')

const getDiscountedPrice = (item, discountMultiplier) => {
  return parseInt(ecomUtils.price(item) * discountMultiplier * 100, 10) / 100
}

exports.post = async ({ appSdk }, req, res) => {
  const storeId = Number(req.query?.store_id)
  if (!(storeId > 100)) {
    return res.send(417)
  }
  const { body } = req
  if (!body?.order?.items) {
    return res.send(400)
  }
  const {
    order: {
      items,
      amount,
      extra_discount: extraDiscount
    }
  } = body
  if (!extraDiscount?.value || !amount?.subtotal) {
    return res.send({ items })
  }
  if (!extraDiscount.app?.description) {
    const discountMultiplier = extraDiscount.value / amount.subtotal
    return res.send({
      items: items.map((item) => ({
        ...item,
        final_price: getDiscountedPrice(item, discountMultiplier)
      }))
    })
  }
  const lines = extraDiscount.app.description.split('\n')
  while (lines[0] !== '---') lines.shift()
  lines.shift()
  lines.forEach((line) => {
    if (!line) return
    const [sku, discountStr] = line.split(': ')
    if (!sku || !Number(discountStr)) return
    let skuQnt = 0
    items.forEach((item) => {
      if (item.sku === sku && item.quantity) skuQnt += item.quantity
    })
    if (skuQnt) {
      const discountMultiplier = Number(discountStr) / skuQnt
      items.forEach((item) => {
        if (item.sku === sku) {
          item.final_price = getDiscountedPrice(item, discountMultiplier)
        }
      })
    }
  })
  return res.send({ items })
}
