import blink from '../blink/client'

export interface AIInsight {
  id: string
  type: 'price_trend' | 'demand_forecast' | 'reorder_suggestion' | 'market_opportunity' | 'cost_optimization'
  title: string
  description: string
  confidence: number
  actionItems: string[]
  priority: 'low' | 'medium' | 'high' | 'urgent'
  wineId?: string
}

export interface BulkBuyingOpportunity {
  wineId: string
  wineName: string
  currentPrice: number
  bulkPrice: number
  minimumQuantity: number
  discount: number
  supplier: string
  validUntil: string
  reasoning: string
  confidence: number
}

export class AIService {
  
  /**
   * Analyze wine inventory and generate AI insights
   */
  static async generateInventoryInsights(userId: string): Promise<AIInsight[]> {
    try {
      // Get user's wine data
      const wines = await blink.db.wines.list({
        where: { user_id: userId }
      })

      const stockMovements = await blink.db.stockMovements.list({
        where: { user_id: userId },
        orderBy: { created_at: 'desc' },
        limit: 100
      })

      const salesRecords = await blink.db.salesRecords.list({
        where: { user_id: userId },
        orderBy: { sale_date: 'desc' },
        limit: 50
      })

      // Prepare data for AI analysis
      const analysisData = {
        wines: wines.map(wine => ({
          id: wine.id,
          name: wine.name,
          producer: wine.producer,
          type: wine.type,
          currentStock: wine.current_stock,
          minThreshold: wine.min_stock_threshold,
          purchasePrice: wine.purchase_price,
          sellingPrice: wine.selling_price
        })),
        recentMovements: stockMovements.slice(0, 20),
        recentSales: salesRecords.slice(0, 20),
        totalWines: wines.length,
        lowStockCount: wines.filter(w => Number(w.current_stock) <= Number(w.min_stock_threshold)).length
      }

      // Generate AI insights using Blink AI
      const { object: insights } = await blink.ai.generateObject({
        prompt: `Analyze this restaurant wine inventory data and generate actionable insights. Focus on:
        1. Stock optimization opportunities
        2. Sales trend analysis
        3. Pricing recommendations
        4. Reorder suggestions
        5. Cost-saving opportunities

        Data: ${JSON.stringify(analysisData)}

        Generate 3-5 specific, actionable insights with confidence scores.`,
        schema: {
          type: 'object',
          properties: {
            insights: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  type: { type: 'string', enum: ['price_trend', 'demand_forecast', 'reorder_suggestion', 'market_opportunity', 'cost_optimization'] },
                  title: { type: 'string' },
                  description: { type: 'string' },
                  confidence: { type: 'number', minimum: 0, maximum: 1 },
                  actionItems: { type: 'array', items: { type: 'string' } },
                  priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'] },
                  wineId: { type: 'string' }
                },
                required: ['type', 'title', 'description', 'confidence', 'actionItems', 'priority']
              }
            }
          },
          required: ['insights']
        }
      })

      // Store insights in database
      const aiInsights: AIInsight[] = []
      for (const insight of insights.insights) {
        const id = `insight_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        
        await blink.db.aiInsights.create({
          id,
          user_id: userId,
          insight_type: insight.type,
          wine_id: insight.wineId || null,
          title: insight.title,
          description: insight.description,
          confidence_score: insight.confidence,
          action_items: JSON.stringify(insight.actionItems),
          priority: insight.priority,
          status: 'active',
          created_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
        })

        aiInsights.push({
          id,
          type: insight.type,
          title: insight.title,
          description: insight.description,
          confidence: insight.confidence,
          actionItems: insight.actionItems,
          priority: insight.priority,
          wineId: insight.wineId
        })
      }

      return aiInsights

    } catch (error) {
      console.error('Error generating AI insights:', error)
      return []
    }
  }

  /**
   * Find bulk buying opportunities using AI
   */
  static async findBulkBuyingOpportunities(userId: string): Promise<BulkBuyingOpportunity[]> {
    try {
      // Get low stock wines and sales data
      const wines = await blink.db.wines.list({
        where: { user_id: userId }
      })

      const lowStockWines = wines.filter(wine => 
        Number(wine.current_stock) <= Number(wine.min_stock_threshold) * 1.5
      )

      const salesData = await blink.db.salesRecords.list({
        where: { user_id: userId },
        orderBy: { sale_date: 'desc' },
        limit: 100
      })

      // Get suppliers
      const suppliers = await blink.db.suppliers.list({
        where: { user_id: userId }
      })

      // Prepare data for AI analysis
      const analysisData = {
        lowStockWines: lowStockWines.map(wine => ({
          id: wine.id,
          name: `${wine.producer} ${wine.name}`,
          currentStock: wine.current_stock,
          minThreshold: wine.min_stock_threshold,
          purchasePrice: wine.purchase_price,
          type: wine.type
        })),
        salesHistory: salesData.map(sale => ({
          wineId: sale.wine_id,
          quantity: sale.quantity,
          date: sale.sale_date
        })),
        suppliers: suppliers.map(supplier => ({
          id: supplier.id,
          name: supplier.name,
          discountTiers: supplier.bulk_discount_tiers ? JSON.parse(supplier.bulk_discount_tiers) : []
        }))
      }

      // Use AI to find bulk buying opportunities
      const { object: opportunities } = await blink.ai.generateObject({
        prompt: `Analyze this wine inventory and sales data to find bulk buying opportunities. Consider:
        1. Wines with low stock that sell frequently
        2. Seasonal demand patterns
        3. Supplier discount tiers
        4. Cost optimization potential
        5. Storage capacity considerations

        Data: ${JSON.stringify(analysisData)}

        Generate realistic bulk buying opportunities with specific quantities, prices, and reasoning.`,
        schema: {
          type: 'object',
          properties: {
            opportunities: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  wineId: { type: 'string' },
                  wineName: { type: 'string' },
                  currentPrice: { type: 'number' },
                  bulkPrice: { type: 'number' },
                  minimumQuantity: { type: 'number' },
                  discount: { type: 'number' },
                  supplier: { type: 'string' },
                  validUntil: { type: 'string' },
                  reasoning: { type: 'string' },
                  confidence: { type: 'number', minimum: 0, maximum: 1 }
                },
                required: ['wineId', 'wineName', 'currentPrice', 'bulkPrice', 'minimumQuantity', 'discount', 'supplier', 'reasoning', 'confidence']
              }
            }
          },
          required: ['opportunities']
        }
      })

      // Store opportunities in database
      for (const opp of opportunities.opportunities) {
        const id = `bulk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        
        await blink.db.bulkOrderSuggestionsEnhanced.create({
          id,
          wine_id: opp.wineId,
          user_id: userId,
          supplier_id: suppliers.find(s => s.name === opp.supplier)?.id || 'unknown',
          suggested_quantity: opp.minimumQuantity,
          unit_price: opp.bulkPrice,
          total_cost: opp.bulkPrice * opp.minimumQuantity,
          discount_percentage: opp.discount,
          discount_amount: (opp.currentPrice - opp.bulkPrice) * opp.minimumQuantity,
          minimum_order_quantity: opp.minimumQuantity,
          valid_until: opp.validUntil || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'pending',
          ai_confidence_score: opp.confidence,
          reasoning: opp.reasoning,
          created_at: new Date().toISOString()
        })
      }

      return opportunities.opportunities

    } catch (error) {
      console.error('Error finding bulk buying opportunities:', error)
      return []
    }
  }

  /**
   * Analyze market prices using web search
   */
  static async analyzeMarketPrices(wineName: string, producer: string, vintage?: number): Promise<any> {
    try {
      const searchQuery = `${producer} ${wineName} ${vintage || ''} wine price Sweden systembolaget`
      
      const searchResults = await blink.data.search(searchQuery, {
        type: 'web',
        limit: 10
      })

      // Use AI to extract price information
      const { object: priceAnalysis } = await blink.ai.generateObject({
        prompt: `Analyze these search results to extract wine price information for ${producer} ${wineName} ${vintage || ''}:

        Search Results: ${JSON.stringify(searchResults.organic_results?.slice(0, 5))}

        Extract price information, sources, and market insights.`,
        schema: {
          type: 'object',
          properties: {
            prices: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  source: { type: 'string' },
                  price: { type: 'number' },
                  currency: { type: 'string' },
                  url: { type: 'string' },
                  confidence: { type: 'number' }
                }
              }
            },
            averagePrice: { type: 'number' },
            priceRange: {
              type: 'object',
              properties: {
                min: { type: 'number' },
                max: { type: 'number' }
              }
            },
            insights: { type: 'string' }
          }
        }
      })

      return priceAnalysis

    } catch (error) {
      console.error('Error analyzing market prices:', error)
      return null
    }
  }

  /**
   * Generate wine recommendations based on customer preferences
   */
  static async generateWineRecommendations(userId: string, customerPreferences: any): Promise<any[]> {
    try {
      const wines = await blink.db.wines.list({
        where: { user_id: userId, is_active: 1 }
      })

      const { object: recommendations } = await blink.ai.generateObject({
        prompt: `Based on these customer preferences and available wines, recommend the best matches:

        Customer Preferences: ${JSON.stringify(customerPreferences)}
        Available Wines: ${JSON.stringify(wines.slice(0, 20))}

        Generate 3-5 wine recommendations with reasoning.`,
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
                  matchScore: { type: 'number' },
                  reasoning: { type: 'string' },
                  suggestedPrice: { type: 'number' }
                }
              }
            }
          }
        }
      })

      return recommendations.recommendations

    } catch (error) {
      console.error('Error generating wine recommendations:', error)
      return []
    }
  }
}