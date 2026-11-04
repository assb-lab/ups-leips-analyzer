# Iteration 127: MultiPak CSV row alignment

## 目的

assb-lab/ups-leips-analyzer#1。electronic-structure-analysis-platform に取り込んだ後のレビューで見つかった MultiPak CSV パーサの不具合(向こうの #14 / #15 で修正済み)を、このリポジトリにも反映する。

## 実装内容

- `src/io/multipakCsv.ts`
  - 列ごとに非数値を捨ててから index で組み合わせる `transposeNumericRows` をやめ、数値行を行ごとに元の列位置のまま保持する `parseNumericRows` にした。x と y の両方が数値の行だけを点にする。
  - 点のない y 列を詰めずに、元の列番号を dataset id、series ラベル、印加電圧の推定に使う。列番号は `metadata.columnIndex` に記録する。
  - 名前の `#ラベル` 付与は、点のある y 列が2本以上のときに判定する。
  - 幅を `Math.max(...rows)` のスプレッドで求めない(数十万行で `RangeError`)。
- `docs/03-data-formats.md` に数値行の読み方と列番号の扱いを追記した。

## TODO

- なし。

## 完了範囲

- 欠損セルのある行は、その列の点から行ごと除かれ、後続の点はずれない。
- 先頭の y 列が空でも、後ろの列は元の列番号・ラベル・電圧のまま読まれる。
- 50万行の数値ブロックを読める。

## 簡易実装 / 技術負債

- 空の Project に CSV を追加したとき、Band の IP の出どころが先頭の dataset になる(用語集の既定ルールと異なる)。もとからの挙動で、#1 では範囲外として残した。

## 実行したテスト

- 回帰テスト5件を先に追加し、修正前に失敗することを確認した。
- `vp check`
- `vp test`
- `vp test --coverage`
- `vp build`
- `pnpm binary:build` 後に `/` と `/assets/...` を確認

いずれも `nix develop`(Node 24)で実行した。Node 26 では Node 組み込みの `localStorage` が jsdom のものを隠し、`App.test.tsx` と `projectStoreLifecycle.test.ts` の12件が main でも失敗する(この変更とは無関係)。
