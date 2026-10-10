import { useState, useEffect } from 'react';
import type { LearningMode, PublicRoomItem } from '../types';
import { SUPPORTED_LANGUAGES, LEARNING_MODES } from '../types';
import { listPublicRooms } from '../services/api';

interface RoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateRoom: (data: {
    name: string;
    language: string;
    mode: LearningMode;
    hostName: string;
    isPrivate: boolean;
    passcode?: string;
  }) => Promise<void>;
  onJoinRoom: (roomId: string, userName: string, passcode?: string) => Promise<void>;
  currentLanguage: string;
  currentMode: LearningMode;
}

export default function RoomModal({
  isOpen,
  onClose,
  onCreateRoom,
  onJoinRoom,
  currentLanguage,
  currentMode
}: RoomModalProps) {
  const [activeTab, setActiveTab] = useState<'create' | 'join' | 'browse'>('create');

  // Create Form State
  const [createName, setCreateName] = useState('CodePilot Collab Session');
  const [createLang, setCreateLang] = useState(currentLanguage || 'javascript');
  const [createMode, setCreateMode] = useState<LearningMode>(currentMode || 'mentor');
  const [createHostName, setCreateHostName] = useState('Pilot Leader');
  const [createIsPrivate, setCreateIsPrivate] = useState(false);
  const [createPasscode, setCreatePasscode] = useState('');

  // Join Form State
  const [joinRoomId, setJoinRoomId] = useState('');
  const [joinUserName, setJoinUserName] = useState('Collaborator');
  const [joinPasscode, setJoinPasscode] = useState('');

  // Browse State
  const [publicRooms, setPublicRooms] = useState<PublicRoomItem[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(false);

  // Status & Error
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && activeTab === 'browse') {
      fetchPublicRooms();
    }
  }, [isOpen, activeTab]);

  const fetchPublicRooms = async () => {
    setLoadingRooms(true);
    setErrorMessage(null);
    try {
      const res = await listPublicRooms();
      setPublicRooms(res.rooms || []);
    } catch {
      setErrorMessage('Could not load public rooms');
    } finally {
      setLoadingRooms(false);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      await onCreateRoom({
        name: createName.trim() || 'Collaborative Room',
        language: createLang,
        mode: createMode,
        hostName: createHostName.trim() || 'Host',
        isPrivate: createIsPrivate,
        passcode: createIsPrivate && createPasscode.trim() ? createPasscode.trim() : undefined
      });
      onClose();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to create room');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleJoinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinRoomId.trim()) {
      setErrorMessage('Please enter a Room Code');
      return;
    }
    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      await onJoinRoom(
        joinRoomId.trim().toUpperCase(),
        joinUserName.trim() || 'Collaborator',
        joinPasscode.trim() || undefined
      );
      onClose();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to join room');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickJoin = async (room: PublicRoomItem) => {
    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      await onJoinRoom(room.id, joinUserName.trim() || 'Collaborator');
      onClose();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to join room');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="bg-[#0b0f19] border border-cyan-800/60 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col">
        
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
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-800 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Tab Switcher */}
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
          <button
            onClick={() => { setActiveTab('browse'); setErrorMessage(null); }}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'browse'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            🌐 Browse Rooms
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto max-h-[70vh]">
          {errorMessage && (
            <div className="mb-4 p-3 bg-red-950/60 border border-red-800/80 rounded-xl text-red-300 text-xs flex items-center gap-2">
              <span>⚠️</span>
              <span>{errorMessage}</span>
            </div>
          )}

          {/* TAB 1: CREATE ROOM */}
          {activeTab === 'create' && (
            <form onSubmit={handleCreateSubmit} className="flex flex-col gap-4 text-xs">
              <div>
                <label className="block text-gray-300 font-semibold mb-1">Room Name</label>
                <input
                  type="text"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  placeholder="e.g. Algorithm Study Session"
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-300 font-semibold mb-1">Language</label>
                  <select
                    value={createLang}
                    onChange={(e) => setCreateLang(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                  >
                    {SUPPORTED_LANGUAGES.map(lang => (
                      <option key={lang.value} value={lang.value}>{lang.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-gray-300 font-semibold mb-1">Learning Mode</label>
                  <select
                    value={createMode}
                    onChange={(e) => setCreateMode(e.target.value as LearningMode)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                  >
                    {LEARNING_MODES.map(m => (
                      <option key={m.id} value={m.id}>{m.icon} {m.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-gray-300 font-semibold mb-1">Your Name (Host)</label>
                <input
                  type="text"
                  value={createHostName}
                  onChange={(e) => setCreateHostName(e.target.value)}
                  placeholder="Your Name"
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>

              <div className="border border-gray-800 rounded-xl p-3 bg-gray-950/40">
                <label className="flex items-center gap-2 cursor-pointer text-gray-300">
                  <input
                    type="checkbox"
                    checked={createIsPrivate}
                    onChange={(e) => setCreateIsPrivate(e.target.checked)}
                    className="rounded bg-gray-800 border-gray-700 text-cyan-500 focus:ring-0"
                  />
                  <span className="font-semibold">Private Room (Requires Passcode)</span>
                </label>
                {createIsPrivate && (
                  <div className="mt-2.5">
                    <input
                      type="text"
                      value={createPasscode}
                      onChange={(e) => setCreatePasscode(e.target.value)}
                      placeholder="Enter room passcode"
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                )}
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

          {/* TAB 2: JOIN BY CODE */}
          {activeTab === 'join' && (
            <form onSubmit={handleJoinSubmit} className="flex flex-col gap-4 text-xs">
              <div>
                <label className="block text-gray-300 font-semibold mb-1">Room Code</label>
                <input
                  type="text"
                  value={joinRoomId}
                  onChange={(e) => setJoinRoomId(e.target.value.toUpperCase())}
                  placeholder="e.g. ROOM-ABC123"
                  className="w-full font-mono bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-cyan-300 placeholder-gray-600 focus:outline-none focus:border-cyan-500 uppercase tracking-wider text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-gray-300 font-semibold mb-1">Your Display Name</label>
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
                <label className="block text-gray-300 font-semibold mb-1">Passcode (If Private)</label>
                <input
                  type="password"
                  value={joinPasscode}
                  onChange={(e) => setJoinPasscode(e.target.value)}
                  placeholder="Leave empty if room is public"
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="mt-2 w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold transition-all shadow-lg shadow-cyan-950/40 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Joining Room...</span>
                  </>
                ) : (
                  <>
                    <span>🚪</span>
                    <span>Join Room</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* TAB 3: BROWSE ROOMS */}
          {activeTab === 'browse' && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400 font-medium">Active Public Sessions</span>
                <button
                  onClick={fetchPublicRooms}
                  disabled={loadingRooms}
                  className="text-xs text-cyan-400 hover:text-cyan-300 font-medium"
                >
                  {loadingRooms ? 'Refreshing...' : '↻ Refresh'}
                </button>
              </div>

              {loadingRooms ? (
                <div className="py-8 flex flex-col items-center justify-center text-gray-400 text-xs gap-2">
                  <span className="w-5 h-5 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
                  <span>Loading rooms...</span>
                </div>
              ) : publicRooms.length === 0 ? (
                <div className="py-8 text-center text-gray-500 text-xs">
                  No public rooms active right now. Be the first to create one!
                </div>
              ) : (
                <div className="flex flex-col gap-2 max-h-60 overflow-y-auto">
                  {publicRooms.map((room) => (
                    <div
                      key={room.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-gray-900/80 border border-gray-800 hover:border-gray-700 transition-all"
                    >
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-xs">{room.name}</span>
                          <span className="font-mono text-[10px] bg-cyan-950 text-cyan-400 px-1.5 py-0.5 rounded border border-cyan-800/50">
                            {room.id}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-gray-400">
                          <span>Host: <strong className="text-gray-300">{room.hostName}</strong></span>
                          <span>Lang: <strong className="text-cyan-400 capitalize">{room.language}</strong></span>
                          <span>Online: <strong className="text-emerald-400">{room.onlineMembers}</strong></span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleQuickJoin(room)}
                        disabled={isSubmitting}
                        className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold cursor-pointer transition-colors shadow-sm disabled:opacity-50"
                      >
                        Join
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
