import { useState, useEffect } from 'react'
import { Upload, Download, FileText, FileSpreadsheet, AlertCircle, CheckCircle, Brain, Zap } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Progress } from '../components/ui/progress'
import { Badge } from '../components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs'
import { Alert, AlertDescription } from '../components/ui/alert'
import blink from '../blink/client'
import { ImportService, ImportResult } from '../services/importService'
import { AIService } from '../services/aiService'

interface ImportLog {
  id: string
  file_name: string
  file_type: string
  import_type: string
  status: string
  records_processed: number
  records_successful: number
  records_failed: number
  ai_processing_notes?: string
  created_at: string
}

export default function ImportExport() {
  const [user, setUser] = useState(null)
  const [importing, setImporting] = useState(false)
  const [importProgress, setImportProgress] = useState(0)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [importHistory, setImportHistory] = useState<ImportLog[]>([])
  const [dragOver, setDragOver] = useState(false)
  const [aiInsights, setAiInsights] = useState<any[]>([])
  const [generatingInsights, setGeneratingInsights] = useState(false)

  useEffect(() => {
    const unsubscribe = blink.auth.onAuthStateChanged((state) => {
      setUser(state.user)
      if (state.user) {
        loadImportHistory()
      }
    })
    return unsubscribe
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const loadImportHistory = async () => {
    try {
      const history = await ImportService.getImportHistory(user?.id || 'demo_user')
      setImportHistory(history)
    } catch (error) {
      console.error('Error loading import history:', error)
    }
  }

  const handleFileUpload = async (files: FileList) => {
    if (!files || files.length === 0) return

    const file = files[0]
    const fileType = file.name.split('.').pop()?.toLowerCase()

    if (!['csv', 'pdf', 'xlsx', 'xls'].includes(fileType || '')) {
      alert('Please upload a CSV, PDF, or Excel file')
      return
    }

    setImporting(true)
    setImportProgress(0)
    setImportResult(null)

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setImportProgress(prev => Math.min(prev + 10, 90))
      }, 500)

      let result: ImportResult

      switch (fileType) {
        case 'csv':
          result = await ImportService.parseCSV(file, user?.id || 'demo_user')
          break
        case 'pdf':
          result = await ImportService.parsePDFInvoice(file, user?.id || 'demo_user')
          break
        case 'xlsx':
        case 'xls':
          result = await ImportService.parseExcel(file, user?.id || 'demo_user')
          break
        default:
          throw new Error('Unsupported file type')
      }

      clearInterval(progressInterval)
      setImportProgress(100)
      setImportResult(result)
      
      // Reload import history
      await loadImportHistory()

    } catch (error) {
      console.error('Import error:', error)
      setImportResult({
        success: false,
        recordsProcessed: 0,
        recordsSuccessful: 0,
        recordsFailed: 0,
        errors: [error.message]
      })
    } finally {
      setImporting(false)
    }
  }

  const generateAIInsights = async () => {
    if (!user) return

    setGeneratingInsights(true)
    try {
      const insights = await AIService.generateInventoryInsights(user.id)
      setAiInsights(insights)
    } catch (error) {
      console.error('Error generating AI insights:', error)
    } finally {
      setGeneratingInsights(false)
    }
  }

  const exportInventory = async (format: 'csv' | 'excel') => {
    try {
      // Get all wines
      const wines = await blink.db.winesEnhanced.list({
        where: { user_id: user?.id || 'demo_user' }
      })

      // Convert to CSV format
      const headers = [
        'Name', 'Producer', 'Vintage', 'Type', 'Region', 'Country',
        'Purchase Price', 'Selling Price', 'Current Stock', 'Min Threshold',
        'Supplier', 'Notes'
      ]

      const csvData = wines.map(wine => [
        wine.name,
        wine.producer,
        wine.vintage || '',
        wine.type,
        wine.region || '',
        wine.country || '',
        wine.purchase_price,
        wine.selling_price || '',
        wine.current_stock,
        wine.min_stock_threshold,
        wine.supplier_id || '',
        wine.notes || ''
      ])

      const csvContent = [headers, ...csvData]
        .map(row => row.map(cell => `"${cell}"`).join(','))
        .join('\n')

      // Download file
      const blob = new Blob([csvContent], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `wine-inventory-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

    } catch (error) {
      console.error('Export error:', error)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    handleFileUpload(e.dataTransfer.files)
  }

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Import & Export</h1>
        <p className="text-muted-foreground text-lg">
          Import wine data from CSV, Excel, or PDF invoices. Export your inventory for backup or analysis.
        </p>
      </div>

      <Tabs defaultValue="import" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="import">Import Data</TabsTrigger>
          <TabsTrigger value="export">Export Data</TabsTrigger>
          <TabsTrigger value="ai-insights">AI Insights</TabsTrigger>
        </TabsList>

        {/* Import Tab */}
        <TabsContent value="import" className="space-y-6">
          {/* File Upload Area */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Upload Files
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  dragOver 
                    ? 'border-primary bg-primary/5' 
                    : 'border-border hover:border-primary/50'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">
                  Drag & drop files here, or click to browse
                </h3>
                <p className="text-muted-foreground mb-4">
                  Supports CSV, Excel (.xlsx), and PDF invoices
                </p>
                
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls,.pdf"
                  onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload">
                  <Button asChild className="cursor-pointer">
                    <span>Choose Files</span>
                  </Button>
                </label>
              </div>

              {/* Supported Formats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                <div className="flex items-center gap-3 p-3 bg-secondary/10 rounded-lg">
                  <FileSpreadsheet className="h-8 w-8 text-green-600" />
                  <div>
                    <p className="font-medium">CSV Files</p>
                    <p className="text-sm text-muted-foreground">Wine inventory lists</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-secondary/10 rounded-lg">
                  <FileSpreadsheet className="h-8 w-8 text-blue-600" />
                  <div>
                    <p className="font-medium">Excel Files</p>
                    <p className="text-sm text-muted-foreground">Spreadsheet data</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-secondary/10 rounded-lg">
                  <FileText className="h-8 w-8 text-red-600" />
                  <div>
                    <p className="font-medium">PDF Invoices</p>
                    <p className="text-sm text-muted-foreground">Purchase receipts</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Import Progress */}
          {importing && (
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Processing file...</span>
                    <span className="text-sm text-muted-foreground">{importProgress}%</span>
                  </div>
                  <Progress value={importProgress} className="h-2" />
                  <p className="text-sm text-muted-foreground">
                    AI is analyzing and structuring your data
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Import Results */}
          {importResult && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {importResult.success ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-red-600" />
                  )}
                  Import Results
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold">{importResult.recordsProcessed}</div>
                    <div className="text-sm text-muted-foreground">Total Records</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{importResult.recordsSuccessful}</div>
                    <div className="text-sm text-muted-foreground">Successful</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{importResult.recordsFailed}</div>
                    <div className="text-sm text-muted-foreground">Failed</div>
                  </div>
                </div>

                {importResult.insights && (
                  <Alert>
                    <Brain className="h-4 w-4" />
                    <AlertDescription>
                      <strong>AI Insights:</strong> {importResult.insights}
                    </AlertDescription>
                  </Alert>
                )}

                {importResult.errors.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-red-600">Errors:</h4>
                    <ul className="text-sm space-y-1">
                      {importResult.errors.map((error, index) => (
                        <li key={index} className="text-red-600">• {error}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Import History */}
          <Card>
            <CardHeader>
              <CardTitle>Import History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {importHistory.map((log) => (
                  <div key={log.id} className="flex items-center justify-between p-3 bg-secondary/10 rounded-lg">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{log.file_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {log.records_successful}/{log.records_processed} records imported
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={log.status === 'completed' ? 'default' : 'destructive'}>
                        {log.status}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {new Date(log.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
                
                {importHistory.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    No import history yet. Upload your first file to get started!
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Export Tab */}
        <TabsContent value="export" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5" />
                Export Your Data
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button 
                  onClick={() => exportInventory('csv')}
                  className="h-20 flex-col gap-2"
                  variant="outline"
                >
                  <FileSpreadsheet className="h-8 w-8" />
                  <span>Export as CSV</span>
                </Button>
                <Button 
                  onClick={() => exportInventory('excel')}
                  className="h-20 flex-col gap-2"
                  variant="outline"
                >
                  <FileSpreadsheet className="h-8 w-8" />
                  <span>Export as Excel</span>
                </Button>
              </div>
              
              <div className="text-sm text-muted-foreground">
                <p>Export includes:</p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Complete wine inventory with all details</li>
                  <li>Current stock levels and pricing</li>
                  <li>Supplier information and notes</li>
                  <li>Compatible with Excel and Google Sheets</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI Insights Tab */}
        <TabsContent value="ai-insights" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                AI-Powered Inventory Insights
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-muted-foreground">
                  Get intelligent recommendations based on your inventory data
                </p>
                <Button 
                  onClick={generateAIInsights}
                  disabled={generatingInsights}
                  className="flex items-center gap-2"
                >
                  <Zap className="h-4 w-4" />
                  {generatingInsights ? 'Analyzing...' : 'Generate Insights'}
                </Button>
              </div>

              {aiInsights.length > 0 && (
                <div className="space-y-4">
                  {aiInsights.map((insight) => (
                    <Alert key={insight.id}>
                      <Brain className="h-4 w-4" />
                      <AlertDescription>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <strong>{insight.title}</strong>
                            <Badge variant={
                              insight.priority === 'urgent' ? 'destructive' :
                              insight.priority === 'high' ? 'secondary' : 'default'
                            }>
                              {insight.priority} priority
                            </Badge>
                          </div>
                          <p>{insight.description}</p>
                          {insight.actionItems.length > 0 && (
                            <div>
                              <p className="font-medium">Recommended actions:</p>
                              <ul className="list-disc list-inside text-sm">
                                {insight.actionItems.map((action, index) => (
                                  <li key={index}>{action}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          <div className="text-xs text-muted-foreground">
                            Confidence: {Math.round(insight.confidence * 100)}%
                          </div>
                        </div>
                      </AlertDescription>
                    </Alert>
                  ))}
                </div>
              )}

              {aiInsights.length === 0 && !generatingInsights && (
                <div className="text-center py-8">
                  <Brain className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    Click "Generate Insights" to get AI-powered recommendations for your inventory
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}