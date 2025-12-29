// ===== Global State =====
const AppState = {
    apiKey: '',
    files: [],
    isTranslating: false,
    isPaused: false,
    startTime: null,
    timerInterval: null,
    autoScroll: true,
    isMobile: false,
    stats: {
        filesProcessed: 0,
        textsTranslated: 0,
        totalTexts: 0,
        estimatedCost: 0
    },
    config: {
        sourceLanguage: 'ja',
        targetLanguage: 'vi',
        gameType: 'auto',
        translateDialogue: true,
        translateNames: true,
        translateDescriptions: true,
        preserveFormatting: true,
        skipTranslated: false,
        autoDownload: false,
        batchSize: 10
    }
};

// ===== DOM Elements =====
const DOM = {
    apiKey: document.getElementById('apiKey'),
    toggleApiKey: document.getElementById('toggleApiKey'),
    testApiKey: document.getElementById('testApiKey'),
    apiStatus: document.getElementById('apiStatus'),
    sourceLanguage: document.getElementById('sourceLanguage'),
    targetLanguage: document.getElementById('targetLanguage'),
    gameType: document.getElementById('gameType'),
    uploadArea: document.getElementById('uploadArea'),
    fileInput: document.getElementById('fileInput'),
    folderInput: document.getElementById('folderInput'),
    fileListContainer: document.getElementById('fileListContainer'),
    fileList: document.getElementById('fileList'),
    fileCount: document.getElementById('fileCount'),
    clearFiles: document.getElementById('clearFiles'),
    translateDialogue: document.getElementById('translateDialogue'),
    translateNames: document.getElementById('translateNames'),
    translateDescriptions: document.getElementById('translateDescriptions'),
    preserveFormatting: document.getElementById('preserveFormatting'),
    skipTranslated: document.getElementById('skipTranslated'),
    autoDownload: document.getElementById('autoDownload'),
    batchSize: document.getElementById('batchSize'),
    batchSizeValue: document.getElementById('batchSizeValue'),
    startTranslation: document.getElementById('startTranslation'),
    stopTranslation: document.getElementById('stopTranslation'),
    downloadAll: document.getElementById('downloadAll'),
    progressSection: document.getElementById('progressSection'),
    progressBar: document.querySelector('.progress-bar-fill'),
    progressText: document.getElementById('progressText'),
    progressPercentage: document.getElementById('progressPercentage'),
    filesProcessed: document.getElementById('filesProcessed'),
    textsTranslated: document.getElementById('textsTranslated'),
    timeElapsed: document.getElementById('timeElapsed'),
    estimatedCost: document.getElementById('estimatedCost'),
    currentFile: document.getElementById('currentFile'),
    fileSpinner: document.getElementById('fileSpinner'),
    logContainer: document.getElementById('logContainer'),
    clearLog: document.getElementById('clearLog'),
    autoScrollLog: document.getElementById('autoScrollLog'),
    toast: document.getElementById('toast'),
    loadingOverlay: document.getElementById('loadingOverlay'),
    mobileNotice: document.getElementById('mobileNotice'),
    toggleGuide: document.getElementById('toggleGuide'),
    guideContent: document.getElementById('guideContent')
};

// ===== Utility Functions =====
const Utils = {
    formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    },
    
    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    },
    
    getTimestamp() {
        const now = new Date();
        return `[${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}]`;
    },
    
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    },
    
    detectMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
               window.innerWidth <= 768;
    },
    
    detectGameType(content) {
        try {
            const json = JSON.parse(content);
            if (json.hasOwnProperty('_name') || (Array.isArray(json) && json[0]?.hasOwnProperty('_name'))) {
                return 'mz';
            }
            return 'mv';
        } catch (e) {
            return 'mv';
        }
    },
    
    saveToStorage(key, value) {
        try {
            localStorage.setItem(`rpgm_translator_${key}`, JSON.stringify(value));
        } catch (e) {
            console.error('Failed to save to localStorage:', e);
        }
    },
    
    loadFromStorage(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(`rpgm_translator_${key}`);
            return item ? JSON.parse(item) : defaultValue;
        } catch (e) {
            return defaultValue;
        }
    },
    
    vibrate(pattern = 50) {
        if ('vibrate' in navigator) {
            navigator.vibrate(pattern);
        }
    }
};

