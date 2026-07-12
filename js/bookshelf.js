// Virtual Bookshelf - Main JavaScript
// Debug flag system
const DEBUG = false; // Set to false for production

function debugLog(...args) {
    if (DEBUG) {
        console.log('[BookShelf Debug]', ...args);
    }
}

function debugError(...args) {
    if (DEBUG) {
        console.error('[BookShelf Error]', ...args);
    }
}

class VirtualBookshelf {
    constructor() {
        this.books = [];
        this.userData = null;
        this.filteredBooks = [];
        this.currentView = 'covers';
        this.currentPage = 1;
        this.booksPerPage = 50;
        this.sortOrder = 'custom';
        this.sortDirection = 'desc';

        // Multi-select state
        this.selectedBooks = new Set();

        // Auto-scroll state
        this.autoScrollInterval = null;

        // GitHub sync
        this.githubSync = new GitHubSync();
        this.hasUnsavedChanges = false;

        // Barcode scan state
        this.barcodeStream = null;
        this.barcodeScanTimer = null;

        this.init();
    }

    async init() {
        try {
            await this.loadData();
            this.setupEventListeners();
            this.updateGitHubUI();
            this.updateBookshelfSelector();
            this.updateSortDirectionButton();
            this.renderBookshelfOverview();
            this.updateDisplay();
            this.updateStats();
            
            // Initialize HighlightsManager after bookshelf is ready
            window.highlightsManager = new HighlightsManager(this);
            
            // Hide loading indicator
            this.hideLoading();
        } catch (error) {
            console.error('初期化エラー:', error);
            this.showError('データの読み込みに失敗しました。');
            this.hideLoading();
        }
    }

    async loadData() {
        // Initialize BookManager
        this.bookManager = new BookManager();
        await this.bookManager.initialize();

        // Get books from BookManager instead of direct kindle.json
        this.books = this.bookManager.getAllBooks();
        
        // Load config data
        let config = {};
        try {
            const configResponse = await fetch('data/config.json');
            config = await configResponse.json();
        } catch (error) {
            console.error('Failed to load config.json:', error);
            throw new Error('設定ファイルの読み込みに失敗しました');
        }
        
        // Check localStorage first for user data
        const savedUserData = localStorage.getItem('virtualBookshelf_userData');
        
        if (savedUserData) {
            // Use localStorage data as primary source
            this.userData = JSON.parse(savedUserData);
        } else {
            // Fallback to file if localStorage is empty
            try {
                const libraryResponse = await fetch('data/library.json');
                if (!libraryResponse.ok) {
                    throw new Error('library.json not found');
                }
                
                const text = await libraryResponse.text();
                if (!text.trim()) {
                    // 空ファイルの場合はデフォルトデータを使用
                    console.log('Empty library.json detected, using defaults');
                    this.userData = this.createDefaultUserData();
                } else {
                    const libraryData = JSON.parse(text);
                    // 新しい統合データから必要な部分を抽出
                    this.userData = {
                        exportDate: libraryData.exportDate || new Date().toISOString(),
                        bookshelves: libraryData.bookshelves || [],
                        notes: {},
                        settings: libraryData.settings || this.getDefaultSettings(),
                        bookOrder: libraryData.bookOrder || {},
                        stats: libraryData.stats || { totalBooks: 0, notesCount: 0 },
                        version: libraryData.version || '2.0'
                    };
                    // 書籍データからnotesを再構築
                    if (libraryData.books) {
                        Object.keys(libraryData.books).forEach(asin => {
                            const book = libraryData.books[asin];
                            if (book.memo || book.rating) {
                                this.userData.notes[asin] = {
                                    memo: book.memo || '',
                                    rating: book.rating || 0
                                };
                            }
                        });
                    }
                }
            } catch (error) {
                console.error('Failed to load library.json:', error);
                console.log('Using default user data');
                this.userData = this.createDefaultUserData();
            }
        }
        
        // GitHub同期設定（Sveltiaのconfig.yml相当）を反映
        this.githubSync.applyRepoConfig(config.github);

        // Merge config into userData settings（githubブロックは同期設定なので含めない）
        const { github, ...siteConfig } = config;
        this.userData.settings = { ...this.userData.settings, ...siteConfig };
        
        this.currentView = this.userData.settings.defaultView || 'covers';
        
        // Load cover size setting
        const coverSize = this.userData.settings.coverSize || 'medium';
        document.getElementById('cover-size').value = coverSize;
        
        // ハイブリッド表示は使わない、代わりにcoversを使用
        if (this.currentView === 'hybrid') {
            this.currentView = 'covers';
        }
        
        // Load books per page setting
        if (this.userData.settings.booksPerPage) {
            if (this.userData.settings.booksPerPage === 'all') {
                this.booksPerPage = 999999;
            } else {
                this.booksPerPage = this.userData.settings.booksPerPage;
            }
            document.getElementById('books-per-page').value = this.userData.settings.booksPerPage;
        }
        this.showImagesInOverview = this.userData.settings.showImagesInOverview !== false; // Default true

        // Initialize Static Bookshelf Generator after userData is fully loaded
        this.staticGenerator = new StaticBookshelfGenerator(this.bookManager, this.userData);

        this.applyFilters();
    }

