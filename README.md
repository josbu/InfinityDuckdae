## 本项目基于 [luci-app-dae](https://github.com/immortalwrt/luci/tree/master/applications/luci-app-dae) 修改，原维护者为 [Tianling Shen](https://github.com/1715173329)。

## 新增功能：
- CodeMirror 提供的代码高亮
- 日志倒序

## 编译
```
rm -rf package/feeds/packages/duck
git clone https://github.com/JohnsonRan/InfinityDuck package/new/InfinityDuck
make package/new/InfinityDuck/luci-app-duck/compile
```

