# dsh-workspace-folder-drop

English | [简体中文](#简体中文)

Drop a folder from your file manager onto the sidebar **Workspaces** area to register it as a
Workspace and open it — instead of attaching a folder reference to whichever conversation
happens to be open.

## What you get

- Hovering the Workspaces region during an OS folder drag shows a dashed invitation:
  **"Drop to create a workspace"**.
- Dropping registers the folder as a Workspace and opens it — the same result as the sidebar's
  **Add workspace…** action. Dropping an already-registered folder just opens it.
- A short notice reports the outcome; a failure is reported instead of being swallowed.
- Everything else is untouched: dropping a folder on the conversation area, dropping plain
  files, mixed drags, and non-file drags behave exactly as before.

### One limit worth knowing

A web page is never told the path of a dropped folder. The plugin tries, in order: the Desktop
app's path bridge, a path the file manager published on the dragboard, and a bounded name
lookup through the plugin's own Host route. If all of them miss, it opens the system folder
chooser — so in a plain browser you may occasionally have to pick the folder once.

## Install

The browser half is served per request and applies on a page refresh; the host half is imported
once per process, so a change needs a restart.

From the client: **Plugins** → install → paste

```
github:RorschachXR/dsh-workspace-folder-drop
```

Or from a terminal, once per profile you use:

```sh
dsh plugin --profile web     add github:RorschachXR/dsh-workspace-folder-drop
dsh plugin --profile desktop add github:RorschachXR/dsh-workspace-folder-drop
```

On the Desktop app, install from **Settings → Plugins** rather than the CLI.

## Uninstall

```sh
dsh plugin --profile web remove dsh-workspace-folder-drop
```

The Workspaces you created stay registered.

---

## 简体中文

把文件夹从文件管理器拖到侧栏 **Workspaces** 区域，即可把它注册为 Workspace 并打开，
而不是变成一个指向该文件夹的引用挂在当前对话里。

### 开启后你会得到

- 拖拽经过 Workspaces 区域时会出现虚线提示：**"Drop to create a workspace"**。
- 松手即把该文件夹注册为 Workspace 并打开——效果与侧栏的 **Add workspace…** 相同；
  已注册过的文件夹只会被打开。
- 结果会以一条短提示反馈；失败会明确报错，不会静默吞掉。
- 其他行为完全不变：把文件夹拖到对话区、拖普通文件、混合拖拽、非文件拖拽，都和原来一致。

### 一个需要知道的限制

网页拿不到被拖动文件夹的路径。插件按顺序尝试：桌面应用的路径桥、文件管理器写在拖拽板上的
路径、以及通过插件自己的 Host 路由按名字做有界查找。全部落空时会打开系统文件夹选择器——
所以在纯浏览器里，偶尔需要你手动选一次文件夹。

### 安装

浏览器半边按请求下发，刷新页面即生效；host 半边每个进程只导入一次，改动需要重启进程。

在客户端里：**插件** → 安装 → 粘贴

```
github:RorschachXR/dsh-workspace-folder-drop
```

或在终端按你用的 profile 各装一次：

```sh
dsh plugin --profile web     add github:RorschachXR/dsh-workspace-folder-drop
dsh plugin --profile desktop add github:RorschachXR/dsh-workspace-folder-drop
```

桌面应用请从 **设置 → 插件** 安装，而不是命令行。

### 卸载

```sh
dsh plugin --profile web remove dsh-workspace-folder-drop
```

你创建过的 Workspace 不会被删除。

> 已在 DSH 0.2.1-rc.3 上安装验证。
