import { generateText, Output } from "ai";
import { z } from "zod";

// AI は「表」を作らず、文字・数字とその位置情報(x, y)だけを抽出する
const elementsSchema = z.object({
  elements: z
    .array(
      z.object({
        text: z.string().describe("読み取った文字や数字（1つの語/セル単位）"),
        x: z.number().describe("要素の中心の x 座標（画像の左上が原点、右方向が正）"),
        y: z.number().describe("要素の中心の y 座標（画像の左上が原点、下方向が正）"),
      })
    )
    .describe("画像内から読み取った全ての文字・数字要素とその位置情報"),
});

const INSTRUCTION = `あなたは画像から文字・数字とその位置情報を抽出するOCRエンジンです。

【重要】あなたの役割は「抽出」だけです。表(Excel)を完成させようとしないでください。
- 表の組み立て・列の対応付け・行の整理は一切行わないでください。
- 読み取れる文字や数字を、できるだけ漏れなく1つずつ要素として返してください。
- 各要素には必ず画像内の位置情報(x, y)を付けてください。x は左からの位置、y は上からの位置です。
- 座標は画像左上を原点(0,0)とし、ピクセル相当の数値で推定してください。
- 同じ行(横並び)の要素は y の値がほぼ同じになるようにしてください。
- 出力は指定されたJSON(elements配列)のみ。説明文・Markdown・コードフェンスは含めないでください。`;

export async function POST(req: Request) {
  const { text, imageBase64, mimeType } = await req.json();

  try {
    // 画像ベースの抽出（優先）
    if (imageBase64 && mimeType) {
      const { output } = await generateText({
        model: "openai/gpt-4o-mini",
        output: Output.object({ schema: elementsSchema }),
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: `${INSTRUCTION}\n\nこの画像から文字・数字と位置情報を抽出してください。` },
              { type: "image", image: imageBase64, mediaType: mimeType },
            ],
          },
        ],
      });

      return Response.json({ elements: output.elements });
    }

    // テキストベースの抽出（OCRテキストのみで座標が無い場合の近似フォールバック）
    if (text) {
      const { output } = await generateText({
        model: "openai/gpt-4o-mini",
        output: Output.object({ schema: elementsSchema }),
        messages: [
          {
            role: "user",
            content: `${INSTRUCTION}\n\n以下はOCRで読み取ったテキストです。行と列のレイアウトを推測し、各語に近似的な位置情報(x, y)を付けて要素として返してください。同じ行の語は同じ y、左右の位置に応じて x を変えてください。\n\nテキスト:\n${text}`,
          },
        ],
      });

      return Response.json({ elements: output.elements });
    }

    return Response.json({ error: "テキストまたは画像データが必要です" }, { status: 400 });
  } catch (error) {
    console.error("AI analysis error:", error);
    return Response.json({ error: "解析に失敗しました" }, { status: 500 });
  }
}
