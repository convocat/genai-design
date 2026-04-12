import { useState, useRef, useEffect } from "react";

// ============================================================
// CONSTANTS & CONFIG
// ============================================================
const BLUE = "#2E5090";
const LIGHT_BLUE = "#D5E8F0";
const DARK = "#333333";
const MED = "#666666";
const LIGHT = "#F5F5F5";
const GREEN = "#2E7D32";
const ORANGE = "#E65100";
const RED = "#B83232";

const DEFAULT_SECTIONS = [
  { key: "role", label: "Role & Task", icon: "🎭" },
  { key: "context", label: "Context", icon: "🌍" },
  { key: "instructions", label: "Instructions", icon: "📋" },
  { key: "tone", label: "Tone of Voice", icon: "🎵" },
  { key: "output", label: "Output Format", icon: "📄" },
];

const SECTION_PLACEHOLDERS = {
  role: "Who is the bot and what does it do?\n\nExample: You are a customer service chatbot for an insurance company. Your task is to advise people about their coverage options.",
  context: "What is the setting? Who is the audience?\n\nExample: This chatbot is used in a classroom setting. School pupils aged 7-12 interact with you as part of a lesson.",
  instructions: "Step-by-step behavior. Use verbal markers (First, Next, Then).\n\nExample: First, greet the user. Next, ask how old they are. Then, find out what they know about the topic.",
  tone: "How should it sound?\n\nExample: Friendly, encouraging, concise. Use simple language appropriate for the user's age.",
  output: "What should the output look like?\n\nExample: One question at a time. Keep responses short (2-3 sentences). Use markdown headings.",
};

const SECTION_TIPS = {
  role: {
    title: "Writing a good Role & Task",
    dos: ["Be specific about who the bot is", "State the primary task clearly", "Include domain boundaries (what it should NOT do)"],
    donts: ["Don't be vague ('You are a helpful assistant')", "Don't list multiple unrelated roles", "Don't forget to mention the task"],
    example: "You are a nutrition advisor for a fitness app. Your task is to help users plan balanced meals based on their dietary restrictions and fitness goals. You do not provide medical advice.",
  },
  context: {
    title: "Setting the right Context",
    dos: ["Describe the platform or channel", "Specify the target audience", "Mention relevant constraints (time, access, knowledge level)"],
    donts: ["Don't assume the model knows your platform", "Don't skip audience description", "Don't include instructions here (those go in Instructions)"],
    example: "This chatbot is embedded in a mobile banking app. Users are existing customers aged 18-70. They may be stressed about financial issues. The bot cannot access account balances directly.",
  },
  instructions: {
    title: "Writing clear Instructions",
    dos: ["Use verbal sequence markers: First, Next, Then, Finally", "Be explicit about conversation flow", "Include edge cases (what if the user goes off-topic?)"],
    donts: ["Don't write a wall of text without structure", "Don't leave ambiguous decision points", "Don't forget error handling (rude users, unclear input)"],
    example: "First, greet the user and ask what brings them here today. Next, ask clarifying questions to understand their situation. Then, provide 2-3 relevant options. If the user asks something outside your scope, explain your limitations and suggest where they can get help.",
  },
  tone: {
    title: "Defining Tone of Voice",
    dos: ["Use 3-5 adjectives (friendly, professional, concise)", "Mention specific language choices", "Consider the audience's emotional state"],
    donts: ["Don't just say 'be nice'", "Don't contradict yourself (formal yet casual)", "Don't forget multilingual considerations if relevant"],
    example: "Warm, patient, and professional. Use simple language (B1 level). Avoid jargon. Address the user with 'you'. If the user seems frustrated, acknowledge their feelings before providing information.",
  },
  output: {
    title: "Specifying Output Format",
    dos: ["Define message length (short, medium, long)", "Specify structure (bullets, paragraphs, one question at a time)", "Mention formatting preferences (markdown, plain text)"],
    donts: ["Don't leave format open-ended", "Don't request conflicting formats", "Don't forget to limit response length"],
    example: "Respond in short paragraphs (2-3 sentences each). Ask one question at a time. Use bold for key terms. Never use bullet lists. Keep total response under 100 words.",
  },
};

const TEMPLATES = {
  blank: { name: "Blank", sections: { role: "", context: "", instructions: "", tone: "", output: "" }, customSections: [] },
  sdg: {
    name: "SDG Explorer",
    sections: {
      role: "You are a fun educational companion that helps school pupils explore the United Nations Sustainable Development Goals (SDGs). Your task is to make the SDGs accessible and engaging for young learners.",
      context: "This chatbot is used in a classroom or workshop setting. School pupils aged 7-12 interact with you as part of a lesson on global citizenship. The teacher may be present, but the child interacts independently.",
      instructions: "First, greet the user and introduce yourself in a fun way. Next, ask how old they are so you can adjust your language. Then, find out what they already know about the SDGs. Based on their knowledge, suggest 3 SDGs that might interest them. Take about 5 turns per goal to explore it together. End by suggesting one concrete action they can take in their community.",
      tone: "Friendly, encouraging, relatable, concise. Use simple language appropriate for the user's stated age. Be enthusiastic without being condescending. If the user switches to another language, respond in that language.",
      output: "One question at a time. Keep responses short (2-3 sentences max). Use dynamic and responsive language. Suggest next steps rather than giving long explanations.",
    },
    customSections: [],
  },
  insurance: {
    name: "Insurance Bot",
    sections: {
      role: "You are a customer service chatbot for HealthFirst Insurance. Your task is to help customers with questions about their insurance coverage, claims, and account management.",
      context: "You operate on the HealthFirst website. Customers range from young professionals to retirees. Many are frustrated or confused when they reach you. You have access to the company FAQ but cannot access individual account details.",
      instructions: "First, greet the customer and introduce yourself. Be transparent that you are an AI assistant. Next, ask what you can help them with today. Listen carefully to their question. If the question is about a specific policy or claim, explain that you can provide general information but recommend they contact a human agent for account-specific details. If the question is off-topic, gently redirect. If a user is rude or aggressive, respond calmly once, then offer to transfer to a human agent.",
      tone: "Professional, empathetic, clear. Acknowledge the customer's frustration before providing information. Avoid jargon. Use 'I understand' rather than 'I apologize for the inconvenience.'",
      output: "Short paragraphs, not bullet lists. One topic per message. Ask a clarifying question if the input is ambiguous. Always end with a next step or offer of further help.",
    },
    customSections: [],
  },
};

