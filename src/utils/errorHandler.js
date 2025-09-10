// 错误处理工具类
class ErrorHandler {
    // 标准化错误响应
    static sendError(res, statusCode, message, details = null) {
        const response = {
            success: false,
            message: message,
            timestamp: new Date().toISOString()
        };

        if (details && process.env.NODE_ENV === 'development') {
            response.details = details;
        }

        return res.status(statusCode).json(response);
    }

    // 成功响应
    static sendSuccess(res, data = null, message = '操作成功') {
        const response = {
            success: true,
            message: message,
            timestamp: new Date().toISOString()
        };

        if (data !== null) {
            response.data = data;
        }

        return res.json(response);
    }

    // 数据库错误处理
    static handleDatabaseError(error, res) {
        console.error('数据库错误:', error);
        
        if (error.code === 'SQLITE_CONSTRAINT') {
            return this.sendError(res, 400, '数据约束冲突，请检查输入数据');
        }
        
        if (error.code === 'SQLITE_BUSY') {
            return this.sendError(res, 503, '数据库繁忙，请稍后重试');
        }
        
        return this.sendError(res, 500, '数据库操作失败');
    }

    // 文件上传错误处理
    static handleFileUploadError(error, res) {
        console.error('文件上传错误:', error);
        
        if (error.code === 'LIMIT_FILE_SIZE') {
            return this.sendError(res, 400, '文件大小超过限制（最大50MB）');
        }
        
        if (error.code === 'LIMIT_FILE_COUNT') {
            return this.sendError(res, 400, '文件数量超过限制');
        }
        
        if (error.message.includes('不支持的文件类型')) {
            return this.sendError(res, 400, '不支持的文件类型，请上传PDF、Word、PPT、图片或文本文件');
        }
        
        return this.sendError(res, 500, '文件上传失败');
    }

    // AI服务错误处理
    static handleAIServiceError(error, res) {
        console.error('AI服务错误:', error);
        
        if (error.message.includes('超时')) {
            return this.sendError(res, 408, 'AI处理超时，请稍后重试');
        }
        
        if (error.message.includes('模型')) {
            return this.sendError(res, 503, 'AI模型暂时不可用');
        }
        
        return this.sendError(res, 500, 'AI服务异常，已切换到备用模式');
    }

    // 认证错误处理
    static handleAuthError(error, res) {
        console.error('认证错误:', error);
        
        if (error.name === 'JsonWebTokenError') {
            return this.sendError(res, 401, '无效的访问令牌');
        }
        
        if (error.name === 'TokenExpiredError') {
            return this.sendError(res, 401, '访问令牌已过期，请重新登录');
        }
        
        return this.sendError(res, 401, '认证失败');
    }

    // 通用异步错误包装器
    static asyncWrapper(fn) {
        return (req, res, next) => {
            Promise.resolve(fn(req, res, next)).catch(next);
        };
    }

    // 全局错误处理中间件
    static globalErrorHandler(error, req, res, next) {
        console.error('全局错误:', error);

        // 如果响应已经发送，交给默认错误处理器
        if (res.headersSent) {
            return next(error);
        }

        // 根据错误类型处理
        if (error.name === 'ValidationError') {
            return this.sendError(res, 400, '输入数据验证失败', error.message);
        }

        if (error.name === 'CastError') {
            return this.sendError(res, 400, '无效的数据格式');
        }

        if (error.code === 11000) {
            return this.sendError(res, 400, '数据重复');
        }

        // 默认服务器错误
        return this.sendError(res, 500, '服务器内部错误');
    }
}

module.exports = ErrorHandler;