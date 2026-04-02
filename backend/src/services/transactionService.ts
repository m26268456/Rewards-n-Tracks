
import { PoolClient } from 'pg';
import { getDb } from '../config/database';
import { logger } from '../utils/logger';
import { quotaService } from './quotaService';

interface TransactionData {
    userId: number;
    cardId: number;
    amount: number;
    description: string;
    transactionDate: string;
    channelId?: number;
    paymentMethodId?: number;
}

class TransactionService {
    private pool = getDb();

    async getTransactionsForReward(
        rewardId: string, 
        sourceType: 'scheme_reward' | 'payment_reward', 
        startDate: Date | null, 
        endDate: Date | null,
        client: PoolClient
    ) {
        let query: string;
        const params: any[] = [rewardId, startDate, endDate];

        if (sourceType === 'scheme_reward') {
            query = `
                SELECT t.* FROM transactions t
                JOIN cards c ON t.card_id = c.id
                JOIN card_schemes cs ON c.id = cs.card_id
                JOIN scheme_rewards sr ON cs.scheme_id = sr.scheme_id
                WHERE sr.id = $1
                  AND ($2::DATE IS NULL OR t.transaction_date >= $2::DATE)
                  AND ($3::DATE IS NULL OR t.transaction_date <= $3::DATE);
            `;
        } else { // payment_reward
            query = `
                SELECT t.* FROM transactions t
                JOIN payment_rewards pr ON t.payment_method_id = pr.payment_method_id
                WHERE pr.id = $1
                  AND ($2::DATE IS NULL OR t.transaction_date >= $2::DATE)
                  AND ($3::DATE IS NULL OR t.transaction_date <= $3::DATE);
            `;
        }

        const result = await client.query(query, params);
        return result.rows;
    }

    async createTransactionAndUpdateQuotas(data: TransactionData) {
      // ...
    }

    async deleteTransactionAndRevertQuotas(transactionId: number) {
      // ...
    }
    
    private async calculateRewardsForTransaction(transaction: any, client: PoolClient) {
        return []; 
    }
}

export const transactionService = new TransactionService();
