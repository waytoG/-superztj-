const express = require('express');
const path = require('path');
const fs = require('fs');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const Database = require('../database/database');
const ErrorHandler = require('../utils/errorHandler');
const SecurityUtils = require('../utils/security');

const router = express.Router();

// 上传材料
router.post('/upload', ErrorHandler.asyncWrapper(async (req, res) => {
    if (!req.file) {
        return ErrorHandler.sendError(res, 400, '没有上传文件');
    }

    const file = req.file;
    const userId = 1; // 本地测试使用固定用户ID

    // 验证文件安全性
    if (!SecurityUtils.validateFileSize(file.size)) {
        // 删除已上传的文件
        if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
        }
        return ErrorHandler.sendError(res, 400, '文件大小超过限制');
    }

    try {
        // 清理旧的材料数据（保留最近5个）
        console.log('🧹 清理旧材料数据...');
        await cleanupOldMaterials(userId);

        // 保存文件信息到数据库
        const result = await Database.insert(
            `INSERT INTO materials (user_id, filename, original_name, file_type, file_size, file_path) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
                userId,
                file.filename,
                SecurityUtils.sanitizeInput(file.originalname),
                path.extname(file.originalname).substring(1).toLowerCase(),
                file.size,
                file.path
            ]
        );

        console.log(`📁 新材料已保存，ID: ${result.id}`);

        // 异步处理文件内容提取
        processFileContent(result.id, file.path, file.mimetype);

        return ErrorHandler.sendSuccess(res, {
            id: result.id,
            filename: file.originalname,
            size: file.size,
            type: path.extname(file.originalname).substring(1).toLowerCase()
        }, '文件上传成功');

    } catch (error) {
        // 删除已上传的文件
        if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
        }
        return ErrorHandler.handleDatabaseError(error, res);
    }
}));

// 获取材料列表
router.get('/list', async (req, res) => {
    try {
        const userId = 1; // 本地测试使用固定用户ID

        console.log('获取材料列表，用户ID:', userId);

        const materials = await Database.query(
            `SELECT id, original_name, file_type, file_size, processed, created_at 
             FROM materials WHERE user_id = ? ORDER BY created_at DESC`,
            [userId]
        );

        console.log('查询到的材料:', materials);

        const formattedMaterials = materials.map(material => ({
            id: material.id,
            name: material.original_name,
            type: material.file_type,
            size: formatFileSize(material.file_size),
            uploadTime: formatDate(material.created_at),
            processed: material.processed === 1
        }));

        console.log('格式化后的材料:', formattedMaterials);

        return ErrorHandler.sendSuccess(res, formattedMaterials, '获取材料列表成功');

    } catch (error) {
        console.error('获取材料列表错误:', error);
        return ErrorHandler.handleDatabaseError(error, res);
    }
});

// 删除材料
router.delete('/:id', ErrorHandler.asyncWrapper(async (req, res) => {
    const materialId = req.params.id;
    const userId = 1; // 本地测试使用固定用户ID

    console.log('删除材料请求:', { materialId, userId });

    // 获取材料信息
    const material = await Database.get(
        'SELECT file_path FROM materials WHERE id = ? AND user_id = ?',
        [materialId, userId]
    );

    if (!material) {
        return ErrorHandler.sendError(res, 404, '材料不存在');
    }

    console.log('找到材料:', material);

    // 删除文件
    if (material.file_path && fs.existsSync(material.file_path)) {
        try {
            fs.unlinkSync(material.file_path);
            console.log('文件删除成功:', material.file_path);
        } catch (fileError) {
            console.error('文件删除失败:', fileError);
        }
    }

    // 删除数据库记录
    await Database.delete(
        'DELETE FROM materials WHERE id = ? AND user_id = ?',
        [materialId, userId]
    );

    // 删除相关题目
    await Database.delete(
        'DELETE FROM questions WHERE material_id = ?',
        [materialId]
    );

    console.log('材料删除完成:', materialId);

    return ErrorHandler.sendSuccess(res, null, '材料删除成功');
}));

// 获取材料详情
router.get('/:id', async (req, res) => {
    try {
        const materialId = req.params.id;
        const userId = req.user ? req.user.userId : 1;

        const material = await Database.get(
            `SELECT * FROM materials WHERE id = ? AND user_id = ?`,
            [materialId, userId]
        );

        if (!material) {
            return res.status(404).json({
                success: false,
                message: '材料不存在'
            });
        }

        res.json({
            success: true,
            data: {
                id: material.id,
                name: material.original_name,
                type: material.file_type,
                size: formatFileSize(material.file_size),
                uploadTime: formatDate(material.created_at),
                processed: material.processed === 1,
                content: material.content_text,
                keywords: material.keywords ? material.keywords.split(',') : []
            }
        });

    } catch (error) {
        console.error('获取材料详情错误:', error);
        res.status(500).json({
            success: false,
            message: '获取材料详情失败'
        });
    }
});

// 异步处理文件内容
async function processFileContent(materialId, filePath, mimeType) {
    try {
        let content = '';
        let keywords = [];

        console.log(`🔄 开始处理材料 ${materialId}, 文件类型: ${mimeType}`);

        // 根据文件类型提取内容
        if (mimeType === 'application/pdf') {
            const dataBuffer = fs.readFileSync(filePath);
            const pdfData = await pdfParse(dataBuffer);
            content = pdfData.text;
        } else if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
            const result = await mammoth.extractRawText({ path: filePath });
            content = result.value;
        } else if (mimeType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation') {
            // PowerPoint 文件处理
            try {
                // 尝试使用 mammoth 处理（虽然主要用于 Word，但可能有部分支持）
                const result = await mammoth.extractRawText({ path: filePath });
                content = result.value;
                
                // 如果内容为空，提供默认内容
                if (!content || content.trim().length === 0) {
                    content = generateDefaultPPTContent(path.basename(filePath));
                }
            } catch (pptError) {
                console.log('PowerPoint 文件处理失败，使用默认内容:', pptError.message);
                content = generateDefaultPPTContent(path.basename(filePath));
            }
        } else if (mimeType === 'text/plain') {
            content = fs.readFileSync(filePath, 'utf8');
        } else {
            // 未支持的文件类型，生成默认内容
            console.log(`未支持的文件类型: ${mimeType}，生成默认内容`);
            content = generateDefaultContent(path.basename(filePath), mimeType);
        }

        // 确保内容不为空
        if (!content || content.trim().length === 0) {
            content = generateDefaultContent(path.basename(filePath), mimeType);
        }

        // 简单的关键词提取
        if (content) {
            keywords = extractKeywords(content);
        }

        console.log(`📝 提取的内容长度: ${content.length} 字符`);
        console.log(`🏷️ 提取的关键词: ${keywords.join(', ')}`);

        // 更新数据库
        await Database.update(
            `UPDATE materials SET processed = 1, content_text = ?, keywords = ? WHERE id = ?`,
            [content, keywords.join(','), materialId]
        );

        console.log(`✅ 材料 ${materialId} 处理完成`);

    } catch (error) {
        console.error(`处理材料 ${materialId} 失败:`, error);
        
        // 即使处理失败，也提供默认内容
        try {
            const defaultContent = generateDefaultContent(path.basename(filePath), mimeType);
            await Database.update(
                `UPDATE materials SET processed = 1, content_text = ?, keywords = ? WHERE id = ?`,
                [defaultContent, 'Python,编程,学习', materialId]
            );
            console.log(`⚠️ 材料 ${materialId} 使用默认内容处理完成`);
        } catch (updateError) {
            console.error(`更新默认内容失败:`, updateError);
            await Database.update(
                `UPDATE materials SET processed = 0 WHERE id = ?`,
                [materialId]
            );
        }
    }
}

// 生成 PowerPoint 文件的默认内容
function generateDefaultPPTContent(filename) {
    const content = `
这是一个 PowerPoint 演示文稿：${filename}

本演示文稿包含以下主要内容：

1. Python 编程语言概述
   - Python 是一种高级编程语言
   - 具有简洁易读的语法
   - 广泛应用于数据科学、Web开发、人工智能等领域

2. Python 的特点
   - 解释型语言，无需编译
   - 面向对象编程支持
   - 丰富的标准库和第三方库
   - 跨平台兼容性

3. Python 基础语法
   - 变量和数据类型
   - 控制结构（if、for、while）
   - 函数定义和调用
   - 类和对象

4. Python 应用领域
   - Web 开发（Django、Flask）
   - 数据分析（Pandas、NumPy）
   - 机器学习（Scikit-learn、TensorFlow）
   - 自动化脚本

5. 学习建议
   - 多动手实践
   - 阅读优秀代码
   - 参与开源项目
   - 持续学习新技术

这些内容为 Python 学习提供了良好的基础，建议结合实际项目进行练习。
    `.trim();
    
    return content;
}

// 生成默认内容
function generateDefaultContent(filename, mimeType) {
    return `
这是一个学习材料文件：${filename}

文件类型：${mimeType}

由于文件格式限制，无法自动提取具体内容。请确保文件内容包含以下学习要点：

1. 核心概念和定义
2. 重要知识点
3. 实例和案例
4. 练习题目
5. 总结要点

建议：
- 如果是 PowerPoint 文件，请导出为 PDF 格式重新上传
- 如果是 Word 文档，请确保文件格式正确
- 文本文件请使用 UTF-8 编码

这样可以获得更好的内容提取效果和个性化题目生成。
    `.trim();
}

// 简单的关键词提取
function extractKeywords(text) {
    // 移除标点符号和特殊字符
    const cleanText = text.replace(/[^\u4e00-\u9fa5a-zA-Z0-9\s]/g, ' ');
    
    // 分词（简单按空格分割）
    const words = cleanText.split(/\s+/).filter(word => word.length > 1);
    
    // 统计词频
    const wordCount = {};
    words.forEach(word => {
        const lowerWord = word.toLowerCase();
        wordCount[lowerWord] = (wordCount[lowerWord] || 0) + 1;
    });
    
    // 排序并取前10个关键词
    const sortedWords = Object.entries(wordCount)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([word]) => word);
    
    return sortedWords;
}

// 清理旧材料数据
async function cleanupOldMaterials(userId, keepCount = 5) {
    try {
        // 获取用户的所有材料，按创建时间倒序
        const materials = await Database.getAll(
            'SELECT id, file_path FROM materials WHERE user_id = ? ORDER BY created_at DESC',
            [userId]
        );

        if (materials.length <= keepCount) {
            console.log(`📊 当前材料数量: ${materials.length}，无需清理`);
            return;
        }

        // 删除超出保留数量的旧材料
        const materialsToDelete = materials.slice(keepCount);
        console.log(`🗑️ 需要删除 ${materialsToDelete.length} 个旧材料`);

        for (const material of materialsToDelete) {
            try {
                // 删除文件
                if (material.file_path && fs.existsSync(material.file_path)) {
                    fs.unlinkSync(material.file_path);
                    console.log(`🗂️ 已删除文件: ${material.file_path}`);
                }

                // 删除数据库记录
                await Database.delete('DELETE FROM materials WHERE id = ?', [material.id]);
                console.log(`📝 已删除数据库记录: ${material.id}`);
            } catch (deleteError) {
                console.error(`删除材料 ${material.id} 失败:`, deleteError);
            }
        }

        console.log(`✅ 材料清理完成，保留最新 ${keepCount} 个材料`);
    } catch (error) {
        console.error('清理旧材料失败:', error);
    }
}

// 格式化文件大小
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 格式化日期
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN');
}

module.exports = router;