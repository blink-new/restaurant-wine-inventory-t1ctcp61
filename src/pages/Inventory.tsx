import { useState, useEffect } from 'react'
import { Minus, Plus, Search, Filter, Wine, AlertTriangle, TrendingDown, Eye } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Badge } from '../components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog'
import blink from '../blink/client'

interface Wine {
  id: string
  name: string
  producer: string
  vintage: number
  type: string
  region: string
  country: string
  purchase_price: number
  selling_price: number
  current_stock: number
  min_stock_threshold: number
  supplier: string
  notes: string
}

interface PriceComparison {
  id: string
  wine_id: string
  source: string
  market_price: number
}

export default function Inventory() {
  const [wines, setWines] = useState<Wine[]>([])
  const [priceComparisons, setPriceComparisons] = useState<PriceComparison[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [user, setUser] = useState(null)
  const [selectedWine, setSelectedWine] = useState<Wine | null>(null)

  useEffect(() => {
    const unsubscribe = blink.auth.onAuthStateChanged((state) => {
      setUser(state.user)
      if (state.user) {
        loadInventoryData()
      }
    })
    return unsubscribe
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const loadInventoryData = async () => {
    try {
      setLoading(true)
      
      // Load wines
      const winesData = await blink.db.wines.list({
        where: { user_id: user?.id || 'demo_user' },
        orderBy: { name: 'asc' }
      })
      setWines(winesData)

      // Load price comparisons
      const pricesData = await blink.db.priceComparisons.list({
        where: { user_id: user?.id || 'demo_user' }
      })
      setPriceComparisons(pricesData)
      
    } catch (error) {
      console.error('Error loading inventory data:', error)
    } finally {
      setLoading(false)
    }
  }

  const reduceStock = async (wineId: string) => {
    try {
      const wine = wines.find(w => w.id === wineId)
      if (!wine || Number(wine.current_stock) <= 0) return

      const newStock = Number(wine.current_stock) - 1

      // Update wine stock
      await blink.db.wines.update(wineId, {
        current_stock: newStock,
        updated_at: new Date().toISOString()
      })

      // Record stock movement
      await blink.db.stockMovements.create({
        id: `movement_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        wine_id: wineId,
        movement_type: 'sale',
        quantity: -1,
        reason: 'Bottle sold',
        user_id: user?.id || 'demo_user'
      })

      // Update local state optimistically
      setWines(prev => prev.map(w => 
        w.id === wineId 
          ? { ...w, current_stock: newStock }
          : w
      ))

    } catch (error) {
      console.error('Error reducing stock:', error)
      // Reload data on error
      loadInventoryData()
    }
  }

  const increaseStock = async (wineId: string) => {
    try {
      const wine = wines.find(w => w.id === wineId)
      if (!wine) return

      const newStock = Number(wine.current_stock) + 1

      // Update wine stock
      await blink.db.wines.update(wineId, {
        current_stock: newStock,
        updated_at: new Date().toISOString()
      })

      // Record stock movement
      await blink.db.stockMovements.create({
        id: `movement_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        wine_id: wineId,
        movement_type: 'purchase',
        quantity: 1,
        reason: 'Stock added',
        user_id: user?.id || 'demo_user'
      })

      // Update local state optimistically
      setWines(prev => prev.map(w => 
        w.id === wineId 
          ? { ...w, current_stock: newStock }
          : w
      ))

    } catch (error) {
      console.error('Error increasing stock:', error)
      // Reload data on error
      loadInventoryData()
    }
  }

  const filteredWines = wines.filter(wine => {
    const matchesSearch = wine.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         wine.producer.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         wine.type.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesFilter = filterType === 'all' || 
                         (filterType === 'low-stock' && Number(wine.current_stock) <= Number(wine.min_stock_threshold)) ||
                         (filterType === 'red' && wine.type === 'red') ||
                         (filterType === 'white' && wine.type === 'white') ||
                         (filterType === 'sparkling' && wine.type === 'sparkling')
    
    return matchesSearch && matchesFilter
  })

  const getStockStatus = (wine: Wine) => {
    const stock = Number(wine.current_stock)
    const threshold = Number(wine.min_stock_threshold)
    
    if (stock === 0) return { status: 'out', color: 'destructive', text: 'Out of Stock' }
    if (stock <= threshold) return { status: 'low', color: 'destructive', text: 'Low Stock' }
    if (stock <= threshold * 2) return { status: 'medium', color: 'secondary', text: 'Medium Stock' }
    return { status: 'good', color: 'default', text: 'Good Stock' }
  }

  const getPriceComparison = (wineId: string) => {
    return priceComparisons.find(pc => pc.wine_id === wineId)
  }

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="h-12 bg-muted rounded"></div>
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
      <div>
        <h1 className="text-3xl font-bold mb-2">Wine Inventory</h1>
        <p className="text-muted-foreground text-lg">
          Manage your wine collection with easy stock tracking and updates.
        </p>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Search wines by name, producer, or type..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-12 text-lg"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={filterType === 'all' ? 'default' : 'outline'}
            onClick={() => setFilterType('all')}
            className="h-12"
          >
            All Wines
          </Button>
          <Button
            variant={filterType === 'low-stock' ? 'default' : 'outline'}
            onClick={() => setFilterType('low-stock')}
            className="h-12"
          >
            <AlertTriangle className="h-4 w-4 mr-2" />
            Low Stock
          </Button>
          <Button
            variant={filterType === 'red' ? 'default' : 'outline'}
            onClick={() => setFilterType('red')}
            className="h-12"
          >
            Red
          </Button>
          <Button
            variant={filterType === 'white' ? 'default' : 'outline'}
            onClick={() => setFilterType('white')}
            className="h-12"
          >
            White
          </Button>
        </div>
      </div>

      {/* Results Count */}
      <div className="text-sm text-muted-foreground">
        Showing {filteredWines.length} of {wines.length} wines
      </div>

      {/* Wine Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredWines.map((wine) => {
          const stockStatus = getStockStatus(wine)
          const priceComparison = getPriceComparison(wine.id)
          
          return (
            <Card key={wine.id} className={`wine-card ${stockStatus.status === 'low' || stockStatus.status === 'out' ? 'stock-low' : ''}`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg leading-tight">{wine.name}</CardTitle>
                    <p className="text-sm text-muted-foreground font-medium">{wine.producer}</p>
                    <p className="text-xs text-muted-foreground">
                      {wine.vintage} • {wine.region}, {wine.country}
                    </p>
                  </div>
                  <Badge variant={stockStatus.color as any} className="ml-2 flex-shrink-0">
                    {stockStatus.text}
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Stock Level */}
                <div className="text-center">
                  <div className="text-3xl font-bold mb-1">{wine.current_stock}</div>
                  <p className="text-sm text-muted-foreground">bottles in stock</p>
                  {Number(wine.current_stock) <= Number(wine.min_stock_threshold) && (
                    <p className="text-xs text-destructive font-medium mt-1">
                      Below minimum ({wine.min_stock_threshold} bottles)
                    </p>
                  )}
                </div>

                {/* Stock Controls */}
                <div className="flex items-center justify-center gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => increaseStock(wine.id)}
                    className="h-12 w-12 p-0"
                  >
                    <Plus className="h-5 w-5" />
                  </Button>
                  
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => reduceStock(wine.id)}
                    disabled={Number(wine.current_stock) <= 0}
                    className="h-12 px-6 bg-primary hover:bg-primary/90"
                  >
                    <Minus className="h-5 w-5 mr-2" />
                    Sell Bottle
                  </Button>
                  
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedWine(wine)}
                        className="h-12 w-12 p-0"
                      >
                        <Eye className="h-5 w-5" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle>Price Comparison</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <h3 className="font-medium mb-2">{wine.producer} {wine.name}</h3>
                          <p className="text-sm text-muted-foreground">{wine.vintage} • {wine.type}</p>
                        </div>
                        
                        <div className="space-y-3">
                          <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                            <span className="font-medium">Your Purchase Price</span>
                            <span className="text-lg font-bold">{(wine.purchase_price || 0).toLocaleString('sv-SE')} SEK</span>
                          </div>
                          
                          {priceComparison && (
                            <div className="flex justify-between items-center p-3 bg-secondary/10 rounded-lg">
                              <span className="font-medium">Market Price ({priceComparison.source})</span>
                              <span className="text-lg font-bold text-secondary">
                                {(priceComparison.market_price || 0).toLocaleString('sv-SE')} SEK
                              </span>
                            </div>
                          )}
                          
                          <div className="flex justify-between items-center p-3 bg-primary/10 rounded-lg">
                            <span className="font-medium">Your Selling Price</span>
                            <span className="text-lg font-bold text-primary">
                              {wine.selling_price ? (wine.selling_price || 0).toLocaleString('sv-SE') + ' SEK' : 'Not set'}
                            </span>
                          </div>
                        </div>

                        {priceComparison && (
                          <div className="text-center p-3 bg-background rounded-lg border">
                            <p className="text-sm text-muted-foreground">Price Difference</p>
                            <p className={`text-lg font-bold ${
                              wine.purchase_price < priceComparison.market_price 
                                ? 'text-green-600' 
                                : 'text-red-600'
                            }`}>
                              {wine.purchase_price < priceComparison.market_price ? '↓' : '↑'} 
                              {Math.abs((wine.purchase_price || 0) - (priceComparison.market_price || 0)).toLocaleString('sv-SE')} SEK
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {wine.purchase_price < priceComparison.market_price 
                                ? 'Great deal! You saved money' 
                                : 'You paid above market price'}
                            </p>
                          </div>
                        )}

                        {wine.notes && (
                          <div className="p-3 bg-muted rounded-lg">
                            <p className="text-sm font-medium mb-1">Notes</p>
                            <p className="text-sm text-muted-foreground">{wine.notes}</p>
                          </div>
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>

                {/* Quick Info */}
                <div className="text-xs text-muted-foreground space-y-1">
                  <div className="flex justify-between">
                    <span>Purchase:</span>
                    <span className="font-medium">{(wine.purchase_price || 0).toLocaleString('sv-SE')} SEK</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Selling:</span>
                    <span className="font-medium">{wine.selling_price ? (wine.selling_price || 0).toLocaleString('sv-SE') + ' SEK' : 'Not set'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Type:</span>
                    <span className="font-medium capitalize">{wine.type}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {filteredWines.length === 0 && (
        <div className="text-center py-12">
          <Wine className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No wines found</h3>
          <p className="text-muted-foreground">
            {searchTerm || filterType !== 'all' 
              ? 'Try adjusting your search or filter criteria.'
              : 'Start by adding some wines to your inventory.'}
          </p>
        </div>
      )}
    </div>
  )
}