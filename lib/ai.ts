import { createOpenAI } from "@ai-sdk/openai";

// プロジェクトに用意された OpenAI APIキー(OPEN_AI_API)を直接利用する。
// これにより Vercel AI Gateway のクレジットカード登録を必要とせずに解析できる。
const openai = createOpenAI({
  apiKey: process.env.OPEN_AI_API ?? process.env.OPENAI_API_KEY,
});

// 帳票解析に使用するビジョン対応モデル
export const analysisModel = openai("gpt-4o-mini");
