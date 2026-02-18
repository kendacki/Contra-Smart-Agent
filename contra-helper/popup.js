document.addEventListener('DOMContentLoaded', () => {
  // 1. Load the API key securely
  chrome.storage.local.get(['geminiKey'], (result) => {
    if (result.geminiKey) document.getElementById('apiKey').value = result.geminiKey;
  });
});

// State variable to track if we are ready to copy
let isReplyReady = false;

document.getElementById('scanBtn').addEventListener('click', async () => {
  const btn = document.getElementById('scanBtn');
  const dot = document.getElementById('statusDot');
  const output = document.getElementById('output');
  
  // --- STATE 2: COPY MODE ---
  // If a reply is already generated, this button now acts as a "Copy" button
  if (isReplyReady) {
    navigator.clipboard.writeText(output.value).then(() => {
      // Visual Feedback
      btn.innerText = "COPIED! ✅";
      btn.style.background = "linear-gradient(135deg, #00ff88 0%, #00cc6a 100%)"; // Green gradient
      
      // Reset after 2 seconds
      setTimeout(() => {
        btn.innerText = "GENERATE REPLY";
        btn.style.background = ""; // Revert to Gold CSS
        output.value = ""; // Clear output for next time
        isReplyReady = false;
      }, 2000);
    });
    return; // Stop here, don't generate again immediately
  }

  // --- STATE 1: GENERATE MODE ---
  
  // SANITIZATION
  let apiKey = document.getElementById('apiKey').value.trim();

  if (!apiKey) {
    output.value = "Error: Please enter your Google Gemini API Key first.";
    return;
  }
  
  // Save locally
  chrome.storage.local.set({ geminiKey: apiKey });

  // UI: Set to Loading State
  btn.innerText = "ANALYZING...";
  btn.style.opacity = "0.7";
  dot.className = "status-dot active"; // Green dot
  output.value = "";

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    // Send message to content script
    chrome.tabs.sendMessage(tab.id, { action: "scan_page" }, async (response) => {
      
      // Handle connection errors
      if (chrome.runtime.lastError || !response || !response.success) {
        output.value = "Error: Please highlight text on the page first.\n\n(If it fails, refresh the page).";
        resetUI();
        return;
      }

      const postText = response.text.substring(0, 5000); 

      try {
        // Step 1: Find Model
        const modelName = await findWorkingModel(apiKey);
        
        // Step 2: Generate Reply
        const reply = await generateReply(modelName, postText, apiKey);
        
        // Step 3: Display Result (150 chars limit)
        output.value = reply.length > 160 ? reply.substring(0, 157) + "..." : reply;
        
        // UI SWITCH: Change button to "COPY"
        btn.innerText = "COPY TO CLIPBOARD 📋";
        isReplyReady = true; // Enable copy mode
        
      } catch (innerError) {
        console.error(innerError);
        output.value = "AI Error: " + innerError.message;
        dot.className = "status-dot error"; // Red dot
        resetUI();
      } finally {
        btn.style.opacity = "1";
        setTimeout(() => dot.className = "status-dot", 3000); 
      }
    });

  } catch (e) {
    console.error(e);
    output.value = "System Error: " + e.message;
    resetUI();
  }
});

function resetUI() {
  const btn = document.getElementById('scanBtn');
  const dot = document.getElementById('statusDot');
  btn.innerText = "GENERATE REPLY";
  btn.style.opacity = "1";
  dot.className = "status-dot error";
  isReplyReady = false;
}

// --- SECURE API FUNCTIONS ---

async function findWorkingModel(key) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models`;
  const response = await fetch(url, {
    method: 'GET',
    headers: { 'x-goog-api-key': key }
  });

  if (!response.ok) throw new Error("Invalid API Key");
  const data = await response.json();

  const validModel = data.models.find(m => 
    m.supportedGenerationMethods.includes("generateContent") && 
    m.name.includes("flash")
  );
  
  return (validModel || data.models[0]).name.replace('models/', '');
}

async function generateReply(modelName, context, key) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`;
  
  const prompt = {
    contents: [{
      parts: [{
        text: `You are a real human freelancer.
        TASK: Read the text inside <job_post> tags.
        <job_post>${context}</job_post>
        ACTION: Write a 1-sentence casual DM reply.
        Tone: Friendly, lower-case, no hashtags.
        Constraint: Strictly under 150 characters.`
      }]
    }]
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'x-goog-api-key': key 
    },
    body: JSON.stringify(prompt)
  });

  const data = await response.json();
  if (data.error) throw new Error(data.error.message);
  
  return data.candidates[0].content.parts[0].text.trim();
}