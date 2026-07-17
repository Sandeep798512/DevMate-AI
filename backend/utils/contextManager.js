const fs = require("fs");
const path = require("path");
const axios = require("axios");

// ─── Supported file extensions ────────────────────────────────────────────────

const SUPPORTED_EXTENSIONS = new Set([
  ".js", ".ts", ".jsx", ".tsx",
  ".py", ".java", ".cpp", ".c", ".cs",
  ".html", ".css", ".scss",
  ".json", ".md", ".txt",
  ".go", ".rs", ".php", ".rb",
]);

function isSupportedFile(filename) {
  return SUPPORTED_EXTENSIONS.has(path.extname(filename).toLowerCase());
}

// ─── Local project context ────────────────────────────────────────────────────

function getLocalContext(folderPath, maxCharsPerFile = 1500) {
  if (!fs.existsSync(folderPath)) return "";

  let context = "";

  function readDir(dirPath, depth = 0) {
    if (depth > 3) return; // prevent deep traversal

    const entries = fs.readdirSync(dirPath);

    for (const entry of entries) {
      if (entry.startsWith(".") || entry === "node_modules" || entry === "dist") {
        continue;
      }

      const fullPath = path.join(dirPath, entry);
      const stat = fs.lstatSync(fullPath);

      if (stat.isDirectory()) {
        readDir(fullPath, depth + 1);
      } else if (stat.isFile() && isSupportedFile(entry)) {
        try {
          const content = fs.readFileSync(fullPath, "utf-8");
          const relative = path.relative(folderPath, fullPath);
          context += `\n### FILE: ${relative}\n\`\`\`\n${content.substring(0, maxCharsPerFile)}\n\`\`\`\n`;
        } catch {
          // skip unreadable files
        }
      }
    }
  }

  readDir(folderPath);
  return context;
}

// ─── GitHub repository context ────────────────────────────────────────────────

async function getGitHubContext(repoUrl) {
  if (!repoUrl || !repoUrl.includes("github.com")) return "";

  try {
    // Convert https://github.com/user/repo → https://api.github.com/repos/user/repo
    const apiBase = repoUrl
      .replace("https://github.com/", "https://api.github.com/repos/")
      .replace(/\/$/, "");

    const headers = {
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "DevMate-AI",
    };

    if (process.env.GITHUB_TOKEN) {
      headers.Authorization = `token ${process.env.GITHUB_TOKEN}`;
    }

    // Get repo metadata
    const repoRes = await axios.get(apiBase, { headers, timeout: 8000 });
    const repo = repoRes.data;

    let context = `## Repository: ${repo.full_name}\n`;
    context += `- **Description:** ${repo.description || "None"}\n`;
    context += `- **Stars:** ${repo.stargazers_count} | **Forks:** ${repo.forks_count}\n`;
    context += `- **Language:** ${repo.language || "Unknown"}\n`;
    context += `- **Size:** ${repo.size} KB\n\n`;

    // Get file tree (root level)
    const contentsRes = await axios.get(`${apiBase}/contents`, { headers, timeout: 8000 });
    const files = contentsRes.data;

    context += "## File Structure\n";
    for (const item of files) {
      const icon = item.type === "dir" ? "📁" : "📄";
      context += `${icon} ${item.name}\n`;
    }
    context += "\n## File Contents\n";

    // Fetch up to 6 source files
    let filesFetched = 0;
    for (const file of files) {
      if (filesFetched >= 6) break;
      if (file.type !== "file" || !isSupportedFile(file.name)) continue;

      try {
        const fileRes = await axios.get(file.download_url, { headers, timeout: 5000 });
        const content = typeof fileRes.data === "string" ? fileRes.data : JSON.stringify(fileRes.data, null, 2);
        context += `\n### FILE: ${file.name}\n\`\`\`\n${content.substring(0, 1200)}\n\`\`\`\n`;
        filesFetched++;
      } catch {
        // skip
      }
    }

    return context;
  } catch (err) {
    if (err.response?.status === 404) {
      throw new Error("Repository not found. Make sure the URL is correct and the repo is public.");
    }
    if (err.response?.status === 403) {
      throw new Error("GitHub API rate limit exceeded. Add a GITHUB_TOKEN to your .env file.");
    }
    throw new Error("Failed to fetch repository. Check the URL and try again.");
  }
}

module.exports = { getLocalContext, getGitHubContext };
