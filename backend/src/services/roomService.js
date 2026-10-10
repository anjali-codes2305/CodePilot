/**
 * Room Management Service for CodePilot Collaborative Coding Rooms
 * Handles room lifecycle, persistence, role permissions, versioned code updates, and history.
 */

import crypto from 'node:crypto';
import { getDatabase } from './storage/db.js';

// Avatar colors for collaborators
const AVATAR_COLORS = [
  '#06b6d4', // cyan
  '#3b82f6', // blue
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ef4444', // red
  '#14b8a6', // teal
  '#6366f1', // indigo
];

function generateRoomId() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let id = '';
  const bytes = crypto.randomBytes(6);
  for (let i = 0; i < 6; i++) {
    id += chars[bytes[i] % chars.length];
  }
  return `ROOM-${id}`;
}

function getRandomColor() {
  return AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
}

/**
 * Creates a new collaborative room.
 */
export function createRoom({
  name,
  code = '',
  language = 'javascript',
  mode = 'mentor',
  hostName = 'Host',
  isPrivate = false,
  passcode = null,
  settings = {}
}) {
  const db = getDatabase();
  const roomId = generateRoomId();
  const hostId = crypto.randomUUID();
  const now = Date.now();

  const insertRoom = db.prepare(`
    INSERT INTO rooms (
      id, name, code, language, mode, host_id, host_name,
      is_private, passcode, code_version, latest_analysis, settings,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const initialCode = (typeof code === 'string' && code.trim().length > 0)
    ? code
    : '// Welcome to CodePilot Collaborative Room!\n// Start coding together or paste code to analyze.\n\nfunction main() {\n  console.log("Hello, CodePilot!");\n}\n';

  insertRoom.run(
    roomId,
    (name || 'Collaborative Coding Session').trim(),
    initialCode,
    language,
    mode,
    hostId,
    hostName.trim(),
    isPrivate ? 1 : 0,
    passcode ? passcode.trim() : null,
    1,
    null,
    JSON.stringify(settings || {}),
    now,
    now
  );

  // Add host member
  const memberId = crypto.randomUUID();
  const insertMember = db.prepare(`
    INSERT INTO room_members (
      id, room_id, client_id, user_name, role, avatar_color,
      joined_at, last_active_at, is_online
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertMember.run(
    memberId,
    roomId,
    hostId,
    hostName.trim(),
    'host',
    '#06b6d4',
    now,
    now,
    1
  );

  // Record initial code history
  const insertHistory = db.prepare(`
    INSERT INTO room_code_history (
      id, room_id, version, code, editor_id, editor_name, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  insertHistory.run(
    crypto.randomUUID(),
    roomId,
    1,
    initialCode,
    hostId,
    hostName.trim(),
    now
  );

  // Record initial welcome system message
  const insertMsg = db.prepare(`
    INSERT INTO room_messages (
      id, room_id, sender_id, sender_name, sender_role, content, type, metadata, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertMsg.run(
    crypto.randomUUID(),
    roomId,
    'system',
    'System',
    'host',
    `Room created by ${hostName}. Welcome to CodePilot Collaborative Session!`,
    'system',
    null,
    now
  );

  return {
    room: getRoom(roomId),
    hostMember: {
      clientId: hostId,
      userName: hostName.trim(),
      role: 'host',
      avatarColor: '#06b6d4'
    }
  };
}

/**
 * Gets a room by ID with parsed JSON fields.
 */
export function getRoom(roomId) {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM rooms WHERE id = ?');
  const row = stmt.get(roomId);
  if (!row) return null;

  return {
    id: row.id,
    name: row.name,
    code: row.code,
    language: row.language,
    mode: row.mode,
    hostId: row.host_id,
    hostName: row.host_name,
    isPrivate: Boolean(row.is_private),
    hasPasscode: Boolean(row.passcode),
    codeVersion: row.code_version,
    latestAnalysis: row.latest_analysis ? JSON.parse(row.latest_analysis) : null,
    settings: row.settings ? JSON.parse(row.settings) : {},
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

/**
 * Lists active public rooms.
 */
export function listPublicRooms() {
  const db = getDatabase();
  const stmt = db.prepare(`
    SELECT r.id, r.name, r.language, r.mode, r.host_name, r.created_at, r.updated_at,
           COUNT(m.id) as total_members,
           SUM(CASE WHEN m.is_online = 1 THEN 1 ELSE 0 END) as online_members
    FROM rooms r
    LEFT JOIN room_members m ON r.id = m.room_id
    WHERE r.is_private = 0
    GROUP BY r.id
    ORDER BY r.updated_at DESC
    LIMIT 50
  `);

  return stmt.all().map(r => ({
    id: r.id,
    name: r.name,
    language: r.language,
    mode: r.mode,
    hostName: r.host_name,
    totalMembers: Number(r.total_members || 0),
    onlineMembers: Number(r.online_members || 0),
    createdAt: r.created_at,
    updatedAt: r.updated_at
  }));
}

/**
 * Joins a room, enforcing passcode if private, and registering or restoring member state.
 */
export function joinRoom(roomId, { userName, passcode = null, clientId = null }) {
  const db = getDatabase();
  const roomRow = db.prepare('SELECT * FROM rooms WHERE id = ?').get(roomId);
  if (!roomRow) {
    throw new Error('Room not found');
  }

  // Passcode verification
  if (roomRow.passcode) {
    if (!passcode || passcode.trim() !== roomRow.passcode) {
      throw new Error('Invalid room passcode');
    }
  }

  const cleanName = (userName || 'Collaborator').trim();
  const effectiveClientId = clientId || crypto.randomUUID();
  const now = Date.now();

  // Check if member already exists in room
  const existingMember = db.prepare(`
    SELECT * FROM room_members WHERE room_id = ? AND client_id = ?
  `).get(roomId, effectiveClientId);

  let memberRole = 'editor';
  let avatarColor = getRandomColor();

  if (existingMember) {
    memberRole = existingMember.role;
    avatarColor = existingMember.avatar_color;

    db.prepare(`
      UPDATE room_members
      SET is_online = 1, last_active_at = ?, user_name = ?
      WHERE id = ?
    `).run(now, cleanName, existingMember.id);
  } else {
    // If user is the recorded host_id, grant host role
    if (effectiveClientId === roomRow.host_id) {
      memberRole = 'host';
    }

    db.prepare(`
      INSERT INTO room_members (
        id, room_id, client_id, user_name, role, avatar_color,
        joined_at, last_active_at, is_online
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      crypto.randomUUID(),
      roomId,
      effectiveClientId,
      cleanName,
      memberRole,
      avatarColor,
      now,
      now,
      1
    );

    // Record system join notification
    db.prepare(`
      INSERT INTO room_messages (
        id, room_id, sender_id, sender_name, sender_role, content, type, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      crypto.randomUUID(),
      roomId,
      'system',
      'System',
      'system',
      `${cleanName} joined the room`,
      'system',
      now
    );
  }

  return {
    room: getRoom(roomId),
    member: {
      clientId: effectiveClientId,
      userName: cleanName,
      role: memberRole,
      avatarColor,
      isOnline: true
    }
  };
}

/**
 * Gets all members of a room.
 */
export function getRoomMembers(roomId) {
  const db = getDatabase();
  const stmt = db.prepare(`
    SELECT client_id, user_name, role, avatar_color, joined_at, last_active_at, is_online
    FROM room_members
    WHERE room_id = ?
    ORDER BY joined_at ASC
  `);

  return stmt.all(roomId).map(m => ({
    clientId: m.client_id,
    userName: m.user_name,
    role: m.role,
    avatarColor: m.avatar_color,
    joinedAt: m.joined_at,
    lastActiveAt: m.last_active_at,
    isOnline: Boolean(m.is_online)
  }));
}

/**
 * Updates a member's role (host only).
 */
export function updateMemberRole(roomId, hostClientId, targetClientId, newRole) {
  const db = getDatabase();
  const room = db.prepare('SELECT host_id FROM rooms WHERE id = ?').get(roomId);
  if (!room) throw new Error('Room not found');
  if (room.host_id !== hostClientId) {
    throw new Error('Only the room host can change member permissions');
  }

  if (!['editor', 'viewer', 'host'].includes(newRole)) {
    throw new Error('Invalid role');
  }

  if (newRole === 'host') {
    // Transfer ownership
    db.prepare('UPDATE rooms SET host_id = ? WHERE id = ?').run(targetClientId, roomId);
    db.prepare("UPDATE room_members SET role = 'editor' WHERE room_id = ? AND client_id = ?").run(roomId, hostClientId);
    db.prepare("UPDATE room_members SET role = 'host' WHERE room_id = ? AND client_id = ?").run(roomId, targetClientId);
  } else {
    if (targetClientId === room.host_id) {
      throw new Error('Cannot demote room host without transferring ownership');
    }
    db.prepare('UPDATE room_members SET role = ? WHERE room_id = ? AND client_id = ?').run(newRole, roomId, targetClientId);
  }

  return getRoomMembers(roomId);
}

/**
 * Updates presence state for a member.
 */
export function setMemberPresence(roomId, clientId, isOnline) {
  const db = getDatabase();
  const now = Date.now();
  db.prepare(`
    UPDATE room_members
    SET is_online = ?, last_active_at = ?
    WHERE room_id = ? AND client_id = ?
  `).run(isOnline ? 1 : 0, now, roomId, clientId);
}

/**
 * Concurrency-safe code update with monotonic version verification.
 * Detects stale code versions and rejects conflicting overwrites.
 */
export function updateRoomCode(roomId, { code, version, editorId, editorName }) {
  const db = getDatabase();
  const room = db.prepare('SELECT code_version, code FROM rooms WHERE id = ?').get(roomId);
  if (!room) throw new Error('Room not found');

  // Verify permission: viewers cannot update code
  const member = db.prepare('SELECT role FROM room_members WHERE room_id = ? AND client_id = ?').get(roomId, editorId);
  if (member && member.role === 'viewer') {
    return {
      success: false,
      permissionDenied: true,
      error: 'Viewers do not have edit permission for this room.'
    };
  }

  // Version check: client version must match current server version
  if (version !== room.code_version) {
    return {
      success: false,
      conflict: true,
      serverVersion: room.code_version,
      serverCode: room.code,
      message: 'Code version conflict: server has a newer version.'
    };
  }

  const nextVersion = room.code_version + 1;
  const now = Date.now();

  db.prepare(`
    UPDATE rooms
    SET code = ?, code_version = ?, updated_at = ?
    WHERE id = ?
  `).run(code, nextVersion, now, roomId);

  db.prepare(`
    INSERT INTO room_code_history (
      id, room_id, version, code, editor_id, editor_name, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(crypto.randomUUID(), roomId, nextVersion, code, editorId, editorName || 'Collaborator', now);

  return {
    success: true,
    newVersion: nextVersion,
    code,
    editorId,
    editorName
  };
}

/**
 * Updates room language and mode settings.
 */
export function updateRoomSettings(roomId, { language, mode, editorId }) {
  const db = getDatabase();
  const member = db.prepare('SELECT role FROM room_members WHERE room_id = ? AND client_id = ?').get(roomId, editorId);
  if (member && member.role === 'viewer') {
    throw new Error('Viewers cannot modify room settings');
  }

  const updates = [];
  const params = [];

  if (language) {
    updates.push('language = ?');
    params.push(language);
  }
  if (mode) {
    updates.push('mode = ?');
    params.push(mode);
  }

  if (updates.length === 0) return getRoom(roomId);

  updates.push('updated_at = ?');
  params.push(Date.now());
  params.push(roomId);

  db.prepare(`UPDATE rooms SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  return getRoom(roomId);
}

/**
 * Saves analysis results to the room state.
 */
export function saveRoomAnalysis(roomId, analysisPayload) {
  const db = getDatabase();
  db.prepare(`
    UPDATE rooms
    SET latest_analysis = ?, updated_at = ?
    WHERE id = ?
  `).run(JSON.stringify(analysisPayload), Date.now(), roomId);
}

/**
 * Adds a chat or AI message to the room message log.
 */
export function addRoomMessage(roomId, { senderId, senderName, senderRole = 'editor', content, type = 'chat', metadata = null }) {
  const db = getDatabase();
  const id = crypto.randomUUID();
  const now = Date.now();

  db.prepare(`
    INSERT INTO room_messages (
      id, room_id, sender_id, sender_name, sender_role, content, type, metadata, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    roomId,
    senderId,
    senderName,
    senderRole,
    content,
    type,
    metadata ? JSON.stringify(metadata) : null,
    now
  );

  return {
    id,
    roomId,
    senderId,
    senderName,
    senderRole,
    content,
    type,
    metadata,
    createdAt: now
  };
}

/**
 * Gets message history for a room.
 */
export function getRoomMessages(roomId, limit = 100) {
  const db = getDatabase();
  const stmt = db.prepare(`
    SELECT id, room_id, sender_id, sender_name, sender_role, content, type, metadata, created_at
    FROM room_messages
    WHERE room_id = ?
    ORDER BY created_at ASC
    LIMIT ?
  `);

  return stmt.all(roomId, limit).map(m => ({
    id: m.id,
    roomId: m.room_id,
    senderId: m.sender_id,
    senderName: m.sender_name,
    senderRole: m.sender_role,
    content: m.content,
    type: m.type,
    metadata: m.metadata ? JSON.parse(m.metadata) : null,
    createdAt: m.created_at
  }));
}

/**
 * Exports complete room session state.
 */
export function exportRoomSession(roomId) {
  const room = getRoom(roomId);
  if (!room) throw new Error('Room not found');

  const members = getRoomMembers(roomId);
  const messages = getRoomMessages(roomId, 500);

  const db = getDatabase();
  const history = db.prepare(`
    SELECT version, editor_name, created_at
    FROM room_code_history
    WHERE room_id = ?
    ORDER BY version ASC
  `).all(roomId);

  return {
    room,
    members,
    messages,
    history,
    exportedAt: new Date().toISOString()
  };
}

export default {
  createRoom,
  getRoom,
  listPublicRooms,
  joinRoom,
  getRoomMembers,
  updateMemberRole,
  setMemberPresence,
  updateRoomCode,
  updateRoomSettings,
  saveRoomAnalysis,
  addRoomMessage,
  getRoomMessages,
  exportRoomSession
};
