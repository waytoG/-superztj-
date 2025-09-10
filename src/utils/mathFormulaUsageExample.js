// 数学公式处理器使用示例 - 解决显示问题和全面问题生成

const MathFormulaHandler = require('./mathFormulaHandler');

class MathFormulaUsageExample {
    constructor() {
        this.mathHandler = new MathFormulaHandler();
    }

    /**
     * 示例1: 解决网页端显示$符号的问题
     */
    demonstrateDisplayIssue() {
        console.log('\n=== 示例1: 解决网页端显示$符号的问题 ===');
        
        // 原始包含LaTeX公式的文本
        const textWithLatex = '这是一个二次方程: $ax^2 + bx + c = 0$，其中判别式为 $\\Delta = b^2 - 4ac$';
        
        console.log('原始文本:', textWithLatex);
        
        // 问题：直接显示会在网页上看到$符号
        console.log('\n❌ 问题：直接显示LaTeX会看到$符号');
        
        // 解决方案1：转换为HTML格式
        const htmlResult = this.mathHandler.processMathFormulas(textWithLatex, {
            renderMode: 'html',
            autoWrap: false,
            preserveOriginal: true
        });
        
        console.log('\n✅ 解决方案1 - HTML格式:');
        console.log(htmlResult);
        
        // 解决方案2：转换为Unicode符号
        const unicodeResult = this.mathHandler.processMathFormulas(textWithLatex, {
            renderMode: 'unicode',
            autoWrap: false,
            preserveOriginal: true
        });
        
        console.log('\n✅ 解决方案2 - Unicode格式:');
        console.log(unicodeResult);
        
        // 解决方案3：基本清理（保持原格式但修复编码）
        const cleanResult = this.mathHandler.processMathFormulas(textWithLatex, {
            renderMode: 'basic',
            autoWrap: false,
            preserveOriginal: true
        });
        
        console.log('\n✅ 解决方案3 - 基本清理:');
        console.log(cleanResult);
    }

    /**
     * 示例2: 处理题目中的数学公式
     */
    demonstrateQuestionProcessing() {
        console.log('\n=== 示例2: 处理题目中的数学公式 ===');
        
        const sampleQuestions = [
            {
                question: '求解方程 $x^2 - 5x + 6 = 0$ 的根',
                options: [
                    '$x = 2, x = 3$',
                    '$x = 1, x = 6$', 
                    '$x = -2, x = -3$',
                    '$x = 0, x = 5$'
                ],
                answer: '$x = 2, x = 3$',
                explanation: '使用求根公式: $x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}$'
            },
            {
                question: '计算积分 $\\int_0^1 x^2 dx$',
                options: ['$\\frac{1}{3}$', '$\\frac{1}{2}$', '$1$', '$\\frac{2}{3}$'],
                answer: '$\\frac{1}{3}$',
                explanation: '$\\int x^2 dx = \\frac{x^3}{3} + C$，代入上下限得到 $\\frac{1}{3}$'
            }
        ];
        
        console.log('原始题目:');
        console.log(JSON.stringify(sampleQuestions[0], null, 2));
        
        // 使用HTML模式处理题目
        const processedQuestions = this.mathHandler.processQuestionsMath(sampleQuestions, {
            renderMode: 'html'
        });
        
        console.log('\n✅ 处理后的题目 (HTML格式):');
        console.log(JSON.stringify(processedQuestions[0], null, 2));
    }

