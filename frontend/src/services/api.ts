/**
 * Frontend API service — all communication with the CodePilot backend.
 * The frontend NEVER calls the AI API directly.
 */

import type { AnalyzeRequest, AnalyzeResponse, ChatRequest, ChatResponse } from '../types';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

async function handleResponse<T>(res: Response): Promise<T> {
  let data: any;
  try {
    data = await res.json();
  } catch {
    const text = await res.text().catch(() => '');
    throw new Error(text || `Request failed with status ${res.status}`);
  }

  if (!res.ok) {
    throw new Error(data?.error || `Request failed with status ${res.status}`);
  }

  return data as T;
}

/**
 * Sends code to the backend for CodePilot intelligence + Gemini analysis.
 */
export async function analyzeCode(request: AnalyzeRequest): Promise<AnalyzeResponse> {
  const res = await fetch(`${API_BASE}/api/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request)
  });

  return await handleResponse<AnalyzeResponse>(res);
}

/**
 * Sends a follow-up question with full code intelligence context to the backend.
 */
export async function sendChatMessage(request: ChatRequest): Promise<ChatResponse> {
  const res = await fetch(`${API_BASE}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request)
  });

  return await handleResponse<ChatResponse>(res);
}

// ─── Collaborative Rooms REST APIs ───

export async function createRoom(payload: {
  name: string;
  code?: string;
  language?: string;
  mode?: string;
  hostName: string;
  isPrivate?: boolean;
  passcode?: string;
  hostId?: string;
}) {
  const res = await fetch(`${API_BASE}/api/rooms`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  return await handleResponse<{
    room: any;
    hostMember: any;
  }>(res);
}

export async function listPublicRooms() {
  const res = await fetch(`${API_BASE}/api/rooms`);
  return await handleResponse<{ rooms: any[] }>(res);
}

export async function getRoom(roomId: string) {
  const res = await fetch(`${API_BASE}/api/rooms/${roomId}`);
  return await handleResponse<{ room: any; members: any[] }>(res);
}

export async function joinRoomApi(roomId: string, payload: {
  userName: string;
  passcode?: string;
  clientId?: string;
}) {
  const res = await fetch(`${API_BASE}/api/rooms/${roomId}/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  return await handleResponse<{
    room: any;
    member: any;
  }>(res);
}

export async function exportRoomSession(roomId: string) {
  const res = await fetch(`${API_BASE}/api/rooms/${roomId}/export`);
  return await handleResponse<any>(res);
}

export default {
  analyzeCode,
  sendChatMessage,
  createRoom,
  listPublicRooms,
  getRoom,
  joinRoomApi,
  exportRoomSession
};

