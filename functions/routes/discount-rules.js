const getAppData = require('../lib/store-api/get-app-data')
const { validateDateRange } = require('../lib/helpers')

const isValidRule = (rule, domain) => {
  const isInvalidRule = Boolean(
    !validateDateRange(rule) || (rule.domain && rule.domain !== domain) ||
    (!rule.product_ids?.length && !rule.category_ids?.length && !rule.excluded_product_ids?.length) ||
    ((rule.utm_campaign || (rule.customer_ids && rule.customer_ids.length) || rule.discount_coupon))
  )
  return !isInvalidRule
}

exports.get = async ({ appSdk }, req, res) => {
  const storeId = Number(req.query?.store_id || 0)
  const origin = req.headers.origin
  let domain = origin
  if (!origin || origin?.includes('localhost') || origin?.includes('127.0.0.1')) {
    domain = req.query?.domain
  }

  if (!domain) {
    return res.status(400)
      .send({ message: 'Parameter "domain" not found' })
  }

  domain = domain.replace(/https?:\/\/|:\d+/g, '')

  if (storeId > 100) {
    const appData = await appSdk.getAuth(storeId)
      .then(auth => getAppData({ appSdk, storeId, auth }))
      .catch(console.error)

    const discountRules = appData?.discount_rules || []
    const productKitDiscounts = appData?.product_kit_discounts || []
    const freebiesRules = appData?.freebies_rules || []

    return res.send({
      domain,
      discount_rules: discountRules.filter((rule) => isValidRule(rule, domain)),
      product_kit_discounts: productKitDiscounts.filter((rule) => isValidRule(rule, domain)),
      freebies_rules: freebiesRules.filter((rule) => isValidRule(rule, domain))
    })
  }

  return res.status(400)
    .send({ message: 'Parameter "store_id" not found' })
}
