# 🎛️ Web Soundboard

A fully customizable, browser-based soundboard powered by a simple JSON configuration file. No server required — just open the HTML file in your browser and load your sounds.

## ✨ Features

- **JSON-driven configuration** — define your sounds, categories, and behavior in a single JSON file
- **Multiple soundboards** — load and switch between several soundboard configurations via tabs
- **Keyboard shortcuts** — bind sounds to keyboard keys using `data_key` for quick-use
- **Loop & interrupt modes** — loop ambient sounds or interrupt all playing sounds with a single trigger
- **Progress bar** — visual playback progress indicator on each sound button
- **WebSocket support** — trigger sounds remotely by sending messages to a WebSocket endpoint
- **Persistent sessions** — loaded configurations are saved in `localStorage` and restored on next visit

## 🚀 Usage

### 1. Open the soundboard

Open `src/index.html` in any modern browser. No build step or server needed.

### 2. Load a configuration

Click the file input in the top navigation bar and select a JSON configuration file. The soundboard will be built dynamically from the file.

### 3. Play sounds

Click any sound button, or press its assigned keyboard key (if a `data_key` is defined).

## 🗂️ Configuration Format

Soundboard configurations are plain JSON files. Here's the structure:

```json
{
    "_name": "My Soundboard",
    "_description": "A short description displayed in the notification toast.",
    "_websocket_url": "ws://localhost:8080",
    "category_name": [
        {
            "title": "My Sound",
            "data_key": "A",
            "sound": "https://example.com/sound.mp3",
            "looped": false,
            "interupt": false
        }
    ]
}