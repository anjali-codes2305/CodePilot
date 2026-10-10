import { useState, useRef, useEffect } from 'react';
import type {
  LearningMode,
  Message,
  NormalizedCodeAnalysis,
  ExecutionTrace,
  PracticeQuizItem,
  InterviewQuestion,
  AnalyzeResponse,
  StructuredSections,
  LearnerProfile,
  RoomState,
  RoomMember,
  RoomMessage,
  PeerCursor,
  RoomRole
} from './types';
import {
  analyzeCode,
  sendChatMessage,
  createRoom as apiCreateRoom,
  exportRoomSession
} from './services/api';
import realtimeService from './services/socket';
import CodeEditor from './components/CodeEditor';
import LanguageSelector from './components/LanguageSelector';
import ModeSelector from './components/ModeSelector';
import AnalysisPanel from './components/AnalysisPanel';
import ChatInterface from './components/ChatInterface';
import FlowchartViewer from './components/FlowchartViewer';
import ExecutionTracerView from './components/ExecutionTracerView';
import DataStructureViewer from './components/DataStructureViewer';
import PracticeView from './components/PracticeView';
import InterviewView from './components/InterviewView';
import LearnerProfileView from './components/LearnerProfileView';
import LandingPage from './components/LandingPage';
import RoomModal from './components/RoomModal';
import CollaboratorsDrawer from './components/CollaboratorsDrawer';

const SAMPLE_PROGRAMS = [
  {
    name: 'Duplicate (HashSet)',
    language: 'java',
    code: `public static int findDuplicate(int[] nums) {
    HashSet<Integer> set = new HashSet<>();

    for (int num : nums) {
        if (set.contains(num)) {
            return num;
        }

        set.add(num);
    }

    return -1;
}`
  },
  {
    name: 'Binary Search (O(log n))',
    language: 'javascript',
    code: `function binarySearch(arr, target) {
    let low = 0;
    let high = arr.length - 1;

    while (low <= high) {
        const mid = Math.floor(low + (high - low) / 2);

        if (arr[mid] === target) {
            return mid;
        } else if (arr[mid] < target) {
            low = mid + 1;
        } else {
            high = mid - 1;
        }
    }

    return -1;
}`
  },
  {
    name: 'Bubble Sort (O(n²))',
    language: 'javascript',
    code: `function bubbleSort(arr) {
    const n = arr.length;

    for (let i = 0; i < n - 1; i++) {
        for (let j = 0; j < n - i - 1; j++) {
            if (arr[j] > arr[j + 1]) {
                const temp = arr[j];
                arr[j] = arr[j + 1];
                arr[j + 1] = temp;
            }
        }
    }

    return arr;
}`
  },
  {
    name: 'Fibonacci (Recursion O(2^n))',
    language: 'python',
    code: `def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n - 1) + fibonacci(n - 2)`
  }
];

type StudioTab = 'analysis' | 'visualize' | 'trace' | 'chat' | 'practice' | 'interview';

