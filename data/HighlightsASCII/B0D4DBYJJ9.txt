---
kindle-sync:
  bookId: '44025'
  title: GitHub CI/CD実践ガイド――持続可能なソフトウェア開発を支えるGitHub Actionsの設計と運用 エンジニア選書
  author: 野村 友規
  asin: B0D4DBYJJ9
  lastAnnotatedDate: '2025-05-06'
  bookImageUrl: 'https://m.media-amazon.com/images/I/81Yr2DW1WRL._SY160.jpg'
  highlightsCount: 13
---
# GitHub CI/CD実践ガイド――持続可能なソフトウェア開発を支えるGitHub Actionsの設計と運用 エンジニア選書
## Metadata
* Author: [野村 友規](https://www.amazon.comundefined)
* ASIN: B0D4DBYJJ9
* Reference: https://www.amazon.com/dp/B0D4DBYJJ9
* [Kindle link](kindle://book?action=open&asin=B0D4DBYJJ9)

## Highlights
GitHubは使っているけれど、プルリクエストぐらいしか利用していない CI/CDというキーワードは知っているけれど、自分で設計したことはない GitHub Actionsには触れているけれど、正直雰囲気で運用している — location: [39](kindle://book?action=open&asin=B0D4DBYJJ9&location=39) ^ref-64451

---
どうにかしてユーザーへ送り届ける必要があります。このユーザーへ届ける活動を リリース（Release）と呼びます。 — location: [555](kindle://book?action=open&asin=B0D4DBYJJ9&location=555) ^ref-16078

---
ソフトウェア開発では新機能の追加だけでなく、品質の改善も大切です。そして品質を担保するのがCIです。CIとCDは同列の概念に見えますが、 CIはCDに包含されます。そうして高品質なソフトウェアを迅速に提供することも、CDの重要な役割です。 — location: [565](kindle://book?action=open&asin=B0D4DBYJJ9&location=565) ^ref-2335

---
GitHubを使うなら、ぜひ導入したいのが GitHub CLI です。GitHub CLIはその名のとおり、コマンドラインからGitHubを操作するツールです。次のような操作をサポートしています。 — location: [663](kindle://book?action=open&asin=B0D4DBYJJ9&location=663) ^ref-17334

---
GitHub-Hosted Runnersでは標準スペックのランナー以外に、 Larger Runners と呼ばれるランナーが存在します。Larger Runnersは有料ですが、マシンスペックを向上できます。ジョブの実行に時間がかかる場合、導入を検討しましょう。 — location: [993](kindle://book?action=open&asin=B0D4DBYJJ9&location=993) ^ref-52185

---
コンテキスト（Contexts）は実行時の情報や、ジョブの実行結果などを保持するオブジェクトです。複数のプロパティで構成され、各プロパティから値を取得できます。またコンテキストは 図3.1 のように、いくつかの種類が存在します。 — location: [1100](kindle://book?action=open&asin=B0D4DBYJJ9&location=1100) ^ref-27800

---
プルリクエストをマージするのは、すべてのステータスチェックが成功したときだけです。ステータスチェックがエラーを知らせているのに、コードをマージしてはいけません。 — location: [1981](kindle://book?action=open&asin=B0D4DBYJJ9&location=1981) ^ref-26982

---
テストピラミッドはテストをどのようなバランスで実装するか、という指針を与えてくれます。最適な割合はソフトウェアによって異なります。しかしピラミッドの形を保つ割合にすれば、多くのケースでバランスが取れます。 — location: [2023](kindle://book?action=open&asin=B0D4DBYJJ9&location=2023) ^ref-40634

---
ユニットテストは高速で異常系もテストしやすいので、もっとも手厚く網羅的に実装します。一方でインテグレーションテストやE2Eテストは、主要なユースケースの正常系を中心に実装します。このように役割分担を行えば、CIを高速に保てます。また一般的にユニットテストはメンテナンスの手間が小さいため、日々の開発も楽になります。 — location: [2026](kindle://book?action=open&asin=B0D4DBYJJ9&location=2026) ^ref-59800

---
フレーキーテスト（Flaky tests）と呼ばれます。同じコードなのに成功したり、失敗したりする厄介な性質があります。フレーキーテストの原因は非決定性です。並行処理や時刻への依存、ネットワークの遅延などが非決定性をもたらします。 — location: [2031](kindle://book?action=open&asin=B0D4DBYJJ9&location=2031) ^ref-53284

---
テストは振る舞いが変わっていなければ、本来落ちないはずです。しかし現実には落ちます。これは フラジャイルテスト（Fragile tests）と呼ばれます。 — location: [2048](kindle://book?action=open&asin=B0D4DBYJJ9&location=2048) ^ref-61145

---
これは黄金律に関わるトレードオフです。「クリーンに保つ」と「高速に実行する」を両立できない場合、どこで妥協するかは思案 — location: [2063](kindle://book?action=open&asin=B0D4DBYJJ9&location=2063) ^ref-2176

---
のしどころです。ここで伝えたいのは、常に速度を優先しろということではありません。こういう選択肢もあると、覚えておいてほしいのです。 — location: [2064](kindle://book?action=open&asin=B0D4DBYJJ9&location=2064) ^ref-20367

---
