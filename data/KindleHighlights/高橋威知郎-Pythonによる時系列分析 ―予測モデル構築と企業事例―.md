---
kindle-sync:
  bookId: '44437'
  title: Pythonによる時系列分析 ―予測モデル構築と企業事例―
  author: 高橋威知郎
  asin: B0C7G5DD8B
  lastAnnotatedDate: '2025-05-06'
  bookImageUrl: 'https://m.media-amazon.com/images/I/81v+3k2kl6L._SY160.jpg'
  highlightsCount: 36
---
# Pythonによる時系列分析 ―予測モデル構築と企業事例―
## Metadata
* Author: [高橋威知郎](https://www.amazon.comundefined)
* ASIN: B0C7G5DD8B
* Reference: https://www.amazon.com/dp/B0C7G5DD8B
* [Kindle link](kindle://book?action=open&asin=B0C7G5DD8B)

## Highlights
ビジネスの現場は時系列データで溢れています。たとえば、売上データや在庫データ、センサー データなどは、時間の概念が付いた時系列データです。しかし、ビジネスの現場を眺めてみると、 時系列データの取り扱いに困り、諦めているか、右往左往しているか、時間の概念を捨てテーブ ルデータとして扱っているか、集計した値を単に比較し眺めているだけか（例：昨年と今年の売上 をグラフ化し比較）といったところが多い印象です。非常にもったいないことです。時系列データ がとってもかわいそうです。なぜならば、時系列データのポテンシャルを潰しているからです。ポ テンシャルを最大限引き出し、時系列データをキラキラ輝かし、わくわくする未来を創造していき ましょう。 — location: [1312](kindle://book?action=open&asin=B0C7G5DD8B&location=1312) ^ref-24055

---
足し算で表現する「加法モデル」の場合、次のようになります。 式 （1-1） 掛け算で表現する「乗法モデル」の場合、次のようになります。 式 （1-2） 乗法モデルも対数変換 （log） によって、加法モデルの用に表現できます。 式 （1-3） — location: [4807](kindle://book?action=open&asin=B0C7G5DD8B&location=4807) ^ref-17781

---
● TC （趨勢循環変動）を「トレンド成分」 ● S （季節変動成分）を「季節成分」 ● I （不規則変動成分）を「残差成分」 — location: [5246](kindle://book?action=open&asin=B0C7G5DD8B&location=5246) ^ref-55543

---
● 基本となる3活用事例 ● モニタリング指標の将来予測 ● モニタリング指標の異常検知とその要因探索 ● モニタリング指標の先行指標探索とその活用 ● セールスアナリティクスの3活用事例 ● リードの選別（受注確率や金額、 LTVの予測など） ● チャーンレートの改善（既存顧客の離反予測など） ● 出世魚マネジメント （LTV予測やおすすめ商材レコメンドなど） ● 広告・販促の効果測定と最適化 （MMM： マーケティングミックスモデル） — location: [5682](kindle://book?action=open&asin=B0C7G5DD8B&location=5682) ^ref-22574

---
「異常検知」はデータを使って実施するが、「要因探索」はデータを使わずに実施す る、ということが多々あります。 — location: [6992](kindle://book?action=open&asin=B0C7G5DD8B&location=6992) ^ref-5896

---
「将来予測」「異常検知」「要因探索」 — location: [6994](kindle://book?action=open&asin=B0C7G5DD8B&location=6994) ^ref-44233

---
「将来予測」「異常検知」「要因探索」 — location: [7430](kindle://book?action=open&asin=B0C7G5DD8B&location=7430) ^ref-44233

---
● 縦持ち時系列データ（時間軸が縦方向） ● 横持ち時系列データ（時間軸が横方向） — location: [8302](kindle://book?action=open&asin=B0C7G5DD8B&location=8302) ^ref-13508

---
「横持ち時系列データ」のほうが、「縦持ち時系列データ」よりもわかりやすいと感じる方も多 いことでしょう。そのためか、ビジネスの現場では「横持ち時系列データ」のほうをよく見る 気がします。そこで、「縦持ち時系列データ」を作ったほうがいいのか、それとも「横持ち時系 列データ」を作ったほうがいいのか悩むことがあります。 しかし、前述したように、基本となるのは「縦持ち時系列データ」です。時系列データを利 用した集計や分析などを実施するとき、最初にすべきは、非常に縦に長い「縦持ち時系列データ」 を作ることです。 — location: [9177](kindle://book?action=open&asin=B0C7G5DD8B&location=9177) ^ref-47686

---
● トレンド特徴量 ● 三角関数特徴量 ● ドメイン固有カレンダー特徴量 ● ラグ特徴量 ● ローリング特徴量 ● エクスパンディング特徴量 ● RFM特徴量 — location: [9613](kindle://book?action=open&asin=B0C7G5DD8B&location=9613) ^ref-16480

---
最もシンプルなものは次の ような 「0,1,2, ･･･」と連番の特徴量（例では、変数名は t） — location: [9614](kindle://book?action=open&asin=B0C7G5DD8B&location=9614) ^ref-50771

---
ドメイン固有カレンダー特徴量 メイン — location: [10488](kindle://book?action=open&asin=B0C7G5DD8B&location=10488) ^ref-51595

---
ラグ特徴量は、最も一般的な時系列特徴量です。 — location: [11361](kindle://book?action=open&asin=B0C7G5DD8B&location=11361) ^ref-7105

---
ローリング特徴量とは、 過去の一定期間 （Rolling Window） の平均値や合計値などの集計値です。 — location: [12234](kindle://book?action=open&asin=B0C7G5DD8B&location=12234) ^ref-6707

---
「移動平均」 — location: [12236](kindle://book?action=open&asin=B0C7G5DD8B&location=12236) ^ref-56211

---
エクスパンディング特徴量とは、過去すべての期間 （Expanding Window） の集計値を特 徴量としたものです。 — location: [12236](kindle://book?action=open&asin=B0C7G5DD8B&location=12236) ^ref-39102

---
これらの時系列特徴量に対し、さらにラグを 施したり、四則演算（＋－ ×÷） をしたり、対数変換 （log） をしたりと、いろいろな加工を施 す場合があります。元の特徴量も残すことも多く、特徴量がどんどん増えます。 — location: [13110](kindle://book?action=open&asin=B0C7G5DD8B&location=13110) ^ref-56268

---
正直、時系列データよりもテーブルデータのほうが扱いやすいです。そのため、時系列デー タであるにも関わらず、テーブルデータ系の数理モデルで扱えるデータセットに変換し、デー タ分析や予測モデル構築をするケースもあります。 — location: [14419](kindle://book?action=open&asin=B0C7G5DD8B&location=14419) ^ref-15850

---
テーブルデータ系の数理モデルを使うための工夫の1つが、時系列特徴量を作り、それをデー タセットの特徴量の1つとして導入するというものです。 — location: [14855](kindle://book?action=open&asin=B0C7G5DD8B&location=14855) ^ref-6942

---
「特徴量エンジニアリング」 — location: [22723](kindle://book?action=open&asin=B0C7G5DD8B&location=22723) ^ref-9457

---
予測モデルの目的変数y と説明変数Xを選定します。目的変数yが受注の金額などの量的変数の場合には「回帰問題」、 目的変数yが受注の有無 （1:受注、 0：失注）などの質的変数の場合には「分類問題」 — location: [23157](kindle://book?action=open&asin=B0C7G5DD8B&location=23157) ^ref-48362

---
データ は1分ごとにデータベース上に蓄積され、 1時間ごとに予測し直すということで1時間ごとに更 新していました。広告の売上貢献度モデルを構築したときは、前日のデータが翌日にはデータ ベース上に蓄積され、毎週利用するということで利用タイミングの前日の夜間に更新（要は、 週1で更新）していました。 — location: [24032](kindle://book?action=open&asin=B0C7G5DD8B&location=24032) ^ref-54259

---
最もシンプルなのが、予測モデルを学習 するための「学習データ」と、予測モデルを評価する「テストデータ」への2分割です。 — location: [24470](kindle://book?action=open&asin=B0C7G5DD8B&location=24470) ^ref-33049

---
「学習データ」「検証データ」「テストデータ」への3分割 — location: [24904](kindle://book?action=open&asin=B0C7G5DD8B&location=24904) ^ref-61625

---
時系列データの場合、分割する時点を2つ 設け、時間的に最も過去のデータを「学習データ」、時間的に最も新しいデータを「テストデー タ」、その中間にあるデータを「検証データ」とします。 — location: [25341](kindle://book?action=open&asin=B0C7G5DD8B&location=25341) ^ref-63792

---
学習データに対する評価は、テストデータに対する評価の上限と捉える ことができます。 — location: [27089](kindle://book?action=open&asin=B0C7G5DD8B&location=27089) ^ref-34758

---
予測値と実測値の乖離をダイレクトに評価する指標もよく使います。回帰問題の予測モデル の評価指標として、たとえば次のようなものがあります。どれも値が小さいほどよいとされて います。 — location: [27963](kindle://book?action=open&asin=B0C7G5DD8B&location=27963) ^ref-17510

---
高精度な予測モデルが使えるモデルとは限りません。「使えるモデル」とは、ビジネスの現場 で使い成果を出すモデルです。ビジネスの現場で予測モデルが使えるかどうかを考えるときに は、いくつかの視点があります。たとえば、次の2つです。 ● スピード ● 予測の外し方 — location: [28400](kindle://book?action=open&asin=B0C7G5DD8B&location=28400) ^ref-19427

---
予測 精度が高くても、重要な局面で外すような予測モデルは使いものになりません。さらに、実測 値よりも高く予測するのか低く予測するのかで、ビジネス的な意味合いが異なることがありま す。その辺りも考慮する必要があります。 — location: [28837](kindle://book?action=open&asin=B0C7G5DD8B&location=28837) ^ref-51662

---
時系列データを手にしたら、まずすべきは次の3つの変動成分の分解でしょう。どのような 時系列データなのか、ざっくり掴めるからです。 ● トレンド成分 ● 季節成分 ● 残差成分 — location: [30584](kindle://book?action=open&asin=B0C7G5DD8B&location=30584) ^ref-9092

---
時系列系の数理モデル ● ARIMAモデル ● ホルトウィンターズモデル ● Prophetモデル ● テーブルデータ系の数理モデル ● 線形回帰モデル — location: [36702](kindle://book?action=open&asin=B0C7G5DD8B&location=36702) ^ref-43340

---
時系列特徴量付きテーブルデータを生成するときは、気になる時系列特徴量はできるだけ作 成したほうがいいです。ただ、気になる特徴量をたくさん作ると、テーブルデータの変数の数 が膨大になります。そこで、このテーブルデータに対し、変数選択（特徴量選択）を検討する 必要があります。変数選択をするかしないかで、今回は次の2つのパターンを考えました。 — location: [37141](kindle://book?action=open&asin=B0C7G5DD8B&location=37141) ^ref-30967

---
● AR （Auto-Regressive） component： 自己回帰成分 ● I （Integrated） component：和分成分 ● MA （Moving Average） component：移動平均成分 — location: [38013](kindle://book?action=open&asin=B0C7G5DD8B&location=38013) ^ref-60306

---
時系列データの予測モデルの基本は、 1期先予測です。たとえば、時系列データが日単位で ある場合、 1期先予測とは、学習データ期間の次の日を予測することです。時系列データが月 単位である場合、 1期先予測とは、学習データ期間の次の月を予測することです。 — location: [53304](kindle://book?action=open&asin=B0C7G5DD8B&location=53304) ^ref-8633

---
● n期先予測モデルを個々に作る方法 ● nベクトル目的変数の予測モデルを1 つ作る方法 ● 1 期先予測モデルを1 つ作り再帰的に利用する方法 — location: [53742](kindle://book?action=open&asin=B0C7G5DD8B&location=53742) ^ref-31788

---
おそらく現場で一番見たいのは、「何をすべきか」という次のアクションを示唆する何かです。 データ活用の「見える化」とは、「アクションの見える化」なのです。 そう考えると、どんなにわかりやすい集計結果であっても、どんなに示唆に富んだ分析結果 であっても、どんなに高精度な予測結果であっても、「何をすべきか」という次のアクションが 見えて、そしてアクションが起こらなければ無価値です。 — location: [84762](kindle://book?action=open&asin=B0C7G5DD8B&location=84762) ^ref-34133

---
