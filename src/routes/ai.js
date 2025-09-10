const express = require('express');
const router = express.Router();
const AIService = require('../services/aiService');
const ollamaService = require('../services/ollamaService');
const ExamPaperGenerator = require('../services/examPaperGenerator');

// 创建AI服务实例
const aiService = new AIService();
const examPaperGenerator = new ExamPaperGenerator();

// 检查AI服务状态
router.get('/status', async (req, res) => {
    try {
        const status = await aiService.checkServiceStatus();
        
        res.json({
            success: true,
            data: {
                ...status,
                timestamp: new Date().toISOString(),
                initialized: aiService.isInitialized
            }
        });
    } catch (error) {
        console.error('检查AI服务状态失败:', error);
        res.status(500).json({
            success: false,
            message: '检查AI服务状态失败',
            error: error.message
        });
    }
});

// 测试Ollama连接
router.post('/test-ollama', async (req, res) => {
    try {
        const testContent = "这是一个测试内容，用于验证Ollama服务是否正常工作。";
        
        const questions = await ollamaService.generateQuestions(testContent, {
            questionCount: 2,
            questionTypes: ['multiple-choice'],
            difficulty: 'easy'
        });
        
        res.json({
            success: true,
            message: 'Ollama服务测试成功',
            data: {
                questionsGenerated: questions.length,
                sampleQuestion: questions[0] || null,
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('Ollama测试失败:', error);
        res.status(500).json({
            success: false,
            message: 'Ollama服务测试失败',
            error: error.message,
            suggestions: [
                '请确保Ollama服务正在运行 (ollama serve)',
                '检查模型是否已下载 (ollama pull qwen2.5:7b)',
                '验证服务地址是否正确 (默认: http://localhost:11434)'
            ]
        });
    }
});

// 获取可用模型列表
router.get('/models', async (req, res) => {
    try {
        const status = await ollamaService.checkService();
        
        res.json({
            success: true,
            data: {
                available: status.available,
                models: status.models || [],
                currentModel: status.currentModel,
                modelExists: status.modelExists
            }
        });
    } catch (error) {
        console.error('获取模型列表失败:', error);
        res.status(500).json({
            success: false,
            message: '获取模型列表失败',
            error: error.message
        });
    }
});

// 生成题目（支持Ollama）
router.post('/generate-questions', async (req, res) => {
    try {
        const { content, questionType = 'mixed', count = 10, difficulty = 'medium' } = req.body;
        
        if (!content || content.trim().length < 10) {
            return res.status(400).json({
                success: false,
                message: '学习内容不能为空且长度至少为10个字符'
            });
        }
        
        console.log(`🎯 收到题目生成请求: 类型=${questionType}, 数量=${count}, 难度=${difficulty}`);
        
        const questions = await aiService.generateQuestionsFromContent(
            content, 
            questionType, 
            count, 
            difficulty === 'easy' ? 1 : difficulty === 'hard' ? 3 : 2
        );
        
        res.json({
            success: true,
            message: `成功生成${questions.length}道题目`,
            data: {
                questions,
                metadata: {
                    contentLength: content.length,
                    questionType,
                    count: questions.length,
                    difficulty,
                    generatedAt: new Date().toISOString()
                }
            }
        });
        
    } catch (error) {
        console.error('生成题目失败:', error);
        res.status(500).json({
            success: false,
            message: '生成题目失败',
            error: error.message
        });
    }
});

// 批改问答题
router.post('/grade-essay', async (req, res) => {
    try {
        const { question, userAnswer, referenceAnswer } = req.body;
        
        if (!question || !userAnswer) {
            return res.status(400).json({
                success: false,
                message: '题目和用户答案不能为空'
            });
        }
        
        const result = await ollamaService.gradeEssayQuestion(
            question, 
            userAnswer, 
            referenceAnswer
        );
        
        res.json({
            success: true,
            message: '批改完成',
            data: result
        });
        
    } catch (error) {
        console.error('批改问答题失败:', error);
        res.status(500).json({
            success: false,
            message: '批改失败',
            error: error.message
        });
    }
});

// DeepSeek智能题目生成端点
router.post('/generate-deepseek', async (req, res) => {
    try {
        const { 
            content, 
            questionType = 'mixed', 
            count = 10, 
            difficulty = 'medium',
            focusOnConcepts = true
        } = req.body;

        if (!content || content.trim().length === 0) {
            return res.status(400).json({
                success: false,
                message: '请提供文档内容'
            });
        }

        console.log(`🤖 收到DeepSeek题目生成请求: 类型=${questionType}, 数量=${count}, 难度=${difficulty}`);

        // 检查DeepSeek服务状态
        const ollamaStatus = await ollamaService.checkService();
        if (!ollamaStatus.available) {
            return res.status(503).json({
                success: false,
                message: 'DeepSeek服务不可用',
                error: ollamaStatus.error,
                suggestions: [
                    '请确保Ollama服务正在运行 (ollama serve)',
                    '检查DeepSeek模型是否已下载 (ollama pull deepseek-r1:7b)',
                    '验证服务地址是否正确'
                ]
            });
        }

        const difficultyLevel = difficulty === 'easy' ? 1 : difficulty === 'hard' ? 3 : 2;
        const options = {
            useDeepSeek: true,
            focusOnConcepts: focusOnConcepts,
            maxChunkSize: 1000,
            overlapSize: 200,
            enableKnowledgeGraph: true
        };

        const questions = await aiService.generateQuestionsFromContent(
            content, 
            questionType, 
            count, 
            difficultyLevel, 
            options
        );

        res.json({
            success: true,
            message: `DeepSeek成功生成${questions.length}道高质量题目`,
            data: {
                questions,
                metadata: {
                    contentLength: content.length,
                    questionType,
                    count: questions.length,
                    difficulty,
                    model: 'deepseek-r1:7b',
                    enhancedCount: questions.filter(q => q.enhanced || q.source === 'deepseek').length,
                    averageQuality: questions.reduce((sum, q) => sum + (q.qualityScore || 0.7), 0) / questions.length,
                    generatedAt: new Date().toISOString()
                }
            }
        });

    } catch (error) {
        console.error('DeepSeek题目生成失败:', error);
        res.status(500).json({
            success: false,
            message: 'DeepSeek题目生成失败',
            error: error.message,
            fallbackSuggestion: '可以尝试使用普通题目生成接口 /api/ai/generate-questions'
        });
    }
});

// 测试DeepSeek连接和生成能力
router.post('/test-deepseek', async (req, res) => {
    try {
        const testContent = `
人工智能（Artificial Intelligence，AI）是指由人制造出来的机器所表现出来的智能。
人工智能是计算机科学的一个分支，它企图了解智能的实质，并生产出一种新的能以人类智能相似的方式做出反应的智能机器。
机器学习是人工智能的一个重要分支，它使计算机能够在没有明确编程的情况下学习。
深度学习是机器学习的一个子集，它基于人工神经网络的结构和功能。
        `;
        
        console.log('🧪 开始DeepSeek功能测试...');
        
        const questions = await aiService.generateQuestionsFromContent(
            testContent, 
            'mixed', 
            3, 
            2,
            { useDeepSeek: true, focusOnConcepts: true }
        );
        
        res.json({
            success: true,
            message: 'DeepSeek测试成功',
            data: {
                questionsGenerated: questions.length,
                sampleQuestions: questions.slice(0, 2),
                testContent: testContent.substring(0, 100) + '...',
                timestamp: new Date().toISOString(),
                modelUsed: 'deepseek-r1:7b'
            }
        });
        
    } catch (error) {
        console.error('DeepSeek测试失败:', error);
        res.status(500).json({
            success: false,
            message: 'DeepSeek测试失败',
            error: error.message,
            suggestions: [
                '请确保Ollama服务正在运行',
                '检查DeepSeek模型是否已下载: ollama pull deepseek-r1:7b',
                '验证模型是否可以正常使用: ollama run deepseek-r1:7b'
            ]
        });
    }
});

// 生成完整套卷（10选择+10填空+5简答）
router.post('/generate-exam-paper', async (req, res) => {
    try {
        const { content, difficulty = 'medium', title = '智能生成试卷' } = req.body;
        
        if (!content || content.trim().length < 100) {
            return res.status(400).json({
                success: false,
                message: '文档内容不能为空且长度至少为100个字符'
            });
        }
        
        console.log(`📋 收到套卷生成请求: 难度=${difficulty}, 标题=${title}`);
        console.log(`📄 文档长度: ${content.length} 字符`);
        
        // 检查DeepSeek服务状态
        const ollamaStatus = await ollamaService.checkService();
        if (!ollamaStatus.available) {
            return res.status(503).json({
                success: false,
                message: 'DeepSeek服务不可用，无法生成高质量套卷',
                error: ollamaStatus.error,
                suggestions: [
                    '请确保Ollama服务正在运行 (ollama serve)',
                    '检查DeepSeek模型是否已下载 (ollama pull deepseek-r1:7b)',
                    '验证GPU加速是否正常工作'
                ]
            });
        }
        
        console.log('🚀 开始生成完整套卷...');
        const startTime = Date.now();
        
        const examPaper = await examPaperGenerator.generateExamPaper(content, {
            difficulty,
            title,
            includeAnswerKey: true,
            useGPUAcceleration: true,
            timeout: 90000 // 90秒超时
        });
        
        const generationTime = Date.now() - startTime;
        console.log(`✅ 套卷生成完成，耗时: ${generationTime}ms`);
        
        res.json({
            success: true,
            message: `成功生成完整套卷：${examPaper.questions.multipleChoice.length}道选择题 + ${examPaper.questions.fillInBlank.length}道填空题 + ${examPaper.questions.shortAnswer.length}道简答题`,
            data: {
                examPaper,
                metadata: {
                    contentLength: content.length,
                    difficulty,
                    totalQuestions: examPaper.questions.multipleChoice.length + 
                                  examPaper.questions.fillInBlank.length + 
                                  examPaper.questions.shortAnswer.length,
                    generationTime: `${(generationTime / 1000).toFixed(2)}秒`,
                    model: 'deepseek-r1:7b',
                    gpuAccelerated: true,
                    generatedAt: new Date().toISOString()
                }
            }
        });
        
    } catch (error) {
        console.error('套卷生成失败:', error);
        res.status(500).json({
            success: false,
            message: '套卷生成失败',
            error: error.message,
            suggestions: [
                '检查文档内容是否足够丰富',
                '确认DeepSeek模型运行正常',
                '可以尝试降低难度或减少内容长度'
            ]
        });
    }
});

// 测试套卷生成功能
router.post('/test-exam-paper', async (req, res) => {
    try {
        const testContent = `
人工智能基础知识

人工智能（Artificial Intelligence，AI）是指由人制造出来的机器所表现出来的智能。人工智能是计算机科学的一个分支，它企图了解智能的实质，并生产出一种新的能以人类智能相似的方式做出反应的智能机器。

机器学习是人工智能的一个重要分支，它使计算机能够在没有明确编程的情况下学习。机器学习算法通过分析大量数据来识别模式，并使用这些模式来对新数据进行预测或决策。

深度学习是机器学习的一个子集，它基于人工神经网络的结构和功能。深度学习网络由多个层组成，每一层都能学习数据的不同特征。这种分层的学习方式使得深度学习在图像识别、自然语言处理等领域取得了突破性进展。

自然语言处理（NLP）是人工智能的另一个重要应用领域，它致力于让计算机理解、解释和生成人类语言。NLP技术被广泛应用于机器翻译、情感分析、聊天机器人等场景。

计算机视觉是使计算机能够从数字图像或视频中获取高层次理解的技术。它包括图像识别、物体检测、人脸识别等多个子领域，在自动驾驶、医疗诊断、安防监控等方面有重要应用。
        `;
        
        console.log('🧪 开始套卷生成测试...');
        
        const examPaper = await examPaperGenerator.generateExamPaper(testContent, {
            difficulty: 'medium',
            title: '人工智能基础测试卷',
            includeAnswerKey: true
        });
        
        res.json({
            success: true,
            message: '套卷生成测试成功',
            data: {
                examPaper: {
                    ...examPaper,
                    // 只返回前2道题作为示例
                    questions: {
                        multipleChoice: examPaper.questions.multipleChoice.slice(0, 2),
                        fillInBlank: examPaper.questions.fillInBlank.slice(0, 2),
                        shortAnswer: examPaper.questions.shortAnswer.slice(0, 1)
                    }
                },
                fullStats: {
                    multipleChoiceCount: examPaper.questions.multipleChoice.length,
                    fillInBlankCount: examPaper.questions.fillInBlank.length,
                    shortAnswerCount: examPaper.questions.shortAnswer.length,
                    totalQuestions: examPaper.questions.multipleChoice.length + 
                                  examPaper.questions.fillInBlank.length + 
                                  examPaper.questions.shortAnswer.length
                },
                timestamp: new Date().toISOString()
            }
        });
        
    } catch (error) {
        console.error('套卷生成测试失败:', error);
        res.status(500).json({
            success: false,
            message: '套卷生成测试失败',
            error: error.message
        });
    }
});

module.exports = router;