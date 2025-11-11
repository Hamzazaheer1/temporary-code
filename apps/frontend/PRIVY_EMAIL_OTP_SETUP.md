# Privy Email OTP Authentication Setup

This application now uses Privy's email OTP (One-Time Password) authentication for sign-in and sign-up.

## Setup Instructions

### Step 1: Configure Environment Variables

**IMPORTANT**: You must create a `.env.local` file in the `apps/frontend` directory and add your Privy App ID.

1. Create a file named `.env.local` in the `apps/frontend` directory
2. Add the following:

```env
NEXT_PUBLIC_PRIVY_APP_ID=your-privy-app-id
```

**Note**:

- Use the same App ID value as your backend's `PRIVY_APP_ID` (from `apps/backend/.env`)
- The `NEXT_PUBLIC_` prefix is required for Next.js to expose this variable to the browser
- You can find your Privy App ID in the [Privy Dashboard](https://dashboard.privy.io/)

3. **Restart your Next.js dev server** after adding the environment variable:
   ```bash
   # Stop the server (Ctrl+C) and restart
   pnpm dev
   ```

### Step 2: Enable Email Authentication in Privy Dashboard

1. Go to [Privy Dashboard](https://dashboard.privy.io/)
2. Select your app
3. Navigate to **Authentication** → **Login Methods**
4. Enable **Email** authentication
5. Configure email settings as needed

### Step 3: How It Works

#### Sign-In Flow:

1. User enters their email address
2. Clicks "Send Code" button
3. Privy sends a 6-digit OTP code to the user's email
4. User enters the code
5. Clicks "Verify Code" button
6. Privy authenticates the user and returns an access token
7. The access token is sent to your backend for verification
8. User is redirected to the dashboard

#### Sign-Up Flow:

1. User enters their name (optional) and email address
2. Clicks "Send Code" button
3. Privy sends a 6-digit OTP code to the user's email
4. User enters the code
5. Clicks "Verify Code" button
6. Privy creates a new user account and authenticates them
7. The access token is sent to your backend
8. User is redirected to the dashboard

## Features

- ✅ Email OTP verification (6-digit code)
- ✅ Automatic user creation for new sign-ups
- ✅ Integration with existing backend authentication
- ✅ Error handling and loading states
- ✅ "Use a different email" option
- ✅ Responsive design matching your existing UI

## Code Structure

- **PrivyProvider** (`providers/PrivyProvider.tsx`): Wraps the app with Privy's provider
- **Sign-In Page** (`app/(pages)/sign-in/page.tsx`): Uses `useLoginWithEmail` hook
- **Sign-Up Page** (`app/(pages)/sign-up/page.tsx`): Uses `useLoginWithEmail` hook with signup enabled

## References

- [Privy Email Authentication Docs](https://docs.privy.io/authentication/user-authentication/login-methods/email)
- [Privy React Auth SDK](https://docs.privy.io/basics/react/installation)
