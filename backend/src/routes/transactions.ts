
import express from 'express';
import { transactionService } from '../services/transactionService';
import { validate } from '../middleware/validate';
import { body, param, query } from 'express-validator';
import { getDb } from '../config/database';
import { logger } from '../utils/logger';

const router = express.Router();

// GET /transactions - 取得交易列表 (保持不變)
router.get('/', async (req, res, next) => {
    try {
        const db = getDb();
        const result = await db.query('SELECT * FROM transactions ORDER BY transaction_date DESC');
        res.json(result.rows);
    } catch (error) {
        logger.error('Error fetching transactions:', error);
        next(error);
    }
});

// POST /transactions - 新增交易 (重構)
router.post(
    '/',
    validate([
        body('card_id').isInt(),
        body('amount').isFloat({ gt: 0 }),
        body('description').isString().notEmpty(),
        body('transaction_date').isISO8601(),
        body('channel_id').optional().isInt(),
        body('payment_method_id').optional().isInt(),
    ]),
    async (req, res, next) => {
        try {
            const transactionData = {
                // 假設 user_id 為 1
                userId: 1, 
                cardId: req.body.card_id,
                amount: req.body.amount,
                description: req.body.description,
                transactionDate: req.body.transaction_date,
                channelId: req.body.channel_id,
                paymentMethodId: req.body.payment_method_id
            };
            const transaction = await transactionService.createTransactionAndUpdateQuotas(transactionData);
            res.status(201).json(transaction);
        } catch (error) {
            // error 已在 service 層被記錄
            next(error);
        }
    }
);

// DELETE /transactions/:id - 刪除交易 (重構)
router.delete(
    '/:id',
    validate([
        param('id').isInt({ min: 1 })
    ]),
    async (req, res, next) => {
        try {
            const transactionId = parseInt(req.params.id, 10);
            await transactionService.deleteTransactionAndRevertQuotas(transactionId);
            res.status(204).send();
        } catch (error) {
             // error 已在 service 層被記錄
            next(error);
        }
    }
);

export default router;
