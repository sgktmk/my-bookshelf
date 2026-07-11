/**
 * GitHubSync - GitHub Contents API 経由で library.json を直接読み書きするクラス
 *
 * 認証方法は2通り:
 * 1. Fine-grained Personal Access Token (PAT) を貼り付け
 *    - 対象リポジトリのみ / Contents: Read and write 権限を推奨
 * 2. Sveltia CMS / Decap CMS 互換の OAuth 認証エンドポイント経由のサインイン
 *    - 例: sveltia-cms-auth (Cloudflare Workers) のデプロイ先URLを設定
 *
 * トークンと設定はブラウザの LocalStorage に保存される（このブラウザ内のみ）。
 */
class GitHubSync {
    constructor() {
        this.CONFIG_KEY = 'virtualBookshelf_githubConfig';
        this.TOKEN_KEY = 'virtualBookshelf_githubToken';
        this.config = this.loadConfig();
    }

    /**
     * 設定を読み込み（無ければホスト名から推測したデフォルト値）
     */
    loadConfig() {
        try {
            const saved = localStorage.getItem(this.CONFIG_KEY);
            if (saved) {
                return { ...this.getDefaultConfig(), ...JSON.parse(saved) };
            }
        } catch (error) {
            console.warn('GitHub設定の読み込みに失敗:', error);
        }
        return this.getDefaultConfig();
    }

    /**
     * GitHub Pages のURLからowner/repoを推測する
     * 例: sgktmk.github.io/my-bookshelf → owner: sgktmk, repo: my-bookshelf
     */
    getDefaultConfig() {
        let owner = '';
        let repo = '';

        const host = window.location.hostname;
        const ghPagesMatch = host.match(/^([a-z0-9-]+)\.github\.io$/i);
        if (ghPagesMatch) {
            owner = ghPagesMatch[1];
            const pathParts = window.location.pathname.split('/').filter(p => p);
            if (pathParts.length > 0) {
                repo = pathParts[0];
            } else {
                repo = `${owner}.github.io`;
            }
        }

        return {
            owner: owner,
            repo: repo,
            branch: 'main',
            filePath: 'data/library.json',
            authEndpoint: ''
        };
    }

    saveConfig(updates) {
        this.config = { ...this.config, ...updates };
        localStorage.setItem(this.CONFIG_KEY, JSON.stringify(this.config));
    }

    getToken() {
        return localStorage.getItem(this.TOKEN_KEY) || '';
    }

    setToken(token) {
        if (token) {
            localStorage.setItem(this.TOKEN_KEY, token);
        } else {
            localStorage.removeItem(this.TOKEN_KEY);
        }
    }

    clearToken() {
        localStorage.removeItem(this.TOKEN_KEY);
    }

    /**
     * リポジトリ設定とトークンが揃っていて保存可能か
     */
    isReady() {
        return !!(this.config.owner && this.config.repo && this.getToken());
    }

    /**
     * Sveltia / Decap CMS 互換のOAuthポップアップフローでサインイン
     * (authEndpoint には sveltia-cms-auth 等のデプロイURLを設定)
     */
    signInWithOAuth() {
        return new Promise((resolve, reject) => {
            const endpoint = (this.config.authEndpoint || '').replace(/\/$/, '');
            if (!endpoint) {
                reject(new Error('OAuth認証エンドポイントが設定されていません'));
                return;
            }

            const url = `${endpoint}/auth?provider=github&site_id=${encodeURIComponent(window.location.hostname)}&scope=repo`;
            const popup = window.open(url, 'github-oauth', 'width=600,height=800,popup=1');
            if (!popup) {
                reject(new Error('ポップアップがブロックされました。ポップアップを許可してください。'));
                return;
            }

            let settled = false;
            const cleanup = () => {
                window.removeEventListener('message', onMessage);
                clearInterval(watchdog);
            };

            // Decap/Sveltia のハンドシェイク:
            // 1. コールバックページが "authorizing:github" を送ってくる
            // 2. こちらが同じ文字列を返す
            // 3. "authorization:github:success:{...json...}" が届く
            const onMessage = (event) => {
                const { data, source, origin } = event;
                if (typeof data !== 'string' || !data.startsWith('auth')) return;

                if (data === 'authorizing:github') {
                    source.postMessage(data, origin);
                    return;
                }

                if (data.startsWith('authorization:github:success:')) {
                    settled = true;
                    cleanup();
                    try {
                        const payload = JSON.parse(data.replace('authorization:github:success:', ''));
                        this.setToken(payload.token);
                        resolve(payload.token);
                    } catch (error) {
                        reject(new Error('認証レスポンスの解析に失敗しました'));
                    }
                    try { popup.close(); } catch (e) { /* noop */ }
                    return;
                }

                if (data.startsWith('authorization:github:error:')) {
                    settled = true;
                    cleanup();
                    reject(new Error(`OAuth認証エラー: ${data.replace('authorization:github:error:', '')}`));
                    try { popup.close(); } catch (e) { /* noop */ }
                }
            };

            window.addEventListener('message', onMessage);

            const watchdog = setInterval(() => {
                if (popup.closed && !settled) {
                    cleanup();
                    reject(new Error('認証がキャンセルされました'));
                }
            }, 500);
        });
    }

