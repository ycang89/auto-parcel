# Auto Parcel API

A Next.js API application that reads data from Google Sheets and exposes an endpoint for third-party integration.

## Features

- Reads data from Google Sheets API
- Exposes REST API endpoint: `/api/check?order_id=xxx`
- Returns order code based on Order ID lookup

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Google Sheets API Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google Sheets API:
   - Navigate to "APIs & Services" > "Library"
   - Search for "Google Sheets API"
   - Click "Enable"

4. Create a Service Account:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "Service Account"
   - Give it a name and create
   - Click on the created service account
   - Go to "Keys" tab > "Add Key" > "Create new key"
   - Choose JSON format and download

5. Share your Google Sheet with the service account email:
   - Open your Google Sheet
   - Click "Share" button
   - Add the service account email (found in the JSON file as `client_email`)
   - Give it "Viewer" permissions

6. Get your Sheet ID:
   - Open your Google Sheet
   - The Sheet ID is in the URL: `https://docs.google.com/spreadsheets/d/SHEET_ID/edit`

### 3. Environment Variables

Create a `.env.local` file in the root directory.

#### How to Get GOOGLE_PRIVATE_KEY

When you download the JSON key file in step 4 above, it will look something like this:

```json
{
  "type": "service_account",
  "project_id": "your-project-id",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n",
  "client_email": "your-service-account@project-id.iam.gserviceaccount.com",
  "client_id": "...",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  ...
}
```

**To extract the values:**

1. **GOOGLE_SERVICE_ACCOUNT_EMAIL**: Copy the value of `"client_email"` from the JSON file
   - Example: `your-service-account@project-id.iam.gserviceaccount.com`

2. **GOOGLE_PRIVATE_KEY**: Copy the entire value of `"private_key"` from the JSON file
   - This includes the `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----` lines
   - Keep all the `\n` characters as they are (they represent newlines)
   - The value should be wrapped in quotes in your `.env.local` file

3. **GOOGLE_SHEET_ID**: Get this from your Google Sheet URL
   - URL format: `https://docs.google.com/spreadsheets/d/SHEET_ID/edit`
   - Copy the `SHEET_ID` part

#### Example .env.local file:

```env
GOOGLE_SERVICE_ACCOUNT_EMAIL=my-service-account@my-project-123456.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n"
GOOGLE_SHEET_ID=1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms
```

