chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  
  // --- ACTION 0: PING (Check Connection) ---
  if (request.action === "ping") {
    sendResponse({ status: "alive" });
    return;
  }

  // --- ACTION 1: SCANNING (Read) ---
  if (request.action === "scan_page") {
    const selection = window.getSelection().toString().trim();
    if (selection) {
      sendResponse({ success: true, text: selection });
    } else {
      sendResponse({ success: false });
    }
  }

  // --- ACTION 2: GHOSTWRITER (Write) ---
  if (request.action === "ghostwrite") {
    const textToInsert = request.text;
    
    // THE SMART HUNTER LOGIC 🎯
    
    // Priority 1: Any visible <textarea>
    let targetBox = Array.from(document.querySelectorAll('textarea'))
      .find(el => isVisible(el));
      
    // Priority 2: Any visible contenteditable div (Modern React/Rich Text Editors)
    if (!targetBox) {
      targetBox = Array.from(document.querySelectorAll('[contenteditable="true"], [role="textbox"]'))
        .find(el => isVisible(el));
    }

    if (targetBox) {
      // VISUAL FEEDBACK: Flash the box green
      targetBox.style.transition = "box-shadow 0.3s";
      targetBox.style.boxShadow = "0 0 0 4px #00ff88";
      setTimeout(() => targetBox.style.boxShadow = "none", 1000);

      targetBox.focus();

      // INSERTION STRATEGY (React-Safe)
      if (targetBox.tagName === 'TEXTAREA' || targetBox.tagName === 'INPUT') {
          // Standard Inputs
          const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value").set;
          if (nativeSetter) {
              nativeSetter.call(targetBox, textToInsert);
          } else {
              targetBox.value = textToInsert;
          }
      } else {
          // Rich Text Divs
          targetBox.innerText = textToInsert; 
      }

      // TRIGGER EVENTS
      targetBox.dispatchEvent(new Event('input', { bubbles: true }));
      targetBox.dispatchEvent(new Event('change', { bubbles: true }));
      targetBox.dispatchEvent(new Event('focus', { bubbles: true }));

      sendResponse({ success: true });
    } else {
      console.error("Contra Agent: No valid text box found.");
      sendResponse({ success: false, error: "No text box found" });
    }
  }
});

// Helper: Check if an element is actually visible to the user
function isVisible(elem) {
  if (!elem) return false;
  const style = window.getComputedStyle(elem);
  return style.display !== 'none' && 
         style.visibility !== 'hidden' && 
         style.opacity !== '0' &&
         elem.offsetWidth > 0 && 
         elem.offsetHeight > 0;
}