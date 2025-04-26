var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __export = (target, all) => {
  for (var name2 in all)
    __defProp(target, name2, { get: all[name2], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var src_exports = {};
__export(src_exports, {
  Config: () => Config,
  apply: () => apply,
  name: () => name,
  usage: () => usage
});
module.exports = __toCommonJS(src_exports);
var import_koishi = require("koishi");
var import_axios = __toESM(require("axios"));
var OpenCC = __toESM(require("opencc-js"));
var Config = import_koishi.Schema.object({
  itemsPerPage: import_koishi.Schema.number().default(10),
  dataPath: import_koishi.Schema.string().default("./ptcg-data"),
  requestConcurrency: import_koishi.Schema.number().default(3).description("最大并发请求数"),
  retryCount: import_koishi.Schema.number().default(2).description("请求重试次数"),
  sessionTimeout: import_koishi.Schema.number().default(6e4).description("会话超时时间（毫秒）")
});
var name = "ptcg-research";
var usage = `
# 宝可梦集换式卡片查询

## 指令格式
宝可梦查卡 [-s 系列] [-l 语言] <名称或ID>

ptcg [-s serie] [-l lang] <name|id>

## 示例：
ptcg 大尾立          # 模糊查询“大尾立”

ptcg swsh3-136       # 精确id查询

ptcg -s swsh3 大尾立   # 指定系列查询

ptcg -l en Furret    # 指定语言查询
`;
function apply(ctx, config) {
  const converter = OpenCC.Converter({ from: "cn", to: "tw" });
  ctx.command("宝可梦查卡 <input:text>", "查询PTCG卡片信息").alias("ptcg").option("lang", "-l <lang>", {
    fallback: "zh-tw",
    type: import_koishi.Schema.union(["zh-cn", "zh-tw", "en", "ja"])
  }).option("serie", "-s <serie>").action(async ({ session, options }, input) => {
    if (!input) return session.execute("help ptcg");
    const lang = options.lang;
    if (/^\w+-\d+$/i.test(input)) {
      try {
        const card = await fetchCardWithFallback(input, lang);
        return formatCardDetails(card, lang);
      } catch (error) {
        ctx.logger.error('卡片查询最终失败:', error)
        return '查询失败, 请检查卡片ID是否正确或稍后重试'
      }
    } else {
      try {
        let data;
        const traditionalInput = converter(input);
        const response = await import_axios.default.get(
          `https://api.tcgdex.net/v2/${lang}/cards?name=${encodeURIComponent(traditionalInput)}`
        );
        data = response.data;
        const filterOptions = {
          serie: options.serie?.toLowerCase()
        };
        const filtered = filterCards(data, filterOptions);
        if (filtered.length === 0) return "没有找到匹配的卡片";
        if (filtered.length === 1) {
          const card = await fetchCardWithFallback(filtered[0].id, lang);
          return formatCardDetails(card, lang);
        }
        session.temp = session.temp || {};
        session.temp.pagination = {
          filtered,
          currentPage: 0,
          totalPages: Math.ceil(filtered.length / config.itemsPerPage),
          filterInfo: options.serie ? `当前筛选：系列 ${options.serie}` : `查询到${input}的全部结果：`,
          lang,
          config
        };
        try {
          while (true) {
            const { filtered: filtered2, currentPage, totalPages, filterInfo, lang: lang2, config: config2 } = session.temp.pagination;
            await session.send([
              filterInfo,
              ...formatBrief(filtered2, currentPage, config2.itemsPerPage),
              `第 ${currentPage + 1} 页 / 共 ${totalPages} 页`,
              '请at并发送数字选择卡片, 或at并发送"跳页 页码"切换页面'
            ].join("\n"));
            const input2 = await session.prompt(config2.sessionTimeout).catch(() => null);
            if (!input2) {
              await session.send("会话超时，已退出查询");
              break;
            }
            if (/^跳页\s*\d+$/i.test(input2)) {
              const page = parseInt(input2.match(/\d+/)[0]) - 1;
              if (page >= 0 && page < totalPages) {
                session.temp.pagination.currentPage = page;
              } else {
                await session.send(`页码无效, 请输入1到${totalPages}之间的数字`);
              }
            } else if (/^\d+$/.test(input2)) {
              const index = parseInt(input2) - 1;
              if (index >= 0 && index < filtered2.length) {
                const card = await fetchCardWithFallback(filtered2[index].id, lang2);
                await session.send(await formatCardDetails(card, lang2));
                break;
              } else {
                await session.send(`序号无效, 请输入1到${filtered2.length}之间的数字。`);
              }
            } else {
              await session.send("输入无效，会话已结束。");
              break;
            }
          }
        } finally {
          delete session.temp.pagination;
        }
      } catch (error) {
        ctx.logger.error("查询失败:", error);
        return "查询过程中发生错误, 请稍后重试或更改关键词";
      }
    }
  });
  function filterCards(cards, options) {
    const searchKeys = [
      options.serie?.toLowerCase()
    ].filter(Boolean);
    if (searchKeys.length === 0) return cards;
    return cards.filter((card) => {
      const cardId = card.id.toLowerCase();
      return searchKeys.some((key) => cardId.includes(key));
    });
  }
  __name(filterCards, "filterCards");
  async function fetchCardWithFallback(id, lang) {
    try {
      return await fetchCard(id, lang)
    } catch (error) {
      if (lang === 'zh-cn') {
        try {
          return await fetchCard(id, 'zh-tw')
        } catch (error) {
          throw error
        }
      }
      throw error
    }
  }
  __name(fetchCardWithFallback, "fetchCardWithFallback");
  async function fetchCard(id, lang, retry = 3) {
    try {
      const { data } = await import_axios.default.get(
        `https://api.tcgdex.net/v2/${lang}/cards/${id}`,
        { timeout: 5000 }
      )
      return data
    } catch (error) {
      if (retry > 0) {
        ctx.logger.warn(`查询失败，剩余重试次数：${retry}，卡片ID：${id}`)
        await new Promise(resolve => setTimeout(resolve, 2000))
        return fetchCard(id, lang, retry - 1)
      }
      throw error
    }
  }
  __name(fetchCard, "fetchCard");
  function formatBrief(cards, page, itemsPerPage) {
    const start = page * itemsPerPage;
    return cards.slice(start, start + itemsPerPage).map((card, i) => `${start + i + 1}. ${card.name} [${card.id}]`);
  }
  __name(formatBrief, "formatBrief");
  async function formatCardDetails(card, lang) {
    const parts = [];
    if (card.image) {
      const imageUrl = `${card.image}/high.webp`;
      parts.push(import_koishi.h.image(imageUrl));
    }
    parts.push(`${card.name}
`);
    if (card.category === "Pokemon") {
      parts.push(
        `HP：${card.hp || "——"}  `
      );
      if (card.types) {
        parts.push(`属性：${card.types.join(", ")}
`);
      }
      if (card.evolveFrom) {
        parts.push(`进化自：${card.evolveFrom}  `);
      }
      if (card.stage) {
        parts.push(`阶段：${card.stage}
`);
      }
      if (Array.isArray(card.abilities)) {
        parts.push(card.abilities.map((a) => `【${a.name}】${a.effect}`).join("\n") + "\n");
      }
      if (Array.isArray(card.attacks)) {
        parts.push(card.attacks.map((a) => `•[${a.name}]  ${a.cost?.join("+") || "—"}
${a.damage || ""}  ${a.effect || "——"}`).join("\n") + "\n");
      }
      if (Array.isArray(card.weaknesses)) {
        parts.push(`弱点：${card.weaknesses.map((w) => `${w.type}${w.value}`).join(", ")}  `);
      }
      parts.push(`撤退：${card.retreat || "0"}
`)
      if (Array.isArray(card.resistances)) {
        parts.push(`抵抗：${card.resistances.map((w) => `${w.type}${w.value}`).join(", ")}
`);
      }
    } else if (card.category === "Trainer") {
      parts.push(
        `类型: ${card.trainerType || "——"}
`,
        `效果: ${card.effect || "——"}
`
      );
    } else if (card.category === "Energy") {
      parts.push(
        `类型: ${card.energyType || "——"}
`,
        `效果: ${card.effect || "——"}
`
      );
    }
    if (card.regulationMark) {
      parts.push(`卡标: ${card.regulationMark}  `);
    }
    parts.push(`ID: ${card.id}
`);
    if (card.rarity) {
      parts.push(`稀有度: ${card.rarity}
`);
    }
    parts.push(`所属系列: ${card.set.name} (${card.set.id})`);
    return parts;
  }
  __name(formatCardDetails, "formatCardDetails");
}
__name(apply, "apply");
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Config,
  apply,
  name,
  usage
});
