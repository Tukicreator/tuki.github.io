"use client";

import { useEffect, useState, useCallback } from "react";
import { Loader2, CheckCircle, AlertCircle, Scan, Brain } from "lucide-react";
import { createWorker } from "tesseract.js";
import { buildTable, type TextElement } from "@/lib/build-table";

// アプリ側で組み立てた表データ（列見出し・行・未分類）
export interface ExtractedTable {
  columns: string[];
  rows: string[][];
  unclassified: string[];
}

interface DocumentProcessorProps {
  file: File | null;
  onProcessingComplete: (table: ExtractedTable) => void;
  onStatusChange?: (status: ProcessingStatus) => void;
}

export type ProcessingStatus = 
  | "idle"
  | "uploading"
  | "ocr-processing"
  | "ai-analyzing"
  | "complete"
  | "error";

// Tesseractのword単位bboxから、位置情報付きの要素配列を作る
// data.blocks -> paragraphs -> lines -> words[].bbox に実際の座標が入っている
function extractElementsFromOcr(data: any): TextElement[] {
  const elements: TextElement[] = [];
  const blocks = data?.blocks ?? [];

  for (const block of blocks) {
    for (const paragraph of block?.paragraphs ?? []) {
      for (const line of paragraph?.lines ?? []) {
        for (const word of line?.words ?? []) {
          const t = (word?.text ?? "").trim();
          const bbox = word?.bbox;
          if (!t || !bbox) continue;
          elements.push({
            text: t,
            x: (bbox.x0 + bbox.x1) / 2,
            y: (bbox.y0 + bbox.y1) / 2,
            h: Math.abs(bbox.y1 - bbox.y0),
          });
        }
      }
    }
  }

  return elements;
}

export function DocumentProcessor({
  file,
  onProcessingComplete,
  onStatusChange,
}: DocumentProcessorProps) {
  const [status, setStatus] = useState<ProcessingStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [ocrText, setOcrText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const updateStatus = useCallback((newStatus: ProcessingStatus) => {
    setStatus(newStatus);
    onStatusChange?.(newStatus);
  }, [onStatusChange]);

  const processFile = useCallback(async (file: File) => {
    setError(null);
    setOcrText("");
    setProgress(0);
    updateStatus("ocr-processing");

    try {
      // Step 1: OCR処理（word単位の位置情報 bbox も取得する）
      const worker = await createWorker("jpn+eng", 1, {
        logger: (m) => {
          if (m.status === "recognizing text") {
            setProgress(Math.round(m.progress * 100));
          }
        },
      });

      const imageUrl = URL.createObjectURL(file);
      // blocks: true で単語ごとの bbox（実際の座標）を含むデータを取得
      const { data } = await worker.recognize(imageUrl, {}, { blocks: true, text: true });
      URL.revokeObjectURL(imageUrl);
      await worker.terminate();

      const text = data.text ?? "";
      setOcrText(text);
      setProgress(100);

      // Step 2: OCRのword bboxから位置情報付き要素を作る（AI/アプリの役割分担）
      updateStatus("ai-analyzing");

      let elements: TextElement[] = extractElementsFromOcr(data);

      // OCRで要素が取れなかった場合のみ、AIに位置情報付き抽出を依頼（フォールバック）
      if (elements.length === 0) {
        let imageBase64: string | undefined;
        let mimeType: string | undefined;
        if (file.type.startsWith("image/")) {
          const buffer = await file.arrayBuffer();
          imageBase64 = Buffer.from(buffer).toString("base64");
          mimeType = file.type;
        }

        const response = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, imageBase64, mimeType }),
        });

        if (!response.ok) {
          throw new Error("AI解析に失敗しました");
        }

        const { elements: aiElements } = await response.json();
        elements = Array.isArray(aiElements) ? aiElements : [];
      }

      // Step 3: アプリ側で位置情報から表を組み立てる
      const table = buildTable(elements);

      updateStatus("complete");
      onProcessingComplete(table);

    } catch (err) {
      console.error("Processing error:", err);
      setError(err instanceof Error ? err.message : "処理に失敗しました");
      updateStatus("error");
    }
  }, [onProcessingComplete, updateStatus]);

  // ファイルが変更されたら自動処理を開始
  useEffect(() => {
    if (file) {
      processFile(file);
    } else {
      updateStatus("idle");
      setOcrText("");
      setProgress(0);
      setError(null);
    }
  }, [file, processFile, updateStatus]);

  const getStatusInfo = () => {
    switch (status) {
      case "idle":
        return { icon: null, text: "ファイルをアップロードしてください", color: "text-muted-foreground" };
      case "uploading":
        return { icon: <Loader2 className="h-5 w-5 animate-spin" />, text: "アップロード中...", color: "text-primary" };
      case "ocr-processing":
        return { icon: <Scan className="h-5 w-5 animate-pulse" />, text: `OCR処理中... ${progress}%`, color: "text-primary" };
      case "ai-analyzing":
        return { icon: <Brain className="h-5 w-5 animate-pulse" />, text: "AI解析中...", color: "text-primary" };
      case "complete":
        return { icon: <CheckCircle className="h-5 w-5" />, text: "処理完了", color: "text-green-600" };
      case "error":
        return { icon: <AlertCircle className="h-5 w-5" />, text: error || "エラーが発生しました", color: "text-destructive" };
    }
  };

  const statusInfo = getStatusInfo();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <label className="text-sm font-semibold uppercase tracking-wide text-foreground">
            自動処理
          </label>
          <p className="text-sm text-muted-foreground">
            OCR抽出とAI解析を自動実行します
          </p>
        </div>
      </div>

      {/* ステータス表示 */}
      <div className={`flex items-center gap-2 ${statusInfo.color}`}>
        {statusInfo.icon}
        <span className="text-sm font-medium">{statusInfo.text}</span>
      </div>

      {/* プログレスバー */}
      {(status === "ocr-processing" || status === "ai-analyzing") && (
        <div className="space-y-2">
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full transition-all duration-300 ${
                status === "ai-analyzing" 
                  ? "bg-primary animate-pulse w-full" 
                  : "bg-primary"
              }`}
              style={{ width: status === "ocr-processing" ? `${progress}%` : "100%" }}
            />
          </div>
        </div>
      )}

      {/* OCR結果表示 */}
      {ocrText && (
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">
            OCR抽出結果
          </label>
          <div className="max-h-32 overflow-auto rounded-lg border bg-muted/30 p-3">
            <pre className="whitespace-pre-wrap text-xs text-muted-foreground font-mono">
              {ocrText}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
