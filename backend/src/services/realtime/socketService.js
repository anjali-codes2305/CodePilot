/**
 * Socket.IO Realtime Synchronization Engine for CodePilot
 * 
 * Implements:
 * - Genuine WebSocket room synchronization
 * - Monotonic versioning & stale code conflict prevention
 * - Multi-user presence & peer cursor broadcasting
 * - Shared CodePilot intelligence & server-side Gemini AI execution
 * - Role permission enforcement (Host, Editor, Viewer)
 */

import { Server } from 'socket.io';
import roomService from '../roomService.js';
import { analyzeCodeStructure } from '../analyzer/codeAnalyzer.js';
import { traceExecution } from '../execution/executionTracer.js';
import { generatePracticeQuiz, generateInterviewQuestions } from '../practiceService.js';
import { normalizeAnalysisResponse } from '../analyzer/responseNormalizer.js';
import { analyzeCode, chat } from '../aiService.js';
import { routeQuestion } from '../smartRouter.js';
import crypto from 'node:crypto';

let ioInstance = null;

// Track socket to client mapping: socketId -> { clientId, roomId, userName, role }
const socketRegistry = new Map();

// Track pending join requests: requestId -> { requestId, roomId, roomName, clientId, socketId, userName, passcode, timestamp }
const pendingJoinRequests = new Map();

