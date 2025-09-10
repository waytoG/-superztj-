const axios = require('axios');

class OllamaService {
    constructor() {
        // 从环境变量获取Ollama配置，提供默认值
        // 使用 127.0.0.1 而不是 localhost 避免 IPv6 解析问题
        this.baseURL = process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434';
        this.model = process.env.OLLAMA_MODEL || 'deepseek-r1:7b';
        this.timeout = parseInt(process.env.OLLAMA_TIMEOUT) || 90000; // 默认90秒，获得更高质量
        this.maxContentLength = parseInt(process.env.OLLAMA_MAX_CONTENT_LENGTH) || 8000; // 最大内容长度
        this.chunkSize = parseInt(process.env.OLLAMA_CHUNK_SIZE) || 2000; // 分块大小
    }

    // 检查Ollama服务是否可用
    async checkService() {
        try {
            const response = await axios.get(`${this.baseURL}/api/tags`, {
                timeout: 5000
            });
            
            // 检查指定模型是否存在
            const models = response.data.models || [];
            const modelExists = models.some(m => m.name.includes(this.model.split(':')[0]));
            
            return {
                available: true,
                models: models.map(m => m.name),
                currentModel: this.model,
                modelExists
            };
        } catch (error) {
            console.log('Ollama服务检查失败:', error.message);
            return {
                available: false,
                error: error.message,
                models: [],
                currentModel: this.model,
                modelExists: false
            };
        }
    }

