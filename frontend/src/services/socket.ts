/**
 * Socket.IO Client Service for CodePilot Collaborative Coding Rooms
 */

import { io, Socket } from 'socket.io-client';
import type { RoomMember, RoomState, RoomMessage, AnalyzeResponse } from '../types';

const SERVER_URL = import.meta.env.VITE_API_URL || 'https://codepilot-owya.onrender.com';

class RealtimeRoomService {
  private socket: Socket | null = null;
  private currentRoomId: string | null = null;
  private currentClientId: string | null = null;
  private currentUserName: string | null = null;
  private currentPasscode?: string;
  private connectionStatusListeners: Set<(connected: boolean) => void> = new Set();

  public isConnected(): boolean {
    return this.socket?.connected || false;
  }

  public getSocket(): Socket {
    if (!this.socket) {
      this.socket = io(SERVER_URL, {
        transports: ['websocket', 'polling'],
        autoConnect: false,
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
      });

      this.socket.on('connect', () => {
        this.notifyConnectionStatus(true);
        // Automatically re-join room if client was in a room before connection dropped/reconnected
        const activeRoomId = this.currentRoomId || localStorage.getItem('codepilot_active_room_id');
        const activeClientId = this.currentClientId || localStorage.getItem('codepilot_client_id');
        const activeUserName = this.currentUserName || localStorage.getItem('codepilot_user_name') || 'Collaborator';

        if (activeRoomId && activeClientId) {
          this.currentRoomId = activeRoomId;
          this.currentClientId = activeClientId;
          this.currentUserName = activeUserName;
          this.socket?.emit('room:join', {
            roomId: activeRoomId,
            clientId: activeClientId,
            userName: activeUserName,
            passcode: this.currentPasscode
          });
        }
      });

      this.socket.on('disconnect', () => {
        this.notifyConnectionStatus(false);
      });

      this.socket.on('connect_error', (err) => {
        console.warn('[Socket] Connection error:', err.message);
        this.notifyConnectionStatus(false);
      });
    }

    if (!this.socket.connected) {
      this.socket.connect();
    }

    return this.socket;
  }

  public onConnectionChange(listener: (connected: boolean) => void): () => void {
    this.connectionStatusListeners.add(listener);
    listener(this.isConnected());
    return () => this.connectionStatusListeners.delete(listener);
  }

  private notifyConnectionStatus(connected: boolean) {
    this.connectionStatusListeners.forEach(listener => listener(connected));
  }

  public joinRoom(
    roomId: string,
    clientId: string,
    userName: string,
    passcode?: string
  ): Promise<{
    success: boolean;
    room: RoomState;
    member: RoomMember;
    members: RoomMember[];
    messages: RoomMessage[];
    code: string;
    codeVersion: number;
    latestAnalysis?: AnalyzeResponse | null;
  }> {
    this.currentRoomId = roomId;
    this.currentClientId = clientId;
    this.currentUserName = userName;
    this.currentPasscode = passcode;
    const socket = this.getSocket();

    return new Promise((resolve, reject) => {
      socket.emit('room:join', { roomId, clientId, userName, passcode }, (response: any) => {
        if (!response || response.error) {
          reject(new Error(response?.error || 'Failed to join room'));
        } else {
          resolve(response);
        }
      });
    });
  }

  public requestJoinRoom(
    roomId: string,
    clientId: string,
    userName: string,
    passcode?: string
  ): Promise<{
    success: boolean;
    waiting: boolean;
    requestId: string;
    roomId: string;
    roomName: string;
  }> {
    const socket = this.getSocket();
    return new Promise((resolve, reject) => {
      socket.emit('room:request_join', { roomId, clientId, userName, passcode }, (response: any) => {
        if (!response || response.error) {
          reject(new Error(response?.error || 'Failed to request room entry'));
        } else {
          resolve(response);
        }
      });
    });
  }

