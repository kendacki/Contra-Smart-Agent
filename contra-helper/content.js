chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "scan_page") {
    
    // STRATEGY 1: Get user-highlighted text (Most Accurate)
    let selectedText = window.getSelection().toString().trim();
    
    if (selectedText && selectedText.length > 20) {
      sendResponse({ success: true, text: selectedText, method: "highlight" });
      return;
    }

    // STRATEGY 2: Find the post in the center of the screen
    // We look for common text containers used in feeds
    const potentialPosts = document.querySelectorAll('div, p, article');
    let bestCandidate = "";
    let maxLen = 0;

    potentialPosts.forEach(el => {
      const rect = el.getBoundingClientRect();
      // Check if element is largely visible in viewport
      if (rect.top >= 0 && rect.bottom <= window.innerHeight) {
        // We want substantial text blocks (likely the job description)
        if (el.innerText.length > 100 && el.innerText.length < 2000) {
           if (el.innerText.length > maxLen) {
             maxLen = el.innerText.length;
             bestCandidate = el.innerText;
           }
        }
      }
    });

    if (bestCandidate) {
      sendResponse({ success: true, text: bestCandidate, method: "auto-detect" });
    } else {
      sendResponse({ success: false, text: "No post detected. Please highlight the text you want to reply to." });
    }
  }
});