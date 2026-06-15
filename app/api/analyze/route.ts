import { generateText, Output } from "ai";
import { z } from "zod";

// AIが列名を自動判定し、表形式データを抽出するスキーマ
const tableSchema = z.object({
  columns: z
    .array(z.string())
    .describe(
      "資料から判定した列名（ヘッダー）の配列。例: ['商品名','単価','数量','合計']。資料の内容に応じて適切な列名を自由に決めること。"
    ),
  rows: z
    .array(z.array(z.string()))
    .describe(
      "各行のデータ。各行は columns と同じ順序・同じ要素数の文字列配列。該当データが無いセルは空文字にする。"
    ),
});

const INSTRUCTION = `あなたは資料から数値データを抽出する専門アシスタントです。
画像やテキストから表形式のデータを読み取り、構造化してください。

ルール:
- 資料の内容を見て、最も適切な列名（ヘッダー）を自分で判定してください。固定の項目に縛られる必要はありません。
- 経理・営業・在庫など、あらゆる業務の数字データに対応してください。
- 表が含まれる場合は、その表の見出しを columns、各行を rows として抽出してください。
- 表形式でない請求書や領収書などの場合でも、日付・会社名・金額・内容など読み取れる項目を列として構成してください。
- 数値はできるだけそのままの表記で抽出してください（カンマや単位を含めてよい）。
- 各行(rows)の要素数は columns の数と必ず一致させてください。`;

export async function POST(req: Request) {
  const { text, imageBase64, mimeType } = await req.json();

  try {
    // 画像ベースの解析（優先）
    if (imageBase64 && mimeType) {
      const { output } = await generateText({
        model: "openai/gpt-4o-mini",
        output: Output.object({ schema: tableSchema }),
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: `${INSTRUCTION}\n\nこの画像から表形式データを抽出してください。` },
              { type: "image", image: imageBase64, mimeType: mimeType },
            ],
          },
        ],
      });

      return Response.json({ table: output });
    }

    // テキストベースの解析（OCR結果を使用）
    if (text) {
      const { output } = await generateText({
        model: "openai/gpt-4o-mini",
        output: Output.object({ schema: tableSchema }),
        messages: [
          {
            role: "user",
            content: `${INSTRUCTION}\n\n以下のテキストから表形式データを抽出してください。\n\nテキスト:\n${text}`,
          },
        ],
      });

      return Response.json({ table: output });
    }

    return Response.json({ error: "テキストまたは画像データが必要です" }, { status: 400 });
  } catch (error) {
    console.error("AI analysis error:", error);
    return Response.json({ error: "解析に失敗しました" }, { status: 500 });
  }
}
