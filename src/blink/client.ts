import { createClient } from '@blinkdotnew/sdk'

export const blink = createClient({
  projectId: 'restaurant-wine-inventory-t1ctcp61',
  authRequired: true
})

export default blink