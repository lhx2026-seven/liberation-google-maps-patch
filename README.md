# 地圖行程工具

預設使用有道路與地名標示的衛星圖，可在地圖右上切換地圖類型。點選地圖上的商家、景點或既有行程標記，可自動帶入新增目的地欄位，再按新增加入行程。Google 地點建議仍可輸入搜尋；地圖空白處不會視為已知地點。

滿版 Google Maps 與可收合行程工具：多日安排、自由新增停靠點、每段獨立交通方式、排序、裝置內儲存與匯出。

## GitHub Pages

1. 儲存庫 Settings → Pages → Build and deployment → Source 選擇 **GitHub Actions**。
2. 推送 main 或在 Actions 執行 Deploy GitHub Pages 工作流程。
3. 開啟 https://lhx2026-seven.github.io/liberation-google-maps-patch/ 。
4. 點「設定 Google Maps 金鑰」，在頁面內輸入金鑰。

金鑰應用程式限制設為「網站」，允許 `https://lhx2026-seven.github.io/*`；本機開發另加 `http://localhost:3000/*`。API 限制允許 Maps JavaScript API、Places API (New)、Routes API，專案必須已啟用這些服務並連結帳務。

金鑰只保留在本機瀏覽器 localStorage，不提交至 GitHub，不透過匯出行程分享。前端金鑰會被使用者看見，網站和 API 限制仍是必要保護。其他瀏覽器或裝置需各自設定金鑰。

未設定金鑰時顯示 Google Maps 嵌入地圖；設定後使用 Maps JavaScript、Places 與瀏覽器 routes 程式庫顯示標記、搜尋建議、各段路線、合計距離及時間。不需要後端或後端金鑰。

路線逐段查詢，因此沒有整日 waypoint 數量上限；每段都可能計費並受 Google 配額及所在地區交通方式支援限制。相同路線在本次頁面生命週期內重用查詢；刷新後重新查詢。天數目前是行程分類，交通時間按查詢當下計算，不代表指定日期班表。查詢部分失敗時保留成功路線並顯示提示，亦可逐段開啟 Google Maps。

## 本機

Node.js 18 以上，無 npm 依賴。

```sh
npm start
npm run check
```

預設 port 3000，PORT 可覆寫。靜態發布只需 index.html、app.js、style.css。相對資源路徑支援 Pages 的儲存庫子目錄。

## 驗證範圍

語法檢查及 Chromium 模擬 Google API 測試已驗證金鑰設定流程、混合交通請求、切換交通方式、搜尋選點、空白天數與資料持久化。雲端網路封鎖 Google Maps / GitHub Pages，且未取得使用者金鑰；真實 API 回應與 Pages 發布狀態須在正式網址確認。本工具為獨立專案，非 Google 官方產品。
