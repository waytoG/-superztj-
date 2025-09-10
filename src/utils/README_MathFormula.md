# 数学公式处理器 - 问题解决方案

## 问题描述

项目中存在两个主要问题：
1. **显示问题**：生成的问题会在网页端显示 `$` 等LaTeX标识符
2. **覆盖问题**：模型针对材料的提问是某些部分的，而不是针对文件全面提问

## 解决方案

### 1. 数学公式显示问题解决

#### 问题原因
- 原始代码自动为数学表达式添加 `$` 符号（LaTeX格式）
- 前端没有LaTeX渲染器，直接显示了 `$` 符号

#### 解决方案
提供了三种渲染模式：

**HTML模式（推荐）**
```javascript
const mathHandler = new MathFormulaHandler();
const result = mathHandler.processMathFormulas(text, {
    renderMode: 'html',  // 转换为HTML标签
    autoWrap: false,     // 不自动添加$符号
    preserveOriginal: true
});
```

**Unicode模式**
```javascript
const result = mathHandler.processMathFormulas(text, {
    renderMode: 'unicode',  // 转换为Unicode符号
    autoWrap: false
});
```

**基本模式**
```javascript
const result = mathHandler.processMathFormulas(text, {
    renderMode: 'basic'  // 只做编码修复和清理
});
```

### 2. 全面问题生成解决

#### 问题原因
- 缺乏文档结构分析
- 没有系统的问题分布策略
- 问题生成随机性太强

#### 解决方案
新增了全面的问题生成策略：

```javascript
const strategy = mathHandler.generateComprehensiveQuestionStrategy(content, {
    questionCount: 15,
    difficultyLevels: ['easy', 'medium', 'hard'],
    questionTypes: ['multiple_choice', 'short_answer', 'essay'],
    coverageMode: 'comprehensive'  // 'comprehensive', 'focused', 'random'
});
```

**功能特性：**
- 自动分析文档结构（章节、段落）
- 按内容长度分配问题数量
- 确保每个章节都有覆盖
- 识别数学内容和关键主题
- 提供三种覆盖模式

## 使用方法

### 1. 基本使用

```javascript
const MathFormulaHandler = require('./mathFormulaHandler');
const mathHandler = new MathFormulaHandler();

// 处理单个题目
const processedQuestion = mathHandler.processQuestionMath(question, {
    renderMode: 'html'  // 避免显示$符号
});

// 批量处理题目
const processedQuestions = mathHandler.processQuestionsMath(questions, {
    renderMode: 'html'
});
```

### 2. 生成全面问题策略

```javascript
// 分析文档并生成问题策略
const strategy = mathHandler.generateComprehensiveQuestionStrategy(documentContent, {
    questionCount: 10,
    coverageMode: 'comprehensive'
});

// 使用策略信息指导问题生成
console.log('章节分布:', strategy.distribution);
console.log('覆盖区域:', strategy.coverageAreas);
```

### 3. 前端样式支持

在HTML页面中引入CSS文件：
```html
<link rel="stylesheet" href="/css/math-formulas.css">
```

CSS提供了以下样式支持：
- `.math-formula` - 数学公式容器
- `.math-symbol` - 数学符号
- `.fraction` - 分数显示
- `sup`, `sub` - 上标下标
- 响应式设计和暗色主题支持

## 配置选项

### 渲染模式选项

| 模式 | 描述 | 适用场景 |
|------|------|----------|
| `html` | 转换为HTML标签 | 网页显示（推荐） |
| `latex` | 保持LaTeX格式 | 支持LaTeX渲染的环境 |
| `unicode` | 转换为Unicode符号 | 纯文本显示 |
| `basic` | 基本清理 | 保持原格式 |

### 覆盖模式选项

| 模式 | 描述 | 特点 |
|------|------|------|
| `comprehensive` | 全面覆盖 | 确保每个章节都有问题 |
| `focused` | 重点覆盖 | 关注数学内容和重要章节 |
| `random` | 随机覆盖 | 随机选择覆盖区域 |

## 示例代码

运行示例：
```bash
node src/utils/mathFormulaUsageExample.js
```

示例包含：
1. 显示问题解决演示
2. 题目处理演示
3. 全面问题生成演示
4. 不同渲染模式对比
5. 编码问题修复演示

## 文件结构

```
src/utils/
├── mathFormulaHandler.js          # 主处理器（已更新）
├── mathFormulaUsageExample.js     # 使用示例
└── README_MathFormula.md          # 说明文档

public/css/
└── math-formulas.css              # 数学公式样式
```

## 版本更新

**v2.1.0 新特性：**
- ✅ 解决网页端显示$符号问题
- ✅ 新增HTML/Unicode/基本渲染模式
- ✅ 全面问题生成策略
- ✅ 文档结构自动分析
- ✅ 配套CSS样式支持
- ✅ 编码问题修复增强

## 最佳实践

1. **网页显示**：使用HTML模式 + CSS样式
2. **问题生成**：使用comprehensive模式确保全面覆盖
3. **性能优化**：大文档建议分段处理
4. **错误处理**：所有方法都有异常处理，失败时返回原始内容

## 注意事项

- HTML模式需要配套的CSS文件支持
- 大文档处理可能需要较长时间
- 建议在生产环境中缓存处理结果
- 支持中英文混合内容处理