    // 生成题目 - 优化版本
    async generateQuestions(content, options = {}) {
        const {
            questionCount = 10,
            questionTypes = ['multiple-choice', 'fill-blank', 'essay'],
            difficulty = 'medium'
        } = options;

        try {
            console.log(`📊 原始内容长度: ${content.length} 字符`);
            
            // 检查服务可用性
            const serviceStatus = await this.checkService();
            if (!serviceStatus.available) {
                throw new Error(`Ollama服务不可用: ${serviceStatus.error}`);
            }

            if (!serviceStatus.modelExists) {
                console.warn(`模型 ${this.model} 不存在，使用可用的第一个模型`);
                if (serviceStatus.models.length > 0) {
                    this.model = serviceStatus.models[0];
                } else {
                    throw new Error('没有可用的模型');
                }
            }

            // 直接使用原始内容，让AI模型自行处理和提取信息
            console.log('🤖 让AI模型直接处理原始内容');
            
            // 如果内容过长，进行简单截取而不是复杂预处理
            let finalContent = content;
            if (content.length > this.maxContentLength) {
                console.log('📦 内容过长，进行简单截取');
                finalContent = content.substring(0, this.maxContentLength) + '...';
            }

            // 构建优化的提示词
            const prompt = this.buildOptimizedPrompt(finalContent, questionCount, questionTypes, difficulty);
            
            // 调用Ollama API with retry logic
            const response = await this.callOllamaWithRetry({
                model: this.model,
                prompt: prompt,
                stream: false,
                options: {
                    temperature: 0.7,
                    top_p: 0.9,
                    max_tokens: 4000,
                    num_predict: 2000 // 限制生成长度
                }
            });

            // 解析响应
            const generatedText = response.data.response;
            const questions = this.parseQuestions(generatedText);
            
            // 验证和补充题目
            return this.validateAndEnhanceQuestions(questions, questionCount);

        } catch (error) {
            console.error('Ollama题目生成失败:', error.message);
            
            // 根据错误类型提供不同的处理
            if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
                console.log('⏰ 请求超时，尝试使用简化内容重新生成');
                try {
                    const simplifiedContent = this.simplifyContent(content, 1000);
                    return await this.generateQuestionsWithSimplifiedContent(simplifiedContent, questionCount, questionTypes, difficulty);
                } catch (retryError) {
                    console.log('🔄 简化重试也失败，使用备用方案');
                }
            }
            
            // 如果AI生成失败，返回基于内容的示例题目
            console.log('使用备用题目生成方案');
            return this.generateFallbackQuestions(content, questionCount);
        }
    }

    // 简化内容（紧急情况下使用）
    simplifyContent(content, maxLength = 1000) {
        if (!content) return '学习材料内容';
        
        // 提取前几句话作为摘要
        const sentences = content.split(/[。！？.!?]/).filter(s => s.trim().length > 10);
        let simplified = '';
        
        for (const sentence of sentences.slice(0, 5)) {
            if (simplified.length + sentence.length < maxLength) {
                simplified += sentence.trim() + '。';
            } else {
                break;
            }
        }
        
        return simplified || content.substring(0, maxLength);
    }



    // 使用简化内容生成题目
    async generateQuestionsWithSimplifiedContent(content, questionCount, questionTypes, difficulty) {
        console.log('🔄 使用简化内容重新生成题目');
        
        const prompt = this.buildSimplifiedPrompt(content, questionCount, questionTypes, difficulty);
        
        const response = await this.callOllamaWithRetry({
            model: this.model,
            prompt: prompt,
            stream: false,
            options: {
                temperature: 0.8,
                top_p: 0.9,
                max_tokens: 1500,
                num_predict: 800
            }
        });
        
        const generatedText = response.data.response;
        const questions = this.parseQuestions(generatedText);
        
        return this.validateAndEnhanceQuestions(questions, questionCount);
    }

    // 带重试的Ollama调用
    async callOllamaWithRetry(requestData, maxRetries = 2) {
        let lastError;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                console.log(`🔄 第 ${attempt} 次尝试调用Ollama API`);
                
                const response = await axios.post(`${this.baseURL}/api/generate`, requestData, {
                    timeout: this.timeout,
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
                
                console.log('✅ Ollama API调用成功');
                return response;
                
            } catch (error) {
                lastError = error;
                console.warn(`⚠️ 第 ${attempt} 次尝试失败:`, error.message);
                
                if (attempt < maxRetries) {
                    const delay = attempt * 2000; // 递增延迟
                    console.log(`⏳ 等待 ${delay}ms 后重试`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }
        
        throw lastError;
    }

    // 构建优化的提示词
    buildOptimizedPrompt(content, questionCount, questionTypes, difficulty) {
        const typeDescriptions = {
            'multiple-choice': '选择题（4个选项）',
            'fill-blank': '填空题',
            'essay': '问答题'
        };

        const selectedTypes = questionTypes.map(type => typeDescriptions[type]).join('、');
        
        return `基于以下内容生成${questionCount}道${selectedTypes}，难度：${difficulty}

内容：
${content}

要求：
1. 题目紧密结合内容
2. 选择题提供4个选项，标明正确答案序号(0-3)
3. 填空题用___表示空白
4. 问答题提供参考答案
5. 输出标准JSON格式

JSON格式：
{
  "questions": [
    {
      "type": "multiple-choice",
      "question": "题目",
      "options": ["A", "B", "C", "D"],
      "correctAnswer": 0,
      "explanation": "解析"
    }
  ]
}

只输出JSON，不要其他内容：`;
    }

    // 构建简化提示词
    buildSimplifiedPrompt(content, questionCount, questionTypes, difficulty) {
        return `根据内容生成${questionCount}道题目：

${content}

输出JSON格式的题目包含type、question、options/answer、correctAnswer、explanation字段。`;
    }

    // 构建提示词（保留原方法兼容性）
    buildPrompt(content, questionCount, questionTypes, difficulty) {

    // 构建提示词（保留原方法兼容性）
    buildPrompt(content, questionCount, questionTypes, difficulty) 
        const typeDescriptions = {
            'multiple-choice': '选择题（4个选项，标明正确答案）',
            'fill-blank': '填空题（提供标准答案）',
            'essay': '问答题（提供参考答案）'
        };

        const selectedTypes = questionTypes.map(type => typeDescriptions[type]).join('、');
        
        return `请根据以下学习材料生成${questionCount}道题目，题目类型包括：${selectedTypes}。
难度等级：${difficulty}

学习材料内容：
${content}

请按照以下JSON格式输出题目,确保格式正确：

{
  "questions": [
    {
      "type": "multiple-choice",
      "question": "题目内容",
      "options": ["选项A", "选项B", "选项C", "选项D"],
      "correctAnswer": 0,
      "explanation": "解析说明"
    },
    {
      "type": "fill-blank",
      "question": "题目内容（用___表示空白）",
      "answer": "标准答案",
      "explanation": "解析说明"
    },
    {
      "type": "essay",
      "question": "题目内容",
      "sampleAnswer": "参考答案",
      "explanation": "解析说明"
    }
  ]
}

要求：
1. 题目要紧密结合学习材料内容
2. 选择题的选项要有一定迷惑性
3. 填空题要考查关键概念
4. 问答题要考查理解和应用能力
5. 每题都要提供详细的解析说明
6. 确保JSON格式完全正确可以直接解析

请只输出JSON格式的内容不要包含其他文字：`;
    }

    // 解析生成的题目
    parseQuestions(generatedText) {
        try {
            // 尝试提取JSON部分
            let jsonText = generatedText.trim();
            
            // 如果包含代码块标记，提取其中的内容
            const jsonMatch = jsonText.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
            if (jsonMatch) {
                jsonText = jsonMatch[1];
            }
            
            // 如果没有代码块，尝试找到JSON对象
            const objectMatch = jsonText.match(/\{[\s\S]*\}/);
            if (objectMatch) {
                jsonText = objectMatch[0];
            }

            const parsed = JSON.parse(jsonText);
            return parsed.questions || [];
        } catch (error) {
            console.error('解析题目JSON失败:', error.message);
            console.log('原始响应:', generatedText);
            return [];
        }
    }

    // 验证和增强题目
    validateAndEnhanceQuestions(questions, targetCount) {
        const validQuestions = questions.filter(q => {
            // 基本验证
            if (!q.question || !q.type) return false;
            
            // 根据类型验证
            switch (q.type) {
                case 'multiple-choice':
                    return q.options && q.options.length >= 2 && 
                           q.correctAnswer !== undefined && 
                           q.correctAnswer < q.options.length;
                case 'fill-blank':
                    return q.answer && q.answer.trim().length > 0;
                case 'essay':
                    return q.sampleAnswer && q.sampleAnswer.trim().length > 0;
                default:
                    return false;
            }
        });

        // 如果生成的题目不够，用示例题目补充
        if (validQuestions.length < targetCount) {
            const additionalQuestions = this.generateAdditionalQuestions(
                targetCount - validQuestions.length
            );
            validQuestions.push(...additionalQuestions);
        }

        // 限制题目数量
        return validQuestions.slice(0, targetCount);
    }

    // 生成额外的示例题目
    generateAdditionalQuestions(count) {
        const templates = [
            {
                type: 'multiple-choice',
                question: '根据学习材料，以下哪个说法是正确的？',
                options: ['选项A', '选项B', '选项C', '选项D'],
                correctAnswer: 0,
                explanation: '根据材料内容分析得出。'
            },
            {
                type: 'fill-blank',
                question: '请填写关键概念：___',
                answer: '关键概念',
                explanation: '这是材料中的重要概念。'
            },
            {
                type: 'essay',
                question: '请简述学习材料的主要内容。',
                sampleAnswer: '材料主要讲述了相关概念和应用。',
                explanation: '需要理解和总结材料的核心内容。'
            }
        ];

        const questions = [];
        for (let i = 0; i < count; i++) {
            const template = templates[i % templates.length];
            questions.push({
                ...template,
                question: `${template.question}（第${i + 1}题）`
            });
        }
        return questions;
    }

    // 备用题目生成（当AI不可用时）
    generateFallbackQuestions(content, questionCount) {
        console.log('使用备用题目生成方案');
        
        const questions = [];
        const contentWords = content.split(/\s+/).filter(word => word.length > 2);
        const keyWords = contentWords.slice(0, Math.min(10, contentWords.length));

        for (let i = 0; i < questionCount; i++) {
            const questionType = ['multiple-choice', 'fill-blank', 'essay'][i % 3];
            const keyWord = keyWords[i % keyWords.length] || '概念';

            switch (questionType) {
                case 'multiple-choice':
                    questions.push({
                        type: 'multiple-choice',
                        question: `关于"${keyWord}"的理解，以下哪项是正确的？`,
                        options: [
                            `${keyWord}是重要概念`,
                            `${keyWord}不重要`,
                            `${keyWord}可以忽略`,
                            `${keyWord}没有意义`
                        ],
                        correctAnswer: 0,
                        explanation: `${keyWord}在学习材料中是重要的概念，需要重点理解。`
                    });
                    break;
                case 'fill-blank':
                    questions.push({
                        type: 'fill-blank',
                        question: `学习材料中提到的重要概念是：___`,
                        answer: keyWord,
                        explanation: `${keyWord}是材料中的关键概念。`
                    });
                    break;
                case 'essay':
                    questions.push({
                        type: 'essay',
                        question: `请解释"${keyWord}"在学习材料中的作用和意义。`,
                        sampleAnswer: `${keyWord}在材料中起到重要作用，体现了相关的理论和实践意义。`,
                        explanation: `需要结合材料内容，深入理解${keyWord}的含义和应用。`
                    });
                    break;
            }
        }

        return questions;
    }

    // 批改问答题（使用AI）
    async gradeEssayQuestion(question, userAnswer, referenceAnswer) {
        try {
            const prompt = `请作为一名专业教师，批改以下问答题：

题目：${question}
参考答案：${referenceAnswer}
学生答案：${userAnswer}

请从以下几个方面进行评分（总分100分）：
1. 内容准确性（40分）
2. 逻辑清晰度（30分）
3. 完整性（20分）
4. 表达能力（10分）

请按照以下JSON格式输出评分结果：
{
  "score": 85,
  "feedback": "详细的评价和建议",
  "strengths": ["优点1", "优点2"],
  "improvements": ["改进建议1", "改进建议2"]
}`;

            const response = await axios.post(`${this.baseURL}/api/generate`, {
                model: this.model,
                prompt: prompt,
                stream: false,
                options: {
                    temperature: 0.3,
                    max_tokens: 1000
                }
            }, {
                timeout: this.timeout
            });

            const result = JSON.parse(response.data.response);
            return result;
        } catch (error) {
            console.error('AI批改失败:', error.message);
            // 返回默认评分
            return {
                score: 75,
                feedback: '答案基本正确，建议进一步完善表达。',
                strengths: ['回答了主要问题'],
                improvements: ['可以更加详细和准确']
            };
        }
    }
}

module.exports = new OllamaService();