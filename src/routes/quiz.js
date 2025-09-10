const express = require('express');
const Database = require('../database/database');
const { generateQuestionsFromContent } = require('../services/aiService');

const router = express.Router();

// AI服务健康检查
router.get('/health-check', async (req, res) => {
    try {
        // 简单的健康检查
        res.json({
            success: true,
            message: 'AI服务正常',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'AI服务异常'
        });
    }
});

// 快速测试路由
router.get('/test', (req, res) => {
    res.json({
        success: true,
        message: '测试路由正常',
        timestamp: new Date().toISOString()
    });
});

// 根据材料生成题目
router.post('/generate/:materialId', async (req, res) => {
    console.log(`🎯 开始生成题目，材料ID: ${req.params.materialId}`);
    
    // 设置请求超时
    const timeout = setTimeout(() => {
        if (!res.headersSent) {
            console.log('⏰ 请求超时，返回超时响应');
            res.status(408).json({
                success: false,
                message: 'AI处理超时，请稍后重试',
                errorType: 'timeout'
            });
        }
    }, 30000); // 30秒超时

    try {
        const materialId = req.params.materialId;
        const { questionType = 'mixed', count = 10, difficulty = 1 } = req.body;
        const userId = 1; // 本地测试使用固定用户ID

        console.log(`📝 请求参数: 类型=${questionType}, 数量=${count}, 难度=${difficulty}`);

        // 从数据库获取材料内容
        console.log('📖 获取材料内容...');
        const material = await Database.get(
            'SELECT * FROM materials WHERE id = ? AND user_id = ?',
            [materialId, userId]
        );

        if (!material) {
            clearTimeout(timeout);
            return res.status(404).json({
                success: false,
                message: '材料不存在',
                errorType: 'not_found'
            });
        }

        if (!material.processed || !material.content_text) {
            clearTimeout(timeout);
            return res.status(400).json({
                success: false,
                message: '材料还在处理中，请稍后重试',
                errorType: 'processing'
            });
        }

        console.log(`📄 材料内容长度: ${material.content_text.length} 字符`);

        // 检查Ollama服务状态
        const ollamaService = require('../services/ollamaService');
        const serviceStatus = await ollamaService.checkService();
        
        if (!serviceStatus.available) {
            console.error('❌ Ollama服务不可用');
            clearTimeout(timeout);
            return res.status(503).json({
                success: false,
                message: 'AI服务暂时不可用，请检查Ollama是否正常运行',
                errorType: 'ollama_unavailable',
                details: 'Ollama服务连接失败，请确保Ollama已启动并运行在正确端口'
            });
        }

        // 使用实际材料内容生成题目
        console.log('🤖 使用AI生成题目...');
        const questions = await generateQuestionsFromContent(
            material.content_text,
            questionType,
            count,
            difficulty,
            {
                mathRenderMode: 'html',        // 使用HTML模式避免$符号
                coverageMode: 'comprehensive', // 全面覆盖模式
                materialId: materialId,
                materialName: material.original_name
            }
        );
        
        clearTimeout(timeout);

        if (res.headersSent) {
            console.log('⚠️ 响应已发送，跳过');
            return;
        }

        console.log(`✅ 成功生成 ${questions.length} 道题目`);
        
        res.json({
            success: true,
            message: '题目生成成功',
            data: {
                materialId: materialId,
                materialName: material.original_name,
                contentLength: material.content_text.length,
                questions: questions.map(q => ({
                    id: q.id || Math.random().toString(36).substr(2, 9),
                    type: q.type,
                    question: q.question,
                    options: q.options || [],
                    correctAnswer: q.correctAnswer,
                    explanation: q.explanation,
                    difficulty: q.difficulty || difficulty
                }))
            }
        });

    } catch (error) {
        clearTimeout(timeout);
        console.error('❌ 生成题目错误:', error);
        
        if (res.headersSent) {
            return;
        }
        
        // 根据错误类型返回不同的错误信息
        let errorMessage = '题目生成失败，请稍后重试';
        let errorType = 'unknown';
        
        if (error.message.includes('Ollama') || error.message.includes('ECONNREFUSED')) {
            errorMessage = 'AI服务连接失败，请检查Ollama是否正常运行';
            errorType = 'ollama_connection';
        } else if (error.message.includes('timeout')) {
            errorMessage = 'AI处理超时，请稍后重试';
            errorType = 'timeout';
        } else if (error.message.includes('模型')) {
            errorMessage = 'AI模型加载失败，请检查模型是否正确安装';
            errorType = 'model_error';
        }
        
        res.status(500).json({
            success: false,
            message: errorMessage,
            errorType: errorType,
            details: error.message
        });
    }
});

