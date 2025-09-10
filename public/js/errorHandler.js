// 前端错误处理和Ollama状态检查

class ErrorHandler {
    constructor() {
        this.init();
    }

    init() {
        // 创建错误提示容器
        this.createErrorContainer();
        
        // 定期检查Ollama服务状态
        this.checkOllamaStatus();
        setInterval(() => this.checkOllamaStatus(), 30000); // 每30秒检查一次
    }

    createErrorContainer() {
        // 如果已存在则不重复创建
        if (document.getElementById('error-container')) {
            return;
        }

        const container = document.createElement('div');
        container.id = 'error-container';
        container.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            max-width: 400px;
        `;
        document.body.appendChild(container);
    }

    showError(message, type = 'error', duration = 5000) {
        const container = document.getElementById('error-container');
        if (!container) return;

        const errorDiv = document.createElement('div');
        errorDiv.className = `alert alert-${type}`;
        
        // 根据错误类型设置样式和图标
        let icon = '❌';
        let bgColor = '#f8d7da';
        let borderColor = '#f5c6cb';
        let textColor = '#721c24';

        switch (type) {
            case 'warning':
                icon = '⚠️';
                bgColor = '#fff3cd';
                borderColor = '#ffeaa7';
                textColor = '#856404';
                break;
            case 'info':
                icon = 'ℹ️';
                bgColor = '#d1ecf1';
                borderColor = '#bee5eb';
                textColor = '#0c5460';
                break;
            case 'success':
                icon = '✅';
                bgColor = '#d4edda';
                borderColor = '#c3e6cb';
                textColor = '#155724';
                break;
        }

        errorDiv.style.cssText = `
            background-color: ${bgColor};
            border: 1px solid ${borderColor};
            color: ${textColor};
            padding: 12px 16px;
            margin-bottom: 10px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            display: flex;
            align-items: center;
            gap: 10px;
            animation: slideIn 0.3s ease-out;
            position: relative;
        `;

        errorDiv.innerHTML = `
            <span style="font-size: 18px;">${icon}</span>
            <div style="flex: 1;">
                <div style="font-weight: 500; margin-bottom: 4px;">
                    ${this.getErrorTitle(type)}
                </div>
                <div style="font-size: 14px; opacity: 0.9;">
                    ${message}
                </div>
            </div>
            <button onclick="this.parentElement.remove()" style="
                background: none;
                border: none;
                font-size: 18px;
                cursor: pointer;
                opacity: 0.7;
                padding: 0;
                width: 24px;
                height: 24px;
                display: flex;
                align-items: center;
                justify-content: center;
            ">×</button>
        `;

        // 添加CSS动画
        if (!document.getElementById('error-animations')) {
            const style = document.createElement('style');
            style.id = 'error-animations';
            style.textContent = `
                @keyframes slideIn {
                    from {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
                @keyframes slideOut {
                    from {
                        transform: translateX(0);
                        opacity: 1;
                    }
                    to {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                }
            `;
            document.head.appendChild(style);
        }

        container.appendChild(errorDiv);

        // 自动消失
        if (duration > 0) {
            setTimeout(() => {
                if (errorDiv.parentElement) {
                    errorDiv.style.animation = 'slideOut 0.3s ease-out';
                    setTimeout(() => {
                        if (errorDiv.parentElement) {
                            errorDiv.remove();
                        }
                    }, 300);
                }
            }, duration);
        }
    }

    getErrorTitle(type) {
        switch (type) {
            case 'error': return 'AI服务错误';
            case 'warning': return '注意';
            case 'info': return '提示';
            case 'success': return '成功';
            default: return '通知';
        }
    }

    async checkOllamaStatus() {
        try {
            const response = await fetch('/api/quiz/health-check');
            const data = await response.json();
            
            if (!data.success) {
                this.showOllamaError();
            } else {
                this.hideOllamaError();
            }
        } catch (error) {
            console.log('健康检查失败:', error);
            this.showOllamaError();
        }
    }

    showOllamaError() {
        // 避免重复显示
        if (document.getElementById('ollama-status-error')) {
            return;
        }

        const statusDiv = document.createElement('div');
        statusDiv.id = 'ollama-status-error';
        statusDiv.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            background: linear-gradient(135deg, #ff6b6b, #ee5a52);
            color: white;
            padding: 15px 20px;
            border-radius: 10px;
            box-shadow: 0 4px 20px rgba(255, 107, 107, 0.3);
            z-index: 9999;
            max-width: 350px;
            animation: slideIn 0.3s ease-out;
        `;

        statusDiv.innerHTML = `
            <div style="display: flex; align-items: center; gap: 12px;">
                <div style="
                    width: 12px;
                    height: 12px;
                    background: #fff;
                    border-radius: 50%;
                    animation: pulse 2s infinite;
                "></div>
                <div>
                    <div style="font-weight: 600; margin-bottom: 4px;">
                        🤖 AI服务离线
                    </div>
                    <div style="font-size: 13px; opacity: 0.9;">
                        Ollama服务未运行，题目生成功能不可用
                    </div>
                    <div style="font-size: 12px; margin-top: 8px; opacity: 0.8;">
                        请启动Ollama服务后刷新页面
                    </div>
                </div>
            </div>
        `;

        // 添加脉冲动画
        if (!document.getElementById('pulse-animation')) {
            const style = document.createElement('style');
            style.id = 'pulse-animation';
            style.textContent = `
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.5; }
                }
            `;
            document.head.appendChild(style);
        }

        document.body.appendChild(statusDiv);
    }

    hideOllamaError() {
        const statusDiv = document.getElementById('ollama-status-error');
        if (statusDiv) {
            statusDiv.style.animation = 'slideOut 0.3s ease-out';
            setTimeout(() => {
                if (statusDiv.parentElement) {
                    statusDiv.remove();
                }
            }, 300);
        }
    }

    handleQuizError(error) {
        console.error('题目生成错误:', error);
        
        let message = '题目生成失败，请稍后重试';
        let type = 'error';

        if (error.errorType) {
            switch (error.errorType) {
                case 'ollama_unavailable':
                case 'ollama_connection':
                    message = 'AI服务连接失败，请检查Ollama是否正常运行';
                    type = 'warning';
                    this.showOllamaError();
                    break;
                case 'timeout':
                    message = 'AI处理超时，请稍后重试或减少题目数量';
                    type = 'warning';
                    break;
                case 'model_error':
                    message = 'AI模型加载失败，请检查模型是否正确安装';
                    type = 'error';
                    break;
                case 'not_found':
                    message = '材料不存在，请重新上传文件';
                    type = 'warning';
                    break;
                case 'processing':
                    message = '材料还在处理中，请稍后重试';
                    type = 'info';
                    break;
            }
        }

        this.showError(message, type, 8000);
    }

    showSuccess(message) {
        this.showError(message, 'success', 3000);
    }

    showInfo(message) {
        this.showError(message, 'info', 4000);
    }

    showWarning(message) {
        this.showError(message, 'warning', 6000);
    }
}

// 全局错误处理器实例
window.errorHandler = new ErrorHandler();

// 扩展fetch函数以自动处理错误
const originalFetch = window.fetch;
window.fetch = async function(...args) {
    try {
        const response = await originalFetch.apply(this, args);
        
        // 如果是题目生成相关的API调用
        if (args[0].includes('/api/quiz/generate') && !response.ok) {
            const errorData = await response.json().catch(() => ({}));
            window.errorHandler.handleQuizError(errorData);
        }
        
        return response;
    } catch (error) {
        // 网络错误
        if (args[0].includes('/api/')) {
            window.errorHandler.showError('网络连接失败，请检查网络状态', 'error');
        }
        throw error;
    }
};

// 导出错误处理器
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ErrorHandler;
}