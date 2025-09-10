// 快速数学公式修复测试

const MathFormulaHandler = require('./mathFormulaHandler');

async function quickTest() {
    console.log('🚀 快速测试数学公式修复效果');
    
    const mathHandler = new MathFormulaHandler();
    
    // 测试1: 数学公式处理
    console.log('\n=== 测试1: 数学公式处理 ===');
    
    const testQuestions = [
        {
            question: "函数f(x)在点x₀处的极限定义为：$\\lim_{x \\to x_0} f(x) = L$，请解释这个定义。",
            options: ["A. 当x接近x₀时", "B. 当x等于x₀时", "C. 当x远离x₀时"],
            answer: "A"
        },
        {
            question: "导数的定义是：$f'(x_0) = \\lim_{h \\to 0} \\frac{f(x_0 + h) - f(x_0)}{h}$",
            answer: "这是导数的基本定义"
        },
        {
            question: "积分公式：$\\int x^n dx = \\frac{x^{n+1}}{n+1} + C$，其中n≠-1",
            options: ["A. 正确", "B. 错误"],
            answer: "A"
        }
    ];

    console.log('原始题目（包含$符号）:');
    testQuestions.forEach((q, i) => {
        console.log(`${i+1}. ${q.question}`);
    });

    // 处理数学公式
    const processedQuestions = mathHandler.processQuestionsMath(testQuestions, {
        renderMode: 'html',
        autoWrap: false,
        preserveOriginal: true
    });

    console.log('\n处理后题目（HTML格式，无$符号）:');
    processedQuestions.forEach((q, i) => {
        console.log(`${i+1}. ${q.question}`);
    });

    // 检查是否还有$符号
    let hasLatexSymbols = false;
    processedQuestions.forEach(q => {
        const questionText = JSON.stringify(q);
        if (questionText.includes('$') && !questionText.includes('class="')) {
            hasLatexSymbols = true;
        }
    });

    console.log(`\n✅ 修复结果: ${hasLatexSymbols ? '失败 - 仍有$符号' : '成功 - 无$符号显示'}`);

    // 测试2: 全面覆盖策略
    console.log('\n=== 测试2: 全面覆盖策略 ===');
    
    const testDocument = `
第一章 线性代数
1.1 向量空间的定义
1.2 线性变换
1.3 矩阵运算

第二章 特征值理论  
2.1 特征值定义
2.2 特征多项式
2.3 对角化

第三章 二次型
3.1 二次型定义
3.2 标准形
3.3 正定性
    `;

    const strategy = mathHandler.generateComprehensiveQuestionStrategy(testDocument, {
        questionCount: 9,
        difficultyLevels: ['easy', 'medium', 'hard'],
        questionTypes: ['multiple_choice', 'short_answer', 'essay']
    });

    console.log(`策略生成: ${strategy.sections.length}个章节`);
    console.log('章节分布:');
    strategy.distribution.forEach(dist => {
        console.log(`- ${dist.section.substring(0, 20)}...: ${dist.questionCount}题 (${(dist.ratio * 100).toFixed(1)}%)`);
    });

    const coverageRate = (strategy.sections.length / 9) * 100; // 9个小节
    console.log(`\n✅ 覆盖结果: ${coverageRate > 80 ? '成功' : '失败'} - 覆盖率 ${coverageRate.toFixed(1)}%`);

    return {
        mathFormulaFixed: !hasLatexSymbols,
        comprehensiveCoverage: coverageRate > 80,
        coverageRate
    };
}

// 运行测试
if (require.main === module) {
    quickTest().then(result => {
        console.log('\n🎯 测试总结:');
        console.log(`数学公式修复: ${result.mathFormulaFixed ? '✅ 成功' : '❌ 失败'}`);
        console.log(`全面覆盖修复: ${result.comprehensiveCoverage ? '✅ 成功' : '❌ 失败'}`);
        
        if (result.mathFormulaFixed && result.comprehensiveCoverage) {
            console.log('\n🎉 所有问题已修复！');
            console.log('📋 使用说明:');
            console.log('1. 在生成题目时使用 mathRenderMode: "html"');
            console.log('2. 在前端引入 /css/math-formulas.css');
            console.log('3. 使用 coverageMode: "comprehensive" 确保全面覆盖');
        }
    }).catch(console.error);
}

module.exports = quickTest;