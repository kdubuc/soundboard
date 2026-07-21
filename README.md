# 🎛️ Web Soundboard

A fully customizable, browser-based soundboard powered by a simple JSON configuration file.
Built with [Vite](https://vitejs.dev/) and [Svelte](https://svelte.dev/), this soundboard allows you to define your own sounds, categories, and behavior without touching any code.
Ideally suited for role-playing games, shows, or any scenario where you need quick access to sound effects.

## Features

- **JSON-driven configuration** — define your sounds, categories, and behavior in a single JSON file
- **Multiple soundboards** — load and switch between several soundboard configurations via tabs
- **Keyboard shortcuts** — bind sounds to keyboard keys using `data_key` for quick-use
- **Loop & interrupt modes** — loop ambient sounds or interrupt all playing sounds with a single trigger
- **Progress bar** — visual playback progress indicator on each sound button
- **WebSocket support** — trigger sounds remotely by sending messages to a WebSocket endpoint

## Usage

### 1. Open the soundboard (dev mode)

In development environment, run `npm run dev` to start a local server and open the soundboard in your browser.

### 2. Load a configuration

Click the file input in the top navigation bar and select a JSON configuration file. The soundboard will be built dynamically from the file.

### 3. Play sounds

Click any sound button, or press its assigned keyboard key (if a `data_key` is defined).

## Configuration Format

Soundboard configurations are plain JSON files. Here's the structure:

```json
{
    "_name": "Test sample",
    "_description": "This is a sample soundboard configuration for testing purposes.",
    "sections": {
        "general": [
            { "title": "Pygmy Shrew", "data_key": "A", "sound": "https://sound-effects-media.bbcrewind.co.uk/mp3/NHU05085149.mp3" },
            { "title": "Atmospheres Open Field", "sound": "https://sound-effects-media.bbcrewind.co.uk/mp3/07028064.mp3", "looped": true },
            { "title": "Heavy Explosion", "sound": "https://sound-effects-media.bbcrewind.co.uk/mp3/07037326.mp3", "interrupt": true }
        ]
    }
}
```