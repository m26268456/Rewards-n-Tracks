
import cron from 'node-cron';
import { logger } from '../utils/logger';
import { quotaService } from './quotaService';

/**
 * 啟動額度刷新排程器
 * 排程器會定期執行，檢查並刷新所有需要更新的額度。
 */
export function startQuotaRefreshScheduler() {
  // 設定排程為每 10 分鐘執行一次
  cron.schedule('*/10 * * * *', async () => {
    logger.info('[QuotaRefresh] Running scheduled quota check...');
    try {
      await quotaService.refreshQuotas();
    } catch (error) {
      // 錯誤已在 quotaService.refreshQuotas 中被捕獲和記錄
      // 這裡可以選擇性地做一些額外的頂層處理，如果需要的話
      logger.error('[QuotaRefresh] The refreshQuotas task failed. See previous logs for details.');
    }
  });

  logger.info('[QuotaRefresh] Quota refresh scheduler started. Will run every 10 minutes.');
}
