import { useState } from 'react';
import type { LearningMode } from '../types';

interface LandingPageProps {
  onLaunchStudio: (presetCode?: string, presetLang?: string, presetMode?: LearningMode) => void;
}

const PRESET_SNIPPETS = [
  {
    title: 'Java: Find Duplicate (HashSet)',
    lang: 'java',
    mode: 'mentor' as LearningMode,
    badge: 'Popular',
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
    title: 'Python: Two Sum (Hash Map)',
    lang: 'python',
    mode: 'beginner' as LearningMode,
    badge: 'Beginner Friendly',
    code: `def two_sum(nums, target):
    seen = {}
    for i, num in enumerate(nums):
        complement = target - num
        if complement in seen:
            return [seen[complement], i]
        seen[num] = i
    return []`
  },
  {
    title: 'TypeScript: LRU Cache (Clean Class)',
    lang: 'typescript',
    mode: 'professional' as LearningMode,
    badge: 'Senior Review',
    code: `class LRUCache {
  private capacity: number;
  private cache: Map<number, number>;

  constructor(capacity: number) {
    this.capacity = capacity;
    this.cache = new Map();
  }

  get(key: number): number {
    if (!this.cache.has(key)) return -1;
    const val = this.cache.get(key)!;
    this.cache.delete(key);
    this.cache.set(key, val);
    return val;
  }
}`
  },
  {
    title: 'C++: Reverse Linked List (Interview)',
    lang: 'cpp',
    mode: 'interview' as LearningMode,
    badge: 'Interview Prep',
    code: `ListNode* reverseList(ListNode* head) {
    ListNode* prev = nullptr;
    ListNode* curr = head;
    while (curr != nullptr) {
        ListNode* nextTemp = curr->next;
        curr->next = prev;
        prev = curr;
        curr = nextTemp;
    }
    return prev;
}`
  }
];

const PREVIEW_TABS: { id: LearningMode; label: string; icon: string; previewText: string }[] = [
  {
    id: 'beginner',
    label: 'Beginner 🌱',
    icon: '🌱',
    previewText: `Think of a HashSet like a VIP guest checklist at a party entrance. 
Every time a number arrives, you check if their name is already on your list. 
If it is, you've found your duplicate right away! If not, you write their name down.`
  },
  {
    id: 'mentor',
    label: 'Mentor 🧑‍🏫',
    icon: '🧑‍🏫',
    previewText: `Notice why we chose HashSet here instead of an array.
Before I break down the complexity, consider this:
What would happen if we checked each number using a linear scan through a regular ArrayList? How would that scale with 100,000 items?`
  },
  {
    id: 'professional',
    label: 'Professional 💼',
    icon: '💼',
    previewText: `Time Complexity: O(n) average | Space Complexity: O(n) worst case.
Code Quality Audit:
• Sentinel value -1 returned on no duplicate found — consider OptionalInt.
• Missing null or empty array guard before iteration.
• HashSet initial capacity default causes rehashing if nums is large.`
  },
  {
    id: 'interview',
    label: 'Interview 🎯',
    icon: '🎯',
    previewText: `Technical Question 1:
"You've traded O(n) auxiliary memory for an O(n) runtime. 
Can you solve this duplicate problem in O(1) space if you are permitted to modify the array in place? 
What if you are NOT permitted to modify the array?"`
  }
];

