const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { io } = require('socket.io-client');

// ==========================================
//           CONFIGURATION SETTINGS
// ==========================================
const SERVER_URL = process.argv[2] || 'http://3.110.212.148'; // Your EC2 public IP or domain
const EVENT_ID = process.argv[3]; // The event ID (UUID) from your dashboard URL
const ORGANIZER_EMAIL = process.argv[4] || 'organizer@eventwall.com';
const ORGANIZER_PASSWORD = process.argv[5] || 'OrganizerSecurePassword2026!';
const LOCAL_DIR = 'C:\\EventWall';

// Resolume REST API Settings
const RESOLUME_ENABLED = process.env.RESOLUME_ENABLED !== 'false'; // Defaults to true on laptop
const RESOLUME_HOST = process.env.RESOLUME_HOST || 'localhost';
const RESOLUME_PORT = process.env.RESOLUME_PORT || '8080';
const RESOLUME_LAYER = parseInt(process.env.RESOLUME_LAYER || '1', 10);
const RESOLUME_START_CLIP = parseInt(process.env.RESOLUME_CLIP || '1', 10);
const RESOLUME_MAX_CLIPS = parseInt(process.env.RESOLUME_MAX_CLIPS || '20', 10);
let nextClipSlot = RESOLUME_START_CLIP;

if (!EVENT_ID) {
  console.error('\x1b[31mError: Event ID is required.\x1b[0m');
  console.log('\nUsage:');
  console.log('  node local-sync.js <SERVER_URL> <EVENT_ID> [EMAIL] [PASSWORD]');
  console.log('\nExample:');
  console.log('  node local-sync.js http://3.110.212.148 1fc1a594-6333-4589-acb2-1a561cf299f2\n');
  process.exit(1);
}

// Ensure local directory exists
if (!fs.existsSync(LOCAL_DIR)) {
  fs.mkdirSync(LOCAL_DIR, { recursive: true });
}

console.log('=============================================');
console.log('      EventWall -> Resolume Local Synced      ');
console.log('=============================================');
console.log(`Server URL:   ${SERVER_URL}`);
console.log(`Event ID:     ${EVENT_ID}`);
console.log(`Local Target: ${LOCAL_DIR}`);
console.log('=============================================\n');

let token = '';
let socket = null;

/**
 * Format absolute file path to URL-encoded URI required by Resolume:
 * e.g., C:\EventWall\file.jpg -> file:///C:/EventWall/file.jpg
 */
function formatFileUrl(absolutePath) {
  let normalized = absolutePath.replace(/\\/g, '/');
  if (!normalized.startsWith('file:///')) {
    if (normalized.startsWith('/')) {
      normalized = `file://${normalized}`;
    } else {
      normalized = `file:///${normalized}`;
    }
  }
  const prefix = 'file:///';
  const pathSegment = normalized.substring(prefix.length);
  const encodedPath = pathSegment
    .split('/')
    .map(part => encodeURIComponent(part))
    .join('/');
  return `${prefix}${encodedPath}`;
}

/**
 * Dynamically fetch Resolume Swagger description to discover schema requirements
 * of the openfile endpoint (whether FileUrl is a plain string or a JSON object).
 */
async function detectFileUrlSchema(baseUrl) {
  try {
    const swaggerRes = await axios.get(`${baseUrl}/api/docs/rest/swagger.yaml`, {
      timeout: 2000
    });
    const yaml = swaggerRes.data;
    const fileUrlMatch = yaml.match(/FileUrl:[\s\S]*?(?=\n\w|\Z)/);
    if (fileUrlMatch) {
      const schemaText = fileUrlMatch[0];
      if (schemaText.includes('type: object') || schemaText.includes('properties:')) {
        if (schemaText.includes('url:')) {
          return 'url_object';
        } else if (schemaText.includes('path:')) {
          return 'path_object';
        }
      }
    }
  } catch (e) {
    // Default to string on failure
  }
  return 'string';
}

/**
 * Connect to local Resolume REST API, load image file, and trigger playback
 */
async function triggerResolume(filename) {
  if (!RESOLUME_ENABLED) return;

  const absolutePath = path.join(LOCAL_DIR, filename);
  const fileUrl = formatFileUrl(absolutePath);
  const baseUrl = `http://${RESOLUME_HOST}:${RESOLUME_PORT}`;
  const apiUrl = `${baseUrl}/api/v1`;

  const targetSlot = nextClipSlot;
  // Calculate next clip slot using the start offset and max clips wrapping formula
  nextClipSlot = RESOLUME_START_CLIP + ((nextClipSlot - RESOLUME_START_CLIP + 1) % RESOLUME_MAX_CLIPS);

  console.log(`[Resolume] Sending ${filename} to Resolume Slot ${targetSlot}...`);

  try {
    // 1. Detect openfile body schema dynamically
    const schemaType = await detectFileUrlSchema(baseUrl);
    let body;
    if (schemaType === 'url_object') {
      body = { url: fileUrl };
    } else if (schemaType === 'path_object') {
      body = { path: fileUrl };
    } else {
      body = fileUrl; // Plain string raw payload
    }

    // 2. Load file into specified slot
    const openEndpoint = `${apiUrl}/composition/layers/${RESOLUME_LAYER}/clips/${targetSlot}/openfile`;
    await axios.post(openEndpoint, body, {
      headers: {
        'Content-Type': typeof body === 'object' ? 'application/json' : 'text/plain'
      },
      timeout: 3000
    });
    console.log(`[Resolume] Media loaded into Layer ${RESOLUME_LAYER}, Clip ${targetSlot}.`);

    // 3. Trigger playback of the clip
    const connectEndpoint = `${apiUrl}/composition/layers/${RESOLUME_LAYER}/clips/${targetSlot}/connect`;
    await axios.post(connectEndpoint, {}, { timeout: 3000 });
    console.log(`\x1b[35m[Resolume] Live display updated successfully (Slot ${targetSlot})!\x1b[0m`);
  } catch (err) {
    console.error(`\x1b[33m[Resolume Warning] Could not output to Resolume (is Resolume open with Webserver enabled?):\x1b[0m`, err.response?.data?.message || err.message);
  }
}

