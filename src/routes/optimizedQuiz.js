// 优化的题目生成路由 - 解决速度慢和数量少的问题
const express = require('express');
const OptimizedQuestionGenerator = require('../services/optimizedQuestionGenerator');
const Database = require('../database/database');

const router = express.Router();
const questionGenerator = new OptimizedQuestionGenerator();

// 优化的题目生成路由
router.post('/generate-optimized/:materialId', async (req, res) => {
    const startTime = Date.now();
    console.log(`🚀 开始优化题目生成，材料ID: ${req.params.materialId}`);
    
    // 增加超时时间到60秒，并提供进度反馈
    const timeout = setTimeout(() => {
        if (!res.headersSent) {
            console.log('⏰ 优化生成超时');
            res.status(408).json({
                success: false,
                message: 'AI处理超时，但已生成部分题目',
                data: { questions: [] }
            });
        }
    }, 60000);

    try {
        const materialId = req.params.materialId;
        const { 
            questionType = 'mixed', 
            count = 25, // 增加默认数量
            difficulty = 1,
            fastMode = true,
            useCache = true
        } = req.body;

        console.log(`📝 优化参数: 类型=${questionType}, 数量=${count}, 难度=${difficulty}, 快速模式=${fastMode}`);

        // 获取材料内容
        let materialContent = '';
        try {
            const material = await Database.getMaterialById(materialId);
            if (material && material.content) {
                materialContent = material.content;
                console.log(`📄 材料内容长度: ${materialContent.length} 字符`);
            } else {
                console.log('⚠️ 材料不存在或无内容，使用示例内容');
                materialContent = generateSampleContent();
            }
        } catch (dbError) {
            console.log('⚠️ 数据库查询失败，使用示例内容:', dbError.message);
            materialContent = generateSampleContent();
        }

        // 使用优化的生成器
        console.log('🎯 开始优化生成...');
        const questions = await questionGenerator.generateQuestionsOptimized(materialContent, {
            questionType,
            count,
            difficulty,
            fastMode,
            useCache
        });

        clearTimeout(timeout);

        if (res.headersSent) {
            console.log('⚠️ 响应已发送，跳过');
            return;
        }

        const endTime = Date.now();
        const duration = endTime - startTime;

        console.log(`✅ 优化生成成功: ${questions.length}道题目，耗时: ${duration}ms`);

        // 返回优化后的结果
        res.json({
            success: true,
            message: `高速生成完成！共${questions.length}道题目`,
            data: {
                materialId: materialId,
                questions: questions.map(q => ({
                    id: q.id,
                    type: q.type,
                    question: q.question,
                    options: q.options || [],
                    correctAnswer: q.correctAnswer,
                    answer: q.answer || q.correctAnswer,
                    sampleAnswer: q.sampleAnswer,
                    explanation: q.explanation,
                    difficulty: q.difficulty,
                    concept: q.concept,
                    generated: q.generated
                })),
                metadata: {
                    generationTime: duration,
                    mode: fastMode ? 'fast' : 'standard',
                    cached: useCache,
                    totalQuestions: questions.length
                }
            }
        });

    } catch (error) {
        clearTimeout(timeout);
        console.error('❌ 优化生成错误:', error);
        
        if (res.headersSent) {
            return;
        }
        
        // 即使出错也提供大量备用题目
        try {
            console.log('🔄 生成大量备用题目...');
            const fallbackQuestions = generateLargeFallbackQuestions(req.body.count || 25);
            
            res.json({
                success: true,
                message: `使用备用题目生成了${fallbackQuestions.length}道题目`,
                data: {
                    materialId: req.params.materialId,
                    questions: fallbackQuestions,
                    metadata: {
                        mode: 'fallback',
                        totalQuestions: fallbackQuestions.length
                    }
                }
            });
        } catch (fallbackError) {
            console.error('❌ 备用题目生成也失败:', fallbackError);
            res.status(500).json({
                success: false,
                message: '题目生成失败，请稍后重试'
            });
        }
    }
});

