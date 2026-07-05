# EventWall REST API Specification (v1)

Base URL: `/api/v1`

---

## Authentication

### POST `/auth/signup`
Creates a new event organizer account.
- **Request Body:**
  ```json
  {
    "email": "organizer@example.com",
    "password": "Password123!",
    "firstName": "John",
    "lastName": "Doe"
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "message": "Registration successful. Please check your email to verify your account.",
    "userId": "uuid-string"
  }
  ```

### POST `/auth/login`
Logs in a user and returns access/refresh tokens.
- **Request Body:**
  ```json
  {
    "email": "organizer@example.com",
    "password": "Password123!"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "accessToken": "jwt-token-string",
    "refreshToken": "refresh-token-string",
    "user": {
      "id": "uuid-string",
      "email": "organizer@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "ORGANIZER"
    }
  }
  ```

### POST `/auth/refresh-tokens`
Rotates refresh tokens and issues a new access token.
- **Request Body:**
  ```json
  {
    "refreshToken": "refresh-token-string"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "accessToken": "new-jwt-token-string",
    "refreshToken": "new-refresh-token-string"
  }
  ```

---

## Events Module

### POST `/events` (Protected)
Creates a new event.
- **Headers:** `Authorization: Bearer <token>`
- **Request Body:**
  ```json
  {
    "name": "Sarah & Michael Wedding",
    "slug": "sarah-michael-wedding",
    "description": "Celebrate with us!",
    "date": "2026-07-15T00:00:00.000Z",
    "venue": "Grand Ballroom",
    "startTime": "18:00",
    "endTime": "23:00",
    "theme": "dark",
    "maxUploadLimit": 200
  }
  ```

### GET `/events/slug/:slug` (Public)
Fetches public event metadata for guest uploads.
- **Response (200 OK):**
  ```json
  {
    "id": "event-uuid",
    "name": "Sarah & Michael Wedding",
    "slug": "sarah-michael-wedding",
    "description": "Celebrate with us!",
    "theme": "dark",
    "status": "ACTIVE"
  }
  ```

### GET `/events/:id/qr` (Protected)
Downloads generated QR code in PNG, SVG, or print-ready PDF flyer.
- **Query Params:** `format=png|svg|pdf`
- **Response:** Raw binary file.

---

## Photos & Moderation

### POST `/photos/upload` (Public)
Allows guests to upload photos using `multipart/form-data`.
- **Fields:**
  - `image`: File binary
  - `eventSlug`: `sarah-michael-wedding`
- **Response (201 Created):**
  ```json
  {
    "message": "Photo uploaded successfully and is pending moderation.",
    "photo": {
      "id": "photo-uuid",
      "eventId": "event-uuid",
      "originalName": "photo.jpg",
      "filename": "123456789_photo.jpg",
      "thumbnailFilename": "events/event-uuid/thumbnails/123456789_photo.jpg",
      "optimizedFilename": "events/event-uuid/optimized/123456789_photo.jpg",
      "status": "PENDING"
    }
  }
  ```

### PATCH `/photos/:id/status` (Protected)
Moderates a photo (Approve, Reject, or Delete).
- **Headers:** `Authorization: Bearer <token>`
- **Request Body:**
  ```json
  {
    "status": "APPROVED" // or REJECTED, DELETED
  }
  ```
- **Response (200 OK):** Updated photo object.
- **Note:** Approving a photo triggers real-time updates via Socket.io and copies the image to the local Resolume watch folder (`uploads/events/{eventId}/approved/`).

### POST `/photos/bulk-status` (Protected)
Performs bulk approval or rejection.
- **Request Body:**
  ```json
  {
    "photoIds": ["uuid-1", "uuid-2"],
    "status": "APPROVED",
    "eventId": "event-uuid"
  }
  ```
