import { useState, useEffect, useRef } from 'react';
import type { RoomState, RoomMember, RoomMessage, AnalyzeResponse } from '../types';
import realtimeService from '../services/socket';

interface RoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateRoom: (data: {
    name: string;
    hostName: string;
  }) => Promise<void>;
  onJoinApproved: (joinData: {
    room: RoomState;
    member: RoomMember;
    members: RoomMember[];
    messages: RoomMessage[];
    code: string;
    codeVersion: number;
    latestAnalysis?: AnalyzeResponse | null;
  }) => void;
  currentLanguage?: string;
  currentMode?: string;
}

export default function RoomModal({
  isOpen,
  onClose,
  onCreateRoom,
  onJoinApproved
}: RoomModalProps) {
  const [activeTab, setActiveTab] = useState<'create' | 'join'>('create');

  // Create Form State - simplified strictly to room name and host name
  const [createName, setCreateName] = useState('CodePilot Collab Session');
  const [createHostName, setCreateHostName] = useState('Pilot Leader');

  // Join Form State - strictly enter name and code
  const [joinUserName, setJoinUserName] = useState('Collaborator');
  const [joinRoomId, setJoinRoomId] = useState('');

  // Join Request State
  const [joinStatus, setJoinStatus] = useState<'idle' | 'requesting' | 'waiting' | 'approved' | 'rejected'>('idle');
  const [waitingRequestId, setWaitingRequestId] = useState<string | null>(null);
  const [waitingRoomName, setWaitingRoomName] = useState<string>('');
  const [rejectReason, setRejectReason] = useState<string>('');

  // Status & Error
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const waitingRequestIdRef = useRef<string | null>(null);
  waitingRequestIdRef.current = waitingRequestId;

  // Socket listeners for join request approval / rejection
  useEffect(() => {
    if (!isOpen) return;

    const handleApproved = (payload: any) => {
      setJoinStatus('approved');
      setWaitingRequestId(null);
      setTimeout(() => {
        onJoinApproved(payload);
        handleClose();
      }, 1000);
    };

    const handleRejected = (payload: { reason?: string }) => {
      setJoinStatus('rejected');
      setRejectReason(payload?.reason || 'The host has declined your request to join this room.');
      setWaitingRequestId(null);
    };

    realtimeService.on('join_request:approved', handleApproved);
    realtimeService.on('join_request:rejected', handleRejected);

    return () => {
      realtimeService.off('join_request:approved', handleApproved);
      realtimeService.off('join_request:rejected', handleRejected);
    };
  }, [isOpen, onJoinApproved]);

  const handleClose = () => {
    // If waiting for approval, cancel the request before closing
    if (waitingRequestIdRef.current) {
      realtimeService.cancelJoinRequest(waitingRequestIdRef.current);
      setWaitingRequestId(null);
    }
    setJoinStatus('idle');
    setErrorMessage(null);
    onClose();
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createName.trim()) {
      setErrorMessage('Please enter a Room Name');
      return;
    }
    if (!createHostName.trim()) {
      setErrorMessage('Please enter your name as Host');
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      await onCreateRoom({
        name: createName.trim(),
        hostName: createHostName.trim()
      });
      handleClose();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to create room');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleJoinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinUserName.trim()) {
      setErrorMessage('Please enter your name');
      return;
    }
    if (!joinRoomId.trim()) {
      setErrorMessage('Please enter the Room Code or Passcode to join');
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);
    setJoinStatus('requesting');

    try {
      const clientId = crypto.randomUUID();
      const res = await realtimeService.requestJoinRoom(
        joinRoomId.trim(),
        clientId,
        joinUserName.trim(),
        joinRoomId.trim()
      );

      if (res.waiting) {
        setWaitingRequestId(res.requestId);
        setWaitingRoomName(res.roomName || joinRoomId.trim());
        setJoinStatus('waiting');
      }
    } catch (err) {
      setJoinStatus('idle');
      setErrorMessage(err instanceof Error ? err.message : 'Failed to send join request');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelRequest = async () => {
    if (waitingRequestId) {
      await realtimeService.cancelJoinRequest(waitingRequestId);
      setWaitingRequestId(null);
    }
    setJoinStatus('idle');
    setErrorMessage(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="bg-[#0b0f19] border border-cyan-800/60 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 bg-[#0d1322]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-base shadow-md shadow-cyan-500/20">
              👥
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">Collaborative Coding Rooms</h2>
              <p className="text-xs text-gray-400">Code together with genuine real-time synchronization & shared AI</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-800 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Tab Switcher - only Create Room and Join by Code */}
        {joinStatus === 'idle' && (
          <div className="flex border-b border-gray-800 bg-[#080c14] px-6 pt-3 gap-2">
            <button
              onClick={() => { setActiveTab('create'); setErrorMessage(null); }}
              className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
                activeTab === 'create'
                  ? 'border-cyan-400 text-cyan-300'
                  : 'border-transparent text-gray-400 hover:text-gray-200'
              }`}
            >
              ➕ Create Room
            </button>
            <button
              onClick={() => { setActiveTab('join'); setErrorMessage(null); }}
              className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
                activeTab === 'join'
                  ? 'border-cyan-400 text-cyan-300'
                  : 'border-transparent text-gray-400 hover:text-gray-200'
              }`}
            >
              🔑 Join by Code
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto max-h-[70vh]">
          {errorMessage && (
            <div className="mb-4 p-3 bg-red-950/60 border border-red-800/80 rounded-xl text-red-300 text-xs flex items-center gap-2">
              <span>⚠️</span>
              <span>{errorMessage}</span>
            </div>
          )}

          {/* TAB 1: CREATE ROOM (Keeps solely Room Name & Host Name) */}
          {activeTab === 'create' && joinStatus === 'idle' && (
            <form onSubmit={handleCreateSubmit} className="flex flex-col gap-4 text-xs">
              <div>
                <label className="block text-gray-300 font-semibold mb-1">Room Name</label>
                <input
                  type="text"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  placeholder="e.g. CodePilot Collab Session"
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>

              <div>
                <label className="block text-gray-300 font-semibold mb-1">Your Name (Host)</label>
                <input
                  type="text"
                  value={createHostName}
                  onChange={(e) => setCreateHostName(e.target.value)}
                  placeholder="e.g. Pilot Leader"
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>

              <div className="mt-1 p-2.5 rounded-lg bg-cyan-950/30 border border-cyan-800/40 text-[11px] text-cyan-300/80 flex items-center gap-2">
                <span>🛡️</span>
                <span>Host Security Active: You will review and approve each collaborator who requests to join.</span>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="mt-2 w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-bold transition-all shadow-lg shadow-cyan-950/40 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Creating Room...</span>
                  </>
                ) : (
                  <>
                    <span>🚀</span>
                    <span>Create & Launch Room</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* TAB 2: JOIN BY CODE (Keeps solely Enter Name & Enter Code) */}
          {activeTab === 'join' && joinStatus === 'idle' && (
            <form onSubmit={handleJoinSubmit} className="flex flex-col gap-4 text-xs">
              <div>
                <label className="block text-gray-300 font-semibold mb-1">Enter Your Name</label>
                <input
                  type="text"
                  value={joinUserName}
                  onChange={(e) => setJoinUserName(e.target.value)}
                  placeholder="Enter your name"
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>

              <div>
                <label className="block text-gray-300 font-semibold mb-1">Enter Code to Join Room</label>
                <input
                  type="text"
                  value={joinRoomId}
                  onChange={(e) => setJoinRoomId(e.target.value.toUpperCase())}
                  placeholder="e.g. ROOM-ABC123 or passcode"
                  className="w-full font-mono bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-cyan-300 placeholder-gray-600 focus:outline-none focus:border-cyan-500 uppercase tracking-wider text-sm"
                  required
                />
              </div>

              <div className="mt-1 p-2.5 rounded-lg bg-blue-950/30 border border-blue-800/40 text-[11px] text-blue-300/80 flex items-center gap-2">
                <span>🔒</span>
                <span>Security Notice: Once you enter the code, a join request will be sent to the host for approval.</span>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="mt-2 w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold transition-all shadow-lg shadow-cyan-950/40 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Sending Request...</span>
                  </>
                ) : (
                  <>
                    <span>🚪</span>
                    <span>Request to Join Room</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* WAITING FOR HOST APPROVAL SCREEN */}
          {joinStatus === 'waiting' && (
            <div className="flex flex-col items-center justify-center py-6 text-center animate-fade-in">
              <div className="relative mb-4">
                <div className="w-16 h-16 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-2xl">
                  🛡️
                </div>
                <span className="absolute inset-0 rounded-full border-2 border-cyan-400/40 animate-ping" />
              </div>

              <h3 className="text-base font-bold text-white mb-1">
                Waiting for Host Approval
              </h3>
              <p className="text-xs text-gray-400 max-w-sm mb-4">
                Request sent to the host of <span className="text-cyan-300 font-semibold">{waitingRoomName || joinRoomId}</span>. For security purposes, the host must accept your request before you enter.
              </p>

              <div className="px-3 py-1.5 rounded-full bg-gray-900 border border-gray-800 text-[11px] text-gray-300 mb-6 flex items-center gap-2 font-mono">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                <span>Joining as: <strong className="text-white font-sans">{joinUserName}</strong></span>
              </div>

              <button
                type="button"
                onClick={handleCancelRequest}
                className="px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel Request
              </button>
            </div>
          )}

          {/* REQUEST APPROVED SCREEN */}
          {joinStatus === 'approved' && (
            <div className="flex flex-col items-center justify-center py-8 text-center animate-fade-in">
              <div className="w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center text-2xl mb-3">
                ✓
              </div>
              <h3 className="text-base font-bold text-emerald-300 mb-1">
                Request Approved!
              </h3>
              <p className="text-xs text-gray-400">
                The host accepted your request. Launching collaborative session...
              </p>
            </div>
          )}

          {/* REQUEST REJECTED SCREEN */}
          {joinStatus === 'rejected' && (
            <div className="flex flex-col items-center justify-center py-6 text-center animate-fade-in">
              <div className="w-14 h-14 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center text-2xl mb-3">
                ✕
              </div>
              <h3 className="text-base font-bold text-rose-300 mb-1">
                Request Declined
              </h3>
              <p className="text-xs text-gray-400 max-w-sm mb-5">
                {rejectReason || 'The host has declined your request to join this room.'}
              </p>
              <button
                type="button"
                onClick={() => { setJoinStatus('idle'); setErrorMessage(null); }}
                className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition-colors cursor-pointer"
              >
                Try Again
              </button>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
