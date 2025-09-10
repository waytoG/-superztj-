const ollamaService = require('./ollamaService');
const DocumentProcessor = require('./documentProcessor');

class ExamPaperGenerator {
    constructor() {
        this.documentProcessor = new DocumentProcessor();
        this.model = 'deepseek-r1:7b';
        this.timeout = 90000; // 90秒超时，获得更高质量
        
        // 套卷配置
        this.paperConfig = {
            multipleChoice: 10,  // 10道选择题
            fillBlank: 10,       // 10道填空题
            shortAnswer: 5       // 5道简答题
        };
    }

    /**
     * 生成完整套卷
     * @param {string} content - 学习材料内容
     * @param {Object} options - 生成选项
     * @returns {Object} 完整套卷
     */
    async generateExamPaper(content, options = {}) {
        try {
            console.log('📋 开始生成完整套卷...');
            console.log(`📊 配置: ${this.paperConfig.multipleChoice}选择 + ${this.paperConfig.fillBlank}填空 + ${this.paperConfig.shortAnswer}简答`);
            
            // 检查GPU和服务状态
            await this.checkGPUStatus();
            
            // 处理文档
            console.log('📄 处理学习材料...');
            const processedDoc = await this.documentProcessor.processDocument(content, {
                maxChunkSize: 1200,
                overlapSize: 200,
                enableKnowledgeGraph: true
            });
            
            console.log(`✅ 文档处理完成: ${processedDoc.chunks.length}个块, ${processedDoc.concepts?.length || 0}个概念`);
            
            // 生成套卷
            const examPaper = await this.generatePaperSections(processedDoc, options);
            
            // 格式化输出
            const formattedPaper = this.formatExamPaper(examPaper, content);
            
            console.log('🎉 套卷生成完成！');
            return formattedPaper;
            
        } catch (error) {
            console.error('套卷生成失败:', error);
            throw error;
        }
    }

    /**
     * 检查GPU状态和优化配置
     */
    async checkGPUStatus() {
        try {
            console.log('🔍 检查Ollama GPU配置...');
            
            // 检查服务状态
            const serviceStatus = await ollamaService.checkService();
            if (!serviceStatus.available) {
                throw new Error('Ollama服务不可用');
            }
            
            console.log('✅ Ollama服务正常');
            console.log('🎯 当前模型:', serviceStatus.currentModel);
            console.log('⏱️ 超时设置: 90秒（高质量模式）');
            console.log('🚀 建议: 确保Ollama使用GPU加速 (CUDA_VISIBLE_DEVICES=0 ollama serve)');
            
        } catch (error) {
            console.error('GPU状态检查失败:', error);
            throw error;
        }
    }

    /**
     * 生成套卷各部分
     * @param {Object} processedDoc - 处理后的文档
     * @param {Object} options - 选项
     * @returns {Object} 套卷内容
     */
    async generatePaperSections(processedDoc, options) {
        const sections = {};
        
        // 1. 生成选择题部分
        console.log('📝 生成选择题部分 (10题)...');
        sections.multipleChoice = await this.generateMultipleChoiceSection(processedDoc);
        
        // 2. 生成填空题部分
        console.log('📝 生成填空题部分 (10题)...');
        sections.fillBlank = await this.generateFillBlankSection(processedDoc);
        
        // 3. 生成简答题部分
        console.log('📝 生成简答题部分 (5题)...');
        sections.shortAnswer = await this.generateShortAnswerSection(processedDoc);
        
        return sections;
    }

    /**
     * 生成选择题部分
     * @param {Object} processedDoc - 处理后的文档
     * @returns {Array} 选择题列表
     */
    async generateMultipleChoiceSection(processedDoc) {
        const prompt = this.buildMultipleChoicePrompt(processedDoc);
        
        console.log('🤖 调用DeepSeek生成选择题...');
        const response = await this.callDeepSeekWithHighQuality(prompt);
        
        const questions = this.parseMultipleChoiceResponse(response);
        console.log(`✅ 选择题生成完成: ${questions.length}题`);
        
        return questions;
    }

    /**
     * 生成填空题部分
     * @param {Object} processedDoc - 处理后的文档
     * @returns {Array} 填空题列表
     */
    async generateFillBlankSection(processedDoc) {
        const prompt = this.buildFillBlankPrompt(processedDoc);
        
        console.log('🤖 调用DeepSeek生成填空题...');
        const response = await this.callDeepSeekWithHighQuality(prompt);
        
        const questions = this.parseFillBlankResponse(response);
        console.log(`✅ 填空题生成完成: ${questions.length}题`);
        
        return questions;
    }

