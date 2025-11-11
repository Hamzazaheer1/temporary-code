# Monique-Powell

A full-stack monorepo application with Next.js frontend and Express.js backend, featuring authentication with email/password and Google OAuth.

## 🏗️ Tech Stack

### Frontend
- **Next.js 15** - React framework with App Router
- **TypeScript** - Type safety
- **Tailwind CSS 4** - Styling
- **shadcn/ui** - UI components
- **TanStack Query** - Data fetching and state management
- **Axios** - HTTP client

### Backend
- **Express.js** - Web framework
- **MongoDB** - Database (via Mongoose)
- **Passport.js** - Authentication
- **JWT** - Token-based authentication
- **bcryptjs** - Password hashing

### Monorepo Tools
- **pnpm** - Package manager with workspaces
- **Turborepo** - Build system and task runner

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- pnpm 10.18.0+
- MongoDB (local or Atlas)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/TheFlexLab/Monique-Powell.git
cd Monique-Powell
```

2. Install dependencies:
```bash
pnpm install
```

3. Set up environment variables:

**Backend** (`apps/backend/.env`):
```env
PORT=4000
NODE_ENV=development
MONGODB_URI=your-mongodb-connection-string
JWT_SECRET=your-secret-key
JWT_EXPIRE=7d
SESSION_SECRET=your-session-secret
FRONTEND_URL=http://localhost:3000
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:4000/api/auth/google/callback
```

**Frontend** (`apps/frontend/.env.local`):
```env
NEXT_PUBLIC_API_URL=http://localhost:4000
```

4. Run the development server:
```bash
pnpm dev
```

This will start:
- Frontend: http://localhost:3000
- Backend: http://localhost:4000

## 📁 Project Structure

```
monique-powell/
├── apps/
│   ├── frontend/          # Next.js frontend
│   └── backend/           # Express.js backend
├── packages/              # Shared packages (optional)
├── package.json           # Root package.json
├── pnpm-workspace.yaml    # pnpm workspace configuration
└── turbo.json             # Turborepo configuration
```

## 🔐 Authentication

The application supports two authentication methods:

1. **Email/Password** - Traditional sign up and sign in
2. **Google OAuth** - Sign in with Google account

### Setting up Google OAuth

See [Google OAuth Setup Guide](./apps/backend/GOOGLE_OAUTH_SETUP.md) for detailed instructions.

## 📦 Available Scripts

### Root Level

- `pnpm dev` - Run all apps in development mode (parallel)
- `pnpm build` - Build all apps
- `pnpm lint` - Lint all apps
- `pnpm clean` - Clean build artifacts

### Frontend

- `pnpm dev` - Start Next.js dev server
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint

### Backend

- `pnpm dev` - Start Express server with nodemon
- `pnpm start` - Start Express server
- `pnpm lint` - Run linter (if configured)

## 🔌 API Endpoints

### Authentication

- `POST /api/auth/signup` - Create new account
- `POST /api/auth/signin` - Sign in
- `GET /api/auth/me` - Get current user (protected)
- `POST /api/auth/signout` - Sign out
- `GET /api/auth/google` - Initiate Google OAuth
- `GET /api/auth/google/callback` - Google OAuth callback

## 📚 Documentation

- [Backend API Documentation](./apps/backend/README.md)
- [Google OAuth Setup](./apps/backend/GOOGLE_OAUTH_SETUP.md)

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📝 License

This project is licensed under the ISC License.
