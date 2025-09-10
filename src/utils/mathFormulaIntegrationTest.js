// 数学公式处理集成测试 - 验证问题修复效果

const AIService = require('../services/aiService');
const MathFormulaHandler = require('./mathFormulaHandler');

class MathFormulaIntegrationTest {
    constructor() {
        this.aiService = new AIService();
        this.mathHandler = new MathFormulaHandler();
    }

    /**
     * 测试数学公式显示问题修复
     */
    async testMathFormulaDisplayFix() {
        console.log('\n=== 测试1: 数学公式显示问题修复 ===');
        
        // 包含数学公式的测试文档
        const testDocument = `
第一章 微积分基础

1.1 极限的定义
函数f(x)在点x₀处的极限定义为：当x趋近于x₀时，如果存在实数L，使得对于任意ε > 0，
都存在δ > 0，当0 < |x - x₀| < δ时，有|f(x) - L| < ε，则称L为函数f(x)在x₀处的极限，
记作：$\\lim_{x \\to x_0} f(x) = L$

1.2 导数的定义
函数f(x)在点x₀处的导数定义为：
$f'(x_0) = \\lim_{h \\to 0} \\frac{f(x_0 + h) - f(x_0)}{h}$

常见导数公式：
- $(x^n)' = nx^{n-1}$
- $(\\sin x)' = \\cos x$
- $(\\cos x)' = -\\sin x$
- $(e^x)' = e^x$
- $(\\ln x)' = \\frac{1}{x}$

1.3 积分的定义
定积分的定义：$\\int_a^b f(x)dx = \\lim_{n \\to \\infty} \\sum_{i=1}^n f(x_i)\\Delta x$

基本积分公式：
- $\\int x^n dx = \\frac{x^{n+1}}{n+1} + C$ (n ≠ -1)
- $\\int \\sin x dx = -\\cos x + C$
- $\\int \\cos x dx = \\sin x + C$
- $\\int e^x dx = e^x + C$

第二章 微分方程

2.1 一阶微分方程
形如 $\\frac{dy}{dx} = f(x, y)$ 的方程称为一阶微分方程。

可分离变量的微分方程：$\\frac{dy}{dx} = g(x)h(y)$
解法：$\\frac{dy}{h(y)} = g(x)dx$，两边积分得到通解。

2.2 二阶线性微分方程
形如 $y'' + p(x)y' + q(x)y = f(x)$ 的方程称为二阶线性微分方程。

齐次方程的特征方程：$r^2 + pr + q = 0$
判别式：$\\Delta = p^2 - 4q$

当Δ > 0时，通解为：$y = C_1e^{r_1x} + C_2e^{r_2x}$
当Δ = 0时，通解为：$y = (C_1 + C_2x)e^{rx}$
当Δ < 0时，通解为：$y = e^{\\alpha x}(C_1\\cos\\beta x + C_2\\sin\\beta x)$
        `;

        try {
            // 生成题目（应该不会显示$符号）
            console.log('📝 生成题目...');
            const questions = await this.aiService.generateQuestionsFromContent(
                testDocument, 
                'mixed', 
                8, 
                1, 
                {
                    mathRenderMode: 'html', // 关键：使用HTML模式
                    coverageMode: 'comprehensive'
                }
            );

            console.log(`✅ 生成了 ${questions.length} 道题目`);
            
            // 检查是否还有$符号
            let hasLatexSymbols = false;
            questions.forEach((q, index) => {
                const questionText = JSON.stringify(q);
                if (questionText.includes('$') && !questionText.includes('class="')) {
                    hasLatexSymbols = true;
                    console.log(`❌ 题目 ${index + 1} 仍包含LaTeX符号:`, q.question?.substring(0, 100));
                }
            });

            if (!hasLatexSymbols) {
                console.log('✅ 修复成功：所有题目都不再显示$符号');
            } else {
                console.log('❌ 修复失败：仍有题目显示$符号');
            }

            // 显示前3道题目作为示例
            console.log('\n📋 生成的题目示例:');
            questions.slice(0, 3).forEach((q, index) => {
                console.log(`\n题目 ${index + 1}:`);
                console.log(`问题: ${q.question}`);
                if (q.options) {
                    console.log(`选项: ${q.options.join(', ')}`);
                }
                if (q.answer) {
                    console.log(`答案: ${q.answer}`);
                }
            });

            return { success: !hasLatexSymbols, questions };

        } catch (error) {
            console.error('❌ 测试失败:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * 测试全面问题覆盖修复
     */
    async testComprehensiveQuestionCoverage() {
        console.log('\n=== 测试2: 全面问题覆盖修复 ===');
        
        const testDocument = `
第一章 线性代数基础

1.1 向量空间
向量空间是满足特定公理的集合。设V是一个非空集合，如果定义了向量加法和标量乘法运算，
且满足以下8个公理，则称V为向量空间：
1. 加法交换律：u + v = v + u
2. 加法结合律：(u + v) + w = u + (v + w)
3. 零向量存在：存在零向量0，使得v + 0 = v
4. 负向量存在：对每个v，存在-v，使得v + (-v) = 0

1.2 线性变换
线性变换T: V → W满足：
- T(u + v) = T(u) + T(v)
- T(cv) = cT(v)

1.3 矩阵运算
矩阵乘法：(AB)ᵢⱼ = Σₖ aᵢₖbₖⱼ
矩阵的逆：如果AB = BA = I，则B = A⁻¹

第二章 特征值与特征向量

2.1 特征值定义
对于n×n矩阵A，如果存在非零向量v和标量λ，使得Av = λv，
则λ称为A的特征值，v称为对应的特征向量。

2.2 特征多项式
特征多项式：p(λ) = det(A - λI)
特征值是特征多项式的根。

2.3 对角化
矩阵A可对角化当且仅当A有n个线性无关的特征向量。
对角化：P⁻¹AP = D，其中D是对角矩阵。

第三章 二次型

3.1 二次型的定义
n元二次型：f(x₁, x₂, ..., xₙ) = Σᵢⱼ aᵢⱼxᵢxⱼ = xᵀAx

3.2 二次型的标准形
通过正交变换可将二次型化为标准形：
f = λ₁y₁² + λ₂y₂² + ... + λₙyₙ²

3.3 正定二次型
二次型f(x) = xᵀAx称为正定的，如果对所有非零向量x，都有f(x) > 0。
判定条件：A的所有特征值都为正数。
        `;

        try {
            // 生成全面覆盖策略
            console.log('📊 生成全面覆盖策略...');
            const strategy = this.mathHandler.generateComprehensiveQuestionStrategy(testDocument, {
                questionCount: 12,
                difficultyLevels: ['easy', 'medium', 'hard'],
                questionTypes: ['multiple_choice', 'short_answer', 'essay'],
                coverageMode: 'comprehensive'
            });

            console.log(`✅ 策略生成完成: ${strategy.sections.length}个章节`);
            
            // 检查覆盖情况
            console.log('\n📊 章节覆盖分析:');
            strategy.sections.forEach((section, index) => {
                console.log(`${index + 1}. ${section.title.substring(0, 50)}... (长度: ${section.length})`);
            });

            console.log('\n📊 问题分布:');
            strategy.distribution.forEach(dist => {
                const sectionName = dist.section.length > 30 ? 
                    dist.section.substring(0, 30) + '...' : dist.section;
                console.log(`- ${sectionName}: ${dist.questionCount}题 (${(dist.ratio * 100).toFixed(1)}%)`);
            });

            // 使用策略生成题目
            console.log('\n📝 基于策略生成题目...');
            const questions = await this.aiService.generateQuestionsFromContent(
                testDocument, 
                'mixed', 
                12, 
                1, 
                {
                    mathRenderMode: 'html',
                    coverageMode: 'comprehensive',
                    questionStrategy: strategy
                }
            );

            // 分析题目覆盖情况
            const coverageAnalysis = this.analyzeCoverage(questions, strategy);
            
            console.log('\n📈 覆盖分析结果:');
            console.log(`总题目数: ${questions.length}`);
            console.log(`覆盖章节数: ${coverageAnalysis.coveredSections}`);
            console.log(`覆盖率: ${coverageAnalysis.coverageRate.toFixed(1)}%`);

            return {
                success: coverageAnalysis.coverageRate > 80, // 80%以上覆盖率算成功
                strategy,
                questions,
                coverageAnalysis
            };

        } catch (error) {
            console.error('❌ 测试失败:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * 分析题目覆盖情况
     */
    analyzeCoverage(questions, strategy) {
        const sectionKeywords = strategy.sections.map(section => {
            // 提取章节关键词
            const title = section.title.toLowerCase();
            const keywords = [];
            
            if (title.includes('向量')) keywords.push('向量', 'vector');
            if (title.includes('矩阵')) keywords.push('矩阵', 'matrix');
            if (title.includes('特征')) keywords.push('特征值', '特征向量', 'eigenvalue');
            if (title.includes('线性变换')) keywords.push('线性变换', 'transformation');
            if (title.includes('二次型')) keywords.push('二次型', 'quadratic');
            if (title.includes('对角化')) keywords.push('对角化', 'diagonalization');
            
            return { section: section.title, keywords };
        });

        let coveredSections = 0;
        const questionTexts = questions.map(q => 
            `${q.question} ${q.options?.join(' ') || ''} ${q.answer || ''}`.toLowerCase()
        );

        sectionKeywords.forEach(({ section, keywords }) => {
            const isCovered = keywords.some(keyword => 
                questionTexts.some(text => text.includes(keyword))
            );
            if (isCovered) {
                coveredSections++;
                console.log(`✅ 章节已覆盖: ${section.substring(0, 30)}...`);
            } else {
                console.log(`❌ 章节未覆盖: ${section.substring(0, 30)}...`);
            }
        });

        return {
            totalSections: sectionKeywords.length,
            coveredSections,
            coverageRate: (coveredSections / sectionKeywords.length) * 100
        };
    }

    /**
     * 运行所有测试
     */
    async runAllTests() {
        console.log('🚀 开始数学公式处理集成测试');
        console.log('目标：验证两个问题的修复效果');
        console.log('1. 网页端不再显示$符号');
        console.log('2. 问题生成全面覆盖文档内容');

        const results = {
            mathDisplayFix: null,
            comprehensiveCoverage: null
        };

        // 测试1：数学公式显示修复
        results.mathDisplayFix = await this.testMathFormulaDisplayFix();

        // 测试2：全面问题覆盖修复
        results.comprehensiveCoverage = await this.testComprehensiveQuestionCoverage();

        // 总结测试结果
        console.log('\n=== 测试结果总结 ===');
        
        if (results.mathDisplayFix.success) {
            console.log('✅ 问题1修复成功：网页端不再显示$符号');
        } else {
            console.log('❌ 问题1修复失败：仍有$符号显示');
        }

        if (results.comprehensiveCoverage.success) {
            console.log('✅ 问题2修复成功：问题生成全面覆盖文档');
        } else {
            console.log('❌ 问题2修复失败：覆盖率不足');
        }

        const overallSuccess = results.mathDisplayFix.success && results.comprehensiveCoverage.success;
        
        if (overallSuccess) {
            console.log('\n🎉 所有问题修复成功！');
            console.log('📋 使用建议:');
            console.log('1. 在前端页面引入 /css/math-formulas.css');
            console.log('2. 使用 mathRenderMode: "html" 选项');
            console.log('3. 使用 coverageMode: "comprehensive" 确保全面覆盖');
        } else {
            console.log('\n⚠️  部分问题仍需修复');
        }

        return results;
    }
}

// 如果直接运行此文件，执行测试
if (require.main === module) {
    const test = new MathFormulaIntegrationTest();
    test.runAllTests().then(results => {
        console.log('\n测试完成，结果:', {
            mathDisplayFixed: results.mathDisplayFix.success,
            comprehensiveCoverageFixed: results.comprehensiveCoverage.success
        });
        process.exit(0);
    }).catch(error => {
        console.error('测试执行失败:', error);
        process.exit(1);
    });
}

module.exports = MathFormulaIntegrationTest;