**Important Notes:**
- The `GOOGLE_PRIVATE_KEY` must be wrapped in double quotes (`"`)
- Keep all `\n` characters in the private key - they are important!
- Never commit the `.env.local` file to git (it's already in `.gitignore`)

### 4. Google Sheet Format

Your Google Sheet should have the following columns:
- Column A: Locker
- Column B: Order ID
- Column C: code

The first row should be headers, and data starts from row 2.

## Running the Application

### Development

```bash
npm run dev
```

The API will be available at `http://localhost:3000/api/check?order_id=xxx`

### Production

```bash
npm run build
npm start
```

## API Usage

### Endpoint

```
GET /api/check?order_id=xxx
```

### Example Request

```bash
curl http://localhost:3000/api/check?order_id=12345
```

### Example Response

```json
{
  "data": {
    "code": "1234"
  }
}
```

### Error Responses

- `400 Bad Request`: Missing `order_id` parameter
- `403 Forbidden`: Permission denied (see Troubleshooting below)
- `404 Not Found`: Order ID not found in sheet or Sheet not found
- `500 Internal Server Error`: Server error (check logs)

## Troubleshooting

### 403 Permission Denied Error

If you see a `403` error with "The caller does not have permission", follow these steps:

1. **Verify Service Account Email is Shared with Sheet:**
   - Open your Google Sheet
   - Click the "Share" button (top right)
   - Check if the service account email (from `GOOGLE_SERVICE_ACCOUNT_EMAIL`) is in the list
   - If not, add it with "Viewer" permissions
   - The email format should be: `your-service-account@project-id.iam.gserviceaccount.com`

2. **Verify Google Sheets API is Enabled:**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Select your project
   - Navigate to "APIs & Services" > "Library"
   - Search for "Google Sheets API"
   - Make sure it shows "Enabled" (not "Enable")

3. **Verify Environment Variables:**
   - Check that `.env.local` file exists in the root directory
   - Verify all three variables are set:
     - `GOOGLE_SERVICE_ACCOUNT_EMAIL`
     - `GOOGLE_PRIVATE_KEY`
     - `GOOGLE_SHEET_ID`
   - Make sure there are no extra spaces or quotes around values (except for `GOOGLE_PRIVATE_KEY` which needs quotes)
   - Restart your dev server after changing `.env.local`

4. **Verify Sheet ID:**
   - Open your Google Sheet
   - Check the URL: `https://docs.google.com/spreadsheets/d/SHEET_ID/edit`
   - Make sure `GOOGLE_SHEET_ID` matches the ID in the URL exactly

5. **Verify Private Key Format:**
   - The `GOOGLE_PRIVATE_KEY` should start with `"-----BEGIN PRIVATE KEY-----`
   - It should end with `-----END PRIVATE KEY-----\n"`
   - Make sure all `\n` characters are preserved
   - The entire value should be wrapped in double quotes

6. **Check Service Account Key:**
   - Make sure you're using the correct JSON key file
   - The key should not be expired or revoked
   - Try creating a new key if the current one doesn't work

### Common Issues

- **"Sheet not found"**: Double-check the `GOOGLE_SHEET_ID` in your `.env.local` file
- **"Configuration error"**: One or more environment variables are missing
- **Authentication errors**: Verify the private key is correctly formatted with proper newlines

## Deployment

### Free Deployment Options

#### Option 1: Vercel (Recommended - Best for Next.js) ⭐

Vercel offers free hosting with automatic deployments from GitHub.

**Steps:**

1. **Push your code to GitHub:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/auto-parcel.git
   git push -u origin main
   ```

2. **Deploy to Vercel:**
   - Go to [vercel.com](https://vercel.com)
   - Sign up/login with your GitHub account
   - Click "Add New Project"
   - Import your GitHub repository
   - Vercel will auto-detect Next.js settings

3. **Add Environment Variables:**
   - In your Vercel project dashboard, go to "Settings" > "Environment Variables"
   - Add these three variables:
     - `GOOGLE_SERVICE_ACCOUNT_EMAIL` = your service account email
     - `GOOGLE_PRIVATE_KEY` = your private key (paste the entire value including quotes)
     - `GOOGLE_SHEET_ID` = your sheet ID
   - Make sure to select all environments (Production, Preview, Development)
   - Click "Save"

4. **Deploy:**
   - Vercel will automatically deploy
   - Your API will be available at: `https://your-project-name.vercel.app/api/check?order_id=xxx`

**Vercel Free Tier Includes:**
- Unlimited deployments
- Automatic HTTPS
- Custom domains
- Automatic deployments from GitHub
- 100GB bandwidth/month
- Serverless functions

#### Option 2: Netlify

1. **Push to GitHub** (same as above)

2. **Deploy to Netlify:**
   - Go to [netlify.com](https://netlify.com)
   - Sign up/login with GitHub
   - Click "Add new site" > "Import an existing project"
   - Connect your GitHub repository
   - Build settings:
     - Build command: `npm run build`
     - Publish directory: `.next`
   - Click "Deploy site"

3. **Add Environment Variables:**
   - Go to "Site settings" > "Environment variables"
   - Add the three Google Sheets variables

#### Option 3: Railway

1. **Push to GitHub**

2. **Deploy to Railway:**
   - Go to [railway.app](https://railway.app)
   - Sign up with GitHub
   - Click "New Project" > "Deploy from GitHub repo"
   - Select your repository
   - Railway will auto-detect Next.js

3. **Add Environment Variables:**
   - Go to "Variables" tab
   - Add the three environment variables

#### Option 4: Render

1. **Push to GitHub**

2. **Deploy to Render:**
   - Go to [render.com](https://render.com)
   - Sign up with GitHub
   - Click "New" > "Web Service"
   - Connect your repository
   - Settings:
     - Build Command: `npm install && npm run build`
     - Start Command: `npm start`
   - Click "Create Web Service"

3. **Add Environment Variables:**
   - Go to "Environment" section
   - Add the three variables

### Important Notes for Deployment

1. **Never commit `.env.local`** - It's already in `.gitignore`
2. **Set environment variables in your hosting platform** - Each platform has its own UI for this
3. **Private Key Format** - When pasting `GOOGLE_PRIVATE_KEY` in the hosting platform:
   - Include the entire key with `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----`
   - Keep all `\n` characters
   - Some platforms may require you to paste it without quotes (the platform handles quotes)
4. **Restart after adding variables** - Some platforms require a redeploy after adding environment variables

### Testing Your Deployed API

Once deployed, test your API:

```bash
curl https://your-app-url.vercel.app/api/check?order_id=12345
```

You should get:
```json
{
  "data": {
    "code": "1234"
  }
}
```

### Recommended: Vercel

**Why Vercel is best for Next.js:**
- Made by the creators of Next.js
- Zero configuration needed
- Automatic deployments from GitHub
- Free SSL certificates
- Global CDN
- Serverless functions included
- Best performance for Next.js apps