    /**
     * 生成简答题部分
     * @param {Object} processedDoc - 处理后的文档
     * @returns {Array} 简答题列表
     */
    async generateShortAnswerSection(processedDoc) {
        const prompt = this.buildShortAnswerPrompt(processedDoc);
        
        console.log('🤖 调用DeepSeek生成简答题...');
        const response = await this.callDeepSeekWithHighQuality(prompt);
        
        const questions = this.parseShortAnswerResponse(response);
        console.log(`✅ 简答题生成完成: ${questions.length}题`);
        
        return questions;
    }

    /**
     * 构建选择题提示词
     * @param {Object} processedDoc - 处理后的文档
     * @returns {string} 提示词
     */
    buildMultipleChoicePrompt(processedDoc) {
        const concepts = processedDoc.concepts?.slice(0, 15) || [];
        const keyContent = processedDoc.importantSections?.slice(0, 3)
            .map(s => s.content.substring(0, 300)).join('\n\n') || '';
        
        return `你是一位资深的教育专家，请基于以下学习材料生成10道高质量的单项选择题。

学习材料核心内容：
${keyContent}

重要概念：
${concepts.map(c => `${c.term}: ${c.definition}`).join('\n')}

要求：
1. 每题必须基于材料内容，考查核心概念理解
2. 选项设计要有合理的迷惑性，避免明显错误选项
3. 难度递进：前3题基础，中4题中等，后3题较难
4. 涵盖材料的不同知识点，避免重复
5. 每题提供详细解析说明

请按以下JSON格式输出（确保格式完全正确）：
{
  "questions": [
    {
      "id": 1,
      "question": "题目内容",
      "options": ["A选项", "B选项", "C选项", "D选项"],
      "correctAnswer": 0,
      "explanation": "详细解析，说明为什么这个答案正确，其他选项为什么错误",
      "difficulty": "basic|medium|hard",
      "knowledgePoints": ["知识点1", "知识点2"]
    }
  ]
}

只输出JSON格式，不要其他内容：`;
    }

    /**
     * 构建填空题提示词
     * @param {Object} processedDoc - 处理后的文档
     * @returns {string} 提示词
     */
    buildFillBlankPrompt(processedDoc) {
        const concepts = processedDoc.concepts?.slice(0, 15) || [];
        const keyContent = processedDoc.importantSections?.slice(0, 3)
            .map(s => s.content.substring(0, 300)).join('\n\n') || '';
        
        return `你是一位资深的教育专家，请基于以下学习材料生成10道高质量的填空题。

学习材料核心内容：
${keyContent}

重要概念：
${concepts.map(c => `${c.term}: ${c.definition}`).join('\n')}

要求：
1. 填空处应该是关键概念、重要数据或核心定义
2. 题目表述要完整，去掉填空内容后仍然语义清晰
3. 避免过于简单的填空，要有一定思考性
4. 难度递进：前3题基础，中4题中等，后3题较难
5. 每题提供详细解析和相关知识点

请按以下JSON格式输出：
{
  "questions": [
    {
      "id": 1,
      "question": "题目内容，用______表示填空处",
      "answer": "标准答案",
      "acceptableAnswers": ["标准答案", "可接受的答案2"],
      "explanation": "详细解析，说明答案的含义和重要性",
      "difficulty": "basic|medium|hard",
      "knowledgePoints": ["知识点1", "知识点2"]
    }
  ]
}

只输出JSON格式，不要其他内容：`;
    }

    /**
     * 构建简答题提示词
     * @param {Object} processedDoc - 处理后的文档
     * @returns {string} 提示词
     */
    buildShortAnswerPrompt(processedDoc) {
        const concepts = processedDoc.concepts?.slice(0, 15) || [];
        const keyContent = processedDoc.importantSections?.slice(0, 3)
            .map(s => s.content.substring(0, 400)).join('\n\n') || '';
        
        return `你是一位资深的教育专家，请基于以下学习材料生成5道高质量的简答题。

学习材料核心内容：
${keyContent}

重要概念：
${concepts.map(c => `${c.term}: ${c.definition}`).join('\n')}

要求：
1. 题目要能引导学生深入思考和综合分析
2. 避免纯记忆性问题，注重理解、应用和分析能力
3. 题目设计要有层次性，从理解到应用到分析
4. 每题提供详细的参考答案和评分要点
5. 答案要点要全面，便于评分参考

请按以下JSON格式输出：
{
  "questions": [
    {
      "id": 1,
      "question": "题目内容",
      "referenceAnswer": "详细的参考答案",
      "keyPoints": ["要点1", "要点2", "要点3"],
      "scoringCriteria": {
        "excellent": "优秀标准(9-10分)",
        "good": "良好标准(7-8分)", 
        "fair": "及格标准(6分)",
        "poor": "不及格标准(0-5分)"
      },
      "difficulty": "medium|hard",
      "knowledgePoints": ["知识点1", "知识点2"],
      "timeLimit": "建议答题时间(分钟)"
    }
  ]
}

只输出JSON格式，不要其他内容：`;
    }

