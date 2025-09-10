const express = require('express');
const Database = require('../database/database');

const router = express.Router();

// 获取学习统计数据
router.get('/stats', async (req, res) => {
    try {
        const userId = 1; // 本地测试使用固定用户ID
        const { period = '7d' } = req.query;

        // 计算日期范围
        const endDate = new Date();
        const startDate = new Date();
        
        switch (period) {
            case '7d':
                startDate.setDate(endDate.getDate() - 7);
                break;
            case '30d':
                startDate.setDate(endDate.getDate() - 30);
                break;
            case '90d':
                startDate.setDate(endDate.getDate() - 90);
                break;
            default:
                startDate.setDate(endDate.getDate() - 7);
        }

        // 获取基础统计数据
        const basicStats = await Database.get(
            `SELECT 
                COUNT(DISTINCT qs.id) as totalQuizzes,
                AVG(qs.score) as averageScore,
                SUM(qs.correct_answers) as totalCorrectAnswers,
                SUM(qs.total_questions) as totalQuestions,
                SUM(qs.time_spent) as totalTimeSpent
             FROM quiz_sessions qs
             WHERE qs.user_id = ? AND qs.completed_at >= ? AND qs.completed_at <= ?`,
            [userId, startDate.toISOString(), endDate.toISOString()]
        );

        // 获取错题统计
        const wrongQuestionsCount = await Database.get(
            `SELECT COUNT(*) as count FROM wrong_questions WHERE user_id = ? AND mastered = 0`,
            [userId]
        );

        // 获取连续学习天数
        const studyStreak = await calculateStudyStreak(userId);

        // 获取每日学习数据
        const dailyStats = await Database.query(
            `SELECT 
                date,
                study_time,
                questions_answered,
                correct_answers
             FROM study_stats 
             WHERE user_id = ? AND date >= ? AND date <= ?
             ORDER BY date ASC`,
            [userId, startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0]]
        );

        // 获取知识点掌握情况
        const knowledgePoints = await getKnowledgePointsStats(userId);

        res.json({
            success: true,
            data: {
                basic: {
                    totalQuizzes: basicStats.totalQuizzes || 0,
                    averageScore: Math.round(basicStats.averageScore || 0),
                    totalCorrectAnswers: basicStats.totalCorrectAnswers || 0,
                    totalQuestions: basicStats.totalQuestions || 0,
                    totalTimeSpent: basicStats.totalTimeSpent || 0,
                    wrongQuestionsCount: wrongQuestionsCount.count || 0,
                    studyStreak: studyStreak
                },
                daily: dailyStats.map(stat => ({
                    date: stat.date,
                    studyTime: stat.study_time || 0,
                    questionsAnswered: stat.questions_answered || 0,
                    correctAnswers: stat.correct_answers || 0,
                    accuracy: stat.questions_answered > 0 ? 
                        Math.round((stat.correct_answers / stat.questions_answered) * 100) : 0
                })),
                knowledgePoints: knowledgePoints
            }
        });

    } catch (error) {
        console.error('获取学习统计错误:', error);
        res.status(500).json({
            success: false,
            message: '获取学习统计失败'
        });
    }
});

// 获取学习进度趋势
router.get('/progress', async (req, res) => {
    try {
        const userId = req.user ? req.user.userId : 1;
        const { period = '30d' } = req.query;

        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - parseInt(period.replace('d', '')));

        // 按周或月聚合数据
        const groupBy = period === '7d' ? 'date' : 
                       period === '30d' ? "strftime('%Y-%W', date)" : 
                       "strftime('%Y-%m', date)";

        const progressData = await Database.query(
            `SELECT 
                ${groupBy} as period,
                AVG(CASE WHEN qs.total_questions > 0 THEN (qs.correct_answers * 100.0 / qs.total_questions) ELSE 0 END) as avgScore,
                SUM(ss.study_time) as totalStudyTime,
                SUM(ss.questions_answered) as totalQuestions
             FROM study_stats ss
             LEFT JOIN quiz_sessions qs ON qs.user_id = ss.user_id AND DATE(qs.completed_at) = ss.date
             WHERE ss.user_id = ? AND ss.date >= ? AND ss.date <= ?
             GROUP BY ${groupBy}
             ORDER BY period ASC`,
            [userId, startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0]]
        );

        res.json({
            success: true,
            data: progressData.map(item => ({
                period: item.period,
                averageScore: Math.round(item.avgScore || 0),
                studyTime: item.totalStudyTime || 0,
                questionsAnswered: item.totalQuestions || 0
            }))
        });

    } catch (error) {
        console.error('获取学习进度错误:', error);
        res.status(500).json({
            success: false,
            message: '获取学习进度失败'
        });
    }
});

