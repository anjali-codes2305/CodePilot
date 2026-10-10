// Central type definitions for CodePilot frontend

export type LearningMode = 'beginner' | 'mentor' | 'professional' | 'interview';

export interface ModeConfig {
  id: LearningMode;
  label: string;
  icon: string;
  description: string;
}

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  source?: 'codepilot' | 'gemini';
  deterministic?: boolean;
  tokensSaved?: number;
}

export interface ComplexityInfo {
  time: string;
  space: string;
  confidence: 'certain' | 'estimated' | 'unknown';
  reasoning: string;
}

export interface ControlFlowNode {
  id: string;
  type: 'start' | 'loop' | 'condition' | 'operation' | 'return' | 'end';
  label: string;
  line: number;
  detail?: string;
}

export interface ControlFlowEdge {
  from: string;
  to: string;
  label: string;
}

export interface NormalizedCodeAnalysis {
  language: string;
  loc: number;
  functions: Array<{
    name: string;
    params: string[];
    line: number;
    returnType?: string;
  }>;
  variables: Array<{
    name: string;
    line: number;
    kind?: string;
  }>;
  loops: Array<{
    type: string;
    line: number;
    depth: number;
    condition?: string;
  }>;
  maxLoopNesting: number;
  conditionals: Array<{
    type: string;
    line: number;
    condition?: string;
  }>;
  recursion: {
    detected: boolean;
    recursiveFunctions: string[];
  };
  dataStructures: Array<{
    name: string;
    type: string;
    line: number;
  }>;
  operations: Array<{
    type: string;
    line: number;
    description: string;
  }>;
  complexity: ComplexityInfo;
  controlFlow: {
    nodes: ControlFlowNode[];
    edges: ControlFlowEdge[];
  };
  supportedAnalysis: string[];
  unsupportedAnalysis: string[];
}

export interface ExecutionStep {
  step: number;
  line: number;
  description: string;
  variables: Record<string, any>;
  dataStructures?: Record<string, any>;
  output?: string;
  isReturn?: boolean;
}

export interface ExecutionTrace {
  supported: boolean;
  algorithm?: string;
  totalSteps?: number;
  steps?: ExecutionStep[];
  reason?: string;
}

export interface PracticeQuizItem {
  id: string;
  type: 'multiple_choice' | 'conceptual';
  prompt: string;
  options?: string[];
  answer?: string;
  explanation?: string;
  expectedConcept?: string;
  hint?: string;
}

export interface InterviewQuestion {
  id: string;
  round: string;
  question: string;
  evaluationCriteria: string[];
}

export interface AnalyzeRequest {
  code: string;
  language: string;
  mode: LearningMode;
}

export interface ChatRequest {
  code: string;
  language: string;
  mode: LearningMode;
  messages: Message[];
  question: string;
  codeAnalysis?: NormalizedCodeAnalysis | null;
}

export interface StructuredSections {
  overview: string;
  howItWorks: string[];
  concepts: string[];
  complexity: ComplexityInfo;
  importantLines: Array<{ line: number | null; text: string }>;
  edgeCases: string[];
  commonMistakes: string[];
  suggestedQuestions: string[];
}

export interface LearnerProfile {
  conceptsEncountered: string[];
  conceptsMastered: string[];
  confusionPoints: string[];
  questionsAskedCount: number;
  practiceScore: { correct: number; total: number };
}

export interface AnalyzeResponse {
  analysis: string;
  structuredSections?: StructuredSections;
  codeAnalysis?: NormalizedCodeAnalysis;
  executionTrace?: ExecutionTrace;
  practiceQuiz?: PracticeQuizItem[];
  interviewQuestions?: InterviewQuestion[];
  cached?: boolean;
}

export interface ChatResponse {
  response: string;
  source?: 'codepilot' | 'gemini';
  deterministic?: boolean;
  tokensSaved?: number;
}

export interface ApiError {
  error: string;
}

export const SUPPORTED_LANGUAGES = [
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'python', label: 'Python' },
  { value: 'java', label: 'Java' },
  { value: 'c', label: 'C' },
  { value: 'cpp', label: 'C++' },
  { value: 'csharp', label: 'C#' },
  { value: 'go', label: 'Go' },
  { value: 'rust', label: 'Rust' },
  { value: 'kotlin', label: 'Kotlin' },
  { value: 'swift', label: 'Swift' },
  { value: 'php', label: 'PHP' },
  { value: 'ruby', label: 'Ruby' },
] as const;

export const LEARNING_MODES: ModeConfig[] = [
  {
    id: 'beginner',
    label: 'Beginner',
    icon: '🌱',
    description: 'Simple language, analogies, step-by-step'
  },
  {
    id: 'mentor',
    label: 'Mentor',
    icon: '🧑‍🏫',
    description: 'Guided learning, reasoning, interactive'
  },
  {
    id: 'professional',
    label: 'Professional',
    icon: '💼',
    description: 'Code review, complexity, best practices'
  },
  {
    id: 'interview',
    label: 'Interview',
    icon: '🎯',
    description: 'Technical interview prep based on your code'
  }
];

// --- Collaborative Rooms Types ---

export type RoomRole = 'host' | 'editor' | 'viewer';

export interface RoomMember {
  clientId: string;
  userName: string;
  role: RoomRole;
  avatarColor: string;
  joinedAt?: number;
  lastActiveAt?: number;
  isOnline: boolean;
}

export interface RoomState {
  id: string;
  name: string;
  code: string;
  language: string;
  mode: LearningMode;
  hostId: string;
  hostName: string;
  isPrivate: boolean;
  hasPasscode: boolean;
  codeVersion: number;
  latestAnalysis?: AnalyzeResponse | null;
  settings?: Record<string, any>;
  createdAt: number;
  updatedAt: number;
}

export interface RoomMessage {
  id: string;
  roomId: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  content: string;
  type: 'chat' | 'system' | 'ai' | 'ai-query';
  metadata?: any;
  createdAt: number;
}

export interface PeerCursor {
  clientId: string;
  userName: string;
  color: string;
  position: { lineNumber: number; column: number };
  selection?: {
    startLineNumber: number;
    startColumn: number;
    endLineNumber: number;
    endColumn: number;
  };
}

export interface CreateRoomPayload {
  name: string;
  code?: string;
  language: string;
  mode: LearningMode;
  hostName: string;
  isPrivate?: boolean;
  passcode?: string;
}

export interface JoinRoomPayload {
  userName: string;
  passcode?: string;
  clientId?: string;
}

export interface PublicRoomItem {
  id: string;
  name: string;
  language: string;
  mode: LearningMode;
  hostName: string;
  totalMembers: number;
  onlineMembers: number;
  createdAt: number;
  updatedAt: number;
}

