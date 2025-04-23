# koishi-plugin-ptcg-research

[![npm](https://img.shields.io/npm/v/koishi-plugin-ptcg-research?style=flat-square)](https://www.npmjs.com/package/koishi-plugin-ptcg-research)

适用于koishi的宝可梦集换式卡片游戏(ptcg)的卡查功能。

# 宝可梦集换式卡片查询

## 指令格式
宝可梦查卡 [-s 系列] [-l 语言] <名称或ID>

ptcg [-s serie] [-l lang] <name|id>

## 示例：
ptcg 大尾立          # 模糊查询“大尾立”

ptcg swsh3-136       # 精确id查询

ptcg -s swsh3 大尾立   # 指定系列查询

ptcg -l en Furret    # 指定语言查询