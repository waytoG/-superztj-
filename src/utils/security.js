const crypto = require('crypto');
const path = require('path');

// 安全工具类
class SecurityUtils {
    // 生成安全的随机字符串
    static generateSecureRandom(length = 32) {
        return crypto.randomBytes(length).toString('hex');
    }

    // 验证文件扩展名
    static validateFileExtension(filename, allowedExtensions = []) {
        const ext = path.extname(filename).toLowerCase();
        return allowedExtensions.includes(ext);
    }

    // 清理文件名，防止路径遍历攻击
    static sanitizeFilename(filename) {
        // 移除路径分隔符和特殊字符
        return filename.replace(/[^a-zA-Z0-9\u4e00-\u9fa5._-]/g, '_');
    }

    // 验证文件大小
    static validateFileSize(size, maxSize = 50 * 1024 * 1024) { // 默认50MB
        return size <= maxSize;
    }

    // 生成安全的文件名
    static generateSecureFilename(originalName) {
        const ext = path.extname(originalName);
        const baseName = path.basename(originalName, ext);
        const timestamp = Date.now();
        const random = this.generateSecureRandom(8);
        const safeName = this.sanitizeFilename(baseName);
        
        return `${safeName}_${timestamp}_${random}${ext}`;
    }

    // 验证MIME类型
    static validateMimeType(mimeType, allowedTypes = []) {
        return allowedTypes.includes(mimeType);
    }

    // 输入验证和清理
    static sanitizeInput(input, maxLength = 1000) {
        if (typeof input !== 'string') {
            return '';
        }
        
        return input
            .trim()
            .substring(0, maxLength)
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // 移除script标签
            .replace(/javascript:/gi, '') // 移除javascript协议
            .replace(/on\w+\s*=/gi, ''); // 移除事件处理器
    }

    // 验证邮箱格式
    static validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    // 验证密码强度
    static validatePassword(password) {
        // 至少8位，包含大小写字母、数字
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
        return passwordRegex.test(password);
    }

    // 生成CSRF令牌
    static generateCSRFToken() {
        return this.generateSecureRandom(32);
    }

    // 验证CSRF令牌
    static validateCSRFToken(token, sessionToken) {
        return token === sessionToken;
    }

    // 限制请求频率的简单实现
    static createRateLimiter(maxRequests = 100, windowMs = 15 * 60 * 1000) {
        const requests = new Map();
        
        return (req, res, next) => {
            const clientId = req.ip || req.connection.remoteAddress;
            const now = Date.now();
            const windowStart = now - windowMs;
            
            // 清理过期记录
            if (requests.has(clientId)) {
                const clientRequests = requests.get(clientId).filter(time => time > windowStart);
                requests.set(clientId, clientRequests);
            }
            
            const clientRequests = requests.get(clientId) || [];
            
            if (clientRequests.length >= maxRequests) {
                return res.status(429).json({
                    success: false,
                    message: '请求过于频繁，请稍后再试'
                });
            }
            
            clientRequests.push(now);
            requests.set(clientId, clientRequests);
            
            next();
        };
    }
}

module.exports = SecurityUtils;