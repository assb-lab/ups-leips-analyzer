# UPS-LEIPS Analyzer

UPS/LEIPSスペクトルを読み込み、VBM、cut-off、IP、LEET(der)ピーク、真空準位、EA、UPS-LEIPSバンド図をブラウザ内で解析するVite+ / Reactアプリです。

[ブラウザでアプリを開く](https://assb-lab.github.io/ups-leips-analyzer/)

詳細仕様は `docs/`、実装ログは `.steering/` を参照してください。

## 開発

```sh
vp install
vp dev
vp check
vp test
vp test --coverage
vp build
```

## 単一バイナリ

```sh
pnpm binary:build
./bin/ups-leips-analyzer
```

デフォルトでは `http://127.0.0.1:4173/` で起動します。

## 配布ビルド

```sh
pnpm binary:build:darwin-arm64
pnpm binary:build:darwin-amd64
pnpm binary:build:windows-x64
pnpm binary:build:macos-app:arm64
pnpm binary:build:macos-app:amd64
```

macOSのアイコン付き配布物は `.app.zip`、Windowsはfaviconを埋め込んだ `.exe` を生成します。

macOS `.app` はFinderから開くとローカルHTTPサーバーを起動し、既定ブラウザで解析画面を開きます。`4173` が使用中の場合は次の空きportを使います。ブラウザページを閉じるとheartbeat停止を検知してサーバーも自動終了します。未notarize配布のため、初回起動時はGatekeeperの確認が出る場合があります。ブラウザを自動で開かない検証用途では、bundle内の実行ファイルに `--no-open` を付けて起動できます。

## Nix / Docker

```sh
nix develop
vp install
```

```sh
podman compose build
podman compose up
```

コンテナはCloud Run向けにCaddyで静的配信します。ローカルでは `http://127.0.0.1:4173/`、Cloud Runでは `$PORT` で待ち受けます。

## License

MIT License. Copyright (c) 2026 assb-lab.
