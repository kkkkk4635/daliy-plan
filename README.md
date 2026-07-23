# 日程 · Daily Planner

一款零后端的每日计划与课表 Web 应用。基于 **React 18 + Vite + Tailwind CSS + Zustand + IndexedDB**,通过 **GitHub Gist** 实现多端同步,部署到 **Netlify** 即可通过自定义域名访问。

## 核心特性

- 📅 **课表视图**:7:00 - 23:00 纵向时段网格,类比真实课程表
- ⏰ **时段分区**:上午/下午/晚上三分区布局,任务自动归类
- ✅ **复选框勾选**:每个计划前有手绘风格复选框,双向绑定完成状态
- 🔁 **重复规则**:单次 / 每日 / 工作日 / 每周多选 / 自定义
- 📝 **待办管理**:独立待办模块,支持优先级(高/中/低)和截止时间提醒
- 🔔 **浏览器通知提醒**:Web Notification API,支持自定义提醒时间
- 🎮 **经验值系统**:RPG 式升级,完成任务获得 XP,等级递增解锁称号
- 🏆 **成就系统**:11 大类共 55+ 徽章,支持自定义成就创建
- 🎯 **目标管理**:短期/中期/长期目标,支持自动统计和手动进度
- 📊 **多视图切换**:日 / 周 / 月 / 年 自由切换
- ☁️ **多端同步**:通过 GitHub Gist + Personal Access Token 实现真正的跨设备数据同步
- 🎨 **手账 + 复古课表美学**:Fraunces 衬线 + Manrope 无衬线 + JetBrains Mono 等宽,2px 黑边 + 偏移阴影的"brutal"风格

## 经验值与等级

| 等级 | 称号 |
|------|------|
| 1 | 新手小白 |
| 2 | 初露锋芒 |
| 3 | 勤能补拙 |
| 4 | 渐入佳境 |
| 5 | 小有成就 |
| 6 | 稳步前行 |
| 7 | 厚积薄发 |
| 8 | 出类拔萃 |
| 9 | 登堂入室 |
| 10 | 炉火纯青 |
| 11 | 融会贯通 |
| 12 | 自成一派 |
| 13 | 超凡脱俗 |
| 14 | 登峰造极 |
| 15 | 一代宗师 |

**XP 奖励:**
- 📅 日常任务: 10 XP
- ✅ 待办任务: 低(15) / 中(25) / 高(40) XP

## 成就类别

| 类别 | 说明 |
|------|------|
| 连续打卡 | 3/7/14/30/60/100/200/365 天 |
| 单日完成 | 完美一天/一周/一月/一百天 |
| 类型丰富 | 同日完成 3/4 种类型计划 |
| 累计完成 | 10/50/100/300/500/1000/2000 次 |
| 等级提升 | 1/3/5/10/15/20 级 |
| 待办达人 | 完成 1/5/10/50/100 个待办 |
| 高优待办 | 完成 1/10/30 个高优先级待办 |
| 时段达人 | 上午/下午/晚上时段完成任务 |
| 类型大师 | 饮食/学习/运动/其他单类型累计 |
| 经验成就 | 累计获得 100/500/1000/5000/10000 XP |
| 回归徽章 | 中断 3 天后重新打卡 |

## 本地开发

```bash
pnpm install
pnpm dev
```

打开 http://localhost:5173

## 首次使用

1. 访问 [gist.github.com](https://gist.github.com/) 创建一个 Gist(文件名 `schedule.json`,内容留空)
2. 访问 [GitHub Token 设置](https://github.com/settings/tokens/new?scopes=gist) 创建一个仅勾选 `gist` 权限的 PAT
3. 打开应用,跟随引导页填入 Gist ID 与 PAT 即可

## 部署到 Netlify

1. 推送代码到 GitHub 仓库
2. 在 Netlify 连接该仓库
   - Build command: `pnpm build`
   - Publish directory: `dist`
3. 在 Netlify 绑定自定义域名

## 数据存储

- **本地**:所有数据存在浏览器的 IndexedDB(零依赖、零成本、隐私友好)
- **云端**:可选绑定 GitHub Gist,凭证仅存浏览器 localStorage,不上传任何第三方
- **同步**:支持手动推送到云端和从云端拉取,自动轮询同步

## 项目结构

```
src/
  components/      # 通用 UI 组件(EditDrawer, Layout, PlanCard, Toast, TodoDrawer, UI)
  hooks/           # 自定义 React Hooks(useAchievements, useReminder, useSync, useTheme)
  pages/           # 路由页面(Home, WeekView, MonthView, YearView, TodoView, Statistics, Achievements, Goals, Settings, Onboarding)
  store/           # Zustand store(useScheduleStore)
  utils/           # 工具函数(idb, date, sync, notify)
  types.ts         # TypeScript 类型定义
  App.tsx          # 应用入口
  main.tsx         # React 挂载点
```

## 许可

MIT
