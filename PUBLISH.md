# VSCode 插件发布流程

适用于每次发版。发布动作在你本地执行——PAT 不进仓库，也不在本工作区环境触发。GitHub Release 由 tag 自动创建；两个市场需手动上架。

## 1. 前置检查

- [ ] `package.json` 的 `version` 与本次 tag **完全一致**（tag 形如 `v0.1.0`，校验时会去掉 `v`）
- [ ] `CHANGELOG.md` 已有该版本条目
- [ ] `pnpm typecheck` / `pnpm test` / `pnpm package` 均通过
- [ ] `dist/webview/` 含 `json-editor.iife.js` / `.iife.css` / `main.js`（`pnpm build` 会拷贝）
- [ ] 没有把 `VSCE_PAT` / `OVSX_PAT` 写进任何文件

## 2. 账号前置（只需一次）

### Visual Studio Marketplace

- Publisher `kbmjj123` 已存在（2023-02-17 注册），需确认是你本人账号且有发布权限。
- 在 [Azure DevOps](https://dev.azure.com) → 用户头像 → Personal access tokens 新建 token：
  - Organization: **All accessible organizations**
  - Scopes: **Marketplace → Manage**
  - Expiration: 按需（建议 90 天）
  - 复制 token，本地设 `VSCE_PAT`。

### Open VSX

- namespace `kbmjj123` **尚未注册**（已查 registry 为 not found）。先创建：

  ```bash
  export OVSX_PAT=<open-vsx-token>
  pnpm exec ovsx create-namespace kbmjj123 -p "$OVSX_PAT"
  ```

- token 在 [open-vsx.org](https://open-vsx.org) → 登录 → Account → Access Tokens 生成。
- 用 `pnpm exec ovsx verify-pat kbmjj123 -p "$OVSX_PAT"` 确认可发布。
- Open VSX 与 MS Marketplace 的账号体系独立，两个 PAT 都要有。

## 3. 打包与上架

```bash
pnpm install --frozen-lockfile
pnpm typecheck && pnpm test
pnpm package                       # 产出 json-toolbox-<version>.vsix

export VSCE_PAT=<azure-devops-token>
export OVSX_PAT=<open-vsx-token>
pnpm publish:both                  # 一份 .vsix 同时发两个市场
```

只发其中一个：

```bash
pnpm publish:ms                    # 需要 VSCE_PAT
pnpm publish:ovsx                  # 需要 OVSX_PAT
```

脚本会先检查 `.vsix` 是否存在、PAT 是否设置，缺一即退出，不会误发。

## 4. 打 tag 生成 GitHub Release

```bash
git commit -am "release: 0.1.0"
git tag v0.1.0
git push origin main --tags
```

`.github/workflows/release.yml` 随即运行：校验 tag 与 `package.json` 版本一致 → typecheck/test → `pnpm package` → 生成 `SHA256SUMS.txt` → 用该 tag 建 Release 并上传 `.vsix` 与校验文件。

> CI **不会**自动上架市场（PAT 留在本地）。Release 标题为 tag 名，release notes 自动生成。

## 5. Release notes 模板

```
# JSON Toolbox for VS Code 0.1.0

First release of the JSON Toolbox VS Code extension.

## Features
- Rich editor for .json files (source / tree / split / table views, search, value insights, node editing).
- Format, minify, validate, JSON <> YAML, JSON to CSV and JSONPath commands.
- Diagnostics with line/column, 300 ms debounce, skipped for files over 2 MB.
- Read-only truncated preview for files over 1 MB.
- 100% local: no telemetry, no uploads to jsontoolbox.cc.

See README for the full feature list and the built-in-editor escape hatch.
```

## 6. 上架后验证

- [ ] VS Code 扩展市场搜索 `JSON Toolbox` 能找到 `kbmjj123.json-toolbox`，装得上
- [ ] Open VSX 搜索同样能找到，装得上（Cursor / VSCodium 可用）
- [ ] 打开 `.json` → 自定义编辑器加载；`Reopen with Built-in Editor` 能退回
- [ ] 命令面板能调用 9 个命令
- [ ] 两处商店页的 logo、README、权限与隐私描述一致
- [ ] Release 附件的 `.vsix` 可通过 `SHA256SUMS.txt` 校验

## 7. 后续更新

1. 改代码 → 递增 `package.json` 的 `version` 并补 `CHANGELOG.md`
2. 重复第 3 步上架（两个市场都要发）
3. 打 `v<version>` tag 推送，生成 Release

> 两个市场的版本应当一致；若某一边发布失败，记下并在另一边补发，不要跳过版本号。
