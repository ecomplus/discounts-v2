'use strict'

const ecomUtils = require('@ecomplus/utils')

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

const validateCustomerId = (rule, params) => {
  if (
    typeof rule.customer_ids === 'object' &&
    rule.customer_ids &&
    !Array.isArray(rule.customer_ids)
  ) {
    const customerIds = []
    Object.keys(rule.customer_ids).forEach((key) => {
      if (rule.customer_ids[key]) {
        customerIds.push(rule.customer_ids[key])
      }
    })
    rule.customer_ids = customerIds
  }
  if (
    Array.isArray(rule.customer_ids) &&
    rule.customer_ids.length &&
    rule.customer_ids.indexOf(params.customer && params.customer._id) === -1
  ) {
    // unavailable for current customer
    return false
  }
  return true
}

const matchFreebieRule = (rule, params = {}) => {
  const coupon = params.discount_coupon
  const utm = params.utm && params.utm.campaign
  if (rule.domain && rule.domain !== params.domain) {
    return false
  }
  if (rule.freebie_coupon && rule.freebie_utm) {
    return coupon?.toUpperCase() === rule.freebie_coupon?.toUpperCase() || (utm?.toUpperCase() === rule.freebie_utm?.toUpperCase())
  }
  if (rule.freebie_coupon) {
    return coupon?.toUpperCase() === rule.freebie_coupon?.toUpperCase()
  }
  if (rule.freebie_utm) {
    return (utm?.toUpperCase() === rule.freebie_utm?.toUpperCase())
  }
  return !rule.domain || rule.domain === params.domain
}

const checkOpenPromotion = rule => {
  return !rule.discount_coupon && !rule.utm_campaign &&
    (!Array.isArray(rule.customer_ids) || !rule.customer_ids.length)
}

const getValidDiscountRules = (discountRules, params, items) => {
  if (Array.isArray(discountRules) && discountRules.length) {
    // validate rules objects
    return discountRules.filter(rule => {
      if (!rule || !validateCustomerId(rule, params)) {
        return false
      }
      if ((Array.isArray(rule.product_ids) || (Array.isArray(rule.category_ids))) && Array.isArray(items)) {
        const checkProductId = item => {
          if (!(rule.product_ids && rule.product_ids.length) && Array.isArray(rule.category_ids) && rule.category_ids.length) {
            if (Array.isArray(item.categories)) {
              for (let i = 0; i < item.categories.length; i++) {
                const category = item.categories[i]
                if (rule.category_ids.indexOf(category._id) > -1) {
                  return true
                }
              }
            }
            return false
          }
          return (!(rule.product_ids && rule.product_ids.length) || rule.product_ids.indexOf(item.product_id) > -1)
        }
        // set/add discount value from lowest item price
        let value
        if (rule.discount_lowest_price) {
          items.forEach(item => {
            const price = ecomUtils.price(item)
            if (price > 0 && checkProductId(item) && (!value || value > price)) {
              value = price
            }
          })
        } else if (rule.discount_kit_subtotal) {
          value = 0
          items.forEach(item => {
            const price = ecomUtils.price(item)
            if (price > 0 && checkProductId(item)) {
              value += price * item.quantity
            }
          })
        }
        console.log('log for buy together', value)
        if (value) {
          if (rule.discount && rule.discount.value) {
            if (rule.discount.type === 'percentage') {
              value *= rule.discount.value / 100
            } else {
              if (rule.discount_kit_subtotal) {
                value = rule.discount.value
              } else {
                value = Math.min(value, rule.discount.value)
              }
            }
          }
          rule.originalDiscount = rule.discount
          rule.discount = {
            ...rule.discount,
            type: 'fixed',
            value
          }
        }
      } else if ((Array.isArray(rule.category_ids)) && Array.isArray(params.items)) {
        const categoryIds = rule.category_ids
        let value = 0
        params.items.forEach(item => {
          const validCategory = item.categories?.find(category => categoryIds.includes(category._id))
          const price = ecomUtils.price(item)
          if (price > 0 && validCategory) {
            value += price * item.quantity
          }
        })
        if (value) {
          if (rule.discount && rule.discount.value) {
            if (rule.discount.type === 'percentage') {
              value *= rule.discount.value / 100
            } else {
              value = Math.min(value, rule.discount.value)
            }
          }
          rule.originalDiscount = rule.discount
          rule.discount = {
            ...rule.discount,
            type: 'fixed',
            value
          }
        } else {
          return false
        }
      }

      if (!rule.discount || !rule.discount.value) {
        return false
      }

      return validateDateRange(rule)
    })
  }

  // returns array anyway
  return []
}

