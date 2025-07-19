import { useState, useEffect } from 'react'
import { Wine, BarChart3, DollarSign, FileText, Settings, Menu, X } from 'lucide-react'
import { Button } from './components/ui/button'
import { Card } from './components/ui/card'
import blink from './blink/client'

// Import page components (we'll create these)
import Dashboard from './pages/Dashboard'
import Inventory from './pages/Inventory'
import Prices from './pages/Prices'
import Reports from './pages/Reports'
import SettingsPage from './pages/Settings'

type Page = 'dashboard' | 'inventory' | 'prices' | 'reports' | 'settings'

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard')
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Auth state management
  useEffect(() => {
    const unsubscribe = blink.auth.onAuthStateChanged((state) => {
      setUser(state.user)
      setLoading(state.isLoading)
    })
    return unsubscribe
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Wine className="h-12 w-12 text-primary mx-auto mb-4 animate-pulse" />
          <p className="text-lg text-muted-foreground">Loading your wine cellar...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center">
          <Wine className="h-16 w-16 text-primary mx-auto mb-6" />
          <h1 className="text-2xl font-semibold mb-4">Wine Inventory Manager</h1>
          <p className="text-muted-foreground mb-6">
            Effortlessly manage your restaurant's wine collection with smart inventory tracking and price insights.
          </p>
          <Button 
            onClick={() => blink.auth.login()} 
            className="w-full h-12 text-lg"
          >
            Sign In to Continue
          </Button>
        </Card>
      </div>
    )
  }

  const navigation = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3, description: 'Overview & alerts' },
    { id: 'inventory', label: 'Inventory', icon: Wine, description: 'Manage wine stock' },
    { id: 'prices', label: 'Prices', icon: DollarSign, description: 'Compare market prices' },
    { id: 'reports', label: 'Reports', icon: FileText, description: 'Sales & analytics' },
    { id: 'settings', label: 'Settings', icon: Settings, description: 'Account & preferences' },
  ]

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard': return <Dashboard />
      case 'inventory': return <Inventory />
      case 'prices': return <Prices />
      case 'reports': return <Reports />
      case 'settings': return <SettingsPage />
      default: return <Dashboard />
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <div className="lg:hidden bg-card border-b border-border p-4 flex items-center justify-between">
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
          {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </Button>
      </div>

      {/* Mobile Navigation Overlay */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-background/80 backdrop-blur-sm">
          <div className="fixed inset-y-0 left-0 w-80 bg-card border-r border-border p-6">
            <div className="flex items-center gap-3 mb-8">
              <Wine className="h-8 w-8 text-primary" />
              <h1 className="text-xl font-semibold">Wine Manager</h1>
            </div>
            <nav className="space-y-2">
              {navigation.map((item) => {
                const Icon = item.icon
                return (
                  <Button
                    key={item.id}
                    variant={currentPage === item.id ? "default" : "ghost"}
                    className="w-full justify-start h-16 text-left"
                    onClick={() => {
                      setCurrentPage(item.id as Page)
                      setMobileMenuOpen(false)
                    }}
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
      )}

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

            <div className="mt-8 pt-6 border-t border-border">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-sm font-medium text-primary">
                    {user.email?.[0]?.toUpperCase() || 'U'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{user.email}</p>
                  <p className="text-xs text-muted-foreground">Restaurant Owner</p>
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => blink.auth.logout()}
                className="w-full"
              >
                Sign Out
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          {renderPage()}
        </main>
      </div>
    </div>
  )
}

export default App