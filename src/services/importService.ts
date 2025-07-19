import blink from '../blink/client'

export interface ImportResult {
  success: boolean
  recordsProcessed: number
  recordsSuccessful: number
  recordsFailed: number
  errors: string[]
  insights?: string
}

export interface ParsedWineData {
  name: string
  producer: string
  vintage?: number
  type: string
  region?: string
  country?: string
  purchasePrice: number
  sellingPrice?: number
  currentStock: number
  supplier?: string
  notes?: string
}

export class ImportService {
  
  /**
   * Parse CSV file and extract wine data
   */
  static async parseCSV(file: File, userId: string): Promise<ImportResult> {
    try {
      // Upload file to storage first
      const { publicUrl } = await blink.storage.upload(
        file,
        `imports/${userId}/${Date.now()}_${file.name}`,
        { upsert: true }
      )

      // Extract text content from CSV
      const csvText = await blink.data.extractFromUrl(publicUrl)

      // Use AI to parse and structure the CSV data
      const { object: parsedData } = await blink.ai.generateObject({
        prompt: `Parse this CSV data and extract wine inventory information. The CSV might have different column names and formats. Extract and standardize the data:

        CSV Content:
        ${csvText}

        Convert to standardized wine data format. Handle different column names like:
        - Wine Name, Product Name, Name
        - Producer, Winery, Brand, Maker
        - Price, Cost, Purchase Price, Unit Price
        - Stock, Quantity, Inventory, Bottles
        - Type, Category, Style (red, white, sparkling, etc.)

        Return structured wine data with validation.`,
        schema: {
          type: 'object',
          properties: {
            wines: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  producer: { type: 'string' },
                  vintage: { type: 'number' },
                  type: { type: 'string' },
                  region: { type: 'string' },
                  country: { type: 'string' },
                  purchasePrice: { type: 'number' },
                  sellingPrice: { type: 'number' },
                  currentStock: { type: 'number' },
                  supplier: { type: 'string' },
                  notes: { type: 'string' }
                },
                required: ['name', 'producer', 'type', 'purchasePrice', 'currentStock']
              }
            },
            insights: { type: 'string' },
            validationErrors: {
              type: 'array',
              items: { type: 'string' }
            }
          },
          required: ['wines']
        }
      })

      // Import wines to database
      let successful = 0
      let failed = 0
      const errors: string[] = []

      for (const wineData of parsedData.wines) {
        try {
          const wineId = `wine_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
          
          await blink.db.winesEnhanced.create({
            id: wineId,
            user_id: userId,
            name: wineData.name,
            producer: wineData.producer,
            vintage: wineData.vintage || null,
            type: wineData.type.toLowerCase(),
            region: wineData.region || '',
            country: wineData.country || '',
            purchase_price: wineData.purchasePrice,
            selling_price: wineData.sellingPrice || null,
            current_stock: wineData.currentStock,
            min_stock_threshold: 5, // default
            supplier_id: null, // will be linked later
            notes: wineData.notes || '',
            is_active: 1,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })

          // Record stock movement
          await blink.db.stockMovementsEnhanced.create({
            id: `movement_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            wine_id: wineId,
            user_id: userId,
            movement_type: 'purchase',
            quantity: wineData.currentStock,
            unit_cost: wineData.purchasePrice,
            total_cost: wineData.purchasePrice * wineData.currentStock,
            reason: 'CSV Import',
            reference_number: `CSV_${Date.now()}`,
            created_at: new Date().toISOString()
          })

          successful++
        } catch (error) {
          failed++
          errors.push(`Failed to import ${wineData.name}: ${error.message}`)
        }
      }

      // Log import
      await blink.db.importLogs.create({
        id: `import_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        user_id: userId,
        file_name: file.name,
        file_type: 'csv',
        file_size: file.size,
        import_type: 'wines',
        status: failed === 0 ? 'completed' : 'completed_with_errors',
        records_processed: parsedData.wines.length,
        records_successful: successful,
        records_failed: failed,
        error_details: JSON.stringify(errors),
        ai_processing_notes: parsedData.insights,
        created_at: new Date().toISOString(),
        completed_at: new Date().toISOString()
      })

      return {
        success: failed === 0,
        recordsProcessed: parsedData.wines.length,
        recordsSuccessful: successful,
        recordsFailed: failed,
        errors,
        insights: parsedData.insights
      }

    } catch (error) {
      console.error('Error parsing CSV:', error)
      return {
        success: false,
        recordsProcessed: 0,
        recordsSuccessful: 0,
        recordsFailed: 0,
        errors: [error.message]
      }
    }
  }

  /**
   * Parse PDF invoice and extract wine data
   */
  static async parsePDFInvoice(file: File, userId: string): Promise<ImportResult> {
    try {
      // Upload file to storage first
      const { publicUrl } = await blink.storage.upload(
        file,
        `imports/${userId}/${Date.now()}_${file.name}`,
        { upsert: true }
      )

      // Extract text content from PDF
      const pdfText = await blink.data.extractFromUrl(publicUrl)

      // Use AI to parse invoice data
      const { object: invoiceData } = await blink.ai.generateObject({
        prompt: `Parse this PDF invoice and extract wine purchase information. Look for:
        1. Wine names and producers
        2. Quantities purchased
        3. Unit prices and total costs
        4. Supplier information
        5. Invoice date and number

        PDF Content:
        ${pdfText}

        Extract structured wine purchase data that can be imported into inventory.`,
        schema: {
          type: 'object',
          properties: {
            supplier: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                address: { type: 'string' },
                contact: { type: 'string' }
              }
            },
            invoiceInfo: {
              type: 'object',
              properties: {
                number: { type: 'string' },
                date: { type: 'string' },
                total: { type: 'number' }
              }
            },
            wines: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  producer: { type: 'string' },
                  vintage: { type: 'number' },
                  quantity: { type: 'number' },
                  unitPrice: { type: 'number' },
                  totalPrice: { type: 'number' },
                  type: { type: 'string' }
                },
                required: ['name', 'producer', 'quantity', 'unitPrice']
              }
            },
            insights: { type: 'string' }
          },
          required: ['wines']
        }
      })

      // Process supplier information
      let supplierId = null
      if (invoiceData.supplier?.name) {
        // Check if supplier exists
        const existingSuppliers = await blink.db.suppliers.list({
          where: { 
            user_id: userId,
            name: invoiceData.supplier.name
          }
        })

        if (existingSuppliers.length > 0) {
          supplierId = existingSuppliers[0].id
        } else {
          // Create new supplier
          supplierId = `supplier_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
          await blink.db.suppliers.create({
            id: supplierId,
            user_id: userId,
            name: invoiceData.supplier.name,
            address: invoiceData.supplier.address || '',
            contact_person: invoiceData.supplier.contact || '',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
        }
      }

      // Import wines and update inventory
      let successful = 0
      let failed = 0
      const errors: string[] = []

      for (const wineData of invoiceData.wines) {
        try {
          // Check if wine already exists
          const existingWines = await blink.db.winesEnhanced.list({
            where: {
              user_id: userId,
              name: wineData.name,
              producer: wineData.producer
            }
          })

          let wineId: string

          if (existingWines.length > 0) {
            // Update existing wine stock
            const existingWine = existingWines[0]
            wineId = existingWine.id
            const newStock = Number(existingWine.current_stock) + wineData.quantity

            await blink.db.winesEnhanced.update(wineId, {
              current_stock: newStock,
              purchase_price: wineData.unitPrice, // update with latest price
              supplier_id: supplierId,
              updated_at: new Date().toISOString()
            })
          } else {
            // Create new wine
            wineId = `wine_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
            await blink.db.winesEnhanced.create({
              id: wineId,
              user_id: userId,
              name: wineData.name,
              producer: wineData.producer,
              vintage: wineData.vintage || null,
              type: wineData.type?.toLowerCase() || 'unknown',
              purchase_price: wineData.unitPrice,
              current_stock: wineData.quantity,
              min_stock_threshold: 5,
              supplier_id: supplierId,
              is_active: 1,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
          }

          // Record stock movement
          await blink.db.stockMovementsEnhanced.create({
            id: `movement_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            wine_id: wineId,
            user_id: userId,
            movement_type: 'purchase',
            quantity: wineData.quantity,
            unit_cost: wineData.unitPrice,
            total_cost: wineData.totalPrice || (wineData.unitPrice * wineData.quantity),
            reason: 'Invoice Import',
            reference_number: invoiceData.invoiceInfo?.number || `PDF_${Date.now()}`,
            supplier_id: supplierId,
            created_at: new Date().toISOString()
          })

          successful++
        } catch (error) {
          failed++
          errors.push(`Failed to import ${wineData.name}: ${error.message}`)
        }
      }

      // Log import
      await blink.db.importLogs.create({
        id: `import_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        user_id: userId,
        file_name: file.name,
        file_type: 'pdf',
        file_size: file.size,
        import_type: 'purchases',
        status: failed === 0 ? 'completed' : 'completed_with_errors',
        records_processed: invoiceData.wines.length,
        records_successful: successful,
        records_failed: failed,
        error_details: JSON.stringify(errors),
        ai_processing_notes: invoiceData.insights,
        created_at: new Date().toISOString(),
        completed_at: new Date().toISOString()
      })

      return {
        success: failed === 0,
        recordsProcessed: invoiceData.wines.length,
        recordsSuccessful: successful,
        recordsFailed: failed,
        errors,
        insights: invoiceData.insights
      }

    } catch (error) {
      console.error('Error parsing PDF invoice:', error)
      return {
        success: false,
        recordsProcessed: 0,
        recordsSuccessful: 0,
        recordsFailed: 0,
        errors: [error.message]
      }
    }
  }

  /**
   * Parse Excel/XLSX file
   */
  static async parseExcel(file: File, userId: string): Promise<ImportResult> {
    try {
      // Upload file to storage first
      const { publicUrl } = await blink.storage.upload(
        file,
        `imports/${userId}/${Date.now()}_${file.name}`,
        { upsert: true }
      )

      // Extract text content from Excel file
      const excelText = await blink.data.extractFromUrl(publicUrl)

      // Use AI to parse Excel data (similar to CSV but handle Excel-specific formatting)
      const { object: parsedData } = await blink.ai.generateObject({
        prompt: `Parse this Excel/XLSX data and extract wine inventory information. Handle Excel-specific formatting like merged cells, multiple sheets, and formulas:

        Excel Content:
        ${excelText}

        Extract and standardize wine data, handling various column formats and sheet structures.`,
        schema: {
          type: 'object',
          properties: {
            wines: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  producer: { type: 'string' },
                  vintage: { type: 'number' },
                  type: { type: 'string' },
                  region: { type: 'string' },
                  country: { type: 'string' },
                  purchasePrice: { type: 'number' },
                  sellingPrice: { type: 'number' },
                  currentStock: { type: 'number' },
                  supplier: { type: 'string' },
                  notes: { type: 'string' }
                },
                required: ['name', 'producer', 'type', 'purchasePrice', 'currentStock']
              }
            },
            insights: { type: 'string' }
          },
          required: ['wines']
        }
      })

      // Import logic similar to CSV
      let successful = 0
      let failed = 0
      const errors: string[] = []

      for (const wineData of parsedData.wines) {
        try {
          const wineId = `wine_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
          
          await blink.db.winesEnhanced.create({
            id: wineId,
            user_id: userId,
            name: wineData.name,
            producer: wineData.producer,
            vintage: wineData.vintage || null,
            type: wineData.type.toLowerCase(),
            region: wineData.region || '',
            country: wineData.country || '',
            purchase_price: wineData.purchasePrice,
            selling_price: wineData.sellingPrice || null,
            current_stock: wineData.currentStock,
            min_stock_threshold: 5,
            notes: wineData.notes || '',
            is_active: 1,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })

          successful++
        } catch (error) {
          failed++
          errors.push(`Failed to import ${wineData.name}: ${error.message}`)
        }
      }

      return {
        success: failed === 0,
        recordsProcessed: parsedData.wines.length,
        recordsSuccessful: successful,
        recordsFailed: failed,
        errors,
        insights: parsedData.insights
      }

    } catch (error) {
      console.error('Error parsing Excel file:', error)
      return {
        success: false,
        recordsProcessed: 0,
        recordsSuccessful: 0,
        recordsFailed: 0,
        errors: [error.message]
      }
    }
  }

  /**
   * Get import history for user
   */
  static async getImportHistory(userId: string): Promise<any[]> {
    try {
      const imports = await blink.db.importLogs.list({
        where: { user_id: userId },
        orderBy: { created_at: 'desc' },
        limit: 50
      })

      return imports
    } catch (error) {
      console.error('Error getting import history:', error)
      return []
    }
  }
}