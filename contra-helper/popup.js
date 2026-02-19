// --- INITIALIZATION & MEMORY ---
document.addEventListener('DOMContentLoaded', () => {
  // Load Key & Last State
  chrome.storage.local.get(['geminiKey', 'lastReply', 'lastTone'], (result) => {
    if (result.geminiKey) document.getElementById('apiKey').value = result.geminiKey;
    if (result.lastTone) document.getElementById('toneSelector').value = result.lastTone;
    
    // RESTORE STATE: If we have a saved reply, show it immediately
    if (result.lastReply && result.lastReply.length > 0) {
      document.getElementById('output').value = result.lastReply;
      showActionButtons();
    }
  });
});

// --- UI HELPERS ---
function showActionButtons() {
  document.getElementById('scanBtn').style.display = 'none'; // Hide Generate
  document.getElementById('setup-section').style.display = 'none'; // Hide inputs
  document.getElementById('actionButtons').style.display = 'flex'; // Show Actions
}

function resetUI() {
  document.getElementById('scanBtn').style.display = 'block';
  document.getElementById('setup-section').style.display = 'block';
  document.getElementById('actionButtons').style.display = 'none';
  document.getElementById('output').value = "";
  
  // Clear memory
  chrome.storage.local.remove(['lastReply']);
}

// --- BUTTON LISTENERS ---

// 1. RESET
document.getElementById('resetBtn').addEventListener('click', resetUI);

// 2. COPY
document.getElementById('copyBtn').addEventListener('click', () => {
  const text = document.getElementById('output').value;
  navigator.clipboard.writeText(text);
  const btn = document.getElementById('copyBtn');
  btn.innerText = "COPIED! ✅";
  setTimeout(() => btn.innerText = "📋 COPY TEXT", 2000);
});

// 3. INSERT (GHOSTWRITER)
document.getElementById('insertBtn').addEventListener('click', async () => {
  const text = document.getElementById('output').value;
  const btn = document.getElementById('insertBtn');
  
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  // Try to insert. If script is dead, re-inject it first.
  try {
    await chrome.tabs.sendMessage(tab.id, { action: "ghostwrite", text: text });
    btn.innerText = "INSERTED! 👻";
  } catch (err) {
    // Self-Healing: Re-inject script and try again
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] });
    await new Promise(r => setTimeout(r, 100)); // Wait for load
    await chrome.tabs.sendMessage(tab.id, { action: "ghostwrite", text: text });
    btn.innerText = "INSERTED! 👻";
  }
  
  setTimeout(() => btn.innerText = "👻 INSERT INTO PAGE", 2000);
});

// 4. GENERATE
document.getElementById('scanBtn').addEventListener('click', async () => {
  const btn = document.getElementById('scanBtn');
  const dot = document.getElementById('statusDot');
  const output = document.getElementById('output');
  const tone = document.getElementById('toneSelector').value;
  
  let apiKey = document.getElementById('apiKey').value.trim();
  if (!apiKey) { output.value = "Error: API Key missing."; return; }

  // Save Settings
  chrome.storage.local.set({ geminiKey: apiKey, lastTone: tone });

  btn.innerText = "ANALYZING...";
  btn.style.opacity = "0.7";
  dot.className = "status-dot active";
  output.value = "";

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    // --- SELF HEALING CONNECTION ---
    try {
      // Try to ping the existing content script
      await chrome.tabs.sendMessage(tab.id, { action: "ping" });
    } catch (err) {
      // If it fails, inject a new one (No refresh needed!)
      console.log("Re-injecting content script...");
      await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] });
      await new Promise(r => setTimeout(r, 100)); // Wait for load
    }
    // -------------------------------

    chrome.tabs.sendMessage(tab.id, { action: "scan_page" }, async (response) => {
      if (chrome.runtime.lastError || !response || !response.success) {
        output.value = "Error: Please highlight text on the page first.";
        btn.innerText = "GENERATE REPLY";
        btn.style.opacity = "1";
        return;
      }

      const postText = response.text.substring(0, 5000); 

      try {
        const modelName = await findWorkingModel(apiKey);
        const reply = await generateReply(modelName, postText, tone, apiKey);
        
        // Success!
        const finalReply = reply.length > 200 ? reply.substring(0, 197) + "..." : reply;
        output.value = finalReply;
        
        // SAVE TO MEMORY
        chrome.storage.local.set({ lastReply: finalReply });
        
        // Switch UI to Action Mode
        showActionButtons();
        
      } catch (innerError) {
        output.value = "Error: " + innerError.message;
        dot.className = "status-dot error";
      } finally {
        btn.innerText = "GENERATE REPLY";
        btn.style.opacity = "1";
      }
    });
  } catch (e) {
    output.value = "Error: " + e.message;
  }
});

// --- AI FUNCTIONS ---
async function findWorkingModel(key) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models`;
  const response = await fetch(url, { method: 'GET', headers: { 'x-goog-api-key': key } });
  if (!response.ok) throw new Error("Invalid API Key");
  const data = await response.json();
  const validModel = data.models.find(m => m.name.includes("flash"));
  return (validModel || data.models[0]).name.replace('models/', '');
}

async function generateReply(modelName, context, tone, key) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`;
  
  const promptText = `
    You are a professional freelancer.
    INPUT:
    Job Post: "${context}"
    Desired Tone: ${tone}
    
    INSTRUCTIONS:
    1. Detect the language of the Job Post.
    2. Write a reply IN THAT SAME LANGUAGE.
    3. Match the "${tone}" tone.
    4. Keep it under 150 characters.
    5. No hashtags. No generic greetings.
  `;

  const prompt = { contents: [{ parts: [{ text: promptText }] }] };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify(prompt)
  });

  const data = await response.json();
  if (data.error) throw new Error(data.error.message);
  return data.candidates[0].content.parts[0].text.trim();
}