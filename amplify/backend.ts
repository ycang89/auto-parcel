import { defineBackend } from '@aws-amplify/backend';
import { secret } from '@aws-amplify/backend';

/**
 * @see https://docs.amplify.aws/react/build-a-backend/ to add storage, functions, and more
 */
export const backend = defineBackend({
  // Define separate secret resources for each environment variable
  googleServiceAccountEmail: secret('GOOGLE_SERVICE_ACCOUNT_EMAIL'),
  googlePrivateKey: secret('GOOGLE_PRIVATE_KEY'),
  googleSheetId: secret('GOOGLE_SHEET_ID'),
});