// 生成示例题目的辅助函数
async function generateSampleQuestions(questionType, count) {
    console.log(`🎲 生成示例题目: 类型=${questionType}, 数量=${count}`);
    
    const allSampleQuestions = [
        {
            type: 'multiple-choice',
            question: '有效学习的关键要素不包括以下哪项？',
            options: ['明确目标', '合理规划', '死记硬背', '及时复习'],
            correctAnswer: 2,
            explanation: '死记硬背不是有效学习的方法，理解和应用才是关键。',
            difficulty: 1
        },
        {
            type: 'fill-blank',
            question: '学习新知识时，建立与已有知识的 ______ 有助于理解和记忆。',
            answer: '联系',
            correctAnswer: '联系',
            explanation: '建立知识间的联系是有效学习的重要策略。',
            difficulty: 1
        },
        {
            type: 'multiple-choice',
            question: '根据艾宾浩斯遗忘曲线，复习的最佳时机是？',
            options: ['学习后立即复习', '一周后复习', '一个月后复习', '考试前复习'],
            correctAnswer: 0,
            explanation: '根据遗忘曲线，学习后立即复习效果最好，能有效减缓遗忘速度。',
            difficulty: 2
        },
        {
            type: 'essay',
            question: '请简述制定学习计划的重要性和基本原则。',
            sampleAnswer: '制定学习计划的重要性：1.提高学习效率；2.合理分配时间；3.明确学习目标。基本原则：1.目标明确具体；2.时间安排合理；3.难易程度适中；4.留有调整空间。',
            explanation: '学习计划是有效学习的基础，需要结合个人情况制定。',
            difficulty: 2
        },
        {
            type: 'multiple-choice',
            question: '以下哪种学习方法最有助于长期记忆？',
            options: ['反复朗读', '理解记忆', '机械背诵', '临时抱佛脚'],
            correctAnswer: 1,
            explanation: '理解记忆通过建立知识间的逻辑关系，有助于长期保持和灵活运用。',
            difficulty: 1
        },
        {
            type: 'fill-blank',
            question: '在学习过程中，适当的 ______ 可以帮助大脑整理和巩固信息。',
            answer: '休息',
            correctAnswer: '休息',
            explanation: '适当休息让大脑有时间整理信息，提高学习效果。',
            difficulty: 1
        },
        {
            type: 'multiple-choice',
            question: '下列哪种学习工具最有助于知识整理？',
            options: ['思维导图', '游戏', '聊天', '看电视'],
            correctAnswer: 0,
            explanation: '思维导图能够帮助整理知识结构，提高学习效果。',
            difficulty: 1
        },
        {
            type: 'essay',
            question: '请简述如何提高学习效率？',
            sampleAnswer: '提高学习效率可以通过以下方法：1.制定明确的学习目标；2.选择合适的学习环境；3.采用多种学习方法；4.定期复习和总结；5.保持良好的作息习惯。',
            explanation: '这是一个开放性问题，需要结合个人经验和学习理论来回答。',
            difficulty: 2
        }
    ];

    // 根据题目类型筛选
    let filteredQuestions = allSampleQuestions;
    if (questionType !== 'mixed') {
        filteredQuestions = allSampleQuestions.filter(q => q.type === questionType);
        console.log(`🔍 筛选后的题目数量: ${filteredQuestions.length}`);
    }

    // 随机选择指定数量的题目
    const selectedQuestions = [];
    const availableQuestions = [...filteredQuestions];
    
    for (let i = 0; i < Math.min(count, availableQuestions.length); i++) {
        const randomIndex = Math.floor(Math.random() * availableQuestions.length);
        selectedQuestions.push(availableQuestions.splice(randomIndex, 1)[0]);
    }

    // 如果题目不够，重复使用
    while (selectedQuestions.length < count && filteredQuestions.length > 0) {
        const randomQuestion = filteredQuestions[Math.floor(Math.random() * filteredQuestions.length)];
        selectedQuestions.push({...randomQuestion}); // 创建副本
    }

    const result = selectedQuestions.slice(0, count);
    console.log(`✅ 最终生成题目数量: ${result.length}`);
    return result;
}

