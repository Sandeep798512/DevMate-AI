const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config();

const SYSTEM_PROMPT = `You are DevMate AI — a senior software engineer and code review expert.
Your responses must be:
- Clear, structured, and actionable
- Written in Markdown format (use headers, bullet points, code blocks)
- Concise but complete
Always wrap code examples in triple-backtick fences with the language name.`;

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
  model: "gemini-2.5-flash",
  systemInstruction: SYSTEM_PROMPT
});

const PROMPTS = {
  explain: (code) =>
    `Explain the following code clearly. Cover: what it does, how it works, and any noteworthy patterns or potential pitfalls.\n\n\`\`\`\n${code}\n\`\`\``,

  bug: (code) =>
    `Perform a thorough bug analysis on this code. Identify:\n1. **Critical bugs**\n2. **Warnings**\n3. **Style issues**\n\nFor each issue, provide the problematic line and a corrected version.\n\n\`\`\`\n${code}\n\`\`\``,

  optimize: (code) =>
    `Optimize this code for performance and readability. Provide:\n1. **Current issues**\n2. **Optimized version** in a fenced code block\n3. **Key changes** — bullet list\n\n\`\`\`\n${code}\n\`\`\``,

  review: (code) =>
    `Perform a professional code review. Rate each dimension (1-10):\n- Correctness\n- Maintainability\n- Security\n- Performance\n- Best Practices\n\nGive an overall verdict.\n\n\`\`\`\n${code}\n\`\`\``,

  summarize: (code) =>
    `Summarize this code. Include:\n- **Purpose**\n- **Architecture**\n- **Key functions**\n- **Dependencies**\n\n\`\`\`\n${code}\n\`\`\``,

  readme: (code) =>
    `Generate a professional README.md.\nInclude: Project Name, Description, Features, Tech Stack, Installation, Usage.\n\nCode:\n\`\`\`\n${code}\n\`\`\``,

  github: (repoData) =>
    `Analyze this GitHub repository:\n1. **Overview**\n2. **Folder Structure**\n3. **Tech Stack**\n4. **Code Quality**\n5. **Top 5 Improvements**\n\n${repoData}`,

  ask: (question) =>
    `Question: ${question}`,
};

// ── Image prompts for vision analysis ─────────────────────────────────────────
const IMAGE_PROMPTS = {
  explain:
    "Analyze this image thoroughly. If it contains code, explain what it does, how it works, and any potential issues. If it is a UI screenshot, describe the interface and its purpose. If it is a diagram, explain the concept.",
  summarize:
    "Provide a clear and concise summary of what this image shows. Focus on the key information and main purpose.",
  review:
    "Review this image as a senior developer. If it is code, perform a code review covering correctness, security, and best practices. If it is a UI, perform a UX and design review.",
  bugs:
    "Carefully look for any bugs, errors, issues, or anti-patterns visible in this image. List each problem clearly with an explanation and suggested fix.",
  optimize:
    "Suggest concrete optimizations based on what you see in this image. Explain what can be improved and how.",
};

// ── Core text call ────────────────────────────────────────────────────────────
async function callGemini(promptText, history = []) {
  if (history && history.length > 0) {
    const formattedHistory = [];
    let expectedRole = "user";
    for (const msg of history) {
      const role = msg.role === "user" ? "user" : "model";
      if (role === expectedRole) {
        formattedHistory.push({
          role,
          parts: [{ text: msg.content }]
        });
        expectedRole = expectedRole === "user" ? "model" : "user";
      }
    }
    // Gemini startChat history must end with a model turn
    if (formattedHistory.length > 0 && formattedHistory[formattedHistory.length - 1].role === "user") {
      formattedHistory.pop();
    }

    const chat = model.startChat({ history: formattedHistory });
    const result = await chat.sendMessage(promptText);
    const response = await result.response;
    return response.text();
  } else {
    const result     = await model.generateContent(promptText);
    const response   = await result.response;
    return response.text();
  }
}

// ── Core vision call ──────────────────────────────────────────────────────────
async function callGeminiVision(base64Image, mimeType, promptText, history = []) {
  let contextPrompt = promptText;
  if (history && history.length > 0) {
    const historyText = history.map(msg => `${msg.role === "user" ? "User" : "DevMate AI"}: ${msg.content}`).join("\n");
    contextPrompt = `Previous Conversation History:\n${historyText}\n\nSystem Prompt: ${SYSTEM_PROMPT}\n\nCurrent Request:\n${promptText}`;
  } else {
    contextPrompt = `${SYSTEM_PROMPT}\n\n${promptText}`;
  }

  const result = await model.generateContent([
    { text: contextPrompt },
    { inlineData: { mimeType, data: base64Image } },
  ]);
  const response = await result.response;
  return response.text();
}

// ── Existing text functions ───────────────────────────────────
async function explainCode(code, history = []) {
  return callGemini(PROMPTS.explain(code), history);
}
async function detectBugs(code, history = []) {
  return callGemini(PROMPTS.bug(code), history);
}
async function optimizeCode(code, history = []) {
  return callGemini(PROMPTS.optimize(code), history);
}
async function reviewCode(code, history = []) {
  return callGemini(PROMPTS.review(code), history);
}
async function summarizeCode(code, history = []) {
  return callGemini(PROMPTS.summarize(code), history);
}
async function generateReadme(code, history = []) {
  return callGemini(PROMPTS.readme(code), history);
}
async function analyzeGitHub(repoData, history = []) {
  return callGemini(PROMPTS.github(repoData), history);
}
async function askQuestion(question, history = []) {
  return callGemini(PROMPTS.ask(question), history);
}

// ── Image analysis ───────────────────────────────────────────────────────
async function analyzeImage(base64Image, mimeType, action = "explain", customPrompt = null, history = []) {
  const prompt = customPrompt || IMAGE_PROMPTS[action] || IMAGE_PROMPTS.explain;
  return callGeminiVision(base64Image, mimeType, prompt, history);
}

// ── Exports ───────────────────────────────────────────────────────────────────
module.exports = {
  explainCode,
  detectBugs,
  optimizeCode,
  reviewCode,
  summarizeCode,
  generateReadme,
  analyzeGitHub,
  askQuestion,
  analyzeImage,
  IMAGE_PROMPTS
};