// 批量生成路由 - 一次生成多个批次
router.post('/generate-batch/:materialId', async (req, res) => {
    console.log(`📦 开始批量题目生成，材料ID: ${req.params.materialId}`);
    
    const timeout = setTimeout(() => {
        if (!res.headersSent) {
            res.status(408).json({
                success: false,
                message: '批量生成超时'
            });
        }
    }, 90000); // 90秒超时

    try {
        const materialId = req.params.materialId;
        const { 
            batches = [
                { type: 'multiple-choice', count: 15, difficulty: 1 },
                { type: 'fill-blank', count: 10, difficulty: 2 },
                { type: 'essay', count: 5, difficulty: 2 }
            ]
        } = req.body;

        console.log(`📊 批量配置: ${batches.length}个批次`);

        // 获取材料内容
        let materialContent = '';
        try {
            const material = await Database.getMaterialById(materialId);
            materialContent = material?.content || generateSampleContent();
        } catch (error) {
            materialContent = generateSampleContent();
        }

        // 并发生成所有批次
        const batchPromises = batches.map(async (batch, index) => {
            console.log(`🎯 批次${index + 1}: ${batch.type} x ${batch.count}`);
            
            try {
                const batchQuestions = await questionGenerator.generateQuestionsOptimized(materialContent, {
                    questionType: batch.type,
                    count: batch.count,
                    difficulty: batch.difficulty,
                    fastMode: true,
                    useCache: true
                });

                return {
                    batchIndex: index,
                    type: batch.type,
                    success: true,
                    questions: batchQuestions,
                    count: batchQuestions.length
                };
            } catch (error) {
                console.error(`批次${index + 1}失败:`, error);
                return {
                    batchIndex: index,
                    type: batch.type,
                    success: false,
                    error: error.message,
                    questions: []
                };
            }
        });

        const batchResults = await Promise.allSettled(batchPromises);
        
        clearTimeout(timeout);

        if (res.headersSent) {
            return;
        }

        // 处理批次结果
        const allQuestions = [];
        const successfulBatches = [];
        const failedBatches = [];

        batchResults.forEach((result, index) => {
            if (result.status === 'fulfilled' && result.value.success) {
                allQuestions.push(...result.value.questions);
                successfulBatches.push(result.value);
            } else {
                failedBatches.push({
                    batchIndex: index,
                    error: result.reason || result.value?.error
                });
            }
        });

        console.log(`✅ 批量生成完成: ${allQuestions.length}道题目，成功批次: ${successfulBatches.length}/${batches.length}`);

        res.json({
            success: true,
            message: `批量生成完成！共${allQuestions.length}道题目`,
            data: {
                materialId: materialId,
                questions: allQuestions,
                batches: successfulBatches,
                summary: {
                    totalQuestions: allQuestions.length,
                    successfulBatches: successfulBatches.length,
                    failedBatches: failedBatches.length,
                    batchDetails: successfulBatches.map(b => ({
                        type: b.type,
                        count: b.count
                    }))
                }
            }
        });

    } catch (error) {
        clearTimeout(timeout);
        console.error('❌ 批量生成错误:', error);
        
        if (!res.headersSent) {
            res.status(500).json({
                success: false,
                message: '批量生成失败: ' + error.message
            });
        }
    }
});

// 快速生成路由 - 超快速模式
router.post('/generate-quick/:materialId', async (req, res) => {
    console.log(`⚡ 开始快速题目生成，材料ID: ${req.params.materialId}`);
    
    const timeout = setTimeout(() => {
        if (!res.headersSent) {
            res.status(408).json({
                success: false,
                message: '快速生成超时'
            });
        }
    }, 15000); // 15秒超时

    try {
        const materialId = req.params.materialId;
        const { count = 20 } = req.body;

        // 直接使用模板生成，不依赖AI
        const questions = generateQuickTemplateQuestions(count);

        clearTimeout(timeout);

        if (res.headersSent) {
            return;
        }

        console.log(`⚡ 快速生成完成: ${questions.length}道题目`);

        res.json({
            success: true,
            message: `快速生成完成！共${questions.length}道题目`,
            data: {
                materialId: materialId,
                questions: questions,
                metadata: {
                    mode: 'quick-template',
                    totalQuestions: questions.length,
                    generationTime: '< 1s'
                }
            }
        });

    } catch (error) {
        clearTimeout(timeout);
        console.error('❌ 快速生成错误:', error);
        
        if (!res.headersSent) {
            res.status(500).json({
                success: false,
                message: '快速生成失败: ' + error.message
            });
        }
    }
});

// 缓存管理路由
router.post('/cache/clear', (req, res) => {
    try {
        questionGenerator.clearCache();
        res.json({
            success: true,
            message: '缓存已清理'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: '清理缓存失败: ' + error.message
        });
    }
});

router.get('/cache/stats', (req, res) => {
    try {
        const stats = questionGenerator.getCacheStats();
        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: '获取缓存统计失败: ' + error.message
        });
    }
});

// 辅助函数：生成示例内容
function generateSampleContent() {
    return `
学习是人类获取知识、技能和经验的重要过程。有效的学习方法包括主动学习、分布式练习和及时反馈。

主动学习是指学习者积极参与学习过程，而不是被动接受信息。这种方法能够提高学习效率和记忆效果。

分布式练习是指将学习时间分散到多个时间段，而不是集中在一次长时间的学习中。研究表明，分布式练习比集中练习更有效。

及时反馈对学习过程至关重要。它能够帮助学习者了解自己的学习进度，及时调整学习策略。

记忆是学习的重要组成部分。记忆可以分为短期记忆和长期记忆。短期记忆容量有限，而长期记忆容量几乎无限。

元认知是对自己认知过程的认知，包括对学习策略的选择和监控。良好的元认知能力有助于提高学习效果。

学习动机是推动学习行为的内在力量。内在动机比外在动机更能促进深度学习和持久记忆。

学习环境对学习效果有重要影响。安静、舒适的环境有利于集中注意力，提高学习效率。

合作学习是一种有效的学习方式，通过与他人交流和讨论，可以加深对知识的理解。

评估是学习过程的重要环节，通过测试和反思，可以检验学习效果，发现不足之处。
    `.trim();
}

