# ROAM 旅程規劃

繁體中文、多日行程規劃頁面。支援不限數量的停靠點、逐段交通方式、排序、刪除、裝置內自動儲存，以及文字匯出。資料保留於瀏覽器 localStorage；容量受瀏覽器限制，建議定期匯出。

## 執行

需要 Node.js 18 以上，無外部 npm 依賴。

```sh
npm start
```

預設使用 3000 port，可透過 `PORT` 調整。`npm run check` 檢查 JavaScript 語法。

## 地圖範圍

目前地圖為 SVG 示意圖，標記不是地理定位結果，不提供即時路況、地點搜尋建議、距離或 ETA。輸入任意地名後，可選擇路段並透過 Google Maps 查詢實際導航；每段分別開啟以保留交通方式。Google Maps 對自行車和大眾運輸的支援依所在地區而異。

若要在頁面內呈現實際 Google Maps 與路線，後續需串接 Google Maps JavaScript API、Places 及 Routes API，並設定金鑰、網域限制與帳務。
