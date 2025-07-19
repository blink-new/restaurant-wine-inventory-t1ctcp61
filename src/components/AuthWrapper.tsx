import { useState, useEffect } from 'react'
import { Wine, User, Settings, LogOut, Building2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Textarea } from './ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog'
import { Badge } from './ui/badge'
import blink from '../blink/client'

interface UserProfile {
  id: string
  email: string
  restaurant_name?: string
  contact_phone?: string
  address?: string
  subscription_plan: string
  preferences?: any
  created_at: string
}

interface AuthWrapperProps {
  children: React.ReactNode
}

export default function AuthWrapper({ children }: AuthWrapperProps) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showProfileSetup, setShowProfileSetup] = useState(false)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [profileForm, setProfileForm] = useState({
    restaurant_name: '',
    contact_phone: '',
    address: '',
    preferences: {
      currency: 'SEK',
      default_min_stock: 5,
      notifications: {
        low_stock: true,
        bulk_opportunities: true,
        price_alerts: false
      }
    }
  })

  useEffect(() => {
    const unsubscribe = blink.auth.onAuthStateChanged(async (state) => {
      setUser(state.user)
      setLoading(state.isLoading)
      
      if (state.user && !state.isLoading) {
        await loadUserProfile(state.user.id)
      }
    })
    return unsubscribe
  }, [])

  const loadUserProfile = async (userId: string) => {
    try {
      // Check if user profile exists
      const profiles = await blink.db.users.list({
        where: { id: userId }
      })

      if (profiles.length > 0) {
        const profile = profiles[0]
        setUserProfile(profile)
        
        // Parse preferences if they exist
        if (profile.preferences) {
          try {
            const prefs = JSON.parse(profile.preferences)
            setProfileForm(prev => ({
              ...prev,
              restaurant_name: profile.restaurant_name || '',
              contact_phone: profile.contact_phone || '',
              address: profile.address || '',
              preferences: { ...prev.preferences, ...prefs }
            }))
          } catch (e) {
            console.error('Error parsing preferences:', e)
          }
        }
      } else {
        // First time user - show profile setup
        setShowProfileSetup(true)
      }
    } catch (error) {
      console.error('Error loading user profile:', error)
    }
  }

  const saveUserProfile = async () => {
    if (!user) return

    try {
      const profileData = {
        id: user.id,
        email: user.email,
        restaurant_name: profileForm.restaurant_name,
        contact_phone: profileForm.contact_phone,
        address: profileForm.address,
        subscription_plan: 'free',
        preferences: JSON.stringify(profileForm.preferences),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      // Check if profile exists
      const existingProfiles = await blink.db.users.list({
        where: { id: user.id }
      })

      if (existingProfiles.length > 0) {
        // Update existing profile
        await blink.db.users.update(user.id, {
          restaurant_name: profileForm.restaurant_name,
          contact_phone: profileForm.contact_phone,
          address: profileForm.address,
          preferences: JSON.stringify(profileForm.preferences),
          updated_at: new Date().toISOString()
        })
      } else {
        // Create new profile
        await blink.db.users.create(profileData)
      }

      setUserProfile(profileData)
      setShowProfileSetup(false)
    } catch (error) {
      console.error('Error saving user profile:', error)
    }
  }

  const handleLogout = () => {
    blink.auth.logout()
    setUser(null)
    setUserProfile(null)
  }

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
      <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center shadow-lg">
          <div className="mb-6">
            <Wine className="h-16 w-16 text-primary mx-auto mb-4" />
            <h1 className="text-3xl font-bold mb-2">Wine Inventory Manager</h1>
            <p className="text-muted-foreground">
              Professional wine inventory management for restaurants
            </p>
          </div>
          
          <div className="space-y-4 mb-6">
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <Wine className="h-4 w-4 text-primary" />
              <span>Track inventory in real-time</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <Building2 className="h-4 w-4 text-primary" />
              <span>Compare market prices</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <Settings className="h-4 w-4 text-primary" />
              <span>AI-powered bulk buying suggestions</span>
            </div>
          </div>
          
          <Button 
            onClick={() => blink.auth.login()} 
            className="w-full h-12 text-lg"
            size="lg"
          >
            Sign In to Continue
          </Button>
          
          <p className="text-xs text-muted-foreground mt-4">
            Secure authentication powered by Blink
          </p>
        </Card>
      </div>
    )
  }

  // Profile setup dialog
  if (showProfileSetup) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-lg w-full p-8">
          <CardHeader className="text-center">
            <Wine className="h-12 w-12 text-primary mx-auto mb-4" />
            <CardTitle className="text-2xl">Welcome to Wine Manager!</CardTitle>
            <p className="text-muted-foreground">
              Let's set up your restaurant profile to get started
            </p>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="restaurant-name">Restaurant Name *</Label>
              <Input
                id="restaurant-name"
                placeholder="e.g., Anders' Family Restaurant"
                value={profileForm.restaurant_name}
                onChange={(e) => setProfileForm(prev => ({
                  ...prev,
                  restaurant_name: e.target.value
                }))}
                className="h-12"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="contact-phone">Contact Phone</Label>
              <Input
                id="contact-phone"
                placeholder="+46 123 456 789"
                value={profileForm.contact_phone}
                onChange={(e) => setProfileForm(prev => ({
                  ...prev,
                  contact_phone: e.target.value
                }))}
                className="h-12"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="address">Restaurant Address</Label>
              <Textarea
                id="address"
                placeholder="Street address, city, postal code"
                value={profileForm.address}
                onChange={(e) => setProfileForm(prev => ({
                  ...prev,
                  address: e.target.value
                }))}
                rows={3}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Default Currency</Label>
              <select 
                className="w-full p-3 border border-border rounded-lg"
                value={profileForm.preferences.currency}
                onChange={(e) => setProfileForm(prev => ({
                  ...prev,
                  preferences: {
                    ...prev.preferences,
                    currency: e.target.value
                  }
                }))}
              >
                <option value="SEK">Swedish Krona (SEK)</option>
                <option value="EUR">Euro (EUR)</option>
                <option value="USD">US Dollar (USD)</option>
              </select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="min-stock">Default Minimum Stock Level</Label>
              <Input
                id="min-stock"
                type="number"
                placeholder="5"
                value={profileForm.preferences.default_min_stock}
                onChange={(e) => setProfileForm(prev => ({
                  ...prev,
                  preferences: {
                    ...prev.preferences,
                    default_min_stock: parseInt(e.target.value) || 5
                  }
                }))}
                className="h-12"
              />
            </div>
            
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={() => setShowProfileSetup(false)}
                className="flex-1"
              >
                Skip for Now
              </Button>
              <Button 
                onClick={saveUserProfile}
                disabled={!profileForm.restaurant_name}
                className="flex-1"
              >
                Complete Setup
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* User Profile Header */}
      <div className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Wine className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-xl font-semibold">
                  {userProfile?.restaurant_name || 'Wine Manager'}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {user.email}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Badge variant="secondary">
                {userProfile?.subscription_plan || 'Free'} Plan
              </Badge>
              
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <User className="h-4 w-4 mr-2" />
                    Profile
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>User Profile</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-restaurant-name">Restaurant Name</Label>
                      <Input
                        id="edit-restaurant-name"
                        value={profileForm.restaurant_name}
                        onChange={(e) => setProfileForm(prev => ({
                          ...prev,
                          restaurant_name: e.target.value
                        }))}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="edit-contact-phone">Contact Phone</Label>
                      <Input
                        id="edit-contact-phone"
                        value={profileForm.contact_phone}
                        onChange={(e) => setProfileForm(prev => ({
                          ...prev,
                          contact_phone: e.target.value
                        }))}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="edit-address">Address</Label>
                      <Textarea
                        id="edit-address"
                        value={profileForm.address}
                        onChange={(e) => setProfileForm(prev => ({
                          ...prev,
                          address: e.target.value
                        }))}
                        rows={3}
                      />
                    </div>
                    
                    <Button onClick={saveUserProfile} className="w-full">
                      Save Changes
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
              
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </div>
      
      {children}
    </div>
  )
}