// ===== Toast System =====
const Toast = {
    show(title, message, type = 'info', duration = 4000) {
        const icons = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle'
        };
        
        DOM.toast.className = `toast ${type} show`;
        DOM.toast.querySelector('.toast-icon').innerHTML = `<i class="fas ${icons[type]}"></i>`;
        DOM.toast.querySelector('.toast-title').textContent = title;
        DOM.toast.querySelector('.toast-message').textContent = message;
        
        if (AppState.isMobile) {
            Utils.vibrate([50, 100, 50]);
        }
        
        setTimeout(() => {
            DOM.toast.classList.remove('show');
        }, duration);
    },
    
    success(title, message) {
        this.show(title, message, 'success');
    },
    
    error(title, message) {
        this.show(title, message, 'error', 5000);
    },
    
    warning(title, message) {
        this.show(title, message, 'warning');
    },
    
    info(title, message) {
        this.show(title, message, 'info');
    }
};

// ===== Logger System =====
const Logger = {
    log(message, type = 'info') {
        const icons = {
            info: 'fa-info-circle',
            success: 'fa-check-circle',
            warning: 'fa-exclamation-triangle',
            error: 'fa-times-circle'
        };
        
        const logEntry = document.createElement('div');
        logEntry.className = `log-entry log-${type}`;
        logEntry.innerHTML = `
            <span class="log-icon"><i class="fas ${icons[type]}"></i></span>
            <span class="log-time">${Utils.getTimestamp()}</span>
            <span class="log-message">${message}</span>
        `;
        DOM.logContainer.appendChild(logEntry);
        
        if (AppState.autoScroll) {
            DOM.logContainer.scrollTop = DOM.logContainer.scrollHeight;
        }
    },
    
    info(message) { this.log(message, 'info'); },
    success(message) { this.log(message, 'success'); },
    warning(message) { this.log(message, 'warning'); },
    error(message) { this.log(message, 'error'); },
    
    clear() {
        DOM.logContainer.innerHTML = '';
        this.info('Nhật ký đã được xóa');
    }
};

// ===== Loading Overlay =====
const Loading = {
    show(message = 'Đang xử lý...') {
        DOM.loadingOverlay.querySelector('p').textContent = message;
        DOM.loadingOverlay.style.display = 'flex';
    },
    
    hide() {
        DOM.loadingOverlay.style.display = 'none';
    }
};

