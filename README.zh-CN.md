# Magpie Fingerprint

[English](README.md) · [Magpie](https://github.com/yetone/magpie) · [lm-detector](https://github.com/Ikaleio/lm-detector)

在 Magpie 中直接比较不同 provider、不同模型的响应指纹，复用已有登录与网关配置。检测与评分基于 `lmfpd-sdk`，展示参考库中的相近候选。

![检测界面，图中为明确标识的示例数据](docs/preview.png)

- 一批最多选择 24 个模型，共用三个挑战，便于横向比较。
- 实时显示采样数量与状态，支持取消、总超时和并发设置。
- 保存实际路由、原始回答、推理参数与参考库版本。
- 展示候选排名、模型家族和部分样本等状态。
- 本地历史、JSON 导出与复制；中英切换、明暗与系统主题、窄屏布局。

## 从 GitHub 安装

仓库包含可直接安装的 `dist/` 构建文件。在 Magpie 的 **Plugins** 中添加 `github:KaranocaVe/magpie-fingerprint`。也可执行：

```sh
magpie plugin add github:KaranocaVe/magpie-fingerprint
```

需要支持 `page.service` 的当前 Magpie 版本和 Bun 1.4.2+。启用后，从侧栏「模型指纹」或 provider 菜单「检测指纹」进入。点击开始会为每个模型发送三条采样请求，消耗对应通道的额度。

## 开发

```sh
bun install --frozen-lockfile
bun run check
bun start
```

页面服务默认监听 `3488`，通过 `http://127.0.0.1:3425` 使用 Magpie 网关。网关认证、`magpie web`、环境变量和显式的 `--demo` fixture 见 [integration.md](integration.md)。

## 范围与限制

首版实现数字指纹，分词器探测留待后续。概率只在参考库候选中分配，不能当成模型身份的证明。Magpie 的 middleware 和协议适配仍会生效；检测到实际 provider/model 变化时，该目标停止评分。固定账号可选，支持填写账号标识；已缓存的订阅账号可供补全。

`bun start --demo` 提供独立的示例模式，不调用真实模型。任务被宿主重启打断后会标为「已中断」，保留已收到的回答。

采用 MIT 许可证。第三方声明见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。