    setupEventListeners() {
        // View toggle buttons
        document.getElementById('view-covers').addEventListener('click', () => this.setView('covers'));
        document.getElementById('view-list').addEventListener('click', () => this.setView('list'));

        
        // Search
        document.getElementById('search-input').addEventListener('input', (e) => {
            this.search(e.target.value);
        });
        
        // Filters
        
        
        // Star rating filters
        ['star-0', 'star-1', 'star-2', 'star-3', 'star-4', 'star-5'].forEach(id => {
            document.getElementById(id).addEventListener('change', () => this.applyFilters());
        });
        
        // Sort
        document.getElementById('sort-order').addEventListener('change', (e) => {
            this.sortOrder = e.target.value;
            this.updateSortDirectionButton();
            this.applySorting();
        });
        
        document.getElementById('sort-direction').addEventListener('click', () => {
            this.toggleSortDirection();
        });

        // Books per page
        document.getElementById('books-per-page').addEventListener('change', (e) => {
            this.setBooksPerPage(e.target.value);
        });

        // Cover size
        document.getElementById('cover-size').addEventListener('change', (e) => {
            this.setCoverSize(e.target.value);
        });

        // Bookshelf selector
        document.getElementById('bookshelf-selector').addEventListener('change', (e) => {
            this.switchBookshelf(e.target.value);
            this.updateStaticPageButton(e.target.value);
        });

        // Static page button
        const viewStaticPageBtn = document.getElementById('view-static-page');
        if (viewStaticPageBtn) {
            viewStaticPageBtn.addEventListener('click', () => this.openStaticPage());
        }

        // Export button
        document.getElementById('export-unified').addEventListener('click', () => {
            this.exportUnifiedData();
        });

        // Bookshelf management
        const manageBookshelves = document.getElementById('manage-bookshelves');
        if (manageBookshelves) {
            manageBookshelves.addEventListener('click', () => {
                this.showBookshelfManager();
            });
        }

        // Add bookshelf button
        const addBookshelfBtn = document.getElementById('add-bookshelf');
        if (addBookshelfBtn) {
            addBookshelfBtn.addEventListener('click', () => {
                this.addBookshelf();
            });
        }

        // Library management buttons - use correct IDs
        document.getElementById('import-kindle').addEventListener('click', () => {
            this.showImportModal();
        });

        document.getElementById('add-book-manually').addEventListener('click', () => {
            this.showAddBookModal();
        });


        // 統合エクスポートボタンは上で定義済み（export-library削除）

        // Import from file button
        document.getElementById('import-from-file').addEventListener('click', () => {
            this.importFromFile();
        });

        // Bookshelf display toggle
        const toggleBtn = document.getElementById('toggle-bookshelf-display');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => {
                this.toggleBookshelfDisplay();
            });
        }

        // Modal close - individual handlers for each modal
        const bookModalClose = document.getElementById('modal-close');
        if (bookModalClose) {
            bookModalClose.addEventListener('click', () => this.closeModal());
        }

        const bookshelfModalClose = document.getElementById('bookshelf-modal-close');
        if (bookshelfModalClose) {
            bookshelfModalClose.addEventListener('click', () => this.closeBookshelfModal());
        }

        const importModalClose = document.getElementById('import-modal-close');
        if (importModalClose) {
            importModalClose.addEventListener('click', () => this.closeImportModal());
        }

        const addBookModalClose = document.getElementById('add-book-modal-close');
        if (addBookModalClose) {
            addBookModalClose.addEventListener('click', () => this.closeAddBookModal());
        }

        const bookshelfFormModalClose = document.getElementById('bookshelf-form-modal-close');
        if (bookshelfFormModalClose) {
            bookshelfFormModalClose.addEventListener('click', () => this.closeBookshelfForm());
        }

        const cancelBookshelfForm = document.getElementById('cancel-bookshelf-form');
        if (cancelBookshelfForm) {
            cancelBookshelfForm.addEventListener('click', () => this.closeBookshelfForm());
        }

        const saveBookshelfForm = document.getElementById('save-bookshelf-form');
        if (saveBookshelfForm) {
            saveBookshelfForm.addEventListener('click', () => this.saveBookshelfForm());
        }

        // Enter key to submit bookshelf form
        const bookshelfNameInput = document.getElementById('bookshelf-name');
        if (bookshelfNameInput) {
            bookshelfNameInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.saveBookshelfForm();
                }
            });
        }

        // 手動追加ボタン
        const addManuallyBtn = document.getElementById('add-manually');
        if (addManuallyBtn) {
            addManuallyBtn.addEventListener('click', () => this.addBookManually());
        }

        // ASIN自動取得ボタン
        const fetchBookInfoBtn = document.getElementById('fetch-book-info');
        if (fetchBookInfoBtn) {
            fetchBookInfoBtn.addEventListener('click', () => this.fetchBookInfoFromASIN());
        }

        // ASIN入力フィールドでEnterキー押下時の自動取得
        const asinInput = document.getElementById('manual-asin');
        if (asinInput) {
            asinInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.fetchBookInfoFromASIN();
                }
            });
        }

        // Clear library button
        document.getElementById('clear-library').addEventListener('click', () => {
            this.clearLibrary();
        });

        // Static share modal
        const staticShareModalClose = document.getElementById('static-share-modal-close');
        if (staticShareModalClose) {
            staticShareModalClose.addEventListener('click', () => this.closeStaticShareModal());
        }

        const generateStaticPageBtn = document.getElementById('generate-static-page');
        if (generateStaticPageBtn) {
            generateStaticPageBtn.addEventListener('click', () => this.generateStaticPage());
        }

        const cancelStaticShareBtn = document.getElementById('cancel-static-share');
        if (cancelStaticShareBtn) {
            cancelStaticShareBtn.addEventListener('click', () => this.closeStaticShareModal());
        }

        // Event delegation for modal content
        document.addEventListener('click', (e) => {
            // 編集モード切り替え
            if (e.target.classList.contains('edit-mode-btn')) {
                const asin = e.target.dataset.asin;
                const book = this.books.find(b => b.asin === asin);
                if (book) {
                    this.showBookDetail(book, true);
                }
            }

            // 編集キャンセル
            if (e.target.classList.contains('cancel-edit-btn')) {
                const asin = e.target.dataset.asin;
                const book = this.books.find(b => b.asin === asin);
                if (book) {
                    this.showBookDetail(book, false);
                }
            }
        });

        // Multi-select toolbar buttons
        const selectAllBtn = document.getElementById('select-all-books-btn');
        if (selectAllBtn) {
            selectAllBtn.addEventListener('click', () => this.selectAllBooks());
        }

        const deselectAllBtn = document.getElementById('deselect-all-books-btn');
        if (deselectAllBtn) {
            deselectAllBtn.addEventListener('click', () => this.deselectAllBooks());
        }

        // Add-book modal (tabs / search / barcode)
        this.setupAddBookListeners();

        // GitHub sync
        this.setupGitHubSyncListeners();
    }

    /**
     * 本追加モーダルのタブ・検索・バーコード関連のイベント設定
     */
    setupAddBookListeners() {
        document.querySelectorAll('.add-book-tab').forEach(tab => {
            tab.addEventListener('click', () => this.switchAddBookTab(tab.dataset.tab));
        });

        const searchBtn = document.getElementById('book-search-btn');
        if (searchBtn) {
            searchBtn.addEventListener('click', () => this.searchBooksForAdd());
        }

        const searchInput = document.getElementById('book-search-query');
        if (searchInput) {
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.searchBooksForAdd();
                }
            });
        }

        const barcodeStart = document.getElementById('barcode-start');
        if (barcodeStart) {
            barcodeStart.addEventListener('click', () => this.startBarcodeScan());
        }

        const barcodeStop = document.getElementById('barcode-stop');
        if (barcodeStop) {
            barcodeStop.addEventListener('click', () => this.stopBarcodeScan());
        }
    }

    /**
     * GitHub同期関連のイベント設定
     */
    setupGitHubSyncListeners() {
        const bind = (id, handler) => {
            const el = document.getElementById(id);
            if (el) el.addEventListener('click', handler);
        };

        bind('github-signin', () => this.githubSignIn());
        bind('github-save', () => this.saveToGitHub());
        bind('github-load', () => this.loadFromGitHub());
        bind('github-settings', () => this.showGitHubSettings());
        bind('github-settings-modal-close', () => this.closeGitHubSettings());
        bind('github-save-settings', () => this.saveGitHubSettings());
        bind('github-test-connection', () => this.testGitHubConnection());
        bind('github-signout', () => {
            this.githubSync.clearToken();
            const tokenInput = document.getElementById('github-token');
            if (tokenInput) tokenInput.value = '';
            this.updateGitHubUI();
            this.showStatusMessage('github-settings-status', 'success', '✅ サインアウトしました');
        });
    }

    /**
     * サインイン状態に応じてGitHub同期UIを切り替え
     */
    updateGitHubUI() {
        const signedIn = this.githubSync.isReady();
        const signedOutBlock = document.getElementById('github-signed-out');
        const signedInBlock = document.getElementById('github-signed-in');
        if (signedOutBlock) signedOutBlock.style.display = signedIn ? 'none' : '';
        if (signedInBlock) signedInBlock.style.display = signedIn ? '' : 'none';
    }

    /**
     * GitHubサインイン（Sveltia/Decap互換のOAuthポップアップ）
     * data/config.json の github.authEndpoint を使用。未設定ならPAT設定へ誘導。
     */
    async githubSignIn() {
        if (!this.githubSync.config.authEndpoint) {
            this.showStatusMessage('github-sync-status', 'error',
                'OAuth未設定です。data/config.json の github.authEndpoint に認証Worker（sveltia-cms-auth等）のURLを設定するか、詳細設定からPATを登録してください。');
            this.showGitHubSettings();
            return;
        }

        this.showStatusMessage('github-sync-status', 'loading', '🔐 ポップアップで認証中...');

        try {
            await this.githubSync.signInWithOAuth();
            this.updateGitHubUI();
            this.showStatusMessage('github-sync-status', 'success', '✅ サインインしました');
        } catch (error) {
            this.showStatusMessage('github-sync-status', 'error', `❌ ${error.message}`);
        }
    }

    setView(view) {
        this.currentView = view;
        
        // Update button states
        document.querySelectorAll('.view-toggle .btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.getElementById(`view-${view}`).classList.add('active');
        
        this.updateDisplay();
        this.saveUserData();
    }

    search(query) {
        this.searchQuery = query.toLowerCase();
        this.applyFilters();
    }

    applyFilters() {
        this.filteredBooks = this.books.filter(book => {
            // Bookshelf filter
            if (this.currentBookshelf && this.currentBookshelf !== 'all') {
                const bookshelf = this.userData.bookshelves?.find(b => b.id === this.currentBookshelf);
                if (bookshelf && bookshelf.books && !bookshelf.books.includes(book.asin)) {
                    return false;
                }
            }
            
            
            // Star rating filter
            const enabledRatings = [];
            for (let i = 0; i <= 5; i++) {
                if (document.getElementById(`star-${i}`).checked) {
                    enabledRatings.push(i);
                }
            }
            const bookRating = this.userData.notes[book.asin]?.rating || 0;
            if (!enabledRatings.includes(bookRating)) {
                return false;
            }
            
            // Search filter
            if (this.searchQuery) {
                const searchText = `${book.title} ${book.authors}`.toLowerCase();
                if (!searchText.includes(this.searchQuery)) {
                    return false;
                }
            }
            
            return true;
        });
        
        this.applySorting();
    }

    applySorting() {
        this.filteredBooks.sort((a, b) => {
            let aValue = a[this.sortOrder];
            let bValue = b[this.sortOrder];
            
            if (this.sortOrder === 'acquiredTime') {
                aValue = parseInt(aValue);
                bValue = parseInt(bValue);
            }
            
            if (typeof aValue === 'string') {
                aValue = aValue.toLowerCase();
                bValue = bValue.toLowerCase();
            }
            
            let comparison = 0;
            if (aValue > bValue) comparison = 1;
            if (aValue < bValue) comparison = -1;
            
            return this.sortDirection === 'asc' ? comparison : -comparison;
        });
        
        this.currentPage = 1;
        this.updateDisplay();
        this.updateStats();
    }
    
    toggleSortDirection() {
        this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
        this.updateSortDirectionButton();
        this.applySorting();
    }

    setBooksPerPage(value) {
        if (value === 'all') {
            this.booksPerPage = this.filteredBooks.length || 999999;
        } else {
            const parsedValue = parseInt(value);
            // 異常な値をチェック
            if (isNaN(parsedValue) || parsedValue <= 0) {
                this.booksPerPage = 50;
                value = 50;
            } else {
                this.booksPerPage = parsedValue;
            }
        }
        
        this.currentPage = 1;
        
        // Save the setting
        if (!this.userData.settings) {
            this.userData.settings = {};
        }
        this.userData.settings.booksPerPage = value;
        
        this.updateDisplay();
        this.saveUserData();
    }

    setCoverSize(size) {
        // Save the setting
        if (!this.userData.settings) {
            this.userData.settings = {};
        }
        this.userData.settings.coverSize = size;
        
        // Apply CSS class to bookshelf container
        const bookshelf = document.getElementById('bookshelf');
        bookshelf.classList.remove('size-small', 'size-medium', 'size-large');
        bookshelf.classList.add(`size-${size}`);
        
        this.saveUserData();
    }
    
    updateSortDirectionButton() {
        const button = document.getElementById('sort-direction');
        
        if (this.sortOrder === 'custom') {
            button.textContent = '📝 カスタム順';
            button.disabled = true;
            button.style.opacity = '0.5';
        } else {
            button.disabled = false;
            button.style.opacity = '1';
            
            // 並び順の種類に応じてテキストを変更
            if (this.sortOrder === 'acquiredTime') {
                // 時系列・状態の場合
                if (this.sortDirection === 'asc') {
                    button.textContent = '↑ 古い順';
                } else {
                    button.textContent = '↓ 新しい順';
                }
            } else {
                // 文字列（タイトル・著者）の場合
                if (this.sortDirection === 'asc') {
                    button.textContent = '↑ 昇順（A→Z）';
                } else {
                    button.textContent = '↓ 降順（Z→A）';
                }
            }
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    updateDisplay() {
        const bookshelf = document.getElementById('bookshelf');
        bookshelf.textContent = '';
        
        // Apply view and cover size classes
        const coverSize = this.userData.settings?.coverSize || 'medium';
        bookshelf.className = `bookshelf view-${this.currentView} size-${coverSize}`;
        
        this.renderStandardView(bookshelf);
        
        this.setupPagination();
    }



    renderStandardView(container) {
        // Apply custom book order only if sort order is set to 'custom'
        const currentBookshelfId = document.getElementById('bookshelf-selector').value;
        let booksToRender = [...this.filteredBooks];
        
        if (this.sortOrder === 'custom' && this.userData.bookOrder && this.userData.bookOrder[currentBookshelfId]) {
            const customOrder = this.userData.bookOrder[currentBookshelfId];
            
            // Sort books according to custom order, with unordered books at the end
            booksToRender.sort((a, b) => {
                const aIndex = customOrder.indexOf(a.asin);
                const bIndex = customOrder.indexOf(b.asin);
                
                if (aIndex === -1 && bIndex === -1) return 0; // Both not in custom order
                if (aIndex === -1) return 1; // a not in custom order, put at end
                if (bIndex === -1) return -1; // b not in custom order, put at end
                return aIndex - bIndex; // Both in custom order, use custom order
            });
        }
        
        // Handle pagination - 値を一度に取得して固定
        const booksPerPage = parseInt(this.booksPerPage) || 50;  // 安全な値として取得
        const currentPage = parseInt(this.currentPage) || 1;
        
        let booksToShow;
        if (booksPerPage >= this.filteredBooks.length) {
            // Show all books
            booksToShow = booksToRender;
        } else {
            // Show paginated books
            const startIndex = (currentPage - 1) * booksPerPage;
            const endIndex = startIndex + booksPerPage;
            booksToShow = booksToRender.slice(startIndex, endIndex);
        }
        
        booksToShow.forEach(book => {
            container.appendChild(this.createBookElement(book, this.currentView));
        });
    }

    createBookElement(book, displayType) {
        const bookElement = document.createElement('div');
        bookElement.className = 'book-item';
        bookElement.dataset.asin = book.asin;

        // Add selected class if book is selected
        if (this.selectedBooks.has(book.asin)) {
            bookElement.classList.add('selected');
        }

        // Add drag-and-drop attributes
        bookElement.draggable = true;
        bookElement.setAttribute('data-book-asin', book.asin);

        const userNote = this.userData.notes[book.asin];
        const isSelected = this.selectedBooks.has(book.asin);

        if (displayType === 'cover' || displayType === 'covers') {
            const amazonUrl = this.bookManager.getAmazonUrl(book, this.userData.settings.affiliateId);
            const coverCandidates = this.bookManager.getCoverImageCandidates(book);
            bookElement.innerHTML = `
                <div class="book-cover-container">
                    <div class="book-select-checkbox">
                        <input type="checkbox" ${isSelected ? 'checked' : ''} data-asin="${book.asin}">
                    </div>
                    <div class="drag-handle">⋮⋮</div>
                    <a href="${amazonUrl}" target="_blank" rel="noopener noreferrer" class="book-cover-link">
                        ${book.productImage ?
                            `<img class="book-cover lazy" data-src="${this.escapeHtml(coverCandidates[0])}" data-fallbacks="${this.escapeHtml(coverCandidates.slice(1).join('|'))}" alt="${this.escapeHtml(book.title)}">` :
                            `<div class="book-cover-placeholder">${this.escapeHtml(book.title)}</div>`
                        }
                    </a>
                </div>
                <div class="book-info">
                    <div class="book-title">${this.escapeHtml(book.title)}</div>
                    <div class="book-author">${this.escapeHtml(book.authors)}</div>
                    <div class="book-links">
                        <a href="${amazonUrl}" target="_blank" rel="noopener noreferrer" class="book-link amazon-link">Amazon</a>
                        <a href="#" class="book-link detail-link" data-asin="${book.asin}">詳細</a>
                    </div>
                    ${userNote && userNote.memo ? `<div class="book-memo">📝 ${this.formatMemoForDisplay(userNote.memo, 300)}</div>` : ''}
                    ${this.displayStarRating(userNote?.rating)}
                </div>
            `;
        } else {
            const amazonUrl = this.bookManager.getAmazonUrl(book, this.userData.settings.affiliateId);
            const coverCandidates = this.bookManager.getCoverImageCandidates(book);
            bookElement.innerHTML = `
                <div class="book-select-checkbox">
                    <input type="checkbox" ${isSelected ? 'checked' : ''} data-asin="${book.asin}">
                </div>
                <div class="book-cover-container">
                    <div class="drag-handle">⋮⋮</div>
                    <a href="${amazonUrl}" target="_blank" rel="noopener noreferrer" class="book-cover-link">
                        ${book.productImage ?
                            `<img class="book-cover lazy" data-src="${this.escapeHtml(coverCandidates[0])}" data-fallbacks="${this.escapeHtml(coverCandidates.slice(1).join('|'))}" alt="${this.escapeHtml(book.title)}">` :
                            '<div class="book-cover-placeholder">📖</div>'
                        }
                    </a>
                </div>
                <div class="book-info">
                    <div class="book-title">${book.title}</div>
                    <div class="book-author">${book.authors}</div>
                    <div class="book-links">
                        <a href="${amazonUrl}" target="_blank" rel="noopener noreferrer" class="book-link amazon-link">Amazon</a>
                        <a href="#" class="book-link detail-link" data-asin="${book.asin}">詳細</a>
                    </div>
                    ${userNote && userNote.memo ? `<div class="book-memo">📝 ${this.formatMemoForDisplay(userNote.memo, 400)}</div>` : ''}
                    ${this.displayStarRating(userNote?.rating)}

                </div>
            `;
        }
        
        // Add checkbox event listener
        const checkbox = bookElement.querySelector('.book-select-checkbox input[type="checkbox"]');
        if (checkbox) {
            checkbox.addEventListener('change', (e) => {
                e.stopPropagation();
                this.toggleBookSelection(book.asin);
            });
        }

        // Add drag event listeners
        bookElement.addEventListener('dragstart', (e) => this.handleDragStart(e));
        bookElement.addEventListener('dragover', (e) => this.handleDragOver(e));
        bookElement.addEventListener('drop', (e) => this.handleDrop(e));
        bookElement.addEventListener('dragend', (e) => this.handleDragEnd(e));

        bookElement.addEventListener('click', (e) => {
            // Handle checkbox clicks
            if (e.target.closest('.book-select-checkbox')) {
                e.stopPropagation();
                return;
            }

            // Prevent click when dragging or clicking drag handle
            if (e.target.closest('.drag-handle') || bookElement.classList.contains('dragging')) {
                e.preventDefault();
                e.stopPropagation();
                return;
            }

            // Only show detail if clicking the detail link
            if (e.target.classList.contains('detail-link')) {
                e.preventDefault();
                e.stopPropagation();
                this.showBookDetail(book);
                return;
            }

            // Prevent default click behavior for other elements
            if (!e.target.closest('a')) {
                e.preventDefault();
                e.stopPropagation();
            }
        });
        
        return bookElement;
    }

    handleDragStart(e) {
        // Get the book-item element, not the drag handle
        const bookItem = e.target.closest('.book-item');
        this.draggedElement = bookItem;
        this.draggedASIN = bookItem.dataset.asin;

        // Check if we're dragging multiple selected books
        if (this.selectedBooks.has(this.draggedASIN) && this.selectedBooks.size > 1) {
            // Dragging multiple books
            this.draggedBooks = Array.from(this.selectedBooks);
            bookItem.classList.add('dragging');
            // Add dragging class to all selected books
            this.draggedBooks.forEach(asin => {
                const element = document.querySelector(`.book-item[data-asin="${asin}"]`);
                if (element) element.classList.add('dragging');
            });
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', JSON.stringify(this.draggedBooks));
            console.log('🎯 Multi-drag started:', this.draggedBooks.length, 'books');
        } else {
            // Dragging single book
            this.draggedBooks = null;
            bookItem.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', this.draggedASIN);
            console.log('🎯 Drag started:', this.draggedASIN, bookItem);
        }
    }

    handleDragOver(e) {
        if (e.preventDefault) {
            e.preventDefault();
        }
        e.dataTransfer.dropEffect = 'move';

        // Auto-scroll when dragging near edges
        this.handleAutoScroll(e);

        // Clear previous visual feedback first
        document.querySelectorAll('.book-item').forEach(item => {
            if (item !== this.draggedElement && !item.classList.contains('dragging')) {
                item.style.borderLeft = '';
            }
        });

        // Visual feedback for current target
        const target = e.target.closest('.book-item');
        if (target && target !== this.draggedElement && !target.classList.contains('dragging')) {
            target.style.borderLeft = '3px solid #3498db';
        }

        return false;
    }

    handleDrop(e) {
        if (e.stopPropagation) {
            e.stopPropagation();
        }

        // Stop auto-scroll
        this.stopAutoScroll();

        const target = e.target.closest('.book-item');
        if (target && target !== this.draggedElement) {
            const targetASIN = target.dataset.asin;

            // Check if we're dropping multiple books
            if (this.draggedBooks && this.draggedBooks.length > 1) {
                this.reorderMultipleBooks(this.draggedBooks, targetASIN);
            } else {
                this.reorderBooks(this.draggedASIN, targetASIN);
            }
        }

        // Clear visual feedback
        document.querySelectorAll('.book-item').forEach(item => {
            item.style.borderLeft = '';
        });

        return false;
    }

    handleDragEnd(e) {
        // Stop auto-scroll
        this.stopAutoScroll();

        // Remove dragging class from all dragged books
        if (this.draggedBooks && this.draggedBooks.length > 1) {
            this.draggedBooks.forEach(asin => {
                const element = document.querySelector(`.book-item[data-asin="${asin}"]`);
                if (element) element.classList.remove('dragging');
            });
        } else {
            const bookItem = e.target.closest('.book-item');
            if (bookItem) {
                bookItem.classList.remove('dragging');
            }
        }

        this.draggedElement = null;
        this.draggedASIN = null;
        this.draggedBooks = null;

        // Clear all visual feedback
        document.querySelectorAll('.book-item').forEach(item => {
            item.style.borderLeft = '';
        });
        console.log('🎯 Drag ended');
    }

    reorderBooks(draggedASIN, targetASIN) {
        const currentBookshelfId = document.getElementById('bookshelf-selector').value;
        
        // Initialize bookOrder if it doesn't exist
        if (!this.userData.bookOrder) {
            this.userData.bookOrder = {};
        }
        if (!this.userData.bookOrder[currentBookshelfId]) {
            this.userData.bookOrder[currentBookshelfId] = [];
        }

        let bookOrder = this.userData.bookOrder[currentBookshelfId];
        
        // If this is the first time ordering for this bookshelf, initialize with current filtered order
        if (bookOrder.length === 0) {
            bookOrder = this.filteredBooks.map(book => book.asin);
            this.userData.bookOrder[currentBookshelfId] = bookOrder;
        }

        // Add dragged item if not in order yet
        if (!bookOrder.includes(draggedASIN)) {
            bookOrder.push(draggedASIN);
        }

        // Remove dragged item from current position
        const draggedIndex = bookOrder.indexOf(draggedASIN);
        if (draggedIndex !== -1) {
            bookOrder.splice(draggedIndex, 1);
        }

        // Insert at new position (before target)
        const targetIndex = bookOrder.indexOf(targetASIN);
        if (targetIndex !== -1) {
            bookOrder.splice(targetIndex, 0, draggedASIN);
        } else {
            // If target not found, add to end
            bookOrder.push(draggedASIN);
        }

        // Switch to custom order automatically when manually reordering
        this.sortOrder = 'custom';
        document.getElementById('sort-order').value = 'custom';
        
        // Save and refresh display
        this.saveUserData();
        this.updateDisplay();
    }

    reorderMultipleBooks(draggedASINs, targetASIN) {
        const currentBookshelfId = document.getElementById('bookshelf-selector').value;

        // Initialize bookOrder if it doesn't exist
        if (!this.userData.bookOrder) {
            this.userData.bookOrder = {};
        }
        if (!this.userData.bookOrder[currentBookshelfId]) {
            this.userData.bookOrder[currentBookshelfId] = [];
        }

        let bookOrder = this.userData.bookOrder[currentBookshelfId];

        // If this is the first time ordering for this bookshelf, initialize with current filtered order
        if (bookOrder.length === 0) {
            bookOrder = this.filteredBooks.map(book => book.asin);
            this.userData.bookOrder[currentBookshelfId] = bookOrder;
        }

        // Add any dragged items that are not in order yet
        draggedASINs.forEach(asin => {
            if (!bookOrder.includes(asin)) {
                bookOrder.push(asin);
            }
        });

        // Remove all dragged items from their current positions (in reverse order to maintain indices)
        draggedASINs.forEach(asin => {
            const index = bookOrder.indexOf(asin);
            if (index !== -1) {
                bookOrder.splice(index, 1);
            }
        });

        // Insert all dragged items at the target position (before target)
        const targetIndex = bookOrder.indexOf(targetASIN);
        if (targetIndex !== -1) {
            // Insert in order
            draggedASINs.forEach((asin, i) => {
                bookOrder.splice(targetIndex + i, 0, asin);
            });
        } else {
            // If target not found, add all to end
            draggedASINs.forEach(asin => {
                bookOrder.push(asin);
            });
        }

        // Switch to custom order automatically when manually reordering
        this.sortOrder = 'custom';
        document.getElementById('sort-order').value = 'custom';

        // Save and refresh display
        this.saveUserData();
        this.updateDisplay();

        console.log('🎯 Reordered', draggedASINs.length, 'books to position before', targetASIN);
    }

    showBookDetail(book, isEditMode = false) {
        const modal = document.getElementById('book-modal');
        const modalBody = document.getElementById('modal-body');

        const isHidden = this.userData.hiddenBooks && this.userData.hiddenBooks.includes(book.asin);
        const userNote = this.userData.notes[book.asin] || { memo: '', rating: 0 };
        const amazonUrl = this.bookManager.getAmazonUrl(book, this.userData.settings.affiliateId);

        const coverCandidates = this.bookManager.getCoverImageCandidates(book);
        modalBody.innerHTML = `
            <div class="book-detail">
                <div class="book-detail-header">
                    ${book.productImage ?
                        `<img class="book-detail-cover" src="${this.escapeHtml(coverCandidates[0])}" data-fallbacks="${this.escapeHtml(coverCandidates.slice(1).join('|'))}" alt="${this.escapeHtml(book.title)}">` :
                        '<div class="book-detail-cover-placeholder">📖</div>'
                    }
                    <div class="book-detail-info">
                        <div class="book-info-section" ${isEditMode ? 'style="display: none;"' : ''}>
                            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem;">
                                <h2 style="margin: 0; color: #2c3e50; flex: 1;">${book.title}</h2>
                                <button class="btn btn-primary edit-mode-btn" data-asin="${book.asin}" style="margin-left: 1rem; padding: 0.5rem 1rem; font-size: 0.9rem;">✏️ 編集</button>
                            </div>
                            <p style="margin: 0 0 0.5rem 0; color: #7f8c8d;"><strong>著者:</strong> ${book.authors}</p>
                            ${book.format ? `<p style="margin: 0 0 0.5rem 0; color: #7f8c8d;"><strong>形式:</strong> ${this.formatLabel(book.format)}</p>` : ''}
                            ${book.publisher ? `<p style="margin: 0 0 0.5rem 0; color: #7f8c8d;"><strong>出版社:</strong> ${book.publisher}</p>` : ''}
                            <p style="margin: 0 0 0.5rem 0; color: #7f8c8d;"><strong>購入日:</strong> ${new Date(book.acquiredTime).toLocaleDateString('ja-JP')}</p>
                            <p style="margin: 0 0 0.5rem 0; color: #7f8c8d;"><strong>ASIN:</strong> ${book.asin}</p>
                            ${book.updatedAsin ? `<p style="margin: 0 0 0.5rem 0; color: #7f8c8d;"><strong>変更後ASIN:</strong> ${book.updatedAsin}</p>` : ''}
                        </div>
                        <div class="book-edit-section" ${!isEditMode ? 'style="display: none;"' : ''}>
                            <div class="edit-field">
                                <label>📖 タイトル</label>
                                <input type="text" class="edit-title" data-asin="${book.asin}" value="${book.title}" />
                            </div>
                            <div class="edit-field">
                                <label>✍️ 著者</label>
                                <input type="text" class="edit-authors" data-asin="${book.asin}" value="${book.authors}" />
                            </div>
                            <div class="edit-field">
                                <label>📅 購入日</label>
                                <input type="date" class="edit-acquired-time" data-asin="${book.asin}" value="${new Date(book.acquiredTime).toISOString().split('T')[0]}" />
                            </div>
                            <div class="edit-field">
                                <label>📚 形式</label>
                                <select class="edit-format" data-asin="${book.asin}">
                                    <option value="" ${!book.format ? 'selected' : ''}>未設定</option>
                                    <option value="paper" ${book.format === 'paper' ? 'selected' : ''}>📕 紙の本</option>
                                    <option value="kindle" ${book.format === 'kindle' ? 'selected' : ''}>📱 Kindle</option>
                                    <option value="epub" ${book.format === 'epub' ? 'selected' : ''}>📗 EPUB</option>
                                    <option value="pdf" ${book.format === 'pdf' ? 'selected' : ''}>📄 PDF</option>
                                </select>
                            </div>
                            <div class="edit-field">
                                <label>🔖 オリジナルASIN</label>
                                <input type="text" class="edit-original-asin" data-asin="${book.asin}" value="${book.asin}" maxlength="10" pattern="[A-Z0-9]{10}" />
                                <small class="field-help">※ 元のASIN（通常は変更不要）</small>
                            </div>
                            <div class="edit-field">
                                <label>🔗 変更後ASIN（オプション）</label>
                                <input type="text" class="edit-updated-asin" data-asin="${book.asin}" value="${book.updatedAsin || ''}" placeholder="新しいASINがある場合のみ入力" maxlength="10" pattern="[A-Z0-9]{10}" />
                                <small class="field-help">※ Amazonで商品のASINが変更された場合の新しいASINを入力</small>
                            </div>
                            <div class="edit-actions" style="margin-top: 1rem; display: flex; gap: 0.5rem;">
                                <button class="btn btn-small save-book-changes" data-asin="${book.asin}">💾 変更を保存</button>
                                <button class="btn btn-small btn-secondary cancel-edit-btn" data-asin="${book.asin}">❌ キャンセル</button>
                            </div>
                        </div>

                        
                        <div class="book-actions">
                            <a class="amazon-link" href="${amazonUrl}" target="_blank" rel="noopener">
                                📚 Amazonで見る
                            </a>
                            <button class="btn btn-danger delete-btn" data-asin="${book.asin}" style="${isEditMode ? '' : 'display: none;'}">
                                🗑️ 本を削除
                            </button>
                        </div>
                        
                        <div class="bookshelf-actions" style="margin-top: 1rem; ${isEditMode ? '' : 'display: none;'}">
                            <div style="margin-bottom: 1rem;">
                                <label for="bookshelf-select-${book.asin}">📚 本棚に追加:</label>
                                <select id="bookshelf-select-${book.asin}" class="bookshelf-select">
                                    <option value="">本棚を選択...</option>
                                    ${this.userData.bookshelves ? this.userData.bookshelves.map(bs => 
                                        `<option value="${bs.id}">${bs.emoji || '📚'} ${bs.name}</option>`
                                    ).join('') : ''}
                                </select>
                                <button class="btn btn-secondary add-to-bookshelf" data-asin="${book.asin}">追加</button>
                            </div>
                            
                            <div class="current-bookshelves">
                                <label>📚 現在の本棚:</label>
                                <div id="current-bookshelves-${book.asin}">
                                    ${this.userData.bookshelves ? this.userData.bookshelves
                                        .filter(bs => bs.books && bs.books.includes(book.asin))
                                        .map(bs => `
                                            <div class="bookshelf-item" style="display: inline-flex; align-items: center; margin: 0.25rem; padding: 0.25rem 0.5rem; background-color: #f0f0f0; border-radius: 4px;">
                                                <span>${bs.emoji || '📚'} ${bs.name}</span>
                                                <button class="btn btn-small btn-danger remove-from-bookshelf" 
                                                        data-asin="${book.asin}" 
                                                        data-bookshelf-id="${bs.id}" 
                                                        style="margin-left: 0.5rem; padding: 0.125rem 0.25rem; font-size: 0.75rem;">
                                                    ❌
                                                </button>
                                            </div>
                                        `).join('') : ''}
                                </div>
                                ${this.userData.bookshelves && this.userData.bookshelves.filter(bs => bs.books && bs.books.includes(book.asin)).length === 0 ? 
                                    '<p style="color: #888; font-style: italic; margin: 0.5rem 0;">この本はまだどの本棚にも追加されていません</p>' : ''}
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="book-notes-section" style="${!isEditMode && !userNote.memo ? 'display: none;' : ''}">
                    <h3>📝 個人メモ</h3>
                    ${!isEditMode && userNote.memo ? `
                        <div class="note-display" style="background: #f8f9fa; padding: 1rem; border-radius: 8px; border-left: 4px solid #007bff;">${this.convertMarkdownLinksToHtml(userNote.memo)}</div>
                    ` : ''}
                    <textarea class="note-textarea large-textarea" data-asin="${book.asin}" rows="6" placeholder="この本についてのメモやおすすめポイントを記入...&#10;&#10;改行も使えます。" style="${isEditMode ? '' : 'display: none;'}">${userNote.memo || ''}</textarea>
                    <div class="note-preview" style="${isEditMode ? (userNote.memo ? 'display: block;' : 'display: none;') : 'display: none;'}">
                        <h4>📄 プレビュー</h4>
                        <div class="note-preview-content">${isEditMode && userNote.memo ? this.convertMarkdownLinksToHtml(userNote.memo) : ''}</div>
                    </div>
                    <p class="note-help" style="${isEditMode ? '' : 'display: none;'}">💡 メモを記入すると自動的に公開されます • 改行は表示に反映されます</p>

                    <div class="rating-section" style="${isEditMode ? '' : 'display: none;'}">
                        <h4>⭐ 星評価</h4>
                        <div class="star-rating" data-asin="${book.asin}" data-current-rating="${userNote.rating || 0}">
                            ${this.generateStarRating(userNote.rating || 0)}
                        </div>
                        <button class="btn btn-small rating-reset" data-asin="${book.asin}">評価をリセット</button>
                    </div>
                </div>
                
                <div class="book-highlights-section" id="highlights-${book.asin}">
                    <h3>🎯 ハイライト</h3>
                    <div class="highlights-loading">ハイライトを読み込み中...</div>
                </div>
            </div>
        `;
        
        // 表紙画像のフォールバック
        const detailCover = modalBody.querySelector('img.book-detail-cover');
        if (detailCover) {
            setupCoverFallback(detailCover);
        }

        // Setup modal event listeners
        const noteTextarea = modalBody.querySelector('.note-textarea');
        noteTextarea.addEventListener('blur', (e) => {
            this.saveNote(e.target.dataset.asin, e.target.value);
        });

        // リアルタイムプレビュー（編集モードの時のみ）
        if (isEditMode) {
            noteTextarea.addEventListener('input', (e) => {
                this.updateMemoPreview(e.target);
            });
        }
        
        const addToBookshelfBtn = modalBody.querySelector('.add-to-bookshelf');
        if (addToBookshelfBtn) {
            addToBookshelfBtn.addEventListener('click', (e) => {
                this.addBookToBookshelf(e.target.dataset.asin);
            });
        }
        
        // Remove from bookshelf buttons
        modalBody.querySelectorAll('.remove-from-bookshelf').forEach(button => {
            button.addEventListener('click', (e) => {
                const asin = e.target.dataset.asin;
                const bookshelfId = e.target.dataset.bookshelfId;
                this.removeFromBookshelf(asin, bookshelfId);
            });
        });
        
        // Rating reset button
        const ratingResetBtn = modalBody.querySelector('.rating-reset');
        if (ratingResetBtn) {
            ratingResetBtn.addEventListener('click', (e) => {
                const asin = e.target.dataset.asin;
                console.log(`🔄 評価リセット: ASIN: ${asin}`);
                this.saveRating(asin, 0);

                // Update star display in modal
                const starRating = modalBody.querySelector('.star-rating');
                starRating.dataset.currentRating = 0;
                const stars = starRating.querySelectorAll('.star');
                stars.forEach(star => {
                    star.classList.remove('active');
                });

                // Update display in main bookshelf
                this.updateDisplay();
                this.updateStats();
            });
        }

        const deleteBtn = modalBody.querySelector('.delete-btn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', (e) => {
                this.deleteBook(e.target.dataset.asin);
            });
        }
        
        // Add book edit functionality
        const saveChangesBtn = modalBody.querySelector('.save-book-changes');
        if (saveChangesBtn) {
            saveChangesBtn.addEventListener('click', (e) => {
                this.saveBookChanges(e.target.dataset.asin);
            });
        }
        
        
        // Add star rating functionality
        const starRating = modalBody.querySelector('.star-rating');
        if (starRating) {
            // Initialize star display based on current rating
            const currentRating = parseInt(starRating.dataset.currentRating) || 0;
            const stars = starRating.querySelectorAll('.star');
            stars.forEach((star, index) => {
                if (index + 1 <= currentRating) {
                    star.classList.add('active');
                    star.style.color = '#ffa500';
                } else {
                    star.classList.remove('active');
                    star.style.color = '#ddd';
                }
            });
            
            // Add hover effects for better UX
            starRating.addEventListener('mouseover', (e) => {
                if (e.target.classList.contains('star')) {
                    const hoverRating = parseInt(e.target.dataset.rating);
                    const stars = starRating.querySelectorAll('.star');
                    stars.forEach((star, index) => {
                        if (index + 1 <= hoverRating) {
                            star.style.color = '#ffa500';
                        } else {
                            star.style.color = '#ddd';
                        }
                    });
                }
            });
            
            starRating.addEventListener('mouseleave', () => {
                const currentRating = parseInt(starRating.dataset.currentRating) || 0;
                const stars = starRating.querySelectorAll('.star');
                stars.forEach((star, index) => {
                    if (index + 1 <= currentRating) {
                        star.style.color = '#ffa500';
                    } else {
                        star.style.color = '#ddd';
                    }
                });
            });
            
            starRating.addEventListener('click', (e) => {
                if (e.target.classList.contains('star')) {
                    const rating = parseInt(e.target.dataset.rating);
                    const asin = starRating.dataset.asin;
                    console.log(`⭐ 星評価: ${rating}星, ASIN: ${asin}`);
                    this.saveRating(asin, rating);
                    
                    // Update current rating data
                    starRating.dataset.currentRating = rating;
                    
                    // Update star display in modal
                    const stars = starRating.querySelectorAll('.star');
                    stars.forEach((star, index) => {
                        star.classList.toggle('active', (index + 1) <= rating);
                    });
                    
                    // Update display in main bookshelf
                    this.updateDisplay();
                    this.updateStats();
                }
            });
        }
        
        // Load highlights
        this.loadBookHighlights(book);
        
        modal.classList.add('show');
    }

    closeModal() {
        const modal = document.getElementById('book-modal');
        modal.classList.remove('show');
        
        // Clear modal body to prevent event listener conflicts
        const modalBody = document.getElementById('modal-body');
        modalBody.innerHTML = '';
    }




    saveNote(asin, memo) {
        if (!this.userData.notes[asin]) {
            this.userData.notes[asin] = { memo: '', rating: 0 };
        }
        this.userData.notes[asin].memo = memo;
        this.saveUserData();
    }


    async loadBookHighlights(book) {
        const highlightsContainer = document.getElementById(`highlights-${book.asin}`);
        const loadingElement = highlightsContainer.querySelector('.highlights-loading');
        
        try {
            // Use HighlightsManager for ASIN-based loading
            if (window.highlightsManager) {
                const highlights = await window.highlightsManager.loadHighlightsForBook(book);
                
                loadingElement.style.display = 'none';
                
                if (highlights.length > 0) {
                    // Use the HighlightsManager's render method
                    const highlightsListContainer = document.createElement('div');
                    window.highlightsManager.renderHighlights(highlights, highlightsListContainer);
                    
                    // Replace loading with rendered highlights
                    highlightsContainer.innerHTML = '<h3>🎯 ハイライト</h3>';
                    highlightsContainer.appendChild(highlightsListContainer);
                } else {
                    // No highlights found
                    highlightsContainer.innerHTML = '<h3>🎯 ハイライト</h3><p class="no-highlights">この本のハイライトはありません</p>';
                }
            } else {
                // Fallback if HighlightsManager not available
                loadingElement.textContent = 'ハイライトマネージャーが利用できません';
            }
        } catch (error) {
            console.error('ハイライト読み込みエラー:', error);
            loadingElement.textContent = 'ハイライトの読み込みに失敗しました';
        }
    }


    updateStats() {
        const totalBooks = this.books.length;
        
        document.getElementById('total-books').textContent = totalBooks.toLocaleString();
    }



    setupPagination() {
        const pagination = document.getElementById('pagination');
        const totalPages = Math.ceil(this.filteredBooks.length / this.booksPerPage);
        
        // Hide pagination if showing all books or only one page
        if (totalPages <= 1 || this.booksPerPage >= this.filteredBooks.length) {
            pagination.innerHTML = '';
            return;
        }
        
        let paginationHTML = `
            <button ${this.currentPage === 1 ? 'disabled' : ''} onclick="bookshelf.goToPage(${this.currentPage - 1})">前へ</button>
        `;
        
        for (let i = Math.max(1, this.currentPage - 2); i <= Math.min(totalPages, this.currentPage + 2); i++) {
            paginationHTML += `
                <button class="${i === this.currentPage ? 'current-page' : ''}" onclick="bookshelf.goToPage(${i})">${i}</button>
            `;
        }
        
        paginationHTML += `
            <button ${this.currentPage === totalPages ? 'disabled' : ''} onclick="bookshelf.goToPage(${this.currentPage + 1})">次へ</button>
        `;
        
        pagination.innerHTML = paginationHTML;
    }

    goToPage(page) {
        this.currentPage = page;
        this.updateDisplay();
        
        // 本棚エリアまでスクロール
        const bookshelf = document.getElementById('bookshelf');
        if (bookshelf) {
            bookshelf.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    createDefaultUserData() {
        return {
            exportDate: new Date().toISOString(),
            bookshelves: [],
            notes: {},
            settings: this.getDefaultSettings(),
            bookOrder: {},
            stats: { totalBooks: 0, notesCount: 0 },
            version: '2.0'
        };
    }

    getDefaultSettings() {
        return {
            defaultView: 'covers',
            showHighlights: true,
            currentBookshelf: 'all',
            theme: 'light',
            booksPerPage: 50,
            showImagesInOverview: true
        };
    }

    saveUserData() {
        localStorage.setItem('virtualBookshelf_userData', JSON.stringify(this.userData));
        this.markDirty();
    }

    // exportUserData function removed - replaced with exportUnifiedData

    autoSaveUserDataFile() {
        // BookManagerから書籍データを取得
        const bookManager = window.bookManager;
        const books = {};
        
        // 書籍データを統合形式に変換
        if (bookManager && bookManager.library && bookManager.library.books) {
            bookManager.library.books.forEach(book => {
                const asin = book.asin;
                books[asin] = {
                    title: book.title,
                    authors: book.authors,
                    acquiredTime: book.acquiredTime,
                    readStatus: book.readStatus,
                    productImage: book.productImage,
                    source: book.source,
                    addedDate: book.addedDate,
                    memo: this.userData.notes[asin]?.memo || '',
                    rating: this.userData.notes[asin]?.rating || 0
                };
            });
        }

        const backupData = {
            exportDate: new Date().toISOString(),
            books: books,
            bookshelves: this.userData.bookshelves,
            settings: this.userData.settings,
            bookOrder: this.userData.bookOrder,
            stats: {
                totalBooks: Object.keys(books).length,
                notesCount: Object.keys(this.userData.notes).length
            },
            version: '2.0'
        };
        
        const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'library.json';
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        console.log('📁 library.jsonファイルを自動生成しました');
    }

    updateBookshelfSelector() {
        const selector = document.getElementById('bookshelf-selector');
        if (!selector) return;
        
        selector.innerHTML = '<option value="all">📚 全ての本</option>';
        
        if (this.userData.bookshelves) {
            this.userData.bookshelves.forEach(bookshelf => {
                const option = document.createElement('option');
                option.value = bookshelf.id;
                option.textContent = `${bookshelf.emoji || '📚'} ${bookshelf.name}`;
                selector.appendChild(option);
            });
        }
    }

    switchBookshelf(bookshelfId) {
        this.currentBookshelf = bookshelfId;
        this.updateStaticPageButton(bookshelfId);
        this.applyFilters();
    }

    showBookshelfManager() {
        const modal = document.getElementById('bookshelf-modal');
        modal.classList.add('show');
        this.renderBookshelfList();
    }

    closeBookshelfModal() {
        const modal = document.getElementById('bookshelf-modal');
        modal.classList.remove('show');
    }

    renderBookshelfList() {
        const container = document.getElementById('bookshelves-list');
        if (!this.userData.bookshelves) {
            this.userData.bookshelves = [];
        }

        let html = '';
        this.userData.bookshelves.forEach(bookshelf => {
            const bookCount = bookshelf.books ? bookshelf.books.length : 0;
            const isPublic = bookshelf.isPublic || false;
            const publicBadge = isPublic ? '<span class="public-badge">📤 公開中</span>' : '';



            html += `
                <div class="bookshelf-item" data-id="${bookshelf.id}" draggable="true">
                    <div class="bookshelf-drag-handle">⋮⋮</div>
                    <div class="bookshelf-info">
                        <h4>${bookshelf.emoji || '📚'} ${bookshelf.name} ${publicBadge}</h4>
                        <p>${bookshelf.description || ''}</p>
                        <span class="book-count">${bookCount}冊</span>

                    </div>
                    <div class="bookshelf-actions">
                        <button class="btn btn-secondary edit-bookshelf" data-id="${bookshelf.id}">編集</button>
                        ${isPublic ? `<button class="btn btn-primary share-bookshelf" data-id="${bookshelf.id}">📄 静的ページ生成</button>` : ''}
                        <button class="btn btn-danger delete-bookshelf" data-id="${bookshelf.id}">削除</button>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;

        // Remove existing event listeners to prevent duplicates
        const oldContainer = container.cloneNode(true);
        container.parentNode.replaceChild(oldContainer, container);
        
        // Add event listeners for edit/delete/share buttons
        oldContainer.addEventListener('click', (e) => {
            if (e.target.classList.contains('edit-bookshelf')) {
                this.editBookshelf(e.target.dataset.id);
            } else if (e.target.classList.contains('delete-bookshelf')) {
                this.deleteBookshelf(e.target.dataset.id);
            } else if (e.target.classList.contains('share-bookshelf')) {
                this.showStaticShareModal(e.target.dataset.id);
            }
        });

        // Add drag and drop functionality for bookshelf reordering
        this.setupBookshelfDragAndDrop(oldContainer);
    }

    addBookshelf() {
        this.showBookshelfForm();
    }

    showBookshelfForm(bookshelfToEdit = null) {
        const modal = document.getElementById('bookshelf-form-modal');
        const title = document.getElementById('bookshelf-form-title');
        const nameInput = document.getElementById('bookshelf-name');
        const emojiInput = document.getElementById('bookshelf-emoji');
        const descriptionInput = document.getElementById('bookshelf-description');
        const isPublicInput = document.getElementById('bookshelf-is-public');

        // Set form title and populate fields for editing
        if (bookshelfToEdit) {
            title.textContent = '📚 本棚を編集';
            nameInput.value = bookshelfToEdit.name;
            emojiInput.value = bookshelfToEdit.emoji || '📚';
            descriptionInput.value = bookshelfToEdit.description || '';
            isPublicInput.checked = bookshelfToEdit.isPublic || false;
        } else {
            title.textContent = '📚 新しい本棚';
            nameInput.value = '';
            emojiInput.value = '📚';
            descriptionInput.value = '';
            isPublicInput.checked = false;
        }
        
        // Store current editing bookshelf
        this.currentEditingBookshelf = bookshelfToEdit;
        
        modal.classList.add('show');
        nameInput.focus();
    }

    closeBookshelfForm() {
        const modal = document.getElementById('bookshelf-form-modal');
        modal.classList.remove('show');
        this.currentEditingBookshelf = null;
    }

    saveBookshelfForm() {
        const nameInput = document.getElementById('bookshelf-name');
        const emojiInput = document.getElementById('bookshelf-emoji');
        const descriptionInput = document.getElementById('bookshelf-description');
        const isPublicInput = document.getElementById('bookshelf-is-public');

        const name = nameInput.value.trim();
        if (!name) {
            alert('本棚の名前を入力してください');
            nameInput.focus();
            return;
        }

        if (this.currentEditingBookshelf) {
            // Edit existing bookshelf
            this.currentEditingBookshelf.name = name;
            this.currentEditingBookshelf.emoji = emojiInput.value.trim() || '📚';
            this.currentEditingBookshelf.description = descriptionInput.value.trim();
            this.currentEditingBookshelf.isPublic = isPublicInput.checked;
            this.currentEditingBookshelf.lastUpdated = new Date().toISOString();
        } else {
            // Create new bookshelf
            const newBookshelf = {
                id: `bookshelf_${Date.now()}`,
                name: name,
                emoji: emojiInput.value.trim() || '📚',
                description: descriptionInput.value.trim(),
                isPublic: isPublicInput.checked,
                books: [],
                createdAt: new Date().toISOString()
            };
            this.userData.bookshelves.push(newBookshelf);
        }

        this.saveUserData();
        this.updateBookshelfSelector();
        this.renderBookshelfList();
        this.closeBookshelfForm();
    }

    editBookshelf(bookshelfId) {
        const bookshelf = this.userData.bookshelves.find(b => b.id === bookshelfId);
        if (!bookshelf) return;
        
        this.showBookshelfForm(bookshelf);
    }

    deleteBookshelf(bookshelfId) {
        const bookshelf = this.userData.bookshelves.find(b => b.id === bookshelfId);
        if (!bookshelf) return;

        if (confirm(`📚 本棚「${bookshelf.name}」を削除しますか？\n\n⚠️ この操作は取り消せません。`)) {
            this.userData.bookshelves = this.userData.bookshelves.filter(b => b.id !== bookshelfId);
            this.saveUserData();
            this.updateBookshelfSelector();
            this.renderBookshelfList();
            
            // If currently viewing this bookshelf, switch to "all"
            if (this.currentBookshelf === bookshelfId) {
                this.currentBookshelf = 'all';
                document.getElementById('bookshelf-selector').value = 'all';
                this.applyFilters();
            }
        }
    }

    addBookToBookshelf(asin) {
        const bookshelfSelect = document.getElementById(`bookshelf-select-${asin}`);
        const bookshelfId = bookshelfSelect.value;
        
        if (!bookshelfId) {
            alert('📚 本棚を選択してください');
            return;
        }

        const bookshelf = this.userData.bookshelves.find(b => b.id === bookshelfId);
        if (!bookshelf) {
            alert('❌ 本棚が見つかりません');
            return;
        }

        if (!bookshelf.books) {
            bookshelf.books = [];
        }

        if (bookshelf.books.includes(asin)) {
            alert(`📚 この本は既に「${bookshelf.name}」に追加済みです`);
            return;
        }

        bookshelf.books.push(asin);
        this.saveUserData();
        this.renderBookshelfList(); // Update the bookshelf management UI if open
        
        alert(`✅ 「${bookshelf.name}」に追加しました！`);
        
        // Reset the dropdown
        bookshelfSelect.value = '';
    }

    removeFromBookshelf(asin, bookshelfId) {
        const bookshelf = this.userData.bookshelves.find(b => b.id === bookshelfId);
        if (!bookshelf || !bookshelf.books) {
            alert('❌ 本棚が見つかりません');
            return;
        }
        
        const book = this.books.find(b => b.asin === asin);
        const bookTitle = book ? book.title : 'この本';
        
        if (!bookshelf.books.includes(asin)) {
            alert(`📚 この本は「${bookshelf.name}」にありません`);
            return;
        }
        
        if (confirm(`📚 「${bookTitle}」を「${bookshelf.name}」から除外しますか？\n\n⚠️ 本自体は削除されず、この本棚からのみ削除されます。`)) {
            bookshelf.books = bookshelf.books.filter(bookAsin => bookAsin !== asin);
            this.saveUserData();
            this.renderBookshelfList(); // Update the bookshelf management UI if open
            
            // If currently viewing this bookshelf, update the display
            if (this.currentBookshelf === bookshelfId) {
                this.applyFilters();
                this.updateDisplay();
            }
            
            alert(`✅ 「${bookTitle}」を「${bookshelf.name}」から除外しました`);
            
            // Close modal to show the updated bookshelf
            this.closeModal();
        }
    }

    /**
     * 書籍を完全削除（BookManager連携）
     */
    async deleteBook(asin) {
        const book = this.books.find(b => b.asin === asin);
        if (!book) {
            alert('❌ 指定された書籍が見つかりません');
            return;
        }

        const confirmMessage = `🗑️ 書籍「${book.title}」を完全削除しますか？

⚠️ この操作は取り消せません。
📝 お気に入り、メモ、本棚からも削除されます。`;

        if (!confirm(confirmMessage)) {
            return;
        }

        try {
            // BookManager で完全削除
            await this.bookManager.deleteBook(asin, true);
            
            // ユーザーデータからも削除
            if (this.userData.notes[asin]) {
                delete this.userData.notes[asin];
            }
            
            // 全ての本棚から削除
            if (this.userData.bookshelves) {
                this.userData.bookshelves.forEach(bookshelf => {
                    if (bookshelf.books) {
                        bookshelf.books = bookshelf.books.filter(id => id !== asin);
                    }
                });
            }

            this.saveUserData();
            
            // 表示を更新
            this.books = this.bookManager.getAllBooks();
            this.applyFilters();
            this.updateStats();
            this.renderBookshelfOverview();
            
            // モーダルを閉じる
            this.closeModal();
            
            alert(`✅ 「${book.title}」を削除しました`);
        } catch (error) {
            console.error('削除エラー:', error);
            alert(`❌ 削除に失敗しました: ${error.message}`);
        }
    }


    showBookSelectionForImport(books, source) {
        this.pendingImportBooks = books;
        this.importSource = source;

        // インポートオプションを非表示にして選択UIを表示
        document.querySelector('.import-options').style.display = 'none';
        const selectionDiv = document.getElementById('book-selection');
        selectionDiv.style.display = 'block';

        // 既存の本を取得（重複チェック用）
        const existingASINs = new Set(this.bookManager.getAllBooks().map(book => book.asin));

        // 本のリストを生成（フィルター機能付き）
        this.renderBookList(books, existingASINs);

        // イベントリスナーを追加
        this.setupBookSelectionListeners();
        this.updateSelectedCount();
    }

    renderBookList(books, existingASINs) {
        const bookList = document.getElementById('book-list');
        bookList.innerHTML = '';

        // フィルター設定を取得
        const hideExisting = document.getElementById('hide-existing-books').checked;

        let visibleCount = 0;
        books.forEach((book, index) => {
            const isExisting = existingASINs.has(book.asin);

            // フィルター適用: インポート済みを非表示にする場合はスキップ
            if (hideExisting && isExisting) {
                return;
            }

            visibleCount++;
            const bookItem = document.createElement('div');
            bookItem.className = `book-selection-item ${isExisting ? 'existing-book' : ''}`;
            bookItem.dataset.bookIndex = index;
            bookItem.innerHTML = `
                <input type="checkbox" id="book-${index}" value="${index}" ${isExisting ? 'disabled' : ''}>
                <div class="book-selection-info">
                    <div class="book-selection-title">${book.title} ${isExisting ? '(既にインポート済み)' : ''}</div>
                    <div class="book-selection-author">${book.authors}</div>
                    <div class="book-selection-meta">${new Date(book.acquiredTime).toLocaleDateString('ja-JP')}</div>
                </div>
            `;
            bookList.appendChild(bookItem);
        });

        // 表示件数を更新
        this.updateBookListStats(books.length, visibleCount, existingASINs.size);
    }

    updateBookListStats(totalBooks, visibleBooks, existingBooks) {
        // 統計情報を表示する要素を追加/更新
        let statsElement = document.getElementById('book-list-stats');
        if (!statsElement) {
            statsElement = document.createElement('div');
            statsElement.id = 'book-list-stats';
            statsElement.style.cssText = 'margin-bottom: 1rem; padding: 0.5rem; background: #f8f9fa; border-radius: 4px; font-size: 0.9rem; color: #6c757d;';
            document.getElementById('book-list').parentNode.insertBefore(statsElement, document.getElementById('book-list'));
        }

        const newBooks = totalBooks - existingBooks;
        statsElement.innerHTML = `
            📊 総数: ${totalBooks}冊 | 新規: ${newBooks}冊 | インポート済み: ${existingBooks}冊 | 表示中: ${visibleBooks}冊
        `;
    }
    
    setupBookSelectionListeners() {
        // フィルター変更時にリストを再描画
        document.getElementById('hide-existing-books').addEventListener('change', () => {
            const existingASINs = new Set(this.bookManager.getAllBooks().map(book => book.asin));
            this.renderBookList(this.pendingImportBooks, existingASINs);
            this.updateSelectedCount();
        });

        // 全て選択
        document.getElementById('select-all-books').addEventListener('click', () => {
            const checkboxes = document.querySelectorAll('#book-list input[type="checkbox"]:not([disabled])');
            checkboxes.forEach(cb => cb.checked = true);
            this.updateSelectedCount();
        });

        // 全て解除
        document.getElementById('deselect-all-books').addEventListener('click', () => {
            const checkboxes = document.querySelectorAll('#book-list input[type="checkbox"]');
            checkboxes.forEach(cb => cb.checked = false);
            this.updateSelectedCount();
        });

        // チェックボックス変更時
        document.getElementById('book-list').addEventListener('change', () => {
            this.updateSelectedCount();
        });

        // 選択した本をインポート
        document.getElementById('import-selected-books').addEventListener('click', () => {
            this.importSelectedBooks();
        });

        // キャンセル
        document.getElementById('cancel-import').addEventListener('click', () => {
            this.cancelImport();
        });
    }
    
    updateSelectedCount() {
        const checkboxes = document.querySelectorAll('#book-list input[type="checkbox"]:checked');
        const count = checkboxes.length;
        document.getElementById('selected-count').textContent = count;
        
        const importButton = document.getElementById('import-selected-books');
        importButton.disabled = count === 0;
    }
    
    async importSelectedBooks() {
        const checkboxes = document.querySelectorAll('#book-list input[type="checkbox"]:checked');
        const selectedIndices = Array.from(checkboxes).map(cb => parseInt(cb.value));
        const selectedBooks = selectedIndices.map(index => this.pendingImportBooks[index]);
        
        if (selectedBooks.length === 0) {
            alert('📚 インポートする本を選択してください');
            return;
        }
        
        try {
            const results = await this.bookManager.importSelectedBooks(selectedBooks);
            this.showImportResults(results);

            // 表示を更新
            this.books = this.bookManager.getAllBooks();
            this.applyFilters();
            this.updateStats();
            this.markDirty();

            // 選択UIを非表示
            document.getElementById('book-selection').style.display = 'none';
            
        } catch (error) {
            console.error('選択インポートエラー:', error);
            alert(`❌ インポートに失敗しました: ${error.message}`);
        }
    }
    
    cancelImport() {
        // 選択UIを非表示にしてインポートオプションを表示
        document.getElementById('book-selection').style.display = 'none';
        document.querySelector('.import-options').style.display = 'block';
        
        // 一時データをクリア
        this.pendingImportBooks = null;
        this.importSource = null;
    }

    async saveBookChanges(asin) {
        const titleInput = document.querySelector(`.edit-title[data-asin="${asin}"]`);
        const authorsInput = document.querySelector(`.edit-authors[data-asin="${asin}"]`);
        const acquiredTimeInput = document.querySelector(`.edit-acquired-time[data-asin="${asin}"]`);
        const originalAsinInput = document.querySelector(`.edit-original-asin[data-asin="${asin}"]`);
        const updatedAsinInput = document.querySelector(`.edit-updated-asin[data-asin="${asin}"]`);
        const formatSelect = document.querySelector(`.edit-format[data-asin="${asin}"]`);

        const newTitle = titleInput.value.trim();
        const newAuthors = authorsInput.value.trim();
        const newAcquiredTime = acquiredTimeInput.value;
        const newOriginalAsin = originalAsinInput.value.trim();
        const newUpdatedAsin = updatedAsinInput.value.trim();

        if (!newTitle) {
            alert('📖 タイトルは必須です');
            return;
        }

        // オリジナルASINの妥当性チェック
        if (!newOriginalAsin || !this.bookManager.isValidASIN(newOriginalAsin)) {
            alert('🔖 オリジナルASINは10桁の英数字で入力してください（例: B07ABC1234）');
            return;
        }

        // 変更後ASINの妥当性チェック
        if (newUpdatedAsin && !this.bookManager.isValidASIN(newUpdatedAsin)) {
            alert('🔗 変更後ASINは10桁の英数字で入力してください（例: B07ABC1234）');
            return;
        }

        // オリジナルASINが変更された場合の重複チェック
        if (newOriginalAsin !== asin) {
            const existingBook = this.books.find(book => book.asin === newOriginalAsin);
            if (existingBook) {
                alert('🔖 このオリジナルASINは既に使用されています');
                return;
            }
        }

        try {
            const updateData = {
                title: newTitle,
                authors: newAuthors || '著者未設定'
            };

            // オリジナルASINが変更された場合
            if (newOriginalAsin !== asin) {
                updateData.asin = newOriginalAsin;
            }

            // 購入日が変更されている場合は更新
            if (newAcquiredTime) {
                updateData.acquiredTime = new Date(newAcquiredTime).getTime();
            }

            // 形式の更新（未設定の場合はプロパティを削除）
            if (formatSelect) {
                updateData.format = formatSelect.value || undefined;
            }

            // 変更後ASINの処理
            if (newUpdatedAsin) {
                updateData.updatedAsin = newUpdatedAsin;
                // 新しいASINで画像URLも更新
                updateData.productImage = `https://images-na.ssl-images-amazon.com/images/P/${newUpdatedAsin}.01.L.jpg`;
            } else {
                // 変更後ASINが削除された場合、プロパティを削除
                updateData.updatedAsin = undefined;
                // 元のASIN（変更された可能性がある）で画像URLを復元
                updateData.productImage = `https://images-na.ssl-images-amazon.com/images/P/${newOriginalAsin}.01.L.jpg`;
            }

            const success = await this.bookManager.updateBook(asin, updateData);

            if (success) {
                // オリジナルASINが変更された場合、ユーザーデータを移行
                if (newOriginalAsin !== asin) {
                    this.migrateUserData(asin, newOriginalAsin);
                }

                // 表示を更新
                this.books = this.bookManager.getAllBooks();
                this.applyFilters();
                this.updateStats();
                this.markDirty();

                alert('✅ 本の情報を更新しました');

                // 編集モードから表示モードに戻る
                if (newOriginalAsin !== asin) {
                    // ASINが変更された場合はモーダルを閉じる
                    this.closeModal();
                } else {
                    // 表示モードで再表示
                    const book = this.books.find(b => b.asin === newOriginalAsin);
                    if (book) {
                        this.showBookDetail(book, false);
                    }
                }
            }

        } catch (error) {
            console.error('本の更新エラー:', error);
            alert(`❌ 更新に失敗しました: ${error.message}`);
        }
    }

    /**
     * オリジナルASIN変更時のユーザーデータ移行
     */
    migrateUserData(oldAsin, newAsin) {
        // 星評価とメモを移行
        if (this.userData.notes[oldAsin]) {
            this.userData.notes[newAsin] = this.userData.notes[oldAsin];
            delete this.userData.notes[oldAsin];
        }

        // 非表示設定を移行
        if (this.userData.hiddenBooks && this.userData.hiddenBooks.includes(oldAsin)) {
            const index = this.userData.hiddenBooks.indexOf(oldAsin);
            this.userData.hiddenBooks[index] = newAsin;
        }

        // 本棚情報を移行
        if (this.userData.bookshelves) {
            Object.values(this.userData.bookshelves).forEach(bookshelf => {
                if (bookshelf.books && bookshelf.books.includes(oldAsin)) {
                    const index = bookshelf.books.indexOf(oldAsin);
                    bookshelf.books[index] = newAsin;
                }
            });
        }

        // ユーザーデータを保存
        this.saveUserData();
    }

    updateMemoPreview(textarea) {
        const preview = textarea.parentElement.querySelector('.note-preview');
        const previewContent = preview.querySelector('.note-preview-content');
        
        const text = textarea.value.trim();
        if (text) {
            // マークダウンリンクをHTMLリンクに変換
            const htmlContent = this.convertMarkdownLinksToHtml(text);
            previewContent.innerHTML = htmlContent;
            preview.style.display = 'block';
        } else {
            preview.style.display = 'none';
        }
    }

    convertMarkdownLinksToHtml(text) {
        // [リンクテキスト](URL) の形式をHTMLリンクに変換
        return text
            .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
            .replace(/\n/g, '<br>'); // 改行もHTMLに変換
    }

    formatMemoForDisplay(memo, maxLength) {
        if (!memo) return '';
        
        // 改行を保持しつつ、長さ制限を適用
        const lines = memo.split('\n');
        let formattedText = '';
        let currentLength = 0;
        
        for (const line of lines) {
            if (currentLength + line.length > maxLength) {
                const remainingLength = maxLength - currentLength;
                if (remainingLength > 10) {
                    formattedText += line.substring(0, remainingLength) + '...';
                } else {
                    formattedText += '...';
                }
                break;
            }
            
            formattedText += line + '\n';
            currentLength += line.length + 1; // +1 for newline
        }
        
        // マークダウンリンクをHTMLリンクに変換
        return this.convertMarkdownLinksToHtml(formattedText.trim());
    }

    /**
     * Kindleインポートモーダルを表示
     */
    showImportModal() {
        const modal = document.getElementById('import-modal');
        modal.classList.add('show');
    }

    /**
     * Kindleインポートモーダルを閉じる
     */
    closeImportModal() {
        const modal = document.getElementById('import-modal');
        modal.classList.remove('show');
        // 結果表示をリセット
        const resultsDiv = document.getElementById('import-results');
        resultsDiv.style.display = 'none';
        resultsDiv.innerHTML = '';
    }

    /**
     * ファイルからKindleデータをインポート
     */
    async importFromFile() {
        const fileInput = document.getElementById('kindle-file-input');
        if (!fileInput.files || fileInput.files.length === 0) {
            alert('📁 ファイルを選択してください');
            return;
        }

        try {
            // ファイルを読み込んで本の一覧を表示
            const file = fileInput.files[0];
            const text = await file.text();
            const books = JSON.parse(text);
            
            this.showBookSelectionForImport(books, 'file');
            
        } catch (error) {
            console.error('ファイル読み込みエラー:', error);
            alert(`❌ ファイルの読み込みに失敗しました: ${error.message}`);
        }
    }

    /**
     * data/kindle.jsonからインポート
     */
    // This method is no longer needed - removed data/kindle.json import option

    /**
     * インポート結果を表示
     */
    showImportResults(results) {
        const resultsDiv = document.getElementById('import-results');
        resultsDiv.innerHTML = `
            <div class="import-summary">
                <h3>📊 インポート結果</h3>
                <div class="import-stats">
                    <div class="stat-item">
                        <span class="stat-value">${results.total}</span>
                        <span class="stat-label">総書籍数</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-value success">${results.added}</span>
                        <span class="stat-label">新規追加</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-value warning">${results.updated}</span>
                        <span class="stat-label">更新</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-value">${results.skipped}</span>
                        <span class="stat-label">スキップ</span>
                    </div>
                </div>
                <p class="import-note">
                    ✅ インポートが完了しました。新規追加: ${results.added}冊、更新: ${results.updated}冊
                </p>
            </div>
        `;
        resultsDiv.style.display = 'block';
    }

    /**
     * 手動追加モーダルを表示
     */
    showAddBookModal() {
        const modal = document.getElementById('add-book-modal');
        modal.classList.add('show');
    }

    /**
     * 手動追加モーダルを閉じる
     */
    closeAddBookModal() {
        const modal = document.getElementById('add-book-modal');
        modal.classList.remove('show');
        
        // フォームをリセット（存在する要素のみ）
        const amazonUrlInput = document.getElementById('amazon-url-input');
        if (amazonUrlInput) amazonUrlInput.value = '';
        
        const manualAsin = document.getElementById('manual-asin');
        if (manualAsin) manualAsin.value = '';

        const manualTitle = document.getElementById('manual-title');
        if (manualTitle) manualTitle.value = '';

        const manualAuthors = document.getElementById('manual-authors');
        if (manualAuthors) manualAuthors.value = '';

        // ASINステータスをリセット
        const asinStatus = document.getElementById('asin-status');
        if (asinStatus) asinStatus.style.display = 'none';

        // 結果表示をリセット
        const resultsDiv = document.getElementById('add-book-results');
        if (resultsDiv) {
            resultsDiv.style.display = 'none';
            resultsDiv.innerHTML = '';
        }

        // 検索結果をリセット
        const searchResults = document.getElementById('book-search-results');
        if (searchResults) searchResults.innerHTML = '';
        const searchInput = document.getElementById('book-search-query');
        if (searchInput) searchInput.value = '';

        // バーコードスキャンを停止
        this.stopBarcodeScan();
    }

    /**
     * 本追加モーダルのタブを切り替え
     */
    switchAddBookTab(tabName) {
        document.querySelectorAll('.add-book-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabName);
        });
        ['search', 'code', 'barcode'].forEach(name => {
            const pane = document.getElementById(`add-book-pane-${name}`);
            if (pane) pane.style.display = name === tabName ? '' : 'none';
        });
        if (tabName !== 'barcode') {
            this.stopBarcodeScan();
        }
    }

    /**
     * 追加モーダルで選択されている本の形式を取得（自動判定対応）
     */
    getSelectedFormat(identifier) {
        const select = document.getElementById('add-book-format');
        const value = select ? select.value : 'auto';
        if (value === 'auto') {
            return this.bookManager.guessFormat(identifier);
        }
        return value;
    }

    /**
     * 形式の表示ラベル
     */
    formatLabel(format) {
        const labels = {
            paper: '📕 紙の本',
            kindle: '📱 Kindle',
            epub: '📗 EPUB',
            pdf: '📄 PDF'
        };
        return labels[format] || '';
    }

    /**
     * ステータスメッセージの汎用表示（asin-status系のスタイルを流用）
     */
    showStatusMessage(elementId, type, message) {
        const statusDiv = document.getElementById(elementId);
        if (!statusDiv) return;
        statusDiv.className = `asin-status ${type}`;
        statusDiv.textContent = message;
        statusDiv.style.display = 'block';

        if (type === 'success' || type === 'error') {
            setTimeout(() => {
                statusDiv.style.display = 'none';
            }, 8000);
        }
    }

    /**
     * タイトル・著者キーワードで書籍を検索して候補を表示
     */
    async searchBooksForAdd() {
        const input = document.getElementById('book-search-query');
        const resultsDiv = document.getElementById('book-search-results');
        const searchBtn = document.getElementById('book-search-btn');
        const query = input.value.trim();

        if (!query) {
            this.showStatusMessage('book-search-status', 'error', '検索キーワードを入力してください');
            return;
        }

        this.showStatusMessage('book-search-status', 'loading', '🔍 検索中...');
        searchBtn.disabled = true;
        resultsDiv.innerHTML = '';

        try {
            const results = await this.bookManager.searchBooksByKeyword(query);

            if (results.length === 0) {
                this.showStatusMessage('book-search-status', 'error', '❌ 見つかりませんでした。キーワードを変えるか、ISBN/ASINで追加してください。');
                return;
            }

            document.getElementById('book-search-status').style.display = 'none';
            this.renderBookSearchResults(results);
        } catch (error) {
            console.error('書籍検索エラー:', error);
            this.showStatusMessage('book-search-status', 'error', `❌ 検索に失敗しました: ${error.message}`);
        } finally {
            searchBtn.disabled = false;
        }
    }

    /**
     * 検索候補リストを描画
     */
    renderBookSearchResults(results) {
        const resultsDiv = document.getElementById('book-search-results');

        resultsDiv.innerHTML = results.map((result, index) => {
            const exists = result.identifier && this.books.some(book =>
                book.asin === result.identifier || book.updatedAsin === result.identifier
            );
            const meta = [
                result.authors,
                result.publisher,
                result.publishedDate ? `(${result.publishedDate})` : ''
            ].filter(v => v).join(' / ');

            return `
                <div class="book-search-result">
                    ${result.thumbnail ?
                        `<img class="book-search-thumb" src="${this.escapeHtml(result.thumbnail)}" alt="" loading="lazy">` :
                        '<div class="book-search-thumb-placeholder">📖</div>'
                    }
                    <div class="book-search-result-info">
                        <div class="book-search-result-title">${this.escapeHtml(result.title)}</div>
                        <div class="book-search-result-meta">${this.escapeHtml(meta)}</div>
                        ${result.identifier ?
                            `<div class="book-search-result-isbn">ISBN: ${result.identifier}</div>` :
                            '<div class="book-search-result-isbn no-isbn">ISBN情報なし（「ASIN / ISBN」タブから追加してください）</div>'
                        }
                    </div>
                    <button class="btn btn-small ${exists ? 'btn-secondary' : 'btn-primary'} book-search-add"
                            data-index="${index}" ${(!result.identifier || exists) ? 'disabled' : ''}>
                        ${exists ? '追加済み' : '➕ 追加'}
                    </button>
                </div>
            `;
        }).join('');

        resultsDiv.querySelectorAll('.book-search-add').forEach(btn => {
            btn.addEventListener('click', () => {
                const result = results[parseInt(btn.dataset.index)];
                this.addBookFromSearchResult(result, btn);
            });
        });
    }

    /**
     * 検索候補から書籍を追加
     */
    async addBookFromSearchResult(result, btn) {
        btn.disabled = true;
        btn.textContent = '追加中...';

        try {
            const bookData = {
                asin: result.identifier,
                title: result.title,
                authors: result.authors || '著者未設定',
                acquiredTime: Date.now(),
                readStatus: 'UNKNOWN',
                format: this.getSelectedFormat(result.identifier),
                ...(result.thumbnail && { productImage: result.thumbnail }),
                ...(result.publisher && { publisher: result.publisher }),
                ...(result.publishedDate && { publishedDate: result.publishedDate })
            };

            const newBook = await this.bookManager.addBookManually(bookData);
            btn.textContent = '✅ 追加済み';
            btn.classList.remove('btn-primary');
            btn.classList.add('btn-secondary');
            this.showAddBookSuccess(newBook);

            this.books = this.bookManager.getAllBooks();
            this.applyFilters();
            this.updateStats();
            this.markDirty();
        } catch (error) {
            console.error('追加エラー:', error);
            btn.disabled = false;
            btn.textContent = '➕ 追加';
            alert(`❌ 追加に失敗しました: ${error.message}`);
        }
    }

    /**
     * バーコードスキャンを開始（紙の本のISBNバーコード読み取り）
     */
    async startBarcodeScan() {
        if (!('BarcodeDetector' in window)) {
            this.showStatusMessage('barcode-status', 'error',
                '❌ このブラウザはバーコード読み取り非対応です（Chrome/Edge推奨）。ISBNを直接入力してください。');
            return;
        }

        const video = document.getElementById('barcode-video');

        try {
            this.barcodeDetector = new BarcodeDetector({ formats: ['ean_13'] });
            this.barcodeStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' }
            });
            video.srcObject = this.barcodeStream;
            video.style.display = 'block';
            await video.play();

            document.getElementById('barcode-start').style.display = 'none';
            document.getElementById('barcode-stop').style.display = '';
            this.showStatusMessage('barcode-status', 'loading', '📷 バーコードを探しています…（978で始まる上段のバーコード）');

            this.barcodeScanTimer = setInterval(async () => {
                try {
                    const codes = await this.barcodeDetector.detect(video);
                    for (const code of codes) {
                        // ISBNは978/979始まり。下段の書籍JAN(191/192始まり)は無視する
                        if (/^97[89]\d{10}$/.test(code.rawValue)) {
                            const isbn = code.rawValue;
                            this.stopBarcodeScan();
                            this.showStatusMessage('barcode-status', 'success', `✅ ISBNを読み取りました: ${isbn}`);
                            document.getElementById('manual-asin').value = isbn;
                            this.switchAddBookTab('code');
                            this.fetchBookInfoFromASIN();
                            return;
                        }
                    }
                } catch (error) {
                    // フレーム単位の検出エラーは無視して継続
                }
            }, 300);
        } catch (error) {
            console.error('カメラ起動エラー:', error);
            this.showStatusMessage('barcode-status', 'error', `❌ カメラを起動できませんでした: ${error.message}`);
        }
    }

    /**
     * バーコードスキャンを停止
     */
    stopBarcodeScan() {
        if (this.barcodeScanTimer) {
            clearInterval(this.barcodeScanTimer);
            this.barcodeScanTimer = null;
        }
        if (this.barcodeStream) {
            this.barcodeStream.getTracks().forEach(track => track.stop());
            this.barcodeStream = null;
        }
        const video = document.getElementById('barcode-video');
        if (video) {
            video.pause();
            video.srcObject = null;
            video.style.display = 'none';
        }
        const startBtn = document.getElementById('barcode-start');
        if (startBtn) startBtn.style.display = '';
        const stopBtn = document.getElementById('barcode-stop');
        if (stopBtn) stopBtn.style.display = 'none';
    }

    /**
     * Amazonリンクから書籍を追加
     */


    async fetchBookMetadata(asin) {
        try {
            // 簡易的にASINから書籍情報を推測（完全ではない）
            
            // まず既存の蔵書データから同じASINがないかチェック
            const existingBook = this.books.find(book => book.asin === asin);
            if (existingBook) {
                throw new Error('この本は既に蔵書に追加されています');
            }
            
            // Amazon画像URLから表紙画像の存在確認
            const imageUrl = `https://images-amazon.com/images/P/${asin}.01.L.jpg`;
            
            return {
                asin: asin,
                title: '', // 自動取得できない
                authors: '', // 自動取得できない
                acquiredTime: Date.now(),
                readStatus: 'UNKNOWN',
                productImage: imageUrl,
                source: 'manual_add'
            };
            
        } catch (error) {
            console.error('メタデータ取得エラー:', error);
            throw error;
        }
    }
    
    fallbackToManualInput(asin) {
        // 自動取得に失敗した場合、手動入力フォームにASINを設定
        document.getElementById('manual-title').value = '';
        document.getElementById('manual-authors').value = '';
        document.getElementById('manual-asin').value = asin;
        document.getElementById('manual-asin').readOnly = true;
        
        alert(`⚠️ 書籍情報の自動取得に失敗しました。\nASIN: ${asin}\n\n手動でタイトルと著者を入力してください。`);
    }

    /**
     * ASINから書籍情報を自動取得してフォームに入力
     */
    async fetchBookInfoFromASIN() {
        const asinInput = document.getElementById('manual-asin');
        const titleInput = document.getElementById('manual-title');
        const authorsInput = document.getElementById('manual-authors');
        const statusDiv = document.getElementById('asin-status');
        const fetchBtn = document.getElementById('fetch-book-info');

        let asin = asinInput.value.trim();

        // AmazonのURLが貼り付けられた場合はASINを抽出
        if (/amazon\./i.test(asin)) {
            const extracted = this.bookManager.extractASINFromUrl(asin);
            if (extracted) {
                asin = extracted;
                asinInput.value = extracted;
            }
        }

        if (!asin) {
            this.showASINStatus('error', 'ASINを入力してください');
            return;
        }

        if (!this.bookManager.isValidASIN(asin)) {
            this.showASINStatus('error', '有効なASINフォーマットではありません（例: B012345678）');
            return;
        }

        // ローディング状態を表示
        this.showASINStatus('loading', '📥 書籍情報を取得中...');
        fetchBtn.disabled = true;
        fetchBtn.textContent = '取得中...';

        try {
            const bookData = await this.bookManager.fetchBookDataFromAmazon(asin);

            console.log('取得した書籍データ:', bookData);

            // フィールドに情報を設定
            titleInput.value = bookData.title;
            authorsInput.value = bookData.authors;

            // 取得結果に応じてメッセージを表示
            if (bookData.title && bookData.title !== 'タイトル未取得' && bookData.title !== '') {
                this.showASINStatus('success', `✅ 自動取得成功: ${bookData.title}`);
            } else {
                this.showASINStatus('error', '❌ 情報取得できませんでした。手動で入力してください。');
                // 自動取得失敗の場合、タイトルフィールドにフォーカス
                titleInput.focus();
            }

        } catch (error) {
            console.error('書籍情報取得エラー:', error);
            this.showASINStatus('error', '❌ 取得に失敗しました。手動で入力してください。');
        } finally {
            // ボタンを元に戻す
            fetchBtn.disabled = false;
            fetchBtn.textContent = '📥 自動取得';
        }
    }

    /**
     * ASIN取得ステータスを表示
     */
    showASINStatus(type, message) {
        const statusDiv = document.getElementById('asin-status');
        statusDiv.className = `asin-status ${type}`;
        statusDiv.textContent = message;
        statusDiv.style.display = 'block';

        // 成功またはエラーメッセージは5秒後に自動で隠す
        if (type === 'success' || type === 'error') {
            setTimeout(() => {
                statusDiv.style.display = 'none';
            }, 5000);
        }
    }

    /**
     * 手動入力で書籍を追加
     */
    async addBookManually() {
        let asin = document.getElementById('manual-asin').value.trim();
        const title = document.getElementById('manual-title').value.trim();
        const authors = document.getElementById('manual-authors').value.trim();

        // AmazonのURLが貼り付けられた場合はASINを抽出
        if (/amazon\./i.test(asin)) {
            const extracted = this.bookManager.extractASINFromUrl(asin);
            if (extracted) {
                asin = extracted;
                document.getElementById('manual-asin').value = extracted;
            }
        }

        if (!asin) {
            alert('📝 ASINを入力してください');
            return;
        }

        if (!title) {
            alert('📝 タイトルを入力してください');
            return;
        }

        try {
            const bookData = {
                asin: asin,
                title: title,
                authors: authors || '著者未設定',
                readStatus: 'UNKNOWN',
                acquiredTime: Date.now(),
                format: this.getSelectedFormat(asin)
            };

            const newBook = await this.bookManager.addBookManually(bookData);
            this.showAddBookSuccess(newBook);

            // 表示を更新
            this.books = this.bookManager.getAllBooks();
            this.applyFilters();
            this.updateStats();
            this.markDirty();

        } catch (error) {
            console.error('追加エラー:', error);
            alert(`❌ 追加に失敗しました: ${error.message}`);
        }
    }

    /**
     * 書籍追加成功を表示
     */
    showAddBookSuccess(book) {
        const resultsDiv = document.getElementById('add-book-results');
        resultsDiv.innerHTML = `
            <div class="add-success">
                <h3>✅ 書籍を追加しました</h3>
                <div class="added-book-info">
                    <p><strong>タイトル:</strong> ${book.title}</p>
                    <p><strong>著者:</strong> ${book.authors}</p>
                    <p><strong>ASIN:</strong> ${book.asin}</p>
                </div>
            </div>
        `;
        resultsDiv.style.display = 'block';
    }

    /**
     * 現在の状態から library.json 形式の統合データを構築
     */
    buildUnifiedData() {
        const exportData = {
            exportDate: new Date().toISOString(),
            books: {}, // 後で設定
            bookshelves: this.userData.bookshelves || [],
            settings: (() => {
                const { affiliateId, github, ...cleanSettings } = this.userData.settings;
                return cleanSettings;
            })(),
            bookOrder: this.userData.bookOrder || {},
            stats: {
                totalBooks: 0,
                notesCount: Object.keys(this.userData.notes || {}).length
            },
            version: '2.0'
        };

        // 現在の書籍データをbooks形式に変換
        const books = {};
        if (this.books && this.books.length > 0) {
            this.books.forEach(book => {
                const asin = book.asin;
                if (asin) {
                    books[asin] = {
                        title: book.title || '',
                        authors: book.authors || '',
                        acquiredTime: book.acquiredTime || Date.now(),
                        readStatus: book.readStatus || 'UNREAD',
                        productImage: book.productImage || '',
                        source: book.source || 'unknown',
                        addedDate: book.addedDate || Date.now(),
                        memo: this.userData.notes?.[asin]?.memo || '',
                        rating: this.userData.notes?.[asin]?.rating || 0,
                        // オプションフィールドも含める
                        ...(book.updatedAsin && book.updatedAsin.trim() !== '' && { updatedAsin: book.updatedAsin }),
                        ...(book.format && { format: book.format }),
                        ...(book.publisher && { publisher: book.publisher }),
                        ...(book.publishedDate && { publishedDate: book.publishedDate })
                    };
                }
            });
        }

        exportData.books = books;
        exportData.stats.totalBooks = Object.keys(books).length;
        return exportData;
    }

    /**
     * 蔵書データをファイルとしてエクスポート
     */
    exportUnifiedData() {
        console.log('📦 エクスポート開始...');

        const exportData = this.buildUnifiedData();

        console.log(`📊 エクスポートデータ: ${exportData.stats.totalBooks}冊, ${exportData.stats.notesCount}メモ`);

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'library.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        alert('📦 library.json をエクスポートしました！');
    }

    /**
     * 未保存の変更マークを付ける（GitHub保存ボタンにインジケーター表示）
     */
    markDirty() {
        this.hasUnsavedChanges = true;
        const saveBtn = document.getElementById('github-save');
        if (saveBtn) saveBtn.classList.add('has-unsaved');
    }

    clearDirty() {
        this.hasUnsavedChanges = false;
        const saveBtn = document.getElementById('github-save');
        if (saveBtn) saveBtn.classList.remove('has-unsaved');
    }

    /**
     * 現在の蔵書データをGitHubリポジトリに直接コミット
     */
    async saveToGitHub() {
        if (!this.githubSync.isReady()) {
            this.showStatusMessage('github-sync-status', 'error', '🔐 先にGitHubでサインインしてください');
            this.githubSignIn();
            return;
        }

        const btn = document.getElementById('github-save');
        btn.disabled = true;
        this.showStatusMessage('github-sync-status', 'loading', '☁️ GitHubに保存中...');

        try {
            const exportData = this.buildUnifiedData();
            const content = JSON.stringify(exportData, null, 2);
            const message = `蔵書データを更新 (${exportData.stats.totalBooks}冊)`;

            // exportDate以外に差分がなければコミットしない
            const existing = await this.githubSync.getFile();
            if (existing) {
                try {
                    const normalize = (data) => JSON.stringify({ ...data, exportDate: null });
                    if (normalize(JSON.parse(existing.content)) === normalize(exportData)) {
                        this.showStatusMessage('github-sync-status', 'success', '✅ GitHub上のデータと同一のため、コミットは不要でした');
                        this.clearDirty();
                        return;
                    }
                } catch (error) {
                    // リモートのJSONが壊れている場合は比較をスキップして上書き
                }
            }

            await this.githubSync.commitFile(content, message);
            this.showStatusMessage('github-sync-status', 'success', `✅ GitHubに保存しました（${exportData.stats.totalBooks}冊）`);
            this.clearDirty();
        } catch (error) {
            console.error('GitHub保存エラー:', error);
            this.showStatusMessage('github-sync-status', 'error', `❌ ${error.message}`);
        } finally {
            btn.disabled = false;
        }
    }

    /**
     * GitHubリポジトリ上の library.json を読み込んでローカルに反映
     */
    async loadFromGitHub() {
        if (!this.githubSync.isReady()) {
            this.showStatusMessage('github-sync-status', 'error', '🔐 先にGitHubでサインインしてください');
            this.githubSignIn();
            return;
        }

        if (this.hasUnsavedChanges) {
            const proceed = confirm('⚠️ 未保存の変更があります。\nGitHub上のデータで上書きすると、この変更は失われます。\n\n続行しますか？');
            if (!proceed) return;
        }

        this.showStatusMessage('github-sync-status', 'loading', '🔄 GitHubから読み込み中...');

        try {
            const file = await this.githubSync.getFile();
            if (!file) {
                this.showStatusMessage('github-sync-status', 'error', '❌ GitHub上に library.json が見つかりません');
                return;
            }

            const libraryData = JSON.parse(file.content);
            this.applyUnifiedData(libraryData);

            // 再読み込みして反映
            window.location.reload();
        } catch (error) {
            console.error('GitHub読込エラー:', error);
            this.showStatusMessage('github-sync-status', 'error', `❌ ${error.message}`);
        }
    }

    /**
     * 統合データ（library.json形式）をLocalStorageに反映
     */
    applyUnifiedData(libraryData) {
        // BookManager用のライブラリ形式に変換
        const books = Object.entries(libraryData.books || {}).map(([asin, book]) => ({
            ...book,
            asin: asin
        }));

        const library = {
            books: books,
            metadata: {
                totalBooks: books.length,
                manuallyAdded: books.filter(b => b.source === 'manual_add').length,
                importedFromKindle: books.filter(b => b.source === 'kindle_import').length,
                lastImportDate: libraryData.exportDate || null
            }
        };
        localStorage.setItem('virtualBookshelf_library', JSON.stringify(library));

        // ユーザーデータ形式に変換
        const userData = {
            exportDate: libraryData.exportDate || new Date().toISOString(),
            bookshelves: libraryData.bookshelves || [],
            notes: {},
            settings: libraryData.settings || this.getDefaultSettings(),
            bookOrder: libraryData.bookOrder || {},
            stats: libraryData.stats || { totalBooks: books.length, notesCount: 0 },
            version: libraryData.version || '2.0'
        };
        Object.entries(libraryData.books || {}).forEach(([asin, book]) => {
            if (book.memo || book.rating) {
                userData.notes[asin] = {
                    memo: book.memo || '',
                    rating: book.rating || 0
                };
            }
        });
        localStorage.setItem('virtualBookshelf_userData', JSON.stringify(userData));
    }

    /**
     * GitHub連携の詳細設定モーダルを表示
     */
    showGitHubSettings() {
        const config = this.githubSync.config;
        const summary = document.getElementById('github-config-summary');
        if (summary) {
            summary.innerHTML = `
                <dl>
                    <dt>リポジトリ</dt><dd>${this.escapeHtml(config.owner && config.repo ? `${config.owner}/${config.repo}` : '未設定')}</dd>
                    <dt>ブランチ</dt><dd>${this.escapeHtml(config.branch || 'main')}</dd>
                    <dt>OAuth認証</dt><dd>${config.authEndpoint ? this.escapeHtml(config.authEndpoint) : '未設定（PATを使用）'}</dd>
                </dl>
            `;
        }
        document.getElementById('github-token').value = this.githubSync.getToken();
        document.getElementById('github-settings-modal').classList.add('show');
    }

    closeGitHubSettings() {
        document.getElementById('github-settings-modal').classList.remove('show');
    }

    saveGitHubSettings() {
        this.githubSync.setToken(document.getElementById('github-token').value.trim());
        this.updateGitHubUI();
        this.showStatusMessage('github-settings-status', 'success', '✅ 保存しました');
    }

    /**
     * GitHub接続テスト
     */
    async testGitHubConnection() {
        this.githubSync.setToken(document.getElementById('github-token').value.trim());
        this.showStatusMessage('github-settings-status', 'loading', '🔌 接続を確認中...');

        try {
            const result = await this.githubSync.verifyAccess();
            if (result.canPush) {
                this.showStatusMessage('github-settings-status', 'success', `✅ ${result.fullName} に書き込み可能です`);
            } else {
                this.showStatusMessage('github-settings-status', 'error', `⚠️ ${result.fullName} への書き込み権限がありません（トークンのContents権限を確認してください）`);
            }
        } catch (error) {
            this.showStatusMessage('github-settings-status', 'error', `❌ ${error.message}`);
        }
    }

    /**
     * 蔵書を全てクリア
     */
    async clearLibrary() {
        const confirmMessage = `🗑️ 全データを完全にクリアしますか？

この操作により以下のデータが削除されます：
• 全ての書籍データ
• 全ての本棚設定
• 全ての評価・メモ
• 全ての並び順設定

この操作は元に戻せません。`;
        
        if (!confirm(confirmMessage)) {
            return;
        }
        
        try {
            this.showLoading();
            
            // BookManagerで蔵書をクリア
            await this.bookManager.clearAllBooks();
            
            // 全てのuserDataを完全にクリア
            if (this.userData) {
                // 本棚データを完全クリア
                this.userData.bookshelves = [];
                
                // 評価・メモを完全クリア  
                this.userData.notes = {};
                
                // 並び順データを完全クリア
                this.userData.bookOrder = {};
                
                // 統計データもリセット
                this.userData.stats = {
                    totalBooks: 0,
                    notesCount: 0
                };
            }
            
            // 本のリストを更新
            this.books = [];
            this.filteredBooks = [];
            
            // UIを更新
            this.saveUserData();
            this.updateDisplay();
            this.updateStats();
            
            alert('✅ 全データを完全にクリアしました');
        } catch (error) {
            console.error('蔵書クリア中にエラーが発生しました:', error);
            alert('❌ 蔵書のクリアに失敗しました: ' + error.message);
        } finally {
            this.hideLoading();
        }
    }

    renderBookshelfOverview() {
        const overviewSection = document.getElementById('bookshelves-overview');
        const grid = document.getElementById('bookshelves-grid');
        
        if (!this.userData.bookshelves || this.userData.bookshelves.length === 0) {
            overviewSection.style.display = 'none';
            return;
        }

        overviewSection.style.display = 'block';
        
        let html = '';
        this.userData.bookshelves.forEach(bookshelf => {
            const bookCount = bookshelf.books ? bookshelf.books.length : 0;
            
            // Apply custom book order for preview if it exists
            let previewBooks = [];
            if (bookshelf.books && bookshelf.books.length > 0) {
                let orderedBooks = [...bookshelf.books];
                
                // Apply custom order if exists
                if (this.userData.bookOrder && this.userData.bookOrder[bookshelf.id]) {
                    const customOrder = this.userData.bookOrder[bookshelf.id];
                    orderedBooks.sort((a, b) => {
                        const aIndex = customOrder.indexOf(a);
                        const bIndex = customOrder.indexOf(b);
                        
                        if (aIndex === -1 && bIndex === -1) return 0;
                        if (aIndex === -1) return 1;
                        if (bIndex === -1) return -1;
                        return aIndex - bIndex;
                    });
                }
                
                previewBooks = orderedBooks.slice(0, 8);
            }
            
            const textOnlyClass = this.showImagesInOverview ? '' : 'text-only';
            const isPublic = bookshelf.isPublic || false;
            const publicBadge = isPublic ? '<span class="public-badge">📤 公開中</span>' : '';



            html += `
                <div class="bookshelf-preview ${textOnlyClass}" data-bookshelf-id="${bookshelf.id}">
                    <div class="bookshelf-preview-header">
                        <h3>${bookshelf.emoji || '📚'} ${bookshelf.name} ${publicBadge}</h3>
                        <div class="bookshelf-preview-actions">
                            <button class="btn btn-small btn-secondary select-bookshelf" data-bookshelf-id="${bookshelf.id}">📚 表示</button>
                            ${isPublic ? `<button class="btn btn-small btn-primary open-static-page" data-bookshelf-id="${bookshelf.id}">🌐 静的ページ</button>` : ''}
                        </div>
                    </div>
                    <p>${bookshelf.description || ''}</p>

                    <p class="book-count">${bookCount}冊</p>
                    <div class="bookshelf-preview-books">
                        ${previewBooks.map(asin => {
                            const book = this.books.find(b => b.asin === asin);
                            if (book && book.productImage) {
                                return `<div class="bookshelf-preview-book"><img src="${this.bookManager.getProductImageUrl(book)}" alt="${book.title}"></div>`;
                            } else {
                                return '<div class="bookshelf-preview-book bookshelf-preview-placeholder">📖</div>';
                            }
                        }).join('')}
                    </div>
                </div>
            `;
        });

        grid.innerHTML = html;
        
        // Add click handlers for bookshelf actions
        grid.addEventListener('click', (e) => {
            if (e.target.classList.contains('select-bookshelf')) {
                // 本棚選択ボタン
                const bookshelfId = e.target.dataset.bookshelfId;
                document.getElementById('bookshelf-selector').value = bookshelfId;
                this.switchBookshelf(bookshelfId);

                // 本が表示されているエリアにスムーズスクロール
                setTimeout(() => {
                    const bookshelf = document.getElementById('bookshelf');
                    if (bookshelf) {
                        bookshelf.scrollIntoView({
                            behavior: 'smooth',
                            block: 'start'
                        });
                    }
                }, 100);
            } else if (e.target.classList.contains('open-static-page')) {
                // 静的ページボタン
                const bookshelfId = e.target.dataset.bookshelfId;
                this.openStaticPageById(bookshelfId);
            } else {
                // 本棚プレビューエリアをクリックした場合は本棚選択
                const bookshelfPreview = e.target.closest('.bookshelf-preview');
                if (bookshelfPreview && !e.target.closest('.bookshelf-preview-actions')) {
                    const bookshelfId = bookshelfPreview.dataset.bookshelfId;
                    document.getElementById('bookshelf-selector').value = bookshelfId;
                    this.switchBookshelf(bookshelfId);

                    // 本が表示されているエリアにスムーズスクロール
                    setTimeout(() => {
                        const bookshelf = document.getElementById('bookshelf');
                        if (bookshelf) {
                            bookshelf.scrollIntoView({
                                behavior: 'smooth',
                                block: 'start'
                            });
                        }
                    }, 100);
                }
            }
        });
    }

    toggleBookshelfDisplay() {
        this.showImagesInOverview = !this.showImagesInOverview;
        this.userData.settings.showImagesInOverview = this.showImagesInOverview;
        this.saveUserData();
        
        const button = document.getElementById('toggle-bookshelf-display');
        button.textContent = this.showImagesInOverview ? '🖼️ 画像表示切替' : '📝 テキストのみ';
        
        this.renderBookshelfOverview();
    }

    showError(message) {
        const bookshelf = document.getElementById('bookshelf');
        bookshelf.innerHTML = `<div class="error-message">❌ ${message}</div>`;
    }
    
    generateStarRating(rating) {
        let stars = '';
        for (let i = 1; i <= 5; i++) {
            const isActive = i <= rating ? 'active' : '';
            const color = i <= rating ? '#ffa500' : '#ddd';
            stars += `<span class="star ${isActive}" data-rating="${i}" style="color: ${color};">⭐</span>`;
        }
        return stars;
    }
    
    displayStarRating(rating) {
        if (!rating || rating === 0) return '';
        let stars = '';
        for (let i = 1; i <= rating; i++) {
            stars += '⭐';
        }
        return `<div class="book-rating"><span class="stars">${stars}</span></div>`;
    }
    
    saveRating(asin, rating) {
        if (!this.userData.notes[asin]) {
            this.userData.notes[asin] = { memo: '', rating: 0 };
        }
        this.userData.notes[asin].rating = rating;
        this.saveUserData();
    }
    
    /**
     * ローディング表示
     */
    showLoading() {
        const loading = document.getElementById('loading');
        if (loading) {
            loading.style.display = 'block';
        }
    }

    hideLoading() {
        const loading = document.getElementById('loading');
        if (loading) {
            loading.style.display = 'none';
        }
    }

    setupBookshelfDragAndDrop(container) {
        let draggedBookshelf = null;

        container.addEventListener('dragstart', (e) => {
            if (e.target.classList.contains('bookshelf-item')) {
                draggedBookshelf = e.target;
                e.target.classList.add('dragging');
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', e.target.dataset.id);
            }
        });

        container.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            
            const target = e.target.closest('.bookshelf-item');
            if (target && target !== draggedBookshelf) {
                target.style.borderTop = '2px solid #3498db';
            }
        });

        container.addEventListener('dragleave', (e) => {
            const target = e.target.closest('.bookshelf-item');
            if (target) {
                target.style.borderTop = '';
            }
        });

        container.addEventListener('drop', (e) => {
            e.preventDefault();
            
            const target = e.target.closest('.bookshelf-item');
            if (target && target !== draggedBookshelf) {
                const draggedId = draggedBookshelf.dataset.id;
                const targetId = target.dataset.id;
                this.reorderBookshelves(draggedId, targetId);
            }

            // Clear all visual feedback
            container.querySelectorAll('.bookshelf-item').forEach(item => {
                item.style.borderTop = '';
            });
        });

        container.addEventListener('dragend', (e) => {
            if (e.target.classList.contains('bookshelf-item')) {
                e.target.classList.remove('dragging');
                draggedBookshelf = null;
            }
            
            // Clear all visual feedback
            container.querySelectorAll('.bookshelf-item').forEach(item => {
                item.style.borderTop = '';
            });
        });
    }

    reorderBookshelves(draggedId, targetId) {
        const draggedIndex = this.userData.bookshelves.findIndex(b => b.id === draggedId);
        const targetIndex = this.userData.bookshelves.findIndex(b => b.id === targetId);

        if (draggedIndex !== -1 && targetIndex !== -1) {
            // Remove the dragged bookshelf from its current position
            const draggedBookshelf = this.userData.bookshelves.splice(draggedIndex, 1)[0];
            
            // Insert it at the new position
            this.userData.bookshelves.splice(targetIndex, 0, draggedBookshelf);
            
            // Save the changes
            this.saveUserData();
            this.updateBookshelfSelector();
            this.renderBookshelfList();
            
            console.log(`📚 本棚「${draggedBookshelf.name}」を移動しました`);
        }
    }

    /**
     * 静的共有モーダルを表示
     */
    showStaticShareModal(bookshelfId) {
        const bookshelf = this.userData.bookshelves.find(b => b.id === bookshelfId);
        if (!bookshelf) return;

        this.currentShareBookshelf = bookshelf;
        const modal = document.getElementById('static-share-modal');
        const form = document.getElementById('share-generation-form');
        const results = document.getElementById('share-results');

        // フォームを非表示、結果を表示
        form.style.display = 'none';
        results.style.display = 'block';

        modal.classList.add('show');
        
        // 自動的に静的ページを生成
        this.generateStaticPage();
    }

    /**
     * 静的共有モーダルを閉じる
     */
    closeStaticShareModal() {
        const modal = document.getElementById('static-share-modal');
        modal.classList.remove('show');
        this.currentShareBookshelf = null;
    }

    /**
     * 静的ページを生成
     */
    async generateStaticPage() {
        if (!this.currentShareBookshelf) return;


        const generateBtn = document.getElementById('generate-static-page');
        const form = document.getElementById('share-generation-form');
        const results = document.getElementById('share-results');
        const resultsContent = results.querySelector('.share-result-content');

        // ローディング状態
        generateBtn.disabled = true;
        generateBtn.textContent = '生成中...';

        try {
            const options = {};

            const result = await this.staticGenerator.generateStaticBookshelf(
                this.currentShareBookshelf.id,
                options
            );

            if (result.success) {
                // 本棚データに公開情報を保存
                this.currentShareBookshelf.staticPageInfo = {
                    filename: result.filename,
                    lastGenerated: new Date().toISOString(),

                    // GitHub Pages URLを生成（リポジトリ名から推測）
                    url: `https://karaage0703.github.io/karaage-virtual-bookshelf/static/${result.filename}`
                };
                this.saveUserData();

                // 成功時の表示
                resultsContent.innerHTML = `
                    <div class="success-message">
                        <h3>✅ 静的ページが生成されました！</h3>
                        <div class="generation-info">
                            <p><strong>本棚:</strong> ${result.bookshelf.emoji} ${result.bookshelf.name}</p>
                            <p><strong>書籍数:</strong> ${result.totalBooks}冊</p>
                            <p><strong>ファイル名:</strong> ${result.filename}</p>
                            <p><strong>公開URL:</strong> <a href="${this.currentShareBookshelf.staticPageInfo.url}" target="_blank">${this.currentShareBookshelf.staticPageInfo.url}</a></p>
                            <p><strong>注意:</strong> GitHubにpushした後にURLが有効になります</p>
                        </div>

                        <div class="form-actions">
                            <button class="btn btn-primary" onclick="navigator.clipboard.writeText('${this.currentShareBookshelf.staticPageInfo.url}')">📋 URLをコピー</button>
                            <button class="btn btn-secondary" onclick="window.bookshelf.closeStaticShareModal()">閉じる</button>
                        </div>
                    </div>
                `;

                // フォームを隠して結果を表示
                form.style.display = 'none';
                results.style.display = 'block';

            } else {
                // エラー時の表示
                resultsContent.innerHTML = `
                    <div class="error-message">
                        <h3>❌ 生成に失敗しました</h3>
                        <p>エラー: ${result.error}</p>
                        <button class="btn btn-secondary" onclick="document.getElementById('static-share-modal').querySelector('#share-generation-form').style.display='block'; document.getElementById('share-results').style.display='none';">再試行</button>
                    </div>
                `;
                form.style.display = 'none';
                results.style.display = 'block';
            }

        } catch (error) {
            console.error('静的ページ生成エラー:', error);
            resultsContent.innerHTML = `
                <div class="error-message">
                    <h3>❌ 生成中にエラーが発生しました</h3>
                    <p>エラー: ${error.message}</p>
                    <button class="btn btn-secondary" onclick="document.getElementById('static-share-modal').querySelector('#share-generation-form').style.display='block'; document.getElementById('share-results').style.display='none';">再試行</button>
                </div>
            `;
            form.style.display = 'none';
            results.style.display = 'block';
        } finally {
            // ボタンを元に戻す
            generateBtn.disabled = false;
            generateBtn.textContent = '📄 静的ページを生成';
        }
    }

    /**
     * 静的ページボタンの表示・非表示を制御
     */
    updateStaticPageButton(bookshelfId) {
        const button = document.getElementById('view-static-page');
        if (!button) return;

        if (bookshelfId === 'all') {
            button.style.display = 'none';
        } else {
            const bookshelf = this.userData.bookshelves?.find(b => b.id === bookshelfId);
            if (bookshelf && bookshelf.isPublic) {
                button.style.display = 'inline-block';
            } else {
                button.style.display = 'none';
            }
        }
    }

    /**
     * 現在選択中の本棚の静的ページを開く
     */
    openStaticPage() {
        const currentBookshelfId = document.getElementById('bookshelf-selector').value;
        if (currentBookshelfId === 'all') return;

        this.openStaticPageById(currentBookshelfId);
    }

    /**
     * 指定IDの本棚の静的ページを開く
     */
    openStaticPageById(bookshelfId) {
        const bookshelf = this.userData.bookshelves?.find(b => b.id === bookshelfId);
        if (!bookshelf || !bookshelf.isPublic) {
            alert('この本棚は公開されていません');
            return;
        }

        const staticUrl = `${window.location.origin}${window.location.pathname.replace('index.html', '')}static/${bookshelfId}.html`;
        window.open(staticUrl, '_blank');
    }

    // Multi-Select Methods
    toggleBookSelection(asin) {
        if (this.selectedBooks.has(asin)) {
            this.selectedBooks.delete(asin);
        } else {
            this.selectedBooks.add(asin);
        }
        this.updateSelectionUI();
    }

    selectAllBooks() {
        // Select all visible books in current view
        const currentBookshelfId = document.getElementById('bookshelf-selector').value;
        let booksToSelect = this.filteredBooks;

        if (currentBookshelfId !== 'all') {
            const bookshelf = this.userData.bookshelves.find(bs => bs.id === currentBookshelfId);
            if (bookshelf) {
                booksToSelect = this.filteredBooks.filter(book => bookshelf.books.includes(book.asin));
            }
        }

        booksToSelect.forEach(book => this.selectedBooks.add(book.asin));
        this.updateSelectionUI();
    }

    deselectAllBooks() {
        this.selectedBooks.clear();
        this.updateSelectionUI();
    }

    updateSelectionUI() {
        // Update checkboxes and selected classes
        const bookElements = document.querySelectorAll('.book-item');
        bookElements.forEach(bookElement => {
            const asin = bookElement.dataset.asin;
            const checkbox = bookElement.querySelector('.book-select-checkbox input[type="checkbox"]');
            const isSelected = this.selectedBooks.has(asin);

            if (checkbox) {
                checkbox.checked = isSelected;
            }

            if (isSelected) {
                bookElement.classList.add('selected');
            } else {
                bookElement.classList.remove('selected');
            }
        });

        // Update toolbar
        this.updateToolbar();
    }

    updateToolbar() {
        const toolbar = document.getElementById('multi-select-toolbar');
        const countDisplay = document.getElementById('selected-count-display');

        if (this.selectedBooks.size > 0) {
            toolbar.style.display = 'flex';
            countDisplay.textContent = this.selectedBooks.size;
        } else {
            toolbar.style.display = 'none';
        }
    }

    // Auto-scroll Methods
    handleAutoScroll(e) {
        const scrollThreshold = 100; // pixels from edge to trigger scroll
        const scrollSpeed = 10; // pixels per interval

        const viewportHeight = window.innerHeight;
        const mouseY = e.clientY;

        // Clear existing interval
        this.stopAutoScroll();

        // Check if near top edge
        if (mouseY < scrollThreshold) {
            this.autoScrollInterval = setInterval(() => {
                window.scrollBy(0, -scrollSpeed);
            }, 20);
        }
        // Check if near bottom edge
        else if (mouseY > viewportHeight - scrollThreshold) {
            this.autoScrollInterval = setInterval(() => {
                window.scrollBy(0, scrollSpeed);
            }, 20);
        }
    }

    stopAutoScroll() {
        if (this.autoScrollInterval) {
            clearInterval(this.autoScrollInterval);
            this.autoScrollInterval = null;
        }
    }
}

