const getAppData = require('../lib/store-api/get-app-data')

const validateDateRange = rule => {
  // filter campaings by date
  const timestamp = Date.now()
  if (rule.date_range) {
    if (rule.date_range.start && new Date(rule.date_range.start).getTime() > timestamp) {
      return false
    }
    if (rule.date_range.end && new Date(rule.date_range.end).getTime() < timestamp) {
      return false
    }
  }
  return true
}

const checkCampaign = (rules, domain) => {
  let i = 0
  while (i < rules?.length) {
    const rule = rules[i]
    if (
      (!rule.domain || !new RegExp(`^(https?://)?${rule.domain}$`).test(domain) || !validateDateRange(rule)) ||
      (!rule.product_ids?.length && !rule.category_ids?.length && !rule.excluded_product_ids?.length) ||
      ((rule.utm_campaign || (rule.customer_ids && rule.customer_ids.length) || rule.discount_coupon))
    ) {
      rules.splice(i, 1)
    } else {
      i++
    }
  }
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

  if (storeId > 100) {
    const appData = await appSdk.getAuth(storeId)
      .then(auth => getAppData({ appSdk, storeId, auth }))
      .catch(console.error)

    let discountRules
    let productKitDiscounts
    let freebiesRules

    if (appData) {
      discountRules = appData.discount_rules
      productKitDiscounts = appData.product_kit_discounts
      freebiesRules = appData.freebies_rules

      checkCampaign(discountRules, domain)
      checkCampaign(productKitDiscounts, domain)
      checkCampaign(freebiesRules, domain)
    }

    return res.send({
      domain,
      discount_rules: discountRules || [],
      product_kit_discounts: productKitDiscounts || [],
      freebies_rules: freebiesRules || []
    })
  }

  return res.status(400)
    .send({ message: 'Parameter "store_id" not found' })
}
