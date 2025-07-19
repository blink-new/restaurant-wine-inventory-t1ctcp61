import { useState } from 'react'
import { Wine, BarChart3, DollarSign, FileText, Settings, Upload, ShoppingCart } from 'lucide-react'
import { Button } from './components/ui/button'
import AuthWrapper from './components/AuthWrapper'

// Import page components
import Dashboard from './pages/Dashboard'
import Inventory from './pages/Inventory'
import Prices from './pages/Prices'
import Reports from './pages/Reports'
import SettingsPage from './pages/Settings'
import ImportExport from './pages/ImportExport'
import BulkBuying from './pages/BulkBuying'

type Page = 'dashboard' | 'inventory' | 'prices' | 'reports' | 'settings' | 'import' | 'bulk-buying'

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)



  const navigation = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3, description: 'Overview & alerts' },
    { id: 'inventory', label: 'Inventory', icon: Wine, description: 'Manage wine stock' },
    { id: 'bulk-buying', label: 'Bulk Buying', icon: ShoppingCart, description: 'Smart bulk orders' },
    { id: 'prices', label: 'Prices', icon: DollarSign, description: 'Compare market prices' },
    { id: 'import', label: 'Import/Export', icon: Upload, description: 'Data management' },
    { id: 'reports', label: 'Reports', icon: FileText, description: 'Sales & analytics' },
    { id: 'settings', label: 'Settings', icon: Settings, description: 'Account & preferences' },
  ]

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard': return <Dashboard />
      case 'inventory': return <Inventory />
      case 'bulk-buying': return <BulkBuying />
      case 'prices': return <Prices />
      case 'import': return <ImportExport />
      case 'reports': return <Reports />
      case 'settings': return <SettingsPage />
      default: return <Dashboard />
    }
  }

  return (
    <AuthWrapper>
      <div className="lg:grid lg:grid-cols-[280px_1fr] min-h-screen">
        {/* Desktop Sidebar */}
        <div className="hidden lg:block bg-card border-r border-border">
          <div className="p-6">
            <div className="flex items-center gap-3 mb-8">
              <Wine className="h-10 w-10 text-primary" />
              <div>
                <h1 className="text-xl font-semibold">Wine Manager</h1>
                <p className="text-sm text-muted-foreground">Restaurant Inventory</p>
              </div>
            </div>
            
            <nav className="space-y-2">
              {navigation.map((item) => {
                const Icon = item.icon
                return (
                  <Button
                    key={item.id}
                    variant={currentPage === item.id ? "default" : "ghost"}
                    className="w-full justify-start h-16 text-left"
                    onClick={() => setCurrentPage(item.id as Page)}
                  >
                    <Icon className="h-6 w-6 mr-4 flex-shrink-0" />
                    <div>
                      <div className="font-medium">{item.label}</div>
                      <div className="text-sm text-muted-foreground">{item.description}</div>
                    </div>
                  </Button>
                )
              })}
            </nav>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="lg:hidden bg-card border-b border-border p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Wine className="h-8 w-8 text-primary" />
              <h1 className="text-xl font-semibold">Wine Manager</h1>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="h-10 w-10 p-0"
            >
              <Settings className="h-6 w-6" />
            </Button>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="mt-4 space-y-2">
              {navigation.map((item) => {
                const Icon = item.icon
                return (
                  <Button
                    key={item.id}
                    variant={currentPage === item.id ? "default" : "ghost"}
                    className="w-full justify-start h-12"
                    onClick={() => {
                      setCurrentPage(item.id as Page)
                      setMobileMenuOpen(false)
                    }}
                  >
                    <Icon className="h-5 w-5 mr-3" />
                    {item.label}
                  </Button>
                )
              })}
            </div>
          )}
        </div>

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          {renderPage()}
        </main>
      </div>
    </AuthWrapper>
  )
}

export default App