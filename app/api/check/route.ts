import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager'

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic'

// Cache for secrets to avoid repeated AWS API calls
let secretsCache: {
  GOOGLE_SERVICE_ACCOUNT_EMAIL?: string
  GOOGLE_PRIVATE_KEY?: string
  GOOGLE_SHEET_ID?: string
} | null = null

async function loadSecretsFromAWS() {
  // Return cached secrets if available
  if (secretsCache) {
    return secretsCache
  }

  try {
    console.log('process.env.AWS_REGION', process.env.AWS_REGION)
    // Initialize AWS Secrets Manager client
    const client = new SecretsManagerClient({
      region: process.env.AWS_REGION || 'us-east-1',
    })

    // Get secret names from environment variables or use defaults
    const secretNames = {
      GOOGLE_SERVICE_ACCOUNT_EMAIL: process.env.AWS_SECRET_NAME_GOOGLE_SERVICE_ACCOUNT_EMAIL || 'GOOGLE_SERVICE_ACCOUNT_EMAIL',
      GOOGLE_PRIVATE_KEY: process.env.AWS_SECRET_NAME_GOOGLE_PRIVATE_KEY || 'GOOGLE_PRIVATE_KEY',
      GOOGLE_SHEET_ID: process.env.AWS_SECRET_NAME_GOOGLE_SHEET_ID || 'GOOGLE_SHEET_ID',
    }

    // Fetch all three secrets in parallel
    const [emailResponse, keyResponse, sheetIdResponse] = await Promise.all([
      client.send(new GetSecretValueCommand({ SecretId: secretNames.GOOGLE_SERVICE_ACCOUNT_EMAIL })),
      client.send(new GetSecretValueCommand({ SecretId: secretNames.GOOGLE_PRIVATE_KEY })),
      client.send(new GetSecretValueCommand({ SecretId: secretNames.GOOGLE_SHEET_ID })),
    ])

    // Extract secret values
    const getSecretValue = (response: any): string => {
      if (response.SecretString) {
        return response.SecretString
      } else if (response.SecretBinary) {
        return Buffer.from(response.SecretBinary).toString('utf-8')
      } else {
        throw new Error('Secret value is empty')
      }
    }

    // Cache the secrets
    secretsCache = {
      GOOGLE_SERVICE_ACCOUNT_EMAIL: getSecretValue(emailResponse).trim(),
      GOOGLE_PRIVATE_KEY: getSecretValue(keyResponse).trim(),
      GOOGLE_SHEET_ID: getSecretValue(sheetIdResponse).trim(),
    }

    return secretsCache
  } catch (error: any) {
    console.error('Error loading secrets from AWS Secrets Manager:', error)
    throw new Error(`Failed to load secrets from AWS Secrets Manager: ${error.message}`)
  }
}

async function getGoogleSheetData() {
  // Load secrets from AWS Secrets Manager
  const secrets = await loadSecretsFromAWS()

  // Validate environment variables
  if (!secrets.GOOGLE_SERVICE_ACCOUNT_EMAIL) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_EMAIL is not set in AWS Secrets Manager')
  }
  if (!secrets.GOOGLE_PRIVATE_KEY) {
    throw new Error('GOOGLE_PRIVATE_KEY is not set in AWS Secrets Manager')
  }
  if (!secrets.GOOGLE_SHEET_ID) {
    throw new Error('GOOGLE_SHEET_ID is not set in AWS Secrets Manager')
  }

  try {
    // Initialize Google Sheets API
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: secrets.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: secrets.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    })

    const sheets = google.sheets({ version: 'v4', auth })
    const spreadsheetId = secrets.GOOGLE_SHEET_ID

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
      const secrets = await loadSecretsFromAWS()
      const serviceAccountEmail = secrets.GOOGLE_SERVICE_ACCOUNT_EMAIL
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
