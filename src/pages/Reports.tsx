import { FileText, BarChart3, PieChart, Calendar } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'

export default function Reports() {
  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Reports & Analytics</h1>
        <p className="text-muted-foreground text-lg">
          Gain insights into your wine sales, inventory trends, and profitability.
        </p>
      </div>

      {/* Coming Soon */}
      <Card className="text-center py-12">
        <CardContent>
          <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">Detailed Reports Coming Soon</h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            We're building comprehensive reporting tools to help you understand your wine business better.
          </p>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 max-w-4xl mx-auto">
              <div className="p-4 bg-muted rounded-lg">
                <BarChart3 className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                <h4 className="font-medium">Sales Analytics</h4>
                <p className="text-sm text-muted-foreground">Track performance</p>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <PieChart className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <h4 className="font-medium">Inventory Insights</h4>
                <p className="text-sm text-muted-foreground">Stock analysis</p>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <Calendar className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                <h4 className="font-medium">Seasonal Trends</h4>
                <p className="text-sm text-muted-foreground">Time-based data</p>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <FileText className="h-8 w-8 text-orange-600 mx-auto mb-2" />
                <h4 className="font-medium">Export Reports</h4>
                <p className="text-sm text-muted-foreground">PDF & Excel</p>
              </div>
            </div>
            <Button className="mt-6">
              Request Early Access
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}