const MODELS = [
  { value: "claude-sonnet-4-20250514", label: "Claude Sonnet 4", provider: "anthropic" },
  { value: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5", provider: "anthropic" },
  { value: "gpt-4o", label: "GPT-4o", provider: "openai" },
  { value: "gpt-4o-mini", label: "GPT-4o mini", provider: "openai" },
];

const CHALLENGES = [
  {
    id: "greeting",
    title: "1. Build a Greeting Bot",
    level: "Beginner",
    levelColor: GREEN,
    description: "Create a simple bot that greets users and asks how it can help. Focus on Role & Task only.",
    goal: "Fill in at least the Role & Task section with a clear role and task statement.",
    check: (sections) => {
      const issues = [];
      if (!sections.role || sections.role.length < 20) issues.push("Role & Task needs more detail (at least a sentence).");
      if (!sections.role?.toLowerCase().includes("greet")) issues.push("The role should mention greeting users.");
      return issues;
    },
    hint: "Start with: 'You are a friendly reception bot for [place]. Your task is to greet visitors and...'",
  },
  {
    id: "sdg_full",
    title: "2. Design an SDG Explorer",
    level: "Intermediate",
    levelColor: ORANGE,
    description: "Build a complete educational chatbot using all 5 sections. The bot should help children learn about Sustainable Development Goals.",
    goal: "Fill in all 5 sections. Instructions should use sequence markers (First, Next, Then). Tone should match the audience.",
    check: (sections) => {
      const issues = [];
      if (!sections.role) issues.push("Role & Task is empty.");
      if (!sections.context) issues.push("Context is empty — who is the audience?");
      if (!sections.instructions) issues.push("Instructions are empty.");
      if (sections.instructions && !sections.instructions.match(/first|next|then|finally/i)) issues.push("Instructions should use sequence markers (First, Next, Then).");
      if (!sections.tone) issues.push("Tone of Voice is empty.");
      if (!sections.output) issues.push("Output Format is empty.");
      if (sections.context && !sections.context.match(/age|child|pupil|student|kid/i)) issues.push("Context should mention the target age group.");
      return issues;
    },
    hint: "Think about: Who talks to this bot? Where? What's the conversation flow? How should it sound for kids?",
  },
  {
    id: "fix_broken",
    title: "3. Fix a Broken Prompt",
    level: "Advanced",
    levelColor: RED,
    description: "This prompt has several problems. Find and fix them all.",
    goal: "Fix at least 4 of the 5 issues in this prompt.",
    loadPrompt: {
      role: "You are a helpful assistant.",
      context: "",
      instructions: "Help the user with whatever they need. Be good at your job. Answer questions.",
      tone: "Be nice but also be formal and casual and funny.",
      output: "",
    },
    issues: [
      "Role is too vague — 'helpful assistant' gives no direction",
      "Context is completely empty — no audience or platform defined",
      "Instructions are vague — no conversation flow, no edge cases",
      "Tone contradicts itself — can't be formal AND casual AND funny",
      "Output Format is empty — no length, structure, or format defined",
    ],
    check: (sections) => {
      const issues = [];
      if (sections.role === "You are a helpful assistant." || sections.role.length < 30) issues.push("Role is still too vague. Be specific about who the bot is and what it does.");
      if (!sections.context || sections.context.length < 20) issues.push("Context is still empty or too short. Define the audience and setting.");
      if (sections.instructions.length < 50 || !sections.instructions.match(/first|next|then|if|when/i)) issues.push("Instructions need a clear flow with sequence markers or conditionals.");
      const toneWords = (sections.tone.match(/formal|casual|funny/gi) || []);
      if (toneWords.length >= 2 && sections.tone.match(/formal/i) && sections.tone.match(/casual/i)) issues.push("Tone still has contradictions (formal + casual).");
      if (!sections.output || sections.output.length < 15) issues.push("Output Format is still empty or too short.");
      return issues;
    },
    hint: "Look for: vague roles, missing sections, contradictory tone, and lack of structure in instructions.",
  },
];

// ============================================================
// UTILITIES
// ============================================================
function estimateTokens(text) {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

function buildSystemPrompt(sections, customSections) {
  const parts = [];
  if (sections.role) parts.push(`## Role and Task\n${sections.role}`);
  if (sections.context) parts.push(`## Context\n${sections.context}`);
  if (sections.instructions) parts.push(`## Instructions\n${sections.instructions}`);
  if (sections.tone) parts.push(`## Tone of Voice\n${sections.tone}`);
  if (sections.output) parts.push(`## Output Format\n${sections.output}`);
  for (const cs of customSections) {
    if (cs.content) parts.push(`## ${cs.label}\n${cs.content}`);
  }
  return parts.join("\n\n");
}

function detectVariables(text) {
  const matches = text.match(/\{\{(\w+)\}\}/g) || [];
  return [...new Set(matches.map(m => m.slice(2, -2)))];
}

function resolveVariables(text, vars) {
  return text.replace(/\{\{(\w+)\}\}/g, (_, name) => vars[name] || `{{${name}}}`);
}

function analyzePromptQuality(sections, customSections) {
  const findings = [];
  let score = 0;
  const maxScore = 5;

  if (!sections.role) {
    findings.push({ type: "error", msg: "Role & Task is empty. Every prompt needs a clear role." });
  } else if (sections.role.length < 30) {
    findings.push({ type: "warning", msg: "Role & Task is very short. Add more detail about who the bot is and what it does." });
    score += 0.5;
  } else if (sections.role.toLowerCase().includes("helpful assistant") && sections.role.length < 60) {
    findings.push({ type: "warning", msg: "'Helpful assistant' is too generic. Be specific about the bot's domain and purpose." });
    score += 0.5;
  } else {
    score += 1;
  }

  if (!sections.context) {
    findings.push({ type: "warning", msg: "Context is empty. Consider adding audience and platform info." });
  } else { score += 1; }

  if (!sections.instructions) {
    findings.push({ type: "warning", msg: "No instructions defined. The bot won't know what conversation flow to follow." });
  } else {
    if (!sections.instructions.match(/first|next|then|finally|step|begin|start by/i)) {
      findings.push({ type: "tip", msg: "Tip: Use sequence markers (First, Next, Then) to structure your instructions." });
    }
    if (!sections.instructions.match(/if |when |in case|should the|edge|off.?topic|rude|unclear/i)) {
      findings.push({ type: "tip", msg: "Tip: Consider adding edge cases — what if the user goes off-topic or is rude?" });
    }
    score += 1;
  }

  if (!sections.tone) {
    findings.push({ type: "warning", msg: "No tone of voice defined. The model will use its default style." });
  } else {
    const contradictions = [
      [/formal/i, /casual/i, "formal and casual"],
      [/concise/i, /detailed/i, "concise and detailed"],
      [/brief/i, /thorough/i, "brief and thorough"],
    ];
    for (const [a, b, label] of contradictions) {
      if (a.test(sections.tone) && b.test(sections.tone)) {
        findings.push({ type: "warning", msg: `Tone may be contradictory: you asked for both ${label}.` });
      }
    }
    score += 1;
  }

  if (!sections.output) {
    findings.push({ type: "warning", msg: "No output format specified. Consider defining length, structure, and style." });
  } else { score += 1; }

  const fullText = buildSystemPrompt(sections, customSections);
  if (fullText.length > 4000) {
    findings.push({ type: "tip", msg: "Your prompt is quite long. Consider whether all details are necessary." });
  }

  if (findings.length === 0) {
    findings.push({ type: "success", msg: "Looking good! All 5 core sections are filled in." });
  }

  return { findings, score: Math.min(score, maxScore), maxScore };
}

// ============================================================
// API CALL (through Netlify function)
// ============================================================
async function callChat({ provider, model, system, messages, temperature, max_tokens }) {
  const response = await fetch("/.netlify/functions/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ provider, model, system, messages, temperature, max_tokens }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || `Server error ${response.status}`);
  }

  return data.text;
}

// ============================================================
// SUB-COMPONENTS
// ============================================================
function TipPanel({ sectionKey, onClose }) {
  const tip = SECTION_TIPS[sectionKey];
  if (!tip) return null;
  return (
    <div style={{ background: LIGHT_BLUE, borderRadius: 8, padding: 14, marginBottom: 12, position: "relative", fontSize: 13 }}>
      <button onClick={onClose} style={{ position: "absolute", top: 8, right: 10, background: "none", border: "none", cursor: "pointer", color: MED, fontSize: 16 }}>×</button>
      <div style={{ fontWeight: 700, color: BLUE, marginBottom: 8 }}>{tip.title}</div>
      <div style={{ display: "flex", gap: 16, marginBottom: 10 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, color: GREEN, fontSize: 12, marginBottom: 4 }}>Do's</div>
          {tip.dos.map((d, i) => <div key={i} style={{ marginBottom: 3, color: DARK }}>✓ {d}</div>)}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, color: RED, fontSize: 12, marginBottom: 4 }}>Don'ts</div>
          {tip.donts.map((d, i) => <div key={i} style={{ marginBottom: 3, color: DARK }}>✗ {d}</div>)}
        </div>
      </div>
      <div style={{ background: "white", borderRadius: 6, padding: 10, fontFamily: "monospace", fontSize: 12, color: MED, lineHeight: 1.5 }}>
        <strong style={{ color: DARK }}>Example:</strong><br />{tip.example}
      </div>
    </div>
  );
}

