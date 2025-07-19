import { useState, useEffect } from 'react'
import { AlertTriangle, TrendingUp, Wine, Package, DollarSign, ShoppingCart } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import blink from '../blink/client'

interface Wine {
  id: string
  name: string
  producer: string
  type: string
  current_stock: number
  min_stock_threshold: number
  purchase_price: number
  selling_price: number
}

interface BulkSuggestion {
  id: string
  wine_id: string
  suggested_quantity: number
  discount_percentage: number
  total_cost: number
  supplier: string
  wine_name?: string
}

export default function Dashboard() {
  const [wines, setWines] = useState<Wine[]>([])
  const [bulkSuggestions, setBulkSuggestions] = useState<BulkSuggestion[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)

  useEffect(() => {
    const unsubscribe = blink.auth.onAuthStateChanged((state) => {
      setUser(state.user)
      if (state.user) {
        loadDashboardData()
      }
    })
    return unsubscribe
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      
      // Load wines
      const winesData = await blink.db.wines.list({
        where: { user_id: user?.id || 'demo_user' },
        orderBy: { current_stock: 'asc' }
      })
      setWines(winesData)

      // Load bulk suggestions
      const suggestionsData = await blink.db.bulkOrderSuggestions.list({
        where: { 
          user_id: user?.id || 'demo_user',
          status: 'pending'
        }
      })
      
      // Enrich suggestions with wine names
      const enrichedSuggestions = suggestionsData.map(suggestion => {
        const wine = winesData.find(w => w.id === suggestion.wine_id)
        return {
          ...suggestion,
          wine_name: wine ? `${wine.producer} ${wine.name}` : 'Unknown Wine'
        }
      })
      setBulkSuggestions(enrichedSuggestions)
      
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const lowStockWines = wines.filter(wine => 
    Number(wine.current_stock) <= Number(wine.min_stock_threshold)
  )

  const totalWines = wines.length
  const totalValue = wines.reduce((sum, wine) => {
    const stock = Number(wine.current_stock) || 0
    const price = Number(wine.purchase_price) || 0
    return sum + (stock * price)
  }, 0)
  
  const averageMargin = wines.length > 0 
    ? wines.reduce((sum, wine) => {
        const sellingPrice = Number(wine.selling_price) || 0
        const purchasePrice = Number(wine.purchase_price) || 0
        if (purchasePrice === 0) return sum
        const margin = ((sellingPrice - purchasePrice) / purchasePrice) * 100
        return sum + margin
      }, 0) / wines.length
    : 0

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
        <p className="text-muted-foreground text-lg">
          Welcome back! Here's what's happening with your wine inventory.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Wines</CardTitle>
            <Wine className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalWines}</div>
            <p className="text-xs text-muted-foreground">
              Different wine varieties
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inventory Value</CardTitle>
            <DollarSign className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(totalValue || 0).toLocaleString('sv-SE')} SEK
            </div>
            <p className="text-xs text-muted-foreground">
              Total purchase value
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
            <AlertTriangle className="h-5 w-5 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{lowStockWines.length}</div>
            <p className="text-xs text-muted-foreground">
              Need attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Margin</CardTitle>
            <TrendingUp className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(averageMargin || 0).toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Profit margin
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Low Stock Alert */}
      {lowStockWines.length > 0 && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Low Stock Alert
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              These wines are running low and may need restocking soon:
            </p>
            <div className="space-y-3">
              {lowStockWines.slice(0, 3).map((wine) => (
                <div key={wine.id} className="flex items-center justify-between p-3 bg-background rounded-lg">
                  <div>
                    <p className="font-medium">{wine.producer} {wine.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Only {wine.current_stock} bottles left (min: {wine.min_stock_threshold})
                    </p>
                  </div>
                  <Badge variant="destructive">
                    {wine.current_stock} left
                  </Badge>
                </div>
              ))}
            </div>
            {lowStockWines.length > 3 && (
              <p className="text-sm text-muted-foreground mt-3">
                And {lowStockWines.length - 3} more wines need attention...
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Bulk Order Suggestions */}
      {bulkSuggestions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Smart Bulk Order Suggestions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4 friendly-text">
              💡 Save money with these bulk order opportunities!
            </p>
            <div className="space-y-4">
              {bulkSuggestions.map((suggestion) => (
                <div key={suggestion.id} className="flex items-center justify-between p-4 bg-secondary/10 rounded-lg border border-secondary/20">
                  <div className="flex-1">
                    <p className="font-medium">{suggestion.wine_name}</p>
                    <p className="text-sm text-muted-foreground">
                      Order {suggestion.suggested_quantity} bottles and save {suggestion.discount_percentage}%
                    </p>
                    <p className="text-sm font-medium text-secondary">
                      Total: {(suggestion.total_cost || 0).toLocaleString('sv-SE')} SEK
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      Maybe Later
                    </Button>
                    <Button size="sm" className="bg-secondary hover:bg-secondary/90">
                      Order Now
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button className="h-16 flex-col gap-2" variant="outline">
              <Package className="h-6 w-6" />
              <span>Add New Wine</span>
            </Button>
            <Button className="h-16 flex-col gap-2" variant="outline">
              <Wine className="h-6 w-6" />
              <span>Record Sale</span>
            </Button>
            <Button className="h-16 flex-col gap-2" variant="outline">
              <TrendingUp className="h-6 w-6" />
              <span>View Reports</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}