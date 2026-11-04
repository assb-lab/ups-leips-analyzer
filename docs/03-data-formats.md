# Data Formats

## MultiPak CSV

v1の正式対象はMultiPakから出力したCSV。

基本形:

```text
area
description
kind
series metadata
file#,2,4,...
x,y1,y2,...
```

- 先頭5行をmetadataとして扱う。
- 3行目を測定種別metadataとして扱い、filenameと合わせてdataset kindを推定する。
- 5行目以降を数値行として扱う。
- y列が複数あるCSVは、1つのx列を共有する複数datasetに展開する。
- 行末の空行、非数値行、`0,0` 終端は読み飛ばす。
- 数値行は行ごとに元の列位置のまま読む。x と y の両方が数値の行だけをその y 列の点にし、欠損・非数値のセルがある行はその列の点から行ごと除く。後続の行の x と y はずらさない。
- 点が1つもない y 列は dataset にしないが、残りの列は元の列番号を保つ。列番号は `metadata.columnIndex` に記録し、dataset id、series ラベル、series 名からの印加電圧の推定に使う。

## Dataset Kinds

- UPS VB: metadataに`VB`、またはfilenameに`UPS`と`VB`を含む。
- UPS IP/cut-off: metadataに`IP`、またはfilenameに`UPS`と`IP`を含む。
- LEET: filenameに`LEET`を含み`der`を含まない。LEIPS系filenameではmetadataに`LEET`を含み`der`を含まない場合もLEETとして扱う。
- LEET(der): filenameに`LEET`と`der`を含む。LEIPS系filenameではmetadataに`LEET`と`der`を含む場合もLEET(der)として扱う。
- LEIPS: filenameに`LEIPS`を含みLEET/der判定に該当しない場合はLEIPSとして扱う。metadataに`LEIPS`を含む場合もLEIPSとして扱う。
- REELS: filenameまたはkindに `REELS` を含む。raw x軸はKinetic Energy / eVとして扱う。
- 判定はcase insensitiveで、区切り文字の違いは無視する。1つのCSV内で列ごとに異なる測定種別が混在する場合の列別推定は未対応で、Data Browserの`Change role`で手動補正する。

## UPS IP Applied Bias

- UPS IP datasetは印加電圧`appliedVoltage`を持つ。
- 推定順は、CSVのseries/header名、metadata行、filename。`IP-5V`、`IP_-5 V`、`IP+3.5V`、`IP_5V`をcase insensitiveに読む。
- 符号は保持する。推定できない場合は`0 V`を初期値にする。
- 推定元は`metadata.appliedVoltageSource`に`metadata`、`filename`、`default`として残す。

## SPE

`.spe` はバイナリ本体を含むためv1では正式対応しない。CSV出力済みファイルを読み込む。

## Project Export

- Project共有用の標準exportは、Project JSONをgzip圧縮した `.upsleips.gz` とする。
- importはgzip版と従来の生JSON版 `.json` の両方を受け付ける。
- gzipの圧縮/展開はブラウザ内で `fflate` を使い、Project JSONのスキーマ自体は変更しない。

## Catalog Export

- Catalog共有用の標準exportは、Catalog archive JSONをgzip圧縮した `.upsleips-catalog.json.gz` とする。
- Catalog archiveはCatalog metadataと、そのCatalog専用Dexie DB内の全table rowsを含む。
- Catalog importは既存Catalogを上書きせず、新しいCatalog IDで追加する。Project IDはCatalog内でそのまま保持する。
