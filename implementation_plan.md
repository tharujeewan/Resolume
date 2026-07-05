# Implementation Plan: Resolume Arena REST API Integration

We will integrate the Resolume Arena REST API with our event photo upload system. To support both local development (server + Resolume on the same laptop) and production deployment (server on EC2 + Resolume on local laptop), we will implement the Resolume integration on **both** the backend server (as a service) and the local synchronization client (`local-sync.js`).

---

## Proposed Changes

### 1. Configuration & Env Files
We will expose Resolume parameters via environment variables.

#### [MODIFY] [server/src/config/index.ts](file:///c:/Users/jeewa/OneDrive/Desktop/Resol/server/src/config/index.ts)
* Add Resolume configuration settings:
  * `resolume.enabled`: Toggle API integrations (`RESOLUME_ENABLED`).
  * `resolume.host`: Resolume hostname/IP (`RESOLUME_HOST`, defaults to `localhost`).
  * `resolume.port`: Resolume webserver port (`RESOLUME_PORT`, defaults to `8080`).
  * `resolume.layer`: Target composition layer index (`RESOLUME_LAYER`, 1-based, defaults to `1`).
  * `resolume.clip`: Target composition clip slot index (`RESOLUME_CLIP`, 1-based, defaults to `1`).

#### [MODIFY] [server/.env](file:///c:/Users/jeewa/OneDrive/Desktop/Resol/server/.env) and [Resol/.env](file:///c:/Users/jeewa/OneDrive/Desktop/Resol/.env)
* Add new keys:
  ```env
  RESOLUME_ENABLED=false
  RESOLUME_HOST=localhost
  RESOLUME_PORT=8080
  RESOLUME_LAYER=1
  RESOLUME_CLIP=1
  ```

---

### 2. Backend Service Layer

#### [NEW] [resolume.service.ts](file:///c:/Users/jeewa/OneDrive/Desktop/Resol/server/src/services/resolume.service.ts)
Create a production-grade service wrapper containing:
* `connect()` / `healthCheck()`: Confirms connection with Resolume Webserver.
* `loadMedia(layerIndex, clipIndex, filePath)`: Invokes the `/openfile` endpoint with dynamic Swagger-schema payload matching (detects whether it expects a plain string or a JSON object).
* `triggerClip(layerIndex, clipIndex)`: Invokes the `/connect` endpoint to play the loaded file on the output screen.
* Helper functions to format file paths as URL-encoded file URIs (`file:///C:/...`).

---

### 3. Controller Modifications

#### [MODIFY] [photo.controller.ts](file:///c:/Users/jeewa/OneDrive/Desktop/Resol/server/src/controllers/photo.controller.ts)
* Modify the `uploadPhoto` and single/bulk `updatePhotoStatus` endpoints:
  * If `RESOLUME_ENABLED` is true and a photo is approved (either auto-approved or manually approved):
    * Construct the local absolute path of the image.
    * Trigger `resolumeService.loadMedia` and `resolumeService.triggerClip` in the background.
    * Catch any network errors (e.g. if Resolume is offline) and log them without crashing or blocking the HTTP response.

---

### 4. Local Sync Client Integration

#### [MODIFY] [local-sync.js](file:///c:/Users/jeewa/OneDrive/Desktop/Resol/local-sync.js)
In production, the backend runs in the cloud (EC2), so it cannot contact `localhost:8080` directly. The local sync script running on your laptop acts as the bridge.
* We will add Resolume REST API calls directly inside `local-sync.js`:
  * Add configuration flags `RESOLUME_ENABLED=true`, `RESOLUME_LAYER=1`, `RESOLUME_CLIP=1` (can be passed via environment variables or arguments).
  * When a photo is successfully downloaded to `C:\EventWall\`:
    * Map the filepath to a URL-encoded string: `file:///C:/EventWall/filename.jpg`.
    * Perform a dynamic Swagger check to find the schema payload.
    * Call the local Resolume `/openfile` and `/connect` endpoints to display the photo instantly on the LED wall.

---

## Verification Plan

### Automated Tests
* We will verify compiled typings using `npx tsc --noEmit` on both frontend and backend.

### Manual Verification
1. Open Resolume Arena on your laptop and ensure the webserver is active (check preferences).
2. Start the local sync script: `node local-sync.js http://3.110.212.148 <event-id>`.
3. Upload a photo from your phone.
4. Verify that:
   * The photo is downloaded to `C:\EventWall\`.
   * The console output prints the Resolume load media and connect triggers.
   * The photo instantly appears in Resolume Arena Layer 1, Clip 1, and output screen.
