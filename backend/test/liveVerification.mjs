import { io } from 'socket.io-client';

async function runLiveVerification() {
  console.log('Connecting 2 clients to live server on http://localhost:3001...');
  const socket1 = io('http://localhost:3001', { transports: ['websocket'] });
  const socket2 = io('http://localhost:3001', { transports: ['websocket'] });

  await new Promise(r => socket1.on('connect', r));
  await new Promise(r => socket2.on('connect', r));
  console.log('✓ Both sockets connected');

  // Client 1 (Alice) creates or joins
  const join1 = await new Promise(r => {
    socket1.emit('room:join', { roomId: 'ROOM-3KK9AH', clientId: 'c1', userName: 'Alice' }, r);
  });
  console.log('✓ Socket 1 joined room:', join1.room.id, 'Role:', join1.member.role);

  // Client 2 (Bob) joins
  const join2 = await new Promise(r => {
    socket2.emit('room:join', { roomId: 'ROOM-3KK9AH', clientId: 'c2', userName: 'Bob' }, r);
  });
  console.log('✓ Socket 2 joined room:', join2.room.id, 'Role:', join2.member.role);

  // Client 2 listens for code update
  const codeUpdatedPromise = new Promise(r => socket2.on('code:updated', r));

  // Client 1 sends code change
  socket1.emit('code:change', {
    roomId: 'ROOM-3KK9AH',
    clientId: 'c1',
    code: 'console.log("Realtime sync works live across multiple clients!");',
    version: join1.codeVersion
  });

  const updated = await codeUpdatedPromise;
  console.log('✓ Socket 2 received live code broadcast:');
  console.log('  Code:', updated.code);
  console.log('  New Version:', updated.version);
  console.log('  Editor:', updated.editorName);

  // Client 2 listens for chat message
  const chatPromise = new Promise(r => socket2.on('chat:message', r));
  socket1.emit('chat:send', {
    roomId: 'ROOM-3KK9AH',
    content: 'Hello Bob from live socket 1!'
  });
  const chatMsg = await chatPromise;
  console.log('✓ Socket 2 received live room chat:', chatMsg.content, 'from', chatMsg.senderName);

  socket1.disconnect();
  socket2.disconnect();
  console.log('✓ Live multi-client verification completed successfully!');
  process.exit(0);
}

runLiveVerification().catch(err => {
  console.error('Error during live verification:', err);
  process.exit(1);
});
