// AI / OCR が抽出した「生データ要素」から表を組み立てるロジック。
//
// 役割分担:
//   - AI / OCR: 文字・数字とその位置情報(x, y)を抽出するだけ（表は作らない）
//   - このモジュール: 位置情報を使ってヘッダー行を検出し、rows と unclassified に整理する

// 画像内の 1 要素（文字/数字）とその位置情報
export interface TextElement {
  text: string;
  x: number; // 要素中心の x 座標
  y: number; // 要素中心の y 座標
  h?: number; // 要素の高さ（あれば行クラスタリングの精度が上がる）
}

// アプリ側で組み立てた最終的な表データ
export interface BuiltTable {
  columns: string[];
  rows: string[][];
  unclassified: string[];
}

// y 座標の近い要素を同じ行としてまとめる
function groupIntoRows(elements: TextElement[], yTol: number): TextElement[][] {
  const sorted = [...elements].sort((a, b) => a.y - b.y || a.x - b.x);
  const rows: TextElement[][] = [];

  for (const el of sorted) {
    const lastRow = rows[rows.length - 1];
    if (lastRow) {
      const meanY = lastRow.reduce((sum, e) => sum + e.y, 0) / lastRow.length;
      if (Math.abs(el.y - meanY) <= yTol) {
        lastRow.push(el);
        continue;
      }
    }
    rows.push([el]);
  }

  // 各行を左から右（x 昇順）に並べる
  for (const row of rows) {
    row.sort((a, b) => a.x - b.x);
  }
  return rows;
}

// 行クラスタリング用の y 許容差を要素の分布から推定する
function estimateYTolerance(elements: TextElement[]): number {
  const heights = elements
    .map((e) => e.h)
    .filter((h): h is number => typeof h === "number" && h > 0)
    .sort((a, b) => a - b);

  if (heights.length > 0) {
    const medianHeight = heights[Math.floor(heights.length / 2)];
    return Math.max(medianHeight * 0.7, 4);
  }

  const ys = elements.map((e) => e.y);
  const range = Math.max(...ys) - Math.min(...ys) || 1;
  return Math.max(range * 0.015, 8);
}

// 要素を x 座標が最も近い列（アンカー）に割り当てる
function nearestColumnIndex(x: number, anchors: number[]): number {
  let best = 0;
  let bestDist = Infinity;
  for (let i = 0; i < anchors.length; i++) {
    const dist = Math.abs(x - anchors[i]);
    if (dist < bestDist) {
      bestDist = dist;
      best = i;
    }
  }
  return best;
}

/**
 * 位置情報付きの生データ要素から表を組み立てる。
 *
 * ① 同じ高さ(y)に複数項目が並ぶ行のうち、最も列数が多い行をヘッダーとして検出
 * ② ヘッダーより下の要素を x 座標で各列に割り当てて rows を作成
 * ③ ヘッダーより上の要素や表に入らない要素は unclassified へ
 */
export function buildTable(rawElements: TextElement[]): BuiltTable {
  const elements = rawElements
    .map((e) => ({ ...e, text: (e.text ?? "").trim() }))
    .filter((e) => e.text.length > 0);

  if (elements.length === 0) {
    return { columns: [], rows: [], unclassified: [] };
  }

  const yTol = estimateYTolerance(elements);
  const groupedRows = groupIntoRows(elements, yTol);

  // ① ヘッダー行の検出: 列数が最も多い行（同数なら最も上）
  let headerIndex = -1;
  let maxCells = 1; // ヘッダーは最低 2 列必要
  for (let i = 0; i < groupedRows.length; i++) {
    if (groupedRows[i].length > maxCells) {
      maxCells = groupedRows[i].length;
      headerIndex = i;
    }
  }

  // ヘッダーが見つからない（全行が単一項目）場合は表を作れないため全て unclassified
  if (headerIndex === -1) {
    return {
      columns: [],
      rows: [],
      unclassified: groupedRows.flat().map((e) => e.text),
    };
  }

  const headerRow = groupedRows[headerIndex];
  const columns = headerRow.map((e) => e.text);
  const anchors = headerRow.map((e) => e.x);

  const rows: string[][] = [];
  const unclassified: string[] = [];

  for (let i = 0; i < groupedRows.length; i++) {
    if (i === headerIndex) continue;

    // ヘッダーより上の行は表の一部ではないため未分類へ
    if (i < headerIndex) {
      unclassified.push(...groupedRows[i].map((e) => e.text));
      continue;
    }

    // ③ ヘッダーより下: x 座標で各列へ割り当てて rows を作成
    const cells = new Array<string>(columns.length).fill("");
    for (const el of groupedRows[i]) {
      const colIndex = nearestColumnIndex(el.x, anchors);
      cells[colIndex] = cells[colIndex] ? `${cells[colIndex]} ${el.text}` : el.text;
    }

    if (cells.some((c) => c.trim().length > 0)) {
      rows.push(cells);
    }
  }

  return { columns, rows, unclassified };
}
