# 工地测量工具 Site Measure Tool

一个完全离线运行的工地测量小程序（纯 HTML/CSS/JS，无需任何框架或联网依赖）。
A fully offline construction site measurement tool — plain HTML/CSS/JS, no build step, no external dependencies.

## 功能 Features

- 📏 **单位换算 Units** — meter ⇄ ft, sqm ⇄ sqft
- 📷 **拍照测距 Distance** — 角度+高度法 / 参考物校正法 (angle+height method / reference-object method)
- 🧭 **水平仪 Level** — 摄像头叠加十字水平线 camera-overlay bubble level
- 📐 **三角计算 Triangle** — 图形化直角三角形计算器 interactive right-triangle calculator
- 🏠 **房间测绘 Room Scan** — 用手机传感器测绘房间地板/墙/天花，3D 线框预览，导出 JPG/PDF 报告
  (sensor-based room floor/wall/ceiling scan, live 3D wireframe, JPG/PDF export)

设置里可切换中文/English、默认相机高度、默认单位 m/ft、浅色主题等。
Settings: language (中文/English), default camera height, default unit (m/ft), light theme, and more.

## 部署 Deployment (GitHub Pages)

1. 在 GitHub 建一个新的 **public** 仓库，把这个文件夹的内容 push 上去
2. 仓库 **Settings → Pages** → Source 选 **Deploy from a branch** → Branch `main` / `(root)` → Save
3. 等 1 分钟，GitHub 会给一个网址，例如 `https://<用户名>.github.io/<仓库名>/`

## 手机安装 Install on phone

1. 用手机 Chrome 打开上面那个 https:// 网址
2. 允许相机 / 方向感应权限（第一次点"开启相机"/"校准水平线"时会弹出）
3. Chrome 菜单 (⋮) → **添加到主屏幕 Add to Home screen**
4. 之后即可离线使用（Service Worker 已缓存所有文件）

> ⚠️ 相机与方向感应 API 只在 **HTTPS** 或 **localhost** 下可用，`file://` 直接打开无法使用拍照/水平仪/房间测绘功能（单位换算、三角计算不受影响）。

## 技术说明 Notes

- 无第三方库、无打包工具，`index.html` / `style.css` / `app.js` 直接可读
- 所有测量基于手机方向传感器 (DeviceOrientationEvent) 与摄像头俯仰角三角函数估算，**仅供估算参考**，非专业测量仪器
- 房间测绘假设测量者站在同一固定点原地转身拍摄各个角落
- PDF 导出为手写的最小 PDF 结构（直接内嵌 JPEG，无需任何库）

## 关于 About

Sunny Rainbow (M) Sdn Bhd — 详见 App 内「⋮ 更多菜单 → 关于我们」。
