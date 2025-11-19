const API = 'https://ai-chat-app.hnimonkar.workers.dev';
const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0dXNlciIsImlhdCI6MTc2MzU1MzE2N30.Qzju0AmPGla-J1HHcnSkb_VYoFPyFyTYwB5aR0w8ANo';

let messages = [];
let analytics = {};
let costTracking = {};
let recognition;
let isListening = false;

function toggleTheme() {
  const container = document.querySelector('.container');
  const currentTheme = container.getAttribute('data-theme');
  const newTheme = currentTheme === 'light' ? 'dark' : 'light';
  container.setAttribute('data-theme', newTheme);
  document.body.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);
  
  const icon = document.getElementById('themeIcon');
  if (newTheme === 'dark') {
    icon.innerHTML = '<path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"/>';
  } else {
    icon.innerHTML = '<path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/>';
  }

  savePreference('theme', newTheme);
}

async function savePreference(key, value) {
  try {
    await fetch(`${API}/api/preferences`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${TOKEN}` },
      body: JSON.stringify({ [key]: value })
    });
  } catch (e) {
    console.error('Failed to save preference:', e);
  }
}

function formatMessage(text) {
  let html = text;
  
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/`(.*?)`/g, '<code>$1</code>');
  html = html.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank">$1</a>');
  
  const lines = html.split('\n');
  let inList = false;
  let formatted = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (line.match(/^\d+\.\s/)) {
      if (!inList) {
        formatted.push('<ol>');
        inList = 'ol';
      }
      formatted.push('<li>' + line.replace(/^\d+\.\s/, '') + '</li>');
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      if (!inList) {
        formatted.push('<ul>');
        inList = 'ul';
      }
      formatted.push('<li>' + line.substring(2) + '</li>');
    } else {
      if (inList) {
        formatted.push(inList === 'ol' ? '</ol>' : '</ul>');
        inList = false;
      }
      if (line) {
        formatted.push('<p>' + line + '</p>');
      }
    }
  }
  
  if (inList) {
    formatted.push(inList === 'ol' ? '</ol>' : '</ul>');
  }
  
  return formatted.join('');
}

function addMessage(role, content) {
  const welcome = document.querySelector('.welcome');
  if (welcome) welcome.remove();

  const chat = document.getElementById('chat');
  const msg = document.createElement('div');
  msg.className = `message ${role}`;
  
  const avatar = document.createElement('div');
  avatar.className = 'message-avatar';
  avatar.textContent = role === 'user' ? 'U' : 'AI';
  
  const msgContent = document.createElement('div');
  msgContent.className = 'message-content';
  msgContent.innerHTML = role === 'assistant' ? formatMessage(content) : content;
  
  if (role === 'assistant') {
    const copyBtn = document.createElement('button');
    copyBtn.className = 'copy-btn';
    copyBtn.textContent = 'Copy';
    copyBtn.onclick = () => copyMessage(copyBtn);
    msgContent.appendChild(copyBtn);
  }
  
  msg.appendChild(avatar);
  msg.appendChild(msgContent);
  chat.appendChild(msg);
  
  scrollToBottom();
}

function addTypingIndicator() {
  const chat = document.getElementById('chat');
  const typing = document.createElement('div');
  typing.className = 'typing-indicator active';
  typing.id = 'typingIndicator';
  typing.innerHTML = '<div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>';
  chat.appendChild(typing);
  scrollToBottom();
}

function removeTypingIndicator() {
  const typing = document.getElementById('typingIndicator');
  if (typing) typing.remove();
}

function scrollToBottom() {
  const chatWrapper = document.querySelector('.chat-wrapper');
  chatWrapper.scrollTo({ top: chatWrapper.scrollHeight, behavior: 'smooth' });
}

function copyMessage(btn) {
  const content = btn.parentElement.textContent.replace('Copy', '').trim();
  navigator.clipboard.writeText(content);
  showToast('Copied to clipboard!');
}

function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3000);
}

async function sendMessage() {
  const input = document.getElementById('messageInput');
  const message = input.value.trim();
  if (!message) return;

  input.value = '';
  addMessage('user', message);
  addTypingIndicator();
  
  const sendBtn = document.getElementById('sendBtn');
  sendBtn.disabled = true;

  try {
    const res = await fetch(`${API}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${TOKEN}` },
      body: JSON.stringify({ message })
    });

    const data = await res.json();
    
    removeTypingIndicator();
    
    if (data.reply) {
      addMessage('assistant', data.reply);
      if (data.analytics) analytics = data.analytics;
      if (data.costTracking) costTracking = data.costTracking;
    } else {
      addMessage('assistant', 'Sorry, I encountered an error. Please try again.');
    }
  } catch (e) {
    removeTypingIndicator();
    addMessage('assistant', 'Network error. Please check your connection.');
  } finally {
    sendBtn.disabled = false;
    input.focus();
  }
}

function askExample(btn) {
  document.getElementById('messageInput').value = btn.textContent;
  sendMessage();
}

function initVoice() {
  if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      document.getElementById('messageInput').value = transcript;
      sendMessage();
    };

    recognition.onend = () => {
      isListening = false;
      document.getElementById('voiceBtn').classList.remove('listening');
    };

    recognition.onerror = () => {
      isListening = false;
      document.getElementById('voiceBtn').classList.remove('listening');
      showToast('Voice input failed. Please try again.');
    };
  }
}

function toggleVoice() {
  if (!recognition) {
    initVoice();
  }

  if (isListening) {
    recognition.stop();
    isListening = false;
    document.getElementById('voiceBtn').classList.remove('listening');
  } else {
    recognition.start();
    isListening = true;
    document.getElementById('voiceBtn').classList.add('listening');
    showToast('Listening...');
  }
}

function openSearch() {
  document.getElementById('searchModal').classList.add('active');
  document.getElementById('searchInput').focus();
}

function closeSearch() {
  document.getElementById('searchModal').classList.remove('active');
}

async function performSearch() {
  const query = document.getElementById('searchInput').value;
  if (!query) {
    document.getElementById('searchResults').innerHTML = '';
    return;
  }

  try {
    const res = await fetch(`${API}/api/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${TOKEN}` },
      body: JSON.stringify({ query })
    });

    const data = await res.json();
    const resultsDiv = document.getElementById('searchResults');
    
    if (data.results && data.results.length > 0) {
      resultsDiv.innerHTML = data.results.map(r => 
        `<div class="search-result-item">
          <strong>${r.role}:</strong> ${r.content.substring(0, 150)}...
        </div>`
      ).join('');
    } else {
      resultsDiv.innerHTML = '<p style="color: var(--text-secondary); text-align: center; padding: 2rem;">No results found</p>';
    }
  } catch (e) {
    console.error('Search failed:', e);
  }
}

async function openCostTracker() {
  document.getElementById('costModal').classList.add('active');
  
  try {
    const res = await fetch(`${API}/api/history`, {
      headers: { 'Authorization': `Bearer ${TOKEN}` }
    });
    const data = await res.json();
    
    analytics = data.analytics || {};
    costTracking = data.costTracking || {};
    
    document.getElementById('costStats').innerHTML = `
      <div class="stat-card">
        <span class="stat-label">Total Cost</span>
        <span class="stat-value">$${(costTracking.totalCost || 0).toFixed(4)}</span>
      </div>
      <div class="stat-card">
        <span class="stat-label">Messages</span>
        <span class="stat-value">${analytics.totalMessages || 0}</span>
      </div>
      <div class="stat-card">
        <span class="stat-label">Tokens Used</span>
        <span class="stat-value">${analytics.tokensUsed || 0}</span>
      </div>
    `;
  } catch (e) {
    console.error('Failed to fetch stats:', e);
  }
}

function closeCostTracker() {
  document.getElementById('costModal').classList.remove('active');
}

async function exportChat() {
  try {
    const res = await fetch(`${API}/api/export`, {
      headers: { 'Authorization': `Bearer ${TOKEN}` }
    });
    const data = await res.json();
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cloudflare-agents-chat-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    showToast('Conversation exported!');
  } catch (e) {
    showToast('Export failed. Please try again.');
  }
}

function clearChat() {
  document.getElementById('confirmModal').classList.add('active');
}

function closeConfirm() {
  document.getElementById('confirmModal').classList.remove('active');
}

async function confirmClear() {
  closeConfirm();
  
  const currentTheme = localStorage.getItem('theme') || document.querySelector('.container').getAttribute('data-theme') || 'light';
  
  try {
    await fetch(`${API}/api/clear`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${TOKEN}` }
    });
    
    showToast('Conversation cleared');
    
    const chat = document.getElementById('chat');
    const welcome = document.createElement('div');
    welcome.className = 'welcome';
    welcome.innerHTML = `
      <h2>Welcome to Cloudflare Agents Q&A</h2>
      <p>Ask me anything about the Cloudflare Agents SDK, Workers AI, Durable Objects, Workflows, MCP servers, and related platform features.</p>
      <div class="example-questions">
        <button class="example-btn" onclick="askExample(this)">How do I create my first Cloudflare Agent?</button>
        <button class="example-btn" onclick="askExample(this)">What is the Agent class and how does it work?</button>
        <button class="example-btn" onclick="askExample(this)">How do I use WebSockets with Agents?</button>
        <button class="example-btn" onclick="askExample(this)">How do I integrate MCP servers with my Agent?</button>
      </div>
    `;
    
    chat.innerHTML = '';
    chat.appendChild(welcome);
    
    const container = document.querySelector('.container');
    const body = document.body;
    container.setAttribute('data-theme', currentTheme);
    body.setAttribute('data-theme', currentTheme);
    localStorage.setItem('theme', currentTheme);
  } catch (e) {
    showToast('Failed to clear chat. Please try again.');
  }
}

window.onclick = (e) => {
  if (e.target.classList.contains('modal')) {
    e.target.classList.remove('active');
  }
  if (e.target.classList.contains('confirm-modal')) {
    e.target.classList.remove('active');
  }
};

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('messageInput').focus();
  
  const savedTheme = localStorage.getItem('theme') || 'light';
  const container = document.querySelector('.container');
  const body = document.body;
  container.setAttribute('data-theme', savedTheme);
  body.setAttribute('data-theme', savedTheme);
  
  const icon = document.getElementById('themeIcon');
  if (savedTheme === 'dark') {
    icon.innerHTML = '<path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"/>';
  }
});

