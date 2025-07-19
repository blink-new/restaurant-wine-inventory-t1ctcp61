import { DollarSign, TrendingUp, TrendingDown, RefreshCw } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'

export default function Prices() {
  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Price Comparison</h1>
        <p className="text-muted-foreground text-lg">
          Compare your purchase prices with current market rates from Systembolaget and importers.
        </p>
      </div>

      {/* Coming Soon */}
      <Card className="text-center py-12">
        <CardContent>
          <DollarSign className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">Price Comparison Coming Soon</h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            We're working on integrating real-time price data from Systembolaget and wine importers 
            to help you make informed purchasing decisions.
          </p>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
              <div className="p-4 bg-muted rounded-lg">
                <TrendingUp className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <h4 className="font-medium">Market Trends</h4>
                <p className="text-sm text-muted-foreground">Track price movements</p>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <RefreshCw className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                <h4 className="font-medium">Real-time Updates</h4>
                <p className="text-sm text-muted-foreground">Live price feeds</p>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <TrendingDown className="h-8 w-8 text-orange-600 mx-auto mb-2" />
                <h4 className="font-medium">Best Deals</h4>
                <p className="text-sm text-muted-foreground">Find savings opportunities</p>
              </div>
            </div>
            <Button className="mt-6">
              Get Notified When Available
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}