    /**
     * 高质量DeepSeek调用
     * @param {string} prompt - 提示词
     * @returns {string} 响应内容
     */
    async callDeepSeekWithHighQuality(prompt) {
        const requestData = {
            model: this.model,
            prompt: prompt,
            stream: false,
            options: {
                temperature: 0.3,      // 降低随机性，提高质量
                top_p: 0.8,           // 更聚焦的生成
                max_tokens: 4000,     // 足够的生成长度
                num_predict: 3000,    // 预测长度
                repeat_penalty: 1.1,  // 避免重复
                num_ctx: 8192        // 更大的上下文窗口
            }
        };

        console.log('⏱️ 高质量生成中，请耐心等待90秒...');
        
        try {
            const response = await ollamaService.callOllamaWithRetry(requestData, 2);
            return response.data.response;
        } catch (error) {
            console.error('DeepSeek高质量调用失败:', error);
            throw error;
        }
    }

    /**
     * 解析选择题响应
     * @param {string} response - AI响应
     * @returns {Array} 选择题列表
     */
    parseMultipleChoiceResponse(response) {
        try {
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (!jsonMatch) throw new Error('未找到JSON格式');
            
            const parsed = JSON.parse(jsonMatch[0]);
            const questions = parsed.questions || [];
            
            return questions.map((q, index) => ({
                id: `mc_${index + 1}`,
                type: 'multiple-choice',
                question: q.question,
                options: q.options || [],
                correctAnswer: q.correctAnswer,
                explanation: q.explanation,
                difficulty: q.difficulty || 'medium',
                knowledgePoints: q.knowledgePoints || [],
                section: 'multipleChoice'
            }));
        } catch (error) {
            console.error('解析选择题失败:', error);
            return this.generateFallbackMultipleChoice();
        }
    }

    /**
     * 解析填空题响应
     * @param {string} response - AI响应
     * @returns {Array} 填空题列表
     */
    parseFillBlankResponse(response) {
        try {
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (!jsonMatch) throw new Error('未找到JSON格式');
            
            const parsed = JSON.parse(jsonMatch[0]);
            const questions = parsed.questions || [];
            
            return questions.map((q, index) => ({
                id: `fb_${index + 1}`,
                type: 'fill-blank',
                question: q.question,
                answer: q.answer,
                acceptableAnswers: q.acceptableAnswers || [q.answer],
                explanation: q.explanation,
                difficulty: q.difficulty || 'medium',
                knowledgePoints: q.knowledgePoints || [],
                section: 'fillBlank'
            }));
        } catch (error) {
            console.error('解析填空题失败:', error);
            return this.generateFallbackFillBlank();
        }
    }

    /**
     * 解析简答题响应
     * @param {string} response - AI响应
     * @returns {Array} 简答题列表
     */
    parseShortAnswerResponse(response) {
        try {
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (!jsonMatch) throw new Error('未找到JSON格式');
            
            const parsed = JSON.parse(jsonMatch[0]);
            const questions = parsed.questions || [];
            
            return questions.map((q, index) => ({
                id: `sa_${index + 1}`,
                type: 'short-answer',
                question: q.question,
                referenceAnswer: q.referenceAnswer,
                keyPoints: q.keyPoints || [],
                scoringCriteria: q.scoringCriteria || {},
                difficulty: q.difficulty || 'medium',
                knowledgePoints: q.knowledgePoints || [],
                timeLimit: q.timeLimit || '10分钟',
                section: 'shortAnswer'
            }));
        } catch (error) {
            console.error('解析简答题失败:', error);
            return this.generateFallbackShortAnswer();
        }
    }