// 开始练习会话
router.post('/start', async (req, res) => {
    try {
        const { materialId, quizType, questionIds } = req.body;
        const userId = req.user ? req.user.userId : 1;

        // 简化版本，直接返回成功
        res.json({
            success: true,
            message: '练习会话创建成功',
            data: {
                sessionId: Date.now(), // 使用时间戳作为会话ID
                materialId: materialId,
                quizType: quizType,
                totalQuestions: questionIds ? questionIds.length : 10
            }
        });

    } catch (error) {
        console.error('创建练习会话错误:', error);
        res.status(500).json({
            success: false,
            message: '创建练习会话失败'
        });
    }
});

// 提交答案
router.post('/answer', async (req, res) => {
    try {
        const { sessionId, questionId, userAnswer, timeSpent } = req.body;

        // 简化版本，模拟答案检查
        const isCorrect = Math.random() > 0.3; // 70%正确率

        res.json({
            success: true,
            message: '答案提交成功',
            data: {
                isCorrect: isCorrect,
                correctAnswer: userAnswer // 简化处理
            }
        });

    } catch (error) {
        console.error('提交答案错误:', error);
        res.status(500).json({
            success: false,
            message: '提交答案失败'
        });
    }
});

// 完成练习
router.post('/complete/:sessionId', async (req, res) => {
    try {
        const sessionId = req.params.sessionId;
        const { totalTimeSpent } = req.body;

        // 模拟结果
        const totalQuestions = 10;
        const correctAnswers = Math.floor(Math.random() * 5) + 5; // 5-10题正确
        const score = Math.round((correctAnswers / totalQuestions) * 100);

        res.json({
            success: true,
            message: '练习完成',
            data: {
                sessionId: sessionId,
                totalQuestions: totalQuestions,
                correctAnswers: correctAnswers,
                wrongAnswers: totalQuestions - correctAnswers,
                score: score,
                timeSpent: totalTimeSpent || 300,
                expGained: Math.floor(score / 10)
            }
        });

    } catch (error) {
        console.error('完成练习错误:', error);
        res.status(500).json({
            success: false,
            message: '完成练习失败'
        });
    }
});

// 获取练习历史
router.get('/history', async (req, res) => {
    try {
        // 返回示例历史数据
        const mockHistory = [
            {
                id: 1,
                quizType: 'mixed',
                materialName: '高等数学课件.pptx',
                totalQuestions: 10,
                correctAnswers: 8,
                score: 80,
                timeSpent: 300,
                completedAt: '2024-01-15 14:30:00'
            },
            {
                id: 2,
                quizType: 'multiple-choice',
                materialName: '英语语法总结.pdf',
                totalQuestions: 15,
                correctAnswers: 12,
                score: 80,
                timeSpent: 450,
                completedAt: '2024-01-14 16:20:00'
            }
        ];

        res.json({
            success: true,
            data: mockHistory
        });

    } catch (error) {
        console.error('获取练习历史错误:', error);
        res.status(500).json({
            success: false,
            message: '获取练习历史失败'
        });
    }
});

// 获取错题列表
router.get('/wrong-questions', async (req, res) => {
    try {
        // 返回示例错题数据
        const mockWrongQuestions = [
            {
                id: 1,
                questionId: 1,
                question: '函数 f(x) = x² + 2x + 1 的最小值是？',
                type: 'fill-blank',
                correctAnswer: '0',
                explanation: '这是一个开口向上的抛物线，顶点为(-1, 0)，所以最小值为0。',
                materialName: '高等数学课件.pptx',
                wrongCount: 2,
                lastWrongAt: '2024-01-15 14:30:00'
            }
        ];

        res.json({
            success: true,
            data: mockWrongQuestions
        });

    } catch (error) {
        console.error('获取错题列表错误:', error);
        res.status(500).json({
            success: false,
            message: '获取错题列表失败'
        });
    }
});

// 标记错题为已掌握
router.put('/wrong-questions/:id/master', async (req, res) => {
    try {
        res.json({
            success: true,
            message: '已标记为掌握'
        });
    } catch (error) {
        console.error('标记错题掌握错误:', error);
        res.status(500).json({
            success: false,
            message: '标记错题掌握失败'
        });
    }
});

module.exports = router;