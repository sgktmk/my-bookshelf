---
kindle-sync:
  bookId: '16875'
  title: ソフトウェア開発にChatGPTは使えるのか？――設計からコーディングまでAIの限界を探る
  author: 小野 哲
  asin: B0C9L3DH5S
  lastAnnotatedDate: '2025-05-06'
  bookImageUrl: 'https://m.media-amazon.com/images/I/71Su+FUVGhL._SY160.jpg'
  highlightsCount: 16
---
# ソフトウェア開発にChatGPTは使えるのか？――設計からコーディングまでAIの限界を探る
## Metadata
* Author: [小野 哲](https://www.amazon.comundefined)
* ASIN: B0C9L3DH5S
* Reference: https://www.amazon.com/dp/B0C9L3DH5S
* [Kindle link](kindle://book?action=open&asin=B0C9L3DH5S)

## Highlights
私は猫です」という文があるとして、人間はこの文を理解することができますが、コンピュータにはまだ理解できません。 — location: [462](kindle://book?action=open&asin=B0C9L3DH5S&location=462) ^ref-61870

---
文を単位（トークン）に分割します。「私」「は」「猫」「です」のように — location: [463](kindle://book?action=open&asin=B0C9L3DH5S&location=463) ^ref-16631

---
各単語を数学的に表現する手法を用います。それがembeddingです。これにより、各単語はベクトル（数値のリスト）として表現され、さまざまな数学的操作が可能となります。これが単語のベクトル化です。 — location: [465](kindle://book?action=open&asin=B0C9L3DH5S&location=465) ^ref-43974

---
それぞれの単語ベクトルに対して、その位置を表す情報を追加することで、単語の順序を保持します。これを 位置エンコーディング と呼びます。 — location: [469](kindle://book?action=open&asin=B0C9L3DH5S&location=469) ^ref-42341

---
アテンションは、文字どおり「 注目」の意味を持ちます。Transformerが文脈を理解するためには、ある単語が他の単語とどのように関連しているかを理解する必要があります。これを行うために、アテンションは各単語が他のすべての単語にどれだけ「 注目」しているかを計算します。 — location: [477](kindle://book?action=open&asin=B0C9L3DH5S&location=477) ^ref-54172

---
Query（Q）、Key（K）、Value（V） — location: [486](kindle://book?action=open&asin=B0C9L3DH5S&location=486) ^ref-34819

---
本書の場合は、unittestでテストケースを想定しています。 Pythonでテストコードを書く場合、現在はpytestが主流となっていますが、Google Colabでは少し不便です。なぜなら、pytestは基本的にファイルを対象に検索し、テストコードを自動的に見つけて実行するのが主な使い方であり、Google Colabのようにセル単位で実行する環境にはあまり適していません。一方で、Python標準のunittestはセル単位で実行できるため、Google Colabでの利用には便利です。 — location: [1706](kindle://book?action=open&asin=B0C9L3DH5S&location=1706) ^ref-55019

---
Microsoft CopilotやChatGPTプラグインによるドキュメントの作成なども、ここで説明した基本技を知っていればそんなに驚くことはありません。「もうコンサルはいらない。〇〇の驚愕機能!!」みたいなSNSや動画の刺激的なタイトルに惑わされるのは時間の無駄かもしれません。それよりも大切なことは、みなさん自身がChatGPTがもつ基本的なポテンシャルをどれだけ掘り出すかということです──と筆者は思います。 — location: [2411](kindle://book?action=open&asin=B0C9L3DH5S&location=2411) ^ref-35317

---
「DDDをご存じですか？」 「ジェイク・ロバーツのプロレス技？」──それはDDTです。近年、DDDすなわちドメイン駆動設計（Domain-Driven Design）は重要な設計手法として注目されています。データやプロセスに焦点をあてるのではなく、ドメインに焦点をあてて開発を進める設計手法（設計思想）です。 — location: [2441](kindle://book?action=open&asin=B0C9L3DH5S&location=2441) ^ref-52032

---
「これがChatGPTと何の関係あるの？」という方もいるかもしれません。実は関係があります。ChatGPTはこのスタイルにとても相性がよいと思われるからです。恐らくですが、テストコードを書く癖がついている人がChatGPTを活用した場合、まるで世界が変わるのではないでしょうか。 ChatGPTを使ってTDDを実現する方法はいたってシンプルです。テストコードを書いて、その結果をChatGPTにフィードバックするだけです。 — location: [2763](kindle://book?action=open&asin=B0C9L3DH5S&location=2763) ^ref-42610

---
テストコードはGPTにとってはfew-shot learningの働きをします。テストコードの例が多ければ、実コードの生成の精度が高くなりますし、求めるコードがドンピシャで、コード修正もほとんど必要ないものが生成される確率が高くなるようです。 — location: [2884](kindle://book?action=open&asin=B0C9L3DH5S&location=2884) ^ref-56746

---
我々凡人はせめて「完全に理解した」レベルぐらいの学習体験をバンバン得たいものです。 — location: [2928](kindle://book?action=open&asin=B0C9L3DH5S&location=2928) ^ref-43475

---
これからは1つの言語をいかに極めているかがプログラマーとしての重要な指標になります。もっというと、英語もしくは日本語（つまり母国語）が最強のプログラミング言語という時代が来たとも言えます。 本節ではプログラミング言語の学習テーマで実際の学習体験として紹介します。筆者がまだ習得どころか公式ドキュメントも何も読んだことのない状態から別の言語を習得する過程を示しながら言語習得の方法を説明していきます。題材としてRustです。Rustに関しては筆者にとっては謎の言語で、これから業務で使う機会はないかもしれませんが、エッジが効いたエンジニアの間では高評価の言語です。機会があれば習得したいと思っている言語の1つです。では始めましょう。 — location: [3240](kindle://book?action=open&asin=B0C9L3DH5S&location=3240) ^ref-39552

---
「分野別の学習」「プログラミング言語の学習」この2つのセクションを書くにあたっての学習実験に費やした時間はそれぞれ半日程度でした。誇張ではありません。還暦を過ぎたどこにでもいる普通の老プログラマが、1日でここまで学習できたというのは普通ではまずあり得ないと思います（まるでアニメのサブキャラがたった1日の山ごもりで刮目して新しい技を会得するみたいな感じですかね）。 — location: [3464](kindle://book?action=open&asin=B0C9L3DH5S&location=3464) ^ref-43096

---
ははん、これは人間と会話するのとあまり変わらんな……」それが最初の大きな気づきでした。 — location: [5736](kindle://book?action=open&asin=B0C9L3DH5S&location=5736) ^ref-25990

---
社会人類学者クロード・レヴィ＝ストロースは、これを「ブリコラージュ」と呼びました。それは手近な素材やツールを利用して何か新しいものを創造する思考のパターンを表します。 — location: [5750](kindle://book?action=open&asin=B0C9L3DH5S&location=5750) ^ref-24091

---
