## Zeabur 部署指引（精簡正式版）

本資料夾為正式上線用的精簡版。已移除高風險的資料匯入/種子 API，保留必要功能與 5 分鐘額度刷新排程。

### 目錄
- backend/ — Node/Express API（含 cron）
- frontend/ — Vite/React 靜態站（PWA）
- database/init.sql — 上線用資料庫初始化腳本（可重複執行）
- production/database/init-railway.sql — 來源參考

### 必填環境變數
Backend：
- `DATABASE_URL`（Zeabur Postgres 連線字串）
- `NODE_ENV=production`
- `PORT`（Zeabur 會提供，程式已讀取 `process.env.PORT`）
- `HOST=0.0.0.0`
- `CORS_ORIGINS`（逗號分隔，填前端正式網址；若同網域反代 `/api` 可留空）
- 可選：`DATABASE_SSL_REJECT_UNAUTHORIZED=true|false`（視 Zeabur PG TLS 而定）

Frontend：
- `VITE_API_URL`（若前後端同網域反代 `/api` 可留空，預設使用相對路徑 `/api`）

### Zeabur 建議拓樸
同一 Project 下 3 個 service：
1) PostgreSQL  
2) Backend (Node/Express)：指向上面 PG，啟動後常駐（含每 5 分鐘 cron）  
3) Frontend (Static/Vite)：靜態站；API 指向 Backend（同網域 `/api` 或設定 `VITE_API_URL`）

### 部署步驟（Zeabur）
1) 建立 Project，新增 PostgreSQL，取得 `DATABASE_URL`。  
2) 新增 Backend 服務，Root 設 `backend`，環境變數填上面列表，build/start 採 package.json 預設（`npm run build`、`npm run start`）。  
3) 新增 Frontend 服務，Root 設 `frontend`，build 採 `npm run build`，output `dist`，start `npm run preview`（或 Zeabur 靜態模式）。若同網域反代，`VITE_API_URL` 可不填。  
4) 調整前端網域與 Backend CORS（如需）。  

### Railway → Zeabur Postgres 搬遷
前置：手上有 Railway `DATABASE_URL` 與 Zeabur 新 `DATABASE_URL`。

1) 短暫停止舊後端寫入（或暫停自己的操作）。  
2) 匯出 Railway：  
   ```
   pg_dump --format=custom --no-owner --no-privileges "$RAILWAY_DATABASE_URL" > railway.dump
   ```  
3) 初始化 Zeabur DB schema：將 `database/init.sql` 對新庫執行一次。  
4) 匯入資料：  
   ```
   pg_restore --clean --no-owner --no-privileges --dbname "$ZEABUR_DATABASE_URL" railway.dump
   ```  
5) 驗收：  
   - 抽樣查詢關鍵表筆數  
   - Backend `/health` OK、排程 log 無錯  
   - 前端主要功能（查詢/計算/記帳/額度）可用  
6) 切流：前端指到 Zeabur Backend（同網域 `/api` 或 `VITE_API_URL`），確認無誤後關閉 Railway。

回滾：切流前保留 Railway，不更動 DNS；若新環境出錯，前端指回舊後端即可。

### 已移除的危險 API
- `/api/seed/*`
- `/api/import/*`
原因：避免在正式環境被誤用清空或改寫資料。若未來需要重新導入，請離線匯入 DB 或另建私有管理介面。

### 驗收清單
- `/health` 正常且 DB 連線成功
- 排程（每 5 分鐘）有日誌且無錯誤
- 主要功能頁：回饋查詢/計算/記帳/額度查詢/管理設定可用
- PWA 可安裝，API 請求不受網域限制（已改為同源 `/api`）

