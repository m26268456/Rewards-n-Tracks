import express from 'express';
import { getDb } from '../config/database';
import { logger } from '../utils/logger';
import { getQuotaWindow } from '../services/quotaService'; // Updated import

const router = express.Router();

/**
 * @swagger
 * /quota:
 *   get:
 *     summary: Get all quota tracking information
 *     tags: [Quota]
 *     responses:
 *       200:
 *         description: A list of quota tracking records
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/QuotaTracking'
 *       500:
 *         description: Server error
 */
router.get('/', async (req, res, next) => {
    try {
        const db = getDb();
        // This query can be complex, joining multiple tables to get descriptive names
        const query = `
            SELECT 
                qt.tracking_id, 
                qt.source_type, 
                qt.reward_id, 
                qt.used_quota, 
                qt.remaining_quota,
                qt.manual_adjustment,
                qt.last_refresh_at,
                qt.next_refresh_at,
                CASE
                    WHEN qt.source_type = 'scheme_reward' THEN sr.description
                    WHEN qt.source_type = 'payment_method_reward' THEN pr.description
                    ELSE 'N/A'
                END as reward_description,
                CASE
                    WHEN qt.source_type = 'scheme_reward' THEN cs.name
                    ELSE NULL
                END as scheme_name,
                c.name as card_name,
                pm.name as payment_method_name
            FROM quota_trackings qt
            LEFT JOIN scheme_rewards sr ON qt.reward_id = sr.reward_id AND qt.source_type = 'scheme_reward'
            LEFT JOIN calculation_schemes cs ON sr.scheme_id = cs.scheme_id
            LEFT JOIN cards c ON cs.card_id = c.card_id
            LEFT JOIN payment_method_rewards pr ON qt.reward_id = pr.reward_id AND qt.source_type = 'payment_method_reward'
            LEFT JOIN payment_methods pm ON pr.payment_method_id = pm.payment_method_id
            ORDER BY qt.tracking_id;
        `;
        const { rows } = await db.query(query);
        res.json(rows);
    } catch (error) {
        logger.error('Error fetching quota tracking info:', error);
        next(error);
    }
});

export default router;
