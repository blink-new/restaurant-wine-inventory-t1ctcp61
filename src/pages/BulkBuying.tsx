import { useState, useEffect } from 'react'
import { ShoppingCart, TrendingDown, Zap, Brain, Calendar, DollarSign, Package, AlertTriangle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs'
import { Progress } from '../components/ui/progress'
import { Alert, AlertDescription } from '../components/ui/alert'
import blink from '../blink/client'
import { BulkBuyingService, BulkPriceQuote, BulkOrderRecommendation } from '../services/bulkBuyingService'

interface BulkOpportunity {
  id: string
  wine_id: string
  wine_name: string
  suggested_quantity: number
  unit_price: number
  total_cost: number
  discount_percentage: number
  discount_amount: number
  supplier_id: string
  reasoning: string
  ai_confidence_score: number
  valid_until: string
  status: string
}

export default function BulkBuying() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [opportunities, setOpportunities] = useState<BulkOpportunity[]>([])
  const [recommendations, setRecommendations] = useState<BulkOrderRecommendation[]>([])
  const [seasonalOpportunities, setSeasonalOpportunities] = useState<any[]>([])
  const [selectedWine, setSelectedWine] = useState<string | null>(null)
  const [priceQuotes, setPriceQuotes] = useState<BulkPriceQuote[]>([])
  const [loadingQuotes, setLoadingQuotes] = useState(false)
  const [generatingRecommendations, setGeneratingRecommendations] = useState(false)

  useEffect(() => {
    const unsubscribe = blink.auth.onAuthStateChanged((state) => {
      setUser(state.user)
      if (state.user) {
        loadBulkData()
      }
      setLoading(state.isLoading)
    })
    return unsubscribe
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const loadBulkData = async () => {
    try {
      // Load existing bulk opportunities
      const bulkOpps = await blink.db.bulkOrderSuggestionsEnhanced.list({
        where: { 
          user_id: user?.id || 'demo_user',
          status: 'pending'
        },
        orderBy: { ai_confidence_score: 'desc' }
      })

      // Enrich with wine names
      const enrichedOpps = await Promise.all(
        bulkOpps.map(async (opp) => {
          const wines = await blink.db.winesEnhanced.list({
            where: { id: opp.wine_id }
          })
          return {
            ...opp,
            wine_name: wines.length > 0 ? `${wines[0].producer} ${wines[0].name}` : 'Unknown Wine'
          }
        })
      )

      setOpportunities(enrichedOpps)

    } catch (error) {
      console.error('Error loading bulk data:', error)
    }
  }

  const generateSmartRecommendations = async () => {
    if (!user) return

    setGeneratingRecommendations(true)
    try {
      const recs = await BulkBuyingService.generateBulkOrderRecommendations(user.id)
      setRecommendations(recs)

      // Also get seasonal opportunities
      const seasonal = await BulkBuyingService.getSeasonalOpportunities(user.id)
      setSeasonalOpportunities(seasonal)

    } catch (error) {
      console.error('Error generating recommendations:', error)
    } finally {
      setGeneratingRecommendations(false)
    }
  }

  const fetchPriceQuotes = async (wineId: string) => {
    if (!user) return

    setLoadingQuotes(true)
    setSelectedWine(wineId)
    try {
      const quotes = await BulkBuyingService.fetchBulkPricing(wineId, user.id)
      setPriceQuotes(quotes)
    } catch (error) {
      console.error('Error fetching price quotes:', error)
    } finally {
      setLoadingQuotes(false)
    }
  }

  const acceptBulkOrder = async (opportunityId: string) => {
    try {
      await blink.db.bulkOrderSuggestionsEnhanced.update(opportunityId, {
        status: 'accepted',
        updated_at: new Date().toISOString()
      })

      // Remove from opportunities list
      setOpportunities(prev => prev.filter(opp => opp.id !== opportunityId))

      // Here you would typically integrate with supplier ordering system
      alert('Bulk order request sent to supplier!')

    } catch (error) {
      console.error('Error accepting bulk order:', error)
    }
  }

  const rejectBulkOrder = async (opportunityId: string) => {
    try {
      await blink.db.bulkOrderSuggestionsEnhanced.update(opportunityId, {
        status: 'rejected',
        updated_at: new Date().toISOString()
      })

      setOpportunities(prev => prev.filter(opp => opp.id !== opportunityId))

    } catch (error) {
      console.error('Error rejecting bulk order:', error)
    }
  }

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'urgent': return 'destructive'
      case 'high': return 'secondary'
      case 'medium': return 'default'
      default: return 'outline'
    }
  }

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-64 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Smart Bulk Buying</h1>
          <p className="text-muted-foreground text-lg">
            AI-powered bulk purchasing recommendations to maximize savings and optimize inventory.
          </p>
        </div>
        <Button 
          onClick={generateSmartRecommendations}
          disabled={generatingRecommendations}
          className="flex items-center gap-2"
        >
          <Brain className="h-4 w-4" />
          {generatingRecommendations ? 'Analyzing...' : 'Generate Recommendations'}
        </Button>
      </div>

      <Tabs defaultValue="opportunities" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="opportunities">Current Opportunities</TabsTrigger>
          <TabsTrigger value="recommendations">Smart Recommendations</TabsTrigger>
          <TabsTrigger value="seasonal">Seasonal Trends</TabsTrigger>
          <TabsTrigger value="quotes">Price Quotes</TabsTrigger>
        </TabsList>

        {/* Current Opportunities */}
        <TabsContent value="opportunities" className="space-y-6">
          {opportunities.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {opportunities.map((opportunity) => (
                <Card key={opportunity.id} className="relative">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-lg">{opportunity.wine_name}</CardTitle>
                      <Badge variant="secondary">
                        {opportunity.discount_percentage}% OFF
                      </Badge>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    {/* Savings Highlight */}
                    <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                      <div className="text-2xl font-bold text-green-600">
                        {(opportunity.discount_amount || 0).toLocaleString('sv-SE')} SEK
                      </div>
                      <div className="text-sm text-green-700">Total Savings</div>
                    </div>

                    {/* Order Details */}
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Quantity:</span>
                        <span className="font-medium">{opportunity.suggested_quantity} bottles</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Unit Price:</span>
                        <span className="font-medium">{(opportunity.unit_price || 0).toLocaleString('sv-SE')} SEK</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Total Cost:</span>
                        <span className="font-medium">{(opportunity.total_cost || 0).toLocaleString('sv-SE')} SEK</span>
                      </div>
                    </div>

                    {/* AI Reasoning */}
                    <div className="p-3 bg-secondary/10 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Brain className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium">AI Insight</span>
                        <Badge variant="outline" className="text-xs">
                          {Math.round((opportunity.ai_confidence_score || 0) * 100)}% confidence
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{opportunity.reasoning}</p>
                    </div>

                    {/* Valid Until */}
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>Valid until: {new Date(opportunity.valid_until).toLocaleDateString()}</span>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Button 
                        onClick={() => fetchPriceQuotes(opportunity.wine_id)}
                        variant="outline" 
                        size="sm"
                        className="flex-1"
                      >
                        Compare Prices
                      </Button>
                      <Button 
                        onClick={() => acceptBulkOrder(opportunity.id)}
                        size="sm"
                        className="flex-1"
                      >
                        Order Now
                      </Button>
                    </div>
                    
                    <Button 
                      onClick={() => rejectBulkOrder(opportunity.id)}
                      variant="ghost" 
                      size="sm"
                      className="w-full text-muted-foreground"
                    >
                      Not Interested
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <ShoppingCart className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No Bulk Opportunities Yet</h3>
                <p className="text-muted-foreground mb-4">
                  Generate smart recommendations to discover bulk buying opportunities
                </p>
                <Button onClick={generateSmartRecommendations}>
                  <Brain className="h-4 w-4 mr-2" />
                  Generate Recommendations
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Smart Recommendations */}
        <TabsContent value="recommendations" className="space-y-6">
          {recommendations.length > 0 ? (
            <div className="space-y-4">
              {recommendations.map((rec, index) => (
                <Card key={index}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold mb-2">{rec.wineName}</h3>
                        <p className="text-muted-foreground mb-3">{rec.reasoning}</p>
                      </div>
                      <Badge variant={getUrgencyColor(rec.urgency) as any}>
                        {rec.urgency} priority
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div className="text-center">
                        <div className="text-xl font-bold">{rec.currentStock}</div>
                        <div className="text-sm text-muted-foreground">Current Stock</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xl font-bold text-primary">{rec.recommendedQuantity}</div>
                        <div className="text-sm text-muted-foreground">Recommended</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xl font-bold text-green-600">
                          {(rec.potentialSavings || 0).toLocaleString('sv-SE')} SEK
                        </div>
                        <div className="text-sm text-muted-foreground">Potential Savings</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xl font-bold">{rec.estimatedDelivery}</div>
                        <div className="text-sm text-muted-foreground">Delivery</div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button 
                        onClick={() => fetchPriceQuotes(rec.wineId)}
                        variant="outline"
                        className="flex-1"
                      >
                        Get Quotes
                      </Button>
                      <Button className="flex-1">
                        Create Order
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <Zap className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No Recommendations Available</h3>
                <p className="text-muted-foreground mb-4">
                  Click "Generate Recommendations" to get AI-powered bulk buying suggestions
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Seasonal Trends */}
        <TabsContent value="seasonal" className="space-y-6">
          {seasonalOpportunities.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {seasonalOpportunities.map((opp, index) => (
                <Card key={index}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingDown className="h-5 w-5" />
                      {opp.wineType} - {opp.season}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-muted-foreground">{opp.opportunity}</p>
                    
                    <div className="p-3 bg-primary/10 rounded-lg">
                      <p className="font-medium text-primary">{opp.recommendedAction}</p>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Timeframe: {opp.timeframe}</span>
                      <Badge variant="outline">
                        {Math.round((opp.confidence || 0) * 100)}% confidence
                      </Badge>
                    </div>

                    {opp.potentialSavings && (
                      <div className="text-center p-3 bg-green-50 rounded-lg">
                        <div className="text-lg font-bold text-green-600">
                          {opp.potentialSavings.toLocaleString('sv-SE')} SEK
                        </div>
                        <div className="text-sm text-green-700">Potential Savings</div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <Calendar className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No Seasonal Data Available</h3>
                <p className="text-muted-foreground">
                  Generate recommendations to see seasonal buying opportunities
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Price Quotes */}
        <TabsContent value="quotes" className="space-y-6">
          {loadingQuotes ? (
            <Card>
              <CardContent className="text-center py-12">
                <div className="space-y-4">
                  <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
                  <p className="text-muted-foreground">Fetching real-time bulk pricing...</p>
                  <Progress value={75} className="w-64 mx-auto" />
                </div>
              </CardContent>
            </Card>
          ) : priceQuotes.length > 0 ? (
            <div className="space-y-6">
              {priceQuotes.map((quote, index) => (
                <Card key={index}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>{quote.supplierName}</span>
                      <Badge variant="outline">
                        {Math.round(quote.confidence * 100)}% confidence
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <h4 className="font-medium">{quote.wineName}</h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {quote.quantities.map((qty, qtyIndex) => (
                        <div key={qtyIndex} className="p-4 border rounded-lg text-center">
                          <div className="text-lg font-bold">{qty.quantity} bottles</div>
                          <div className="text-sm text-muted-foreground mb-2">
                            {qty.unitPrice.toLocaleString('sv-SE')} SEK each
                          </div>
                          <div className="text-lg font-semibold text-primary">
                            {qty.totalPrice.toLocaleString('sv-SE')} SEK
                          </div>
                          <Badge variant="secondary" className="mt-2">
                            {qty.discount}% off
                          </Badge>
                          <div className="text-sm text-green-600 mt-1">
                            Save {qty.savings.toLocaleString('sv-SE')} SEK
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="p-3 bg-secondary/10 rounded-lg">
                      <p className="text-sm"><strong>Terms:</strong> {quote.terms}</p>
                      <p className="text-sm"><strong>Valid until:</strong> {new Date(quote.validUntil).toLocaleDateString()}</p>
                    </div>

                    <Button className="w-full">
                      Request Quote from {quote.supplierName}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <DollarSign className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No Price Quotes Yet</h3>
                <p className="text-muted-foreground">
                  Select a wine from opportunities or recommendations to get bulk pricing quotes
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}