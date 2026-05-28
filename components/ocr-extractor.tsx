"use client";

import { useState } from "react";
import { Scan, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createWorker } from "tesseract.js";
import type { DataField } from "@/components/data-entry-form";

interface OcrExtractorProps {
  file: File | null;
  onExtractedText: (text: string) => void;
  fields: DataField[];
  onFieldsChange: (fields: DataField[]) => void;
}

export function OcrExtractor({
  file,
  onExtractedText,
  fields,
  onFieldsChange,
}: OcrExtractorProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [extractedText, setExtractedText] = useState("");

  const handleOcr = async () => {
    if (!file) return;

    setIsProcessing(true);
    setProgress(0);
    setExtractedText("");

    try {
      const worker = await createWorker("jpn+eng", 1, {
        logger: (m) => {
          if (m.status === "recognizing text") {
            setProgress(Math.round(m.progress * 100));
          }
        },
      });

      let imageUrl: string;

      if (file.type === "application/pdf") {
        // PDFの場合は最初のページを画像として処理
        // PDF.jsを使わずシンプルにBlobURLを渡す
        imageUrl = URL.createObjectURL(file);
      } else {
        imageUrl = URL.createObjectURL(file);
      }

      const {
        data: { text },
      } = await worker.recognize(imageUrl);

      URL.revokeObjectURL(imageUrl);
      await worker.terminate();

      setExtractedText(text);
      onExtractedText(text);

      // 抽出したテキストを行ごとに分割して項目として追加するオプション
      const lines = text
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

      if (lines.length > 0 && fields.length === 0) {
        // 項目がまだない場合、最初の数行を項目として追加
        const newFields: DataField[] = lines.slice(0, 5).map((line, index) => ({
          id: crypto.randomUUID(),
          label: `項目${index + 1}`,
          value: line,
        }));
        onFieldsChange(newFields);
      }
    } catch (error) {
      console.error("OCR error:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const isImage = file?.type.startsWith("image/");
  const isPdf = file?.type === "application/pdf";
  const canProcess = file && (isImage || isPdf);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <label className="text-sm font-semibold uppercase tracking-wide text-foreground">
            テキスト抽出 (OCR)
          </label>
          <p className="text-sm text-muted-foreground">
            画像からテキストを自動抽出します（日本語・英語対応）
          </p>
        </div>
        <Button
          onClick={handleOcr}
          disabled={!canProcess || isProcessing}
          variant="outline"
          className="gap-2"
        >
          {isProcessing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              処理中... {progress}%
            </>
          ) : (
            <>
              <Scan className="h-4 w-4" />
              テキスト抽出
            </>
          )}
        </Button>
      </div>

      {isProcessing && (
        <div className="space-y-2">
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground text-center">
            テキストを認識しています...
          </p>
        </div>
      )}

      {extractedText && !isProcessing && (
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">
            抽出結果
          </label>
          <div className="max-h-48 overflow-auto rounded-lg border bg-muted/30 p-3">
            <pre className="whitespace-pre-wrap text-sm text-foreground font-mono">
              {extractedText}
            </pre>
          </div>
          <p className="text-xs text-muted-foreground">
            抽出されたテキストは上の入力フォームに自動的に反映されます
          </p>
        </div>
      )}

      {!canProcess && (
        <div className="rounded-lg border-2 border-dashed border-border p-4 text-center">
          <p className="text-sm text-muted-foreground">
            画像またはPDFをアップロードするとOCR機能が使用できます
          </p>
        </div>
      )}
    </div>
  );
}
