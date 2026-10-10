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

let ioInstance = null;

// Track socket to client mapping: socketId -> { clientId, roomId, userName }
const socketRegistry = new Map();

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

        const joinResult = roomService.joinRoom(roomId, {
          userName: userName || 'Collaborator',
          passcode,
          clientId
        });

        const { room, member } = joinResult;

        // Register socket association
        socketRegistry.set(socket.id, {
          clientId: member.clientId,
          roomId,
          userName: member.userName,
          role: member.role
        });

        socket.join(roomId);

        // Fetch latest state for initial sync
        const allMembers = roomService.getRoomMembers(roomId);
        const messages = roomService.getRoomMessages(roomId, 100);

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
        socket.to(roomId).emit('member:joined', {
          member,
          members: allMembers
        });

      } catch (err) {
        console.error(`[Socket room:join] Error for socket ${socket.id}:`, err.message);
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
            io.to(roomId).emit('presence:changed', {
              clientId,
              userName,
              isOnline: false,
              members: updatedMembers
            });
          }
        } catch (e) {
          console.error('[Socket disconnect] Presence update error:', e.message);
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
