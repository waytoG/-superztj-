// 增强文件处理器 - 支持大文件和智能分析
class EnhancedFileHandler {
    constructor() {
        this.maxFileSize = 50 * 1024 * 1024; // 50MB
        this.supportedTypes = [
            'text/plain',
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'text/markdown',
            'text/html'
        ];
        this.processingTasks = new Map();
        this.initializeHandler();
    }

    /**
     * 初始化处理器
     */
    initializeHandler() {
        this.setupAdvancedUpload();
        this.setupProgressTracking();
        console.log('🚀 增强文件处理器初始化完成');
    }

    /**
     * 设置高级上传功能
     */
    setupAdvancedUpload() {
        const uploadZone = document.getElementById('uploadZone');
        const fileInput = document.getElementById('fileInput');
        
        if (!uploadZone || !fileInput) {
            console.warn('上传元素未找到，跳过高级上传设置');
            return;
        }

        // 增强拖拽功能
        uploadZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.stopPropagation();
            uploadZone.classList.add('dragover');
            this.showDropHint(e.dataTransfer.items);
        });

        uploadZone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!uploadZone.contains(e.relatedTarget)) {
                uploadZone.classList.remove('dragover');
                this.hideDropHint();
            }
        });

        uploadZone.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            uploadZone.classList.remove('dragover');
            this.hideDropHint();
            
            const files = Array.from(e.dataTransfer.files);
            this.handleMultipleFiles(files);
        });

        // 文件选择
        fileInput.addEventListener('change', (e) => {
            const files = Array.from(e.target.files);
            this.handleMultipleFiles(files);
        });

        // 粘贴支持
        document.addEventListener('paste', (e) => {
            const items = e.clipboardData.items;
            const files = [];
            
            for (let item of items) {
                if (item.kind === 'file') {
                    files.push(item.getAsFile());
                }
            }
            
            if (files.length > 0) {
                this.handleMultipleFiles(files);
            }
        });
    }

    /**
     * 设置进度跟踪
     */
    setupProgressTracking() {
        // 创建进度显示容器
        if (!document.getElementById('advancedProgressContainer')) {
            const progressContainer = document.createElement('div');
            progressContainer.id = 'advancedProgressContainer';
            progressContainer.className = 'advanced-progress-container';
            progressContainer.innerHTML = `
                <div class="progress-header">
                    <h4>文件处理进度</h4>
                    <button class="close-progress" onclick="this.parentElement.parentElement.style.display='none'">×</button>
                </div>
                <div class="progress-list" id="progressList"></div>
            `;
            document.body.appendChild(progressContainer);
        }
    }

    /**
     * 显示拖拽提示
     */
    showDropHint(items) {
        const hint = document.getElementById('dropHint') || this.createDropHint();
        const fileCount = items.length;
        const validFiles = Array.from(items).filter(item => 
            item.kind === 'file' && this.isValidFileType(item.type)
        ).length;

        hint.innerHTML = `
            <div class="drop-hint-content">
                <i class="fas fa-cloud-upload-alt"></i>
                <p>检测到 ${fileCount} 个文件，其中 ${validFiles} 个支持处理</p>
                <small>支持的格式：TXT, PDF, DOC, DOCX, MD, HTML</small>
            </div>
        `;
        hint.style.display = 'flex';
    }

    /**
     * 隐藏拖拽提示
     */
    hideDropHint() {
        const hint = document.getElementById('dropHint');
        if (hint) {
            hint.style.display = 'none';
        }
    }

    /**
     * 创建拖拽提示元素
     */
    createDropHint() {
        const hint = document.createElement('div');
        hint.id = 'dropHint';
        hint.className = 'drop-hint';
        document.body.appendChild(hint);
        return hint;
    }

    /**
     * 处理多个文件
     */
    async handleMultipleFiles(files) {
        console.log(`📁 开始处理 ${files.length} 个文件`);
        
        // 验证文件
        const validFiles = [];
        const invalidFiles = [];
        
        for (const file of files) {
            const validation = this.validateFile(file);
            if (validation.valid) {
                validFiles.push(file);
            } else {
                invalidFiles.push({ file, reason: validation.reason });
            }
        }

        // 显示无效文件警告
        if (invalidFiles.length > 0) {
            this.showInvalidFilesWarning(invalidFiles);
        }

        // 处理有效文件
        if (validFiles.length > 0) {
            await this.processValidFiles(validFiles);
        }
    }

    /**
     * 验证文件
     */
    validateFile(file) {
        // 检查文件大小
        if (file.size > this.maxFileSize) {
            return {
                valid: false,
                reason: `文件过大 (${this.formatFileSize(file.size)})，最大支持 ${this.formatFileSize(this.maxFileSize)}`
            };
        }

        // 检查文件类型
        if (!this.isValidFileType(file.type)) {
            return {
                valid: false,
                reason: `不支持的文件类型 (${file.type || '未知'})`
            };
        }

        // 检查文件名
        if (file.name.length > 255) {
            return {
                valid: false,
                reason: '文件名过长'
            };
        }

        return { valid: true };
    }

    /**
     * 检查文件类型是否有效
     */
    isValidFileType(type) {
        return this.supportedTypes.includes(type) || 
               type.startsWith('text/') ||
               !type; // 允许无类型（可能是文本文件）
    }

    /**
     * 显示无效文件警告
     */
    showInvalidFilesWarning(invalidFiles) {
        const warningHtml = invalidFiles.map(({ file, reason }) => 
            `<li><strong>${file.name}</strong>: ${reason}</li>`
        ).join('');

        showToast('warning', `
            <div>
                <p>以下文件无法处理：</p>
                <ul style="margin: 10px 0; padding-left: 20px;">
                    ${warningHtml}
                </ul>
            </div>
        `, 8000);
    }

    /**
     * 处理有效文件
     */
    async processValidFiles(files) {
        const progressContainer = document.getElementById('advancedProgressContainer');
        const progressList = document.getElementById('progressList');
        
        progressContainer.style.display = 'block';
        progressList.innerHTML = '';

        // 并发处理文件（限制并发数）
        const concurrencyLimit = 3;
        const results = [];
        
        for (let i = 0; i < files.length; i += concurrencyLimit) {
            const batch = files.slice(i, i + concurrencyLimit);
            const batchPromises = batch.map(file => this.processFile(file));
            const batchResults = await Promise.allSettled(batchPromises);
            results.push(...batchResults);
        }

        // 处理结果
        this.handleProcessingResults(results, files);
    }

    /**
     * 处理单个文件
     */
    async processFile(file) {
        const taskId = this.generateTaskId();
        const progressItem = this.createProgressItem(taskId, file);
        
        try {
            // 第一步：文件分析
            this.updateProgress(taskId, 10, '分析文件...');
            const fileAnalysis = await this.analyzeFile(file);
            
            // 第二步：内容提取
            this.updateProgress(taskId, 30, '提取内容...');
            const content = await this.extractFileContent(file);
            
            // 第三步：智能预处理
            this.updateProgress(taskId, 50, '智能预处理...');
            const preprocessed = await this.preprocessContent(content, fileAnalysis);
            
            // 第四步：上传到服务器
            this.updateProgress(taskId, 70, '上传到服务器...');
            const uploadResult = await this.uploadToServer(file, preprocessed);
            
            // 第五步：服务器端处理
            this.updateProgress(taskId, 90, '服务器处理中...');
            const processResult = await this.waitForServerProcessing(uploadResult.taskId);
            
            // 完成
            this.updateProgress(taskId, 100, '处理完成');
            this.markProgressComplete(taskId, true);
            
            return {
                success: true,
                file: file,
                result: processResult,
                analysis: fileAnalysis
            };
            
        } catch (error) {
            console.error(`文件 ${file.name} 处理失败:`, error);
            this.markProgressComplete(taskId, false, error.message);
            
            return {
                success: false,
                file: file,
                error: error.message
            };
        }
    }

    /**
     * 分析文件
     */
    async analyzeFile(file) {
        const analysis = {
            name: file.name,
            size: file.size,
            type: file.type,
            lastModified: new Date(file.lastModified),
            isLargeFile: file.size > 5 * 1024 * 1024, // 5MB
            estimatedProcessingTime: this.estimateProcessingTime(file.size),
            recommendedChunkSize: this.calculateChunkSize(file.size)
        };

        // 文件类型特定分析
        if (file.type === 'application/pdf') {
            analysis.requiresOCR = true;
            analysis.estimatedPages = Math.ceil(file.size / (50 * 1024)); // 估算页数
        }

        return analysis;
    }

    /**
     * 提取文件内容
     */
    async extractFileContent(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    let content = e.target.result;
                    
                    // 根据文件类型处理内容
                    if (file.type === 'application/pdf') {
                        // PDF需要服务器端处理
                        resolve({ type: 'pdf', data: content });
                    } else if (file.type.includes('word')) {
                        // Word文档需要服务器端处理
                        resolve({ type: 'word', data: content });
                    } else {
                        // 文本文件直接处理
                        resolve({ type: 'text', data: content });
                    }
                } catch (error) {
                    reject(new Error(`内容提取失败: ${error.message}`));
                }
            };
            
            reader.onerror = () => {
                reject(new Error('文件读取失败'));
            };
            
            // 根据文件类型选择读取方式
            if (file.type.startsWith('text/') || file.type === 'text/plain') {
                reader.readAsText(file, 'UTF-8');
            } else {
                reader.readAsArrayBuffer(file);
            }
        });
    }

    /**
     * 预处理内容
     */
    async preprocessContent(content, analysis) {
        const preprocessed = {
            originalContent: content,
            analysis: analysis,
            metadata: {
                processedAt: new Date().toISOString(),
                fileSize: analysis.size,
                isLargeFile: analysis.isLargeFile
            }
        };

        // 大文件预处理
        if (analysis.isLargeFile) {
            preprocessed.requiresChunking = true;
            preprocessed.chunkSize = analysis.recommendedChunkSize;
            preprocessed.estimatedChunks = Math.ceil(analysis.size / analysis.recommendedChunkSize);
        }

        return preprocessed;
    }

    /**
     * 上传到服务器
     */
    async uploadToServer(file, preprocessed) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('analysis', JSON.stringify(preprocessed.analysis));
        formData.append('metadata', JSON.stringify(preprocessed.metadata));
        
        if (preprocessed.requiresChunking) {
            formData.append('requiresChunking', 'true');
            formData.append('chunkSize', preprocessed.chunkSize.toString());
        }

        const response = await fetch('/api/materials/upload-enhanced', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`上传失败: ${response.status} ${errorText}`);
        }

        return await response.json();
    }

    /**
     * 等待服务器处理
     */
    async waitForServerProcessing(taskId, maxWaitTime = 300000) { // 5分钟超时
        const startTime = Date.now();
        const pollInterval = 2000; // 2秒轮询一次
        
        while (Date.now() - startTime < maxWaitTime) {
            try {
                const response = await fetch(`/api/materials/processing-status/${taskId}`);
                if (response.ok) {
                    const status = await response.json();
                    
                    if (status.completed) {
                        return status.result;
                    } else if (status.error) {
                        throw new Error(status.error);
                    }
                    
                    // 更新进度
                    if (status.progress !== undefined) {
                        const progressPercent = 90 + (status.progress * 0.1); // 90-100%
                        this.updateProgress(taskId, progressPercent, status.stage || '服务器处理中...');
                    }
                }
            } catch (error) {
                console.warn('轮询处理状态失败:', error);
            }
            
            await new Promise(resolve => setTimeout(resolve, pollInterval));
        }
        
        throw new Error('服务器处理超时');
    }

    /**
     * 创建进度项
     */
    createProgressItem(taskId, file) {
        const progressList = document.getElementById('progressList');
        const progressItem = document.createElement('div');
        progressItem.className = 'progress-item';
        progressItem.id = `progress-${taskId}`;
        
        progressItem.innerHTML = `
            <div class="progress-info">
                <div class="file-name">${file.name}</div>
                <div class="file-size">${this.formatFileSize(file.size)}</div>
            </div>
            <div class="progress-bar">
                <div class="progress-fill" id="fill-${taskId}"></div>
            </div>
            <div class="progress-status" id="status-${taskId}">准备中...</div>
            <div class="progress-percent" id="percent-${taskId}">0%</div>
        `;
        
        progressList.appendChild(progressItem);
        return progressItem;
    }

    /**
     * 更新进度
     */
    updateProgress(taskId, percent, status) {
        const fill = document.getElementById(`fill-${taskId}`);
        const statusEl = document.getElementById(`status-${taskId}`);
        const percentEl = document.getElementById(`percent-${taskId}`);
        
        if (fill) fill.style.width = `${percent}%`;
        if (statusEl) statusEl.textContent = status;
        if (percentEl) percentEl.textContent = `${Math.round(percent)}%`;
    }

    /**
     * 标记进度完成
     */
    markProgressComplete(taskId, success, errorMessage = null) {
        const progressItem = document.getElementById(`progress-${taskId}`);
        if (progressItem) {
            progressItem.classList.add(success ? 'success' : 'error');
            
            if (!success && errorMessage) {
                const statusEl = document.getElementById(`status-${taskId}`);
                if (statusEl) statusEl.textContent = `错误: ${errorMessage}`;
            }
        }
    }

    /**
     * 处理处理结果
     */
    handleProcessingResults(results, files) {
        const successful = results.filter(r => r.status === 'fulfilled' && r.value.success);
        const failed = results.filter(r => r.status === 'rejected' || !r.value.success);
        
        console.log(`📊 处理完成: ${successful.length} 成功, ${failed.length} 失败`);
        
        if (successful.length > 0) {
            showToast('success', `成功处理 ${successful.length} 个文件`);
            
            // 刷新材料列表
            if (typeof loadMaterials === 'function') {
                loadMaterials();
            }
        }
        
        if (failed.length > 0) {
            const failedNames = failed.map((r, i) => {
                const file = files[results.indexOf(r)];
                const error = r.status === 'rejected' ? r.reason : r.value.error;
                return `${file.name}: ${error}`;
            }).join('\n');
            
            showToast('error', `${failed.length} 个文件处理失败:\n${failedNames}`, 10000);
        }
        
        // 延迟隐藏进度容器
        setTimeout(() => {
            const progressContainer = document.getElementById('advancedProgressContainer');
            if (progressContainer) {
                progressContainer.style.display = 'none';
            }
        }, 3000);
    }

    /**
     * 生成任务ID
     */
    generateTaskId() {
        return 'task_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * 估算处理时间
     */
    estimateProcessingTime(fileSize) {
        // 基于文件大小估算处理时间（秒）
        const baseTime = 5; // 基础时间5秒
        const sizeTime = Math.ceil(fileSize / (1024 * 1024)) * 2; // 每MB增加2秒
        return Math.min(baseTime + sizeTime, 300); // 最大5分钟
    }

    /**
     * 计算块大小
     */
    calculateChunkSize(fileSize) {
        if (fileSize < 1024 * 1024) return 1000; // 小于1MB，1000字符
        if (fileSize < 5 * 1024 * 1024) return 1500; // 小于5MB，1500字符
        if (fileSize < 10 * 1024 * 1024) return 2000; // 小于10MB，2000字符
        return 2500; // 大文件，2500字符
    }

    /**
     * 格式化文件大小
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * 获取处理统计
     */
    getProcessingStats() {
        return {
            totalTasks: this.processingTasks.size,
            completedTasks: Array.from(this.processingTasks.values()).filter(t => t.completed).length,
            failedTasks: Array.from(this.processingTasks.values()).filter(t => t.failed).length,
            averageProcessingTime: this.calculateAverageProcessingTime()
        };
    }

    /**
     * 计算平均处理时间
     */
    calculateAverageProcessingTime() {
        const completedTasks = Array.from(this.processingTasks.values()).filter(t => t.completed);
        if (completedTasks.length === 0) return 0;
        
        const totalTime = completedTasks.reduce((sum, task) => sum + task.processingTime, 0);
        return Math.round(totalTime / completedTasks.length);
    }
}

// 全局实例
let enhancedFileHandler = null;

// 初始化增强文件处理器
document.addEventListener('DOMContentLoaded', function() {
    enhancedFileHandler = new EnhancedFileHandler();
    console.log('🚀 增强文件处理器已就绪');
});

// 导出给其他模块使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EnhancedFileHandler;
}