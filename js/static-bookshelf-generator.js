/**
 * StaticBookshelfGenerator - 静的本棚ページ生成機能
 * 本棚データから静的HTMLファイルを生成してSNSシェア可能にする
 */
class StaticBookshelfGenerator {
    constructor(bookManager, userData) {
        this.bookManager = bookManager;
        this.userData = userData;
        this.baseUrl = window.location.origin + window.location.pathname.replace('index.html', '');
    }

    /**
     * 静的本棚ページを生成
     */
    async generateStaticBookshelf(bookshelfId, options = {}) {
        try {
            // 本棚情報を取得
            const bookshelf = this.userData.bookshelves?.find(b => b.id === bookshelfId);
            if (!bookshelf) {
                throw new Error('指定された本棚が見つかりません');
            }

            // 本棚に含まれる書籍を取得（getBookshelfBooksWithUserDataではなく、getBookshelfBooksを使う）
            const books = this.getBookshelfBooks(bookshelfId);

            // HTMLテンプレートを取得
            const template = await this.loadTemplate();

            // テンプレートに値を埋め込み
            const htmlContent = this.populateTemplate(template, bookshelf, books, options);

            // 静的ファイルとして保存
            const filename = `${bookshelfId}.html`;
            const url = await this.saveStaticFile(filename, htmlContent);

            return {
                success: true,
                filename: filename,
                url: url,
                bookshelf: bookshelf,
                totalBooks: books.length
            };

        } catch (error) {
            console.error('静的本棚生成エラー:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 本棚の書籍を取得
     */
    getBookshelfBooks(bookshelfId) {
        // 最新のuserDataを取得
        const latestUserData = window.bookshelf ? window.bookshelf.userData : this.userData;
        
        const bookshelf = latestUserData.bookshelves?.find(b => b.id === bookshelfId);
        if (!bookshelf || !bookshelf.books) return [];

        // 本棚の書籍順序に従って取得
        let books = bookshelf.books
            .map(bookId => this.bookManager.findBookByASIN(bookId))
            .filter(book => book !== undefined);

        // カスタム順序がある場合は適用
        const customOrder = latestUserData.bookOrder?.[bookshelfId];
        if (customOrder && customOrder.length > 0) {
            books.sort((a, b) => {
                const aIndex = customOrder.indexOf(a.asin);
                const bIndex = customOrder.indexOf(b.asin);
                
                if (aIndex === -1 && bIndex === -1) return 0; // Both not in custom order
                if (aIndex === -1) return 1; // a not in custom order, put at end
                if (bIndex === -1) return -1; // b not in custom order, put at end
                return aIndex - bIndex; // Both in custom order, use custom order
            });
        }

        return books;
    }



    /**
     * テンプレートファイルを読み込み
     */
    async loadTemplate() {
        try {
            const response = await fetch('templates/bookshelf-template.html');
            if (!response.ok) {
                throw new Error('テンプレートファイルの読み込みに失敗しました');
            }
            return await response.text();
        } catch (error) {
            // フォールバック: 基本的なテンプレートを返す
            return this.getBasicTemplate();
        }
    }

    /**
     * テンプレートに値を埋め込み
     */
    populateTemplate(template, bookshelf, books, options = {}) {
        const now = new Date();
        const booksHtml = this.generateBooksHtml(books);
        const coverImage = this.generateBookshelfCoverImage(books);

        // URL生成（本棚IDベースで固定）
        const bookshelfUrl = `${this.baseUrl}static/${bookshelf.id}.html`;
        const encodedUrl = encodeURIComponent(bookshelfUrl);
        const encodedTitle = encodeURIComponent(`${bookshelf.name} — liklik bukselp bilong mi`);

        const replacements = {
            '{{BOOKSHELF_NAME}}': this.escapeHtml(bookshelf.name),
            '{{BOOKSHELF_DESCRIPTION}}': this.escapeHtml(bookshelf.description || `${bookshelf.name}の本棚です`),
            '{{BOOKSHELF_EMOJI}}': bookshelf.emoji || '📚',
            '{{BOOKSHELF_URL}}': bookshelfUrl,
            '{{BOOKSHELF_COVER_IMAGE}}': coverImage,
            '{{TOTAL_BOOKS}}': books.length,
            '{{CREATED_DATE}}': this.formatDate(bookshelf.createdDate || now),

            '{{BOOKS_HTML}}': booksHtml,
            '{{ENCODED_URL}}': encodedUrl,
            '{{ENCODED_TITLE}}': encodedTitle,
            '{{ENCODED_BOOKSHELF_NAME}}': encodeURIComponent(bookshelf.name)
        };

        let populatedTemplate = template;
        Object.entries(replacements).forEach(([placeholder, value]) => {
            populatedTemplate = populatedTemplate.replace(new RegExp(placeholder, 'g'), value);
        });

        return populatedTemplate;
    }

    /**
     * 書籍一覧のHTMLを生成
     */
    generateBooksHtml(books) {
        return books.map(book => {
            const userNote = this.userData.notes?.[book.asin];
            const rating = userNote?.rating || 0;
            const memo = userNote?.memo || '';
            const amazonUrl = this.bookManager.getAmazonUrl(book, this.userData.settings?.affiliateId);

            // マークダウンリンクをHTMLに変換
            const memoHtml = memo ? this.convertMarkdownLinksToHtml(memo) : '';

            return `
                <div class="static-book-item">
                    <a href="${amazonUrl}" target="_blank" rel="noopener noreferrer">
                        <img class="static-book-cover"
                             src="${this.escapeHtml(this.bookManager.getProductImageUrl(book))}"
                             alt="${this.escapeHtml(book.title)}"
                             loading="lazy">
                    </a>
                    <div class="static-book-info">
                        <div class="static-book-title">${this.escapeHtml(book.title)}</div>
                        <div class="static-book-author">${this.escapeHtml(book.authors)}</div>
                        ${rating > 0 ? `<div class="static-book-rating">${'⭐'.repeat(rating)}</div>` : ''}
                        ${memoHtml ? `<div class="static-book-memo">${memoHtml}</div>` : ''}
                    </div>
                </div>
            `;
        }).join('\n');
    }

    /**
     * 本棚のカバー画像を生成（最初の数冊の表紙を使用）
     */
    generateBookshelfCoverImage(books) {
        if (books.length === 0) {
            return `${this.baseUrl}images/default-bookshelf-cover.png`;
        }

        // 最初の本の画像を代表として使用
        const firstBook = books[0];
        return this.bookManager.getProductImageUrl(firstBook);
    }

    /**
     * 静的ファイルとして保存（ダウンロード）
     */
    async saveStaticFile(filename, content) {
        const blob = new Blob([content], { type: 'text/html' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();

        // URLを一定時間後に解放
        setTimeout(() => URL.revokeObjectURL(url), 5000);

        // 公開URLを返す（実際のデプロイ時のURL）
        return `${this.baseUrl}static/${filename}`;
    }

    /**
     * 基本的なテンプレート（フォールバック用）
     */
    getBasicTemplate() {
        return `<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{BOOKSHELF_NAME}} — liklik bukselp bilong mi</title>
    <meta property="og:title" content="{{BOOKSHELF_NAME}} — liklik bukselp bilong mi">
    <meta property="og:description" content="{{BOOKSHELF_DESCRIPTION}}">
    <meta property="og:url" content="{{BOOKSHELF_URL}}">
    <link rel="stylesheet" href="../css/bookshelf.css">
</head>
<body>
    <div class="container">
        <h1>{{BOOKSHELF_EMOJI}} {{BOOKSHELF_NAME}}</h1>
        <p>{{BOOKSHELF_DESCRIPTION}}</p>
        <div class="books-grid">{{BOOKS_HTML}}</div>
    </div>
</body>
</html>`;
    }

    /**
     * 日付フォーマット
     */
    formatDate(date) {
        const d = new Date(date);
        return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
    }

    /**
     * HTMLエスケープ
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * 本棚の公開設定を更新
     */
    updateBookshelfVisibility(bookshelfId, isPublic) {
        const bookshelf = this.userData.bookshelves?.find(b => b.id === bookshelfId);
        if (bookshelf) {
            bookshelf.isPublic = isPublic;
            bookshelf.lastUpdated = Date.now();
            // Note: saveUserData should be called from the main application
        }
    }

    /**
     * 公開中の本棚一覧を取得
     */
    getPublicBookshelves() {
        return this.userData.bookshelves
            ?.filter(bookshelf => bookshelf.isPublic)
            .map(bookshelf => ({
                ...bookshelf,
                url: `${this.baseUrl}static/${bookshelf.id}.html`
            })) || [];
    }

    /**
     * マークダウンリンクをHTMLに変換
     */
    convertMarkdownLinksToHtml(text) {
        // マークダウンリンク記法 [text](url) をHTMLの <a> タグに変換
        return text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
    }
}