    /**
     * GitHub API リクエスト共通処理
     */
    async apiRequest(path, options = {}) {
        const token = this.getToken();
        const response = await fetch(`https://api.github.com${path}`, {
            ...options,
            headers: {
                'Accept': 'application/vnd.github+json',
                'X-GitHub-Api-Version': '2022-11-28',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
                ...(options.headers || {})
            }
        });
        return response;
    }

    /**
     * トークンとリポジトリへのアクセスを検証
     */
    async verifyAccess() {
        const { owner, repo } = this.config;
        if (!owner || !repo) {
            throw new Error('リポジトリ（owner/repo）が設定されていません');
        }
        if (!this.getToken()) {
            throw new Error('トークンが設定されていません');
        }

        const response = await this.apiRequest(`/repos/${owner}/${repo}`);
        if (response.status === 401) {
            throw new Error('トークンが無効です（期限切れの可能性があります）');
        }
        if (response.status === 404) {
            throw new Error(`リポジトリ ${owner}/${repo} にアクセスできません（トークンの権限を確認してください）`);
        }
        if (!response.ok) {
            throw new Error(`GitHub APIエラー: ${response.status}`);
        }

        const data = await response.json();
        return {
            fullName: data.full_name,
            canPush: !!(data.permissions && data.permissions.push),
            defaultBranch: data.default_branch
        };
    }

    /**
     * リポジトリ上のファイルを取得（存在しない場合は null）
     * @returns {{ content: string, sha: string } | null}
     */
    async getFile(path = null) {
        const { owner, repo, branch } = this.config;
        const filePath = path || this.config.filePath;

        const response = await this.apiRequest(
            `/repos/${owner}/${repo}/contents/${filePath}?ref=${encodeURIComponent(branch)}`
        );

        if (response.status === 404) {
            return null;
        }
        if (!response.ok) {
            throw new Error(`ファイル取得に失敗しました: ${response.status}`);
        }

        const data = await response.json();

        // 1MB超のファイルはcontentが空になるためdownload_urlから取得
        if (data.encoding === 'none' || !data.content) {
            const rawResponse = await fetch(data.download_url);
            if (!rawResponse.ok) {
                throw new Error(`ファイルのダウンロードに失敗しました: ${rawResponse.status}`);
            }
            return { content: await rawResponse.text(), sha: data.sha };
        }

        return { content: this.decodeBase64(data.content), sha: data.sha };
    }

    /**
     * ファイルをコミット（新規作成 or 更新）
     * @returns {{ commitUrl: string, sha: string }}
     */
    async commitFile(contentString, message, path = null) {
        const { owner, repo, branch } = this.config;
        const filePath = path || this.config.filePath;

        // 既存ファイルのSHAを取得（無ければ新規作成）
        let sha = null;
        const existing = await this.getFile(filePath);
        if (existing) {
            if (existing.content === contentString) {
                return { unchanged: true, sha: existing.sha, commitUrl: null };
            }
            sha = existing.sha;
        }

        const response = await this.apiRequest(`/repos/${owner}/${repo}/contents/${filePath}`, {
            method: 'PUT',
            body: JSON.stringify({
                message: message,
                content: this.encodeBase64(contentString),
                branch: branch,
                ...(sha ? { sha } : {})
            })
        });

        if (response.status === 409) {
            throw new Error('コンフリクトが発生しました。先に「GitHubから読込」で最新データを取得してください。');
        }
        if (!response.ok) {
            const body = await response.json().catch(() => ({}));
            throw new Error(`コミットに失敗しました: ${response.status} ${body.message || ''}`);
        }

        const data = await response.json();
        return {
            unchanged: false,
            sha: data.content.sha,
            commitUrl: data.commit.html_url
        };
    }

    /**
     * UTF-8文字列 → Base64
     */
    encodeBase64(str) {
        const bytes = new TextEncoder().encode(str);
        let binary = '';
        const chunkSize = 0x8000;
        for (let i = 0; i < bytes.length; i += chunkSize) {
            binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
        }
        return btoa(binary);
    }

    /**
     * Base64 → UTF-8文字列
     */
    decodeBase64(base64) {
        const binary = atob(base64.replace(/\s/g, ''));
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return new TextDecoder().decode(bytes);
    }
}
