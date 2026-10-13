import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { io as Client } from 'socket.io-client';
import express from 'express';
import { initSocketServer } from '../src/services/realtime/socketService.js';
import roomService from '../src/services/roomService.js';

test('Host online presence verification across case, prefix, reconnects and join approval', async () => {
  const app = express();
  const server = http.createServer(app);
  initSocketServer(server);

  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const serverUrl = `http://localhost:${port}`;

  const hostClientId = 'client_host_user_123';

  // 1. Host creates room with hostId parameter
  const { room, hostMember } = roomService.createRoom({
    name: 'Validation Session',
    hostName: 'Suresh Host',
    isPrivate: true,
    hostId: hostClientId
  });

  assert.equal(hostMember.clientId, hostClientId);
  assert.equal(hostMember.role, 'host');
  assert.equal(room.hostId, hostClientId);

  const rawCode = room.id.replace('ROOM-', '');

  // 2. Host connects socket
  const hostSocket = Client(serverUrl);
  await new Promise((resolve) => hostSocket.on('connect', resolve));

  // Host joins socket room
  const hostJoinRes = await new Promise((resolve) => {
    hostSocket.emit('room:join', {
      roomId: room.id,
      clientId: hostMember.clientId,
      userName: hostMember.userName
    }, resolve);
  });

  assert.equal(hostJoinRes.success, true);
  assert.equal(hostJoinRes.member.role, 'host');

  // 3. Second user connects
  const secondSocket = Client(serverUrl);
  await new Promise((resolve) => secondSocket.on('connect', resolve));

  // Prepare listeners BEFORE emitting
  const incomingReqPromise = new Promise((resolve) => {
    hostSocket.once('join_request:incoming', resolve);
  });

  const approvedPromise = new Promise((resolve) => {
    secondSocket.once('join_request:approved', resolve);
  });

  // Second user enters code in lowercase without prefix: e.g. "fb1234"
  const requestRes = await new Promise((resolve) => {
    secondSocket.emit('room:request_join', {
      roomId: rawCode.toLowerCase(),
      clientId: 'client_bob_456',
      userName: 'Bob Friend'
    }, resolve);
  });

  assert.equal(requestRes.success, true, 'Request must succeed, host is online');
  assert.equal(requestRes.waiting, true, 'Requester must enter waiting state for host approval');

  // Host receives knock
  const incomingData = await incomingReqPromise;
  assert.equal(incomingData.userName, 'Bob Friend');
  assert.equal(incomingData.roomId, room.id);

  // Host responds to approve
  const respondRes = await new Promise((resolve) => {
    hostSocket.emit('join_request:respond', {
      requestId: incomingData.requestId,
      approved: true
    }, resolve);
  });
  assert.equal(respondRes.success, true);

  // Requester receives approval
  const approvedData = await approvedPromise;
  assert.equal(approvedData.success, true);
  assert.equal(approvedData.room.id, room.id);
  assert.equal(approvedData.member.userName, 'Bob Friend');

  // 4. Test offline condition: Host disconnects
  hostSocket.disconnect();
  await new Promise((r) => setTimeout(r, 50));

  // Third user tries to join while host is offline
  const thirdSocket = Client(serverUrl);
  await new Promise((resolve) => thirdSocket.on('connect', resolve));

  const offlineRes = await new Promise((resolve) => {
    thirdSocket.emit('room:request_join', {
      roomId: room.id,
      clientId: 'client_third_789',
      userName: 'Third Person'
    }, resolve);
  });

  assert.ok(offlineRes.error, 'Should error when host is genuinely offline');
  assert.match(offlineRes.error, /offline/i);

  // Clean up
  secondSocket.disconnect();
  thirdSocket.disconnect();
  await new Promise((resolve) => server.close(resolve));
});
