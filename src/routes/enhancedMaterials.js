// 增强材料路由 - 支持大文件处理和智能分析
const express = require('express');
const path = require('path');
const fs = require('fs');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const Database = require('../database/database');
const ErrorHandler = require('../utils/errorHandler');
const SecurityUtils = require('../utils/security');
const DocumentProcessor = require('../services/documentProcessor');
const AIService = require('../services/aiService');

const router = express.Router();

// 初始化服务
const documentProcessor = new DocumentProcessor();
const aiService = new AIService();

// 处理任务存储
const processingTasks = new Map();

/**
 * 增强文件上传端点
 */
router.post('/upload-enhanced', ErrorHandler.asyncWrapper(async (req, res) => {
    if (!req.file) {
        return ErrorHandler.sendError(res, 400, '没有上传文件');
    }

    const file = req.file;
    const userId = 1; // 本地测试使用固定用户ID
    const analysis = req.body.analysis ? JSON.parse(req.body.analysis) : {};
    const metadata = req.body.metadata ? JSON.parse(req.body.metadata) : {};
    const requiresChunking = req.body.requiresChunking === 'true';
    const chunkSize = parseInt(req.body.chunkSize) || 1000;

    console.log(`📁 增强上传: ${file.originalname}, 大小: ${file.size}, 需要分块: ${requiresChunking}`);

    // 验证文件
    const validation = validateEnhancedFile(file, analysis);
    if (!validation.valid) {
        // 删除已上传的文件
        if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
        }
        return ErrorHandler.sendError(res, 400, validation.reason);
    }

    try {
        // 生成任务ID
        const taskId = generateTaskId();
        
        // 保存文件信息到数据库
        const result = await Database.insert(
            `INSERT INTO materials (user_id, filename, original_name, file_type, file_size, file_path, 
                                   requires_chunking, chunk_size, processing_status, task_id, analysis_data) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                userId,
                file.filename,
                SecurityUtils.sanitizeInput(file.originalname),
                path.extname(file.originalname).substring(1).toLowerCase(),
                file.size,
                file.path,
                requiresChunking ? 1 : 0,
                chunkSize,
                'pending',
                taskId,
                JSON.stringify({ analysis, metadata })
            ]
        );

        // 创建处理任务
        const task = {
            id: taskId,
            materialId: result.id,
            status: 'pending',
            progress: 0,
            stage: 'queued',
            startTime: new Date(),
            file: file,
            analysis: analysis,
            metadata: metadata,
            requiresChunking: requiresChunking,
            chunkSize: chunkSize
        };

        processingTasks.set(taskId, task);

        // 异步开始处理
        processEnhancedFile(task).catch(error => {
            console.error(`任务 ${taskId} 处理失败:`, error);
            task.status = 'failed';
            task.error = error.message;
        });

        return ErrorHandler.sendSuccess(res, {
            taskId: taskId,
            materialId: result.id,
            filename: file.originalname,
            size: file.size,
            type: path.extname(file.originalname).substring(1).toLowerCase(),
            requiresChunking: requiresChunking,
            estimatedTime: analysis.estimatedProcessingTime || 30
        }, '文件上传成功，开始智能处理');

    } catch (error) {
        // 删除已上传的文件
        if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
        }
        return ErrorHandler.handleDatabaseError(error, res);
    }
}));

/**
 * 获取处理状态
 */
router.get('/processing-status/:taskId', ErrorHandler.asyncWrapper(async (req, res) => {
    const taskId = req.params.taskId;
    const task = processingTasks.get(taskId);

    if (!task) {
        return ErrorHandler.sendError(res, 404, '任务不存在');
    }

    const response = {
        taskId: taskId,
        status: task.status,
        progress: task.progress,
        stage: task.stage,
        completed: task.status === 'completed',
        error: task.error || null
    };

    if (task.status === 'completed') {
        response.result = task.result;
    }

    return ErrorHandler.sendSuccess(res, response);
}));

/**
 * 获取增强材料列表
 */
router.get('/list-enhanced', ErrorHandler.asyncWrapper(async (req, res) => {
    const userId = 1; // 本地测试使用固定用户ID
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    console.log(`📋 获取增强材料列表: 页码=${page}, 限制=${limit}`);

    // 获取材料总数
    const countResult = await Database.query(
        'SELECT COUNT(*) as total FROM materials WHERE user_id = ?',
        [userId]
    );
    const total = countResult[0].total;

    // 获取材料列表
    const materials = await Database.query(
        `SELECT id, original_name, file_type, file_size, processed, processing_status, 
                requires_chunking, chunk_size, task_id, analysis_data, created_at,
                (SELECT COUNT(*) FROM quiz_sessions WHERE material_id = materials.id) as quiz_count
         FROM materials 
         WHERE user_id = ? 
         ORDER BY created_at DESC 
         LIMIT ? OFFSET ?`,
        [userId, limit, offset]
    );

    const enhancedMaterials = materials.map(material => {
        let analysisData = {};
        try {
            analysisData = material.analysis_data ? JSON.parse(material.analysis_data) : {};
        } catch (e) {
            console.warn(`解析材料 ${material.id} 的分析数据失败:`, e);
        }

        return {
            id: material.id,
            name: material.original_name,
            type: material.file_type,
            size: formatFileSize(material.file_size),
            sizeBytes: material.file_size,
            uploadTime: formatDate(material.created_at),
            processed: material.processed === 1,
            processingStatus: material.processing_status,
            requiresChunking: material.requires_chunking === 1,
            chunkSize: material.chunk_size,
            taskId: material.task_id,
            quizCount: material.quiz_count,
            isLargeFile: material.file_size > 5 * 1024 * 1024,
            analysis: {
                complexity: analysisData.analysis?.complexity || 'unknown',
                estimatedProcessingTime: analysisData.analysis?.estimatedProcessingTime || 0,
                isLargeFile: analysisData.analysis?.isLargeFile || false
            }
        };
    });

    return ErrorHandler.sendSuccess(res, {
        materials: enhancedMaterials,
        pagination: {
            page: page,
            limit: limit,
            total: total,
            pages: Math.ceil(total / limit)
        }
    }, '获取增强材料列表成功');
}));

/**
 * 获取材料详细信息
 */
router.get('/details/:id', ErrorHandler.asyncWrapper(async (req, res) => {
    const materialId = req.params.id;
    const userId = 1;

    const material = await Database.query(
        `SELECT * FROM materials WHERE id = ? AND user_id = ?`,
        [materialId, userId]
    );

    if (material.length === 0) {
        return ErrorHandler.sendError(res, 404, '材料不存在');
    }

    const materialData = material[0];
    let analysisData = {};
    let processedContent = null;

    try {
        analysisData = materialData.analysis_data ? JSON.parse(materialData.analysis_data) : {};
    } catch (e) {
        console.warn(`解析材料 ${materialId} 的分析数据失败:`, e);
    }

    // 获取处理后的内容
    if (materialData.processed === 1) {
        try {
            const contentResult = await Database.query(
                'SELECT content_preview, chunk_count, key_terms FROM material_content WHERE material_id = ?',
                [materialId]
            );
            if (contentResult.length > 0) {
                processedContent = contentResult[0];
            }
        } catch (e) {
            console.warn(`获取材料 ${materialId} 的处理内容失败:`, e);
        }
    }

    const detailedMaterial = {
        id: materialData.id,
        name: materialData.original_name,
        filename: materialData.filename,
        type: materialData.file_type,
        size: formatFileSize(materialData.file_size),
        sizeBytes: materialData.file_size,
        uploadTime: formatDate(materialData.created_at),
        processed: materialData.processed === 1,
        processingStatus: materialData.processing_status,
        requiresChunking: materialData.requires_chunking === 1,
        chunkSize: materialData.chunk_size,
        taskId: materialData.task_id,
        analysis: analysisData.analysis || {},
        metadata: analysisData.metadata || {},
        processedContent: processedContent
    };

    return ErrorHandler.sendSuccess(res, detailedMaterial, '获取材料详情成功');
}));

/**
 * 重新处理材料
 */
router.post('/reprocess/:id', ErrorHandler.asyncWrapper(async (req, res) => {
    const materialId = req.params.id;
    const userId = 1;
    const options = req.body || {};

    // 检查材料是否存在
    const material = await Database.query(
        'SELECT * FROM materials WHERE id = ? AND user_id = ?',
        [materialId, userId]
    );

    if (material.length === 0) {
        return ErrorHandler.sendError(res, 404, '材料不存在');
    }

    const materialData = material[0];

    // 检查文件是否存在
    if (!fs.existsSync(materialData.file_path)) {
        return ErrorHandler.sendError(res, 400, '原文件不存在，无法重新处理');
    }

    try {
        // 生成新的任务ID
        const taskId = generateTaskId();

        // 更新材料状态
        await Database.update(
            'UPDATE materials SET processing_status = ?, task_id = ? WHERE id = ?',
            ['pending', taskId, materialId]
        );

        // 创建重新处理任务
        const task = {
            id: taskId,
            materialId: materialId,
            status: 'pending',
            progress: 0,
            stage: 'queued',
            startTime: new Date(),
            file: {
                path: materialData.file_path,
                originalname: materialData.original_name,
                size: materialData.file_size,
                mimetype: getMimeTypeFromExtension(materialData.file_type)
            },
            requiresChunking: materialData.requires_chunking === 1,
            chunkSize: options.chunkSize || materialData.chunk_size || 1000,
            reprocessing: true,
            options: options
        };

        processingTasks.set(taskId, task);

        // 异步开始重新处理
        processEnhancedFile(task).catch(error => {
            console.error(`重新处理任务 ${taskId} 失败:`, error);
            task.status = 'failed';
            task.error = error.message;
        });

        return ErrorHandler.sendSuccess(res, {
            taskId: taskId,
            materialId: materialId,
            message: '开始重新处理材料'
        });

    } catch (error) {
        return ErrorHandler.handleDatabaseError(error, res);
    }
}));

/**
 * 批量删除材料
 */
router.delete('/batch', ErrorHandler.asyncWrapper(async (req, res) => {
    const { ids } = req.body;
    const userId = 1;

    if (!Array.isArray(ids) || ids.length === 0) {
        return ErrorHandler.sendError(res, 400, '请提供要删除的材料ID列表');
    }

    console.log(`🗑️ 批量删除材料: ${ids.join(', ')}`);

    const deletedCount = await deleteMaterialsBatch(ids, userId);

    return ErrorHandler.sendSuccess(res, {
        deletedCount: deletedCount,
        requestedCount: ids.length
    }, `成功删除 ${deletedCount} 个材料`);
}));

/**
 * 处理增强文件
 */
async function processEnhancedFile(task) {
    try {
        console.log(`🚀 开始处理任务: ${task.id}`);
        
        // 更新任务状态
        task.status = 'processing';
        task.stage = 'extracting_content';
        task.progress = 10;

        // 第一步：提取文件内容
        const content = await extractFileContent(task.file);
        task.progress = 30;

        // 第二步：智能文档处理
        task.stage = 'analyzing_document';
        const processedDoc = await documentProcessor.processDocument(content, {
            maxChunkSize: task.chunkSize,
            overlapSize: Math.floor(task.chunkSize * 0.2),
            enableKnowledgeGraph: true,
            analysisDepth: 'comprehensive'
        });
        task.progress = 60;

        // 第三步：保存处理结果
        task.stage = 'saving_results';
        await saveProcessedContent(task.materialId, processedDoc, content);
        task.progress = 80;

        // 第四步：更新数据库状态
        task.stage = 'finalizing';
        await Database.update(
            'UPDATE materials SET processed = 1, processing_status = ? WHERE id = ?',
            ['completed', task.materialId]
        );
        task.progress = 100;

        // 完成任务
        task.status = 'completed';
        task.stage = 'completed';
        task.endTime = new Date();
        task.result = {
            chunks: processedDoc.chunks.length,
            keyTerms: processedDoc.globalMetadata.topKeyTerms.length,
            complexity: processedDoc.globalMetadata.averageComplexity,
            processingTime: task.endTime - task.startTime
        };

        console.log(`✅ 任务 ${task.id} 处理完成`);

    } catch (error) {
        console.error(`❌ 任务 ${task.id} 处理失败:`, error);
        task.status = 'failed';
        task.error = error.message;
        
        // 更新数据库状态
        try {
            await Database.update(
                'UPDATE materials SET processing_status = ? WHERE id = ?',
                ['failed', task.materialId]
            );
        } catch (dbError) {
            console.error('更新失败状态到数据库失败:', dbError);
        }
    }
}

/**
 * 提取文件内容
 */
async function extractFileContent(file) {
    const filePath = file.path;
    const mimeType = file.mimetype || getMimeTypeFromExtension(path.extname(file.originalname || filePath));

    console.log(`📄 提取文件内容: ${file.originalname || filePath}, 类型: ${mimeType}`);

    try {
        if (mimeType === 'application/pdf') {
            const dataBuffer = fs.readFileSync(filePath);
            const data = await pdfParse(dataBuffer);
            return data.text;
        } else if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
            const result = await mammoth.extractRawText({ path: filePath });
            return result.value;
        } else if (mimeType === 'application/msword') {
            // 对于老版本的Word文档，尝试使用mammoth
            try {
                const result = await mammoth.extractRawText({ path: filePath });
                return result.value;
            } catch (error) {
                console.warn('mammoth处理.doc文件失败，尝试读取为文本:', error);
                return fs.readFileSync(filePath, 'utf8');
            }
        } else {
            // 文本文件
            return fs.readFileSync(filePath, 'utf8');
        }
    } catch (error) {
        console.error('文件内容提取失败:', error);
        throw new Error(`文件内容提取失败: ${error.message}`);
    }
}

/**
 * 保存处理后的内容
 */
async function saveProcessedContent(materialId, processedDoc, originalContent) {
    try {
        // 准备内容预览（前500字符）
        const contentPreview = originalContent.substring(0, 500);
        
        // 准备关键词（前20个）
        const keyTerms = processedDoc.globalMetadata.topKeyTerms
            .slice(0, 20)
            .map(term => term.term)
            .join(', ');

        // 删除旧的处理内容
        await Database.query('DELETE FROM material_content WHERE material_id = ?', [materialId]);

        // 插入新的处理内容
        await Database.insert(
            `INSERT INTO material_content (material_id, content_preview, chunk_count, key_terms, 
                                         processed_data, created_at) 
             VALUES (?, ?, ?, ?, ?, datetime('now'))`,
            [
                materialId,
                contentPreview,
                processedDoc.chunks.length,
                keyTerms,
                JSON.stringify({
                    chunks: processedDoc.chunks.map(chunk => ({
                        index: chunk.index,
                        content: chunk.content.substring(0, 200), // 只保存前200字符
                        metadata: chunk.metadata
                    })),
                    globalMetadata: processedDoc.globalMetadata,
                    knowledgeGraph: {
                        nodeCount: processedDoc.knowledgeGraph.nodes.length,
                        edgeCount: processedDoc.knowledgeGraph.edges.length,
                        topNodes: processedDoc.knowledgeGraph.nodes.slice(0, 10)
                    },
                    importantSections: processedDoc.importantSections.slice(0, 5)
                })
            ]
        );

        console.log(`💾 材料 ${materialId} 的处理内容已保存`);
    } catch (error) {
        console.error('保存处理内容失败:', error);
        throw error;
    }
}

/**
 * 批量删除材料
 */
async function deleteMaterialsBatch(ids, userId) {
    let deletedCount = 0;

    for (const id of ids) {
        try {
            // 获取材料信息
            const material = await Database.query(
                'SELECT file_path FROM materials WHERE id = ? AND user_id = ?',
                [id, userId]
            );

            if (material.length > 0) {
                // 删除文件
                const filePath = material[0].file_path;
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }

                // 删除数据库记录
                await Database.query('DELETE FROM material_content WHERE material_id = ?', [id]);
                await Database.query('DELETE FROM quiz_sessions WHERE material_id = ?', [id]);
                await Database.query('DELETE FROM materials WHERE id = ? AND user_id = ?', [id, userId]);

                deletedCount++;
            }
        } catch (error) {
            console.error(`删除材料 ${id} 失败:`, error);
        }
    }

    return deletedCount;
}

/**
 * 验证增强文件
 */
function validateEnhancedFile(file, analysis) {
    // 基本验证
    if (!SecurityUtils.validateFileSize(file.size)) {
        return { valid: false, reason: '文件大小超过限制' };
    }

    // 大文件特殊验证
    if (analysis.isLargeFile && file.size > 50 * 1024 * 1024) {
        return { valid: false, reason: '大文件超过50MB限制' };
    }

    // 文件类型验证
    const allowedTypes = ['.txt', '.pdf', '.doc', '.docx', '.md', '.html'];
    const fileExt = path.extname(file.originalname).toLowerCase();
    if (!allowedTypes.includes(fileExt)) {
        return { valid: false, reason: `不支持的文件类型: ${fileExt}` };
    }

    return { valid: true };
}

/**
 * 生成任务ID
 */
function generateTaskId() {
    return 'task_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

/**
 * 根据扩展名获取MIME类型
 */
function getMimeTypeFromExtension(ext) {
    const mimeTypes = {
        '.txt': 'text/plain',
        '.pdf': 'application/pdf',
        '.doc': 'application/msword',
        '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        '.md': 'text/markdown',
        '.html': 'text/html'
    };
    return mimeTypes[ext.toLowerCase()] || 'text/plain';
}

/**
 * 格式化文件大小
 */
function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * 格式化日期
 */
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

module.exports = router;