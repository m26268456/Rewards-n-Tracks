
import { Router } from 'express';
import { getDb } from '../config/database';
import { quotaService } from '../services/quotaService';
import { logger } from '../utils/logger';

const router = Router();
const db = getDb();

// ... (other scheme routes like GET, POST, DELETE)

// Route to batch update rewards for a scheme
router.put('/:schemeId/rewards', async (req, res) => {
    const { schemeId } = req.params;
    const { rewards } = req.body; // Expects an array of reward objects

    if (!Array.isArray(rewards)) {
        return res.status(400).json({ error: 'Invalid input: rewards must be an array.' });
    }

    const client = await db.connect();
    try {
        await client.query('BEGIN');

        // You may want to delete existing rewards and insert new ones,
        // or more sophisticated logic to handle updates/creates/deletes.
        // For simplicity, let's assume a replace-all strategy for now.
        
        // 1. Delete old rewards for this scheme
        await client.query('DELETE FROM scheme_rewards WHERE scheme_id = $1', [schemeId]);

        // 2. Insert new rewards and trigger recalculation for each
        for (const reward of rewards) {
            const { 
                reward_percentage, calculation_method, quota_limit, 
                quota_refresh_type, quota_refresh_value, 
                quota_refresh_start_date, quota_refresh_end_date, 
                quota_calculation_basis, display_order 
            } = reward;

            const insertResult = await client.query(
                `INSERT INTO scheme_rewards (...) VALUES (...) RETURNING id`,
                [/*...params...*/]
            );
            const newRewardId = insertResult.rows[0].id;

            // 3. CRITICAL: Recalculate quota usage based on the new rule
            await quotaService.recalculateQuotaOnRuleChange(newRewardId, 'scheme_reward', client);
        }

        await client.query('COMMIT');
        res.status(200).json({ message: 'Rewards updated and quotas recalculated successfully.' });

    } catch (error: any) {
        await client.query('ROLLBACK');
        logger.error(`Error updating rewards for scheme ${schemeId}:`, error);
        res.status(500).json({ error: 'Failed to update rewards.', details: error.message });
    } finally {
        client.release();
    }
});

export default router;