export default function App() {
  // --- View State ---
  const [currentView, setCurrentView] = useState<'landing' | 'studio'>('landing');

  // --- Core Studio State ---
  const [code, setCode] = useState(SAMPLE_PROGRAMS[0].code);
  const [language, setLanguage] = useState(SAMPLE_PROGRAMS[0].language);
  const [mode, setMode] = useState<LearningMode>('mentor');
  const [activeTab, setActiveTab] = useState<StudioTab>('analysis');
  const [highlightedLine, setHighlightedLine] = useState<number | null>(null);

  // --- CodePilot Intelligence & AI State ---
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [structuredSections, setStructuredSections] = useState<StructuredSections | undefined>(undefined);
  const [codeAnalysis, setCodeAnalysis] = useState<NormalizedCodeAnalysis | null>(null);
  const [executionTrace, setExecutionTrace] = useState<ExecutionTrace | null>(null);
  const [practiceQuiz, setPracticeQuiz] = useState<PracticeQuizItem[]>([]);
  const [interviewQuestions, setInterviewQuestions] = useState<InterviewQuestion[]>([]);
  const [isCachedHit, setIsCachedHit] = useState(false);

  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // --- Chat State ---
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);

  // --- Learner Profile Modal & Session Tracking ---
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [learnerProfile, setLearnerProfile] = useState<LearnerProfile>({
    conceptsEncountered: [],
    conceptsMastered: [],
    confusionPoints: [],
    questionsAskedCount: 0,
    practiceScore: { correct: 0, total: 0 }
  });

  // Client-side instant memory cache
  const clientCacheRef = useRef<Map<string, AnalyzeResponse>>(new Map());

  // Context used for current analysis session
  const [analyzedContext, setAnalyzedContext] = useState<{
    code: string;
    language: string;
    mode: LearningMode;
  } | null>(null);

  // ─── Collaborative Rooms State ───
  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [activeRoom, setActiveRoom] = useState<RoomState | null>(null);
  const [currentMember, setCurrentMember] = useState<RoomMember | null>(null);
  const [roomMembers, setRoomMembers] = useState<RoomMember[]>([]);
  const [roomMessages, setRoomMessages] = useState<RoomMessage[]>([]);
  const [peerCursors, setPeerCursors] = useState<PeerCursor[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [roomNotification, setRoomNotification] = useState<string | null>(null);
  const [conflictBanner, setConflictBanner] = useState<string | null>(null);

  // Track client ID in localStorage
  const clientIdRef = useRef<string>(
    localStorage.getItem('codepilot_client_id') ||
    (() => {
      const id = 'client_' + Math.random().toString(36).substring(2, 10);
      localStorage.setItem('codepilot_client_id', id);
      return id;
    })()
  );

  // Auto-check URL query parameters for ?room=ROOM-XYZ
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam) {
      setIsRoomModalOpen(true);
    }
  }, []);

  // ─── Realtime Event Listeners ───
  useEffect(() => {
    const unsubConnection = realtimeService.onConnectionChange((connected) => {
      setIsConnected(connected);
    });

    const handleCodeUpdated = (payload: {
      code: string;
      version: number;
      editorName: string;
    }) => {
      setCode(payload.code);
      setActiveRoom((prev) =>
        prev ? { ...prev, code: payload.code, codeVersion: payload.version } : null
      );
      setRoomNotification(`✏️ ${payload.editorName} updated the code (v${payload.version})`);
      setTimeout(() => setRoomNotification(null), 3000);
    };

    const handleCodeConflict = (payload: {
      serverVersion: number;
      serverCode: string;
      message: string;
    }) => {
      setCode(payload.serverCode);
      setActiveRoom((prev) =>
        prev ? { ...prev, code: payload.serverCode, codeVersion: payload.serverVersion } : null
      );
      setConflictBanner(`⚠️ Concurrency sync: Reconciled with latest server code (v${payload.serverVersion})`);
      setTimeout(() => setConflictBanner(null), 5000);
    };

    const handleCodePermissionDenied = (payload: { message: string }) => {
      setConflictBanner(`🚫 ${payload.message}`);
      setTimeout(() => setConflictBanner(null), 5000);
    };

    const handleCursorUpdated = (payload: PeerCursor) => {
      setPeerCursors((prev) => {
        const remaining = prev.filter((p) => p.clientId !== payload.clientId);
        return [...remaining, payload];
      });
    };

    const handleMemberJoined = (payload: { member: RoomMember; members: RoomMember[] }) => {
      setRoomMembers(payload.members);
      setRoomNotification(`👋 ${payload.member.userName} joined the room`);
      setTimeout(() => setRoomNotification(null), 3000);
    };

    const handleMembersUpdated = (payload: { members: RoomMember[] }) => {
      setRoomMembers(payload.members);
      const me = payload.members.find((m) => m.clientId === clientIdRef.current);
      if (me) setCurrentMember(me);
    };

    const handlePresenceChanged = (payload: {
      clientId: string;
      userName: string;
      isOnline: boolean;
      members: RoomMember[];
    }) => {
      setRoomMembers(payload.members);
      if (!payload.isOnline) {
        setPeerCursors((prev) => prev.filter((p) => p.clientId !== payload.clientId));
      }
    };

    const handleAnalysisStarted = (payload: { triggeredBy: string }) => {
      setAnalysisLoading(true);
      setAnalysisError(null);
      setRoomNotification(`🧠 ${payload.triggeredBy} triggered shared CodePilot analysis...`);
    };

    const handleAnalysisCompleted = (payload: AnalyzeResponse) => {
      setAnalysis(payload.analysis);
      setStructuredSections(payload.structuredSections);
      setCodeAnalysis(payload.codeAnalysis || null);
      setExecutionTrace(payload.executionTrace || null);
      setPracticeQuiz(payload.practiceQuiz || []);
      setInterviewQuestions(payload.interviewQuestions || []);
      setAnalysisLoading(false);
      setActiveTab('analysis');
      updateLearnerConcepts(payload.codeAnalysis);
      setRoomNotification('✨ Shared code analysis complete! All visualizations synchronized.');
      setTimeout(() => setRoomNotification(null), 4000);
    };

    const handleAnalysisError = (payload: { error: string }) => {
      setAnalysisLoading(false);
      setAnalysisError(payload.error);
    };

    const handleChatMessage = (msg: RoomMessage) => {
      setRoomMessages((prev) => [...prev, msg]);
    };

    const handlePilotThinking = (payload: { isThinking: boolean }) => {
      setIsAiThinking(payload.isThinking);
    };

    const handleViewHighlighted = (payload: { line: number; tab?: string; highlightedBy: string }) => {
      setHighlightedLine(payload.line);
      if (payload.tab && ['analysis', 'visualize', 'trace', 'chat', 'practice', 'interview'].includes(payload.tab)) {
        setActiveTab(payload.tab as StudioTab);
      }
      setRoomNotification(`🎯 ${payload.highlightedBy} focused line ${payload.line}`);
      setTimeout(() => setRoomNotification(null), 3000);
    };

    const handleSettingsUpdated = (payload: { language: string; mode: LearningMode; updatedBy: string }) => {
      if (payload.language) setLanguage(payload.language);
      if (payload.mode) setMode(payload.mode);
      setActiveRoom((prev) => (prev ? { ...prev, language: payload.language, mode: payload.mode } : null));
      setRoomNotification(`⚙️ ${payload.updatedBy} updated language to ${payload.language}`);
      setTimeout(() => setRoomNotification(null), 3000);
    };

    realtimeService.on('code:updated', handleCodeUpdated);
    realtimeService.on('code:conflict', handleCodeConflict);
    realtimeService.on('code:permission_denied', handleCodePermissionDenied);
    realtimeService.on('cursor:updated', handleCursorUpdated);
    realtimeService.on('member:joined', handleMemberJoined);
    realtimeService.on('members:updated', handleMembersUpdated);
    realtimeService.on('presence:changed', handlePresenceChanged);
    realtimeService.on('analysis:started', handleAnalysisStarted);
    realtimeService.on('analysis:completed', handleAnalysisCompleted);
    realtimeService.on('analysis:error', handleAnalysisError);
    realtimeService.on('chat:message', handleChatMessage);
    realtimeService.on('pilot:thinking', handlePilotThinking);
    realtimeService.on('view:highlighted', handleViewHighlighted);
    realtimeService.on('settings:updated', handleSettingsUpdated);

    return () => {
      unsubConnection();
      realtimeService.off('code:updated', handleCodeUpdated);
      realtimeService.off('code:conflict', handleCodeConflict);
      realtimeService.off('code:permission_denied', handleCodePermissionDenied);
      realtimeService.off('cursor:updated', handleCursorUpdated);
      realtimeService.off('member:joined', handleMemberJoined);
      realtimeService.off('members:updated', handleMembersUpdated);
      realtimeService.off('presence:changed', handlePresenceChanged);
      realtimeService.off('analysis:started', handleAnalysisStarted);
      realtimeService.off('analysis:completed', handleAnalysisCompleted);
      realtimeService.off('analysis:error', handleAnalysisError);
      realtimeService.off('chat:message', handleChatMessage);
      realtimeService.off('pilot:thinking', handlePilotThinking);
      realtimeService.off('view:highlighted', handleViewHighlighted);
      realtimeService.off('settings:updated', handleSettingsUpdated);
    };
  }, []);

  /**
   * Launch Studio from Landing Page with optional preset code/lang/mode
   */
  const handleLaunchStudio = (presetCode?: string, presetLang?: string, presetMode?: LearningMode) => {
    if (presetCode) setCode(presetCode);
    if (presetLang) setLanguage(presetLang);
    if (presetMode) setMode(presetMode);
    setCurrentView('studio');
  };

  /**
   * Updates learner profile concepts from code analysis
   */
  const updateLearnerConcepts = (analysisObj?: NormalizedCodeAnalysis | null) => {
    if (!analysisObj) return;
    const newConcepts = new Set(learnerProfile.conceptsEncountered);
    if (analysisObj.dataStructures) {
      analysisObj.dataStructures.forEach(d => newConcepts.add(d.type));
    }
    if (analysisObj.complexity?.time) {
      newConcepts.add(`Time: ${analysisObj.complexity.time}`);
    }
    if (analysisObj.recursion?.detected) {
      newConcepts.add('Recursion');
    }
    if (analysisObj.loops?.length > 0) {
      newConcepts.add('Loop Iteration');
    }

    setLearnerProfile(prev => ({
      ...prev,
      conceptsEncountered: Array.from(newConcepts)
    }));
  };

  /**
   * Code change handler: handles both Solo and Collaborative synchronization
   */
  const handleCodeChange = (newCode: string) => {
    setCode(newCode);

    if (activeRoom && currentMember) {
      if (currentMember.role === 'viewer') return;

      realtimeService.sendCodeChange(
        activeRoom.id,
        currentMember.clientId,
        newCode,
        activeRoom.codeVersion
      ).then((res) => {
        if (res?.success && res.version) {
          setActiveRoom(prev => prev ? { ...prev, code: newCode, codeVersion: res.version! } : null);
        }
      });
    }
  };

  /**
   * Cursor position broadcast
   */
  const handleCursorChange = (
    position: { lineNumber: number; column: number },
    selection?: any
  ) => {
    if (activeRoom) {
      realtimeService.sendCursorMove(activeRoom.id, position, selection);
    }
  };

  /**
   * Language change handler: updates room settings if in room
   */
  const handleLanguageChange = (newLang: string) => {
    setLanguage(newLang);
    if (activeRoom) {
      realtimeService.sendSettingsChange(activeRoom.id, newLang, mode);
    }
  };

  /**
   * Mode change handler: updates room mode if in room
   */
  const handleModeChange = (newMode: LearningMode) => {
    setMode(newMode);
    if (activeRoom) {
      realtimeService.sendSettingsChange(activeRoom.id, language, newMode);
    }
  };

  /**
   * Optimized Analyze Code handler
   */
  const handleAnalyze = async () => {
    if (!code.trim()) {
      setAnalysisError('Please enter some code to analyze.');
      return;
    }

    // In a room: run shared collaborative analysis
    if (activeRoom) {
      if (currentMember?.role === 'viewer') {
        setAnalysisError('Viewers cannot trigger analysis. Request Editor permissions from the Host.');
        return;
      }
      setAnalysisLoading(true);
      setAnalysisError(null);
      try {
        await realtimeService.triggerAnalysis(activeRoom.id);
      } catch (err) {
        setAnalysisError(err instanceof Error ? err.message : 'Analysis failed');
        setAnalysisLoading(false);
      }
      return;
    }

    // In Solo mode: run local cached analysis
    const cacheKey = `${language}:${mode}:${code.trim()}`;
    if (clientCacheRef.current.has(cacheKey)) {
      const cached = clientCacheRef.current.get(cacheKey)!;
      setAnalysis(cached.analysis);
      setStructuredSections(cached.structuredSections);
      setCodeAnalysis(cached.codeAnalysis || null);
      setExecutionTrace(cached.executionTrace || null);
      setPracticeQuiz(cached.practiceQuiz || []);
      setInterviewQuestions(cached.interviewQuestions || []);
      setAnalyzedContext({ code, language, mode });
      updateLearnerConcepts(cached.codeAnalysis);
      setIsCachedHit(true);
      setActiveTab('analysis');
      setAnalysisError(null);
      return;
    }

    setAnalysisLoading(true);
    setAnalysisError(null);
    setAnalysis(null);
    setStructuredSections(undefined);
    setCodeAnalysis(null);
    setExecutionTrace(null);
    setPracticeQuiz([]);
    setInterviewQuestions([]);
    setMessages([]);
    setChatError(null);
    setHighlightedLine(null);
    setIsCachedHit(false);

    try {
      const result = await analyzeCode({ code, language, mode });
      setAnalysis(result.analysis);
      setStructuredSections(result.structuredSections);
      setCodeAnalysis(result.codeAnalysis || null);
      setExecutionTrace(result.executionTrace || null);
      setPracticeQuiz(result.practiceQuiz || []);
      setInterviewQuestions(result.interviewQuestions || []);
      setAnalyzedContext({ code, language, mode });
      updateLearnerConcepts(result.codeAnalysis);
      clientCacheRef.current.set(cacheKey, result);
      setActiveTab('analysis');
    } catch (err) {
      setAnalysisError(err instanceof Error ? err.message : 'Failed to analyze code.');
    } finally {
      setAnalysisLoading(false);
    }
  };

  /**
   * Follow-up chat message handler
   */
  const handleSendMessage = async (question: string) => {
    // If in room, broadcast message to room
    if (activeRoom) {
      try {
        await realtimeService.sendChatMessage(activeRoom.id, question, true);
      } catch (err) {
        setChatError(err instanceof Error ? err.message : 'Failed to send room message');
      }
      return;
    }

    if (!analyzedContext) return;

    if (
      question.toLowerCase().includes("don't understand") ||
      question.toLowerCase().includes("confused") ||
      question.toLowerCase().includes("why is it")
    ) {
      const topic = codeAnalysis?.dataStructures?.[0]?.type || 'Loop Logic';
      setLearnerProfile(prev => ({
        ...prev,
        confusionPoints: Array.from(new Set([...prev.confusionPoints, topic]))
      }));
    }

    setLearnerProfile(prev => ({
      ...prev,
      questionsAskedCount: prev.questionsAskedCount + 1
    }));

    const userMessage: Message = { role: 'user', content: question };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setChatLoading(true);
    setChatError(null);

    try {
      const response = await sendChatMessage({
        code: analyzedContext.code,
        language: analyzedContext.language,
        mode: analyzedContext.mode,
        messages: updatedMessages,
        question,
        codeAnalysis
      });

      const assistantMessage: Message = {
        role: 'assistant',
        content: response.response,
        source: response.source,
        deterministic: response.deterministic,
        tokensSaved: response.tokensSaved
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (err) {
      setChatError(err instanceof Error ? err.message : 'Failed to get a response.');
    } finally {
      setChatLoading(false);
    }
  };

  const handleSelectLine = (line: number) => {
    setHighlightedLine(line);
    if (activeRoom) {
      realtimeService.highlightLine(activeRoom.id, line, activeTab);
    }
  };

  const handleLoadSample = (sample: typeof SAMPLE_PROGRAMS[0]) => {
    handleCodeChange(sample.code);
    handleLanguageChange(sample.language);
  };

  const handleScoreUpdate = (correct: number, total: number) => {
    setLearnerProfile(prev => {
      const mastered = new Set(prev.conceptsMastered);
      if (correct > 0 && codeAnalysis?.complexity?.time) {
        mastered.add(`Time Complexity (${codeAnalysis.complexity.time})`);
      }
      return {
        ...prev,
        practiceScore: { correct, total },
        conceptsMastered: Array.from(mastered)
      };
    });
  };

  // ─── Room Creation & Joining Handlers ───
  const handleCreateRoom = async (data: {
    name: string;
    language: string;
    mode: LearningMode;
    hostName: string;
    isPrivate: boolean;
    passcode?: string;
  }) => {
    const res = await apiCreateRoom({
      name: data.name,
      code,
      language: data.language,
      mode: data.mode,
      hostName: data.hostName,
      isPrivate: data.isPrivate,
      passcode: data.passcode
    });

    const joinData = await realtimeService.joinRoom(
      res.room.id,
      res.hostMember.clientId,
      data.hostName,
      data.passcode
    );

    setActiveRoom(joinData.room);
    setCurrentMember(joinData.member);
    setRoomMembers(joinData.members);
    setRoomMessages(joinData.messages);
    setCode(joinData.code);
    setLanguage(joinData.room.language);
    setMode(joinData.room.mode as LearningMode);

    if (joinData.latestAnalysis) {
      setAnalysis(joinData.latestAnalysis.analysis);
      setStructuredSections(joinData.latestAnalysis.structuredSections);
      setCodeAnalysis(joinData.latestAnalysis.codeAnalysis || null);
      setExecutionTrace(joinData.latestAnalysis.executionTrace || null);
      setPracticeQuiz(joinData.latestAnalysis.practiceQuiz || []);
      setInterviewQuestions(joinData.latestAnalysis.interviewQuestions || []);
    }

    setCurrentView('studio');
    setIsDrawerOpen(true);
    setRoomNotification(`🎉 Room ${joinData.room.id} created! You are the Host.`);
  };

  const handleJoinRoom = async (roomId: string, userName: string, passcode?: string) => {
    const joinData = await realtimeService.joinRoom(
      roomId,
      clientIdRef.current,
      userName,
      passcode
    );

    setActiveRoom(joinData.room);
    setCurrentMember(joinData.member);
    setRoomMembers(joinData.members);
    setRoomMessages(joinData.messages);
    setCode(joinData.code);
    setLanguage(joinData.room.language);
    setMode(joinData.room.mode as LearningMode);

    if (joinData.latestAnalysis) {
      setAnalysis(joinData.latestAnalysis.analysis);
      setStructuredSections(joinData.latestAnalysis.structuredSections);
      setCodeAnalysis(joinData.latestAnalysis.codeAnalysis || null);
      setExecutionTrace(joinData.latestAnalysis.executionTrace || null);
      setPracticeQuiz(joinData.latestAnalysis.practiceQuiz || []);
      setInterviewQuestions(joinData.latestAnalysis.interviewQuestions || []);
    }

    setCurrentView('studio');
    setIsDrawerOpen(true);
    setRoomNotification(`🚪 Joined room ${joinData.room.name}`);
  };

  const handleLeaveRoom = () => {
    realtimeService.leaveRoom();
    setActiveRoom(null);
    setCurrentMember(null);
    setRoomMembers([]);
    setRoomMessages([]);
    setPeerCursors([]);
    setIsDrawerOpen(false);
    setRoomNotification('Left room. You are now in Solo Studio mode.');
    setTimeout(() => setRoomNotification(null), 3000);
  };

  const handleChangeRole = async (targetClientId: string, newRole: RoomRole) => {
    if (!activeRoom) return;
    try {
      await realtimeService.changeMemberRole(activeRoom.id, targetClientId, newRole);
    } catch (err) {
      setConflictBanner(err instanceof Error ? err.message : 'Failed to change role');
      setTimeout(() => setConflictBanner(null), 3000);
    }
  };

  const handleExportSession = async () => {
    if (!activeRoom) return;
    try {
      const data = await exportRoomSession(activeRoom.id);
      const jsonStr = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `codepilot-session-${activeRoom.id}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert('Failed to export session');
    }
  };

  const isCodeDirty = analyzedContext !== null && !activeRoom && (
    analyzedContext.code.trim() !== code.trim() ||
    analyzedContext.language !== language ||
    analyzedContext.mode !== mode
  );

  const isViewer = activeRoom !== null && currentMember?.role === 'viewer';

  // ─── If Landing View ───
  if (currentView === 'landing') {
    return <LandingPage onLaunchStudio={handleLaunchStudio} />;
  }

  // ─── Studio Workspace View ───
  return (
    <div className="flex flex-col h-screen bg-[#07090e] text-gray-100 overflow-hidden relative">
      
      {/* ─── Notification / Conflict Banners ─── */}
      {roomNotification && (
        <div className="absolute top-12 left-1/2 -translate-x-1/2 z-50 px-4 py-1.5 rounded-full bg-cyan-950/90 border border-cyan-500/60 text-cyan-200 text-xs font-semibold shadow-lg backdrop-blur-md animate-fade-in flex items-center gap-2">
          <span>🔔</span>
          <span>{roomNotification}</span>
        </div>
      )}

      {conflictBanner && (
        <div className="absolute top-12 left-1/2 -translate-x-1/2 z-50 px-4 py-1.5 rounded-full bg-amber-950/90 border border-amber-500/60 text-amber-200 text-xs font-semibold shadow-lg backdrop-blur-md animate-fade-in flex items-center gap-2">
          <span>⚠️</span>
          <span>{conflictBanner}</span>
        </div>
      )}

      {/* ─── Header ─── */}
      <header className="flex items-center justify-between px-6 py-2.5 border-b border-gray-800 bg-[#090d16] shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setCurrentView('landing')}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-800/80 hover:bg-gray-700 text-gray-300 text-xs font-semibold transition-colors cursor-pointer"
            title="Return to Landing Page"
          >
            <span>←</span>
            <span>Home</span>
          </button>

          <div className="h-4 w-px bg-gray-800" />

          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-sm shadow-md shadow-cyan-500/20">
              ✈️
            </div>
            <h1 className="text-base font-extrabold text-white tracking-tight">CodePilot</h1>
            <span className="text-[10px] font-mono uppercase bg-cyan-950 border border-cyan-800 text-cyan-400 px-2 py-0.5 rounded-full font-bold">
              Studio Pro
            </span>
          </div>

          {/* Active Collaborative Room Indicator Badge */}
          {activeRoom ? (
            <div className="flex items-center gap-2 ml-2">
              <div
                onClick={() => setIsDrawerOpen(true)}
                className="flex items-center gap-2 px-3 py-1 rounded-lg bg-gradient-to-r from-cyan-950/80 to-blue-950/80 border border-cyan-700 text-cyan-300 text-xs font-semibold cursor-pointer hover:border-cyan-400 transition-all shadow-sm"
                title="Click to view Collaborators & Room Chat"
              >
                <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                <span className="font-mono">{activeRoom.id}</span>
                <span className="text-[10px] text-cyan-400 font-mono">
                  ({roomMembers.filter(m => m.isOnline).length} online)
                </span>
                <span className={`text-[10px] font-mono uppercase px-1.5 py-0.2 rounded font-bold ${
                  currentMember?.role === 'host' ? 'bg-amber-900/60 text-amber-300' : currentMember?.role === 'editor' ? 'bg-cyan-900/60 text-cyan-300' : 'bg-gray-800 text-gray-300'
                }`}>
                  {currentMember?.role}
                </span>
              </div>
            </div>
          ) : (
            <span className="text-gray-500 text-xs hidden lg:block">
              · Understand your code. Ask anything. Learn your way.
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Collaborative Rooms Launcher Button */}
          {activeRoom ? (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setIsDrawerOpen(!isDrawerOpen)}
                className="flex items-center gap-1.5 text-xs text-white bg-cyan-600 hover:bg-cyan-500 px-3 py-1 rounded-lg font-semibold transition-colors cursor-pointer shadow-sm shadow-cyan-900/30"
              >
                <span>👥</span>
                <span>Room Panel</span>
              </button>
              <button
                onClick={handleLeaveRoom}
                className="text-xs text-gray-400 hover:text-rose-400 bg-gray-900 hover:bg-rose-950/40 border border-gray-800 hover:border-rose-800 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                title="Leave room and return to solo mode"
              >
                Leave
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsRoomModalOpen(true)}
              className="flex items-center gap-1.5 text-xs text-cyan-300 hover:text-white bg-gradient-to-r from-cyan-950 via-blue-950 to-indigo-950 hover:from-cyan-900 hover:to-blue-900 border border-cyan-800/80 px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer shadow-sm shadow-cyan-950/50"
              title="Start or join a realtime collaborative room"
            >
              <span>👥</span>
              <span>Collaborate</span>
            </button>
          )}

          {isCachedHit && !activeRoom && (
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-amber-300 bg-amber-950/40 border border-amber-800/50 px-2.5 py-0.5 rounded-lg">
              <span>⚡</span>
              <span>Instant Cache Hit (0 Tokens)</span>
            </div>
          )}

          {/* Learner Profile Trigger */}
          <button
            onClick={() => setIsProfileOpen(true)}
            className="flex items-center gap-1.5 text-xs text-cyan-300 hover:text-cyan-200 bg-cyan-950/70 border border-cyan-800/80 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
            title="View Learner Profile & Session Mastery"
          >
            <span>🎓</span>
            <span>Learner Profile</span>
            {learnerProfile.conceptsMastered.length > 0 && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            )}
          </button>

          <div className="hidden sm:flex items-center gap-2 text-xs text-gray-400 bg-gray-900 px-3 py-1 rounded-lg border border-gray-800">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>AST Intelligence Active</span>
          </div>

          <button
            onClick={() => setCurrentView('landing')}
            className="text-xs text-cyan-400 hover:text-cyan-300 font-medium cursor-pointer"
          >
            Explore Features
          </button>
        </div>
      </header>

      {/* ─── Main Workspace ─── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Left Panel — Code Editor */}
        <div className="flex flex-col w-1/2 border-r border-gray-800 overflow-hidden bg-[#090c15]">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-800 bg-[#0b0f1a] shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                <span>Your Code</span>
                {activeRoom && (
                  <span className="text-[10px] text-cyan-400 font-mono font-normal">
                    (Synchronized v{activeRoom.codeVersion})
                  </span>
                )}
              </span>
              {!activeRoom && (
                <div className="hidden md:flex items-center gap-1 ml-2">
                  <span className="text-[10px] text-gray-500">Presets:</span>
                  {SAMPLE_PROGRAMS.map((sp, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleLoadSample(sp)}
                      disabled={analysisLoading}
                      className="text-[10px] px-2 py-0.5 rounded bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-cyan-300 transition-colors cursor-pointer"
                    >
                      {sp.name.split(' ')[0]}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <LanguageSelector
              value={language}
              onChange={handleLanguageChange}
              disabled={analysisLoading || isViewer}
            />
          </div>

          <div className="flex-1 overflow-hidden p-3">
            <CodeEditor
              code={code}
              language={language}
              onChange={handleCodeChange}
              disabled={analysisLoading}
              highlightedLine={highlightedLine}
              peerCursors={peerCursors}
              isViewer={isViewer}
              onCursorChange={handleCursorChange}
            />
          </div>
        </div>

        {/* Right Panel — Interactive Learning Workflow */}
        <div className="flex flex-col w-1/2 overflow-hidden bg-[#07090e]">
          {/* Right Panel Header — Workflow Tabs */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-gray-800 bg-[#0b0f1a] shrink-0 overflow-x-auto">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setActiveTab('analysis')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors ${
                  activeTab === 'analysis'
                    ? 'bg-cyan-600 text-white shadow-sm'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/60'
                }`}
              >
                <span>📑</span>
                <span>Analysis</span>
              </button>

              <button
                onClick={() => setActiveTab('visualize')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors ${
                  activeTab === 'visualize'
                    ? 'bg-cyan-600 text-white shadow-sm'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/60'
                }`}
              >
                <span>🔀</span>
                <span>Visualize</span>
              </button>

              <button
                onClick={() => setActiveTab('trace')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors ${
                  activeTab === 'trace'
                    ? 'bg-cyan-600 text-white shadow-sm'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/60'
                }`}
              >
                <span>⏱️</span>
                <span>Trace</span>
              </button>

              <button
                onClick={() => setActiveTab('chat')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors ${
                  activeTab === 'chat'
                    ? 'bg-cyan-600 text-white shadow-sm'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/60'
                }`}
              >
                <span>💬</span>
                <span>Ask Pilot</span>
                {messages.length > 0 && !activeRoom && (
                  <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-cyan-950 text-cyan-300 font-mono">
                    {messages.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('practice')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors ${
                  activeTab === 'practice'
                    ? 'bg-cyan-600 text-white shadow-sm'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/60'
                }`}
              >
                <span>📝</span>
                <span>Practice</span>
              </button>

              <button
                onClick={() => setActiveTab('interview')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors ${
                  activeTab === 'interview'
                    ? 'bg-cyan-600 text-white shadow-sm'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/60'
                }`}
              >
                <span>🎯</span>
                <span>Interview</span>
              </button>
            </div>

            <div className="text-[11px] text-gray-400 font-mono hidden xl:block">
              Mode: <strong className="text-cyan-400 capitalize">{mode}</strong>
            </div>
          </div>

          {/* Mode Selector Row */}
          <div className="px-4 py-2 border-b border-gray-800/70 bg-[#080c14] shrink-0">
            <ModeSelector
              selected={mode}
              onChange={handleModeChange}
              disabled={analysisLoading || isViewer}
            />
          </div>

          {/* Scrollable Active Tab Content Area */}
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
            {activeTab === 'analysis' && (
              <AnalysisPanel
                analysis={analysis}
                structuredSections={structuredSections}
                codeAnalysis={codeAnalysis}
                isLoading={analysisLoading}
                error={analysisError}
                onSelectLine={handleSelectLine}
                onNavigateTab={(tab) => setActiveTab(tab)}
              />
            )}

            {activeTab === 'visualize' && (
              <div className="flex flex-col gap-6">
                <FlowchartViewer
                  nodes={codeAnalysis?.controlFlow?.nodes || []}
                  edges={codeAnalysis?.controlFlow?.edges || []}
                  activeLine={highlightedLine}
                  onSelectLine={handleSelectLine}
                />
                <DataStructureViewer analysis={codeAnalysis} />
              </div>
            )}

            {activeTab === 'trace' && (
              <ExecutionTracerView
                trace={executionTrace}
                onSelectLine={handleSelectLine}
              />
            )}

            {activeTab === 'chat' && (
              <ChatInterface
                messages={activeRoom ? roomMessages.filter(m => m.type !== 'system').map(m => ({
                  role: m.type === 'ai' ? 'assistant' : 'user',
                  content: m.content,
                  source: m.metadata?.source,
                  tokensSaved: m.metadata?.tokensSaved
                })) : messages}
                isLoading={activeRoom ? isAiThinking : chatLoading}
                error={chatError}
                onSendMessage={handleSendMessage}
                isEnabled={!!analysis || !!activeRoom}
              />
            )}

            {activeTab === 'practice' && (
              <PracticeView
                quiz={practiceQuiz}
                onScoreUpdate={handleScoreUpdate}
              />
            )}

            {activeTab === 'interview' && (
              <InterviewView
                questions={interviewQuestions}
                onAskChat={(prompt) => {
                  setActiveTab('chat');
                  handleSendMessage(prompt);
                }}
              />
            )}
          </div>
        </div>
      </div>

      {/* ─── Bottom Bar — Analyze & Navigation Controls ─── */}
      <div className="flex items-center justify-between px-6 py-2.5 border-t border-gray-800 bg-[#090d16] shrink-0">
        <div className="text-xs text-gray-500 font-mono hidden sm:flex items-center gap-2">
          <span>Workflow:</span>
          <span className="text-cyan-400">Analyze</span> →
          <span className="text-blue-400">Understand</span> →
          <span className="text-indigo-400">Visualize</span> →
          <span className="text-purple-400">Trace</span> →
          <span className="text-emerald-400">Practice</span> →
          <span className="text-amber-400">Interview</span>
        </div>

        <div className="flex items-center gap-4 mx-auto sm:mx-0">
          <button
            onClick={handleAnalyze}
            disabled={analysisLoading || !code.trim() || isViewer}
            className="bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500
                       disabled:from-gray-800 disabled:to-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed
                       text-white font-bold px-8 py-2 rounded-xl cursor-pointer
                       transition-all duration-150 text-sm tracking-wide
                       flex items-center gap-2 shadow-lg shadow-cyan-900/20 active:scale-95"
          >
            {analysisLoading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>🧠 Analyzing code & structure...</span>
              </>
            ) : (
              <>
                <span>⚡</span>
                <span>{activeRoom ? 'Analyze Shared Code' : 'Analyze Code'}</span>
              </>
            )}
          </button>
        </div>

        <div className="text-xs text-gray-400 hidden sm:block">
          {activeRoom ? (
            <div className="flex items-center gap-2">
              <span className="text-cyan-400 font-semibold font-mono">
                Room: {activeRoom.name}
              </span>
              <span className="text-gray-500">·</span>
              <span className="text-emerald-400 font-mono">
                {roomMembers.filter(m => m.isOnline).length} Active
              </span>
            </div>
          ) : isCodeDirty ? (
            <span className="text-amber-400 font-medium flex items-center gap-1.5 animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              <span>Settings or code changed · Click Analyze to refresh</span>
            </span>
          ) : analysis ? (
            <div className="flex items-center gap-2">
              <span className="text-cyan-400 font-semibold font-mono">
                {codeAnalysis?.complexity?.time || 'O(n)'}
              </span>
              <span className="text-gray-500">·</span>
              <span>
                <span className="text-gray-300 capitalize">{analyzedContext?.mode}</span> mode
              </span>
            </div>
          ) : (
            <span className="text-gray-600">Ready to analyze</span>
          )}
        </div>
      </div>

      {/* ─── Room Creation / Join Modal ─── */}
      <RoomModal
        isOpen={isRoomModalOpen}
        onClose={() => setIsRoomModalOpen(false)}
        onCreateRoom={handleCreateRoom}
        onJoinRoom={handleJoinRoom}
        currentLanguage={language}
        currentMode={mode}
      />

      {/* ─── Active Collaborators & Room Chat Drawer ─── */}
      {activeRoom && (
        <CollaboratorsDrawer
          isOpen={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
          room={activeRoom}
          currentClientId={clientIdRef.current}
          currentUserRole={currentMember?.role || 'editor'}
          members={roomMembers}
          messages={roomMessages}
          isConnected={isConnected}
          isAiThinking={isAiThinking}
          onSendMessage={(content, askPilot) => {
            realtimeService.sendChatMessage(activeRoom.id, content, askPilot);
          }}
          onChangeRole={handleChangeRole}
          onLeaveRoom={handleLeaveRoom}
          onExportSession={handleExportSession}
        />
      )}

      {/* ─── Learner Profile Modal ─── */}
      <LearnerProfileView
        profile={learnerProfile}
        currentMode={mode}
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
      />
    </div>
  );
}
