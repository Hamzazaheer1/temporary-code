# Privy Authentication Setup Guide

This backend now uses [Privy](https://privy.io) for user authentication instead of custom JWT authentication.

## What Changed

- ✅ User creation now uses Privy's `users().create()` API
- ✅ Authentication tokens are Privy access tokens
- ✅ User data is stored in Privy (no need for MongoDB User model for auth)
- ✅ Automatic wallet creation for new users (Ethereum wallets)

## Setup Instructions

### Step 1: Create a Privy Account

1. Go to [Privy Dashboard](https://dashboard.privy.io/)
2. Sign up or log in
3. Create a new app
4. Copy your **App ID** and **App Secret**

### Step 2: Configure Environment Variables

Add to your `.env` file:

```env
PRIVY_APP_ID=your-privy-app-id
PRIVY_APP_SECRET=your-privy-app-secret
```

### Step 3: API Endpoints

#### Sign Up

```bash
POST /api/auth/signup
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",  # Note: Privy handles password on frontend
  "name": "John Doe"  # optional
}
```

**Response:**

```json
{
  "success": true,
  "message": "User created successfully",
  "data": {
    "user": {
      "id": "privy-user-id",
      "email": "user@example.com",
      "name": "John Doe",
      "createdAt": "2024-..."
    },
    "wallet": {
      "id": "wallet-id",
      "address": "0x...",
      "chain_type": "ethereum"
    }
  }
}
```

#### Sign In

```bash
POST /api/auth/signin
Content-Type: application/json

{
  "email": "user@example.com",
  "privyToken": "privy-access-token"  # From Privy frontend SDK
}
```

**Note:** For full authentication flow, use Privy's React SDK on the frontend. The backend signin endpoint verifies the Privy access token.

#### Get Current User

```bash
GET /api/auth/me
Authorization: Bearer <privy-access-token>
# OR
Cookie: token=<privy-access-token>
```

#### Sign Out

```bash
POST /api/auth/signout
```

## How It Works

1. **Sign Up**: Creates a user in Privy with email linked account and optionally creates an Ethereum wallet
2. **Sign In**: Verifies Privy access token (typically obtained from Privy's frontend SDK)
3. **Protected Routes**: Middleware verifies Privy access token using `privy.users().get(token)`
4. **Get User**: Fetches user data from Privy using the user ID

## Migration Notes

- The MongoDB User model is no longer used for authentication
- JWT tokens are replaced with Privy access tokens
- Password validation is handled by Privy
- Google OAuth is integrated with Privy - see [PRIVY_GOOGLE_OAUTH_SETUP.md](./PRIVY_GOOGLE_OAUTH_SETUP.md) for details

## Resources

- [Privy Node.js SDK Docs](https://docs.privy.io/basics/nodeJS/quickstart)
- [Privy Dashboard](https://dashboard.privy.io/)
- [Privy React SDK](https://docs.privy.io/basics/react/quickstart)
