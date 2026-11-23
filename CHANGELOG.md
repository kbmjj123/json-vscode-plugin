# Changelog

All notable changes to this extension are documented here.

## [0.1.0] — 2026-11-23

### Added

- Seven command-palette tools: Format, Minify, Validate, JSON to YAML, YAML to JSON, JSON to CSV and JSONPath Query.
- Diagnostics (squiggles) on every JSON document, refreshed on open, change and save with a 300 ms debounce for edits.
- Rich editor for `.json` files, opened by default via `CustomTextEditorProvider`, with source / tree / split / table views, search, value insights and node editing from `@kbmjj123/json-editor`.
- `Open in Editor Panel` command and `Reopen with Built-in Editor` command as an escape hatch from the custom editor.
- Five workspace settings: theme, indent, default view, locale (`auto` / `en` / `zh`) and image preview.
- Per-instance nonce and a restrictive webview CSP (`default-src 'none'`, no objects, base, forms or workers).
- Read-only truncated preview for files over 1 MB; diagnostics skipped for files over 2 MB.

### Limitations

- The published editor package currently ships English and Chinese dictionaries only; other VS Code display languages fall back to English.
- A truncated preview is not editable — open the file with the built-in editor for the full document.
- No telemetry, no accounts, no network calls to jsontoolbox.cc. With image preview on, URLs found in the JSON can be fetched by the webview.
