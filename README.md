# CodeSpace - Developer Portal

A full-stack developer portal for managing repositories and developers within an organization. Built with Next.js 16, React 19, TypeScript, and Baserow as the database backend.

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Authentication](#authentication)
- [API Reference](#api-reference)
- [Database Schema](#database-schema)
- [Pages & Routes](#pages--routes)
- [Role-Based Access](#role-based-access)

---

## Features

### For Developers
- Dashboard with repository statistics and charts
- Browse and manage repositories
- Add new repositories via a 3-step wizard (select GitHub repo, add docs/env vars, add deployment links)
- Edit and delete own repositories
- View repository details and contributors
- Update profile (username, avatar)
- Dark/light theme toggle

### For Admins
- All developer features
- View and manage **all** repositories across the organization
- View all registered developers
- Approve or ban developer access
- Monitor contributor analytics with charts

---

## Tech Stack

| Category       | Technology                          |
| -------------- | ----------------------------------- |
| Framework      | Next.js 16.1.6                      |
| UI Library     | React 19.2.3                        |
| Language       | TypeScript 5                        |
| Database       | Baserow (self-hosted)               |
| Authentication | GitHub OAuth + Email/Password       |
| Styling        | Tailwind CSS 4 + shadcn/ui          |
| Charts         | Recharts                            |
| Icons          | Lucide React                        |
| HTTP Client    | Axios                               |
| Notifications  | Sonner                              |

---

## Project Structure

```
frontend/
├── app/
│   ├── api/                    # API routes
│   │   ├── auth/               # Authentication (login, callback, credentials, logout)
│   │   ├── developers/         # Developer management (admin)
│   │   ├── github/             # GitHub API integration (repos, contributors, last-updated)
│   │   ├── repos/              # Repository CRUD
│   │   ├── settings/           # User profile settings
│   │   └── upload/             # File upload to Baserow
│   ├── dashboard/              # Protected pages
│   │   ├── page.tsx            # Dashboard home (stats & overview)
│   │   ├── repos/              # Repository management
│   │   ├── developers/         # Developer management (admin only)
│   │   └── settings/           # User settings
│   ├── login/                  # Login page
│   └── overview/               # Overview page
├── components/
│   ├── dashboard/              # Dashboard-specific components
│   ├── ui/                     # shadcn UI components
│   └── theme/                  # Theme provider
├── services/                   # API client services
├── hooks/                      # Custom React hooks
├── lib/                        # Utility functions
├── utils/                      # Axios client config
└── middleware.ts               # Auth middleware
```

---

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- A GitHub OAuth App
- A Baserow instance with the required tables

### Installation

```bash
# Clone the repository
git clone <repo-url>
cd code-space/frontend

# Install dependencies
npm install

# Copy environment variables
cp .env.exemple .env
# Edit .env with your configuration

# Run development server
npm run dev
```

The app will be available at `http://localhost:3000`.

### Build for Production

```bash
npm run build
npm start
```

---

## Environment Variables

Create a `.env` file in the `frontend/` directory with the following variables:

| Variable                  | Description                              |
| ------------------------- | ---------------------------------------- |
| `APP_URL`                 | Application URL (e.g. `http://localhost:3000`) |
| `GITHUB_CLIENT_ID`        | GitHub OAuth App Client ID               |
| `GITHUB_CLIENT_SECRET`    | GitHub OAuth App Client Secret           |
| `GITHUB_ORGANIZATION`     | GitHub organization name for access      |
| `BASEROW_URL`             | Baserow instance URL                     |
| `BASEROW_API_TOKEN`       | Baserow API authentication token         |
| `BASEROW_USERS_TABLE_ID`  | Baserow table ID for users               |
| `BASEROW_REPOS_TABLE_ID`  | Baserow table ID for repositories        |
| `BASEROW_ADMIN_EMAIL`     | Default admin email                      |
| `BASEROW_ADMIN_PASSWORD`  | Default admin password                   |

---

## Authentication

### GitHub OAuth (Primary)

1. User clicks "Login with GitHub"
2. Redirected to GitHub for authorization (scopes: `read:org`, `repo`, `user:email`)
3. GitHub redirects back with an authorization code
4. Server exchanges code for an access token
5. User profile is fetched and upserted in Baserow
6. Session cookies are set (`session_user`, `github_token`)

### Email/Password

1. User submits email and password
2. Server looks up the user in Baserow and verifies the bcrypt-hashed password
3. Session cookie (`session_user`) is set

### Session Management

- **`session_user`** cookie: Contains user data (httpOnly)
- **`github_token`** cookie: GitHub access token for API calls (httpOnly)
- **Middleware**: Protects all `/dashboard/*` routes — unauthenticated users are redirected to `/login`

---

## API Reference

### Authentication

| Method | Endpoint                 | Description                  |
| ------ | ------------------------ | ---------------------------- |
| GET    | `/api/auth/login`        | Initiate GitHub OAuth flow   |
| GET    | `/api/auth/callback`     | GitHub OAuth callback        |
| POST   | `/api/auth/credentials`  | Email/password login         |
| POST   | `/api/auth/logout`       | Clear session and log out    |

### Repositories

| Method | Endpoint           | Description                          | Access     |
| ------ | ------------------ | ------------------------------------ | ---------- |
| GET    | `/api/repos`       | List repositories (filtered by role) | All users  |
| POST   | `/api/repos`       | Create a new repository              | All users  |
| GET    | `/api/repos/[id]`  | Get repository details               | All users  |
| PATCH  | `/api/repos/[id]`  | Update a repository                  | All users  |
| DELETE | `/api/repos/[id]`  | Delete a repository                  | All users  |

### Developers (Admin Only)

| Method | Endpoint                | Description                   |
| ------ | ----------------------- | ----------------------------- |
| GET    | `/api/developers`       | List all developers           |
| PATCH  | `/api/developers/[id]`  | Toggle developer active status |

### GitHub Integration

| Method | Endpoint                     | Description                        |
| ------ | ---------------------------- | ---------------------------------- |
| GET    | `/api/github/repos`          | Fetch user's GitHub repositories   |
| GET    | `/api/github/contributors`   | Get contributors for a repository  |
| GET    | `/api/github/last-updated`   | Get last push timestamps for repos |

### Settings

| Method | Endpoint         | Description               |
| ------ | ---------------- | ------------------------- |
| GET    | `/api/settings`  | Get current user profile  |
| PATCH  | `/api/settings`  | Update profile (username, avatar) |

### Upload

| Method | Endpoint        | Description               |
| ------ | --------------- | ------------------------- |
| POST   | `/api/upload`   | Upload file to Baserow    |

---

## Database Schema

The app uses **Baserow** with two main tables:

### Users Table

| Field             | Type     | Description                        |
| ----------------- | -------- | ---------------------------------- |
| `id`              | number   | Auto-generated ID                  |
| `username`        | string   | Display name                       |
| `Email`           | string   | User email address                 |
| `Role`            | string   | `admin` or `developer`             |
| `active`          | boolean  | Whether the user can access the app |
| `password_hashed` | string   | Bcrypt-hashed password             |
| `github_login`    | string   | GitHub username                    |
| `pfp`             | file[]   | Profile picture (uploaded to Baserow) |

### Repositories Table

| Field          | Type   | Description                           |
| -------------- | ------ | ------------------------------------- |
| `id`           | number | Auto-generated ID                     |
| `repo_name`    | string | Repository name                       |
| `description`  | string | Repository description                |
| `status`       | string | `in_progress`, `done`, or `cancelled` |
| `contributors` | string | Comma-separated GitHub usernames      |
| `repo_link`    | string | GitHub repository URL                 |
| `deployment`   | string | Deployment URL                        |
| `demo_link`    | string | Demo/preview URL                      |
| `user_docs`    | string | User documentation link               |
| `tech_docs`    | string | Technical documentation link          |
| `env_vars`     | string | Environment variables (text)          |

---

## Pages & Routes

### Public

| Route       | Description                      |
| ----------- | -------------------------------- |
| `/`         | Home — redirects to `/login`     |
| `/login`    | Login page (GitHub + credentials)|
| `/overview` | Overview page                    |

### Protected (requires authentication)

| Route                        | Description                  | Access    |
| ---------------------------- | ---------------------------- | --------- |
| `/dashboard`                 | Dashboard with stats & charts | All users |
| `/dashboard/repos`           | Repository list & management | All users |
| `/dashboard/repos/[id]`      | Repository details           | All users |
| `/dashboard/repos/[id]/edit` | Edit repository              | All users |
| `/dashboard/developers`      | Developer management         | Admin     |
| `/dashboard/settings`        | User profile settings        | All users |

---

## Role-Based Access

| Feature                    | Developer | Admin |
| -------------------------- | --------- | ----- |
| View dashboard stats       | Yes       | Yes   |
| Manage own repositories    | Yes       | Yes   |
| View all repositories      | No        | Yes   |
| Manage developers          | No        | Yes   |
| Approve/ban users          | No        | Yes   |
| Update own profile         | Yes       | Yes   |
| View contributor analytics | No        | Yes   |
