import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { io as Client } from 'socket.io-client';
import express from 'express';
import { initSocketServer } from '../src/services/realtime/socketService.js';
import roomService from '../src/services/roomService.js';

test('Host Knock & Security Approval Flow: Request, Waiting, Accept & Reject', async () => {
  const app = express();
  const server = http.createServer(app);
  initSocketServer(server);

  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const serverUrl = `http://localhost:${port}`;

  // 1. Host creates a room
  const { room, hostMember } = roomService.createRoom({
    name: 'Security Test Session',
    hostName: 'Alice Host',
    isPrivate: true
  });

  // Connect Host
  const hostSocket = Client(serverUrl);
  await new Promise((resolve) => hostSocket.on('connect', resolve));

  // Host joins
  await new Promise((resolve) => {
    hostSocket.emit('room:join', {
      roomId: room.id,
      clientId: hostMember.clientId,
      userName: hostMember.userName
    }, resolve);
  });

  // Connect Collaborator (Bob)
  const bobSocket = Client(serverUrl);
  await new Promise((resolve) => bobSocket.on('connect', resolve));

  // Set up host listener for incoming request
  let receivedRequestPromise = new Promise((resolve) => {
    hostSocket.once('join_request:incoming', (data) => {
      resolve(data);
    });
  });

  // Bob requests to join
  const requestResult = await new Promise((resolve) => {
    bobSocket.emit('room:request_join', {
      roomId: room.id,
      clientId: 'client_bob',
      userName: 'Bob Requester'
    }, resolve);
  });

  assert.equal(requestResult.success, true);
  assert.equal(requestResult.waiting, true);

  const incomingReq = await receivedRequestPromise;
  assert.equal(incomingReq.userName, 'Bob Requester');
  assert.equal(incomingReq.roomId, room.id);

  // Set up Bob listener for approved event
  const approvedPromise = new Promise((resolve) => {
    bobSocket.once('join_request:approved', (payload) => {
      resolve(payload);
    });
  });

  // Host accepts Bob's request
  const hostRespondResult = await new Promise((resolve) => {
    hostSocket.emit('join_request:respond', {
      requestId: incomingReq.requestId,
      approved: true
    }, resolve);
  });

  assert.equal(hostRespondResult.success, true);
  assert.equal(hostRespondResult.approved, true);

  const bobJoinPayload = await approvedPromise;
  assert.equal(bobJoinPayload.success, true);
  assert.equal(bobJoinPayload.room.id, room.id);
  assert.equal(bobJoinPayload.member.userName, 'Bob Requester');

  // Verify Leave Room & Offline Presence Sync: Host sees Bob leave and become offline
  const hostPresencePromise = new Promise((resolve) => {
    hostSocket.once('presence:changed', (payload) => {
      resolve(payload);
    });
  });

  const hostMemberLeftPromise = new Promise((resolve) => {
    hostSocket.once('member:left', (payload) => {
      resolve(payload);
    });
  });

  // Bob leaves the room
  bobSocket.emit('room:leave', {
    roomId: room.id,
    clientId: 'client_bob',
    userName: 'Bob Requester'
  });

  const presencePayload = await hostPresencePromise;
  assert.equal(presencePayload.userName, 'Bob Requester');
  assert.equal(presencePayload.isOnline, false);
  const bobMember = presencePayload.members.find(m => m.userName === 'Bob Requester');
  assert.equal(bobMember.isOnline, false);

  const memberLeftPayload = await hostMemberLeftPromise;
  assert.equal(memberLeftPayload.userName, 'Bob Requester');

  // Test Rejection with a second collaborator (Charlie)
  const charlieSocket = Client(serverUrl);
  await new Promise((resolve) => charlieSocket.on('connect', resolve));

  receivedRequestPromise = new Promise((resolve) => {
    hostSocket.once('join_request:incoming', (data) => {
      resolve(data);
    });
  });

  charlieSocket.emit('room:request_join', {
    roomId: room.id,
    clientId: 'client_charlie',
    userName: 'Charlie Hacker'
  });

  const charlieIncomingReq = await receivedRequestPromise;

  const rejectedPromise = new Promise((resolve) => {
    charlieSocket.once('join_request:rejected', (data) => {
      resolve(data);
    });
  });

  // Host rejects Charlie
  await new Promise((resolve) => {
    hostSocket.emit('join_request:respond', {
      requestId: charlieIncomingReq.requestId,
      approved: false
    }, resolve);
  });

  const rejectResult = await rejectedPromise;
  assert.ok(rejectResult.reason.includes('declined'));

  // Clean up
  hostSocket.disconnect();
  bobSocket.disconnect();
  charlieSocket.disconnect();
  await new Promise((resolve) => server.close(resolve));
});