export default function LandingPage({ onLaunchStudio }: LandingPageProps) {
  const [activePreviewTab, setActivePreviewTab] = useState<LearningMode>('mentor');

  return (
    <div className="min-h-screen bg-[#07090e] text-gray-100 flex flex-col selection:bg-cyan-500/30 selection:text-cyan-200">
      
      {/* ─── Glowing Ambient Accents ─── */}
      <div className="fixed top-0 left-1/4 w-96 h-96 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="fixed top-1/3 right-1/4 w-[30rem] h-[30rem] bg-indigo-600/10 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* ─── Header Navigation ─── */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-[#07090e]/80 border-b border-gray-800/80 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 p-0.5 shadow-lg shadow-cyan-500/20">
              <div className="w-full h-full bg-[#090d16] rounded-[10px] flex items-center justify-center">
                <span className="text-xl">✈️</span>
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-xl tracking-tight text-white">CodePilot</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                  AI Studio
                </span>
              </div>
              <p className="text-[11px] text-gray-400 font-mono hidden sm:block">Interactive Programming Tutor</p>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-gray-300">
            <a href="#features" className="hover:text-cyan-400 transition-colors">Features</a>
            <a href="#modes" className="hover:text-cyan-400 transition-colors">Learning Modes</a>
            <a href="#interactive-demo" className="hover:text-cyan-400 transition-colors">Live Preview</a>
            <a href="#presets" className="hover:text-cyan-400 transition-colors">Snippets</a>
          </nav>

          <div className="flex items-center gap-3">
            <button
              onClick={() => onLaunchStudio()}
              className="relative group overflow-hidden rounded-xl p-px font-semibold text-sm transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
            >
              <span className="absolute inset-0 bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-600 transition-all duration-300 group-hover:opacity-100 opacity-80" />
              <span className="relative flex items-center gap-2 px-5 py-2.5 rounded-[11px] bg-[#090d16] text-white transition-colors group-hover:bg-opacity-80">
                <span>Launch Studio</span>
                <span className="text-cyan-400 group-hover:translate-x-0.5 transition-transform">→</span>
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* ─── Hero Section ─── */}
      <section className="relative pt-20 pb-16 px-6 overflow-hidden">
        <div className="max-w-5xl mx-auto text-center flex flex-col items-center">
          
          {/* Eyebrow Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-950/60 border border-cyan-800/60 text-cyan-300 text-xs font-medium mb-8 shadow-inner shadow-cyan-500/10 animate-fade-in">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <span>Next-Gen Interactive AI Programming Tutor</span>
            <span className="text-gray-500">·</span>
            <span className="text-gray-300 font-mono">13+ Languages</span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-white max-w-4xl leading-[1.1] mb-6">
            Understand your code. <br />
            <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400 bg-clip-text text-transparent">
              Ask anything. Learn your way.
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-lg sm:text-xl text-gray-300 max-w-2xl font-normal leading-relaxed mb-10">
            Paste your code, select your ideal learning mode, and get instant structured reasoning. 
            Then dive into an <strong className="text-white font-semibold">open-ended Socratic chat</strong> with an AI tutor that knows your exact implementation.
          </p>

          {/* Primary Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto justify-center mb-16">
            <button
              onClick={() => onLaunchStudio()}
              className="w-full sm:w-auto px-8 py-4 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 text-white font-bold text-base shadow-xl shadow-cyan-500/25 hover:shadow-cyan-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 cursor-pointer"
            >
              <span>🚀 Open CodePilot Studio</span>
              <span className="text-cyan-200">→</span>
            </button>
            <button
              onClick={() => {
                const p = PRESET_SNIPPETS[0];
                onLaunchStudio(p.code, p.lang, p.mode);
              }}
              className="w-full sm:w-auto px-7 py-4 rounded-xl bg-gray-900/80 hover:bg-gray-800 border border-gray-700/80 text-gray-200 font-semibold text-base hover:border-gray-500 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>⚡ Try Test Code (Java Duplicate)</span>
            </button>
          </div>

          {/* Social Proof / Capability Pills */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full max-w-3xl border-t border-gray-800/80 pt-8 text-left">
            <div className="bg-gray-900/40 border border-gray-800 rounded-xl p-3.5">
              <div className="text-xl mb-1">🌱 🧑‍🏫 💼 🎯</div>
              <div className="text-xs font-bold text-gray-200">4 Learning Modes</div>
              <div className="text-[11px] text-gray-500">From ELI5 to Senior Review</div>
            </div>
            <div className="bg-gray-900/40 border border-gray-800 rounded-xl p-3.5">
              <div className="text-xl mb-1">💬 🧠</div>
              <div className="text-xs font-bold text-gray-200">Context-Aware Chat</div>
              <div className="text-[11px] text-gray-500">No rigid canned buttons</div>
            </div>
            <div className="bg-gray-900/40 border border-gray-800 rounded-xl p-3.5">
              <div className="text-xl mb-1">⚡ 💻</div>
              <div className="text-xs font-bold text-gray-200">Monaco IDE</div>
              <div className="text-[11px] text-gray-500">VS Code editing experience</div>
            </div>
            <div className="bg-gray-900/40 border border-gray-800 rounded-xl p-3.5">
              <div className="text-xl mb-1">🛡️ 🔒</div>
              <div className="text-xs font-bold text-gray-200">100% Safe Analysis</div>
              <div className="text-[11px] text-gray-500">Never runs untrusted code</div>
            </div>
          </div>

        </div>
      </section>

      {/* ─── Interactive Live Preview / Hero Mockup ─── */}
      <section id="interactive-demo" className="py-16 px-6 bg-[#0a0d16]/70 border-y border-gray-800/80">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white mb-3">
              One Codebase. Four Ways to Understand.
            </h2>
            <p className="text-gray-400 max-w-xl mx-auto text-sm sm:text-base">
              Click the modes below to see how CodePilot dynamically transforms its teaching methodology for the exact same snippet.
            </p>
          </div>

          {/* Interactive Window Mockup */}
          <div className="rounded-2xl border border-gray-700/80 bg-[#0c101b] shadow-2xl overflow-hidden">
            {/* Window Title Bar */}
            <div className="flex items-center justify-between px-4 py-3 bg-[#080b13] border-b border-gray-800">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-500/80 inline-block" />
                <span className="w-3 h-3 rounded-full bg-yellow-500/80 inline-block" />
                <span className="w-3 h-3 rounded-full bg-green-500/80 inline-block" />
                <span className="text-xs text-gray-400 font-mono ml-2">CodePilot Studio — findDuplicate.java</span>
              </div>
              <span className="text-xs font-mono text-cyan-400 bg-cyan-950/60 border border-cyan-800 px-2.5 py-0.5 rounded-full">
                Interactive Preview
              </span>
            </div>

            {/* Split Screen Mockup */}
            <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[420px]">
              
              {/* Left Side: Code snippet */}
              <div className="lg:col-span-6 p-6 font-mono text-xs sm:text-sm bg-[#080b14] border-b lg:border-b-0 lg:border-r border-gray-800 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-3 pb-2 border-b border-gray-800">
                    <span>Java 17 · Standard Algorithm</span>
                    <span>13 lines</span>
                  </div>
                  <pre className="text-gray-300 leading-relaxed overflow-x-auto">
                    <code>
<span className="text-blue-400">public static int</span> <span className="text-yellow-300">findDuplicate</span>(<span className="text-blue-400">int</span>[] nums) &#123;{'\n'}
{'    '}<span className="text-cyan-300">HashSet</span>&lt;<span className="text-cyan-300">Integer</span>&gt; set = <span className="text-purple-400">new</span> <span className="text-cyan-300">HashSet</span>&lt;&gt;();{'\n\n'}
{'    '}<span className="text-purple-400">for</span> (<span className="text-blue-400">int</span> num : nums) &#123;{'\n'}
{'        '}<span className="text-purple-400">if</span> (set.<span className="text-yellow-300">contains</span>(num)) &#123;{'\n'}
{'            '}<span className="text-purple-400">return</span> num; <span className="text-gray-500">// Duplicate detected!</span>{'\n'}
{'        '}&#125;{'\n'}
{'        '}set.<span className="text-yellow-300">add</span>(num);{'\n'}
{'    '}&#125;{'\n\n'}
{'    '}<span className="text-purple-400">return</span> -1; <span className="text-gray-500">// No duplicate</span>{'\n'}
&#125;
                    </code>
                  </pre>
                </div>

                <div className="mt-4 pt-3 border-t border-gray-800 flex items-center justify-between">
                  <span className="text-xs text-gray-400">Click to run this in Studio:</span>
                  <button
                    onClick={() => {
                      const p = PRESET_SNIPPETS[0];
                      onLaunchStudio(p.code, p.lang, activePreviewTab);
                    }}
                    className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
                  >
                    Load in Studio →
                  </button>
                </div>
              </div>

              {/* Right Side: Adaptive AI Tutor Response */}
              <div className="lg:col-span-6 p-6 flex flex-col justify-between bg-[#0b0f1a]">
                <div>
                  {/* Mode Selector Tabs */}
                  <div className="flex items-center gap-1.5 p-1 bg-gray-900/90 rounded-xl border border-gray-800 mb-5">
                    {PREVIEW_TABS.map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setActivePreviewTab(tab.id)}
                        className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                          activePreviewTab === tab.id
                            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                            : 'text-gray-400 hover:text-gray-200'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {/* Mode Commentary Display */}
                  <div className="p-4 rounded-xl bg-gray-900/60 border border-gray-800/80 mb-4 min-h-[160px]">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-base">🧑‍🏫</span>
                      <span className="text-xs font-bold text-gray-300 uppercase tracking-wide">
                        CodePilot {activePreviewTab.toUpperCase()} EXPLANATION
                      </span>
                    </div>
                    <p className="text-sm text-gray-200 leading-relaxed font-sans whitespace-pre-line">
                      {PREVIEW_TABS.find((t) => t.id === activePreviewTab)?.previewText}
                    </p>
                  </div>

                  {/* Follow-up chat teaser */}
                  <div className="p-3.5 rounded-xl bg-blue-950/20 border border-blue-900/40 flex items-start gap-2.5">
                    <span className="text-blue-400 text-sm mt-0.5">💬</span>
                    <div>
                      <p className="text-xs text-blue-200 font-medium">Follow-Up Question Example:</p>
                      <p className="text-xs text-gray-300 italic mt-0.5">
                        "What happens if I use an ArrayList instead of HashSet?"
                      </p>
                      <p className="text-[11px] text-cyan-300/90 mt-1">
                        ↳ CodePilot adapts dynamically to compare O(1) vs O(n) lookups without canned responses!
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-5">
                  <button
                    onClick={() => onLaunchStudio(PRESET_SNIPPETS[0].code, 'java', activePreviewTab)}
                    className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 font-semibold text-xs text-white transition-colors cursor-pointer flex items-center justify-center gap-2"
                  >
                    <span>Analyze This In {activePreviewTab.toUpperCase()} Mode Now</span>
                    <span>→</span>
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* ─── 4 Learning Modes Section ─── */}
      <section id="modes" className="py-20 px-6 max-w-7xl mx-auto">
        <div className="text-center mb-14">
          <div className="inline-block text-xs font-bold uppercase tracking-wider text-cyan-400 bg-cyan-950/50 border border-cyan-800 px-3 py-1 rounded-full mb-3">
            Adaptive Pedagogy
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white mb-4">
            Four Personalized Learning Modes
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto text-base">
            Every developer learns differently at different stages of their career. CodePilot shapes its vocabulary, tone, and guidance around your current goal.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {/* Beginner Mode */}
          <div className="rounded-2xl p-6 bg-gradient-to-b from-gray-900/80 to-[#0c101a] border border-gray-800 hover:border-emerald-500/50 transition-all duration-300 flex flex-col justify-between group">
            <div>
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">
                🌱
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Beginner Mode</h3>
              <p className="text-xs text-emerald-400 font-semibold mb-3">Simple Vocabulary & Everyday Analogies</p>
              <p className="text-sm text-gray-400 leading-relaxed mb-4">
                Breaks down technical barriers. No intimidating jargon. Uses analogies (like dictionaries and checklists) to guide you through code step-by-step.
              </p>
              <ul className="text-xs text-gray-400 space-y-1.5 font-mono mb-6">
                <li>✓ Patient & encouraging</li>
                <li>✓ Explains unfamiliar syntax</li>
                <li>✓ Trace examples with small inputs</li>
              </ul>
            </div>
            <button
              onClick={() => onLaunchStudio(undefined, undefined, 'beginner')}
              className="w-full py-2 px-3 rounded-lg bg-gray-800 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-semibold transition-colors cursor-pointer"
            >
              Start in Beginner →
            </button>
          </div>

          {/* Mentor Mode */}
          <div className="rounded-2xl p-6 bg-gradient-to-b from-gray-900/80 to-[#0c101a] border border-blue-500/40 shadow-lg shadow-blue-500/5 hover:border-blue-500 transition-all duration-300 flex flex-col justify-between group relative">
            <div className="absolute -top-3 right-5 px-2.5 py-0.5 rounded-full bg-blue-600 text-white font-bold text-[10px] uppercase tracking-wide">
              Default
            </div>
            <div>
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">
                🧑‍🏫
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Mentor Mode</h3>
              <p className="text-xs text-blue-400 font-semibold mb-3">Guiding Questions & Reasoning</p>
              <p className="text-sm text-gray-400 leading-relaxed mb-4">
                Acts like an experienced tech lead sitting beside you. Doesn’t just give answers away — challenges you with Socratic questions to build intuition.
              </p>
              <ul className="text-xs text-gray-400 space-y-1.5 font-mono mb-6">
                <li>✓ Explains WHY decisions were made</li>
                <li>✓ Adapts when you feel confused</li>
                <li>✓ Fosters critical problem solving</li>
              </ul>
            </div>
            <button
              onClick={() => onLaunchStudio(undefined, undefined, 'mentor')}
              className="w-full py-2 px-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              Start in Mentor →
            </button>
          </div>

          {/* Professional Mode */}
          <div className="rounded-2xl p-6 bg-gradient-to-b from-gray-900/80 to-[#0c101a] border border-gray-800 hover:border-purple-500/50 transition-all duration-300 flex flex-col justify-between group">
            <div>
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">
                💼
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Professional Mode</h3>
              <p className="text-xs text-purple-400 font-semibold mb-3">Senior Engineering Code Review</p>
              <p className="text-sm text-gray-400 leading-relaxed mb-4">
                Concise and technically rigorous. Zero fluff. Evaluates asymptotic complexity, memory allocations, edge case vulnerabilities, and design patterns.
              </p>
              <ul className="text-xs text-gray-400 space-y-1.5 font-mono mb-6">
                <li>✓ Big-O Time & Space breakdown</li>
                <li>✓ Identifies hidden edge cases</li>
                <li>✓ Best practices & maintainability</li>
              </ul>
            </div>
            <button
              onClick={() => onLaunchStudio(undefined, undefined, 'professional')}
              className="w-full py-2 px-3 rounded-lg bg-gray-800 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 text-xs font-semibold transition-colors cursor-pointer"
            >
              Start in Pro →
            </button>
          </div>

          {/* Interview Mode */}
          <div className="rounded-2xl p-6 bg-gradient-to-b from-gray-900/80 to-[#0c101a] border border-gray-800 hover:border-amber-500/50 transition-all duration-300 flex flex-col justify-between group">
            <div>
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">
                🎯
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Interview Prep</h3>
              <p className="text-xs text-amber-400 font-semibold mb-3">Interactive Technical Drill</p>
              <p className="text-sm text-gray-400 leading-relaxed mb-4">
                Conducts a real technical interview based on YOUR code. Probes your algorithmic choices, follows up on tradeoffs, and evaluates your responses live.
              </p>
              <ul className="text-xs text-gray-400 space-y-1.5 font-mono mb-6">
                <li>✓ Code-derived interview questions</li>
                <li>✓ Progresses from basics to edge cases</li>
                <li>✓ Immediate constructive feedback</li>
              </ul>
            </div>
            <button
              onClick={() => onLaunchStudio(undefined, undefined, 'interview')}
              className="w-full py-2 px-3 rounded-lg bg-gray-800 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 text-xs font-semibold transition-colors cursor-pointer"
            >
              Start in Interview →
            </button>
          </div>

        </div>
      </section>

      {/* ─── Ready-to-Test Presets Section ─── */}
      <section id="presets" className="py-16 px-6 bg-[#0a0d16]/70 border-t border-gray-800/80">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-10">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">Jump Right In</span>
              <h2 className="text-3xl font-extrabold text-white mt-1">One-Click Starter Snippets</h2>
              <p className="text-gray-400 text-sm mt-1">Try CodePilot instantly with popular algorithms across multiple languages.</p>
            </div>
            <button
              onClick={() => onLaunchStudio()}
              className="mt-4 md:mt-0 text-sm font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
            >
              Paste custom code instead →
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {PRESET_SNIPPETS.map((snippet, idx) => (
              <div
                key={idx}
                onClick={() => onLaunchStudio(snippet.code, snippet.lang, snippet.mode)}
                className="p-5 rounded-xl bg-gray-900/50 border border-gray-800 hover:border-cyan-500/50 hover:bg-gray-800/60 transition-all cursor-pointer group flex flex-col justify-between"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-gray-200 group-hover:text-cyan-300 transition-colors">
                      {snippet.title}
                    </span>
                    <span className="text-[10px] font-mono uppercase bg-gray-800 px-2 py-0.5 rounded text-gray-400">
                      {snippet.lang}
                    </span>
                  </div>
                  <span className="text-[11px] font-medium text-cyan-400 bg-cyan-950/50 border border-cyan-800/50 px-2 py-0.5 rounded-full">
                    {snippet.badge}
                  </span>
                </div>
                <pre className="font-mono text-xs text-gray-400 bg-[#070a12] p-3 rounded-lg overflow-hidden max-h-24 opacity-80 group-hover:opacity-100 transition-opacity">
                  <code>{snippet.code.slice(0, 160)}...</code>
                </pre>
                <div className="mt-3 flex items-center justify-between text-xs text-gray-500 group-hover:text-cyan-400 transition-colors">
                  <span>Preset Mode: <strong className="text-gray-400 capitalize">{snippet.mode}</strong></span>
                  <span className="font-semibold">Launch in Studio →</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Superpowers & Core Features ─── */}
      <section id="features" className="py-20 px-6 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <span className="text-xs font-bold uppercase tracking-wider text-cyan-400 bg-cyan-950/50 border border-cyan-800 px-3 py-1 rounded-full">
            Under the Hood
          </span>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white mt-4 mb-4">
            Built for Real Developer Problem Solving
          </h2>
          <p className="text-gray-400 max-w-xl mx-auto text-sm sm:text-base">
            Not just another static summarizer. CodePilot acts as an active intellectual copilot tailored to your code.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-6 rounded-2xl bg-gray-900/40 border border-gray-800/80">
            <div className="text-3xl mb-3">🧠</div>
            <h3 className="text-lg font-bold text-white mb-2">Continuous Code Context</h3>
            <p className="text-sm text-gray-400 leading-relaxed">
              Every follow-up question keeps your original code pinned in context. You can refer to "line 6" or "that loop" and CodePilot knows exactly what you mean.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-gray-900/40 border border-gray-800/80">
            <div className="text-3xl mb-3">🔄</div>
            <h3 className="text-lg font-bold text-white mb-2">Adaptive Socratic Learning</h3>
            <p className="text-sm text-gray-400 leading-relaxed">
              When you say "I still don't understand", CodePilot pivots — switching analogies, tracing concrete test cases, and breaking things down until it clicks.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-gray-900/40 border border-gray-800/80">
            <div className="text-3xl mb-3">🛡️</div>
            <h3 className="text-lg font-bold text-white mb-2">Zero-Execution Safety</h3>
            <p className="text-sm text-gray-400 leading-relaxed">
              CodePilot analyzes through deep static understanding and cognitive reasoning. Untrusted user code is never blindly executed on the server.
            </p>
          </div>
        </div>
      </section>

      {/* ─── Bottom CTA Banner ─── */}
      <section className="py-16 px-6">
        <div className="max-w-5xl mx-auto rounded-3xl bg-gradient-to-r from-blue-900/40 via-indigo-900/40 to-cyan-900/40 border border-cyan-500/30 p-8 sm:p-14 text-center relative overflow-hidden shadow-2xl">
          <div className="relative z-10">
            <span className="text-3xl mb-2 inline-block">🚀</span>
            <h2 className="text-3xl sm:text-5xl font-extrabold text-white mb-4">
              Ready to understand your code?
            </h2>
            <p className="text-gray-300 max-w-xl mx-auto text-sm sm:text-base mb-8">
              Open CodePilot Studio now. Paste your code, pick your mode, and ask anything you want.
            </p>
            <button
              onClick={() => onLaunchStudio()}
              className="px-9 py-4 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-600 text-white font-extrabold text-base shadow-lg shadow-cyan-500/30 hover:scale-105 active:scale-95 transition-all cursor-pointer"
            >
              Launch CodePilot Studio Free →
            </button>
          </div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="mt-auto border-t border-gray-800/80 bg-[#05070c] px-6 py-8 text-xs text-gray-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-base">✈️</span>
            <span className="font-bold text-gray-300">CodePilot</span>
            <span>— Understand your code. Ask anything. Learn your way.</span>
          </div>
          <div className="flex items-center gap-6">
            <button
              onClick={() => onLaunchStudio()}
              className="text-cyan-400 hover:underline cursor-pointer"
            >
              Studio
            </button>
            <span>·</span>
            <span>13+ Languages</span>
            <span>·</span>
            <span>4 Learning Modes</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
