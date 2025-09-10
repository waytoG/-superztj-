// 全局变量
let currentUser = null;
let currentQuiz = null;
let currentQuestionIndex = 0;
let quizTimer = null;
let startTime = null;
let userAnswers = [];

// DOM加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    // 立即隐藏加载动画，防止页面加载时显示
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        loadingOverlay.style.display = 'none';
    }
    
    initializeApp();
    setupEventListeners();
    loadUserData();
    loadMaterials();
});

// 初始化应用
function initializeApp() {
    // 确保加载动画隐藏
    hideLoading();
    
    // 设置导航栏滚动效果
    window.addEventListener('scroll', handleNavbarScroll);
    
    // 设置文件拖拽上传
    setupFileUpload();
    
    // 初始化图表
    initializeCharts();
    
    console.log('🚀 超级做题家应用初始化完成');
}

// 设置事件监听器
function setupEventListeners() {
    // 导航菜单切换
    const navToggle = document.getElementById('navToggle');
    const navMenu = document.getElementById('navMenu');
    
    if (navToggle && navMenu) {
        navToggle.addEventListener('click', () => {
            navMenu.classList.toggle('active');
        });
    }
    
    // 导航链接点击
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetSection = link.getAttribute('href').substring(1);
            showSection(targetSection);
            
            // 更新活跃状态
            document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            
            // 移动端关闭菜单
            if (navMenu) navMenu.classList.remove('active');
        });
    });
    
    // 文件输入变化
    const fileInput = document.getElementById('fileInput');
    if (fileInput) {
        fileInput.addEventListener('change', handleFileSelect);
    }
}

// 导航栏滚动效果
function handleNavbarScroll() {
    const navbar = document.querySelector('.navbar');
    if (window.scrollY > 50) {
        navbar.style.background = 'rgba(255, 255, 255, 0.98)';
        navbar.style.boxShadow = '0 2px 30px rgba(0, 0, 0, 0.15)';
    } else {
        navbar.style.background = 'rgba(255, 255, 255, 0.95)';
        navbar.style.boxShadow = '0 2px 20px rgba(0, 0, 0, 0.1)';
    }
}

// 显示指定部分
function showSection(sectionId) {
    // 隐藏所有部分
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });
    
    // 显示目标部分
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.add('active');
        
        // 根据部分执行特定初始化
        switch(sectionId) {
            case 'upload':
                loadMaterials();
                break;
            case 'quiz':
                resetQuizInterface();
                break;
            case 'analysis':
                updateAnalysisData();
                break;
            case 'profile':
                loadProfileData();
                break;
        }
    }
}

// 设置文件上传
function setupFileUpload() {
    const uploadZone = document.getElementById('uploadZone');
    const fileInput = document.getElementById('fileInput');
    
    if (!uploadZone || !fileInput) {
        console.log('上传元素未找到:', { uploadZone: !!uploadZone, fileInput: !!fileInput });
        return;
    }
    
    // 文件选择事件
    fileInput.addEventListener('change', handleFileSelect);
    
    // 拖拽事件
    uploadZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadZone.classList.add('dragover');
    });
    
    uploadZone.addEventListener('dragleave', () => {
        uploadZone.classList.remove('dragover');
    });
    
    uploadZone.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadZone.classList.remove('dragover');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFileUpload(files);
        }
    });
    
    // 点击上传
    uploadZone.addEventListener('click', () => {
        fileInput.click();
    });
    
    console.log('文件上传功能初始化完成');
}

// 处理文件选择
function handleFileSelect(event) {
    const files = event.target.files;
    if (files.length > 0) {
        handleFileUpload(files);
    }
}

// 处理文件上传
async function handleFileUpload(files) {
    console.log('开始处理文件上传:', files.length, '个文件');
    
    const uploadProgress = document.getElementById('uploadProgress');
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    
    if (!uploadProgress || !progressFill || !progressText) {
        console.error('上传进度元素未找到');
        showToast('error', '上传界面初始化失败');
        return;
    }
    
    uploadProgress.style.display = 'block';
    
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        console.log(`处理文件 ${i + 1}/${files.length}:`, file.name, file.size, 'bytes');
        
        const formData = new FormData();
        formData.append('file', file);
        
        try {
            progressText.textContent = `正在上传 ${file.name}...`;
            progressFill.style.width = '10%';
            
            console.log('发送上传请求到:', '/api/materials/upload');
            
            const response = await fetch('/api/materials/upload', {
                method: 'POST',
                body: formData
            });
            
            console.log('上传响应状态:', response.status, response.statusText);
            
            if (response.ok) {
                const result = await response.json();
                console.log('上传成功响应:', result);
                showToast('success', `${file.name} 上传成功！`);
                
                // 模拟进度条
                let progress = 10;
                const interval = setInterval(() => {
                    progress += 15;
                    progressFill.style.width = progress + '%';
                    if (progress >= 100) {
                        clearInterval(interval);
                        setTimeout(() => {
                            uploadProgress.style.display = 'none';
                            progressFill.style.width = '0%';
                            loadMaterials(); // 重新加载材料列表
                        }, 500);
                    }
                }, 100);
                
            } else {
                const errorText = await response.text();
                console.error('上传失败响应:', errorText);
                throw new Error(`上传失败: ${response.status} ${response.statusText}`);
            }
        } catch (error) {
            console.error('上传错误:', error);
            showToast('error', `${file.name} 上传失败：${error.message}`);
            uploadProgress.style.display = 'none';
            progressFill.style.width = '0%';
        }
    }
}

// 加载材料列表
async function loadMaterials() {
    console.log('开始加载材料列表...');
    
    try {
        const response = await fetch('/api/materials/list');
        console.log('材料列表响应状态:', response.status);
        
        if (response.ok) {
            const result = await response.json();
            console.log('材料列表响应数据:', result);
            
            // 检查响应格式
            const materials = result.success ? result.data : result;
            displayMaterials(materials || []);
        } else {
            console.error('获取材料列表失败:', response.status, response.statusText);
            displayMaterials([]);
        }
    } catch (error) {
        console.error('加载材料失败:', error);
        displayMaterials([]);
    }
}

