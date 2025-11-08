---
kindle-sync:
  bookId: '26910'
  title: 詳解　確率ロボティクス　Ｐｙｔｈｏｎによる基礎アルゴリズムの実装 (ＫＳ理工学専門書)
  author: 上田隆一
  asin: B082SN3VTD
  lastAnnotatedDate: '2025-05-06'
  bookImageUrl: 'https://m.media-amazon.com/images/I/91+gf47pAkL._SY160.jpg'
  highlightsCount: 11
---
# 詳解　確率ロボティクス　Ｐｙｔｈｏｎによる基礎アルゴリズムの実装
## Metadata
* Author: [上田隆一](https://www.amazon.comundefined)
* ASIN: B082SN3VTD
* Reference: https://www.amazon.com/dp/B082SN3VTD
* [Kindle link](kindle://book?action=open&asin=B082SN3VTD)

## Highlights
移動ロボットの用語や慣例には，航海術を由来とするものが多くあります．移動ロボットを目的地まで誘導する制御のことは，そのまま ナビゲーション と呼びます．ロボットを未知の領域で活動させることはexploration（探査）といいますが，「大航海時代」も英語ではthe age of explorationです 注２．また，ロボットの動きの情報（とコンパス）だけでロボットの位置や向きを推定する方法はdead reckoning（デッドレコニング，推測航法）と呼びます．さらには「coastal navigation（沿岸航法）」というアルゴリズムがあったり［Roy 1999］，本書や［Thrun 2005］ では点ランドマークが星で描かれていたりと，さまざまなものを航海術から受け継いでいます． — location: [214](kindle://book?action=open&asin=B082SN3VTD&location=214) ^ref-14649

---
孔子が「之を知るを之を知ると為し，知らざるを知らざると為す．是れ知るなり」といったそうです． — location: [231](kindle://book?action=open&asin=B082SN3VTD&location=231) ^ref-19715

---
その中で確率を使って「分からない」を表現し，何か情報が得られるたびに「分からなさ」を小さくしていくというアイデアが18世紀の牧師 トーマス・ベイズ（Thomas Bayes）によって考え出され，書き留められました．ベイズのアイデアは本書で扱うアルゴリズムの根底にある考え方で， ベイズの定理 が用いられるたびに，我々はその考え方に触れることになります． — location: [241](kindle://book?action=open&asin=B082SN3VTD&location=241) ^ref-39218

---
ロナルド・エイルマー・フィッシャー（Ronald Aylmer Fisher）など統計学の重鎮が，例えば［フィッシャー 2013］ で明記しているように，逆確率という考え方に否定的だったので，なかなか表立って使いにくかったという事情もあったようです． — location: [251](kindle://book?action=open&asin=B082SN3VTD&location=251) ^ref-47265

---
ジェームズ・ワット（James Watt）が蒸気機関のために発明したガバナ（遠心調速機，図1.1のQ 注４）は，その代表的なものです．このガバナは蒸気機関の出力が上がって回転軸の回転速度が上がると，軸の両側につけたおもりが遠心力で浮き上がり，その浮き上がった量に応じて蒸気の弁を閉めて出力を弱めるという仕組みで出力を安定化させるものでした．ワットは，出力の量を使って入力の量を加減するという フィードバック 制御を実用レベルで実現したのでした． — location: [271](kindle://book?action=open&asin=B082SN3VTD&location=271) ^ref-31059

---
モンテカルロフィルタやブートストラップフィルタは，現在， パーティクルフィルタ と呼ばれるものの原型となっていますので，以後，本書ではパーティクルフィルタと呼びます． — location: [321](kindle://book?action=open&asin=B082SN3VTD&location=321) ^ref-17409

---
リチャード・サットン（Richard S. Sutton）らによる強化学習の教科書「Reinforcement Learning: An Introduction」［Sutton 1998］ が1998年に出版されています．強化学習も（ベイズの定理は出てきませんが），学習する主体（エージェント）が，確率的に行動を選択し，統計を駆使して動的計画法を解いていく手法です．本書では確率ロボティクスの一部として扱います． — location: [350](kindle://book?action=open&asin=B082SN3VTD&location=350) ^ref-11173

---
LiDARとロボットの取り付けが少しずれていたり，ロボット自身が常に傾いていたら，さらに値はずれるはずです．このようなずれは， 偏り（ バイアス）と呼ばれます．本書では以後，「バイアス」と記述します．また，バイアスによって発生する定常的な誤差は 系統誤差（systematic error）と呼ばれます． — location: [651](kindle://book?action=open&asin=B082SN3VTD&location=651) ^ref-30915

---
自己位置推定（self-localization）は，ロボットが自らの姿勢（位置と向き）を，これまで得た情報から推定することを指す用語です 注１． — location: [2593](kindle://book?action=open&asin=B082SN3VTD&location=2593) ^ref-31054

---
SLAM（simultaneous localization and mapping）を扱います．これまで扱ってきた自己位置推定の問題では，エージェントに地図が与えられ，エージェントはその地図とセンサ値を比較してロボットの姿勢を求めますが，SLAMでは，エージェントがその地図を自分自身で作らなければなりません． — location: [4396](kindle://book?action=open&asin=B082SN3VTD&location=4396) ^ref-25315

---
FastSLAM［Montemerlo 2003］ を実装し — location: [4412](kindle://book?action=open&asin=B082SN3VTD&location=4412) ^ref-35257

---
