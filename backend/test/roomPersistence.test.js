/**
 * Phase 1 Tests: Persistent Storage, Room Management, and Role Enforcement
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { getDatabase, closeDatabase } from '../src/services/storage/db.js';
import roomService from '../src/services/roomService.js';

test.beforeEach(() => {
  // Use in-memory SQLite for tests
  process.env.NODE_ENV = 'test';
  closeDatabase();
  getDatabase(':memory:');
});

test.afterEach(() => {
  closeDatabase();
});

test('Phase 1: Create room persists to database and sets up host', () => {
  const result = roomService.createRoom({
    name: 'Algorithm Study Group',
    code: 'console.log("test");',
    language: 'javascript',
    mode: 'mentor',
    hostName: 'Alice',
    isPrivate: false
  });

  assert.ok(result.room.id.startsWith('ROOM-'));
  assert.equal(result.room.name, 'Algorithm Study Group');
  assert.equal(result.room.codeVersion, 1);
  assert.equal(result.hostMember.role, 'host');
  assert.equal(result.hostMember.userName, 'Alice');

  // Verify fetch
  const fetched = roomService.getRoom(result.room.id);
  assert.ok(fetched);
  assert.equal(fetched.name, 'Algorithm Study Group');
});

test('Phase 1: Passcode protection enforces authentication', () => {
  const result = roomService.createRoom({
    name: 'Private Room',
    passcode: 'secret123',
    isPrivate: true,
    hostName: 'Bob'
  });

  const roomId = result.room.id;

  // Attempt join without passcode
  assert.throws(() => {
    roomService.joinRoom(roomId, { userName: 'Charlie', passcode: '' });
  }, /Invalid room passcode/);

  // Attempt join with wrong passcode
  assert.throws(() => {
    roomService.joinRoom(roomId, { userName: 'Charlie', passcode: 'wrong' });
  }, /Invalid room passcode/);

  // Join with correct passcode succeeds
  const joinResult = roomService.joinRoom(roomId, { userName: 'Charlie', passcode: 'secret123' });
  assert.equal(joinResult.member.userName, 'Charlie');
  assert.equal(joinResult.member.role, 'editor');
});

test('Phase 1: Host can modify member roles and viewer edit is rejected', () => {
  const { room, hostMember } = roomService.createRoom({
    name: 'Pair Programming',
    hostName: 'Dave'
  });

  const joinResult = roomService.joinRoom(room.id, { userName: 'Eve' });
  const eveId = joinResult.member.clientId;

  // Eve starts as editor
  assert.equal(joinResult.member.role, 'editor');

  // Dave promotes/demotes Eve to viewer
  const updatedMembers = roomService.updateMemberRole(room.id, hostMember.clientId, eveId, 'viewer');
  const eveUpdated = updatedMembers.find(m => m.clientId === eveId);
  assert.equal(eveUpdated.role, 'viewer');

  // Non-host (Eve) cannot change roles
  assert.throws(() => {
    roomService.updateMemberRole(room.id, eveId, hostMember.clientId, 'viewer');
  }, /Only the room host can change member permissions/);

  // Viewer cannot update code
  const codeUpdateResult = roomService.updateRoomCode(room.id, {
    code: 'console.log("eve hack");',
    version: 1,
    editorId: eveId,
    editorName: 'Eve'
  });

  assert.equal(codeUpdateResult.permissionDenied, true);
  assert.equal(codeUpdateResult.success, false);
});

test('Phase 1: Versioned code update detects stale version conflict', () => {
  const { room, hostMember } = roomService.createRoom({
    name: 'Concurrency Test',
    code: 'let a = 1;',
    hostName: 'Frank'
  });

  // Valid update from version 1
  const update1 = roomService.updateRoomCode(room.id, {
    code: 'let a = 2;',
    version: 1,
    editorId: hostMember.clientId,
    editorName: 'Frank'
  });

  assert.equal(update1.success, true);
  assert.equal(update1.newVersion, 2);

  // Stale update (still sending version 1)
  const staleUpdate = roomService.updateRoomCode(room.id, {
    code: 'let a = 99;',
    version: 1, // Stale!
    editorId: hostMember.clientId,
    editorName: 'Frank'
  });

  assert.equal(staleUpdate.success, false);
  assert.equal(staleUpdate.conflict, true);
  assert.equal(staleUpdate.serverVersion, 2);
  assert.equal(staleUpdate.serverCode, 'let a = 2;');
});

test('Phase 1: Export room contains room, members, messages and code history', () => {
  const { room, hostMember } = roomService.createRoom({
    name: 'Export Test',
    code: 'const x = 10;',
    hostName: 'Grace'
  });

  roomService.addRoomMessage(room.id, {
    senderId: hostMember.clientId,
    senderName: 'Grace',
    content: 'Hello everyone!',
    type: 'chat'
  });

  const exportData = roomService.exportRoomSession(room.id);
  assert.equal(exportData.room.id, room.id);
  assert.ok(exportData.members.length >= 1);
  assert.ok(exportData.messages.length >= 2); // Welcome message + Grace's message
  assert.ok(exportData.history.length >= 1);
});