// 显示材料列表
function displayMaterials(materials) {
    console.log('显示材料列表:', materials);
    
    const materialsGrid = document.getElementById('materialsGrid');
    if (!materialsGrid) {
        console.error('materialsGrid元素未找到');
        return;
    }
    
    materialsGrid.innerHTML = '';
    
    if (!materials || materials.length === 0) {
        materialsGrid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-folder-open"></i>
                <h3>暂无上传材料</h3>
                <p>请上传学习材料开始使用</p>
            </div>
        `;
        return;
    }
    
    materials.forEach(material => {
        const materialCard = document.createElement('div');
        materialCard.className = 'material-card';
        
        const iconClass = getFileIcon(material.type);
        const statusBadge = material.processed ? 
            '<span class="badge badge-success">已处理</span>' : 
            '<span class="badge badge-warning">处理中</span>';
        
        materialCard.innerHTML = `
            <div class="material-icon">
                <i class="${iconClass}"></i>
            </div>
            <div class="material-name">${material.name}</div>
            <div class="material-info">
                <small>大小: ${material.size} | 上传: ${material.uploadTime}</small>
                <br>
                ${statusBadge}
            </div>
            <div class="material-actions">
                <div class="action-group">
                    <button class="btn btn-sm btn-primary" onclick="showQuizGenerationOptions('${material.id}')" title="选择题目生成方式">
                        <i class="fas fa-brain"></i> 智能生成
                    </button>
                    <div class="btn-group">
                        <button class="btn btn-sm btn-outline-primary dropdown-toggle" onclick="toggleQuickActions('${material.id}')">
                            <i class="fas fa-cog"></i>
                        </button>
                        <div class="quick-actions" id="quick-actions-${material.id}" style="display: none;">
                            <button class="quick-action-btn" onclick="generateSmartQuiz('${material.id}'); hideQuickActions('${material.id}')">
                                <i class="fas fa-magic"></i> 智能生成
                            </button>
                            <button class="quick-action-btn" onclick="generateEnhancedQuiz('${material.id}'); hideQuickActions('${material.id}')">
                                <i class="fas fa-rocket"></i> 增强生成
                            </button>
                            <button class="quick-action-btn" onclick="generateBatchQuiz('${material.id}'); hideQuickActions('${material.id}')">
                                <i class="fas fa-layer-group"></i> 批量生成
                            </button>
                            <button class="quick-action-btn" onclick="generateQuiz('${material.id}'); hideQuickActions('${material.id}')">
                                <i class="fas fa-bolt"></i> 快速生成
                            </button>
                        </div>
                    </div>
                </div>
                <button class="btn btn-sm btn-danger" onclick="deleteMaterial(${material.id})">
                    <i class="fas fa-trash"></i> 删除
                </button>
            </div>
        `;
        
        materialsGrid.appendChild(materialCard);
    });
}

// 获取文件图标
function getFileIcon(fileType) {
    const iconMap = {
        'pdf': 'fas fa-file-pdf',
        'doc': 'fas fa-file-word',
        'docx': 'fas fa-file-word',
        'ppt': 'fas fa-file-powerpoint',
        'pptx': 'fas fa-file-powerpoint',
        'txt': 'fas fa-file-alt',
        'jpg': 'fas fa-file-image',
        'jpeg': 'fas fa-file-image',
        'png': 'fas fa-file-image',
        'gif': 'fas fa-file-image'
    };
    
    return iconMap[fileType.toLowerCase()] || 'fas fa-file';
}

// 开始练习
async function startQuiz(mode) {
    const quizModes = document.getElementById('quizModes');
    const quizContainer = document.getElementById('quizContainer');
    
    // 首先检查是否有已上传的材料
    try {
        const materialsResponse = await fetch('/api/materials/list');
        const materialsData = await materialsResponse.json();
        
        if (materialsData.success && materialsData.data && materialsData.data.length > 0) {
            // 有材料，使用最新的材料生成 AI 题目
            const latestMaterial = materialsData.data[0]; // 使用最新上传的材料
            
            showLoading('AI正在根据您的学习材料生成个性化题目...');
            
            try {
                // 先获取材料详情以获取内容
                const materialDetailResponse = await fetch(`/api/materials/${latestMaterial.id}`);
                const materialDetail = await materialDetailResponse.json();
                
                let materialContent = '学习材料内容';
                if (materialDetail.success && materialDetail.data && materialDetail.data.content) {
                    materialContent = materialDetail.data.content;
                } else {
                    console.warn('无法获取材料内容，使用默认内容');
                }
                
                const response = await fetch('/api/ai/generate-questions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        content: materialContent,
                        questionType: mode === 'mock-exam' ? 'mixed' : mode,
                        count: mode === 'mock-exam' ? 15 : 10,
                        difficulty: 'medium'
                    })
                });
                
                const result = await response.json();
                hideLoading();
                
                if (result.success && result.data && result.data.questions) {
                    // 保存生成的题目到全局变量
                    currentQuiz = {
                        mode: mode,
                        questions: result.data.questions.map(q => ({
                            type: q.type,
                            question: q.question,
                            options: q.options || [],
                            correctAnswer: q.correctAnswer !== undefined ? q.correctAnswer : q.answer,
                            answer: q.answer || q.correctAnswer,
                            sampleAnswer: q.sampleAnswer,
                            explanation: q.explanation
                        })),
                        totalQuestions: result.data.questions.length,
                        materialName: latestMaterial.name
                    };
                    
                    showToast('success', `基于《${latestMaterial.name}》生成了 ${currentQuiz.questions.length} 道题目！`);
                    
                    if (quizModes && quizContainer) {
                        quizModes.style.display = 'none';
                        quizContainer.style.display = 'block';
                        
                        // 开始 AI 生成的练习
                        startGeneratedQuiz();
                    }
                } else {
                    throw new Error(result.message || 'AI 生成题目失败');
                }
            } catch (aiError) {
                hideLoading();
                console.error('AI 生成失败，使用备用题目:', aiError);
                showToast('warning', 'AI 生成失败，使用示例题目进行练习');
                
                // 降级到示例题目
                if (quizModes && quizContainer) {
                    quizModes.style.display = 'none';
                    quizContainer.style.display = 'block';
                    initializeQuiz(mode);
                }
            }
        } else {
            // 没有材料，提示用户先上传
            showToast('info', '请先上传学习材料，AI 将根据您的材料生成个性化题目');
            showUploadPrompt(mode);
        }
    } catch (error) {
        console.error('检查材料失败:', error);
        showToast('warning', '无法获取学习材料，使用示例题目进行练习');
        
        // 降级到示例题目
        if (quizModes && quizContainer) {
            quizModes.style.display = 'none';
            quizContainer.style.display = 'block';
            initializeQuiz(mode);
        }
    }
}

// 初始化练习
function initializeQuiz(mode) {
    currentQuestionIndex = 0;
    userAnswers = [];
    startTime = new Date();
    
    // 根据模式设置题目
    const questions = generateQuestions(mode);
    currentQuiz = {
        mode: mode,
        questions: questions,
        totalQuestions: questions.length
    };
    
    // 更新界面
    updateQuizInterface();
    startTimer();
}

// 生成题目
function generateQuestions(mode) {
    // 这里应该调用后端API生成题目，现在使用示例数据
    const sampleQuestions = {
        'fill-blank': [
            {
                type: 'fill-blank',
                question: '函数 f(x) = x² + 2x + 1 的最小值是 ______。',
                answer: '0',
                explanation: '这是一个开口向上的抛物线，顶点为(-1, 0)，所以最小值为0。'
            },
            {
                type: 'fill-blank',
                question: '英语中表示"在...之前"的介词是 ______。',
                answer: 'before',
                explanation: 'before是表示时间先后关系的介词，意思是"在...之前"。'
            }
        ],
        'multiple-choice': [
            {
                type: 'multiple-choice',
                question: '下列哪个是Python的数据类型？',
                options: ['int', 'string', 'boolean', '以上都是'],
                correctAnswer: 3,
                explanation: 'Python中int、string、boolean都是基本数据类型。'
            },
            {
                type: 'multiple-choice',
                question: 'HTTP协议默认端口号是？',
                options: ['21', '80', '443', '8080'],
                correctAnswer: 1,
                explanation: 'HTTP协议的默认端口号是80，HTTPS是443。'
            }
        ],
        'essay': [
            {
                type: 'essay',
                question: '请简述面向对象编程的三大特性。',
                sampleAnswer: '面向对象编程的三大特性是：1.封装：将数据和方法封装在类中；2.继承：子类可以继承父类的属性和方法；3.多态：同一接口可以有不同的实现。',
                explanation: '这是面向对象编程的核心概念，理解这三个特性对于掌握OOP很重要。'
            }
        ],
        'mock-exam': [
            {
                type: 'multiple-choice',
                question: '计算机的CPU主要功能是？',
                options: ['存储数据', '处理数据', '输入数据', '输出数据'],
                correctAnswer: 1,
                explanation: 'CPU（中央处理器）的主要功能是处理和执行指令。'
            },
            {
                type: 'fill-blank',
                question: 'HTML的全称是 ______。',
                answer: 'HyperText Markup Language',
                explanation: 'HTML是超文本标记语言的缩写。'
            }
        ]
    };
    
    return sampleQuestions[mode] || sampleQuestions['multiple-choice'];
}

// 更新练习界面
function updateQuizInterface() {
    if (!currentQuiz) return;
    
    const question = currentQuiz.questions[currentQuestionIndex];
    const questionContainer = document.getElementById('questionContainer');
    const currentQuestionSpan = document.getElementById('currentQuestion');
    const totalQuestionsSpan = document.getElementById('totalQuestions');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const submitBtn = document.getElementById('submitBtn');
    
    // 更新进度
    if (currentQuestionSpan) currentQuestionSpan.textContent = currentQuestionIndex + 1;
    if (totalQuestionsSpan) totalQuestionsSpan.textContent = currentQuiz.totalQuestions;
    
    // 更新按钮状态
    if (prevBtn) prevBtn.style.display = currentQuestionIndex > 0 ? 'block' : 'none';
    if (nextBtn) nextBtn.style.display = currentQuestionIndex < currentQuiz.totalQuestions - 1 ? 'block' : 'none';
    if (submitBtn) submitBtn.style.display = currentQuestionIndex === currentQuiz.totalQuestions - 1 ? 'block' : 'none';
    
    // 渲染题目
    if (questionContainer) {
        questionContainer.innerHTML = renderQuestion(question, currentQuestionIndex);
        
        // 使用高级数学公式修复器，彻底解决"Missing open brace for subscript"错误
        if (window.advancedMathFixer) {
            advancedMathFixer.fixAllMathFormulas(questionContainer);
            console.log('🔧 高级数学公式修复完成');
        }
        
        // 备用修复器
        if (window.mathFixer) {
            mathFixer.fixMathInElement(questionContainer);
            console.log('🔧 备用数学公式修复完成');
        }
        
        // 渲染数学公式，解决乱码问题
        if (window.mathRenderer) {
            mathRenderer.renderMathInElement(questionContainer, () => {
                console.log('📐 题目数学公式渲染完成');
            });
        }
    }
}

// 渲染题目
function renderQuestion(question, index) {
    let html = `<div class="question">
        <div class="question-text tex2jax_process">${question.question}</div>`;
    
    switch (question.type) {
        case 'multiple-choice':
            html += '<div class="question-options">';
            question.options.forEach((option, i) => {
                const isSelected = userAnswers[index] === i;
                html += `
                    <div class="option ${isSelected ? 'selected' : ''}" onclick="selectOption(${i})">
                        <input type="radio" name="question_${index}" value="${i}" ${isSelected ? 'checked' : ''}>
                        <span class="option-text tex2jax_process">${option}</span>
                    </div>
                `;
            });
            html += '</div>';
            break;
            
        case 'fill-blank':
            const userAnswer = userAnswers[index] || '';
            html += `
                <div class="question-input">
                    <input type="text" class="form-control" placeholder="请输入答案..." 
                           value="${userAnswer}" onchange="updateAnswer(this.value)">
                </div>
            `;
            break;
            
        case 'essay':
            const essayAnswer = userAnswers[index] || '';
            html += `
                <div class="question-input">
                    <textarea class="form-control" rows="6" placeholder="请输入您的答案..." 
                              onchange="updateAnswer(this.value)">${essayAnswer}</textarea>
                </div>
            `;
            break;
    }
    
    html += '</div>';
    return html;
}

// 选择选项
function selectOption(optionIndex) {
    userAnswers[currentQuestionIndex] = optionIndex;
    updateQuizInterface();
}

// 更新答案
function updateAnswer(value) {
    userAnswers[currentQuestionIndex] = value;
}

// 上一题
function previousQuestion() {
    if (currentQuestionIndex > 0) {
        currentQuestionIndex--;
        updateQuizInterface();
    }
}

// 下一题
function nextQuestion() {
    if (currentQuestionIndex < currentQuiz.totalQuestions - 1) {
        currentQuestionIndex++;
        updateQuizInterface();
    }
}

// 提交练习
function submitQuiz() {
    if (confirm('确定要提交答案吗？')) {
        stopTimer();
        calculateResults();
        showQuizResult();
    }
}

// 计算结果
function calculateResults() {
    let correctCount = 0;
    const results = [];
    
    currentQuiz.questions.forEach((question, index) => {
        const userAnswer = userAnswers[index];
        let isCorrect = false;
        
        switch (question.type) {
            case 'multiple-choice':
                isCorrect = userAnswer === question.correctAnswer;
                break;
            case 'fill-blank':
                isCorrect = userAnswer && userAnswer.toLowerCase().trim() === question.answer.toLowerCase().trim();
                break;
            case 'essay':
                // 简单的关键词匹配，实际应该使用AI评分
                isCorrect = userAnswer && userAnswer.length > 20;
                break;
        }
        
        if (isCorrect) correctCount++;
        
        results.push({
            question: question,
            userAnswer: userAnswer,
            isCorrect: isCorrect
        });
    });
    
    currentQuiz.results = results;
    currentQuiz.score = Math.round((correctCount / currentQuiz.totalQuestions) * 100);
    currentQuiz.correctCount = correctCount;
    currentQuiz.wrongCount = currentQuiz.totalQuestions - correctCount;
}

// 显示练习结果
function showQuizResult() {
    const quizContainer = document.getElementById('quizContainer');
    const quizResult = document.getElementById('quizResult');
    const scoreText = document.getElementById('scoreText');
    const correctCount = document.getElementById('correctCount');
    const wrongCount = document.getElementById('wrongCount');
    const totalTime = document.getElementById('totalTime');
    
    if (quizContainer) quizContainer.style.display = 'none';
    if (quizResult) quizResult.style.display = 'block';
    
    if (scoreText) scoreText.textContent = currentQuiz.score;
    if (correctCount) correctCount.textContent = currentQuiz.correctCount;
    if (wrongCount) wrongCount.textContent = currentQuiz.wrongCount;
    if (totalTime) totalTime.textContent = formatTime(getElapsedTime());
}

// 开始计时器
function startTimer() {
    const timerElement = document.getElementById('timer');
    if (!timerElement) return;
    
    quizTimer = setInterval(() => {
        const elapsed = getElapsedTime();
        timerElement.textContent = formatTime(elapsed);
    }, 1000);
}

// 停止计时器
function stopTimer() {
    if (quizTimer) {
        clearInterval(quizTimer);
        quizTimer = null;
    }
}

// 获取已用时间
function getElapsedTime() {
    if (!startTime) return 0;
    return Math.floor((new Date() - startTime) / 1000);
}

// 格式化时间
function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}

// 查看详解
function reviewAnswers() {
    if (!currentQuiz || !currentQuiz.questions) {
        showToast('error', '没有可查看的答案');
        return;
    }
    
    // 创建答案详解界面
    const reviewHtml = createAnswerReviewHTML();
    
    // 显示答案详解
    const reviewContainer = document.createElement('div');
    reviewContainer.id = 'answerReview';
    reviewContainer.className = 'answer-review-overlay';
    reviewContainer.innerHTML = reviewHtml;
    
    document.body.appendChild(reviewContainer);
    
    // 添加关闭事件
    const closeBtn = reviewContainer.querySelector('.close-review');
    if (closeBtn) {
        closeBtn.onclick = () => {
            document.body.removeChild(reviewContainer);
        };
    }
}

// 创建答案详解HTML
function createAnswerReviewHTML() {
    let reviewContent = `
        <div class="review-modal">
            <div class="review-header">
                <h3><i class="fas fa-clipboard-list"></i> 答案详解</h3>
                <button class="close-review" title="关闭">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="review-content">
    `;
    
    currentQuiz.questions.forEach((question, index) => {
        const userAnswer = userAnswers[index];
        const isCorrect = checkAnswer(question, userAnswer);
        
        reviewContent += `
            <div class="question-review ${isCorrect ? 'correct' : 'incorrect'}">
                <div class="question-header">
                    <span class="question-number">第 ${index + 1} 题</span>
                    <span class="question-status">
                        <i class="fas fa-${isCorrect ? 'check-circle' : 'times-circle'}"></i>
                        ${isCorrect ? '正确' : '错误'}
                    </span>
                </div>
                
                <div class="question-content">
                    <h4>${question.question}</h4>
                    
                    ${createAnswerDisplay(question, userAnswer, isCorrect)}
                    
                    <div class="explanation">
                        <h5><i class="fas fa-lightbulb"></i> 解析：</h5>
                        <p>${question.explanation || '暂无解析'}</p>
                    </div>
                </div>
            </div>
        `;
    });
    
    reviewContent += `
            </div>
            <div class="review-footer">
                <button class="btn btn-primary close-review">
                    <i class="fas fa-check"></i> 知道了
                </button>
            </div>
        </div>
    `;
    
    return reviewContent;
}

// 创建答案显示内容
function createAnswerDisplay(question, userAnswer, isCorrect) {
    let answerHtml = '';
    
    switch (question.type) {
        case 'multiple-choice':
            answerHtml = `
                <div class="answer-options">
                    ${question.options.map((option, optIndex) => {
                        let optionClass = '';
                        if (optIndex === question.correctAnswer) {
                            optionClass = 'correct-option';
                        } else if (optIndex === userAnswer && !isCorrect) {
                            optionClass = 'wrong-option';
                        }
                        
                        return `
                            <div class="option ${optionClass}">
                                <span class="option-label">${String.fromCharCode(65 + optIndex)}.</span>
                                <span class="option-text">${option}</span>
                                ${optIndex === question.correctAnswer ? '<i class="fas fa-check"></i>' : ''}
                                ${optIndex === userAnswer && !isCorrect ? '<i class="fas fa-times"></i>' : ''}
                            </div>
                        `;
                    }).join('')}
                </div>
                <div class="answer-summary">
                    <p><strong>正确答案：</strong>${String.fromCharCode(65 + question.correctAnswer)}. ${question.options[question.correctAnswer]}</p>
                    <p><strong>您的答案：</strong>${userAnswer !== undefined ? String.fromCharCode(65 + userAnswer) + '. ' + question.options[userAnswer] : '未作答'}</p>
                </div>
            `;
            break;
            
        case 'fill-blank':
            answerHtml = `
                <div class="answer-summary">
                    <p><strong>正确答案：</strong><span class="correct-answer">${question.answer}</span></p>
                    <p><strong>您的答案：</strong><span class="${isCorrect ? 'correct-answer' : 'wrong-answer'}">${userAnswer || '未作答'}</span></p>
                </div>
            `;
            break;
            
        case 'essay':
            answerHtml = `
                <div class="essay-answers">
                    <div class="user-answer">
                        <h5>您的答案：</h5>
                        <div class="answer-text">${userAnswer || '未作答'}</div>
                    </div>
                    <div class="sample-answer">
                        <h5>参考答案：</h5>
                        <div class="answer-text">${question.sampleAnswer || '暂无参考答案'}</div>
                    </div>
                </div>
            `;
            break;
    }
    
    return answerHtml;
}

// 检查答案是否正确
function checkAnswer(question, userAnswer) {
    if (userAnswer === undefined || userAnswer === null || userAnswer === '') {
        return false;
    }
    
    switch (question.type) {
        case 'multiple-choice':
            return userAnswer === question.correctAnswer;
        case 'fill-blank':
            return userAnswer.toString().toLowerCase().trim() === question.answer.toLowerCase().trim();
        case 'essay':
            // 问答题暂时返回true，实际应该有更复杂的评分逻辑
            return true;
        default:
            return false;
    }
}

// 错题练习
function practiceWrongQuestions() {
    // 实现错题练习功能
    showToast('info', '错题练习功能开发中...');
}

// 开始新练习
function startNewQuiz() {
    resetQuizInterface();
}

// 重置练习界面
function resetQuizInterface() {
    const quizModes = document.getElementById('quizModes');
    const quizContainer = document.getElementById('quizContainer');
    const quizResult = document.getElementById('quizResult');
    
    if (quizModes) quizModes.style.display = 'grid';
    if (quizContainer) quizContainer.style.display = 'none';
    if (quizResult) quizResult.style.display = 'none';
    
    // 重置数据
    currentQuiz = null;
    currentQuestionIndex = 0;
    userAnswers = [];
    stopTimer();
}

// 初始化图表
function initializeCharts() {
    // 学习进度趋势图
    const progressCtx = document.getElementById('progressChart');
    if (progressCtx) {
        new Chart(progressCtx, {
            type: 'line',
            data: {
                labels: ['1月', '2月', '3月', '4月', '5月', '6月'],
                datasets: [{
                    label: '平均分数',
                    data: [65, 72, 78, 85, 82, 88],
                    borderColor: '#667eea',
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100
                    }
                }
            }
        });
    }
    
    // 知识点掌握情况图
    const knowledgeCtx = document.getElementById('knowledgeChart');
    if (knowledgeCtx) {
        new Chart(knowledgeCtx, {
            type: 'radar',
            data: {
                labels: ['数学', '英语', '物理', '化学', '历史', '地理'],
                datasets: [{
                    label: '掌握程度',
                    data: [85, 78, 92, 68, 75, 82],
                    borderColor: '#764ba2',
                    backgroundColor: 'rgba(118, 75, 162, 0.2)',
                    pointBackgroundColor: '#764ba2'
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    r: {
                        beginAtZero: true,
                        max: 100
                    }
                }
            }
        });
    }
}

// 更新分析数据
function updateAnalysisData() {
    // 更新统计数据
    const stats = {
        totalScore: 85.6,
        totalQuizzes: 24,
        studyStreak: 7,
        wrongQuestions: 12
    };
    
    Object.keys(stats).forEach(key => {
        const element = document.getElementById(key);
        if (element) {
            element.textContent = stats[key];
        }
    });
    
    // 加载错题列表
    loadWrongQuestions();
}

// 加载错题列表
function loadWrongQuestions() {
    const wrongQuestionsList = document.getElementById('wrongQuestionsList');
    if (!wrongQuestionsList) return;
    
    const wrongQuestions = [
        {
            question: '函数 f(x) = x² + 2x + 1 的最小值是？',
            subject: '数学',
            wrongAnswer: '1',
            correctAnswer: '0',
            date: '2024-01-15'
        },
        {
            question: 'HTTP协议默认端口号是？',
            subject: '计算机',
            wrongAnswer: '8080',
            correctAnswer: '80',
            date: '2024-01-14'
        }
    ];
    
    wrongQuestionsList.innerHTML = wrongQuestions.map(q => `
        <div class="wrong-question-item">
            <div class="question-info">
                <h4>${q.question}</h4>
                <div class="question-meta">
                    <span class="subject-tag">${q.subject}</span>
                    <span class="date">${q.date}</span>
                </div>
            </div>
            <div class="answer-comparison">
                <div class="wrong-answer">
                    <label>您的答案:</label>
                    <span class="text-danger">${q.wrongAnswer}</span>
                </div>
                <div class="correct-answer">
                    <label>正确答案:</label>
                    <span class="text-success">${q.correctAnswer}</span>
                </div>
            </div>
            <div class="question-actions">
                <button class="btn btn-sm btn-primary" onclick="practiceQuestion('${q.id}')">
                    <i class="fas fa-redo"></i> 重新练习
                </button>
                <button class="btn btn-sm btn-secondary" onclick="removeFromWrongQuestions('${q.id}')">
                    <i class="fas fa-check"></i> 已掌握
                </button>
            </div>
        </div>
    `).join('');
}

// 加载用户数据
function loadUserData() {
    // 模拟用户数据
    currentUser = {
        id: 1,
        name: '学习者',
        email: 'user@example.com',
        avatar: 'https://via.placeholder.com/120',
        level: 5,
        experience: 2400,
        nextLevelExp: 4000
    };
}

// 加载个人资料数据
function loadProfileData() {
    if (!currentUser) return;
    
    const userName = document.getElementById('userName');
    const userEmail = document.getElementById('userEmail');
    const avatarImg = document.getElementById('avatarImg');
    
    if (userName) userName.textContent = currentUser.name;
    if (userEmail) userEmail.textContent = currentUser.email;
    if (avatarImg) avatarImg.src = currentUser.avatar;
    
    // 更新等级进度
    const levelProgress = (currentUser.experience / currentUser.nextLevelExp) * 100;
    const levelFill = document.querySelector('.level-fill');
    if (levelFill) {
        levelFill.style.width = levelProgress + '%';
    }
}

// 显示个人资料标签页
function showProfileTab(tabName) {
    // 隐藏所有标签页
    document.querySelectorAll('.tab-pane').forEach(pane => {
        pane.classList.remove('active');
    });
    
    // 移除所有按钮的活跃状态
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // 显示目标标签页
    const targetPane = document.getElementById(tabName);
    if (targetPane) {
        targetPane.classList.add('active');
    }
    
    // 激活对应按钮
    event.target.classList.add('active');
}

// 优化的题目生成 - 解决数量少和速度慢的问题
async function generateQuiz(materialId) {
    console.log(`🚀 开始优化题目生成，材料ID: ${materialId}`);
    
    try {
        // 使用优化的生成器，默认生成25道题目
        const result = await optimizedQuizHandler.generateOptimizedQuiz(materialId, {
            questionType: 'mixed',
            count: 25, // 增加默认数量
            difficulty: 1,
            fastMode: true,
            useCache: true
        });
        
        if (result.success && result.questions) {
            // 保存生成的题目到全局变量
            currentQuiz = {
                mode: 'optimized',
                questions: result.questions.map(q => ({
                    type: q.type,
                    question: q.question,
                    options: q.options || [],
                    correctAnswer: q.correctAnswer,
                    answer: q.answer || q.correctAnswer,
                    sampleAnswer: q.sampleAnswer,
                    explanation: q.explanation,
                    difficulty: q.difficulty,
                    concept: q.concept
                })),
                totalQuestions: result.questions.length,
                metadata: result.metadata
            };
            
            console.log(`✅ 优化生成成功: ${currentQuiz.questions.length}道题目`);
            showSection('quiz');
            
            // 开始练习
            if (currentQuiz && currentQuiz.questions.length > 0) {
                startGeneratedQuiz();
            }
        } else {
            throw new Error('优化生成失败');
        }
    } catch (error) {
        console.error('优化生成失败:', error);
        showToast('error', '生成失败，正在尝试备用方案...');
        
        // 降级到快速生成
        try {
            const fallbackResult = await optimizedQuizHandler.generateQuickQuiz(materialId, { count: 20 });
            if (fallbackResult.success) {
                currentQuiz = {
                    mode: 'quick',
                    questions: fallbackResult.questions,
                    totalQuestions: fallbackResult.questions.length
                };
                showSection('quiz');
                startGeneratedQuiz();
            }
        } catch (fallbackError) {
            console.error('备用方案也失败:', fallbackError);
            showFallbackQuizOptions(materialId);
        }
    }
}

// 增强题目生成 - 使用优化版本
async function generateEnhancedQuiz(materialId, options = {}) {
    const {
        questionType = 'mixed',
        count = 30, // 增加默认数量
        difficulty = 2,
        useWebSearch = true,
        enhanceWithNLP = true,
        includeExplanations = true
    } = options;

    console.log(`🚀 开始增强题目生成: ${count}道题目`);
    
    try {
        // 使用优化的生成器进行增强生成
        const result = await optimizedQuizHandler.generateOptimizedQuiz(materialId, {
            questionType,
            count,
            difficulty,
            fastMode: false, // 增强模式不使用快速模式
            useCache: true
        });
        
        if (result.success && result.questions) {
            currentQuiz = {
                mode: 'enhanced',
                questions: result.questions.map(q => ({
                    type: q.type,
                    question: q.question,
                    options: q.options || [],
                    correctAnswer: q.correctAnswer || q.answer,
                    answer: q.answer,
                    sampleAnswer: q.sampleAnswer,
                    explanation: q.explanation,
                    concept: q.concept,
                    difficulty: q.difficulty,
                    enhanced: true
                })),
                totalQuestions: result.questions.length,
                metadata: result.metadata
            };
            
            showToast('success', `🎯 增强生成成功！共${result.questions.length}道高质量题目`);
            showSection('quiz');
            
            if (currentQuiz && currentQuiz.questions.length > 0) {
                startGeneratedQuiz();
            }
        } else {
            throw new Error('增强生成失败');
        }
    } catch (error) {
        console.error('增强生成失败:', error);
        showToast('error', '增强生成失败，正在降级到标准生成...');
        // 降级到标准生成
        return generateQuiz(materialId);
    }
}

// 智能题目生成（自动选择最佳方式）- 使用优化版本
async function generateSmartQuiz(materialId, options = {}) {
    const { count = 25 } = options;
    
    console.log(`🧠 开始智能生成: ${count}道题目`);
    
    try {
        // 使用优化的智能生成器
        const result = await optimizedQuizHandler.generateSmartQuiz(materialId, {
            count,
            ...options
        });
        
        if (result.success && result.questions) {
            currentQuiz = {
                mode: 'smart',
                questions: result.questions.map(q => ({
                    type: q.type,
                    question: q.question,
                    options: q.options || [],
                    correctAnswer: q.correctAnswer || q.answer,
                    answer: q.answer,
                    sampleAnswer: q.sampleAnswer,
                    explanation: q.explanation,
                    concept: q.concept,
                    difficulty: q.difficulty
                })),
                totalQuestions: result.questions.length,
                metadata: result.metadata
            };
            
            showSection('quiz');
            
            if (currentQuiz && currentQuiz.questions.length > 0) {
                startGeneratedQuiz();
            }
        } else {
            throw new Error('智能生成失败');
        }
    } catch (error) {
        console.error('智能生成失败:', error);
        showToast('error', '智能生成失败，使用标准生成...');
        return generateQuiz(materialId);
    }
}

// 批量题目生成 - 使用优化版本
async function generateBatchQuiz(materialId, batches = null) {
    const defaultBatches = [
        { type: 'multiple-choice', count: 20, difficulty: 1 }, // 增加数量
        { type: 'fill-blank', count: 12, difficulty: 2 },
        { type: 'essay', count: 8, difficulty: 2 }
    ];
    
    const batchConfig = batches || defaultBatches;
    const totalQuestions = batchConfig.reduce((sum, batch) => sum + batch.count, 0);
    
    console.log(`📦 开始批量生成: ${batchConfig.length}个批次，共${totalQuestions}道题目`);
    
    try {
        // 使用优化的批量生成器
        const result = await optimizedQuizHandler.generateBatchQuiz(materialId, batchConfig);
        
        if (result.success && result.questions) {
            currentQuiz = {
                mode: 'batch',
                questions: result.questions.map(q => ({
                    type: q.type,
                    question: q.question,
                    options: q.options || [],
                    correctAnswer: q.correctAnswer || q.answer,
                    answer: q.answer,
                    sampleAnswer: q.sampleAnswer,
                    explanation: q.explanation,
                    concept: q.concept,
                    difficulty: q.difficulty,
                    enhanced: q.enhanced || false
                })),
                totalQuestions: result.questions.length,
                batchInfo: result.summary
            };
            
            showSection('quiz');
            
            if (currentQuiz && currentQuiz.questions.length > 0) {
                startGeneratedQuiz();
            }
        } else {
            throw new Error('批量生成失败');
        }
    } catch (error) {
        console.error('批量生成失败:', error);
        showToast('error', '批量生成失败，正在降级到标准生成...');
        // 降级到标准生成
        return generateQuiz(materialId);
    }
}

// 显示题目生成选项
function showQuizGenerationOptions(materialId) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'flex';
    
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3><i class="fas fa-cogs"></i> 选择题目生成方式</h3>
                <button class="modal-close" onclick="this.closest('.modal').remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                <div class="generation-options">
                    <div class="option-card" onclick="generateSmartQuiz('${materialId}'); this.closest('.modal').remove();">
                        <div class="option-icon">🧠</div>
                        <h4>智能生成</h4>
                        <p>AI自动分析文档复杂度，选择最佳生成方式</p>
                        <div class="option-features">
                            <span class="feature-tag">自动优化</span>
                            <span class="feature-tag">智能选择</span>
                        </div>
                    </div>
                    
                    <div class="option-card" onclick="generateEnhancedQuiz('${materialId}'); this.closest('.modal').remove();">
                        <div class="option-icon">🚀</div>
                        <h4>增强生成</h4>
                        <p>集成网络搜索和NLP分析，生成高质量题目</p>
                        <div class="option-features">
                            <span class="feature-tag">网络搜索</span>
                            <span class="feature-tag">NLP分析</span>
                            <span class="feature-tag">高质量</span>
                        </div>
                    </div>
                    
                    <div class="option-card" onclick="generateBatchQuiz('${materialId}'); this.closest('.modal').remove();">
                        <div class="option-icon">📦</div>
                        <h4>批量生成</h4>
                        <p>生成多种类型和难度的题目组合</p>
                        <div class="option-features">
                            <span class="feature-tag">多类型</span>
                            <span class="feature-tag">多难度</span>
                        </div>
                    </div>
                    
                    <div class="option-card" onclick="generateQuiz('${materialId}'); this.closest('.modal').remove();">
                        <div class="option-icon">⚡</div>
                        <h4>快速生成</h4>
                        <p>使用基础AI快速生成题目</p>
                        <div class="option-features">
                            <span class="feature-tag">快速</span>
                            <span class="feature-tag">稳定</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // 点击模态框外部关闭
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

// 开始生成的题目练习
function startGeneratedQuiz() {
    const quizModes = document.getElementById('quizModes');
    const quizContainer = document.getElementById('quizContainer');
    
    if (quizModes && quizContainer) {
        quizModes.style.display = 'none';
        quizContainer.style.display = 'block';
        
        // 初始化练习
        currentQuestionIndex = 0;
        userAnswers = [];
        startTime = new Date();
        
        // 更新界面
        updateQuizInterface();
        startTimer();
    }
}

// 显示备用练习选项
function showFallbackQuizOptions(materialId) {
    const fallbackHtml = `
        <div class="fallback-options" style="margin-top: 20px; padding: 20px; background: #f8f9fa; border-radius: 8px;">
            <h4>🤖 AI服务暂时不可用</h4>
            <p>您可以选择以下备用方案：</p>
            <div class="fallback-buttons" style="display: flex; gap: 10px; flex-wrap: wrap;">
                <button class="btn btn-primary" onclick="startSampleQuiz('mixed')">
                    <i class="fas fa-play"></i> 开始示例练习
                </button>
                <button class="btn btn-secondary" onclick="checkAIService()">
                    <i class="fas fa-sync"></i> 重新检测AI服务
                </button>
                <button class="btn btn-info" onclick="showAISetupGuide()">
                    <i class="fas fa-question-circle"></i> AI配置帮助
                </button>
            </div>
        </div>
    `;
    
    const materialsGrid = document.getElementById('materialsGrid');
    if (materialsGrid) {
        const existingFallback = materialsGrid.querySelector('.fallback-options');
        if (existingFallback) {
            existingFallback.remove();
        }
        materialsGrid.insertAdjacentHTML('afterend', fallbackHtml);
    }
}

// 开始示例练习
function startSampleQuiz(mode) {
    // 移除备用选项
    const fallbackOptions = document.querySelector('.fallback-options');
    if (fallbackOptions) {
        fallbackOptions.remove();
    }
    
    // 使用示例题目
    currentQuiz = {
        mode: mode,
        questions: generateSampleQuestions(mode),
        totalQuestions: 15
    };
    
    showSection('quiz');
    startGeneratedQuiz();
}

// 生成示例题目
function generateSampleQuestions(mode) {
    const sampleQuestions = [
        {
            type: 'multiple-choice',
            question: '以下哪个是正确的学习方法？',
            options: ['死记硬背', '理解记忆', '不复习', '随便学学'],
            correctAnswer: 1,
            explanation: '理解记忆是最有效的学习方法，能够帮助长期记忆和灵活运用。'
        },
        {
            type: 'fill-blank',
            question: '有效学习需要制定合理的 ______ 计划。',
            answer: '学习',
            explanation: '制定学习计划有助于提高学习效率和效果。'
        },
        {
            type: 'multiple-choice',
            question: '复习的最佳时机是？',
            options: ['考试前一天', '学习后立即复习', '一周后', '从不复习'],
            correctAnswer: 1,
            explanation: '根据艾宾浩斯遗忘曲线，学习后立即复习效果最好。'
        },
        {
            type: 'essay',
            question: '请简述如何提高学习效率？',
            sampleAnswer: '提高学习效率可以通过以下方法：1.制定明确的学习目标；2.选择合适的学习环境；3.采用多种学习方法；4.定期复习和总结；5.保持良好的作息习惯。',
            explanation: '这是一个开放性问题，需要结合个人经验和学习理论来回答。'
        },
        {
            type: 'multiple-choice',
            question: '下列哪种学习工具最有助于知识整理？',
            options: ['思维导图', '游戏', '聊天', '看电视'],
            correctAnswer: 0,
            explanation: '思维导图能够帮助整理知识结构，提高学习效果。'
        },
        {
            type: 'multiple-choice',
            question: '学习时最重要的是什么？',
            options: ['速度', '专注力', '时间长度', '环境安静'],
            correctAnswer: 1,
            explanation: '专注力是学习效果的关键因素，比学习时间长度更重要。'
        },
        {
            type: 'fill-blank',
            question: '记忆分为短期记忆和 ______ 记忆两种类型。',
            answer: '长期',
            explanation: '记忆系统包括短期记忆和长期记忆，长期记忆是学习的最终目标。'
        },
        {
            type: 'multiple-choice',
            question: '以下哪种方法最有助于提高记忆效果？',
            options: ['重复阅读', '联想记忆', '机械背诵', '快速浏览'],
            correctAnswer: 1,
            explanation: '联想记忆通过建立知识间的联系，能显著提高记忆效果和持久性。'
        },
        {
            type: 'fill-blank',
            question: '学习新知识时，应该先建立 ______ 框架。',
            answer: '知识',
            explanation: '建立知识框架有助于理解和记忆新信息，提高学习效率。'
        },
        {
            type: 'multiple-choice',
            question: '哪种学习策略最适合理解复杂概念？',
            options: ['死记硬背', '分解学习', '跳跃学习', '被动接受'],
            correctAnswer: 1,
            explanation: '分解学习将复杂概念分解为简单部分，逐步理解和掌握。'
        },
        {
            type: 'essay',
            question: '描述一种你认为有效的复习方法。',
            sampleAnswer: '间隔重复法是一种有效的复习方法。它基于遗忘曲线原理，在即将遗忘时进行复习，能够最大化记忆效果。具体做法是：第一次学习后1天复习，然后3天后、7天后、15天后分别复习，逐渐延长间隔时间。',
            explanation: '这道题考查对学习方法的理解和应用能力。'
        },
        {
            type: 'multiple-choice',
            question: '学习效果评估的最佳方式是？',
            options: ['自我感觉', '测试检验', '时间统计', '他人评价'],
            correctAnswer: 1,
            explanation: '测试检验是最客观有效的学习效果评估方式，能准确反映掌握程度。'
        },
        {
            type: 'fill-blank',
            question: '主动学习比 ______ 学习更有效。',
            answer: '被动',
            explanation: '主动学习让学习者积极参与，比被动接受信息的效果更好。'
        },
        {
            type: 'multiple-choice',
            question: '以下哪个因素对学习动机影响最大？',
            options: ['外部奖励', '内在兴趣', '他人期望', '竞争压力'],
            correctAnswer: 1,
            explanation: '内在兴趣是最持久和有效的学习动机，能够维持长期的学习热情。'
        },
        {
            type: 'essay',
            question: '如何克服学习中的拖延症？',
            sampleAnswer: '克服学习拖延症的方法包括：1.设定明确具体的目标；2.将大任务分解为小步骤；3.使用番茄工作法等时间管理技巧；4.创造良好的学习环境；5.建立奖励机制；6.寻找学习伙伴互相监督。',
            explanation: '拖延症是学习中的常见问题，需要系统性的方法来解决。'
        }
    ];
    
    // 根据模式返回相应数量的题目
    return sampleQuestions;
}

// 检查AI服务状态
async function checkAIService() {
    showLoading('正在检测AI服务状态...');
    
    try {
        // 尝试调用一个简单的API来检测服务状态
        const response = await fetch('/api/quiz/health-check', {
            method: 'GET',
            timeout: 5000
        });
        
        hideLoading();
        
        if (response.ok) {
            showToast('success', 'AI服务正常，请重试生成题目');
            // 移除备用选项
            const fallbackOptions = document.querySelector('.fallback-options');
            if (fallbackOptions) {
                fallbackOptions.remove();
            }
        } else {
            showToast('warning', 'AI服务暂时不可用，建议使用示例练习');
        }
    } catch (error) {
        hideLoading();
        showToast('error', 'AI服务检测失败，请检查配置');
    }
}

// 显示AI配置指南
function showAISetupGuide() {
    const guideHtml = `
        <div class="ai-setup-guide" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 1000; display: flex; align-items: center; justify-content: center;">
            <div style="background: white; padding: 30px; border-radius: 10px; max-width: 600px; max-height: 80vh; overflow-y: auto;">
                <h3>🤖 AI服务配置指南</h3>
                <div style="text-align: left;">
                    <h4>推荐方案：Ollama</h4>
                    <ol>
                        <li>下载安装 Ollama：<a href="https://ollama.ai" target="_blank">https://ollama.ai</a></li>
                        <li>打开终端/命令提示符</li>
                        <li>运行：<code>ollama pull llama2:7b</code></li>
                        <li>运行：<code>ollama serve</code></li>
                        <li>确保服务运行在 http://localhost:11434</li>
                    </ol>
                    
                    <h4>其他选择：</h4>
                    <ul>
                        <li><strong>LM Studio</strong>：图形化界面，易于使用</li>
                        <li><strong>GPT4All</strong>：开源本地AI工具</li>
                    </ul>
                    
                    <h4>配置检查：</h4>
                    <p>确保 .env 文件中的 AI_API_ENDPOINT 配置正确：</p>
                    <code>AI_API_ENDPOINT=http://localhost:11434/api/generate</code>
                </div>
                
                <div style="margin-top: 20px; text-align: center;">
                    <button class="btn btn-primary" onclick="closeAIGuide()">我知道了</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', guideHtml);
}

// 关闭AI指南
function closeAIGuide() {
    const guide = document.querySelector('.ai-setup-guide');
    if (guide) {
        guide.remove();
    }
}

// 删除材料
async function deleteMaterial(materialId) {
    if (!confirm('确定要删除这个材料吗？')) return;
    
    try {
        const response = await fetch(`/api/materials/${materialId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            showToast('success', '材料删除成功！');
            loadMaterials();
        } else {
            throw new Error('删除失败');
        }
    } catch (error) {
        showToast('error', '删除失败：' + error.message);
    }
}

// 显示加载动画
function showLoading(message = 'AI正在处理中...') {
    const loadingOverlay = document.getElementById('loadingOverlay');
    const loadingText = loadingOverlay.querySelector('p');
    
    if (loadingText) loadingText.textContent = message;
    if (loadingOverlay) {
        loadingOverlay.style.display = 'flex';
        console.log('显示加载动画:', message);
    }
}

// 隐藏加载动画
function hideLoading() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        loadingOverlay.style.display = 'none';
        console.log('隐藏加载动画');
    }
}

// 安全的加载动画控制 - 带超时保护
function showLoadingWithTimeout(message = 'AI正在处理中...', timeout = 10000) {
    showLoading(message);
    
    // 设置超时自动隐藏，防止一直显示
    setTimeout(() => {
        hideLoading();
        console.log('加载动画超时自动隐藏');
    }, timeout);
}

// 显示Toast通知
function showToast(type, message) {
    const toast = document.getElementById('toast');
    const toastIcon = toast.querySelector('.toast-icon');
    const toastMessage = toast.querySelector('.toast-message');
    
    // 设置图标和样式
    toast.className = `toast ${type}`;
    
    const icons = {
        success: 'fas fa-check-circle',
        error: 'fas fa-exclamation-circle',
        info: 'fas fa-info-circle',
        warning: 'fas fa-exclamation-triangle'
    };
    
    toastIcon.className = `toast-icon ${icons[type] || icons.info}`;
    toastMessage.textContent = message;
    
    // 显示Toast
    toast.classList.add('show');
    
    // 3秒后自动隐藏
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// 工具函数：防抖
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// 工具函数：节流
function throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    }
}

// 显示上传提示
function showUploadPrompt(mode) {
    const modeNames = {
        'fill-blank': '填空题练习',
        'multiple-choice': '选择题练习', 
        'essay': '问答题练习',
        'mock-exam': '模拟考试'
    };
    
    const modeName = modeNames[mode] || '练习';
    
    if (confirm(`要开始 ${modeName}，请先上传学习材料。

AI 将根据您的材料生成个性化题目。

是否现在去上传材料？`)) {
        showSection('upload');
    }
}

// 开始生成的题目练习（修改版本，兼容新的数据结构）
function startGeneratedQuiz() {
    if (!currentQuiz || !currentQuiz.questions || currentQuiz.questions.length === 0) {
        showToast('error', '没有可用的题目');
        return;
    }
    
    // 初始化练习状态
    currentQuestionIndex = 0;
    userAnswers = [];
    startTime = new Date();
    
    // 更新界面
    updateQuizInterface();
    startTimer();
    
    // 更新题目标题
    const quizTitle = document.getElementById('quizTitle');
    if (quizTitle && currentQuiz.materialName) {
        const modeNames = {
            'fill-blank': '填空题练习',
            'multiple-choice': '选择题练习', 
            'essay': '问答题练习',
            'mock-exam': '模拟考试',
            'mixed': '综合练习'
        };
        const modeName = modeNames[currentQuiz.mode] || '练习';
        quizTitle.textContent = `${modeName} - 基于《${currentQuiz.materialName}》`;
    }
}

// 显示备用练习选项
function showFallbackQuizOptions(materialId) {
    const fallbackHtml = `
        <div class="fallback-options">
            <h3>🤖 AI 服务暂时不可用</h3>
            <p>您可以选择以下选项：</p>
            <div class="fallback-buttons">
                <button class="btn btn-primary" onclick="startSampleQuiz()">
                    <i class="fas fa-play"></i> 使用示例题目练习
                </button>
                <button class="btn btn-secondary" onclick="checkAIService()">
                    <i class="fas fa-sync"></i> 重新检查 AI 服务
                </button>
                <button class="btn btn-info" onclick="showAISetupGuide()">
                    <i class="fas fa-question-circle"></i> AI 设置指南
                </button>
            </div>
        </div>
    `;
    
    const quizModes = document.getElementById('quizModes');
    if (quizModes) {
        quizModes.innerHTML = fallbackHtml;
    }
}

// 开始示例题目练习
function startSampleQuiz() {
    const quizModes = document.getElementById('quizModes');
    const quizContainer = document.getElementById('quizContainer');
    
    if (quizModes && quizContainer) {
        quizModes.style.display = 'none';
        quizContainer.style.display = 'block';
        initializeQuiz('mixed'); // 使用混合模式的示例题目
    }
}

// 检查 AI 服务状态
async function checkAIService() {
    showLoading('检查 AI 服务状态...');
    
    try {
        const response = await fetch('/api/ai/status');
        const result = await response.json();
        
        hideLoading();
        
        if (result.success && result.data.available) {
            showToast('success', 'AI 服务已恢复正常！');
            // 重新加载练习模式选择界面
            location.reload();
        } else {
            showToast('warning', 'AI 服务仍然不可用: ' + (result.data.error || '未知错误'));
        }
    } catch (error) {
        hideLoading();
        showToast('error', '无法连接到服务器');
    }
}

// 显示 AI 设置指南
function showAISetupGuide() {
    const guideHtml = `
        <div class="ai-guide-overlay" id="aiGuideOverlay">
            <div class="ai-guide-modal">
                <div class="ai-guide-header">
                    <h3>🤖 AI 服务设置指南</h3>
                    <button class="close-btn" onclick="closeAIGuide()">×</button>
                </div>
                <div class="ai-guide-content">
                    <h4>推荐方案：Ollama</h4>
                    <ol>
                        <li>下载安装 Ollama：<a href="https://ollama.ai" target="_blank">https://ollama.ai</a></li>
                        <li>打开终端/命令提示符</li>
                        <li>运行：<code>ollama pull qwen2.5:7b</code></li>
                        <li>运行：<code>ollama serve</code></li>
                        <li>确保服务运行在 http://localhost:11434</li>
                    </ol>
                    <div class="guide-note">
                        <p><strong>注意：</strong>首次下载模型需要约 4GB 存储空间和稳定的网络连接。</p>
                    </div>
                </div>
                <div class="ai-guide-footer">
                    <button class="btn btn-primary" onclick="checkAIService()">
                        <i class="fas fa-sync"></i> 重新检查服务
                    </button>
                    <button class="btn btn-secondary" onclick="closeAIGuide()">关闭</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', guideHtml);
}

// 关闭 AI 设置指南
function closeAIGuide() {
    const overlay = document.getElementById('aiGuideOverlay');
    if (overlay) {
        overlay.remove();
    }
}

// 导出函数供全局使用
window.showSection = showSection;
window.startQuiz = startQuiz;
window.selectOption = selectOption;
window.updateAnswer = updateAnswer;
window.previousQuestion = previousQuestion;
window.nextQuestion = nextQuestion;
window.submitQuiz = submitQuiz;
window.reviewAnswers = reviewAnswers;
window.practiceWrongQuestions = practiceWrongQuestions;
window.startNewQuiz = startNewQuiz;
window.showProfileTab = showProfileTab;
window.generateQuiz = generateQuiz;
window.deleteMaterial = deleteMaterial;
window.startSampleQuiz = startSampleQuiz;
window.checkAIService = checkAIService;
window.showAISetupGuide = showAISetupGuide;
window.closeAIGuide = closeAIGuide;
window.showUploadPrompt = showUploadPrompt;
window.startGeneratedQuiz = startGeneratedQuiz;