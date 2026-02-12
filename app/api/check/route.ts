import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'

async function getGoogleSheetData() {
  // Validate environment variables
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_EMAIL is not set in environment variables')
  }
  if (!process.env.GOOGLE_PRIVATE_KEY) {
    throw new Error('GOOGLE_PRIVATE_KEY is not set in environment variables')
  }
  if (!process.env.GOOGLE_SHEET_ID) {
    throw new Error('GOOGLE_SHEET_ID is not set in environment variables')
  }

  try {
    // Initialize Google Sheets API
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    })

    const sheets = google.sheets({ version: 'v4', auth })
    const spreadsheetId = process.env.GOOGLE_SHEET_ID

    // Read the sheet data
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'A:C', // Assuming data starts from column A (Locker, Order ID, code)
    })

    return response.data.values || []
  } catch (error: any) {
    console.error('Error reading Google Sheet:', error)

    // Provide more specific error messages
    if (error.code === 403) {
      const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
      throw new Error(
        `Permission denied (403). Make sure:\n` +
        `1. The Google Sheet is shared with: ${serviceAccountEmail}\n` +
        `2. Google Sheets API is enabled in Google Cloud Console\n` +
        `3. The service account has proper permissions\n` +
        `4. The GOOGLE_SHEET_ID is correct`
      )
    }
    if (error.code === 404) {
      throw new Error('Google Sheet not found. Check if GOOGLE_SHEET_ID is correct')
    }
    if (error.message) {
      throw error
    }
    throw new Error(`Failed to read Google Sheet: ${error.message || 'Unknown error'}`)
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const orderId = searchParams.get('order_id')

    if (!orderId) {
      return NextResponse.json(
        { error: 'order_id parameter is required' },
        { status: 400 }
      )
    }

    // Get data from Google Sheet
    const rows = await getGoogleSheetData()

    if (!rows || rows.length === 0) {
      return NextResponse.json(
        { error: 'No data found in sheet' },
        { status: 404 }
      )
    }

    // Skip header row (assuming first row is headers)
    const dataRows = rows.slice(1)

    // Find the row with matching Order ID
    // Assuming columns are: Locker (index 0), Order ID (index 1), code (index 2)
    const orderRow = dataRows.find((row) => row[1] === orderId)

    if (!orderRow || !orderRow[2]) {
      return NextResponse.json(
        { error: 'Order ID not found' },
        { status: 404 }
      )
    }

    // Return the code
    return NextResponse.json({
      data: {
        code: orderRow[2],
      },
    })
  } catch (error: any) {
    console.error('API Error:', error)

    // Return more specific error messages
    if (error.message?.includes('Permission denied') || error.message?.includes('403')) {
      return NextResponse.json(
        {
          error: 'Permission denied',
          message: error.message,
          details: 'Check README.md for troubleshooting steps'
        },
        { status: 403 }
      )
    }
    if (error.message?.includes('not found') || error.message?.includes('404')) {
      return NextResponse.json(
        {
          error: 'Sheet not found',
          message: error.message
        },
        { status: 404 }
      )
    }
    if (error.message?.includes('not set')) {
      return NextResponse.json(
        {
          error: 'Configuration error',
          message: error.message
        },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error.message || 'Unknown error occurred'
      },
      { status: 500 }
    )
  }
}
