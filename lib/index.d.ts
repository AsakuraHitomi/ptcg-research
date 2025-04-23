import { Context, Schema } from 'koishi';
declare module 'koishi' {
    interface Session {
        temp: Record<string, any>;
    }
}
export interface Config {
    itemsPerPage: number;
    dataPath: string;
    requestConcurrency: number;
    retryCount: number;
    sessionTimeout: number;
}
export declare const Config: Schema<Config>;
export declare const name = "ptcg-research";
export declare const usage = "\n# \u5B9D\u53EF\u68A6\u96C6\u6362\u5F0F\u5361\u7247\u67E5\u8BE2\n\n## \u6307\u4EE4\u683C\u5F0F\n\u5B9D\u53EF\u68A6\u67E5\u5361 [-s \u7CFB\u5217] [-l \u8BED\u8A00] <\u540D\u79F0\u6216ID>\n\nptcg [-s serie] [-l lang] <name|id>\n\n## \u793A\u4F8B\uFF1A\nptcg \u5927\u5C3E\u7ACB          # \u6A21\u7CCA\u67E5\u8BE2\u201C\u5927\u5C3E\u7ACB\u201D\n\nptcg swsh3-136       # \u7CBE\u786Eid\u67E5\u8BE2\n\nptcg -s swsh3 \u5927\u5C3E\u7ACB   # \u6307\u5B9A\u7CFB\u5217\u67E5\u8BE2\n\nptcg -l en Furret    # \u6307\u5B9A\u8BED\u8A00\u67E5\u8BE2\n";
export declare function apply(ctx: Context, config: Config): void;
