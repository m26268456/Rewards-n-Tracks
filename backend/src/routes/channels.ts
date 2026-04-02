import express from 'express';
import { getDb } from '../config/database';
import { logger } from '../utils/logger';
import { validate } from '../middleware/validate';
import { body, param } from 'express-validator';
import { enrichRewardsWithQuota } from '../services/quotaService';

const router = express.Router();

// ... (GET /, GET /categories, POST, PUT, DELETE routes remain the same)


/**
 * @swagger
 * /channels/
 *   get:
 *     summary: 取得所有通路
 *     tags: [Channels]
 *     responses:
 *       200:
 *         description: 成功取得通路列表
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   channel_id:
 *                     type: integer
 *                   name:
 *                     type: string
 *                   category:
 *                     type: string
 */
router.get('/', async (req, res, next) => {
    try {
        const db = getDb();
        const result = await db.query('SELECT channel_id, name, category FROM channels ORDER BY name');
        res.json(result.rows);
    } catch (error) {
        logger.error('Error fetching channels:', error);
        next(error);
    }
});


/**
 * @swagger
 * /channels/categories:
 *   get:
 *     summary: 取得所有通路分類
 *     tags: [Channels]
 *     responses:
 *       200:
 *         description: 成功取得通路分類列表
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: string
 */
router.get('/categories', async (req, res, next) => {
    try {
        const db = getDb();
        const result = await db.query('SELECT DISTINCT category FROM channels ORDER BY category');
        res.json(result.rows.map(row => row.category));
    } catch (error) {
        logger.error('Error fetching channel categories:', error);
        next(error);
    }
});

/**
 * @swagger
 * /channels:
 *   post:
 *     summary: 新增通路
 *     tags: [Channels]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               category:
 *                 type: string
 *     responses:
 *       201:
 *         description: 成功新增通路
 *       400:
 *         description: 輸入資料無效
 *       500:
 *         description: 伺服器錯誤
 */
router.post(
    '/',
    validate([
        body('name').isString().notEmpty().withMessage('通路名稱不可為空'),
        body('category').isString().notEmpty().withMessage('通路分類不可為空'),
    ]),
    async (req, res, next) => {
        const { name, category } = req.body;
        try {
            const db = getDb();
            const result = await db.query(
                'INSERT INTO channels (name, category) VALUES ($1, $2) RETURNING *',
                [name, category]
            );
            res.status(201).json(result.rows[0]);
        } catch (error) {
            logger.error('Error adding channel:', error);
            next(error);
        }
    }
);

/**
 * @swagger
 * /channels/{id}:
 *   put:
 *     summary: 更新通路資訊
 *     tags: [Channels]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               category:
 *                 type: string
 *     responses:
 *       200:
 *         description: 成功更新通路
 *       400:
 *         description: 輸入資料無效
 *       404:
 *         description: 找不到通路
 *       500:
 *         description: 伺服器錯誤
 */
router.put(
    '/:id',
    validate([
        param('id').isInt({ min: 1 }).withMessage('ID 必須是正整數'),
        body('name').isString().notEmpty().withMessage('通路名稱不可為空'),
        body('category').isString().notEmpty().withMessage('通路分類不可為空'),
    ]),
    async (req, res, next) => {
        const { id } = req.params;
        const { name, category } = req.body;
        try {
            const db = getDb();
            const result = await db.query(
                'UPDATE channels SET name = $1, category = $2 WHERE channel_id = $3 RETURNING *',
                [name, category, id]
            );
            if (result.rowCount === 0) {
                return res.status(404).json({ message: '找不到指定的通路' });
            }
            res.json(result.rows[0]);
        } catch (error) {
            logger.error(`Error updating channel ${id}:`, error);
            next(error);
        }
    }
);

/**
 * @swagger
 * /channels/{id}:
 *   delete:
 *     summary: 刪除通路
 *     tags: [Channels]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       204:
 *         description: 成功刪除通路
 *       404:
 *         description: 找不到通路
 *       500:
 *         description: 伺服器錯誤
 */
router.delete(
    '/:id',
    validate([
        param('id').isInt({ min: 1 }).withMessage('ID 必須是正整數'),
    ]),
    async (req, res, next) => {
        const { id } = req.params;
        try {
            const db = getDb();
            const result = await db.query('DELETE FROM channels WHERE channel_id = $1', [id]);
            if (result.rowCount === 0) {
                return res.status(404).json({ message: '找不到指定的通路' });
            }
            res.status(204).send();
        } catch (error)
 {
            logger.error(`Error deleting channel ${id}:`, error);
            next(error);
        }
    }
);

