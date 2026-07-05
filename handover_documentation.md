# EventWall VJ Integration: Technical Handover & Operations Manual

This document provides complete system architecture details, cloud deployment guidelines, VJ client-station setup instructions, and maintenance procedures for the EventWall VJ Integration system. This manual is written specifically for the **IT and Systems Engineering** team.

---

## 1. System Architecture Overview

The system uses a **decoupled cloud-local hybrid model** to capture guest photos in the cloud and pipe them to a local VJ workstation for real-time display on LED walls:

```mermaid
flowchart TD
    subgraph Mobile Guest View (Any Browser)
        A[Scan QR Code] --> B[Guest Upload UI]
        B -->|1. Client-Side Compress & HEIC Convert| C[Upload Photo]
    end

    subgraph AWS EC2 Instance (Cloud Server)
        C -->|2. Upload Image API / Port 80| D[Nginx Proxy]
        D -->|3. Express Server / Port 5000| E[Express API Backend]
        E -->|4. Store Metadata| F[(PostgreSQL Database)]
        E -->|5. Save File| G[Uploads Storage]
        E -->|6. Auto-Approve logic / WS Emit| H[Socket.io WebSockets]
    end

    subgraph VJ Laptop (Local Workstation)
        I[local-sync.js Daemon] -->|7. Socket.io Client Connection| H
        I -->|8. Fetch catch-up photos| E
        I -->|9. Download files to C:/EventWall| G
        I -->|10. URL Encoded File URIs| J[Resolume REST API / Port 8080]
        J -->|11. Loop Slideshow / Autopilot| K[Resolume Arena Output]
    end

    K -->|12. Display| L[LED Wall / Projector]
```

### Key Protocol Bridges:
1. **WebSockets (Socket.io):** Keeps the local client instantly updated on newly approved uploads in real-time (sub-second latency).
2. **Resolume REST API (Port 8080):** Controls Resolume Arena programmatically, loading incoming images into rolling clip slots sequentially.

---

## 2. Project Directory Structure

```text
├── .github/workflows/   # CI/CD GitHub Actions deployment workflows
├── client/              # React (Vite) Frontend Web Portal
│   ├── src/pages/       # Page components (GuestUpload, Moderation, Dashboard)
│   └── package.json     # Frontend dependencies and run scripts
├── server/              # Express + TypeScript Backend API
│   ├── src/controllers/ # Request handlers (Photo, Event, Auth)
│   ├── src/services/    # Business services (Resolume integration, Image compression)
│   ├── src/db/          # Prisma database configuration and seed data
│   └── package.json     # Backend dependencies and run scripts
├── docker/              # Container build files (Nginx & Server Dockerfiles)
├── deploy-ec2.sh        # Automates Docker installations and initial server configuration
├── docker-compose.yml   # Multi-container orchestration (App, Client, PostgreSQL)
└── local-sync.js        # Node.js synchronization client running on local VJ laptop
```

---

## 3. Cloud Deployment Guide (AWS EC2 / Ubuntu)

### Prerequisites:
- Ubuntu Server 22.04 LTS or newer.
- Minimum 2GB RAM (t3.small or larger recommended for image processing).
- Open inbound ports:
  - `80` (HTTP web interface & uploads)
  - `443` (HTTPS, if SSL is bound via certbot)
  - `22` (SSH management)

### Initial Setup Sequence:
1. Clone the repository onto the EC2 host:
   ```bash
   git clone <repository_url> ~/Resolume
   cd ~/Resolume
   ```
2. Configure environment variables. Duplicate the `.env` template:
   ```bash
   cp .env.example .env
   nano .env
   ```
   *Update `PUBLIC_DOMAIN` and `CORS_ORIGIN` to point to the EC2 Public IP or Domain Name.*
3. Execute the setup & deploy helper script (automatically provisions Docker, Compose, builds containers, runs schema migrations, and seeds roles):
   ```bash
   chmod +x deploy-ec2.sh
   ./deploy-ec2.sh
   ```

