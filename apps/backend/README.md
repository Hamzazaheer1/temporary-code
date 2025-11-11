# Backend API - Authentication System

This backend uses [Privy](https://privy.io) for user authentication and management.

## Setup

1. Copy `dummy.env` to `.env`:

   ```bash
   cp dummy.env .env
   ```

2. Update `.env` with your Privy credentials:

   ```env
   PRIVY_APP_ID=your-privy-app-id
   PRIVY_APP_SECRET=your-privy-app-secret
   MONGODB_URI=your-mongodb-connection-string  # Optional, for other data
   ```

3. Get Privy credentials:

   - Go to [Privy Dashboard](https://dashboard.privy.io/)
   - Create an app
   - Copy App ID and App Secret

4. Install dependencies (already done):

   ```bash
   pnpm install
   ```

5. Run the server:
   ```bash
   pnpm dev
   ```

## Privy Setup

See [PRIVY_SETUP.md](./PRIVY_SETUP.md) for detailed Privy configuration instructions.

## API Endpoints

### Authentication Routes (`/api/auth`)

#### 1. Sign Up

- **POST** `/api/auth/signup`
- **Body:**
  ```json
  {
    "email": "user@example.com",
    "password": "password123",
    "name": "John Doe" // optional
  }
  ```
- **Response:**
  ```json
  {
    "success": true,
    "message": "User created successfully",
    "data": {
      "user": {
        "id": "...",
        "email": "user@example.com",
        "name": "John Doe"
      },
      "token": "jwt-token"
    }
  }
  ```
- **Sets HTTP-only cookie** with JWT token

#### 2. Sign In

- **POST** `/api/auth/signin`
- **Body:**
  ```json
  {
    "email": "user@example.com",
    "password": "password123"
  }
  ```
- **Response:**
  ```json
  {
    "success": true,
    "message": "Signed in successfully",
    "data": {
      "user": {
        "id": "...",
        "email": "user@example.com",
        "name": "John Doe"
      },
      "token": "jwt-token"
    }
  }
  ```
- **Sets HTTP-only cookie** with JWT token

#### 3. Get Current User (Protected)

- **GET** `/api/auth/me`
- **Headers:** Cookie with token (automatically sent by browser)
- **Response:**
  ```json
  {
    "success": true,
    "data": {
      "user": {
        "id": "...",
        "email": "user@example.com",
        "name": "John Doe",
        "createdAt": "...",
        "updatedAt": "..."
      }
    }
  }
  ```

#### 4. Sign Out

- **POST** `/api/auth/signout`
- **Headers:** Cookie with token
- **Response:**
  ```json
  {
    "success": true,
    "message": "Signed out successfully"
  }
  ```
- **Clears HTTP-only cookie**

## Authentication Flow

1. **Sign Up/Sign In**: User credentials are validated, password is hashed (signup), JWT token is generated and set as HTTP-only cookie
2. **Protected Routes**: Middleware checks for token in cookies, verifies it, and attaches user to `req.user`
3. **Sign Out**: Clears the authentication cookie

## Security Features

- ✅ Passwords are hashed using bcryptjs
- ✅ JWT tokens stored in HTTP-only cookies (prevents XSS)
- ✅ CORS configured for credentials
- ✅ Password excluded from user responses
- ✅ Token expiration (7 days default)

## Testing with cURL

### Sign Up

```bash
curl -X POST http://localhost:4000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","name":"Test User"}' \
  -c cookies.txt
```

### Sign In

```bash
curl -X POST http://localhost:4000/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}' \
  -c cookies.txt
```

### Get Me (with cookies)

```bash
curl -X GET http://localhost:4000/api/auth/me \
  -b cookies.txt
```

### Sign Out

```bash
curl -X POST http://localhost:4000/api/auth/signout \
  -b cookies.txt
```

## Frontend Integration

When making requests from the frontend, ensure:

1. `credentials: 'include'` is set in fetch options
2. CORS is properly configured (already done in backend)
3. Cookies will be automatically sent with requests

Example:

```javascript
fetch("http://localhost:4000/api/auth/signup", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  credentials: "include", // Important for cookies
  body: JSON.stringify({
    email: "user@example.com",
    password: "password123",
    name: "John Doe",
  }),
});
```