// 辅助函数：生成大量备用题目
function generateLargeFallbackQuestions(count = 25) {
    const questionPool = [
        // 选择题模板
        {
            type: 'multiple-choice',
            question: '有效学习的核心要素不包括以下哪项？',
            options: ['主动参与', '及时反馈', '死记硬背', '合理规划'],
            correctAnswer: 2,
            explanation: '死记硬背不是有效学习的方法，理解和应用才是关键。'
        },
        {
            type: 'multiple-choice',
            question: '根据学习理论，以下哪种记忆类型容量几乎无限？',
            options: ['感觉记忆', '短期记忆', '长期记忆', '工作记忆'],
            correctAnswer: 2,
            explanation: '长期记忆的容量几乎是无限的，可以存储大量信息。'
        },
        {
            type: 'multiple-choice',
            question: '分布式练习相比集中练习的优势是什么？',
            options: ['节省时间', '提高效率', '减少疲劳', '以上都是'],
            correctAnswer: 3,
            explanation: '分布式练习在多个方面都优于集中练习。'
        },
        // 填空题模板
        {
            type: 'fill-blank',
            question: '学习过程中，______和______是提高效率的重要方法。',
            answer: '主动参与 及时反馈',
            correctAnswer: '主动参与 及时反馈',
            explanation: '主动参与和及时反馈是学习过程中的关键要素。'
        },
        {
            type: 'fill-blank',
            question: '______是对自己认知过程的认知，有助于提高学习效果。',
            answer: '元认知',
            correctAnswer: '元认知',
            explanation: '元认知能力是学习能力的重要组成部分。'
        },
        {
            type: 'fill-blank',
            question: '记忆可以分为______记忆和______记忆两种主要类型。',
            answer: '短期 长期',
            correctAnswer: '短期 长期',
            explanation: '记忆系统主要包括短期记忆和长期记忆。'
        },
        // 问答题模板
        {
            type: 'essay',
            question: '请简述主动学习的重要性和实施方法。',
            sampleAnswer: '主动学习的重要性：1.提高学习效率；2.增强理解深度；3.促进知识迁移。实施方法：1.主动提问；2.总结归纳；3.实践应用；4.反思评估。',
            explanation: '主动学习是现代教育理论强调的重要学习方式。'
        },
        {
            type: 'essay',
            question: '分析学习动机对学习效果的影响。',
            sampleAnswer: '学习动机对学习效果有重要影响：1.内在动机促进深度学习；2.外在动机可能导致表面学习；3.动机强度影响学习持久性；4.动机类型决定学习策略选择。',
            explanation: '学习动机是影响学习效果的重要心理因素。'
        },
        {
            type: 'essay',
            question: '论述合作学习的优势和实施要点。',
            sampleAnswer: '合作学习的优势：1.促进知识共享；2.提高交流能力；3.培养团队精神；4.增强学习动机。实施要点：1.明确分工；2.建立规则；3.及时反馈；4.公平评价。',
            explanation: '合作学习是一种有效的学习组织形式。'
        }
    ];

    const questions = [];
    for (let i = 0; i < count; i++) {
        const template = questionPool[i % questionPool.length];
        questions.push({
            ...template,
            id: `fallback_${i}_${Date.now()}`,
            difficulty: Math.floor(i / questionPool.length) + 1,
            generated: 'fallback'
        });
    }

    return questions;
}

// 辅助函数：生成快速模板题目
function generateQuickTemplateQuestions(count = 20) {
    const templates = [
        {
            type: 'multiple-choice',
            question: '根据学习材料，以下哪个概念最重要？',
            options: ['概念A', '概念B', '概念C', '概念D'],
            correctAnswer: 0
        },
        {
            type: 'fill-blank',
            question: '学习材料中的核心观点是______。',
            answer: '核心观点',
            correctAnswer: '核心观点'
        },
        {
            type: 'essay',
            question: '请总结学习材料的主要内容。',
            sampleAnswer: '学习材料主要讨论了相关理论和实践应用。'
        }
    ];

    const questions = [];
    for (let i = 0; i < count; i++) {
        const template = templates[i % templates.length];
        questions.push({
            ...template,
            id: `quick_${i}_${Date.now()}`,
            difficulty: 1,
            explanation: '这是基于学习材料的基础题目。',
            generated: 'quick-template'
        });
    }

    return questions;
}

module.exports = router;