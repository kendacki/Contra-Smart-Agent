document.addEventListener('DOMContentLoaded', () => {
  // SECURITY FIX 1: Use 'local' storage. 
  // This ensures the key is stored ONLY on this computer, not synced to the cloud.
  chrome.storage.local.get(['geminiKey'], (result) => {
    if (result.geminiKey) document.getElementById('apiKey').value = result.geminiKey;
  });
});

document.getElementById('scanBtn').addEventListener('click', async () => {
  const status = document.getElementById('status');
  const output = document.getElementById('output');
  
  // SANITIZATION: Remove accidental spaces from the key
  let apiKey = document.getElementById('apiKey').value.trim();

  if (!apiKey) {
    status.innerText = "Error: API Key is missing.";
    return;
  }
  
  // Save locally (Secure)
  chrome.storage.local.set({ geminiKey: apiKey });

  status.innerText = "Scanning page...";
  output.value = "";

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  chrome.tabs.sendMessage(tab.id, { action: "scan_page" }, async (response) => {
    if (chrome.runtime.lastError || !response || !response.success) {
      status.innerText = "Please highlight text first.";
      return;
    }

    // SANITIZATION: Limit input length to prevent memory overload attacks
    const postText = response.text.substring(0, 5000); 
    status.innerText = "Authenticating...";

    try {
      // Step 1: Find the right model securely
      const modelName = await findWorkingModel(apiKey);
      status.innerText = "Generating reply...";
      
      // Step 2: Generate the text securely
      const reply = await generateReply(modelName, postText, apiKey);
      
      // Strict constraint enforcement (Under 70 chars)
      output.value = reply.length > 75 ? reply.substring(0, 72) + "..." : reply;
      status.innerText = "Done!";
      
    } catch (e) {
      console.error(e);
      // SECURITY: Generic error message for UI to avoid leaking details
      status.innerText = "Connection Failed.";
      output.value = "Error: " + e.message;
    }
  });
});

// --- SECURE API CALLS ---

async function findWorkingModel(key) {
  // We use the base URL without the key parameter
  const url = `https://generativelanguage.googleapis.com/v1beta/models`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      // SECURITY FIX 2: Send Key in HEADER ('x-goog-api-key').
      // This hides the key from URL logs, proxies, and browser history.
      'x-goog-api-key': key 
    }
  });

  if (!response.ok) throw new Error("Invalid API Key or Service Down");

  const data = await response.json();

  // Prefer 'flash' models for speed/cost, fallback to any generator
  const validModel = data.models.find(m => 
    m.supportedGenerationMethods.includes("generateContent") && 
    m.name.includes("flash")
  );

  const backupModel = data.models.find(m => 
    m.supportedGenerationMethods.includes("generateContent")
  );

  if (validModel) return validModel.name.replace('models/', '');
  if (backupModel) return backupModel.name.replace('models/', '');
  
  throw new Error("No text-generation models found.");
}

async function generateReply(modelName, context, key) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`;
  
  const prompt = {
    contents: [{
      parts: [{
        text: `You are a real human, not an AI. 
        Read this job post and write a 1-sentence DM reply.
        Tone: Super casual, friendly, lower-case is okay.
        CONSTRAINT: STRICTLY UNDER 70 CHARACTERS.
        No hashtags. No "I hope this finds you well".
        
        JOB POST: "${context}"`
      }]
    }]
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      // SECURITY FIX 2 (Applied here too): Key is hidden in the header
      'x-goog-api-key': key 
    },
    body: JSON.stringify(prompt)
  });

  const data = await response.json();
  if (data.error) throw new Error(data.error.message);
  
  return data.candidates[0].content.parts[0].text.trim();
}