document.addEventListener('DOMContentLoaded', () => {
  // SECURITY: Local storage only (Key stays on your device)
  chrome.storage.local.get(['geminiKey'], (result) => {
    if (result.geminiKey) document.getElementById('apiKey').value = result.geminiKey;
  });
});

document.getElementById('scanBtn').addEventListener('click', async () => {
  const status = document.getElementById('status');
  const output = document.getElementById('output');
  
  // Sanitize input
  let apiKey = document.getElementById('apiKey').value.trim();

  if (!apiKey) {
    status.innerText = "Error: API Key is missing.";
    return;
  }
  
  // Save locally
  chrome.storage.local.set({ geminiKey: apiKey });

  status.innerText = "Scanning page...";
  output.value = "";

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  chrome.tabs.sendMessage(tab.id, { action: "scan_page" }, async (response) => {
    if (chrome.runtime.lastError || !response || !response.success) {
      status.innerText = "Please highlight text first.";
      return;
    }

    // Limit input size for security
    const postText = response.text.substring(0, 5000); 
    status.innerText = "Drafting reply...";

    try {
      const modelName = await findWorkingModel(apiKey);
      const reply = await generateReply(modelName, postText, apiKey);
      
      // UPDATED CONSTRAINT: 150 Characters
      // We give it a tiny buffer (160) before chopping it off
      output.value = reply.length > 160 ? reply.substring(0, 157) + "..." : reply;
      status.innerText = "Done!";
      
    } catch (e) {
      console.error(e);
      status.innerText = "Connection Failed.";
      output.value = "Error: " + e.message;
    }
  });
});

// --- SECURE API CALLS ---

async function findWorkingModel(key) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'x-goog-api-key': key // Key sent securely in header
    }
  });

  if (!response.ok) throw new Error("Invalid API Key or Service Down");

  const data = await response.json();

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
        // --- UPDATED PROMPT ---
        text: `You are a real human, not an AI. 
        Read this job post and write a casual DM reply.
        Tone: Friendly, professional but relaxed, lower-case is okay.
        CONSTRAINT: STRICTLY UNDER 150 CHARACTERS.
        No hashtags. No "I hope this finds you well".
        
        JOB POST: "${context}"`
      }]
    }]
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'x-goog-api-key': key // Key sent securely in header
    },
    body: JSON.stringify(prompt)
  });

  const data = await response.json();
  if (data.error) throw new Error(data.error.message);
  
  return data.candidates[0].content.parts[0].text.trim();
}