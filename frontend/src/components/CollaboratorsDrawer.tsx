import { useState, useRef, useEffect } from 'react';
import type { RoomState, RoomMember, RoomMessage, RoomRole, JoinRequestNotification } from '../types';

interface CollaboratorsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  room: RoomState;
  currentClientId: string;
  currentUserRole: RoomRole;
  members: RoomMember[];
  messages: RoomMessage[];
  isConnected: boolean;
  isAiThinking: boolean;
  pendingRequests?: JoinRequestNotification[];
  onRespondJoinRequest?: (requestId: string, approved: boolean) => void;
  onSendMessage: (content: string, askPilot?: boolean) => void;
  onChangeRole: (targetClientId: string, newRole: RoomRole) => void;
  onLeaveRoom: () => void;
  onExportSession: () => void;
}

export default function CollaboratorsDrawer({
  isOpen,
  onClose,
  room,
  currentClientId,
  currentUserRole,
  members,
  messages,
  isConnected,
  isAiThinking,
  pendingRequests = [],
  onRespondJoinRequest,
  onSendMessage,
  onChangeRole,
  onLeaveRoom,
  onExportSession
}: CollaboratorsDrawerProps) {
  const [activeTab, setActiveTab] = useState<'chat' | 'members'>('chat');
  const [inputText, setInputText] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isAiThinking]);

  if (!isOpen) return null;

  const isHost = currentUserRole === 'host';

  const handleCopyCode = () => {
    navigator.clipboard.writeText(room.id);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}?room=${room.id}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    const isAskPilot = inputText.trim().startsWith('@pilot');
    onSendMessage(inputText.trim(), isAskPilot);
    setInputText('');
  };

  const insertPilotPrompt = (prompt: string) => {
    setInputText(prompt);
  };

  return (
    <div className="fixed inset-y-0 right-0 z-40 w-80 md:w-96 bg-[#090d16] border-l border-gray-800 shadow-2xl flex flex-col animate-slide-left">
      
      {/* ─── Drawer Header ─── */}
      <div className="p-4 border-b border-gray-800 bg-[#0b101c] flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <h3 className="font-bold text-white text-sm truncate max-w-[190px]">
              {room.name}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-800 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Room Code & Copy Actions */}
        <div className="flex items-center justify-between bg-gray-950/80 border border-gray-800 px-2.5 py-1.5 rounded-xl">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-gray-500 uppercase font-mono">Code:</span>
            <span className="text-xs font-mono font-bold text-cyan-400 tracking-wider">
              {room.id}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={handleCopyCode}
              className="text-[11px] px-2 py-0.5 rounded bg-gray-800 hover:bg-gray-700 text-gray-300 transition-colors cursor-pointer"
              title="Copy Room ID"
            >
              {copiedCode ? '✓ Copied' : 'Copy'}
            </button>
            <button
              onClick={handleCopyLink}
              className="text-[11px] px-2 py-0.5 rounded bg-cyan-950 hover:bg-cyan-900 border border-cyan-800/60 text-cyan-300 transition-colors cursor-pointer"
              title="Copy Direct Link"
            >
              {copiedLink ? '✓ Link' : '🔗 Link'}
            </button>
          </div>
        </div>

        {/* Connection status & version */}
        <div className="flex items-center justify-between text-[11px] text-gray-400">
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-rose-500'}`} />
            <span>{isConnected ? 'Real-time Connected' : 'Reconnecting...'}</span>
          </div>
          <span className="font-mono text-gray-500">v{room.codeVersion}</span>
        </div>
      </div>

      {/* ─── Drawer Tabs ─── */}
      <div className="flex border-b border-gray-800 bg-[#080c14] px-4 pt-2 gap-2">
        <button
          onClick={() => setActiveTab('chat')}
          className={`pb-2 px-3 text-xs font-semibold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'chat'
              ? 'border-cyan-400 text-cyan-300'
              : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          <span>💬</span>
          <span>Room Chat</span>
          {messages.length > 0 && (
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-cyan-950 text-cyan-400 font-mono">
              {messages.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('members')}
          className={`pb-2 px-3 text-xs font-semibold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'members'
              ? 'border-cyan-400 text-cyan-300'
              : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          <span>👥</span>
          <span>Collaborators ({members.filter(m => m.isOnline).length})</span>
        </button>
      </div>

      {/* ─── Drawer Content Area ─── */}
      <div className="flex-1 overflow-y-auto flex flex-col">

        {/* TAB: CHAT */}
        {activeTab === 'chat' && (
          <div className="flex-1 flex flex-col p-3 overflow-hidden">
            <div className="flex-1 overflow-y-auto flex flex-col gap-2.5 pr-1">
              {messages.length === 0 ? (
                <div className="py-12 text-center text-gray-500 text-xs">
                  Say hello to the room or ask <code className="text-cyan-400">@pilot</code> anything!
                </div>
              ) : (
                messages.map((msg) => {
                  const isMe = msg.senderId === currentClientId;
                  const isAi = msg.type === 'ai';
                  const isSystem = msg.type === 'system';

                  if (isSystem) {
                    return (
                      <div key={msg.id} className="text-center py-1 text-[11px] text-gray-500 font-medium italic">
                        {msg.content}
                      </div>
                    );
                  }

                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col text-xs rounded-xl p-2.5 max-w-[90%] ${
                        isAi
                          ? 'bg-gradient-to-br from-indigo-950/60 to-purple-950/60 border border-indigo-800/60 self-start text-gray-200'
                          : isMe
                          ? 'bg-cyan-950/70 border border-cyan-800/80 self-end text-cyan-100'
                          : 'bg-gray-900 border border-gray-800 self-start text-gray-200'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1 text-[10px] text-gray-400">
                        <span className="font-bold flex items-center gap-1">
                          {isAi ? '✈️ CodePilot AI' : msg.senderName}
                          {isMe && <span className="text-[9px] text-cyan-400 font-normal">(You)</span>}
                        </span>
                        <span>
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div className="whitespace-pre-wrap break-words">
                        {msg.content}
                      </div>
                      {msg.metadata?.tokensSaved && (
                        <div className="mt-1 text-[9px] text-emerald-400 flex items-center gap-1 font-mono">
                          <span>⚡</span>
                          <span>Deterministic AST hit ({msg.metadata.tokensSaved} tokens saved)</span>
                        </div>
                      )}
                    </div>
                  );
                })
              )}

              {isAiThinking && (
                <div className="flex items-center gap-2 p-2 rounded-xl bg-indigo-950/40 border border-indigo-800/50 text-indigo-300 text-xs self-start animate-pulse">
                  <span className="w-3.5 h-3.5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                  <span>Pilot is analyzing and preparing response...</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Pilot Prompts */}
            <div className="flex items-center gap-1.5 py-2 overflow-x-auto text-[10px]">
              <button
                onClick={() => insertPilotPrompt('@pilot what is the time complexity?')}
                className="px-2 py-0.5 rounded bg-gray-800 hover:bg-gray-700 text-cyan-400 whitespace-nowrap cursor-pointer transition-colors"
              >
                ⏱️ @pilot Complexity
              </button>
              <button
                onClick={() => insertPilotPrompt('@pilot explain how this loop functions')}
                className="px-2 py-0.5 rounded bg-gray-800 hover:bg-gray-700 text-cyan-400 whitespace-nowrap cursor-pointer transition-colors"
              >
                🔄 @pilot Explain Loop
              </button>
              <button
                onClick={() => insertPilotPrompt('@pilot what are edge cases for this?')}
                className="px-2 py-0.5 rounded bg-gray-800 hover:bg-gray-700 text-cyan-400 whitespace-nowrap cursor-pointer transition-colors"
              >
                🛡️ @pilot Edge Cases
              </button>
            </div>

            {/* Chat Input */}
            <form onSubmit={handleSend} className="flex gap-1.5 pt-1">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Message room or @pilot..."
                className="flex-1 bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
              />
              <button
                type="submit"
                disabled={!inputText.trim()}
                className="px-3.5 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-800 disabled:text-gray-600 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Send
              </button>
            </form>
          </div>
        )}

        {/* TAB: MEMBERS */}
        {activeTab === 'members' && (
          <div className="p-3 flex flex-col gap-3">
            {isHost && pendingRequests.length > 0 && onRespondJoinRequest && (
              <div className="p-3 rounded-xl bg-cyan-950/40 border border-cyan-800/80 flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs font-bold text-cyan-300">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                    Join Requests ({pendingRequests.length})
                  </span>
                </div>
                <div className="flex flex-col gap-2">
                  {pendingRequests.map((req) => (
                    <div key={req.requestId} className="flex items-center justify-between p-2 rounded-lg bg-gray-900/90 border border-gray-800">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-white">{req.userName}</span>
                        <span className="text-[10px] text-gray-400">Waiting for approval</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => onRespondJoinRequest(req.requestId, false)}
                          className="px-2 py-1 rounded bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800/60 text-[10px] font-semibold cursor-pointer"
                        >
                          Reject
                        </button>
                        <button
                          onClick={() => onRespondJoinRequest(req.requestId, true)}
                          className="px-2 py-1 rounded bg-cyan-600 hover:bg-cyan-500 text-white text-[10px] font-bold cursor-pointer shadow-sm"
                        >
                          Accept
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between text-[11px] text-gray-400 font-medium px-1">
              <span>Room Participants ({members.length})</span>
              <span className="text-emerald-400 font-mono font-bold flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {members.filter(m => m.isOnline).length} Online
              </span>
            </div>

            <div className="flex flex-col gap-2">
              {[...members]
                .sort((a, b) => (b.isOnline ? 1 : 0) - (a.isOnline ? 1 : 0))
                .map((member) => {
                  const isMe = member.clientId === currentClientId;
                  return (
                    <div
                      key={member.clientId}
                      className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                        member.isOnline
                          ? 'bg-gray-900/80 border-gray-800'
                          : 'bg-gray-950/40 border-gray-900 opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className="relative w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs text-white shadow-sm"
                          style={{ backgroundColor: member.isOnline ? member.avatarColor : '#374151' }}
                        >
                          {member.userName.charAt(0).toUpperCase()}
                          <span
                            className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-[#090d16] ${
                              member.isOnline ? 'bg-emerald-400' : 'bg-rose-500'
                            }`}
                          />
                        </div>
                        <div className="flex flex-col">
                          <span className={`font-semibold text-xs flex items-center gap-1.5 ${member.isOnline ? 'text-white' : 'text-gray-400'}`}>
                            {member.userName}
                            {isMe && <span className="text-[10px] text-cyan-400 font-normal">(You)</span>}
                          </span>
                          <div className="flex items-center gap-1.5 text-[10px]">
                            <span className={`w-1.5 h-1.5 rounded-full ${member.isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
                            <span className={member.isOnline ? 'text-emerald-400 font-medium' : 'text-rose-400/90 font-medium'}>
                              {member.isOnline ? 'Online' : 'Offline (Left)'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {/* Role Badge */}
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
                          member.role === 'host'
                            ? 'bg-amber-950 text-amber-300 border border-amber-800'
                            : member.role === 'editor'
                            ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                            : 'bg-gray-800 text-gray-400 border border-gray-700'
                        }`}>
                          {member.role === 'host' ? '👑 Host' : member.role === 'editor' ? '✏️ Editor' : '👁️ Viewer'}
                        </span>

                        {/* Host can toggle roles if user is online */}
                        {isHost && !isMe && member.role !== 'host' && (
                          <button
                            onClick={() => onChangeRole(member.clientId, member.role === 'editor' ? 'viewer' : 'editor')}
                            className="text-[10px] px-2 py-0.5 rounded bg-gray-800 hover:bg-gray-700 text-gray-300 cursor-pointer transition-colors"
                            title="Toggle Editor / Viewer permission"
                          >
                            {member.role === 'editor' ? 'Make Viewer' : 'Make Editor'}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

      </div>

      {/* ─── Drawer Bottom Actions ─── */}
      <div className="p-3 border-t border-gray-800 bg-[#0b101c] flex items-center justify-between gap-2">
        <button
          onClick={onExportSession}
          className="flex-1 py-1.5 px-3 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <span>📥</span>
          <span>Export Session</span>
        </button>

        <button
          onClick={onLeaveRoom}
          className="py-1.5 px-3 rounded-xl bg-rose-950/60 hover:bg-rose-900 border border-rose-800 text-rose-300 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <span>🚪</span>
          <span>Leave</span>
        </button>
      </div>

    </div>
  );
}