function QualityPanel({ sections, customSections }) {
  const { findings, score, maxScore } = analyzePromptQuality(sections, customSections);
  const stars = Array.from({ length: maxScore }, (_, i) => i < Math.round(score) ? "★" : "☆").join("");
  const color = score <= 1 ? RED : score <= 3 ? ORANGE : GREEN;

  return (
    <div style={{ background: LIGHT, borderRadius: 8, padding: 14, marginTop: 12, borderTop: `2px solid ${color}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ fontWeight: 700, fontSize: 13, color: DARK }}>Prompt Check</span>
        <span style={{ color, fontWeight: 700, fontSize: 15, letterSpacing: 2 }}>{stars}</span>
      </div>
      {findings.map((f, i) => (
        <div key={i} style={{ display: "flex", gap: 6, marginBottom: 5, fontSize: 12, lineHeight: 1.4 }}>
          <span style={{ flexShrink: 0 }}>
            {f.type === "error" ? "🔴" : f.type === "warning" ? "🟡" : f.type === "tip" ? "💡" : "✅"}
          </span>
          <span style={{ color: DARK }}>{f.msg}</span>
        </div>
      ))}
    </div>
  );
}

function TokenBadge({ label, count }) {
  return (
    <span style={{ fontSize: 11, color: MED, background: LIGHT, padding: "2px 8px", borderRadius: 10, fontWeight: 500, whiteSpace: "nowrap" }}>
      {label}: ~{count.toLocaleString()} tokens
    </span>
  );
}

function ChatColumn({ model, messages, loading, error, compareMode, chatEndRef }) {
  const modelInfo = MODELS.find(m => m.value === model);
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", borderLeft: compareMode ? `1px solid #e0e0e0` : "none", minWidth: 0 }}>
      {compareMode && (
        <div style={{ padding: "6px 12px", background: LIGHT_BLUE, fontSize: 12, fontWeight: 600, color: BLUE, textAlign: "center", flexShrink: 0 }}>
          {modelInfo?.label || model}
        </div>
      )}
      <div style={{ flex: 1, overflow: "auto", padding: "12px 16px" }}>
        {messages.length === 0 && (
          <div style={{ textAlign: "center", color: MED, marginTop: 40, fontSize: 13 }}>
            {compareMode ? "Waiting for message..." : (
              <>
                <div style={{ fontSize: 28, marginBottom: 6 }}>💬</div>
                <div>Type a message to test your system prompt.</div>
                <div style={{ color: "#999", marginTop: 4 }}>Using <strong>{modelInfo?.label}</strong></div>
              </>
            )}
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", marginBottom: 10 }}>
            <div style={{
              maxWidth: "85%",
              padding: "9px 13px",
              borderRadius: 12,
              fontSize: 13,
              lineHeight: 1.5,
              whiteSpace: "pre-wrap",
              background: m.role === "user" ? BLUE : "white",
              color: m.role === "user" ? "white" : DARK,
              boxShadow: m.role === "assistant" ? "0 1px 3px rgba(0,0,0,0.06)" : "none",
            }}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: 10 }}>
            <div style={{ padding: "9px 13px", borderRadius: 12, background: "white", color: MED, fontSize: 13, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
              <span className="pulse-text">Thinking...</span>
            </div>
          </div>
        )}
        {error && (
          <div style={{ padding: "9px 13px", borderRadius: 8, background: "#FEE", color: RED, fontSize: 12, marginBottom: 10 }}>
            {error}
          </div>
        )}
        <div ref={chatEndRef} />
      </div>
    </div>
  );
}

function ChallengePanel({ onClose, sections, onLoadPrompt }) {
  const [activeChallenge, setActiveChallenge] = useState(null);
  const [checkResult, setCheckResult] = useState(null);

  const runCheck = (challenge) => {
    const issues = challenge.check(sections);
    setCheckResult(issues);
  };

  return (
    <div style={{ position: "fixed", top: 0, right: 0, width: 380, height: "100vh", background: "white", boxShadow: "-4px 0 24px rgba(0,0,0,0.12)", zIndex: 1000, display: "flex", flexDirection: "column", fontFamily: "Inter, system-ui, sans-serif" }}>
      <div style={{ padding: "16px 20px", borderBottom: `1px solid #e0e0e0`, display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
        <span style={{ fontWeight: 700, fontSize: 16, color: BLUE }}>Challenges</span>
        <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: MED }}>×</button>
      </div>
      <div style={{ flex: 1, overflow: "auto", padding: "16px 20px" }}>
        {CHALLENGES.map(ch => (
          <div key={ch.id} style={{ marginBottom: 16, border: `1px solid ${activeChallenge === ch.id ? BLUE : "#e0e0e0"}`, borderRadius: 10, overflow: "hidden" }}>
            <button
              onClick={() => { setActiveChallenge(activeChallenge === ch.id ? null : ch.id); setCheckResult(null); }}
              style={{ width: "100%", padding: "12px 16px", background: activeChallenge === ch.id ? LIGHT_BLUE : LIGHT, border: "none", cursor: "pointer", textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center" }}
            >
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: DARK }}>{ch.title}</div>
                <span style={{ fontSize: 11, color: ch.levelColor, fontWeight: 600 }}>{ch.level}</span>
              </div>
              <span style={{ fontSize: 16, color: MED }}>{activeChallenge === ch.id ? "▲" : "▼"}</span>
            </button>
            {activeChallenge === ch.id && (
              <div style={{ padding: "14px 16px", fontSize: 13, color: DARK, lineHeight: 1.5 }}>
                <p style={{ margin: "0 0 8px" }}>{ch.description}</p>
                <p style={{ margin: "0 0 10px", fontWeight: 600, color: BLUE }}>Goal: {ch.goal}</p>
                {ch.loadPrompt && (
                  <button onClick={() => onLoadPrompt(ch.loadPrompt)}
                    style={{ padding: "6px 14px", background: ORANGE, color: "white", border: "none", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer", marginBottom: 10 }}>
                    Load broken prompt
                  </button>
                )}
                {ch.issues && (
                  <div style={{ background: "#FFF3E0", borderRadius: 6, padding: 10, marginBottom: 10, fontSize: 12 }}>
                    <div style={{ fontWeight: 600, marginBottom: 4, color: ORANGE }}>Known issues to fix:</div>
                    {ch.issues.map((issue, i) => <div key={i} style={{ marginBottom: 2 }}>• {issue}</div>)}
                  </div>
                )}
                <div style={{ background: LIGHT, borderRadius: 6, padding: 10, marginBottom: 10, fontSize: 12, color: MED, fontStyle: "italic" }}>
                  💡 {ch.hint}
                </div>
                <button onClick={() => runCheck(ch)}
                  style={{ padding: "6px 14px", background: BLUE, color: "white", border: "none", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                  Check my prompt
                </button>
                {checkResult !== null && (
                  <div style={{ marginTop: 10, borderRadius: 6, padding: 10, background: checkResult.length === 0 ? "#E8F5E9" : "#FFF3E0", fontSize: 12 }}>
                    {checkResult.length === 0 ? (
                      <div style={{ color: GREEN, fontWeight: 600 }}>✅ Challenge complete! Great job.</div>
                    ) : (
                      <>
                        <div style={{ fontWeight: 600, color: ORANGE, marginBottom: 4 }}>Still needs work:</div>
                        {checkResult.map((r, i) => <div key={i} style={{ marginBottom: 3 }}>⚠ {r}</div>)}
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================
export default function App() {
  // Core state
  const [sections, setSections] = useState({ role: "", context: "", instructions: "", tone: "", output: "" });
  const [customSections, setCustomSections] = useState([]);
  const [variables, setVariables] = useState({});
  const [showRaw, setShowRaw] = useState(false);
  const [rawText, setRawText] = useState("");

  // Model state
  const [selectedModel, setSelectedModel] = useState("claude-sonnet-4-20250514");
  const [compareMode, setCompareMode] = useState(false);
  const [compareModel, setCompareModel] = useState("gpt-4o");

  // Chat settings
  const [temperature, setTemperature] = useState(0.3);
  const [maxTokens, setMaxTokens] = useState(1500);
  const [historyLength, setHistoryLength] = useState(10);

  // Chat state (primary)
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Chat state (comparison)
  const [messagesB, setMessagesB] = useState([]);
  const [loadingB, setLoadingB] = useState(false);
  const [errorB, setErrorB] = useState("");

  // UI state
  const [openTip, setOpenTip] = useState(null);
  const [showChallenges, setShowChallenges] = useState(false);

  const chatEndRef = useRef(null);
  const chatEndRefB = useRef(null);
  const nextCustomId = useRef(1);

  // Derived
  const currentProvider = MODELS.find(m => m.value === selectedModel)?.provider || "anthropic";
  const compareProvider = MODELS.find(m => m.value === compareModel)?.provider || "openai";
  const allText = Object.values(sections).join(" ") + customSections.map(c => c.content).join(" ");
  const detectedVars = detectVariables(allText);
  const systemPromptText = buildSystemPrompt(sections, customSections);
  const promptTokens = estimateTokens(systemPromptText);
  const chatTokens = estimateTokens(messages.map(m => m.content).join(" "));

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  useEffect(() => { chatEndRefB.current?.scrollIntoView({ behavior: "smooth" }); }, [messagesB]);

  useEffect(() => {
    if (!showRaw) setRawText(buildSystemPrompt(sections, customSections));
  }, [sections, customSections, showRaw]);

  // Section management
  const updateSection = (key, value) => setSections(prev => ({ ...prev, [key]: value }));

  const addCustomSection = () => {
    const id = `custom_${nextCustomId.current++}`;
    setCustomSections(prev => [...prev, { id, label: "New Section", content: "" }]);
  };

  const updateCustomSection = (id, field, value) => {
    setCustomSections(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const removeCustomSection = (id) => {
    setCustomSections(prev => prev.filter(s => s.id !== id));
  };

  const loadTemplate = (key) => {
    const t = TEMPLATES[key];
    setSections({ ...t.sections });
    setCustomSections([...(t.customSections || [])]);
    setMessages([]); setMessagesB([]);
    setError(""); setErrorB("");
  };

  const loadPromptForChallenge = (promptSections) => {
    setSections({ ...promptSections });
    setCustomSections([]);
    setMessages([]); setMessagesB([]);
    setError(""); setErrorB("");
  };

  // Raw view parsing
  const parseRawIntoSections = (text) => {
    const sectionMap = { role: "", context: "", instructions: "", tone: "", output: "" };
    const newCustom = [];
    const headerMap = {
      "role and task": "role", "role & task": "role", "role": "role",
      "context": "context", "instructions": "instructions",
      "tone of voice": "tone", "tone": "tone",
      "output format": "output", "output": "output",
    };
    const parts = text.split(/^##\s+/m).filter(Boolean);
    if (parts.length <= 1 && !text.match(/^##/m)) {
      sectionMap.role = text.trim();
    } else {
      for (const part of parts) {
        const firstLine = part.split("\n")[0].trim();
        const body = part.split("\n").slice(1).join("\n").trim();
        const lowerLine = firstLine.toLowerCase();
        const matchedKey = Object.entries(headerMap).find(([h]) => lowerLine.includes(h));
        if (matchedKey) {
          sectionMap[matchedKey[1]] = body;
        } else {
          newCustom.push({ id: `custom_${nextCustomId.current++}`, label: firstLine, content: body });
        }
      }
    }
    setSections(sectionMap);
    setCustomSections(newCustom);
  };

  const handleRawChange = (text) => {
    setRawText(text);
    parseRawIntoSections(text);
  };

  // Send message
  const sendMessage = async () => {
    if (!input.trim() || loading || loadingB) return;

    const userMsg = input.trim();
    setInput("");
    setError(""); setErrorB("");

    const newMessages = [...messages, { role: "user", content: userMsg }];
    setMessages(newMessages);
    setLoading(true);

    const systemPrompt = resolveVariables(systemPromptText, variables);
    const trimmedMessages = newMessages.slice(-(historyLength * 2)).map(m => ({ role: m.role, content: m.content }));

    // Primary model
    callChat({
      provider: currentProvider,
      model: selectedModel,
      system: systemPrompt,
      messages: trimmedMessages,
      temperature,
      max_tokens: maxTokens,
    })
      .then(text => setMessages(prev => [...prev, { role: "assistant", content: text }]))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));

    // Comparison model
    if (compareMode) {
      const newMessagesB = [...messagesB, { role: "user", content: userMsg }];
      setMessagesB(newMessagesB);
      setLoadingB(true);
      const trimmedB = newMessagesB.slice(-(historyLength * 2)).map(m => ({ role: m.role, content: m.content }));

      callChat({
        provider: compareProvider,
        model: compareModel,
        system: systemPrompt,
        messages: trimmedB,
        temperature,
        max_tokens: maxTokens,
      })
        .then(text => setMessagesB(prev => [...prev, { role: "assistant", content: text }]))
        .catch(err => setErrorB(err.message))
        .finally(() => setLoadingB(false));
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const clearChat = () => {
    setMessages([]); setMessagesB([]); setError(""); setErrorB("");
  };

  // Export
  const exportPrompt = () => {
    const content = `# System Prompt\n\n${systemPromptText}\n\n---\n*Exported from Prompt Design Playground — Convocat*\n`;
    const blob = new Blob([content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "system-prompt.md"; a.click();
    URL.revokeObjectURL(url);
  };

  const exportChat = () => {
    const modelInfo = MODELS.find(m => m.value === selectedModel);
    let content = `# Chat Export\n\n**Model:** ${modelInfo?.label || selectedModel}\n**Temperature:** ${temperature}\n**Max Tokens:** ${maxTokens}\n\n---\n\n## System Prompt\n\n${systemPromptText}\n\n---\n\n## Conversation\n\n`;
    for (const m of messages) {
      content += `**${m.role === "user" ? "User" : "Assistant"}:**\n${m.content}\n\n`;
    }
    if (compareMode && messagesB.length > 0) {
      const compareInfo = MODELS.find(m => m.value === compareModel);
      content += `---\n\n## Comparison (${compareInfo?.label || compareModel})\n\n`;
      for (const m of messagesB) {
        content += `**${m.role === "user" ? "User" : "Assistant"}:**\n${m.content}\n\n`;
      }
    }
    content += `---\n*Exported from Prompt Design Playground — Convocat*\n`;
    const blob = new Blob([content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "chat-export.md"; a.click();
    URL.revokeObjectURL(url);
  };

  const tempLabel = temperature <= 0.2 ? "Deterministic" : temperature <= 0.6 ? "Balanced" : temperature <= 1.2 ? "Creative" : "Chaotic";

  // ===== MAIN LAYOUT =====
  return (
    <div style={{ display: "flex", height: "100vh", fontFamily: "Inter, system-ui, sans-serif", color: DARK, overflow: "hidden" }}>
      {/* LEFT PANEL */}
      <div style={{ width: compareMode ? "38%" : "45%", borderRight: `1px solid #e0e0e0`, display: "flex", flexDirection: "column", background: "white", transition: "width 0.2s" }}>
        {/* Header */}
        <div style={{ padding: "10px 16px", borderBottom: `1px solid #e0e0e0`, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div>
            <span style={{ color: BLUE, fontWeight: 700, fontSize: 15 }}>Prompt Design Playground</span>
            <span style={{ color: MED, fontSize: 11, marginLeft: 6 }}>Convocat</span>
          </div>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <select onChange={e => loadTemplate(e.target.value)} defaultValue=""
              style={{ padding: "3px 6px", border: `1px solid #ddd`, borderRadius: 6, fontSize: 11, color: MED, cursor: "pointer" }}>
              <option value="" disabled>Template...</option>
              {Object.entries(TEMPLATES).map(([k, v]) => <option key={k} value={k}>{v.name}</option>)}
            </select>
            <button onClick={() => setShowRaw(!showRaw)}
              style={{ padding: "3px 8px", background: showRaw ? BLUE : "white", color: showRaw ? "white" : MED, border: `1px solid ${showRaw ? BLUE : "#ddd"}`, borderRadius: 6, fontSize: 11, cursor: "pointer", fontWeight: 500 }}>
              {showRaw ? "Builder" : "Raw"}
            </button>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: "auto", padding: "14px 16px" }}>
          {showRaw ? (
            <textarea value={rawText} onChange={e => handleRawChange(e.target.value)}
              placeholder={"Paste or type your full system prompt here.\nUse ## headers to split into sections."}
              style={{ width: "100%", height: "100%", minHeight: 400, fontFamily: "monospace", fontSize: 13, color: DARK, lineHeight: 1.5, background: LIGHT, padding: 14, borderRadius: 8, border: `1px solid #e0e0e0`, boxSizing: "border-box", resize: "none", outline: "none" }} />
          ) : (
            <>
              {DEFAULT_SECTIONS.map(s => (
                <div key={s.key} style={{ marginBottom: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
                    <label style={{ fontWeight: 600, fontSize: 12, color: BLUE }}>{s.icon} {s.label}</label>
                    {SECTION_TIPS[s.key] && (
                      <button onClick={() => setOpenTip(openTip === s.key ? null : s.key)}
                        style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, color: openTip === s.key ? BLUE : MED, padding: 0, lineHeight: 1 }}
                        title="Show tips">
                        {openTip === s.key ? "✕" : "?"}
                      </button>
                    )}
                  </div>
                  {openTip === s.key && <TipPanel sectionKey={s.key} onClose={() => setOpenTip(null)} />}
                  <textarea value={sections[s.key]} onChange={e => updateSection(s.key, e.target.value)}
                    placeholder={SECTION_PLACEHOLDERS[s.key] || ""} rows={3}
                    style={{ width: "100%", padding: "8px 10px", border: `1px solid #e0e0e0`, borderRadius: 8, fontSize: 12, resize: "vertical", fontFamily: "inherit", lineHeight: 1.5, boxSizing: "border-box", outline: "none" }} />
                </div>
              ))}

              {/* Custom sections */}
              {customSections.map(cs => (
                <div key={cs.id} style={{ marginBottom: 14, borderLeft: `3px solid ${BLUE}`, paddingLeft: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                    <span style={{ fontSize: 12, color: BLUE }}>✦</span>
                    <input value={cs.label} onChange={e => updateCustomSection(cs.id, "label", e.target.value)}
                      style={{ fontWeight: 600, fontSize: 12, color: BLUE, border: "none", borderBottom: `1px dashed #ccc`, outline: "none", padding: "2px 4px", flex: 1, background: "transparent" }}
                      placeholder="Section title..." />
                    <button onClick={() => removeCustomSection(cs.id)}
                      style={{ background: "none", border: "none", cursor: "pointer", color: RED, fontSize: 14, padding: 0 }}
                      title="Remove section">✕</button>
                  </div>
                  <textarea value={cs.content} onChange={e => updateCustomSection(cs.id, "content", e.target.value)}
                    placeholder="Section content..." rows={3}
                    style={{ width: "100%", padding: "8px 10px", border: `1px solid #e0e0e0`, borderRadius: 8, fontSize: 12, resize: "vertical", fontFamily: "inherit", lineHeight: 1.5, boxSizing: "border-box", outline: "none" }} />
                </div>
              ))}

              <button onClick={addCustomSection}
                style={{ width: "100%", padding: "8px", background: LIGHT, color: BLUE, border: `1px dashed ${BLUE}`, borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", marginBottom: 12 }}>
                + Add section
              </button>

              {detectedVars.length > 0 && (
                <div style={{ background: LIGHT, borderRadius: 8, padding: 12, marginBottom: 12 }}>
                  <div style={{ fontWeight: 600, fontSize: 12, color: BLUE, marginBottom: 6 }}>Variables detected</div>
                  {detectedVars.map(v => (
                    <div key={v} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                      <code style={{ fontSize: 11, color: BLUE, background: LIGHT_BLUE, padding: "1px 5px", borderRadius: 4, flexShrink: 0 }}>{`{{${v}}}`}</code>
                      <input value={variables[v] || ""} onChange={e => setVariables(prev => ({ ...prev, [v]: e.target.value }))}
                        placeholder={`Value for ${v}`}
                        style={{ flex: 1, padding: "3px 6px", border: `1px solid #ddd`, borderRadius: 6, fontSize: 11 }} />
                    </div>
                  ))}
                </div>
              )}

              <QualityPanel sections={sections} customSections={customSections} />
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: "8px 16px", borderTop: `1px solid #e0e0e0`, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0, flexWrap: "wrap", gap: 6 }}>
          <TokenBadge label="Prompt" count={promptTokens} />
          <div style={{ display: "flex", gap: 4 }}>
            <button onClick={exportPrompt} style={{ padding: "3px 8px", background: "white", color: MED, border: `1px solid #ddd`, borderRadius: 5, fontSize: 10, cursor: "pointer" }}>Export Prompt</button>
            <button onClick={exportChat} disabled={messages.length === 0}
              style={{ padding: "3px 8px", background: "white", color: messages.length ? MED : "#ccc", border: `1px solid #ddd`, borderRadius: 5, fontSize: 10, cursor: messages.length ? "pointer" : "default" }}>Export Chat</button>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", background: LIGHT }}>
        {/* Settings bar */}
        <div style={{ padding: "8px 16px", borderBottom: `1px solid #e0e0e0`, background: "white", display: "flex", alignItems: "center", gap: 12, flexShrink: 0, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <label style={{ fontSize: 11, color: MED, fontWeight: 500 }}>Model</label>
            <select value={selectedModel} onChange={e => { setSelectedModel(e.target.value); clearChat(); }}
              style={{ padding: "2px 4px", border: `1px solid #ddd`, borderRadius: 5, fontSize: 11, color: DARK, cursor: "pointer" }}>
              {MODELS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>

          {compareMode && (
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <label style={{ fontSize: 11, color: MED, fontWeight: 500 }}>vs.</label>
              <select value={compareModel} onChange={e => { setCompareModel(e.target.value); setMessagesB([]); setErrorB(""); }}
                style={{ padding: "2px 4px", border: `1px solid #ddd`, borderRadius: 5, fontSize: 11, color: DARK, cursor: "pointer" }}>
                {MODELS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
          )}

          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <label style={{ fontSize: 11, color: MED, fontWeight: 500 }}>Temp</label>
            <input type="range" min="0" max="2" step="0.1" value={temperature} onChange={e => setTemperature(parseFloat(e.target.value))} style={{ width: 55, accentColor: BLUE }} />
            <span style={{ fontSize: 10, color: BLUE, fontWeight: 600 }}>{temperature}</span>
            <span style={{ fontSize: 9, color: MED, fontStyle: "italic" }}>{tempLabel}</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <label style={{ fontSize: 11, color: MED, fontWeight: 500 }}>Tokens</label>
            <input type="range" min="100" max="4000" step="100" value={maxTokens} onChange={e => setMaxTokens(parseInt(e.target.value))} style={{ width: 45, accentColor: BLUE }} />
            <span style={{ fontSize: 10, color: BLUE, fontWeight: 600 }}>{maxTokens}</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <label style={{ fontSize: 11, color: MED, fontWeight: 500 }}>History</label>
            <input type="range" min="1" max="20" step="1" value={historyLength} onChange={e => setHistoryLength(parseInt(e.target.value))} style={{ width: 40, accentColor: BLUE }} />
            <span style={{ fontSize: 10, color: BLUE, fontWeight: 600 }}>{historyLength}</span>
          </div>

          <TokenBadge label="Chat" count={chatTokens} />

          <div style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
            <button onClick={() => { setCompareMode(!compareMode); if (compareMode) { setMessagesB([]); setErrorB(""); } }}
              style={{ padding: "3px 8px", background: compareMode ? BLUE : "white", color: compareMode ? "white" : MED, border: `1px solid ${compareMode ? BLUE : "#ddd"}`, borderRadius: 5, fontSize: 10, cursor: "pointer", fontWeight: 500 }}>
              {compareMode ? "Single" : "Compare"}
            </button>
            <button onClick={() => setShowChallenges(!showChallenges)}
              style={{ padding: "3px 8px", background: showChallenges ? ORANGE : "white", color: showChallenges ? "white" : MED, border: `1px solid ${showChallenges ? ORANGE : "#ddd"}`, borderRadius: 5, fontSize: 10, cursor: "pointer", fontWeight: 500 }}>
              Challenges
            </button>
            <button onClick={clearChat}
              style={{ padding: "3px 8px", background: "white", color: MED, border: `1px solid #ddd`, borderRadius: 5, fontSize: 10, cursor: "pointer" }}>
              Clear
            </button>
          </div>
        </div>

        {/* Chat area */}
        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
          <ChatColumn model={selectedModel} messages={messages} loading={loading} error={error}
            compareMode={compareMode} chatEndRef={chatEndRef} />
          {compareMode && (
            <ChatColumn model={compareModel} messages={messagesB} loading={loadingB} error={errorB}
              compareMode={compareMode} chatEndRef={chatEndRefB} />
          )}
        </div>

        {/* Input */}
        <div style={{ padding: "10px 16px", borderTop: `1px solid #e0e0e0`, background: "white", flexShrink: 0 }}>
          <div style={{ display: "flex", gap: 8 }}>
            <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown}
              placeholder="Type a message to test your system prompt..."
              disabled={loading || loadingB}
              style={{ flex: 1, padding: "9px 13px", border: `1px solid #e0e0e0`, borderRadius: 8, fontSize: 13, outline: "none" }} />
            <button onClick={sendMessage} disabled={loading || loadingB || !input.trim()}
              style={{
                padding: "9px 18px", background: (loading || loadingB || !input.trim()) ? "#ccc" : BLUE,
                color: "white", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600,
                cursor: (loading || loadingB || !input.trim()) ? "default" : "pointer",
              }}>
              Send
            </button>
          </div>
        </div>
      </div>

      {showChallenges && (
        <ChallengePanel onClose={() => setShowChallenges(false)} sections={sections} onLoadPrompt={loadPromptForChallenge} />
      )}

      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        .pulse-text { animation: pulse 1.5s infinite; }
        textarea:focus, input:focus { border-color: ${BLUE} !important; }
      `}</style>
    </div>
  );
}
