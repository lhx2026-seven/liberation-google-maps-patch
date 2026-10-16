# 地圖行程工具

滿版 Google Maps 嵌入地圖，搭配可收合的行程面板。

- 自由新增停靠點、調整順序與刪除
- 逐段選擇步行、開車、大眾運輸或自行車
- 分天安排、自動儲存於瀏覽器、文字匯出
- 點選地點旁的定位按鈕，在地圖顯示該地點
- 點選每段「路線」，以該段交通方式開啟 Google Maps 導航

## 執行

Node.js 18 以上，無需安裝 npm 依賴。

```sh
npm start
```

預設 port 3000，可透過 PORT 變數調整。`npm run check` 檢查 JavaScript 語法。

## 地圖

使用 Google Maps iframe 顯示真實互動地圖，須可連線 Google Maps。行程停靠點無程式設定的數量上限，資料容量受瀏覽器 localStorage 限制。

目前 iframe 顯示所選地點，未在內嵌地圖繪製整日行程或混合交通路線。實際路線於 Google Maps 分段查詢。如需在本頁繪製路線、取得時間及距離或提供地點自動完成，需另外串接 Google Maps JavaScript API / Places / Routes API，並設定 API 金鑰與帳務。本工具為獨立專案，非 Google 官方產品或 Google Maps 網站擴充套件。
