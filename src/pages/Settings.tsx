import { Settings as SettingsIcon, User, Bell, Shield, HelpCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Switch } from '../components/ui/switch'
import { Label } from '../components/ui/label'

export default function SettingsPage() {
  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Settings</h1>
        <p className="text-muted-foreground text-lg">
          Manage your account preferences and application settings.
        </p>
      </div>

      {/* Account Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Account Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="restaurant-name">Restaurant Name</Label>
            <input
              id="restaurant-name"
              className="w-full p-3 border border-border rounded-lg text-lg"
              placeholder="Enter your restaurant name"
              defaultValue="Anders' Family Restaurant"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contact-email">Contact Email</Label>
            <input
              id="contact-email"
              type="email"
              className="w-full p-3 border border-border rounded-lg text-lg"
              placeholder="your@email.com"
            />
          </div>
          <Button>Save Changes</Button>
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notifications
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="low-stock-alerts">Low Stock Alerts</Label>
              <p className="text-sm text-muted-foreground">
                Get notified when wines are running low
              </p>
            </div>
            <Switch id="low-stock-alerts" defaultChecked />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="bulk-order-suggestions">Bulk Order Suggestions</Label>
              <p className="text-sm text-muted-foreground">
                Receive recommendations for bulk purchases
              </p>
            </div>
            <Switch id="bulk-order-suggestions" defaultChecked />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="price-alerts">Price Change Alerts</Label>
              <p className="text-sm text-muted-foreground">
                Get notified about market price changes
              </p>
            </div>
            <Switch id="price-alerts" />
          </div>
        </CardContent>
      </Card>

      {/* Inventory Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SettingsIcon className="h-5 w-5" />
            Inventory Preferences
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="default-threshold">Default Minimum Stock Threshold</Label>
            <input
              id="default-threshold"
              type="number"
              className="w-full p-3 border border-border rounded-lg text-lg"
              placeholder="5"
              defaultValue="5"
            />
            <p className="text-sm text-muted-foreground">
              Default minimum stock level for new wines
            </p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="currency">Currency</Label>
            <select className="w-full p-3 border border-border rounded-lg text-lg">
              <option value="SEK">Swedish Krona (SEK)</option>
              <option value="EUR">Euro (EUR)</option>
              <option value="USD">US Dollar (USD)</option>
            </select>
          </div>
          
          <Button>Save Preferences</Button>
        </CardContent>
      </Card>

      {/* Help & Support */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5" />
            Help & Support
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button variant="outline" className="h-16 flex-col gap-2">
              <HelpCircle className="h-6 w-6" />
              <span>User Guide</span>
            </Button>
            <Button variant="outline" className="h-16 flex-col gap-2">
              <Shield className="h-6 w-6" />
              <span>Contact Support</span>
            </Button>
          </div>
          
          <div className="text-center pt-4 border-t border-border">
            <p className="text-sm text-muted-foreground">
              Wine Inventory Manager v1.0 • Built with ❤️ for restaurant owners
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}