/**
 * @swagger
 * /channels/{channelId}/schemes:
 *   get:
 *     summary: 取得指定通路的所有適用方案與回饋詳情 (Refactored)
 *     tags: [Channels]
 *     parameters:
 *       - in: path
 *         name: channelId
 *         required: true
 *         schema:
 *           type: integer
 *         description: 通路的 ID
 *     responses:
 *       200:
 *         description: 成功取得方案列表
 *       500:
 *         description: 伺服器錯誤
 */
router.get('/:channelId/schemes', async (req, res, next) => {
    const { channelId } = req.params;
    const client = await getDb().connect();

    try {
        // Step 1: Fetch all schemes applicable to the channel
        const schemesQuery = `
            SELECT
                cs.scheme_id, cs.name AS scheme_name, cs.apply_to_all_channels, cs.card_id,
                c.name AS card_name, c.type AS card_type
            FROM calculation_schemes cs
            JOIN cards c ON cs.card_id = c.card_id
            WHERE cs.is_active = TRUE AND (cs.apply_to_all_channels = TRUE OR cs.scheme_id IN (
                SELECT scheme_id FROM scheme_channels WHERE channel_id = $1
            ));
        `;
        const schemesResult = await client.query(schemesQuery, [channelId]);

        const schemeIds = schemesResult.rows.map(r => r.scheme_id);
        if (schemeIds.length === 0) {
            return res.json({ schemes: [], paymentMethods: [] });
        }

        // Step 2: Fetch all rewards for these schemes
        const rewardsQuery = `
            SELECT 
                reward_id, scheme_id, reward_method, reward_type, reward_value, 
                quota_limit, description AS reward_description
            FROM scheme_rewards
            WHERE scheme_id = ANY($1::int[]);
        `;
        const rewardsResult = await client.query(rewardsQuery, [schemeIds]);
        
        // Step 3: Enrich scheme rewards with quota info using the new service
        const enrichedSchemeRewards = await enrichRewardsWithQuota(rewardsResult.rows, 'reward_id', 'scheme_reward');

        // Step 4: Fetch all active payment methods and their rewards
        const paymentMethodQuery = `
            SELECT
                pm.payment_method_id, pm.name AS payment_method_name, pm.type AS payment_method_type, pm.icon AS payment_method_icon,
                pr.reward_id, pr.reward_method, pr.reward_type, pr.reward_value, pr.description AS reward_description, pr.quota_limit
            FROM payment_methods pm
            JOIN payment_method_rewards pr ON pm.payment_method_id = pr.payment_method_id
            WHERE pm.is_active = TRUE;
        `;
        const paymentMethodResult = await client.query(paymentMethodQuery);

        // Step 5: Group payment method rewards and enrich with quota info
        const paymentMethodsMap = new Map();
        paymentMethodResult.rows.forEach(row => {
            if (!paymentMethodsMap.has(row.payment_method_id)) {
                paymentMethodsMap.set(row.payment_method_id, {
                    paymentMethodId: row.payment_method_id,
                    name: row.payment_method_name,
                    type: row.payment_method_type,
                    icon: row.payment_method_icon,
                    rewards: []
                });
            }
            paymentMethodsMap.get(row.payment_method_id).rewards.push(row);
        });

        let enrichedPaymentMethods = [];
        for (const [id, pm] of paymentMethodsMap.entries()) {
            const enrichedRewards = await enrichRewardsWithQuota(pm.rewards, 'reward_id', 'payment_method_reward');
            enrichedPaymentMethods.push({ ...pm, rewards: enrichedRewards });
        }

        // Final Assembly
        const schemesMap = new Map();
        schemesResult.rows.forEach(scheme => {
            schemesMap.set(scheme.scheme_id, {
                schemeId: scheme.scheme_id,
                schemeName: scheme.scheme_name,
                card: {
                    cardId: scheme.card_id,
                    name: scheme.card_name,
                    type: scheme.card_type
                },
                rewards: []
            });
        });

        enrichedSchemeRewards.forEach(reward => {
            if (schemesMap.has(reward.scheme_id)) {
                schemesMap.get(reward.scheme_id).rewards.push(reward);
            }
        });

        res.json({
            schemes: Array.from(schemesMap.values()),
            paymentMethods: enrichedPaymentMethods
        });

    } catch (error) {
        logger.error(`Error fetching schemes for channel ${channelId}:`, error);
        next(error);
    } finally {
        client.release();
    }
});

export default router;
