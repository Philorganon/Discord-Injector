<div align="center">

#  Discord CSS Injector

**Professional Discord theming with live editing, 13 built-in themes, and a Monaco-based editor.**

[![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)](https://github.com/Philorganon/Discord-Injector/releases)
[![Node](https://img.shields.io/badge/node-%3E%3D16.0.0-green.svg)](https://nodejs.org/)
[![License](https://img.shields.io/badge/license-MIT-orange.svg)](LICENSE)

</div>

---

> [!WARNING]
> Modifying the Discord client **may violate Discord's Terms of Service**. Use at your own risk.
> You may be automatically logged out — make sure to save your login credentials beforehand.

---

##  Features

- **13 Premium Themes** — From Dark Purple to Cyberpunk Neon
- **Live CSS Editor** — Real-time editing powered by Monaco Editor
- **Hot Reload** — Changes apply instantly without restarting Discord
- **Auto-save** — CSS changes are saved automatically as you type
- **Safe Injection** — Original Discord files are always backed up
- **Full Logging** — Complete activity logs with 7-day auto-cleanup
- **Easy Restore** — Revert everything with a single command

---

##  Installation

### Prerequisites

- [Node.js](https://nodejs.org/) `>= 16.0.0`
- Discord desktop application

### Quick Start

```bash
# Clone the repository
git clone https://github.com/Philorganon/Discord-Injector.git
cd Discord-Injector

# Install dependencies
npm install

# Run the injector
npm start install
```

Choose your theme and let it run!

---

##  Available Themes

| Theme | Style | Colors |
|-------|-------|--------|
| `test` | Debug | Purple / Pink |
| `midnight` | Pure Black | `#000000` |
| `cyan` | Cyberpunk | Cyan / Blue |
| `dark-purple` | Premium | Purple Gradient |
| `ocean-blue` | Deep Sea | Ocean Blue |
| `forest-green` | Nature | Forest Green |
| `sunset-orange` | Warm | Orange / Pink |
| `rose-pink` | Soft Elegant | Pink |
| `monochrome` | Professional | Black / White |
| `cyberpunk-neon` | Futuristic | Neon Pink / Cyan |
| `nord` | Arctic | Nordic Colors |
| `dracula` | Iconic | Purple / Pink |
| `gruvbox` | Retro | Warm Orange |

---

##  Usage

### Inject a CSS Theme

```bash
npm start install
```

The process will automatically detect Discord, let you choose a theme, close Discord, inject the CSS loader, and optionally reopen Discord.

### Open the Live CSS Editor

```bash
npm start editor
```

Opens a Monaco-based editor in your browser. Edit CSS in real-time and save with **Ctrl+S** to see changes instantly.

### Restore Original Discord

```bash
npm start restore
```

Removes all injections and fully restores the original Discord client.

### Test the Installation

```bash
npm start test
```

Verifies the Discord installation path, configuration, and current injection status.

---

##  How It Works

The injector:

1. **Backs up** `app.asar` → `original.asar`
2. **Creates** an `app/` directory with a minimal `package.json`
3. **Adds** an `index.js` that loads the original app and injects `custom.css`
4. **Watches** for CSS file changes and triggers a live reload

### Safety Features

- Automatic backups before any modification
- Original `app.asar` is always preserved
- Window destruction checks to prevent crashes
- Clean shutdown on Discord close
- One-command full restore

---

##  Creating Custom Themes

### Method 1 — Live Editor (Recommended)

```bash
npm start editor
```

Edit CSS directly in the browser editor and save with **Ctrl+S**.

### Method 2 — Add a Theme File

1. Create `src/css/themes/my-theme.css`
2. Write your CSS
3. Register it in `src/css/themes/index.js`:

```javascript
export const themes = {
    // ... existing themes
    'my-theme': loadTheme('my-theme'),
};
```

### Example CSS Structure

```css
:root {
    --background-primary: #000000 !important;
    --background-secondary: #0a0a0a !important;
}

.theme-dark {
    --background-primary: #000 !important;
}

[class*="sidebar"] {
    background: #000000 !important;
}

[class*="message"] {
    border-left: 3px solid #7289da !important;
}
```

---

##  Project Structure

```
discord-injector/
├── index.js               # CLI entry point
├── package.json           # Dependencies & scripts
├── config.json            # Configuration file
├── src/
│   ├── finder.js          # Discord path detection
│   ├── process.js         # Process management
│   ├── backup.js          # Backup system
│   ├── injector.js        # Core injection logic
│   ├── websocket.js       # Live editor server
│   ├── logger.js          # Logging system
│   ├── config.js          # Config management
│   ├── css/
│   │   ├── base.css       # Base CSS template
│   │   └── themes/
│   │       ├── index.js
│   │       ├── test.css
│   │       ├── midnight.css
│   │       └── ...        # Other themes
│   └── editor/
│       ├── index.html
│       ├── styles.css
│       └── editor.js
├── logs/                  # Auto-generated logs (7-day retention)
└── backups/               # Auto-generated backups
```

---

##  Troubleshooting

| Problem | Solution |
|---------|----------|
| **CSS not applying** | Ensure Discord is fully closed → check DevTools console for `[Discord Injector]` logs → try the `test` theme |
| **Injection failed** | Close Discord → run as Administrator → inspect `logs/` → try `npm start restore` first |
| **Editor not loading** | Verify port `8765` is free → check browser console → run `npm start test` |
| **Restore issues** | Run as Administrator → manually delete `resources/app/` and rename `resources/original.asar` back to `app.asar` |

> **Note:** Discord updates can break the injection. Simply run `npm start restore`, then re-inject.

---

##  Logs

All activity is recorded in `logs/` — including injections, errors, and file changes. Logs are automatically cleaned up after **7 days**.

---

##  Contributing

Contributions are welcome! You can:

- Add new themes
- Improve stability
- Add new features
- Fix bugs

Please submit a pull request with a clear description of your changes.

---

##  License

This project is licensed under the **MIT License**. See the [`LICENSE`](LICENSE) file for details.

---

##  Credits

- [Monaco Editor](https://microsoft.github.io/monaco-editor/) — Microsoft
- [Commander.js](https://github.com/tj/commander.js/) — TJ Holowaychuk
- [Chalk](https://github.com/chalk/chalk) — Sindre Sorhus

---

<div align="center">

If you find this project useful, please ⭐ **star the repository**!

</div>
