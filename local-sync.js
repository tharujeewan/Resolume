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

// Download a single file
async function downloadFile(relativeFilePath) {
  const filename = relativeFilePath.split('/').pop();
  const localFilePath = path.join(LOCAL_DIR, filename);

  // Skip if file already exists
  if (fs.existsSync(localFilePath)) {
    console.log(`[Cache] Already downloaded: ${filename}`);
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
        resolve();
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
    
    token = loginRes.data.tokens.access.token;
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