  public cancelJoinRequest(requestId: string): Promise<void> {
    const socket = this.getSocket();
    return new Promise((resolve) => {
      socket.emit('join_request:cancel', { requestId }, () => {
        resolve();
      });
    });
  }

  public respondJoinRequest(requestId: string, approved: boolean): Promise<{ success: boolean; approved: boolean }> {
    const socket = this.getSocket();
    return new Promise((resolve, reject) => {
      socket.emit('join_request:respond', { requestId, approved }, (res: any) => {
        if (res?.error) {
          reject(new Error(res.error));
        } else {
          resolve(res);
        }
      });
    });
  }

  public getPendingJoinRequests(roomId: string): Promise<{ requests: any[] }> {
    const socket = this.getSocket();
    return new Promise((resolve) => {
      socket.emit('join_requests:list', { roomId }, (res: any) => {
        resolve(res || { requests: [] });
      });
    });
  }

  public sendCodeChange(
    roomId: string,
    clientId: string,
    code: string,
    version: number
  ): Promise<{ success?: boolean; version?: number; conflict?: boolean; serverVersion?: number; serverCode?: string; error?: string }> {
    const socket = this.getSocket();
    return new Promise((resolve) => {
      socket.emit('code:change', { roomId, clientId, code, version }, (res: any) => {
        resolve(res || {});
      });
    });
  }

  public sendCursorMove(
    roomId: string,
    position: { lineNumber: number; column: number },
    selection?: any
  ) {
    if (this.socket?.connected) {
      this.socket.emit('cursor:move', { roomId, position, selection });
    }
  }

  public sendTyping(roomId: string, isTyping: boolean) {
    if (this.socket?.connected) {
      this.socket.emit('typing:status', { roomId, isTyping });
    }
  }

  public sendSettingsChange(roomId: string, language?: string, mode?: string) {
    if (this.socket?.connected) {
      this.socket.emit('settings:change', { roomId, language, mode });
    }
  }

  public changeMemberRole(roomId: string, targetClientId: string, newRole: string): Promise<any> {
    const socket = this.getSocket();
    return new Promise((resolve, reject) => {
      socket.emit('role:change', { roomId, targetClientId, newRole }, (res: any) => {
        if (res?.error) reject(new Error(res.error));
        else resolve(res);
      });
    });
  }

  public triggerAnalysis(roomId: string): Promise<any> {
    const socket = this.getSocket();
    return new Promise((resolve, reject) => {
      socket.emit('analysis:trigger', { roomId }, (res: any) => {
        if (res?.error) reject(new Error(res.error));
        else resolve(res);
      });
    });
  }

  public sendChatMessage(roomId: string, content: string, askPilot = false): Promise<any> {
    const socket = this.getSocket();
    return new Promise((resolve, reject) => {
      socket.emit('chat:send', { roomId, content, askPilot }, (res: any) => {
        if (res?.error) reject(new Error(res.error));
        else resolve(res);
      });
    });
  }

  public highlightLine(roomId: string, line: number, tab?: string) {
    if (this.socket?.connected) {
      this.socket.emit('view:highlight', { roomId, line, tab });
    }
  }

  public on(event: string, callback: (...args: any[]) => void) {
    const socket = this.getSocket();
    socket.on(event, callback);
  }

  public off(event: string, callback: (...args: any[]) => void) {
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }

  public leaveRoom(roomId?: string, clientId?: string, userName?: string) {
    const targetRoom = roomId || this.currentRoomId;
    if (this.socket && this.socket.connected && targetRoom) {
      try {
        this.socket.emit('room:leave', {
          roomId: targetRoom,
          clientId,
          userName
        });
      } catch (e) {
        console.warn('Error emitting room:leave:', e);
      }
    }
    this.currentRoomId = null;
    this.currentClientId = null;
    this.currentUserName = null;
    this.currentPasscode = undefined;
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.notifyConnectionStatus(false);
    }
  }
}

export const realtimeService = new RealtimeRoomService();
export default realtimeService;