// ===== API Manager =====
const APIManager = {
    async testConnection() {
        if (!AppState.apiKey.trim()) {
            Toast.warning('API Key trống', 'Vui lòng nhập API key');
            return false;
        }
        
        Loading.show('Đang test kết nối...');
        Logger.info('🔌 Đang test kết nối API...');
        
        try {
            const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${AppState.apiKey}`
                },
                body: JSON.stringify({
                    model: 'deepseek-chat',
                    messages: [{ role: 'user', content: 'test' }],
                    max_tokens: 10
                })
            });
            
            Loading.hide();
            
            if (response.ok) {
                DOM.apiStatus.innerHTML = '<i class="fas fa-circle"></i><span>Đã kết nối</span>';
                DOM.apiStatus.classList.add('connected');
                Logger.success('✅ Kết nối API thành công!');
                Toast.success('Thành công', 'API key hợp lệ!');
                return true;
            } else {
                const error = await response.json();
                throw new Error(error.error?.message || 'API key không hợp lệ');
            }
        } catch (error) {
            Loading.hide();
            DOM.apiStatus.innerHTML = '<i class="fas fa-circle"></i><span>Lỗi kết nối</span>';
            DOM.apiStatus.classList.remove('connected');
            Logger.error(`❌ Lỗi API: ${error.message}`);
            Toast.error('Lỗi kết nối', error.message);
            return false;
        }
    }
};

// ===== File Manager =====
const FileManager = {
    addFiles(files) {
        const jsonFiles = Array.from(files).filter(file => 
            file.name.toLowerCase().endsWith('.json')
        );
        
        if (jsonFiles.length === 0) {
            Toast.warning('Không có file JSON', 'Vui lòng chọn file JSON');
            return;
        }
        
        jsonFiles.forEach(file => {
            // Check duplicate
            const exists = AppState.files.some(f => f.name === file.name);
            if (exists) {
                Logger.warning(`⚠ File ${file.name} đã tồn tại, bỏ qua`);
                return;
            }
            
            const fileObj = {
                id: Utils.generateId(),
                file: file,
                name: file.name,
                size: file.size,
                status: 'pending',
                translatedData: null
            };
            
            AppState.files.push(fileObj);
            this.renderFileItem(fileObj);
            Logger.info(`📄 Đã thêm: ${file.name} (${Utils.formatFileSize(file.size)})`);
        });
        
        this.updateUI();
        Toast.success('Thêm file', `Đã thêm ${jsonFiles.length} file`);
        Utils.vibrate(50);
    },
    
    renderFileItem(fileObj) {
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item';
        fileItem.dataset.fileId = fileObj.id;
        fileItem.innerHTML = `
            <div class="file-info">
                <i class="fas fa-file-code"></i>
                <div class="file-details">
                    <div class="file-name">${fileObj.name}</div>
                    <div class="file-size">${Utils.formatFileSize(fileObj.size)}</div>
                </div>
            </div>
            <div class="file-status pending">
                <i class="fas fa-clock"></i>
                <span>Chờ xử lý</span>
            </div>
            <button class="btn-remove-file" onclick="FileManager.removeFile('${fileObj.id}')">
                <i class="fas fa-times"></i>
            </button>
        `;
        DOM.fileList.appendChild(fileItem);
    },
    
    updateFileStatus(fileId, status, message = '') {
        const fileItem = document.querySelector(`[data-file-id="${fileId}"]`);
        if (!fileItem) return;
        
        const statusEl = fileItem.querySelector('.file-status');
        const statusData = {
            pending: { icon: 'fa-clock', text: 'Chờ xử lý' },
            processing: { icon: 'fa-spinner fa-spin', text: 'Đang dịch...' },
            completed: { icon: 'fa-check-circle', text: 'Hoàn thành' },
            error: { icon: 'fa-exclamation-circle', text: 'Lỗi' }
        };
        
        const data = statusData[status];
        statusEl.className = `file-status ${status}`;
        statusEl.innerHTML = `
            <i class="fas ${data.icon}"></i>
            <span>${message || data.text}</span>
        `;
        
        const fileObj = AppState.files.find(f => f.id === fileId);
        if (fileObj) fileObj.status = status;
    },
    
    removeFile(fileId) {
        if (AppState.isTranslating) {
            Toast.warning('Đang dịch', 'Không thể xóa file khi đang dịch');
            return;
        }
        
        const fileObj = AppState.files.find(f => f.id === fileId);
        if (!fileObj) return;
        
        AppState.files = AppState.files.filter(f => f.id !== fileId);
        document.querySelector(`[data-file-id="${fileId}"]`)?.remove();
        
        Logger.info(`🗑️ Đã xóa: ${fileObj.name}`);
        this.updateUI();
        Utils.vibrate(50);
    },
    
    clearAll() {
        if (AppState.isTranslating) {
            Toast.warning('Đang dịch', 'Không thể xóa khi đang dịch');
            return;
        }
        
        if (AppState.files.length === 0) return;
        
        AppState.files = [];
        DOM.fileList.innerHTML = '';
        DOM.fileListContainer.style.display = 'none';
        Logger.info('🗑️ Đã xóa tất cả file');
        this.updateUI();
    },
    
    updateUI() {
        const hasFiles = AppState.files.length > 0;
        const hasApiKey = AppState.apiKey.trim() !== '';
        
        DOM.fileListContainer.style.display = hasFiles ? 'block' : 'none';
        DOM.fileCount.textContent = AppState.files.length;
        DOM.startTranslation.disabled = !hasFiles || !hasApiKey || AppState.isTranslating;
    }
};

// ===== Progress Manager =====
const ProgressManager = {
    show() {
        DOM.progressSection.style.display = 'block';
        this.reset();
        DOM.fileSpinner.style.display = 'flex';
    },
    
    hide() {
        DOM.progressSection.style.display = 'none';
        DOM.fileSpinner.style.display = 'none';
    },
    
    reset() {
        AppState.stats = {
            filesProcessed: 0,
            textsTranslated: 0,
            totalTexts: 0,
            estimatedCost: 0
        };
        this.update(0);
        this.updateStats();
    },
    
    update(percentage) {
        percentage = Math.min(100, Math.max(0, percentage));
        DOM.progressBar.style.width = `${percentage}%`;
        DOM.progressText.textContent = `${Math.round(percentage)}%`;
        DOM.progressPercentage.textContent = `${Math.round(percentage)}%`;
    },
    
    updateStats() {
        DOM.filesProcessed.textContent = `${AppState.stats.filesProcessed} / ${AppState.files.length}`;
        DOM.textsTranslated.textContent = AppState.stats.textsTranslated;
        DOM.estimatedCost.textContent = `$${AppState.stats.estimatedCost.toFixed(4)}`;
    },
    
    updateCurrentFile(filename) {
        DOM.currentFile.textContent = filename;
    },
    
    startTimer() {
        AppState.startTime = Date.now();
        AppState.timerInterval = setInterval(() => {
            const elapsed = Math.floor((Date.now() - AppState.startTime) / 1000);
            DOM.timeElapsed.textContent = Utils.formatTime(elapsed);
        }, 1000);
    },
    
    stopTimer() {
        if (AppState.timerInterval) {
            clearInterval(AppState.timerInterval);
            AppState.timerInterval = null;
        }
    }
};

// ===== Translation Controller =====
const TranslationController = {
    async start() {
        if (!this.validateConfig()) return;
        
        AppState.isTranslating = true;
        AppState.isPaused = false;
        
        DOM.startTranslation.style.display = 'none';
        DOM.stopTranslation.style.display = 'inline-flex';
        DOM.downloadAll.style.display = 'none';
        
        ProgressManager.show();
        ProgressManager.startTimer();
        
        Logger.info('=== 🚀 BẮT ĐẦU DỊCH ===');
        Logger.info(`📦 Tổng số file: ${AppState.files.length}`);
        Logger.info(`🌐 ${AppState.config.sourceLanguage.toUpperCase()} → ${AppState.config.targetLanguage.toUpperCase()}`);
        
        try {
            await this.processFiles();
            
            if (!AppState.isPaused) {
                Logger.success('=== ✅ HOÀN THÀNH TẤT CẢ ===');
                Toast.success('Hoàn thành', `Đã dịch ${AppState.files.length} file!`);
                Utils.vibrate([100, 50, 100]);
                DOM.downloadAll.style.display = 'inline-flex';
                
                if (AppState.config.autoDownload) {
                    setTimeout(() => this.downloadAll(), 1000);
                }
            }
        } catch (error) {
            Logger.error(`❌ Lỗi: ${error.message}`);
            Toast.error('Lỗi', error.message);
        } finally {
            this.stop();
        }
    },
    
    async processFiles() {
        for (let i = 0; i < AppState.files.length; i++) {
            if (AppState.isPaused) break;
            
            const fileObj = AppState.files[i];
            await this.processFile(fileObj, i);
        }
    },
    
    async processFile(fileObj, index) {
        try {
            Logger.info(`📝 [${index + 1}/${AppState.files.length}] ${fileObj.name}`);
            ProgressManager.updateCurrentFile(fileObj.name);
            FileManager.updateFileStatus(fileObj.id, 'processing');
            
            const content = await this.readFile(fileObj.file);
            
            if (AppState.config.gameType === 'auto') {
                const type = Utils.detectGameType(content);
                Logger.info(`🔍 Game type: ${type.toUpperCase()}`);
            }
            
            const jsonData = JSON.parse(content);
            const translatedData = await AutoTransEngine.translateFile(
                jsonData,
                fileObj.name,
                AppState.config
            );
            
            fileObj.translatedData = translatedData;
            AppState.stats.filesProcessed++;
            FileManager.updateFileStatus(fileObj.id, 'completed');
            
            const progress = ((index + 1) / AppState.files.length) * 100;
            ProgressManager.update(progress);
            ProgressManager.updateStats();
            
            Logger.success(`✅ [${index + 1}/${AppState.files.length}] ${fileObj.name}`);
            
        } catch (error) {
            Logger.error(`❌ ${fileObj.name}: ${error.message}`);
            FileManager.updateFileStatus(fileObj.id, 'error', error.message);
        }
    },
    
    readFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = () => reject(new Error('Không thể đọc file'));
            reader.readAsText(file);
        });
    },
    
    stop() {
        AppState.isTranslating = false;
        AppState.isPaused = true;
        
        DOM.startTranslation.style.display = 'inline-flex';
        DOM.stopTranslation.style.display = 'none';
        
        ProgressManager.stopTimer();
        FileManager.updateUI();
        
        if (AppState.isPaused) {
            Logger.warning('⏸️ Đã dừng dịch');
            Toast.info('Đã dừng', 'Quá trình dịch đã bị dừng');
        }
    },
    
    validateConfig() {
        if (!AppState.apiKey.trim()) {
            Toast.error('Thiếu API Key', 'Vui lòng nhập API key');
            return false;
        }
        
        if (AppState.files.length === 0) {
            Toast.error('Không có file', 'Vui lòng thêm file để dịch');
            return false;
        }
        
        return true;
    },
    
    downloadAll() {
        const completed = AppState.files.filter(f => f.status === 'completed' && f.translatedData);
        
        if (completed.length === 0) {
            Toast.warning('Không có file', 'Không có file nào để tải xuống');
            return;
        }
        
        Logger.info('💾 Bắt đầu tải xuống...');
        
        completed.forEach(fileObj => {
            const jsonStr = JSON.stringify(fileObj.translatedData, null, 2);
            const blob = new Blob([jsonStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = fileObj.name.replace('.json', '_translated.json');
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            Logger.success(`💾 ${a.download}`);
        });
        
        Toast.success('Tải xuống', `Đã tải ${completed.length} file`);
        Utils.vibrate([50, 100, 50]);
    }
};

// ===== Event Listeners =====
function initEventListeners() {
    // Toggle Guide
    DOM.toggleGuide?.addEventListener('click', () => {
        DOM.guideContent.style.display = DOM.guideContent.style.display === 'none' ? 'block' : 'none';
        DOM.toggleGuide.classList.toggle('collapsed');
    });
    
    // API Key
    DOM.apiKey.addEventListener('input', (e) => {
        AppState.apiKey = e.target.value.trim();
        Utils.saveToStorage('apiKey', AppState.apiKey);
        DOM.apiStatus.classList.remove('connected');
        DOM.apiStatus.innerHTML = '<i class="fas fa-circle"></i><span>Chưa test</span>';
        FileManager.updateUI();
    });
    
    DOM.toggleApiKey.addEventListener('click', () => {
        const type = DOM.apiKey.type === 'password' ? 'text' : 'password';
        DOM.apiKey.type = type;
        DOM.toggleApiKey.querySelector('i').className = `fas fa-eye${type === 'password' ? '' : '-slash'}`;
    });
    
    DOM.testApiKey.addEventListener('click', () => APIManager.testConnection());
    
    // Language & Config
    ['sourceLanguage', 'targetLanguage', 'gameType'].forEach(id => {
        DOM[id].addEventListener('change', (e) => {
            AppState.config[id] = e.target.value;
            Utils.saveToStorage('config', AppState.config);
        });
    });
    
    // Checkboxes
    ['translateDialogue', 'translateNames', 'translateDescriptions', 
     'preserveFormatting', 'skipTranslated', 'autoDownload'].forEach(id => {
        DOM[id].addEventListener('change', (e) => {
            AppState.config[id] = e.target.checked;
            Utils.saveToStorage('config', AppState.config);
        });
    });
    
    // Batch Size
    DOM.batchSize.addEventListener('input', (e) => {
        DOM.batchSizeValue.textContent = e.target.value;
        AppState.config.batchSize = parseInt(e.target.value);
        Utils.saveToStorage('config', AppState.config);
    });
    
    // File Upload
    DOM.fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            FileManager.addFiles(e.target.files);
        }
        e.target.value = '';
    });
    
    DOM.folderInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            FileManager.addFiles(e.target.files);
        }
        e.target.value = '';
    });
    
    // Drag & Drop
    ['dragover', 'dragenter'].forEach(event => {
        DOM.uploadArea.addEventListener(event, (e) => {
            e.preventDefault();
            DOM.uploadArea.classList.add('dragover');
        });
    });
    
    ['dragleave', 'drop'].forEach(event => {
        DOM.uploadArea.addEventListener(event, () => {
            DOM.uploadArea.classList.remove('dragover');
        });
    });
    
    DOM.uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        if (e.dataTransfer.files.length > 0) {
            FileManager.addFiles(e.dataTransfer.files);
        }
    });
    
    // Clear Files
    DOM.clearFiles.addEventListener('click', () => FileManager.clearAll());
    
    // Actions
    DOM.startTranslation.addEventListener('click', () => TranslationController.start());
    DOM.stopTranslation.addEventListener('click', () => TranslationController.stop());
    DOM.downloadAll.addEventListener('click', () => TranslationController.downloadAll());
    
    // Log
    DOM.clearLog.addEventListener('click', () => Logger.clear());
    DOM.autoScrollLog.addEventListener('click', () => {
        AppState.autoScroll = !AppState.autoScroll;
        DOM.autoScrollLog.style.opacity = AppState.autoScroll ? '1' : '0.5';
        Toast.info('Auto-scroll', AppState.autoScroll ? 'Đã bật' : 'Đã tắt');
    });
    
    // Toast Close
    DOM.toast.querySelector('.toast-close').addEventListener('click', () => {
        DOM.toast.classList.remove('show');
    });
}

// ===== Initialization =====
function init() {
    // Detect mobile
    AppState.isMobile = Utils.detectMobile();
    if (AppState.isMobile) {
        DOM.mobileNotice.style.display = 'flex';
        setTimeout(() => {
            DOM.mobileNotice.style.display = 'none';
        }, 3000);
    }
    
    Logger.info('🚀 Khởi động RPG Maker Translator v2.0...');
    
    // Load saved data
    const savedApiKey = Utils.loadFromStorage('apiKey', '');
    const savedConfig = Utils.loadFromStorage('config', AppState.config);
    
    if (savedApiKey) {
        AppState.apiKey = savedApiKey;
        DOM.apiKey.value = savedApiKey;
    }
    
    if (savedConfig) {
        AppState.config = { ...AppState.config, ...savedConfig };
        Object.keys(savedConfig).forEach(key => {
            if (DOM[key]) {
                if (DOM[key].type === 'checkbox') {
                    DOM[key].checked = savedConfig[key];
                } else {
                    DOM[key].value = savedConfig[key];
                }
            }
        });
        DOM.batchSizeValue.textContent = savedConfig.batchSize || 10;
    }
    
    initEventListeners();
    FileManager.updateUI();
    
    Logger.success('✅ Sẵn sàng! Thêm file và bắt đầu dịch.');
    Toast.success('Khởi động', 'Tool đã sẵn sàng!');
    
    // Mobile specific
    if (AppState.isMobile) {
        Logger.info('📱 Chế độ Mobile đã được tối ưu');
    }
}

// Start
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}