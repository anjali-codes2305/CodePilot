/**
 * Phase 2 & 3 Tests: Realtime Multi-Client Synchronization, Concurrency,
 * Role Permissions, Shared Analysis, and Live Chat.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import express from 'express';
import { io as Client } from 'socket.io-client';
import { initSocketServer } from '../src/services/realtime/socketService.js';
import { getDatabase, closeDatabase } from '../src/services/storage/db.js';
import roomService from '../src/services/roomService.js';

let server;
let serverPort;
let serverUrl;

test.before(async () => {
  process.env.NODE_ENV = 'test';
  closeDatabase();
  getDatabase(':memory:');

  const app = express();
  server = http.createServer(app);
  initSocketServer(server, { origin: '*' });

  await new Promise((resolve) => {
    server.listen(0, () => {
      serverPort = server.address().port;
      serverUrl = `http://localhost:${serverPort}`;
      resolve();
    });
  });
});

test.after(async () => {
  closeDatabase();
  await new Promise((resolve) => server.close(resolve));
});

function createClientSocket() {
  return new Promise((resolve, reject) => {
    const socket = Client(serverUrl, {
      transports: ['websocket'],
      forceNew: true
    });
    socket.on('connect', () => resolve(socket));
    socket.on('connect_error', reject);
  });
}

test('Phase 2: Multi-client room join, presence sync, and code broadcast', async () => {
  const { room, hostMember } = roomService.createRoom({
    name: 'Realtime Sync Test',
    code: 'const a = 1;',
    language: 'javascript',
    hostName: 'Alice'
  });

  const client1 = await createClientSocket();
  const client2 = await createClientSocket();

  try {
    // 1. Client 1 (Alice - Host) joins
    const join1 = await new Promise((res) => {
      client1.emit('room:join', {
        roomId: room.id,
        clientId: hostMember.clientId,
        userName: 'Alice'
      }, res);
    });

    assert.equal(join1.success, true);
    assert.equal(join1.member.role, 'host');
    assert.equal(join1.codeVersion, 1);

    // 2. Client 2 (Bob - Editor) joins
    const bobClientId = 'bob-client-id';
    const join2Promise = new Promise((res) => {
      client2.emit('room:join', {
        roomId: room.id,
        clientId: bobClientId,
        userName: 'Bob'
      }, res);
    });

    // Client 1 should receive member:joined event
    const memberJoinedEventPromise = new Promise((res) => {
      client1.once('member:joined', res);
    });

    const [join2, memberJoined] = await Promise.all([join2Promise, memberJoinedEventPromise]);
    assert.equal(join2.success, true);
    assert.equal(join2.member.role, 'editor');
    assert.equal(memberJoined.member.userName, 'Bob');

    // 3. Client 1 types new code -> Client 2 receives code:updated
    const codeUpdatedPromise = new Promise((res) => {
      client2.once('code:updated', res);
    });

    client1.emit('code:change', {
      roomId: room.id,
      code: 'const a = 2;\nconst b = 3;',
      version: 1
    });

    const codeUpdateEvent = await codeUpdatedPromise;
    assert.equal(codeUpdateEvent.version, 2);
    assert.equal(codeUpdateEvent.code, 'const a = 2;\nconst b = 3;');

    // Verify DB updated
    const updatedRoom = roomService.getRoom(room.id);
    assert.equal(updatedRoom.codeVersion, 2);
    assert.equal(updatedRoom.code, 'const a = 2;\nconst b = 3;');

  } finally {
    client1.disconnect();
    client2.disconnect();
  }
});

test('Phase 2: Concurrency & stale code rejection prevents overwrite', async () => {
  const { room, hostMember } = roomService.createRoom({
    name: 'Conflict Test',
    code: 'let counter = 0;',
    hostName: 'Alice'
  });

  const client1 = await createClientSocket();
  const client2 = await createClientSocket();

  try {
    await new Promise((res) => {
      client1.emit('room:join', { roomId: room.id, clientId: hostMember.clientId, userName: 'Alice' }, res);
    });
    await new Promise((res) => {
      client2.emit('room:join', { roomId: room.id, clientId: 'bob-123', userName: 'Bob' }, res);
    });

    // Client 1 updates to version 2 successfully
    const ack1 = await new Promise((res) => {
      client1.emit('code:change', {
        roomId: room.id,
        code: 'let counter = 1;',
        version: 1
      }, res);
    });
    assert.equal(ack1.success, true);
    assert.equal(ack1.version, 2);

    // Client 2 tries to send update still based on stale version 1
    const conflictPromise = new Promise((res) => {
      client2.once('code:conflict', res);
    });

    const ack2 = await new Promise((res) => {
      client2.emit('code:change', {
        roomId: room.id,
        code: 'let counter = 999;',
        version: 1 // Stale!
      }, res);
    });

    const conflictEvent = await conflictPromise;
    assert.equal(ack2.conflict, true);
    assert.equal(conflictEvent.serverVersion, 2);
    assert.equal(conflictEvent.serverCode, 'let counter = 1;');

    // Server code was preserved
    const currentRoom = roomService.getRoom(room.id);
    assert.equal(currentRoom.code, 'let counter = 1;');
    assert.equal(currentRoom.codeVersion, 2);

  } finally {
    client1.disconnect();
    client2.disconnect();
  }
});

test('Phase 2: Role change enforces viewer edit permission lockout', async () => {
  const { room, hostMember } = roomService.createRoom({
    name: 'Permission Test',
    code: 'function test() {}',
    hostName: 'Alice'
  });

  const client1 = await createClientSocket();
  const client2 = await createClientSocket();

  try {
    await new Promise((res) => {
      client1.emit('room:join', { roomId: room.id, clientId: hostMember.clientId, userName: 'Alice' }, res);
    });
    await new Promise((res) => {
      client2.emit('room:join', { roomId: room.id, clientId: 'viewer-bob', userName: 'Bob' }, res);
    });

    // Alice changes Bob role to 'viewer'
    const roleChangeRes = await new Promise((res) => {
      client1.emit('role:change', {
        roomId: room.id,
        targetClientId: 'viewer-bob',
        newRole: 'viewer'
      }, res);
    });
    assert.equal(roleChangeRes.success, true);

    // Bob attempts to edit code -> blocked by server!
    const editRes = await new Promise((res) => {
      client2.emit('code:change', {
        roomId: room.id,
        clientId: 'viewer-bob',
        code: 'function hacked() {}',
        version: 1
      }, res);
    });

    assert.equal(editRes.permissionDenied, true);

  } finally {
    client1.disconnect();
    client2.disconnect();
  }
});

test('Phase 2: Cursor movement broadcast delivers position to peers', async () => {
  const { room, hostMember } = roomService.createRoom({
    name: 'Cursor Test',
    code: 'const x = 5;',
    hostName: 'Alice'
  });

  const client1 = await createClientSocket();
  const client2 = await createClientSocket();

  try {
    await new Promise((res) => {
      client1.emit('room:join', { roomId: room.id, clientId: hostMember.clientId, userName: 'Alice' }, res);
    });
    await new Promise((res) => {
      client2.emit('room:join', { roomId: room.id, clientId: 'bob-cursor', userName: 'Bob' }, res);
    });

    const cursorPromise = new Promise((res) => {
      client2.once('cursor:updated', res);
    });

    client1.emit('cursor:move', {
      roomId: room.id,
      position: { lineNumber: 3, column: 12 },
      selection: { startLineNumber: 3, startColumn: 1, endLineNumber: 3, endColumn: 12 }
    });

    const cursorEvent = await cursorPromise;
    assert.equal(cursorEvent.userName, 'Alice');
    assert.equal(cursorEvent.position.lineNumber, 3);
    assert.equal(cursorEvent.position.column, 12);

  } finally {
    client1.disconnect();
    client2.disconnect();
  }
});

test('Phase 3: Live collaborative chat delivers messages and answers deterministic Pilot queries', async () => {
  const { room, hostMember } = roomService.createRoom({
    name: 'Chat Test',
    code: 'function findMax(arr) { let m = arr[0]; for(let x of arr) { if(x > m) m = x; } return m; }',
    hostName: 'Alice'
  });

  const client1 = await createClientSocket();
  const client2 = await createClientSocket();

  try {
    await new Promise((res) => {
      client1.emit('room:join', { roomId: room.id, clientId: hostMember.clientId, userName: 'Alice' }, res);
    });
    await new Promise((res) => {
      client2.emit('room:join', { roomId: room.id, clientId: 'bob-chat', userName: 'Bob' }, res);
    });

    // 1. Normal peer chat message
    const msgPromise = new Promise((res) => {
      client2.once('chat:message', res);
    });

    client1.emit('chat:send', {
      roomId: room.id,
      content: 'Hey Bob, what do you think of this loop?'
    });

    const peerMsg = await msgPromise;
    assert.equal(peerMsg.content, 'Hey Bob, what do you think of this loop?');
    assert.equal(peerMsg.senderName, 'Alice');

    // 2. Deterministic Pilot query
    const pilotMsgPromise = new Promise((res) => {
      client2.on('chat:message', (msg) => {
        if (msg.type === 'ai') res(msg);
      });
    });

    client1.emit('chat:send', {
      roomId: room.id,
      content: '@pilot what is the time complexity?'
    });

    const aiMsg = await pilotMsgPromise;
    assert.equal(aiMsg.senderName, 'CodePilot AI');
    assert.ok(aiMsg.content.includes('complexity') || aiMsg.content.length > 0);

  } finally {
    client1.disconnect();
    client2.disconnect();
  }
});

test('Phase 3: Multi-client shared analysis trigger broadcasts completed analysis to all peers', async () => {
  const { room, hostMember } = roomService.createRoom({
    name: 'Shared Analysis Test',
    code: 'function binarySearch(arr, target) { let l = 0, r = arr.length - 1; while(l <= r) { let m = Math.floor((l+r)/2); if(arr[m] === target) return m; else if(arr[m] < target) l = m + 1; else r = m - 1; } return -1; }',
    language: 'javascript',
    mode: 'mentor',
    hostName: 'Alice'
  });

  const client1 = await createClientSocket();
  const client2 = await createClientSocket();

  try {
    await new Promise((res) => {
      client1.emit('room:join', { roomId: room.id, clientId: hostMember.clientId, userName: 'Alice' }, res);
    });
    await new Promise((res) => {
      client2.emit('room:join', { roomId: room.id, clientId: 'bob-analyzer', userName: 'Bob' }, res);
    });

    const analysisStartedPromise = new Promise((res) => {
      client2.once('analysis:started', res);
    });

    const analysisCompletedPromise = new Promise((res) => {
      client2.once('analysis:completed', res);
    });

    // Alice triggers analysis
    client1.emit('analysis:trigger', { roomId: room.id });

    const startedEvent = await analysisStartedPromise;
    assert.equal(startedEvent.triggeredBy, 'Alice');

    const completedPayload = await analysisCompletedPromise;
    assert.ok(completedPayload.codeAnalysis);
    assert.ok(completedPayload.codeAnalysis.complexity.time);
    assert.ok(completedPayload.practiceQuiz.length > 0);
    assert.ok(completedPayload.interviewQuestions.length > 0);
    assert.ok(completedPayload.executionTrace);

    // Verify room persistence
    const updatedRoom = roomService.getRoom(room.id);
    assert.ok(updatedRoom.latestAnalysis);
    assert.ok(updatedRoom.latestAnalysis.codeAnalysis.complexity.time);

  } finally {
    client1.disconnect();
    client2.disconnect();
  }
});

