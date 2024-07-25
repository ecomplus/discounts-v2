const getAppData = require('../lib/store-api/get-app-data')
const { validateDateRange } = require('../lib/helpers')

const checkValidRule = (rule, domain) => {
  return Boolean(
    validateDateRange(rule) &&
      rule.domain === domain &&
      !rule.utm_campaign &&
      !rule.customer_ids?.length &&
      !rule.discount_coupon
  )
}

exports.get = async ({ appSdk }, req, res) => {
  const storeId = Number(req.query?.store_id || 0)
  const origin = req.headers.origin
  let domain = origin
  if (!origin || origin.includes('localhost') || origin.includes('127.0.0.1')) {
    domain = req.query?.domain
  }

  if (!domain) {
    return res.status(400)
      .send({ message: 'Parameter "domain" not found' })
  }

  domain = domain.replace(/^(https?:\/\/)?([^:/]+).*/, '$2')

  if (storeId > 100) {
    const appData = await appSdk.getAuth(storeId)
      .then(auth => getAppData({ appSdk, storeId, auth }))
      .catch(console.error)

    const discountRules = appData?.discount_rules || []
    const productKitDiscounts = appData?.product_kit_discounts || []
    const freebiesRules = appData?.freebies_rules || []

    return res.send({
      domain,
      discount_rules: discountRules.filter((rule) => checkValidRule(rule, domain)),
      product_kit_discounts: productKitDiscounts.filter((rule) => checkValidRule(rule, domain)),
      freebies_rules: freebiesRules.filter((rule) => checkValidRule(rule, domain))
    })
  }

  return res.status(400)
    .send({ message: 'Parameter "store_id" not found' })
}
