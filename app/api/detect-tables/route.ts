import { generateText, Output } from "ai";
import { z } from "zod";
import { analysisModel } from "@/lib/ai";

// 画像内で検出した表（テーブル）1つ分の情報
const detectionSchema = z.object({
  tables: z
    .array(
      z.object({
        label: z
          .string()
          .describe(
            "この表の内容を表す短い名前。例: '商品一覧', '支払条件', '合計金額'。"
          ),
        description: z
          .string()
          .describe("この表に含まれる情報の簡単な説明（1文程度）。"),
        box: z
          .object({
            x: z.number().describe("表の左端。画像の横幅に対する割合(0〜1)。"),
            y: z.number().describe("表の上端。画像の高さに対する割合(0〜1)。"),
            width: z.number().describe("表の横幅。画像の横幅に対する割合(0〜1)。"),
            height: z.number().describe("表の高さ。画像の高さに対する割合(0〜1)。"),
          })
          .describe("画像内での表の位置とサイズ（正規化座標、左上が原点）。"),
      })
    )
    .describe("画像内で検出したすべての表（テーブル）の配列。"),
});

const INSTRUCTION = `あなたは帳票（注文書・請求書・納品書・レシートなど）の画像を解析し、
その中に含まれる「表（テーブル）」の位置を検出する専門アシスタントです。

タスク:
- 画像全体を見て、表形式でまとまっている領域をすべて検出してください。
- 画像内に複数の表がある場合は、それぞれ別々のテーブルとして認識してください。
  例: 商品一覧、支払条件、合計金額テーブル など。
- 明細行が並んだ表だけでなく、キーと値が縦に並んだ情報ブロック（発行元情報、合計金額欄など）も、
  ひとまとまりの表として検出して構いません。
- 各表について、画像内での位置を正規化座標(0〜1)のバウンディングボックスで返してください。
  x,y は表の左上の座標、width,height はその表のサイズです。原点は画像の左上です。
- box は表全体（ヘッダーとすべての行）をできるだけ隙間なく囲むようにしてください。
- label にはその表の内容がひと目で分かる短い名前を付けてください。

重要:
- ここではデータの中身を読み取る必要はありません。表の「位置」と「種類」を特定することだけに集中してください。`;

export async function POST(req: Request) {
  const { imageBase64, mimeType } = await req.json();

  if (!imageBase64 || !mimeType) {
    return Response.json(
      { error: "画像データ(imageBase64, mimeType)が必要です" },
      { status: 400 }
    );
  }

  try {
    const { output } = await generateText({
      model: analysisModel,
      output: Output.object({ schema: detectionSchema }),
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `${INSTRUCTION}\n\nこの画像から表(テーブル)を検出してください。`,
            },
            { type: "image", image: imageBase64, mimeType: mimeType },
          ],
        },
      ],
    });

    // 座標を 0〜1 の範囲に丸めて安全にする
    const tables = (output.tables || []).map((t) => ({
      label: t.label,
      description: t.description,
      box: {
        x: clamp01(t.box.x),
        y: clamp01(t.box.y),
        width: clamp01(t.box.width),
        height: clamp01(t.box.height),
      },
    }));

    return Response.json({ tables });
  } catch (error) {
    console.error("Table detection error:", error);
    return Response.json({ error: "表の検出に失敗しました" }, { status: 500 });
  }
}

function clamp01(n: number): number {
  if (typeof n !== "number" || Number.isNaN(n)) return 0;
  return Math.min(1, Math.max(0, n));
}