/**
 * 表紙画像のフォールバック処理
 * data-fallbacks（|区切りのURL群）を順に試し、全滅したらプレースホルダーに置換する。
 * Amazonの画像CDNは404の代わりに1x1のGIFを返すため、読み込み成功でも実質空の画像は失敗扱いにする。
 */
function setupCoverFallback(img) {
    if (img.dataset.fallbackBound) return;
    img.dataset.fallbackBound = '1';

    const tryNext = () => {
        const fallbacks = (img.dataset.fallbacks || '').split('|').filter(url => url);
        if (fallbacks.length > 0) {
            img.dataset.fallbacks = fallbacks.slice(1).join('|');
            img.src = fallbacks[0];
        } else {
            const placeholder = document.createElement('div');
            placeholder.className = img.classList.contains('book-detail-cover') ?
                'book-detail-cover-placeholder' : 'book-cover-placeholder';
            placeholder.textContent = img.alt || '📖';
            img.replaceWith(placeholder);
        }
    };

    img.addEventListener('error', tryNext);
    img.addEventListener('load', () => {
        if (img.naturalWidth <= 1) tryNext();
    });
}

// Lazy Loading for Images
class LazyLoader {
    constructor() {
        this.observer = new IntersectionObserver(
            (entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        img.src = img.dataset.src;
                        img.classList.remove('lazy');
                        this.observer.unobserve(img);
                    }
                });
            },
            { rootMargin: '50px' }
        );
    }

    observe() {
        document.querySelectorAll('.lazy').forEach(img => {
            setupCoverFallback(img);
            this.observer.observe(img);
        });
    }
}

// Global utility functions
function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => {
            alert('URLをクリップボードにコピーしました！');
        }).catch(() => {
            fallbackCopyToClipboard(text);
        });
    } else {
        fallbackCopyToClipboard(text);
    }
}

function fallbackCopyToClipboard(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
        document.execCommand('copy');
        alert('URLをクリップボードにコピーしました！');
    } catch (err) {
        console.error('Failed to copy: ', err);
        alert('コピーに失敗しました。手動でURLを選択してコピーしてください。');
    }
    document.body.removeChild(textArea);
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.bookshelf = new VirtualBookshelf();
    window.lazyLoader = new LazyLoader();

    // Bookshelf management event listeners are handled in setupEventListeners

    // Set up mutation observer to handle dynamically added images
    const mutationObserver = new MutationObserver(() => {
        window.lazyLoader.observe();
    });

    mutationObserver.observe(document.getElementById('bookshelf'), {
        childList: true,
        subtree: true
    });
});