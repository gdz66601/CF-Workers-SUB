# 🔐 新增多访客Token管理系统 - Pull Request

## 📋 功能概述

本次更新为 CF-Workers-SUB 项目新增了完整的多访客Token管理系统，提供了用户访问控制和监控功能。该系统允许管理员创建、管理多个独立的访客token，每个token都有独立的访问记录和状态控制。

## ✨ 主要新增功能

### 🎯 多Token管理
- 支持创建无限个访客token
- 每个token独立管理，互不干扰
- 支持自定义token名称和值
- 自动生成随机token功能

### 📊 访问统计与监控
- 实时记录每个token的访问次数
- 记录最后访问时间
- 详细的IP地址和User-Agent记录
- 访问历史记录（最多保存100条）

### 🔄 灵活的状态控制
- 支持启用/禁用token
- 一键删除token及其所有访问记录
- 实时状态更新，无需页面刷新

### 📱 现代化管理界面
- 响应式Web界面设计
- 支持手机和桌面访问
- AJAX操作，无页面刷新
- 实时反馈和状态更新

## 🔧 技术实现

### 核心架构
- **后端**：基于Cloudflare Workers的无服务器架构
- **存储**：使用Cloudflare KV进行数据持久化
- **前端**：原生JavaScript + CSS，无外部依赖
- **安全**：多层权限控制和访问监控

### 数据结构
```javascript
// GUEST_TOKENS 存储结构
{
  "token_name": {
    "token": "actual_token_value",
    "name": "显示名称",
    "active": true,
    "created": "2024-01-01T00:00:00.000Z",
    "access_count": 0,
    "last_access": null
  }
}

// ACCESS_LOG_[token] 存储结构
[
  {
    "timestamp": "2024-01-01T00:00:00.000Z",
    "ip": "192.168.1.1",
    "userAgent": "Mozilla/5.0..."
  }
]
```

### 权限设计
| 用户类型 | 访问权限 | Token格式 |
|---------|---------|-----------|
| 管理员 | 管理面板 + 订阅服务 | `admin_` + 主token |
| 访客用户 | 仅订阅服务 | 自定义访客token |
| 临时用户 | 24小时临时访问 | fakeToken |
| 未授权用户 | 无访问权限 | - |

## 🚀 使用方法

### 1. 环境配置
```bash
# 新增环境变量（可选）
ADMINTOKEN=your_admin_token  # 默认为 admin_ + TOKEN
```

### 2. 访问管理面板
```
https://你的域名/admin_auto  # 假设主token为auto
```

### 3. 创建访客Token
1. 在管理面板填写token名称
2. 可选择自定义token值或自动生成
3. 点击"创建Token"

### 4. 访客使用
```
https://你的域名/sub?token=访客token
```

## 🔒 安全特性

### 访问控制
- 管理员token与访客token完全隔离
- 访客token无法访问管理面板
- 支持token的启用/禁用控制

### 监控与审计
- 所有token访问都会被记录
- IP地址和User-Agent追踪
- Telegram通知（管理员访问时）
- 访问统计和历史记录

### 数据保护
- 访问日志自动限制数量（100条）
- 防止存储溢出
- 安全的token生成算法

## 📁 文件变更

### 主要修改文件
- `_worker.js` - 核心功能实现
- `README.md` - 文档更新

### 新增功能模块
1. **Token管理模块**
   - `getValidGuestTokens()` - 获取有效token列表
   - `generateRandomToken()` - 生成随机token
   - Token CRUD操作

2. **访问日志模块**
   - `logTokenAccess()` - 记录访问日志
   - 访问统计计算
   - 日志清理机制

3. **管理面板模块**
   - `AdminPanel()` - 管理界面渲染
   - AJAX操作处理
   - 响应式UI设计

4. **权限控制模块**
   - `isValidGuestToken()` - token验证
   - 多层权限检查
   - 安全访问控制

## 🧪 测试建议

### 功能测试
1. **Token管理**
   - 创建新token（自定义/自动生成）
   - 启用/禁用token
   - 删除token及其记录

2. **访问控制**
   - 管理员token访问管理面板
   - 访客token访问订阅服务
   - 无效token的拒绝访问

3. **监控功能**
   - 访问记录的正确性
   - 统计数据的准确性
   - 日志清理机制

### 兼容性测试
- 不同浏览器的界面兼容性
- 移动设备响应式设计
- KV存储的数据一致性

## 📈 性能优化

### 前端优化
- AJAX操作避免页面刷新
- 按需加载和更新UI元素
- 优化的CSS和JavaScript

### 后端优化
- 高效的KV存储操作
- 访问日志的自动清理
- 缓存机制优化

## 🔄 向后兼容性

本次更新完全向后兼容：
- 原有的TOKEN和GUEST变量继续有效
- 现有的订阅链接不受影响
- 原有功能保持不变

## 📝 部署说明

### 必需配置
- Cloudflare KV命名空间绑定
- 环境变量配置（TOKEN必填）

### 可选配置
- ADMINTOKEN（自定义管理员token）
- TGTOKEN和TGID（Telegram通知）

## 🎯 未来规划

### 计划功能
- Token使用期限设置
- 更详细的访问分析
- 批量token管理
- API接口支持

### 优化方向
- 更丰富的统计图表
- 导出访问记录功能
- 更细粒度的权限控制

---

## 📞 支持与反馈

如有问题或建议，请通过以下方式联系：
- GitHub Issues
- 项目讨论区
- 社区群组

感谢您的使用和支持！🎉