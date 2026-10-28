# 在手機安裝「解放地圖」

## iPhone / iPad

1. 用 **Safari** 開啟 [解放的Google Maps](https://lhx2026-seven.github.io/liberation-google-maps-patch/)。
2. 點 Safari 的「分享」。
3. 選「加入主畫面」，若出現「以網頁 App 開啟」請保持開啟。
4. 按「加入」，之後從主畫面圖示啟動。

**不用下載 ZIP、APK 或 IPA。把 GitHub 檔案下載到 iOS「檔案」開啟，不能安裝 PWA。**

## Android

用 Chrome 開啟同一網址，點頁面「加入主畫面」，或瀏覽器選單的「安裝應用程式」。

## 使用須知

- 地圖、地點搜尋與路線需要網路；離線只能開啟已快取的介面及本機行程。
- 首次使用先連網開啟一次，才有離線介面。
- iOS 主畫面 App 與原本 Safari 的資料不保證共享。請先匯出行程備份；主畫面 App 若沒有金鑰，需在管理員功能設定一次。
- 目前匯出是文字備份，還沒有一鍵匯入；請保留原本瀏覽器行程。
- 更新透過網站發布，連網重新開啟即可取得新版。App 不會強制重整正在編輯的頁面。
- 若想移除，長按主畫面圖示即可；移除或清除網站資料可能使本機行程與金鑰遺失。

`manifest.webmanifest`、`sw.js`、`pwa.js`、`icons/` 是 PWA 原始檔；由 GitHub Actions 發布到 Pages。它們不是 iOS 安裝包。
