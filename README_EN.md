# Chrome Timer — Web Page Scheduled Task Manager

A powerful Chrome extension that lets you create scheduled tasks on web pages to automatically click elements or execute custom JavaScript scripts.

## Features

- **Element Picker** — Visual picking mode to select page elements and generate CSS selectors with one click
- **Cron Scheduling** — 6-field Cron expressions (sec min hour day month weekday) for flexible execution frequency
- **JS Script Editor** — Built-in code editor to write arbitrary JavaScript that runs in the page context
- **Per-Domain Management** — Tasks are grouped by website domain, isolated from each other
- **Dynamic Clock Icon** — Extension icon displays the current time in real time
- **Compact / Full Selector** — Toggle between compact and full selector generation modes

## Installation

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable **Developer mode** in the top-right corner
4. Click **Load unpacked** and select the project root directory
5. The extension icon appears in the toolbar — you're ready to go

## Usage

### Creating a Scheduled Task

1. Click the extension icon to open the popup panel
2. The current page domain is shown at the top
3. Click **Add Task** to create a new task
4. Configure the Cron expression (default: every 3 seconds)
5. Write or modify the execution script

### Selecting a Page Element

1. Click the **Pick Element** button
2. Hover over the target element — it will be highlighted
3. Click the element to auto-fill the selector into the script
4. Press `Esc` to cancel selection

### Execution Script

Default script template:

```javascript
const el = document.querySelector("{{SELECTOR}}");
if (el) el.click();
```

`{{SELECTOR}}` is automatically replaced with the actual CSS selector after picking an element. You can also write any custom script.

## Project Structure

```
chrome_timer_click_helper/
├── manifest.json        # Extension manifest (Manifest V3)
├── background.js        # Background Service Worker (clock icon, etc.)
├── content.js           # Content Script (element picking, task execution)
├── editor-module.js     # Built-in code editor module
├── popup.html           # Popup panel page
├── popup.css            # Popup panel styles
├── popup.js             # Popup panel logic
├── icons/               # Extension icons
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── docs/                # Docs and image assets
    ├── alipay.jpg       # Alipay QR code
    └── wechat.jpg       # WeChat Pay QR code
```

## Tech Stack

- Chrome Extension Manifest V3
- Vanilla JavaScript (no framework dependencies)
- chrome.storage.local for persistent storage
- CSS selectors + DOM manipulation

## Sponsor / Support

If this project helps you, consider buying me a coffee ☕

<div align="center">

| Alipay | WeChat |
|:---:|:---:|
| ![](docs/alipay.jpg) | ![](docs/wechat.png) |

</div>

## License

MIT License