# Discord CSS Injector

## Professional Discord CSS Theme Injector with live editing, 13 built-in themes, and a Monaco-based editor.

[![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)](https://github.com/yourusername/Discord-Injector/releases)
[![Node](https://img.shields.io/badge/node-%3E%3D16.0.0-green.svg)](https://nodejs.org/)
[![License](https://img.shields.io/badge/license-MIT-orange.svg)](LICENSE)

### WARNING

You may be automatically logged out, we recommend remembering your data to log in later

### Features

- 13 Premium Themes – From Dark Purple to Cyberpunk Neon
- Live CSS Editor – Real‑time editing with Monaco Editor
- Hot Reload – Changes apply instantly to Discord
- Auto‑save – CSS changes saved automatically
- Safe Injection – Preserves original Discord files
- Full Logs – Complete activity logging
- Easy Restore – One command to revert everything

### Installation

#### Prerequisites

- Node.js 16.0.0 or higher
- Discord desktop application

#### Quick Start

```bash
# Clone the repository
git clone https://github.com/Philorganon/Discord-Injector.git
cd Discord-Injector

# Install dependencies
npm install

# Inject with a theme
npm start install

# Choose a theme and let it run!
```

### Available Themes

| Theme | Style | Colors |
|-------|-------|--------|
| test | Debug Theme | Purple/Pink (for testing) |
| midnight | Pure Black | #000000 |
| cyan | Cyberpunk | Cyan/Blue |
| dark‑purple | Premium | Purple Gradient |
| ocean‑blue | Deep Sea | Ocean Blue |
| forest‑green | Nature | Forest Green |
| sunset‑orange | Warm | Orange/Pink |
| rose‑pink | Soft Elegant | Pink |
| monochrome | Professional | Black/White |
| cyberpunk‑neon | Futuristic | Neon Pink/Cyan |
| nord | Arctic | Nordic Colors |
| dracula | Iconic | Purple/Pink |
| gruvbox | Retro | Warm Orange |

### Usage

#### Inject CSS Theme

```bash
npm start install
```
The process will detect Discord, let you choose a theme, close Discord, inject the CSS loader, and optionally reopen Discord.

#### Live CSS Editor

```bash
npm start editor
```
Opens a Monaco‑based editor where you can edit CSS in real‑time, auto‑save with **Ctrl+S**, and see changes instantly.

#### Restore Original Discord

```bash
npm start restore
```
Removes all injections and restores the original Discord client.

#### Test Installation

```bash
npm start test
```
Checks the Discord installation path, configuration loading, and current injection status.

### Project Structure

```
discord-injector-ultimate/
├─ index.js            # CLI entry point
├─ package.json        # Dependencies & scripts
├─ config.json         # Configuration file
├─ src/
│  ├─ finder.js       # Discord path detection
│  ├─ process.js      # Process management
│  ├─ backup.js       # Backup system
│  ├─ injector.js     # Core injection logic
│  ├─ websocket.js    # Live editor server
│  ├─ logger.js       # Logging system
│  ├─ config.js       # Config management
│  ├─ css/
│  │   ├─ base.css    # Base CSS template
│  │   └─ themes/
│  │       ├─ index.js
│  │       ├─ test.css
│  │       ├─ midnight.css
│  │       └─ ... (other themes)
│  └─ editor/
│       ├─ index.html
│       ├─ styles.css
│       └─ editor.js
├─ logs/               # Auto‑generated logs
├─ backups/            # Auto‑generated backups
└─ .gitignore
```

### How It Works

#### Injection Method
The injector backs up `app.asar` to `original.asar`, creates an `app/` folder containing a minimal `package.json`, an `index.js` that loads the original app and injects `custom.css`, and watches for CSS changes to trigger a reload.

#### Safety Features
- Automatic backups before any modification
- Preservation of `original.asar`
- Window destruction checks to avoid crashes
- Clean‑up on Discord close
- One‑command restore

### Creating Custom Themes

#### Method 1 – Live Editor
Run `npm start editor`, edit CSS, and save.

#### Method 2 – Add a Theme File
1. Create `src/css/themes/my-theme.css`
2. Write your CSS
3. Register it in `src/css/themes/index.js`:
```javascript
export const themes = {
    // existing themes …
    'my-theme': loadTheme('my-theme'),
};
```

#### Example CSS Structure
```css
:root {
    --background-primary: #000000 !important;
    --background-secondary: #0a0a0a !important;
}
.theme-dark { --background-primary: #000 !important; }
[class*="sidebar"] { background: #000000 !important; }
[class*="message"] { border-left: 3px solid #7289da !important; }
```

### Troubleshooting

- **CSS not applying**: Ensure Discord is fully closed, check DevTools console, look for `[Discord Injector]` logs, try the `test` theme.
- **Injection failed**: Close Discord, run as Administrator, inspect `logs/`, restore first.
- **Editor not loading**: Verify port 8765 is free, check browser console, run `npm start test`.
- **Restore issues**: Run as Administrator, manually delete `resources/app/` and rename `resources/original.asar` to `app.asar`.

### Logs
All actions are logged in `logs/` (injection, errors, file changes). Logs are automatically cleaned after 7 days.

### Important Notes
- Modifying the Discord client may violate Discord's Terms of Service; use at your own risk.
- Backups are stored in `backups/`.
- Discord updates can break injection; simply restore and re‑inject.
- The tool works on Windows, macOS, and Linux.

### Contributing
Contributions are welcome. You can add new themes, improve stability, add features, or fix bugs. Submit a pull request with a clear description.

### License
This project is licensed under the MIT License. See the `LICENSE` file for details.

### Credits
- Monaco Editor – Microsoft
- Commander.js – TJ Holowaychuk
- Chalk – Sindre Sorhus

---

Made with care for the Discord theming community.

If you find this project useful, please star the repository.


