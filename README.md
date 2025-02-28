## 本项目基于 [luci-app-dae](https://github.com/immortalwrt/luci/tree/master/applications/luci-app-dae) 修改，原维护者为 [Tianling Shen](https://github.com/1715173329)。

## 新增功能：
- CodeMirror 提供的代码高亮
- 日志倒序
- dae 核心版本总是最新

## 编译
启用如下配置：
```
CONFIG_DEVEL=y
CONFIG_KERNEL_DEBUG_INFO=y
CONFIG_KERNEL_DEBUG_INFO_REDUCED=n
CONFIG_KERNEL_DEBUG_INFO_BTF=y
CONFIG_KERNEL_CGROUPS=y
CONFIG_KERNEL_CGROUP_BPF=y
CONFIG_KERNEL_BPF_EVENTS=y
CONFIG_BPF_TOOLCHAIN_HOST=y
CONFIG_KERNEL_XDP_SOCKETS=y
CONFIG_PACKAGE_kmod-xdp-sockets-diag=y
```
随后：
```
git clone https://github.com/JohnsonRan/InfinityDuck package/new/InfinityDuck
make package/new/InfinityDuck/luci-app-duck/compile
```

## 感谢
- [Percy Ma](https://marketplace.visualstudio.com/items?itemName=kecrily.dae)
- [Tianling Shen](https://github.com/1715173329)
- Claude 3.7 Sonnet  
And more...