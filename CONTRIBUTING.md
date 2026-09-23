# Contributing to Chrome Timer

Thank you for your interest in contributing! 🎉

## How to Contribute

### Report Bugs

- Open a [GitHub Issue](https://github.com/leeuoy/chrome_timer_auto_click_helper/issues/new)
- Include: Chrome version, OS, steps to reproduce, expected vs actual behavior

### Suggest Features

- Open a [GitHub Issue](https://github.com/leeuoy/chrome_timer_auto_click_helper/issues/new) with the label `enhancement`
- Describe the use case and expected behavior

### Submit Code

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes
4. Test manually by loading the extension in `chrome://extensions/`
5. Commit with a clear message: `git commit -m "Add: description of change"`
6. Push to your fork: `git push origin feature/my-feature`
7. Open a Pull Request against the `main` branch

### Code Style

- Vanilla JavaScript (no framework)
- Use `'use strict'` in all JS files
- 2-space indentation
- JSDoc comments for public functions
- Keep the IIFE wrapper pattern: `(function () { ... })();`

### Project Structure

| File | Purpose |
|---|---|
| `manifest.json` | Extension manifest (Manifest V3) |
| `background.js` | Service Worker (clock icon, lifecycle) |
| `content.js` | Content Script (element picker, task runner) |
| `editor-module.js` | Built-in code editor |
| `popup.html/css/js` | Popup panel UI |

## Questions?

Feel free to open a [Discussion](https://github.com/leeuoy/chrome_timer_auto_click_helper/discussions) or Issue.