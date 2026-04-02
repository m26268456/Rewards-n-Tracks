
import { PoolClient } from 'pg';
import { getDb } from '../config/database';
import { logger } from '../utils/logger';
import { calculateNextRefreshTime, getQuotaWindow } from '../utils/quotaRefresh';
import { transactionService } from './transactionService';

// Helper to calculate reward value based on the method
function calculateReward(amount: number, percentage: number, method: 'round' | 'floor' | 'ceil'): number {
    const reward = amount * (percentage / 100);
    switch (method) {
        case 'floor': return Math.floor(reward);
        case 'ceil': return Math.ceil(reward);
        case 'round':
        default: return Math.round(reward);
    }
}

class QuotaService {
    private pool = getDb();

    /**
     * Recalculates the current quota usage for a specific reward based on its new rules.
     */
    async recalculateQuotaOnRuleChange(rewardId: string, sourceType: 'scheme_reward' | 'payment_reward', client: PoolClient) {
        logger.info(`Recalculating quota for reward ${rewardId} (${sourceType}) due to rule change.`);

        const rewardTable = sourceType === 'scheme_reward' ? 'scheme_rewards' : 'payment_rewards';
        const rewardQuery = `SELECT * FROM ${rewardTable} WHERE id = $1`;
        const rewardResult = await client.query(rewardQuery, [rewardId]);
        const reward = rewardResult.rows[0];

        if (!reward) {
            logger.warn(`Reward ${rewardId} not found. Skipping recalculation.`);
            return;
        }

        const trackingResult = await client.query('SELECT * FROM quota_trackings WHERE reward_id = $1 AND source_type = $2', [rewardId, sourceType]);
        const tracking = trackingResult.rows[0];

        if (!tracking) {
            logger.warn(`Quota tracking for reward ${rewardId} not found. Will be created on next transaction.`);
            return;
        }

        const { start, end } = getQuotaWindow(new Date(), {
            refreshType: reward.quota_refresh_type,
            refreshValue: reward.quota_refresh_value,
            startDate: reward.quota_refresh_start_date,
            endDate: reward.quota_refresh_end_date,
        });

        const transactions = await transactionService.getTransactionsForReward(rewardId, sourceType, start, end, client);

        let newUsedQuota = 0;
        let newCurrentAmount = 0;
        
        if (reward.quota_calculation_basis === 'statement') {
            const totalAmount = transactions.reduce((sum, tx) => sum + parseFloat(tx.amount), 0);
            newCurrentAmount = totalAmount;
            newUsedQuota = calculateReward(totalAmount, reward.reward_percentage, reward.calculation_method);
        } else {
            transactions.forEach(tx => {
                const amount = parseFloat(tx.amount);
                newCurrentAmount += amount;
                newUsedQuota += calculateReward(amount, reward.reward_percentage, reward.calculation_method);
            });
        }

        const newRemainingQuota = reward.quota_limit != null ? reward.quota_limit - newUsedQuota : null;
        const nextRefreshAt = calculateNextRefreshTime(
            reward.quota_refresh_type, 
            reward.quota_refresh_type === 'date' ? reward.quota_refresh_end_date : reward.quota_refresh_value
        );

        await client.query(
            `UPDATE quota_trackings
             SET
                current_amount = $1,
                used_quota = $2,
                remaining_quota = $3,
                next_refresh_at = $4,
                updated_at = NOW()
             WHERE tracking_id = $5`,
            [newCurrentAmount, newUsedQuota, newRemainingQuota, nextRefreshAt, tracking.id]
        );

        logger.info(`Successfully recalculated quota for tracking_id ${tracking.id}. New used_quota: ${newUsedQuota}`);
    }

    async getOrCreateQuotaTracking(rewardId: string, sourceType: 'scheme_reward' | 'payment_reward', client: PoolClient) {
      // ... implementation similar to before, ensuring correct table names are used.
    }
    async updateQuotaUsage(trackingId: string, transactionAmount: number, rewardValue: number, client: PoolClient) {
      // ...
    }
    async revertQuotaUsage(trackingId: string, transactionAmount: number, rewardValue: number, client: PoolClient) {
      // ...
    }
    async refreshQuotas() {
      // ...
    }
}

export const quotaService = new QuotaService();
