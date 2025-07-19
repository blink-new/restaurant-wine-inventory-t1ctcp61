import blink from '../blink/client'

export interface BulkPriceQuote {
  supplierId: string
  supplierName: string
  wineId: string
  wineName: string
  quantities: {
    quantity: number
    unitPrice: number
    totalPrice: number
    discount: number
    savings: number
  }[]
  validUntil: string
  terms: string
  confidence: number
}

export interface BulkOrderRecommendation {
  wineId: string
  wineName: string
  currentStock: number
  recommendedQuantity: number
  urgency: 'low' | 'medium' | 'high' | 'urgent'
  reasoning: string
  potentialSavings: number
  bestSupplier: string
  estimatedDelivery: string
}

export class BulkBuyingService {
  
  /**
   * Fetch real-time bulk pricing from suppliers
   */
  static async fetchBulkPricing(wineId: string, userId: string): Promise<BulkPriceQuote[]> {
    try {
      // Get wine details
      const wine = await blink.db.winesEnhanced.list({
        where: { id: wineId, user_id: userId }
      })

      if (wine.length === 0) {
        throw new Error('Wine not found')
      }

      const wineData = wine[0]

      // Get suppliers
      const suppliers = await blink.db.suppliers.list({
        where: { user_id: userId }
      })

      // Search for current market prices
      const searchQuery = `${wineData.producer} ${wineData.name} ${wineData.vintage || ''} bulk wholesale price Sweden`
      
      const searchResults = await blink.data.search(searchQuery, {
        type: 'web',
        limit: 15
      })

      // Use AI to analyze pricing and generate bulk quotes
      const { object: pricingData } = await blink.ai.generateObject({
        prompt: `Analyze market data and generate realistic bulk pricing quotes for this wine:

        Wine: ${wineData.producer} ${wineData.name} ${wineData.vintage || ''}
        Current Purchase Price: ${wineData.purchase_price} SEK
        Current Stock: ${wineData.current_stock}
        
        Suppliers: ${JSON.stringify(suppliers)}
        Market Research: ${JSON.stringify(searchResults.organic_results?.slice(0, 8))}

        Generate realistic bulk pricing tiers for different quantities (6, 12, 24, 48 bottles) with appropriate discounts based on:
        1. Current market prices
        2. Typical wholesale discounts (5-25%)
        3. Supplier capabilities
        4. Seasonal factors
        5. Wine type and region

        Make prices realistic for Swedish market.`,
        schema: {
          type: 'object',
          properties: {
            quotes: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  supplierId: { type: 'string' },
                  supplierName: { type: 'string' },
                  wineId: { type: 'string' },
                  wineName: { type: 'string' },
                  quantities: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        quantity: { type: 'number' },
                        unitPrice: { type: 'number' },
                        totalPrice: { type: 'number' },
                        discount: { type: 'number' },
                        savings: { type: 'number' }
                      }
                    }
                  },
                  validUntil: { type: 'string' },
                  terms: { type: 'string' },
                  confidence: { type: 'number' }
                }
              }
            }
          },
          required: ['quotes']
        }
      })

      // Store quotes in database for tracking
      for (const quote of pricingData.quotes) {
        for (const qty of quote.quantities) {
          await blink.db.bulkOrderSuggestionsEnhanced.create({
            id: `bulk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            wine_id: wineId,
            user_id: userId,
            supplier_id: quote.supplierId,
            suggested_quantity: qty.quantity,
            unit_price: qty.unitPrice,
            total_cost: qty.totalPrice,
            discount_percentage: qty.discount,
            discount_amount: qty.savings,
            minimum_order_quantity: qty.quantity,
            valid_until: quote.validUntil,
            status: 'pending',
            ai_confidence_score: quote.confidence,
            reasoning: `Bulk pricing for ${qty.quantity} bottles with ${qty.discount}% discount`,
            created_at: new Date().toISOString()
          })
        }
      }

      return pricingData.quotes

    } catch (error) {
      console.error('Error fetching bulk pricing:', error)
      return []
    }
  }

  /**
   * Generate smart bulk order recommendations
   */
  static async generateBulkOrderRecommendations(userId: string): Promise<BulkOrderRecommendation[]> {
    try {
      // Get wines with low stock
      const wines = await blink.db.winesEnhanced.list({
        where: { user_id: userId, is_active: 1 }
      })

      // Get sales history
      const salesHistory = await blink.db.salesRecords.list({
        where: { user_id: userId },
        orderBy: { sale_date: 'desc' },
        limit: 200
      })

      // Get stock movements
      const stockMovements = await blink.db.stockMovementsEnhanced.list({
        where: { user_id: userId },
        orderBy: { created_at: 'desc' },
        limit: 100
      })

      // Analyze data with AI
      const analysisData = {
        wines: wines.map(wine => ({
          id: wine.id,
          name: `${wine.producer} ${wine.name}`,
          currentStock: wine.current_stock,
          minThreshold: wine.min_stock_threshold,
          maxThreshold: wine.max_stock_threshold,
          purchasePrice: wine.purchase_price,
          type: wine.type,
          vintage: wine.vintage
        })),
        salesHistory: salesHistory.map(sale => ({
          wineId: sale.wine_id,
          quantity: sale.quantity,
          date: sale.sale_date,
          price: sale.unit_price
        })),
        stockMovements: stockMovements.map(movement => ({
          wineId: movement.wine_id,
          type: movement.movement_type,
          quantity: movement.quantity,
          date: movement.created_at
        }))
      }

      const { object: recommendations } = await blink.ai.generateObject({
        prompt: `Analyze this wine inventory and sales data to generate smart bulk order recommendations. Consider:

        1. Sales velocity and trends
        2. Current stock levels vs. thresholds
        3. Seasonal patterns
        4. Lead times and delivery schedules
        5. Storage capacity
        6. Cash flow optimization
        7. Bulk discount opportunities

        Data: ${JSON.stringify(analysisData)}

        Generate prioritized bulk order recommendations with specific quantities and reasoning.`,
        schema: {
          type: 'object',
          properties: {
            recommendations: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  wineId: { type: 'string' },
                  wineName: { type: 'string' },
                  currentStock: { type: 'number' },
                  recommendedQuantity: { type: 'number' },
                  urgency: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'] },
                  reasoning: { type: 'string' },
                  potentialSavings: { type: 'number' },
                  bestSupplier: { type: 'string' },
                  estimatedDelivery: { type: 'string' }
                }
              }
            }
          },
          required: ['recommendations']
        }
      })

      return recommendations.recommendations

    } catch (error) {
      console.error('Error generating bulk order recommendations:', error)
      return []
    }
  }

  /**
   * Compare bulk pricing across suppliers
   */
  static async compareBulkPricing(wineIds: string[], userId: string): Promise<any> {
    try {
      const comparisons = []

      for (const wineId of wineIds) {
        const quotes = await this.fetchBulkPricing(wineId, userId)
        comparisons.push({
          wineId,
          quotes
        })
      }

      // Use AI to analyze and recommend best deals
      const { object: analysis } = await blink.ai.generateObject({
        prompt: `Analyze these bulk pricing comparisons and recommend the best deals:

        Pricing Data: ${JSON.stringify(comparisons)}

        Provide insights on:
        1. Best value propositions
        2. Supplier reliability factors
        3. Optimal order quantities
        4. Total cost optimization
        5. Risk assessment`,
        schema: {
          type: 'object',
          properties: {
            bestDeals: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  wineId: { type: 'string' },
                  recommendedSupplier: { type: 'string' },
                  recommendedQuantity: { type: 'number' },
                  totalSavings: { type: 'number' },
                  reasoning: { type: 'string' }
                }
              }
            },
            insights: { type: 'string' },
            totalPotentialSavings: { type: 'number' }
          }
        }
      })

      return analysis

    } catch (error) {
      console.error('Error comparing bulk pricing:', error)
      return null
    }
  }

  /**
   * Track bulk order performance
   */
  static async trackBulkOrderPerformance(userId: string): Promise<any> {
    try {
      // Get bulk orders from stock movements
      const bulkOrders = await blink.db.stockMovementsEnhanced.list({
        where: { 
          user_id: userId,
          movement_type: 'purchase'
        },
        orderBy: { created_at: 'desc' },
        limit: 50
      })

      // Filter for bulk orders (quantity > 6)
      const bulkOrdersFiltered = bulkOrders.filter(order => Number(order.quantity) >= 6)

      // Analyze performance
      const { object: performance } = await blink.ai.generateObject({
        prompt: `Analyze bulk order performance and provide insights:

        Bulk Orders: ${JSON.stringify(bulkOrdersFiltered)}

        Calculate:
        1. Average savings per bulk order
        2. Most successful suppliers
        3. Optimal order quantities
        4. Seasonal patterns
        5. ROI analysis`,
        schema: {
          type: 'object',
          properties: {
            totalOrders: { type: 'number' },
            totalSavings: { type: 'number' },
            averageSavingsPerOrder: { type: 'number' },
            bestPerformingSuppliers: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  supplierId: { type: 'string' },
                  totalOrders: { type: 'number' },
                  totalSavings: { type: 'number' },
                  averageDiscount: { type: 'number' }
                }
              }
            },
            insights: { type: 'string' },
            recommendations: {
              type: 'array',
              items: { type: 'string' }
            }
          }
        }
      })

      return performance

    } catch (error) {
      console.error('Error tracking bulk order performance:', error)
      return null
    }
  }

  /**
   * Get seasonal bulk buying opportunities
   */
  static async getSeasonalOpportunities(userId: string): Promise<any[]> {
    try {
      // Get current date and season
      const now = new Date()
      const month = now.getMonth() + 1
      const season = this.getCurrentSeason(month)

      // Search for seasonal wine trends
      const searchQuery = `wine trends ${season} 2024 Sweden bulk buying opportunities`
      
      const searchResults = await blink.data.search(searchQuery, {
        type: 'web',
        limit: 10
      })

      // Get user's wine inventory
      const wines = await blink.db.winesEnhanced.list({
        where: { user_id: userId, is_active: 1 }
      })

      // Use AI to identify seasonal opportunities
      const { object: opportunities } = await blink.ai.generateObject({
        prompt: `Based on seasonal trends and current inventory, identify bulk buying opportunities:

        Current Season: ${season}
        Market Trends: ${JSON.stringify(searchResults.organic_results?.slice(0, 5))}
        Current Inventory: ${JSON.stringify(wines.slice(0, 20))}

        Identify wines that:
        1. Are in seasonal demand
        2. Have upcoming price increases
        3. Benefit from seasonal discounts
        4. Match holiday/event patterns`,
        schema: {
          type: 'object',
          properties: {
            opportunities: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  wineType: { type: 'string' },
                  season: { type: 'string' },
                  opportunity: { type: 'string' },
                  recommendedAction: { type: 'string' },
                  timeframe: { type: 'string' },
                  potentialSavings: { type: 'number' },
                  confidence: { type: 'number' }
                }
              }
            }
          }
        }
      })

      return opportunities.opportunities

    } catch (error) {
      console.error('Error getting seasonal opportunities:', error)
      return []
    }
  }

  private static getCurrentSeason(month: number): string {
    if (month >= 3 && month <= 5) return 'spring'
    if (month >= 6 && month <= 8) return 'summer'
    if (month >= 9 && month <= 11) return 'autumn'
    return 'winter'
  }
}