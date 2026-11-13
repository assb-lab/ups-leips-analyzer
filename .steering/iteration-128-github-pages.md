# Iteration 128: GitHub Pages

- `main` の更新時と手動実行時にGitHub ActionsでPagesを公開する。
- 静的アセットとfaviconを相対パスにし、PagesのサブパスとGoバイナリのルート配信を両立する。
- READMEとリリース仕様に公開先を追記する。
- 検証: `vp check`、Node 24で `vp test`、`vp test --coverage`、`vp build`、`pnpm binary:build` が成功。Goバイナリの `/` とHTMLが参照するアセット・faviconはHTTP 200。
- Node 26では既存テストの `localStorage` が未定義となり12件失敗したため、Pages workflowと同じNode 24で検証した。
- Pagesの実デプロイはマージ後に確認する。