### CI/CD Deployment Pipeline (GitHub Actions):
The project includes a pipeline configured in `.github/workflows/deploy.yml`. When changes are pushed to `main`, it logs into EC2, pulls updates, stashes and pops configuration variables, and runs `./deploy-ec2.sh`.
- Set these GitHub Secrets in your repo:
  - `EC2_HOST`: EC2 Public IP / Domain
  - `EC2_USERNAME`: `ubuntu`
  - `EC2_SSH_KEY`: Private Key (`.pem` file content)

---

## 4. Local VJ Workstation Setup (Windows Laptop)

The local client runs a background synchronizer daemon that downloads approved images and pipes them into Resolume.

### Prerequisites:
- Windows 10/11.
- Node.js (v18.x or v20.x).
- Resolume Arena 7.26.6+.

### Setup Sequence:
1. Create the watch directory (default: `C:\EventWall`).
2. Clone the code repository locally or copy the folder.
3. Install dependencies in the root project folder:
   ```powershell
   npm install axios socket.io-client
   ```
4. Set up environment variables on the laptop, or pass them when running.
5. Launch the local synchronization daemon:
   ```powershell
   # Usage: node local-sync.js <SERVER_URL> <EVENT_ID> [EMAIL] [PASSWORD]
   node local-sync.js http://YOUR_EC2_PUBLIC_IP 1fc1a594-6333-4589-acb2-1a561cf299f2
   ```

---

## 5. Resolume Arena Configuration

To allow the sync client to load photos automatically, the Resolume Webserver must be enabled:

1. Open Resolume Arena.
2. Go to **Preferences ➔ Webserver**.
3. Toggle **Enable Webserver & REST API** to **ON**.
4. Set the port to `8080` (or update your `RESOLUME_PORT` environment variable).
5. **Autopilot Slideshow Loop Configuration:**
   - Select your target layer (e.g. Layer 1).
   - In the Layer property inspector panel, set **Autopilot** to **Play Next** ➡️.
   - Adjust the **Auto Pilot Delay** (e.g., `5.0` seconds) to control the speed of the transitions.
   - The sync script will automatically populate slots sequentially, and Resolume will loop them infinitely.

---

## 6. Key Features & Fail-Safe Mechanics

### A. Client-Side Image Compression & Native HEIC Conversion
- **Problem:** iPhone users upload HEIC photos, which are unsupported by web browsers. Large 10MB mobile uploads also fail on slow cellular network connections.
- **Solution:** Integrated a canvas-based client compressor.
  - On Safari (iOS), the HEIC photo is natively drawn to an HTML5 canvas and converted to a compressed JPEG blob **prior to transmission**.
  - Reduces file size by up to 95% (10MB ➔ ~300KB), making uploads instant.
  - Express backend (`image.service.ts`) retains a server-side `heic-convert` library as a fallback wrapper.

### B. Auto-Approval with Manual override
- **Problem:** VJs need hands-off automation, but require moderation controls for inappropriate uploads.
- **Solution:**
  - Setting `AUTO_APPROVE_PHOTOS=true` automatically bypasses moderation queues.
  - Organizers can still open the Moderation Dashboard (`/events/<id>/moderation`), go to the **Approved** tab, and click **Reject** or **Delete**.
  - WebSockets instantly notify the laptop's `local-sync.js`, which **deletes the local file from disk in under 200ms**, immediately removing it from Resolume.

---

## 7. System Monitoring & Logs

### Cloud Server Logs:
- Monitor Express/Node processes:
  ```bash
  sudo docker logs -f eventwall-server
  ```
- Nginx reverse-proxy ingress logs:
  ```bash
  sudo docker logs -f eventwall-client
  ```
- PostgreSQL logs:
  ```bash
  sudo docker logs -f eventwall-db
  ```

### Local Client Logs:
The console of `local-sync.js` reports the live websocket events, file download statuses, and Resolume API connection reports:
- `[Cache] Already downloaded: ...`
- `[Resolume] Sending photo.jpg to Resolume Slot 5...`
- `[Resolume] Live display updated successfully (Slot 5)!`