// 获取错题分析
router.get('/wrong-analysis', async (req, res) => {
    try {
        const userId = 1; // 临时使用固定用户ID

        // 按题目类型统计错题
        const typeStats = await Database.query(
            `SELECT 
                q.question_type,
                COUNT(*) as wrongCount,
                AVG(wq.wrong_count) as avgWrongTimes
             FROM wrong_questions wq
             JOIN questions q ON wq.question_id = q.id
             WHERE wq.user_id = ? AND wq.mastered = 0
             GROUP BY q.question_type`,
            [userId]
        );

        // 按材料统计错题
        const materialStats = await Database.query(
            `SELECT 
                m.original_name as materialName,
                COUNT(*) as wrongCount
             FROM wrong_questions wq
             JOIN questions q ON wq.question_id = q.id
             JOIN materials m ON q.material_id = m.id
             WHERE wq.user_id = ? AND wq.mastered = 0
             GROUP BY m.id, m.original_name
             ORDER BY wrongCount DESC
             LIMIT 10`,
            [userId]
        );

        // 获取最近的错题趋势
        const trendData = await Database.query(
            `SELECT 
                DATE(wq.last_wrong_at) as date,
                COUNT(*) as wrongCount
             FROM wrong_questions wq
             WHERE wq.user_id = ? AND wq.last_wrong_at >= date('now', '-30 days')
             GROUP BY DATE(wq.last_wrong_at)
             ORDER BY date ASC`,
            [userId]
        );

        res.json({
            success: true,
            data: {
                byType: typeStats.map(stat => ({
                    type: stat.question_type,
                    wrongCount: stat.wrongCount,
                    averageWrongTimes: Math.round(stat.avgWrongTimes * 10) / 10
                })),
                byMaterial: materialStats.map(stat => ({
                    materialName: stat.materialName,
                    wrongCount: stat.wrongCount
                })),
                trend: trendData.map(item => ({
                    date: item.date,
                    wrongCount: item.wrongCount
                }))
            }
        });

    } catch (error) {
        console.error('获取错题分析错误:', error);
        res.status(500).json({
            success: false,
            message: '获取错题分析失败'
        });
    }
});

// 获取学习建议
router.get('/recommendations', async (req, res) => {
    try {
        const userId = 1; // 临时使用固定用户ID

        // 获取用户最近的学习数据
        const recentStats = await Database.get(
            `SELECT 
                AVG(score) as avgScore,
                COUNT(*) as quizCount,
                SUM(time_spent) as totalTime
             FROM quiz_sessions 
             WHERE user_id = ? AND completed_at >= date('now', '-7 days')`,
            [userId]
        );

        // 获取薄弱知识点
        const weakPoints = await Database.query(
            `SELECT 
                q.knowledge_points,
                COUNT(*) as wrongCount
             FROM wrong_questions wq
             JOIN questions q ON wq.question_id = q.id
             WHERE wq.user_id = ? AND wq.mastered = 0 AND q.knowledge_points IS NOT NULL
             GROUP BY q.knowledge_points
             ORDER BY wrongCount DESC
             LIMIT 5`,
            [userId]
        );

        // 生成建议
        const recommendations = [];

        if (recentStats.avgScore < 70) {
            recommendations.push({
                type: 'improvement',
                title: '提高准确率',
                description: '您最近的平均分数较低，建议加强基础知识的复习',
                priority: 'high'
            });
        }

        if (recentStats.quizCount < 3) {
            recommendations.push({
                type: 'frequency',
                title: '增加练习频率',
                description: '建议每天至少完成3次练习，保持学习连续性',
                priority: 'medium'
            });
        }

        if (weakPoints.length > 0) {
            recommendations.push({
                type: 'focus',
                title: '重点复习薄弱环节',
                description: `建议重点复习：${weakPoints.map(p => p.knowledge_points).join('、')}`,
                priority: 'high'
            });
        }

        res.json({
            success: true,
            data: {
                recommendations: recommendations,
                weakPoints: weakPoints.map(point => ({
                    knowledgePoint: point.knowledge_points,
                    wrongCount: point.wrongCount
                }))
            }
        });

    } catch (error) {
        console.error('获取学习建议错误:', error);
        res.status(500).json({
            success: false,
            message: '获取学习建议失败'
        });
    }
});

// 计算连续学习天数
async function calculateStudyStreak(userId) {
    try {
        const today = new Date().toISOString().split('T')[0];
        let streak = 0;
        let currentDate = new Date();

        // 从今天开始往前查找连续学习的天数
        for (let i = 0; i < 365; i++) { // 最多查找365天
            const dateStr = currentDate.toISOString().split('T')[0];
            
            const hasStudy = await Database.get(
                'SELECT COUNT(*) as count FROM study_stats WHERE user_id = ? AND date = ? AND questions_answered > 0',
                [userId, dateStr]
            );

            if (hasStudy.count > 0) {
                streak++;
                currentDate.setDate(currentDate.getDate() - 1);
            } else {
                break;
            }
        }

        return streak;
    } catch (error) {
        console.error('计算学习连续天数错误:', error);
        return 0;
    }
}

// 获取知识点掌握情况
async function getKnowledgePointsStats(userId) {
    try {
        // 这里简化处理，实际应该根据具体的知识点分类
        const subjects = ['数学', '英语', '物理', '化学', '历史', '地理'];
        const stats = [];

        for (const subject of subjects) {
            // 模拟数据，实际应该根据材料内容和答题情况计算
            const score = Math.floor(Math.random() * 40) + 60; // 60-100分
            stats.push({
                subject: subject,
                score: score,
                level: score >= 90 ? '优秀' : score >= 80 ? '良好' : score >= 70 ? '一般' : '需提高'
            });
        }

        return stats;
    } catch (error) {
        console.error('获取知识点统计错误:', error);
        return [];
    }
}

module.exports = router;