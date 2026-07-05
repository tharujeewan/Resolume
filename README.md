# EventWall 🧱

EventWall is a real-time photo wall SaaS application designed for live events, such as weddings, concerts, festivals, conferences, and corporate parties. 

Guests scan an automatically generated event QR code, take or upload photos directly from their phone, and those photos instantly appear on a large LED display wall (via a live web gallery slideshow) or automatically sync to **Resolume Arena** for live VJ mixing.

---

## Technical Stack

- **Frontend:** React, TypeScript, Vite, Tailwind CSS, React Router, React Query (TanStack), Axios, Socket.io-client
- **Backend:** Node.js, Express, TypeScript, Socket.io (WebSockets)
- **Database:** PostgreSQL & Prisma ORM
- **Authentication:** Role-Based Access Control, JWT Access & Refresh Token rotation
- **Image Processing:** Sharp (high-performance image processing generating optimized and thumbnail scales)
- **Deployment:** Docker & Docker Compose

---

## Local Setup & Installation

### 1. Prerequisites
- [Node.js](https://nodejs.org) (v18 or newer)
- [PostgreSQL](https://www.postgresql.org/) database running locally (or running in Docker)

### 2. Configuration Setup
Create a `.env` file in the root workspace directory (you can copy values from the default `.env` already present):
```env
PORT=5000
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/eventwall?schema=public"
JWT_SECRET="eventwall_jwt_secret_key_change_me_in_prod"
JWT_REFRESH_SECRET="eventwall_jwt_refresh_secret_key"
UPLOAD_DIR=../uploads
CORS_ORIGIN="http://localhost:5173"
```

### 3. Server Setup
```bash
# Navigate to server directory
cd server

# Install dependencies
npm install

# Run database migrations
npm run prisma:migrate

# Seed default roles, super admin, and organizer records
npm run prisma:seed

# Start the Express TypeScript dev server with hot-reload
npm run dev
```

### 4. Client Setup
```bash
# Navigate to client directory
cd client

# Install dependencies
npm install

# Start the Vite React development server
npm run dev
```
Open `http://localhost:5173` in your browser.

---

## Seed Credentials
The seed script creates two default verified accounts for development:

1. **Super Admin:**
   - **Email:** `admin@eventwall.com`
   - **Password:** `AdminSecurePassword2026!`

2. **Event Organizer:**
   - **Email:** `organizer@eventwall.com`
   - **Password:** `OrganizerSecurePassword2026!`

---

## Resolume Arena Integration

EventWall generates a unique, structured folder for each event's approved photos:
```
uploads/events/{event-id}/approved/
```

- When a photo is uploaded by a guest, it sits in **Pending** status.
- Once an Event Organizer approves it in the moderation console:
  1. The optimized JPEG is copied directly to the `approved/` folder.
  2. A Socket.io event is dispatched to update active browser display walls.
- VJ Software like **Resolume Arena** can simply watch this `approved/` directory. Whenever a new file is added, Resolume will automatically display it.
- If a photo is rejected or deleted after approval, the file is automatically purged from the directory.

---

## Docker Compose Quickstart

The entire stack can be launched locally using Docker Compose. The environment is configured with shared volumes for both PostgreSQL data and image uploads.

```bash
# Build and launch db, server, and client containers
docker-compose up --build
```
- **Frontend URL:** `http://localhost` (port 80)
- **Backend API:** `http://localhost:5000`
- **Database Port:** `http://localhost:5432`