const matchDiscountRule = (discountRules, params = {}, skipApplyAt) => {
  const filteredRules = skipApplyAt
    ? discountRules.filter((rule) => {
      const applyAt = (rule.discount && rule.discount.apply_at) || 'total'
      return applyAt !== skipApplyAt
    })
    : discountRules
  // try to match a promotion
  if (params.discount_coupon) {
    // match only by discount coupon
    return {
      discountRule: filteredRules.find(rule => {
        const hasDiscountDomain = !rule.domain || (rule.domain === params.domain)
        return rule.case_insensitive
          ? typeof rule.discount_coupon === 'string' &&
            rule.discount_coupon.toUpperCase() === params.discount_coupon.toUpperCase() &&
            hasDiscountDomain
          : rule.discount_coupon === params.discount_coupon &&
            hasDiscountDomain
      }),
      discountMatchEnum: 'COUPON'
    }
  }

  // try to match by UTM campaign first
  if (params.utm && params.utm.campaign) {
    const discountRule = filteredRules.find(rule => {
      const hasDiscountDomain = !rule.domain || (rule.domain === params.domain)
      return rule.case_insensitive
        ? typeof rule.utm_campaign === 'string' &&
          rule.utm_campaign.toUpperCase() === params.utm.campaign.toUpperCase() &&
          hasDiscountDomain
        : rule.utm_campaign === params.utm.campaign &&
          hasDiscountDomain
    })
    if (discountRule) {
      return {
        discountRule,
        discountMatchEnum: 'UTM'
      }
    }
  }

  // then try to match by customer
  if (params.customer && params.customer._id) {
    const discountRule = filteredRules.find(rule => {
      const hasDiscountDomain = !rule.domain || (rule.domain === params.domain)
      return Array.isArray(rule.customer_ids) &&
      rule.customer_ids.indexOf(params.customer._id) > -1 &&
      hasDiscountDomain
    })
    if (discountRule) {
      return {
        discountRule,
        discountMatchEnum: 'CUSTOMER'
      }
    }
  }

  // then try to match by domain
  if (params.domain) {
    const discountRule = filteredRules.find(rule => {
      return rule.domain === params.domain
    })
    if (discountRule) {
      return {
        discountRule,
        discountMatchEnum: 'STORE_DOMAIN'
      }
    }
  }

  // last try to match by open promotions
  return {
    discountRule: filteredRules.find(checkOpenPromotion),
    discountMatchEnum: 'OPEN'
  }
}

const checkCampaignProducts = (campaignProducts, params) => {
  if (Array.isArray(campaignProducts) && campaignProducts.length) {
    // must check at least one campaign product on cart
    let hasProductMatch
    if (params.items && params.items.length) {
      for (let i = 0; i < campaignProducts.length; i++) {
        if (params.items.find(item => item.quantity && item.product_id === campaignProducts[i])) {
          hasProductMatch = true
          break
        }
      }
    }
    if (!hasProductMatch) {
      return false
    }
  }
  return true
}

module.exports = {
  validateDateRange,
  validateCustomerId,
  checkOpenPromotion,
  getValidDiscountRules,
  matchDiscountRule,
  matchFreebieRule,
  checkCampaignProducts
}