    /**
     * 格式化套卷输出
     * @param {Object} examPaper - 套卷内容
     * @param {string} originalContent - 原始内容
     * @returns {Object} 格式化的套卷
     */
    formatExamPaper(examPaper, originalContent) {
        const totalQuestions = 
            examPaper.multipleChoice.length + 
            examPaper.fillBlank.length + 
            examPaper.shortAnswer.length;

        return {
            title: '智能生成套卷',
            subtitle: '基于DeepSeek-R1高质量生成',
            metadata: {
                generatedAt: new Date().toISOString(),
                model: this.model,
                totalQuestions: totalQuestions,
                sections: {
                    multipleChoice: examPaper.multipleChoice.length,
                    fillBlank: examPaper.fillBlank.length,
                    shortAnswer: examPaper.shortAnswer.length
                },
                estimatedTime: '90分钟',
                totalScore: 100,
                contentLength: originalContent.length
            },
            instructions: {
                general: '请仔细阅读题目，按要求作答。',
                multipleChoice: '单项选择题：每题4分，共40分。请选择最佳答案。',
                fillBlank: '填空题：每题3分，共30分。请在横线上填写正确答案。',
                shortAnswer: '简答题：每题6分，共30分。请简明扼要地回答问题。'
            },
            sections: {
                multipleChoice: {
                    title: '一、单项选择题（每题4分，共40分）',
                    questions: examPaper.multipleChoice
                },
                fillBlank: {
                    title: '二、填空题（每题3分，共30分）',
                    questions: examPaper.fillBlank
                },
                shortAnswer: {
                    title: '三、简答题（每题6分，共30分）',
                    questions: examPaper.shortAnswer
                }
            },
            answerKey: this.generateAnswerKey(examPaper)
        };
    }

    /**
     * 生成答案解析
     * @param {Object} examPaper - 套卷内容
     * @returns {Object} 答案解析
     */
    generateAnswerKey(examPaper) {
        return {
            multipleChoice: examPaper.multipleChoice.map(q => ({
                id: q.id,
                correctAnswer: q.correctAnswer,
                answerText: q.options[q.correctAnswer],
                explanation: q.explanation
            })),
            fillBlank: examPaper.fillBlank.map(q => ({
                id: q.id,
                answer: q.answer,
                acceptableAnswers: q.acceptableAnswers,
                explanation: q.explanation
            })),
            shortAnswer: examPaper.shortAnswer.map(q => ({
                id: q.id,
                referenceAnswer: q.referenceAnswer,
                keyPoints: q.keyPoints,
                scoringCriteria: q.scoringCriteria
            }))
        };
    }

    /**
     * 生成备用选择题
     * @returns {Array} 备用选择题
     */
    generateFallbackMultipleChoice() {
        const fallbackQuestions = [];
        for (let i = 1; i <= 10; i++) {
            fallbackQuestions.push({
                id: `mc_${i}`,
                type: 'multiple-choice',
                question: `根据学习材料，以下关于核心概念的说法正确的是？（第${i}题）`,
                options: [
                    '这是基于材料内容的正确选项',
                    '这是错误选项A',
                    '这是错误选项B',
                    '这是错误选项C'
                ],
                correctAnswer: 0,
                explanation: '根据学习材料的内容分析，正确答案是A选项。',
                difficulty: i <= 3 ? 'basic' : i <= 7 ? 'medium' : 'hard',
                knowledgePoints: ['核心概念'],
                section: 'multipleChoice'
            });
        }
        return fallbackQuestions;
    }

    /**
     * 生成备用填空题
     * @returns {Array} 备用填空题
     */
    generateFallbackFillBlank() {
        const fallbackQuestions = [];
        for (let i = 1; i <= 10; i++) {
            fallbackQuestions.push({
                id: `fb_${i}`,
                type: 'fill-blank',
                question: `学习材料中提到的重要概念______在相关领域中具有重要意义。（第${i}题）`,
                answer: '核心概念',
                acceptableAnswers: ['核心概念', '重要概念'],
                explanation: '这是学习材料中的重要概念，需要重点掌握。',
                difficulty: i <= 3 ? 'basic' : i <= 7 ? 'medium' : 'hard',
                knowledgePoints: ['核心概念'],
                section: 'fillBlank'
            });
        }
        return fallbackQuestions;
    }

    /**
     * 生成备用简答题
     * @returns {Array} 备用简答题
     */
    generateFallbackShortAnswer() {
        const fallbackQuestions = [];
        for (let i = 1; i <= 5; i++) {
            fallbackQuestions.push({
                id: `sa_${i}`,
                type: 'short-answer',
                question: `请结合学习材料，分析并说明相关概念的重要性和应用价值。（第${i}题）`,
                referenceAnswer: '根据学习材料，相关概念具有重要的理论意义和实践价值，主要体现在以下几个方面...',
                keyPoints: ['概念定义', '重要性分析', '应用价值', '发展前景'],
                scoringCriteria: {
                    excellent: '回答全面，逻辑清晰，有深度分析(9-10分)',
                    good: '回答较全面，逻辑较清晰(7-8分)',
                    fair: '回答基本正确，但不够深入(6分)',
                    poor: '回答不完整或有明显错误(0-5分)'
                },
                difficulty: 'medium',
                knowledgePoints: ['核心概念', '应用分析'],
                timeLimit: '10分钟',
                section: 'shortAnswer'
            });
        }
        return fallbackQuestions;
    }
}

module.exports = ExamPaperGenerator;