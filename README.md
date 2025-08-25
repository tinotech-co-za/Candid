# Candid Photo Trading App

This is a photo trading app built with [Next.js](https://nextjs.org/) using [Convex](https://convex.dev) as its backend. It allows users to create photo sessions, capture candid moments, and trade photos with friends.

## Project Structure

- **Frontend**: Next.js 15 with App Router in the `app` directory
- **Backend**: Convex functions in the `convex` directory
- **Styling**: Tailwind CSS with custom components
- **Authentication**: Convex Auth with anonymous sign-in

## Features

- 📸 **Photo Sessions**: Create and join photo sessions with friends
- 🔄 **Photo Trading**: Trade photos with other participants
- 🎭 **Anonymous Auth**: Easy sign-in with anonymous authentication
- 📱 **Responsive Design**: Works on desktop and mobile devices

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- A Convex account and project

### Installation

1. Clone the repository
2. Install dependencies:

   ```bash
   npm install
   ```

3. Set up your Convex project:

   - Create a new project at [convex.dev](https://convex.dev)
   - Copy your deployment URL and update `.env.local`:

   ```
   NEXT_PUBLIC_CONVEX_URL=https://your-project-name.convex.cloud
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```

This will start both the Next.js frontend and Convex backend servers.

### Available Scripts

- `npm run dev` - Start development servers (frontend + backend)
- `npm run build` - Build the Next.js application
- `npm start` - Start the production server
- `npm run lint` - Run ESLint

## App Structure

### Pages

- `/` - Home page with authentication and session management
- Individual session views are handled by the main page component

### Components

- `SessionList` - Display and manage photo sessions
- `SessionView` - View individual sessions with photos and trades
- `PhotoGallery` - Display photos and handle trading
- `TradePanel` - Manage trade requests and history
- `SignInForm` / `SignOutButton` - Authentication components

## Convex Backend

The backend uses Convex with the following main functions:

- **Sessions**: Create, join, and manage photo sessions
- **Photos**: Upload, store, and manage photos with file storage
- **Trades**: Handle photo trading between users
- **Auth**: User authentication and management

## Authentication

The app uses [Convex Auth](https://auth.convex.dev/) with anonymous authentication for easy access. You can modify the authentication providers in `convex/auth.config.ts`.

## Deployment

### Next.js Deployment

Deploy the Next.js frontend to Vercel, Netlify, or your preferred platform.

### Convex Deployment

Your Convex backend will automatically deploy when you push to your connected repository.

For more information, see the [Convex deployment docs](https://docs.convex.dev/production/hosting).

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is open source and available under the [MIT License](LICENSE).