    /**
     * 示例3: 生成全面的问题覆盖策略
     */
    demonstrateComprehensiveQuestionGeneration() {
        console.log('\n=== 示例3: 生成全面的问题覆盖策略 ===');
        
        // 模拟一个完整的文档内容
        const documentContent = `
第一章 线性代数基础

线性代数是数学的一个重要分支，主要研究向量空间、线性变换和矩阵理论。

1.1 向量和向量空间
向量是具有大小和方向的量。在n维空间中，向量可以表示为 $\\vec{v} = (v_1, v_2, ..., v_n)$。
向量的长度（模）定义为 $|\\vec{v}| = \\sqrt{v_1^2 + v_2^2 + ... + v_n^2}$。

两个向量的点积定义为：$\\vec{a} \\cdot \\vec{b} = |\\vec{a}||\\vec{b}|\\cos\\theta$
其中 $\\theta$ 是两向量之间的夹角。

1.2 矩阵运算
矩阵是按矩形阵列排列的数的集合。对于 $m \\times n$ 矩阵 $A$，其元素记为 $a_{ij}$。

矩阵乘法：$(AB)_{ij} = \\sum_{k=1}^{n} a_{ik}b_{kj}$

矩阵的行列式：对于 $2 \\times 2$ 矩阵，$\\det(A) = a_{11}a_{22} - a_{12}a_{21}$

第二章 特征值和特征向量

特征值问题是线性代数中的核心概念之一。

2.1 特征值的定义
对于 $n \\times n$ 矩阵 $A$，如果存在非零向量 $\\vec{v}$ 和标量 $\\lambda$，使得：
$A\\vec{v} = \\lambda\\vec{v}$

则称 $\\lambda$ 为矩阵 $A$ 的特征值，$\\vec{v}$ 为对应的特征向量。

2.2 特征多项式
特征多项式定义为：$p(\\lambda) = \\det(A - \\lambda I)$
其中 $I$ 是单位矩阵。

第三章 线性变换

线性变换是保持向量加法和标量乘法的映射。

3.1 线性变换的性质
设 $T: V \\to W$ 是线性变换，则：
1. $T(\\vec{u} + \\vec{v}) = T(\\vec{u}) + T(\\vec{v})$
2. $T(c\\vec{v}) = cT(\\vec{v})$

3.2 线性变换的矩阵表示
每个线性变换都可以用矩阵来表示。变换矩阵的列向量是基向量的像。
        `;
        
        console.log('文档长度:', documentContent.length, '字符');
        
        // 生成全面的问题策略
        const strategy = this.mathHandler.generateComprehensiveQuestionStrategy(documentContent, {
            questionCount: 15,
            difficultyLevels: ['easy', 'medium', 'hard'],
            questionTypes: ['multiple_choice', 'short_answer', 'essay'],
            coverageMode: 'comprehensive'
        });
        
        console.log('\n✅ 全面问题生成策略:');
        console.log('总问题数:', strategy.totalQuestions);
        console.log('识别的章节数:', strategy.sections.length);
        
        console.log('\n📊 章节分布:');
        strategy.sections.forEach((section, index) => {
            console.log(`${index + 1}. ${section.title} (长度: ${section.length}, 包含数学: ${section.hasMath})`);
        });
        
        console.log('\n📊 问题分布:');
        strategy.distribution.forEach(dist => {
            console.log(`- ${dist.section}: ${dist.questionCount}题 (${(dist.ratio * 100).toFixed(1)}%)`);
        });
        
        console.log('\n📊 难度分布:');
        Object.entries(strategy.difficultyDistribution).forEach(([level, count]) => {
            console.log(`- ${level}: ${count}题`);
        });
        
        console.log('\n📊 题型分布:');
        Object.entries(strategy.typeDistribution).forEach(([type, count]) => {
            console.log(`- ${type}: ${count}题`);
        });
        
        console.log('\n📊 覆盖区域:');
        strategy.coverageAreas.slice(0, 5).forEach((area, index) => {
            console.log(`${index + 1}. ${area.type}: ${area.title} (优先级: ${area.priority})`);
        });
    }

    /**
     * 示例4: 不同渲染模式的对比
     */
    demonstrateRenderingModes() {
        console.log('\n=== 示例4: 不同渲染模式的对比 ===');
        
        const mathText = '求解不等式 $x^2 - 3x + 2 ≤ 0$，其中 $x ∈ ℝ$';
        
        console.log('原始文本:', mathText);
        
        // LaTeX模式（保持LaTeX格式）
        const latexMode = this.mathHandler.processMathFormulas(mathText, {
            renderMode: 'latex',
            autoWrap: false
        });
        console.log('\nLaTeX模式:', latexMode);
        
        // HTML模式（转换为HTML标签）
        const htmlMode = this.mathHandler.processMathFormulas(mathText, {
            renderMode: 'html',
            autoWrap: false
        });
        console.log('HTML模式:', htmlMode);
        
        // Unicode模式（转换为Unicode符号）
        const unicodeMode = this.mathHandler.processMathFormulas(mathText, {
            renderMode: 'unicode',
            autoWrap: false
        });
        console.log('Unicode模式:', unicodeMode);
        
        // 基本模式（只做清理）
        const basicMode = this.mathHandler.processMathFormulas(mathText, {
            renderMode: 'basic'
        });
        console.log('基本模式:', basicMode);
    }

    /**
     * 示例5: 处理编码问题
     */
    demonstrateEncodingFixes() {
        console.log('\n=== 示例5: 处理编码问题 ===');
        
        // 模拟有编码问题的文本
        const encodedText = 'è®¡ç®—å‡½æ•° f(x) = xÂ² + 2x - 3 çš„æœ€å°å€¼';
        
        console.log('有编码问题的文本:', encodedText);
        
        const fixedText = this.mathHandler.processMathFormulas(encodedText, {
            renderMode: 'basic'
        });
        
        console.log('修复后的文本:', fixedText);
    }

    /**
     * 运行所有示例
     */
    runAllExamples() {
        console.log('🚀 数学公式处理器使用示例');
        console.log('版本:', this.mathHandler.getProcessingStats().version);
        
        this.demonstrateDisplayIssue();
        this.demonstrateQuestionProcessing();
        this.demonstrateComprehensiveQuestionGeneration();
        this.demonstrateRenderingModes();
        this.demonstrateEncodingFixes();
        
        console.log('\n✅ 所有示例运行完成！');
        console.log('\n📋 使用建议:');
        console.log('1. 对于网页显示，推荐使用HTML模式避免显示$符号');
        console.log('2. 使用generateComprehensiveQuestionStrategy确保全面覆盖文档内容');
        console.log('3. 根据前端渲染能力选择合适的渲染模式');
        console.log('4. 在public/css/math-formulas.css中添加了配套的CSS样式');
    }
}

// 如果直接运行此文件，执行示例
if (require.main === module) {
    const example = new MathFormulaUsageExample();
    example.runAllExamples();
}

module.exports = MathFormulaUsageExample;