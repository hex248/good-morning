# good morning!

## Overall Idea
A lightweight, TypeScript-based Progressive Web App (PWA) for couples to share daily notices:
- Users can create and send customizable daily messages with optional photos, Spotify songs, colors, and explanations to their partner.
- Partners receive and react to the notices via emoji.
- Features include unique pairing codes, timezone-based resets at midnight, morning reminders for users, and notifications for actions like sending, editing, or reacting.

## Tech Stack
- **Frontend**: SvelteKit (PWA support, TypeScript)
- **Backend**: Go with Gin framework and GORM ORM
- **Database**: PostgreSQL
- **Authentication**: Google OAuth (login with Google)
- **Notifications**: Web Push API
- **Integrations**: Spotify API for song links

## Schema Plan
### User Table
- id: string (primary key)
- timezone: string
- username: string
- email: string (for Google OAuth integration)
- googleId: string (for Google authentication)
- uniqueCode: string (color + animal combination)
- notificationsEnabled: boolean
- pairedUserId: string (links to partner)
- createdAt: Date
- updatedAt: Date

### Notice Table
- id: string (primary key)
- senderId: string (foreign key to User)
- recipientId: string (foreign key to User)
- message: string (optional)
- photoUrl: string (optional)
- songUrl: string (optional, Spotify link)
- songExplanation: string (optional)
- color: string
- reactions: array of strings (emojis from partner)
- sentAt: Date
- editedAt: Date (nullable)
- resetAt: Date (midnight in partner's timezone)

## API Endpoints
- notices/create: User sends full notice contents
- notices/edit: User sends new state of notice
- notices/get: Partner gets current notice
- notices/getAll: User/partner gets history of notices
- notices/react: Partner sends emoji reaction
- auth/google: Google OAuth login
- user/pair: Pair users with pairCode param
- user/get: Get current user and partner data
- user/edit: Edit username
- notifications/subscribe: Subscribe to Web Push notifications

## UI Structure
- **Main Page**: Fullscreen notice from partner, emoji reaction selector in top right, floating action button (FAB) in bottom right for menu
- **FAB Menu Options**:
  - Create/Edit Notice (paintbrush icon)
  - Me Page (person icon)
  - History (history icon)
- **Create/Edit Notice Page**: Form for color, song search (Spotify API), song explanation, message, image attach, preview button, send/edit buttons
- **Me Page**: Username with edit pencil, partner username, options: notification toggle, delete account, log out, unpair with partner
- **History Page**: List of past notices
- **Error States and Loading**: Use SvelteKit's {#await} for loading, {#if} for errors, error pages for global errors

## Security
- Authentication: Google OAuth (manual setup)
- Authorization: Check user pairing for notices
- Input validation: Sanitize inputs to prevent injection
- HTTPS: Use for all communications
- Secrets: Environment variables for API keys (VAPID, Spotify, Google)
- CORS: Configure for PWA
- Database: Use prepared statements in Postgres

## Logging
- Backend: logrus for structured logging
- Frontend: console.log or simple logger

## Testing
- Backend: Go's testing package for unit tests
- Frontend: Vitest for SvelteKit components

## Deployment
- Home server for both Go backend and SvelteKit frontend
- Migrations: Goose for database migrations
- No CI/CD, Docker, or monitoring for now

## Spotify Integration
- Client ID/Secret in backend .env
- No user auth needed for song search
- Backend handles API calls for song data

## Google OAuth
- Manual setup, no library
- Secrets in .env files

## Project Structure
- Follow SvelteKit recommended structure for frontend
- Backend: Standard Go project layout with Gin