// API base URL — points to the backend server
const API_BASE = "http://localhost:3000";

const chatForm = document.getElementById("chat-form");
const userInput = document.getElementById("user-input");
const sendBtn = document.getElementById("send-btn");
const chatBox = document.getElementById("chat-box");
const filePreview = document.getElementById("file-preview");
const filePreviewName = document.getElementById("file-preview-name");
const fileRemoveBtn = document.getElementById("file-remove-btn");
const fileImageInput = document.getElementById("file-image");
const fileDocumentInput = document.getElementById("file-document");
const fileAudioInput = document.getElementById("file-audio");

const conversation = [];

// Currently selected file state
let selectedFile = null;
let selectedFileType = null; // "image" | "document" | "audio"

// --- File selection handlers ---

const fileInputs = [
  { el: fileImageInput, type: "image" },
  { el: fileDocumentInput, type: "document" },
  { el: fileAudioInput, type: "audio" },
];

fileInputs.forEach(({ el, type }) => {
  el.addEventListener("change", () => {
    if (el.files.length > 0) {
      fileInputs.forEach(({ el: other }) => {
        if (other !== el) other.value = "";
      });
      selectedFile = el.files[0];
      selectedFileType = type;
      showFilePreview(selectedFile.name, type);
    }
  });
});

fileRemoveBtn.addEventListener("click", clearFileSelection);

function showFilePreview(name, type) {
  const typeLabels = { image: "Gambar", document: "Dokumen", audio: "Audio" };
  filePreviewName.textContent = `${typeLabels[type]}: ${name}`;
  filePreview.classList.remove("hidden");
}

function clearFileSelection() {
  selectedFile = null;
  selectedFileType = null;
  fileInputs.forEach(({ el }) => (el.value = ""));
  filePreview.classList.add("hidden");
  filePreviewName.textContent = "";
}

// --- Markdown formatter ---

function formatMarkdown(text) {
  let html = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  const lines = html.split("\n");
  const output = [];
  let inUl = false;
  let inOl = false;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    const headingMatch = line.match(/^#{1,3}\s+(.+)$/);
    if (headingMatch) {
      if (inUl) { output.push("</ul>"); inUl = false; }
      if (inOl) { output.push("</ol>"); inOl = false; }
      output.push(`<strong class="section-heading">${applyInline(headingMatch[1])}</strong>`);
      continue;
    }

    const ulMatch = line.match(/^\s*[-*•]\s+(.+)$/);
    if (ulMatch) {
      if (inOl) { output.push("</ol>"); inOl = false; }
      if (!inUl) { output.push("<ul>"); inUl = true; }
      output.push(`<li>${applyInline(ulMatch[1])}</li>`);
      continue;
    }

    const olMatch = line.match(/^\s*\d+[.)]\s+(.+)$/);
    if (olMatch) {
      if (inUl) { output.push("</ul>"); inUl = false; }
      if (!inOl) { output.push("<ol>"); inOl = true; }
      output.push(`<li>${applyInline(olMatch[1])}</li>`);
      continue;
    }

    if (inUl) { output.push("</ul>"); inUl = false; }
    if (inOl) { output.push("</ol>"); inOl = false; }

    if (line.trim() === "") {
      output.push('<div class="spacer"></div>');
      continue;
    }

    output.push(`<p>${applyInline(line)}</p>`);
  }

  if (inUl) output.push("</ul>");
  if (inOl) output.push("</ol>");

  return output.join("");
}

function applyInline(text) {
  text = text.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  text = text.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, "<em>$1</em>");
  return text;
}

// --- Attachment renderers ---

function renderAttachment(attachment) {
  const url = `${API_BASE}${attachment.url}`;
  const name = attachment.originalName || attachment.filename;

  if (attachment.type === "image") {
    return `<div class="attachment attachment-image">
      <a href="${url}" target="_blank" rel="noopener">
        <img src="${url}" alt="${name}" />
      </a>
    </div>`;
  }

  if (attachment.type === "document") {
    return `<div class="attachment attachment-doc">
      <a href="${url}" target="_blank" rel="noopener" class="doc-card">
        <span class="doc-icon">📄</span>
        <span class="doc-name">${name}</span>
      </a>
    </div>`;
  }

  if (attachment.type === "audio") {
    return `<div class="attachment attachment-audio">
      <audio controls preload="metadata">
        <source src="${url}" type="${attachment.mimeType}" />
      </audio>
      <a href="${url}" target="_blank" rel="noopener" class="audio-name">${name}</a>
    </div>`;
  }

  return "";
}

// --- Chat UI helpers ---

function addBotMessage(text) {
  const div = document.createElement("div");
  div.classList.add("message", "bot");
  div.innerHTML = formatMarkdown(text);
  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
  return div;
}

function addUserMessage(text, attachment) {
  const div = document.createElement("div");
  div.classList.add("message", "user");

  if (attachment) {
    const attachHtml = renderAttachment(attachment);
    const textHtml = text ? `<p class="user-text">${text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>` : "";
    div.innerHTML = attachHtml + textHtml;
  } else {
    div.textContent = text;
  }

  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
}

