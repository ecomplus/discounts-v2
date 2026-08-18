'use strict'

const assert = require('assert')
const { getCampaignDiscountAmount } = require('./helpers')

const params = {
  amount: {
    total: 300,
    subtotal: 300,
    freight: 0
  },
  items: [
    {
      product_id: 'prod-1',
      sku: 'SKU-1',
      quantity: 1,
      price: 100,
      price_final: 100,
      categories: []
    },
    {
      product_id: 'prod-2',
      sku: 'SKU-2',
      quantity: 1,
      price: 200,
      price_final: 200,
      categories: []
    }
  ]
}

const rule = {
  product_ids: ['prod-1'],
  discount: {
    type: 'percentage',
    value: 10,
    apply_at: 'total'
  }
}

const filteredItems = params.items.filter(item => rule.product_ids.includes(item.product_id))

assert.strictEqual(
  getCampaignDiscountAmount(rule, params, filteredItems),
  100,
  'should cap the discount base to the selected product subtotal'
)

console.log('helpers test ok')
