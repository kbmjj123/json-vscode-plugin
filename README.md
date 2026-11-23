# JSON Toolbox — VS Code extension

A local-first JSON toolkit for VS Code, built by [jsontoolbox.cc](https://jsontoolbox.cc). Parsing, formatting and conversion run in the extension host; the rich editor renders inside a webview. No uploads to us, no telemetry, no accounts.

Source: [github.com/kbmjj123/json-vscode-plugin](https://github.com/kbmjj123/json-vscode-plugin)

## Install

- **Visual Studio Marketplace** — in VS Code's Extensions view, search `JSON Toolbox` and pick the one published by `kbmjj123` (`kbmjj123.json-toolbox`).
- **Open VSX** — for VSCodium, Cursor or code-server, search `JSON Toolbox` on open-vsx.org and install from the extension page.

## Features

### Rich editor for `.json` files

Opening a `.json` file opens the JSON Toolbox editor by default. It is a full editing surface powered by the [JSON editor](https://github.com/kbmjj123/json-editor) used on jsontoolbox.cc:

- CodeMirror source editor with a live tree, split view and table view for arrays of objects
- Node editing (rename / retype / add / remove / move), bulk value set and 100-step undo/redo
- Search by key, value, path, all or JSONPath; value insights for colours, timestamps, JWT, base64 and URLs
- Copy, download, error line + column, scroll sync and configurable indentation
- Edits made in the editor are written back to the file (VS Code save / dirty state / undo stack keep working)

**Getting the built-in editor back.** Run `JSON Toolbox: Reopen with Built-in Editor` from the Command Palette, or use VS Code's own `View: Reopen Editor With...`. To stop taking over `.json` files for good, set:

```json
"workbench.editorAssociations": { "*.json": "default" }
```

### Commands

Run from the Command Palette (`Ctrl/Cmd+Shift+P`, type `JSON Toolbox`):

| Command | Behaviour |
|---|---|
| `JSON Toolbox: Format JSON` | Re-indent the current document or selection with the configured indent. |
| `JSON Toolbox: Minify JSON` | Collapse the current document or selection to a single line. |
| `JSON Toolbox: Validate JSON` | Report the first syntax error and its line/column. |
| `JSON Toolbox: JSON to YAML` | Convert the current document from JSON to YAML. |
| `JSON Toolbox: YAML to JSON` | Convert the current document from YAML to JSON. |
| `JSON Toolbox: JSON to CSV` | Turn an array of objects into CSV in a new untitled document. |
| `JSON Toolbox: JSONPath Query` | Evaluate a JSONPath expression and print matches to the Output channel. |
| `JSON Toolbox: Open in Editor Panel` | Open the rich editor in a side panel for the active JSON document. |
| `JSON Toolbox: Reopen with Built-in Editor` | Switch the active file back to VS Code's text editor. |

Syntax errors are also reported as diagnostics (squiggles) on every JSON document, refreshed on open and save, with a 300 ms debounce while typing. Files over 2 MB are skipped by the diagnostics pass. Files over 1 MB open as a truncated, read-only preview in the rich editor — use the built-in editor for the full document.

### Settings

| Setting | Values | Default | Used by |
|---|---|---|---|
| `jsonToolbox.theme` | `auto` / `light` / `dark` | `auto` | rich editor |
| `jsonToolbox.indent` | `2` / `4` / `tab` | `2` | Format / YAML to JSON / rich editor |
| `jsonToolbox.defaultView` | `editor` / `tree` / `both` / `table` | `both` | rich editor |
| `jsonToolbox.locale` | `auto` / `en` / `zh` | `auto` | messages + rich editor |
| `jsonToolbox.imagePreview` | `true` / `false` | `true` | rich editor |

`auto` locale follows the VS Code display language (`zh*` → 中文, otherwise English). The published editor package currently ships English and Chinese dictionaries only.

## Implementation notes

- Formatting, minifying, validation, CSV and JSONPath come from [`@kbmjj123/json-editor`](https://github.com/kbmjj123/json-editor)'s pure core (`@kbmjj123/json-editor/core`). No core code is duplicated.
- The webview loads the package's single-file CDN build (`json-editor.iife.js` + CSS) and mounts it with `window.JsonEditor.defineJsonEditor`. It is a local asset — no CDN request at runtime.
- The webview has a per-instance nonce and a restrictive CSP: `default-src 'none'`, local assets only, plus `object-src` / `base-uri` / `form-action` / `worker-src` set to `'none'`. When image preview is on, URLs found inside the JSON can also be requested.
- A debounced, echo-guarded bridge syncs webview edits into the `TextDocument`; external document changes are pushed back into the editor.
- Commands resolve their target through a shared document tracker so they keep working while a file is open in the custom editor (`window.activeTextEditor` is `undefined` there).
- `yaml` is used for the JSON ↔ YAML commands.

## Privacy

Nothing is sent to jsontoolbox.cc: there is no telemetry, no analytics and no remote code. All processing is local.

With **imagePreview** on (the default), image / audio / video / PDF URLs found in the JSON are loaded by the webview, and "Download all" fetches those URLs. Those requests go to the servers hosting the URLs and can expose tokens embedded in them. Turn the setting off to disable every third-party media request. Inline `data:` / base64 images never make a request.

## Development

```bash
pnpm install
pnpm build        # esbuild host + webview, copy editor assets
pnpm typecheck
pnpm test
pnpm package      # .vsix (uses --no-dependencies: runtime deps are bundled)
```

Press `F5` in VS Code to launch an Extension Development Host with the plugin loaded. Release steps for both marketplaces are in [PUBLISH.md](https://github.com/kbmjj123/json-vscode-plugin/blob/main/PUBLISH.md).

### Manual verification

1. Open a `.json` file → the JSON Toolbox editor loads, not the built-in text editor.
2. Edit in the source pane → the file on disk changes after save; VS Code shows the tab as dirty.
3. Edit the same file from another text editor → the webview updates without a reload.
4. Introduce a syntax error → squiggles appear on the offending line.
5. Run `Reopen with Built-in Editor` → the standard text editor opens the same file.
6. Run `Open in Editor Panel` → the editor opens beside the current tab.
7. Change theme / indent / view / language in Settings → the open editor reacts without reload.
8. DevTools Network: no requests to jsontoolbox.cc; with image preview off, no third-party requests.
9. Open a >1 MB JSON file → a truncated read-only preview is shown with a warning; edits are never written back.

## License

MIT — see [LICENSE](https://github.com/kbmjj123/json-vscode-plugin/blob/main/LICENSE).
