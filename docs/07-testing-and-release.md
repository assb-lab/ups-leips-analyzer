# Testing and Release

## Test Policy

- ドメイン計算は純粋関数としてunit testで確認する。
- parserはコミット可能な合成fixtureで確認し、`sample/` に依存しない。
- storeはfake-indexeddbでDexie roundtripを確認する。
- UIはTesting Libraryで主要ラベルと結果表示を確認する。
- menu、cursor、plot操作はTesting Libraryとunit helperで、表示ラベルとviewport変換を固定する。

## Gates

```sh
vp check
vp test
vp test --coverage
vp build
pnpm binary:build
pnpm binary:build:darwin-arm64
pnpm binary:build:darwin-amd64
pnpm binary:build:windows-x64
pnpm binary:build:macos-app:arm64
```

## Manual Smoke

1. `vp dev` で起動する。
2. demo datasetが表示される。
3. UPS/LEIPS/REELS計算結果とBand Diagramが表示される。
4. Project gzip export/importとDelete projectが動く。
5. Top menuと背景右クリックmenuが表示される。
6. Band Diagramのズーム、パン、ダブルクリックリセットが動く。
7. Goバイナリで `/` と `/assets/...` が返る。
8. macOS `.app` は `Contents/Resources/favicon.icns`、`CFBundleIconFile`、`LSUIElement=true` を持つ。
9. macOS `.app` zipには `._*` AppleDouble fileを含めず、app bundle全体がad-hoc署名されている。
10. macOS `.app` をFinderから開くとローカルサーバーが起動し、既定ブラウザで解析画面が開く。ブラウザページを閉じるとheartbeat停止によりサーバーも自動終了する。
11. Windows `.exe` はfavicon resourceを埋め込んで生成される。
12. Caddyコンテナを `podman compose up` で起動し、`http://127.0.0.1:4173/` が返る。

## GitHub Pages

`main` へのpush時にGitHub Actionsで静的サイトをビルドし、GitHub Pagesへデプロイする。アセットは相対パスで出力し、リポジトリのサブパスとGoバイナリのルート配信の両方に対応する。公開先は https://assb-lab.github.io/ups-leips-analyzer/ 。
