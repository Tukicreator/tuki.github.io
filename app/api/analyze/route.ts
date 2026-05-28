import { generateText, Output } from "ai";
import { z } from "zod";

const extractedDataSchema = z.object({
  date: z.string().nullable().describe("日付（請求日、発行日など）"),
  companyName: z.string().nullable().describe("会社名または店舗名"),
  amount: z.string().nullable().describe("金額（合計金額、請求金額など）"),
  description: z.string().nullable().describe("内容や摘要（商品名、サービス内容など）"),
});

export async function POST(req: Request) {
  const { text, imageBase64, mimeType } = await req.json();

  try {
    // テキストベースの解析（OCR結果を使用）
    if (text) {
      const { output } = await generateText({
        model: "openai/gpt-4o-mini",
        output: Output.object({
          schema: extractedDataSchema,
        }),
        messages: [
          {
            role: "user",
            content: `以下のテキストから、日付、会社名/店舗名、金額、内容を抽出してください。
見つからない項目はnullとしてください。

テキスト:
${text}`,
          },
        ],
      });

      return Response.json({ extractedData: output });
    }

    // 画像ベースの解析
    if (imageBase64 && mimeType) {
      const { output } = await generateText({
        model: "openai/gpt-4o-mini",
        output: Output.object({
          schema: extractedDataSchema,
        }),
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "この画像から、日付、会社名/店舗名、金額、内容を抽出してください。見つからない項目はnullとしてください。",
              },
              {
                type: "image",
                image: imageBase64,
                mimeType: mimeType,
              },
            ],
          },
        ],
      });

      return Response.json({ extractedData: output });
    }

    return Response.json({ error: "テキストまたは画像データが必要です" }, { status: 400 });
  } catch (error) {
    console.error("AI analysis error:", error);
    return Response.json({ error: "解析に失敗しました" }, { status: 500 });
  }
}
