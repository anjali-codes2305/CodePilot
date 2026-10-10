/**
 * Express REST router for CodePilot Collaborative Rooms
 */

import { Router } from 'express';
import roomService from '../services/roomService.js';

const router = Router();

// Create room
router.post('/', (req, res) => {
  try {
    const { name, code, language, mode, hostName, isPrivate, passcode, settings } = req.body;
    const result = roomService.createRoom({
      name,
      code,
      language,
      mode,
      hostName,
      isPrivate: Boolean(isPrivate),
      passcode,
      settings
    });

    return res.status(201).json(result);
  } catch (err) {
    console.error('[/api/rooms POST] Error:', err.message);
    return res.status(500).json({ error: err.message || 'Failed to create room' });
  }
});

// List public active rooms
router.get('/', (req, res) => {
  try {
    const rooms = roomService.listPublicRooms();
    return res.json({ rooms });
  } catch (err) {
    console.error('[/api/rooms GET] Error:', err.message);
    return res.status(500).json({ error: 'Failed to retrieve rooms' });
  }
});

// Get room details
router.get('/:roomId', (req, res) => {
  try {
    const room = roomService.getRoom(req.params.roomId);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    const members = roomService.getRoomMembers(req.params.roomId);
    return res.json({ room, members });
  } catch (err) {
    console.error('[/api/rooms/:id GET] Error:', err.message);
    return res.status(500).json({ error: 'Failed to retrieve room' });
  }
});

// Join room
router.post('/:roomId/join', (req, res) => {
  try {
    const { userName, passcode, clientId } = req.body;
    const result = roomService.joinRoom(req.params.roomId, {
      userName,
      passcode,
      clientId
    });

    return res.json(result);
  } catch (err) {
    console.error('[/api/rooms/:id/join POST] Error:', err.message);
    const status = err.message.includes('passcode') ? 401 : err.message.includes('not found') ? 404 : 400;
    return res.status(status).json({ error: err.message });
  }
});

// Get room members
router.get('/:roomId/members', (req, res) => {
  try {
    const members = roomService.getRoomMembers(req.params.roomId);
    return res.json({ members });
  } catch (err) {
    console.error('[/api/rooms/:id/members GET] Error:', err.message);
    return res.status(500).json({ error: 'Failed to retrieve room members' });
  }
});

// Update member role (host only)
router.post('/:roomId/members/role', (req, res) => {
  try {
    const { hostClientId, targetClientId, newRole } = req.body;
    if (!hostClientId || !targetClientId || !newRole) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    const updatedMembers = roomService.updateMemberRole(
      req.params.roomId,
      hostClientId,
      targetClientId,
      newRole
    );

    return res.json({ members: updatedMembers });
  } catch (err) {
    console.error('[/api/rooms/:id/members/role POST] Error:', err.message);
    return res.status(403).json({ error: err.message });
  }
});

// Get room messages
router.get('/:roomId/messages', (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 100;
    const messages = roomService.getRoomMessages(req.params.roomId, limit);
    return res.json({ messages });
  } catch (err) {
    console.error('[/api/rooms/:id/messages GET] Error:', err.message);
    return res.status(500).json({ error: 'Failed to retrieve room messages' });
  }
});

// Export room session
router.get('/:roomId/export', (req, res) => {
  try {
    const exportedData = roomService.exportRoomSession(req.params.roomId);
    return res.json(exportedData);
  } catch (err) {
    console.error('[/api/rooms/:id/export GET] Error:', err.message);
    return res.status(500).json({ error: 'Failed to export room session' });
  }
});

// Update room settings (language/mode)
router.patch('/:roomId/settings', (req, res) => {
  try {
    const { language, mode, editorId } = req.body;
    const updated = roomService.updateRoomSettings(req.params.roomId, {
      language,
      mode,
      editorId
    });
    return res.json({ room: updated });
  } catch (err) {
    console.error('[/api/rooms/:id/settings PATCH] Error:', err.message);
    return res.status(403).json({ error: err.message });
  }
});

export default router;
