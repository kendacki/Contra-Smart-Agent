# Contra Smart Agent (Gold Edition) 🤖✨

A premium Chrome Extension designed to help freelancers on [Contra.com](https://contra.com) land jobs faster. 

This agent uses **Google Gemini AI** to scan job posts and automatically generate **friendly, human-like, and punchy (under 70 chars)** replies instantly. It features a sleek **Dark Mode & Gold UI** for a premium experience.

![Extension Preview](https://via.placeholder.com/600x300?text=Contra+Smart+Agent+Preview) 
*(Add a screenshot of your extension here if you like!)*

## 🌟 Features

* **Smart Context Scanning:** Highlights job posts to understand exactly what the client needs.
* **Human-Like AI:** Generates casual, friendly, lower-case replies that sound like a real person, not a robot.
* **Strict Character Limit:** Enforces a ~70 character limit for punchy, DM-style pitches.
* **Premium UI:** Deep charcoal background with luxurious Gold gradients.
* **Model Auto-Switching:** Automatically finds the best available Google Gemini model (Flash/Pro) for your key.

## 🛠️ Prerequisites

Before you install, you will need a **Google Gemini API Key**.
1.  Go to [Google AI Studio](https://aistudio.google.com/app/apikey).
2.  Click **"Create API Key"**.
3.  Copy the key (you will paste it into the extension later).
*Note: The free tier is sufficient for personal use.*

## 🚀 Installation Guide

Since this is a custom developer tool, you will install it using Chrome's "Developer Mode".

1.  **Download the Code:**
    * Clone this repository or download the ZIP file and extract it to a folder.
2.  **Open Chrome Extensions:**
    * Type `chrome://extensions` in your browser URL bar and hit Enter.
3.  **Enable Developer Mode:**
    * Toggle the switch in the **top right corner** to **ON**.
4.  **Load the Extension:**
    * Click the **"Load unpacked"** button (top left).
    * Select the folder where you saved these files.
5.  **Pin It:**
    * Click the **Puzzle Piece** icon in your Chrome toolbar and pin **Contra Smart Agent**.

## 💡 How to Use

1.  **Navigate:** Go to [Contra.com](https://contra.com) and find a job post or feed item.
2.  **Highlight:** Use your mouse to **highlight the text** of the job description you want to reply to.
3.  **Open:** Click the **Contra Agent Icon** (Gold/Black icon) in your toolbar.
4.  **Setup (First Time Only):** Paste your **Gemini API Key** into the input box.
5.  **Generate:** Click the **"GENERATE REPLY"** button.
6.  **Send:** Copy the generated text and paste it into the Contra message box!

## ⚠️ Troubleshooting

* **"Please highlight text first":**
    * Make sure you have actually highlighted text on the webpage.
    * If it still fails, **refresh the Contra page** and try again. The extension needs to reload the page to "see" it.
* **"API Key Error":**
    * Ensure you copied the key correctly from Google AI Studio.
    * Ensure your Google Cloud billing/account is active (even for the free tier).
* **Icon not showing:**
    * Go to `chrome://extensions` and click the **Refresh (circular arrow)** icon on the extension card.

## 📜 License

This project is open-source. Feel free to modify the `popup.js` prompt to change the personality or character limit!

---
*Built with ❤️ for the Freelance Community.*