function showThinking() {
  const div = document.createElement("div");
  div.classList.add("message", "bot", "thinking");
  div.textContent = "Sedang berpikir...";
  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
  return div;
}

function setLoading(loading) {
  sendBtn.disabled = loading;
  userInput.disabled = loading;
  fileInputs.forEach(({ el }) => (el.disabled = loading));
  if (!loading) userInput.focus();
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function displayMessages(messages) {
  for (let i = 0; i < messages.length; i++) {
    if (i > 0) {
      const typing = showThinking();
      await wait(500 + Math.random() * 400);
      typing.remove();
    }
    addBotMessage(messages[i]);
    await wait(80);
  }
}

function handleBotResponse(data, thinkingDiv) {
  thinkingDiv.remove();

  if (!data.result) {
    const errorDiv = addBotMessage("Maaf, tidak ada balasan yang diterima.");
    errorDiv.classList.add("error");
    return;
  }

  const messages =
    data.messages && data.messages.length > 0
      ? data.messages
      : [data.result];

  return displayMessages(messages);
}

// --- Send text message ---

async function sendTextMessage(text) {
  conversation.push({ role: "user", text });
  addUserMessage(text);

  const thinkingDiv = showThinking();
  setLoading(true);

  try {
    const response = await fetch(`${API_BASE}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversation }),
    });

    if (!response.ok) throw new Error("Server error");

    const data = await response.json();

    if (data.result) {
      conversation.push({ role: "model", text: data.result });
    }

    await handleBotResponse(data, thinkingDiv);
  } catch (error) {
    thinkingDiv.remove();
    const errorDiv = addBotMessage("Gagal mendapatkan balasan dari server.");
    errorDiv.classList.add("error");
  } finally {
    setLoading(false);
    chatBox.scrollTop = chatBox.scrollHeight;
  }
}

// --- Send file upload ---

async function sendFileMessage(file, fileType, promptText) {
  const typeLabels = { image: "gambar", document: "dokumen", audio: "audio" };
  const userText = promptText || "";

  // Add to conversation for context (text representation)
  const contextText = promptText
    ? `[Upload ${typeLabels[fileType]}: ${file.name}] ${promptText}`
    : `[Upload ${typeLabels[fileType]}: ${file.name}]`;
  conversation.push({ role: "user", text: contextText });

  const endpoints = {
    image: "/generate-from-image",
    document: "/generate-from-document",
    audio: "/generate-from-audio",
  };

  const fieldNames = {
    image: "image",
    document: "document",
    audio: "audio",
  };

  const formData = new FormData();
  formData.append(fieldNames[fileType], file);
  if (promptText) {
    formData.append("prompt", promptText);
  }
  // Send conversation history for context
  formData.append("conversation", JSON.stringify(conversation.slice(0, -1)));

  // Create a local preview URL for the file
  const localUrl = URL.createObjectURL(file);
  const tempAttachment = {
    type: fileType === "document" ? "document" : fileType,
    url: "", // will be replaced
    originalName: file.name,
    filename: file.name,
    mimeType: file.type,
    _localUrl: localUrl,
  };

  // Show user message with file preview
  addUserMessageWithLocalFile(userText, tempAttachment);

  const thinkingDiv = showThinking();
  setLoading(true);

  try {
    const response = await fetch(`${API_BASE}${endpoints[fileType]}`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) throw new Error("Server error");

    const data = await response.json();

    if (data.result) {
      conversation.push({ role: "model", text: data.result });
    }

    await handleBotResponse(data, thinkingDiv);
  } catch (error) {
    thinkingDiv.remove();
    const errorDiv = addBotMessage("Gagal mendapatkan balasan dari server.");
    errorDiv.classList.add("error");
  } finally {
    setLoading(false);
    chatBox.scrollTop = chatBox.scrollHeight;
  }
}

// Render user message with local file preview (using object URL)
function addUserMessageWithLocalFile(text, attachment) {
  const div = document.createElement("div");
  div.classList.add("message", "user");

  let attachHtml = "";
  const name = attachment.originalName;
  const url = attachment._localUrl;

  if (attachment.type === "image") {
    attachHtml = `<div class="attachment attachment-image">
      <img src="${url}" alt="${name}" />
    </div>`;
  } else if (attachment.type === "document") {
    attachHtml = `<div class="attachment attachment-doc">
      <div class="doc-card">
        <span class="doc-icon">📄</span>
        <span class="doc-name">${name}</span>
      </div>
    </div>`;
  } else if (attachment.type === "audio") {
    attachHtml = `<div class="attachment attachment-audio">
      <audio controls preload="metadata">
        <source src="${url}" type="${attachment.mimeType}" />
      </audio>
      <span class="audio-name">${name}</span>
    </div>`;
  }

  const textHtml = text ? `<p class="user-text">${text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>` : "";
  div.innerHTML = attachHtml + textHtml;

  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
}

// --- Form submit ---

chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const text = userInput.value.trim();

  if (selectedFile) {
    const file = selectedFile;
    const type = selectedFileType;
    userInput.value = "";
    clearFileSelection();
    await sendFileMessage(file, type, text);
  } else {
    if (!text) return;
    userInput.value = "";
    await sendTextMessage(text);
  }
});