// Download a single file
async function downloadFile(relativeFilePath) {
  const filename = relativeFilePath.split('/').pop();
  const localFilePath = path.join(LOCAL_DIR, filename);

  // Skip if file already exists
  if (fs.existsSync(localFilePath)) {
    console.log(`[Cache] Already downloaded: ${filename}`);
    await triggerResolume(filename).catch(() => {});
    return;
  }

  const url = `${SERVER_URL}/uploads/${relativeFilePath}`;
  console.log(`[Download] Fetching: ${filename}...`);

  try {
    const response = await axios({
      method: 'get',
      url: url,
      responseType: 'stream',
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const writer = fs.createWriteStream(localFilePath);
    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on('finish', () => {
        console.log(`\x1b[32m[Success] Saved to local folder: ${filename}\x1b[0m`);
        triggerResolume(filename)
          .then(() => resolve())
          .catch(() => resolve());
      });
      writer.on('error', (err) => {
        console.error(`\x1b[31m[Error] Saving file: ${filename}\x1b[0m`, err.message);
        reject(err);
      });
    });
  } catch (err) {
    console.error(`\x1b[31m[Error] Failed to download: ${filename}\x1b[0m`, err.message);
  }
}

// Delete local file if it gets unapproved/deleted
function deleteLocalFile(relativeFilePath) {
  const filename = relativeFilePath.split('/').pop();
  const localFilePath = path.join(LOCAL_DIR, filename);

  if (fs.existsSync(localFilePath)) {
    try {
      fs.unlinkSync(localFilePath);
      console.log(`\x1b[33m[Removed] Deleted local file (Unapproved/Deleted): ${filename}\x1b[0m`);
    } catch (err) {
      console.error(`\x1b[31m[Error] Deleting local file: ${filename}\x1b[0m`, err.message);
    }
  }
}

// Main startup function
async function start() {
  try {
    // 1. Authenticate with server
    console.log('[Auth] Logging in as organizer...');
    const loginRes = await axios.post(`${SERVER_URL}/api/v1/auth/login`, {
      email: ORGANIZER_EMAIL,
      password: ORGANIZER_PASSWORD
    });
    
    token = loginRes.data.accessToken;
    console.log('\x1b[32m[Auth] Authenticated successfully.\x1b[0m');

    // 2. Catch up on already approved photos
    console.log('[Sync] Fetching existing approved photos...');
    const photosRes = await axios.get(`${SERVER_URL}/api/v1/photos`, {
      params: {
        eventId: EVENT_ID,
        status: 'APPROVED',
        limit: 100
      },
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const approvedPhotos = photosRes.data.photos || [];
    console.log(`[Sync] Found ${approvedPhotos.length} existing approved photos on server.`);
    
    for (const photo of approvedPhotos) {
      if (photo.optimizedFilename) {
        await downloadFile(photo.optimizedFilename);
      }
    }
    console.log('[Sync] Catch-up synchronization complete.\n');

    // 3. Connect to WebSockets for real-time additions
    console.log('[WebSocket] Connecting to real-time events...');
    socket = io(SERVER_URL, {
      auth: {
        token: token
      },
      transports: ['websocket']
    });

    socket.on('connect', () => {
      console.log('\x1b[32m[WebSocket] Connected to server. Listening for live uploads...\x1b[0m');
      // Join event wall room to receive photo updates
      socket.emit('join_event', EVENT_ID);
    });

    // Handle new approved photo event
    socket.on('photo_approved', async (photo) => {
      console.log(`\x1b[36m[Live Update] New photo approved: ${photo.originalName}\x1b[0m`);
      if (photo.optimizedFilename) {
        await downloadFile(photo.optimizedFilename);
      }
    });

    // Handle status change (e.g. unapproving or deleting photos)
    socket.on('photo_status_changed', (payload) => {
      if (payload.status !== 'APPROVED') {
        // Fetch the photo details or resolve filename from existing logs if needed
        // For simplicity, if we receive unapproved state we delete from folder
        console.log(`\x1b[33m[Live Update] Photo status changed: ID ${payload.photoId} -> ${payload.status}\x1b[0m`);
        // If we want to delete, we could perform a database lookup or query by ID
        // But since we have the DB ID, we can do a quick check
        axios.get(`${SERVER_URL}/api/v1/photos`, {
          params: { eventId: EVENT_ID, limit: 100 },
          headers: { Authorization: `Bearer ${token}` }
        }).then(res => {
          const removedPhoto = (res.data.photos || []).find(p => p.id === payload.photoId);
          if (removedPhoto && removedPhoto.optimizedFilename) {
            deleteLocalFile(removedPhoto.optimizedFilename);
          }
        }).catch(() => {});
      }
    });

    socket.on('disconnect', () => {
      console.log('\x1b[31m[WebSocket] Disconnected from server. Reconnecting...\x1b[0m');
    });

    socket.on('connect_error', (err) => {
      console.error('[WebSocket] Connection error:', err.message);
    });

  } catch (err) {
    console.error('\x1b[31m[Fatal Error] System failed to start:\x1b[0m', err.response?.data?.message || err.message);
    process.exit(1);
  }
}

// Start client
start();