export function initSocketServer(httpServer, corsOptions = {}) {
  const io = new Server(httpServer, {
    cors: {
      origin: corsOptions.origin || '*',
      methods: ['GET', 'POST', 'PATCH'],
      allowedHeaders: ['Content-Type'],
      credentials: true
    },
    pingInterval: 15000,
    pingTimeout: 10000
  });

  ioInstance = io;

  io.on('connection', (socket) => {
    // ─── 1. Room Join ───
    socket.on('room:join', ({ roomId, clientId, userName, passcode }, callback) => {
      try {
        if (!roomId) {
          if (callback) callback({ error: 'Room ID is required' });
          return;
        }

        const roomData = roomService.getRoom(roomId);
        if (!roomData) {
          if (callback) callback({ error: 'Room not found' });
          return;
        }

        const joinResult = roomService.joinRoom(roomData.id, {
          userName: userName || 'Collaborator',
          passcode,
          clientId
        });

        const { room, member } = joinResult;

        // Register socket association with canonical room.id
        socketRegistry.set(socket.id, {
          clientId: member.clientId,
          roomId: room.id,
          userName: member.userName,
          role: member.role
        });

        socket.join(room.id);
        if (roomId !== room.id) {
          socket.join(roomId);
        }

        // Fetch latest state for initial sync
        const allMembers = roomService.getRoomMembers(room.id);
        const messages = roomService.getRoomMessages(room.id, 100);

        const responsePayload = {
          success: true,
          room,
          member,
          members: allMembers,
          messages,
          code: room.code,
          codeVersion: room.codeVersion,
          latestAnalysis: room.latestAnalysis
        };

        if (callback) callback(responsePayload);

        // Notify other room members of the new collaborator
        socket.to(room.id).emit('member:joined', {
          member,
          members: allMembers
        });
        io.to(room.id).emit('room:members_updated', {
          members: allMembers
        });

      } catch (err) {
        console.error(`[Socket room:join] Error for socket ${socket.id}:`, err.message);
        if (callback) callback({ error: err.message });
      }
    });

    // ─── 1b. Request to Join Room (Host Knock & Security Approval Flow) ───
    socket.on('room:request_join', ({ roomId, clientId, userName, passcode }, callback) => {
      try {
        if (!roomId || typeof roomId !== 'string' || !roomId.trim()) {
          if (callback) callback({ error: 'Please enter a valid room code or passcode' });
          return;
        }

        const room = roomService.getRoom(roomId);
        if (!room) {
          if (callback) callback({ error: 'Room not found. Please verify the room code.' });
          return;
        }

        const resolvedRoomId = room.id;
        const upperRoomId = resolvedRoomId.toUpperCase();

        // Find active host socket(s) for this room
        const hostSockets = new Set();

        // 1. Check socketRegistry by canonical room & role/clientId/userName
        for (const [sId, info] of socketRegistry.entries()) {
          const infoRoomUpper = (info.roomId || '').toUpperCase();
          if (infoRoomUpper === upperRoomId) {
            if (info.role === 'host' || info.clientId === room.hostId || (room.hostName && info.userName === room.hostName)) {
              hostSockets.add(sId);
            }
          } else if (info.clientId === room.hostId) {
            // Sockets belonging to the room host
            hostSockets.add(sId);
          }
        }

        // 2. Check Socket.IO adapter rooms for active sockets in this room
        const adapterSockets = io.sockets.adapter.rooms.get(resolvedRoomId)
          || io.sockets.adapter.rooms.get(upperRoomId);
        if (adapterSockets && adapterSockets.size > 0) {
          for (const sId of adapterSockets) {
            const info = socketRegistry.get(sId);
            if (info) {
              if (info.role === 'host' || info.clientId === room.hostId || (room.hostName && info.userName === room.hostName)) {
                hostSockets.add(sId);
              }
            }
          }
        }

        const hostSocketsList = Array.from(hostSockets);
        if (hostSocketsList.length === 0) {
          if (callback) callback({ error: `The room host (${room.hostName || 'Host'}) is currently offline. Cannot join right now.` });
          return;
        }

        // Remove any prior pending request for this socket
        for (const [existingReqId, existingReq] of pendingJoinRequests.entries()) {
          if (existingReq.socketId === socket.id) {
            pendingJoinRequests.delete(existingReqId);
          }
        }

        const requestId = crypto.randomUUID();
        const requestData = {
          requestId,
          roomId: resolvedRoomId,
          roomName: room.name,
          clientId: clientId || crypto.randomUUID(),
          socketId: socket.id,
          userName: (userName || 'Collaborator').trim(),
          passcode: passcode || roomId.trim(),
          timestamp: Date.now()
        };

        pendingJoinRequests.set(requestId, requestData);

        // Notify all active hosts for this room
        for (const hSocketId of hostSocketsList) {
          io.to(hSocketId).emit('join_request:incoming', {
            requestId,
            roomId: resolvedRoomId,
            roomName: room.name,
            userName: requestData.userName,
            clientId: requestData.clientId,
            timestamp: requestData.timestamp
          });
        }

        if (callback) callback({
          success: true,
          waiting: true,
          requestId,
          roomId: resolvedRoomId,
          roomName: room.name
        });
      } catch (err) {
        console.error('[Socket room:request_join] Error:', err.message);
        if (callback) callback({ error: err.message });
      }
    });

    // ─── 1c. Cancel Pending Join Request ───
    socket.on('join_request:cancel', ({ requestId }, callback) => {
      const req = pendingJoinRequests.get(requestId);
      if (req) {
        pendingJoinRequests.delete(requestId);
        const reqRoomUpper = (req.roomId || '').toUpperCase();
        for (const [sId, info] of socketRegistry.entries()) {
          if ((info.roomId || '').toUpperCase() === reqRoomUpper && (info.role === 'host')) {
            io.to(sId).emit('join_request:cancelled', { requestId });
          }
        }
      }
      if (callback) callback({ success: true });
    });

    // ─── 1d. Host Approval / Rejection ───
    socket.on('join_request:respond', ({ requestId, approved }, callback) => {
      try {
        const hostInfo = socketRegistry.get(socket.id);
        const req = pendingJoinRequests.get(requestId);

        if (!req) {
          if (callback) callback({ error: 'Join request expired or was cancelled.' });
          return;
        }

        const room = roomService.getRoom(req.roomId);
        const canonicalRoomId = room ? room.id : req.roomId;
        const upperRoomId = canonicalRoomId.toUpperCase();

        const isHost = hostInfo && (
          (hostInfo.role === 'host') ||
          (room && hostInfo.clientId === room.hostId)
        ) && (
          (hostInfo.roomId || '').toUpperCase() === upperRoomId ||
          (room && (hostInfo.roomId || '').toUpperCase() === room.id.toUpperCase())
        );

        if (!isHost) {
          if (callback) callback({ error: 'Only the room host can approve or reject join requests.' });
          return;
        }

        pendingJoinRequests.delete(requestId);

        // Notify all host sockets for this room that the request has been handled
        for (const [sId, info] of socketRegistry.entries()) {
          if ((info.roomId || '').toUpperCase() === upperRoomId && (info.role === 'host' || (room && info.clientId === room.hostId))) {
            io.to(sId).emit('join_request:handled', { requestId, approved: Boolean(approved) });
          }
        }

        const requesterSocket = io.sockets.sockets.get(req.socketId);

        if (approved) {
          let joinResult;
          try {
            joinResult = roomService.joinRoom(canonicalRoomId, {
              userName: req.userName,
              clientId: req.clientId,
              passcode: req.passcode
            });
          } catch {
            // Passcode bypass if host explicitly approved
            joinResult = roomService.joinRoom(canonicalRoomId, {
              userName: req.userName,
              clientId: req.clientId
            });
          }

          const { room: joinedRoom, member } = joinResult;

          if (requesterSocket) {
            socketRegistry.set(requesterSocket.id, {
              clientId: member.clientId,
              roomId: canonicalRoomId,
              userName: member.userName,
              role: member.role
            });

            requesterSocket.join(canonicalRoomId);

            const allMembers = roomService.getRoomMembers(canonicalRoomId);
            const messages = roomService.getRoomMessages(canonicalRoomId, 100);

            const payload = {
              success: true,
              room: joinedRoom,
              member,
              members: allMembers,
              messages,
              code: joinedRoom.code,
              codeVersion: joinedRoom.codeVersion,
              latestAnalysis: joinedRoom.latestAnalysis
            };

            requesterSocket.emit('join_request:approved', payload);

            requesterSocket.to(canonicalRoomId).emit('member:joined', {
              member,
              members: allMembers
            });

            io.to(canonicalRoomId).emit('room:members_updated', {
              members: allMembers
            });
          }

          if (callback) callback({ success: true, approved: true });
        } else {
          if (requesterSocket) {
            requesterSocket.emit('join_request:rejected', {
              reason: 'The host has declined your request to join the room.'
            });
          }
          if (callback) callback({ success: true, approved: false });
        }
      } catch (err) {
        console.error('[Socket join_request:respond] Error:', err.message);
        if (callback) callback({ error: err.message });
      }
    });

    // ─── 1e. List Pending Join Requests (Host query) ───
    socket.on('join_requests:list', ({ roomId }, callback) => {
      const list = [];
      for (const req of pendingJoinRequests.values()) {
        if (req.roomId === roomId) {
          list.push({
            requestId: req.requestId,
            roomId: req.roomId,
            roomName: req.roomName,
            userName: req.userName,
            clientId: req.clientId,
            timestamp: req.timestamp
          });
        }
      }
      if (callback) callback({ requests: list });
    });

    // ─── 1f. Explicit Room Leave ───
    socket.on('room:leave', ({ roomId, clientId, userName }, callback) => {
      try {
        const socketInfo = socketRegistry.get(socket.id);
        const targetRoomId = roomId || socketInfo?.roomId;
        const targetClientId = clientId || socketInfo?.clientId;
        const targetUserName = userName || socketInfo?.userName || 'A collaborator';

        if (!targetRoomId || !targetClientId) {
          if (callback) callback({ error: 'Missing roomId or clientId' });
          return;
        }

        socketRegistry.delete(socket.id);
        socket.leave(targetRoomId);

        roomService.setMemberPresence(targetRoomId, targetClientId, false);
        const updatedMembers = roomService.getRoomMembers(targetRoomId);

        // Record and broadcast system message to room chat
        try {
          const sysMsg = roomService.addRoomMessage(targetRoomId, {
            senderId: 'system',
            senderName: 'System',
            senderRole: 'system',
            content: `${targetUserName} left the room.`,
            type: 'system'
          });
          io.to(targetRoomId).emit('chat:message', sysMsg);
        } catch (e) {
          console.error('[Socket room:leave] Message error:', e.message);
        }

        io.to(targetRoomId).emit('presence:changed', {
          clientId: targetClientId,
          userName: targetUserName,
          isOnline: false,
          members: updatedMembers
        });

        io.to(targetRoomId).emit('member:left', {
          clientId: targetClientId,
          userName: targetUserName,
          members: updatedMembers
        });

        if (callback) callback({ success: true });
      } catch (err) {
        console.error('[Socket room:leave] Error:', err.message);
        if (callback) callback({ error: err.message });
      }
    });

    // ─── 2. Versioned Code Change (Concurrency Safe) ───
    socket.on('code:change', ({ roomId, clientId, code, version }, callback) => {
      try {
        const socketInfo = socketRegistry.get(socket.id);
        const effectiveClientId = clientId || socketInfo?.clientId;

        if (!roomId || typeof code !== 'string') {
          if (callback) callback({ error: 'Invalid code change payload' });
          return;
        }

        const result = roomService.updateRoomCode(roomId, {
          code,
          version,
          editorId: effectiveClientId,
          editorName: socketInfo?.userName || 'Collaborator'
        });

        if (result.permissionDenied) {
          if (callback) callback({ error: result.error, permissionDenied: true });
          socket.emit('code:permission_denied', { message: result.error });
          return;
        }

        if (result.conflict) {
          // Reject stale edit and send authoritative current state
          if (callback) callback({
            conflict: true,
            serverVersion: result.serverVersion,
            serverCode: result.serverCode
          });

          socket.emit('code:conflict', {
            serverVersion: result.serverVersion,
            serverCode: result.serverCode,
            message: result.message
          });
          return;
        }

        // Successfully updated! Acknowledge sender
        if (callback) callback({ success: true, version: result.newVersion });

        // Broadcast new code and version to ALL other participants in the room
        socket.to(roomId).emit('code:updated', {
          code,
          version: result.newVersion,
          editorId: effectiveClientId,
          editorName: socketInfo?.userName || 'Collaborator',
          timestamp: Date.now()
        });

      } catch (err) {
        console.error('[Socket code:change] Error:', err.message);
        if (callback) callback({ error: err.message });
      }
    });

    // ─── 3. Cursor & Selection Movement ───
    socket.on('cursor:move', ({ roomId, position, selection }) => {
      const socketInfo = socketRegistry.get(socket.id);
      if (!socketInfo || !roomId) return;

      socket.to(roomId).emit('cursor:updated', {
        clientId: socketInfo.clientId,
        userName: socketInfo.userName,
        position,
        selection
      });
    });

    // ─── 4. Typing Indicator ───
    socket.on('typing:status', ({ roomId, isTyping }) => {
      const socketInfo = socketRegistry.get(socket.id);
      if (!socketInfo || !roomId) return;

      socket.to(roomId).emit('typing:updated', {
        clientId: socketInfo.clientId,
        userName: socketInfo.userName,
        isTyping: Boolean(isTyping)
      });
    });

    // ─── 5. Room Settings (Language / Mode) ───
    socket.on('settings:change', ({ roomId, language, mode }, callback) => {
      try {
        const socketInfo = socketRegistry.get(socket.id);
        const updated = roomService.updateRoomSettings(roomId, {
          language,
          mode,
          editorId: socketInfo?.clientId
        });

        io.to(roomId).emit('settings:updated', {
          language: updated.language,
          mode: updated.mode,
          updatedBy: socketInfo?.userName
        });

        if (callback) callback({ success: true, room: updated });
      } catch (err) {
        if (callback) callback({ error: err.message });
      }
    });

    // ─── 6. Member Role Management (Host Control) ───
    socket.on('role:change', ({ roomId, targetClientId, newRole }, callback) => {
      try {
        const socketInfo = socketRegistry.get(socket.id);
        if (!socketInfo) {
          if (callback) callback({ error: 'Not authenticated' });
          return;
        }

        const updatedMembers = roomService.updateMemberRole(
          roomId,
          socketInfo.clientId,
          targetClientId,
          newRole
        );

        io.to(roomId).emit('members:updated', { members: updatedMembers });
        if (callback) callback({ success: true, members: updatedMembers });
      } catch (err) {
        if (callback) callback({ error: err.message });
      }
    });

    // ─── 7. Shared AI Analysis Pipeline ───
    socket.on('analysis:trigger', async ({ roomId }, callback) => {
      try {
        const socketInfo = socketRegistry.get(socket.id);
        const room = roomService.getRoom(roomId);
        if (!room) {
          if (callback) callback({ error: 'Room not found' });
          return;
        }

        // Permission check: viewers cannot initiate analysis
        const members = roomService.getRoomMembers(roomId);
        const currentMember = members.find(m => m.clientId === socketInfo?.clientId);
        if (currentMember && currentMember.role === 'viewer') {
          if (callback) callback({ error: 'Viewers cannot trigger AI analysis' });
          return;
        }

        if (callback) callback({ status: 'started' });

        // Broadcast to all participants that analysis has begun
        io.to(roomId).emit('analysis:started', {
          triggeredBy: socketInfo?.userName || 'A collaborator'
        });

        const codeToAnalyze = room.code.trim();
        const language = room.language;
        const mode = room.mode;

        // Step 1: AST & Intelligence layer
        const codeAnalysis = analyzeCodeStructure(codeToAnalyze, language);

        // Step 2: Step-by-step execution tracer
        const executionTrace = traceExecution(codeToAnalyze, language);

        // Step 3: Practice & Interview generation
        const practiceQuiz = generatePracticeQuiz(codeAnalysis, codeToAnalyze);
        const interviewQuestions = generateInterviewQuestions(codeAnalysis, codeToAnalyze);

        // Step 4: Server-side Gemini AI analysis (credentials kept safe)
        let analysisText = '';
        try {
          analysisText = await analyzeCode(codeToAnalyze, language, mode, codeAnalysis);
        } catch (aiErr) {
          console.warn('[Socket analysis:trigger] Gemini AI note:', aiErr.message);
          analysisText = `### Structural Code Intelligence\n\n- **Language:** ${language}\n- **Complexity:** ${codeAnalysis.complexity?.time || 'O(n)'}\n- **Functions:** ${(codeAnalysis.functions || []).map(f => f.name).join(', ') || 'Global'}\n\n*Detailed AI narrative currently unavailable: ${aiErr.message}*`;
        }

        // Step 5: Normalization
        const structuredSections = normalizeAnalysisResponse(analysisText, codeAnalysis);

        const payload = {
          analysis: analysisText,
          structuredSections,
          codeAnalysis,
          executionTrace,
          practiceQuiz,
          interviewQuestions,
          analyzedAt: Date.now()
        };

        // Persist analysis in room storage
        roomService.saveRoomAnalysis(roomId, payload);

        // Broadcast completed analysis to EVERY member in the room!
        io.to(roomId).emit('analysis:completed', payload);

        // Add system message
        const sysMsg = roomService.addRoomMessage(roomId, {
          senderId: 'system',
          senderName: 'CodePilot AI',
          content: `Code analysis completed for ${language} (${mode} mode).`,
          type: 'system'
        });
        io.to(roomId).emit('chat:message', sysMsg);

      } catch (err) {
        console.error('[Socket analysis:trigger] Error:', err.message);
        io.to(roomId).emit('analysis:error', {
          error: err.message || 'Failed to complete collaborative analysis'
        });
        if (callback) callback({ error: err.message });
      }
    });

    // ─── 8. Shared Live Chat & Ask Pilot ───
    socket.on('chat:send', async ({ roomId, content, askPilot = false }, callback) => {
      try {
        const socketInfo = socketRegistry.get(socket.id);
        if (!socketInfo || !roomId || !content?.trim()) {
          if (callback) callback({ error: 'Invalid message payload' });
          return;
        }

        const trimmedContent = content.trim();
        const isPilotQuery = askPilot || trimmedContent.toLowerCase().startsWith('@pilot');
        const questionText = isPilotQuery
          ? trimmedContent.replace(/^@pilot\s*/i, '')
          : trimmedContent;

        // 1. Record and broadcast user chat message
        const userMsg = roomService.addRoomMessage(roomId, {
          senderId: socketInfo.clientId,
          senderName: socketInfo.userName,
          senderRole: socketInfo.role,
          content: trimmedContent,
          type: isPilotQuery ? 'ai-query' : 'chat'
        });

        io.to(roomId).emit('chat:message', userMsg);
        if (callback) callback({ success: true, message: userMsg });

        // 2. If it is an Ask Pilot query, route to AI service server-side
        if (isPilotQuery && questionText.length > 0) {
          io.to(roomId).emit('pilot:thinking', { isThinking: true });

          const room = roomService.getRoom(roomId);
          // Ground with code analysis (fallback to direct structure analysis if not yet analyzed)
          const codeAnalysis = room?.latestAnalysis?.codeAnalysis || analyzeCodeStructure(room.code, room.language);

          // Check deterministic router first (0 LLM tokens)
          const routeDecision = routeQuestion(questionText, codeAnalysis);

          let replyText = '';
          let source = 'codepilot';
          let tokensSaved = 0;

          if (!routeDecision.shouldCallGemini) {
            replyText = routeDecision.response;
            tokensSaved = 450;
          } else {
            try {
              // Contextual Gemini grounded reasoning
              const pastMessages = roomService.getRoomMessages(roomId, 10).map(m => ({
                role: m.senderId === 'ai' ? 'assistant' : 'user',
                content: m.content
              }));

              replyText = await chat(
                room.code,
                room.language,
                room.mode,
                pastMessages,
                questionText,
                codeAnalysis
              );
              source = 'gemini';
            } catch (err) {
              console.warn('[Socket chat:send] Gemini call fallback:', err.message);
              replyText = `I encountered an issue connecting to Gemini: ${err.message}. However, based on static AST analysis, your code complexity is ${codeAnalysis.complexity?.time || 'O(n)'}.`;
              source = 'codepilot';
            }
          }

          // Persist and broadcast Pilot response
          const aiMsg = roomService.addRoomMessage(roomId, {
            senderId: 'ai',
            senderName: 'CodePilot AI',
            senderRole: 'mentor',
            content: replyText,
            type: 'ai',
            metadata: { source, tokensSaved }
          });

          io.to(roomId).emit('pilot:thinking', { isThinking: false });
          io.to(roomId).emit('chat:message', aiMsg);
        }

      } catch (err) {
        console.error('[Socket chat:send] Error:', err.message);
        io.to(roomId).emit('pilot:thinking', { isThinking: false });
        if (callback) callback({ error: err.message });
      }
    });

    // ─── 9. Shared Spotlight / Line Highlight Sync ───
    socket.on('view:highlight', ({ roomId, line, tab }) => {
      const socketInfo = socketRegistry.get(socket.id);
      if (!socketInfo || !roomId) return;

      socket.to(roomId).emit('view:highlighted', {
        line,
        tab,
        highlightedBy: socketInfo.userName
      });
    });

    // ─── 10. Disconnection & Cleanup ───
    socket.on('disconnect', () => {
      const socketInfo = socketRegistry.get(socket.id);
      if (socketInfo) {
        const { roomId, clientId, userName } = socketInfo;
        socketRegistry.delete(socket.id);

        try {
          // Check if user has other open sockets in the same room
          let hasOtherSockets = false;
          for (const info of socketRegistry.values()) {
            if (info.roomId === roomId && info.clientId === clientId) {
              hasOtherSockets = true;
              break;
            }
          }

          if (!hasOtherSockets) {
            roomService.setMemberPresence(roomId, clientId, false);
            const updatedMembers = roomService.getRoomMembers(roomId);

            try {
              const sysMsg = roomService.addRoomMessage(roomId, {
                senderId: 'system',
                senderName: 'System',
                senderRole: 'system',
                content: `${userName} left the room.`,
                type: 'system'
              });
              io.to(roomId).emit('chat:message', sysMsg);
            } catch (e) {
              console.error('[Socket disconnect] Message error:', e.message);
            }

            io.to(roomId).emit('presence:changed', {
              clientId,
              userName,
              isOnline: false,
              members: updatedMembers
            });

            io.to(roomId).emit('member:left', {
              clientId,
              userName,
              members: updatedMembers
            });
          }
        } catch (e) {
          console.error('[Socket disconnect] Presence update error:', e.message);
        }
      }

      // Clean up any pending join requests initiated by this socket
      for (const [reqId, req] of pendingJoinRequests.entries()) {
        if (req.socketId === socket.id) {
          pendingJoinRequests.delete(reqId);
          for (const [sId, info] of socketRegistry.entries()) {
            if (info.roomId === req.roomId && info.role === 'host') {
              io.to(sId).emit('join_request:cancelled', { requestId: reqId });
            }
          }
        }
      }
    });
  });

  return io;
}

export function getIO() {
  return ioInstance;
}

export default { initSocketServer, getIO };
