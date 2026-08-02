"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Loader2,
  CheckCircle,
  AlertCircle,
  ScanSearch,
  Brain,
  Table2,
  MousePointerSquareDashed,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  ImageAnnotator,
  type BoxRect,
  type TableRegion,
} from "@/components/image-annotator";

// AIが抽出した表データ
export interface ExtractedTable {
  columns: string[];
  rows: string[][];
}

export type ProcessingStatus =
  | "idle"
  | "detecting"
  | "detected"
  | "analyzing"
  | "complete"
  | "error";

interface TableDetectorProps {
  file: File | null;
  onProcessingComplete: (table: ExtractedTable) => void;
  onStatusChange?: (status: ProcessingStatus) => void;
}

export function TableDetector({
  file,
  onProcessingComplete,
  onStatusChange,
}: TableDetectorProps) {
  const [status, setStatus] = useState<ProcessingStatus>("idle");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isImage, setIsImage] = useState(false);
  const [regions, setRegions] = useState<TableRegion[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [analyzeProgress, setAnalyzeProgress] = useState({ current: 0, total: 0 });

  const imageElRef = useRef<HTMLImageElement | null>(null);

  const updateStatus = useCallback(
    (s: ProcessingStatus) => {
      setStatus(s);
      onStatusChange?.(s);
    },
    [onStatusChange]
  );

  // ---- Step1: 画像全体から表を検出する ----
  const detectTables = useCallback(
    async (imageFile: File) => {
      setError(null);
      setRegions([]);
      updateStatus("detecting");

      try {
        const buffer = await imageFile.arrayBuffer();
        const base64 = arrayBufferToBase64(buffer);

        const res = await fetch("/api/detect-tables", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageBase64: base64, mimeType: imageFile.type }),
        });

        if (!res.ok) throw new Error("表の検出に失敗しました");

        const { tables } = (await res.json()) as {
          tables: { label: string; description?: string; box: BoxRect }[];
        };

        const detected: TableRegion[] = (tables || []).map((t) => ({
          id: crypto.randomUUID(),
          label: t.label || "テーブル",
          description: t.description,
          box: t.box,
          source: "auto",
          selected: true, // 初期状態は全選択
        }));

        setRegions(detected);
        updateStatus("detected");
      } catch (err) {
        console.error("Detection error:", err);
        setError(err instanceof Error ? err.message : "検出に失敗しました");
        updateStatus("error");
      }
    },
    [updateStatus]
  );

  // ファイル変更時: 画像URL準備 & 自動検出
  useEffect(() => {
    if (!file) {
      setImageUrl(null);
      setIsImage(false);
      setRegions([]);
      setError(null);
      setAnalyzeProgress({ current: 0, total: 0 });
      updateStatus("idle");
      return;
    }

    const image = file.type.startsWith("image/");
    setIsImage(image);

    if (image) {
      const url = URL.createObjectURL(file);
      setImageUrl(url);
      detectTables(file);
      return () => URL.revokeObjectURL(url);
    } else {
      // 画像以外（PDF等）は自動検出の対象外
      setImageUrl(null);
      updateStatus("idle");
    }
  }, [file, detectTables, updateStatus]);

  // ---- Step3: 選択操作 ----
  const toggleRegion = (id: string) => {
    setRegions((prev) =>
      prev.map((r) => (r.id === id ? { ...r, selected: !r.selected } : r))
    );
  };

  const addManualRegion = (box: BoxRect) => {
    setRegions((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        label: "手動選択",
        box,
        source: "manual",
        selected: true,
      },
    ]);
  };

  const removeRegion = (id: string) => {
    setRegions((prev) => prev.filter((r) => r.id !== id));
  };

  const selectedRegions = regions.filter((r) => r.selected);

  // ---- Step4 & 5: 選択された表だけを切り出してAI解析 ----
  const analyzeSelected = async () => {
    if (!imageUrl || selectedRegions.length === 0) return;

    setError(null);
    updateStatus("analyzing");
    setAnalyzeProgress({ current: 0, total: selectedRegions.length });

    try {
      const img = await loadImage(imageUrl);

      for (let i = 0; i < selectedRegions.length; i++) {
        const region = selectedRegions[i];
        setAnalyzeProgress({ current: i + 1, total: selectedRegions.length });

        // 選択領域だけを切り出す
        const cropBase64 = cropRegion(img, region.box);

        const res = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageBase64: cropBase64,
            mimeType: "image/png",
          }),
        });

        if (!res.ok) throw new Error(`「${region.label}」の解析に失敗しました`);

        const { table } = (await res.json()) as { table: ExtractedTable };
        if (table && Array.isArray(table.columns) && table.columns.length > 0) {
          onProcessingComplete(table);
        }
      }

      updateStatus("complete");
    } catch (err) {
      console.error("Analyze error:", err);
      setError(err instanceof Error ? err.message : "解析に失敗しました");
      updateStatus("error");
    }
  };

  const statusInfo = getStatusInfo(status, error, analyzeProgress);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <label className="text-sm font-semibold uppercase tracking-wide text-foreground">
            表の検出と解析
          </label>
          <p className="text-sm text-muted-foreground">
            表を自動検出 → 解析したい表を選択 → 選択分だけをAI解析
          </p>
        </div>
        {isImage && (status === "detected" || status === "complete" || status === "error") && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => file && detectTables(file)}
            className="shrink-0 gap-1.5 bg-transparent"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            再検出
          </Button>
        )}
      </div>

      {/* ステータス */}
      <div className={`flex items-center gap-2 ${statusInfo.color}`}>
        {statusInfo.icon}
        <span className="text-sm font-medium">{statusInfo.text}</span>
      </div>

      {/* 非画像ファイルの案内 */}
      {file && !isImage && (
        <div className="flex items-start gap-2 rounded-lg border border-dashed bg-muted/30 p-3 text-sm text-muted-foreground">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            表の自動検出は画像ファイル(JPG/PNG等)に対応しています。PDFは画像に変換してからアップロードしてください。
          </span>
        </div>
      )}

      {/* 画像 + 検出ボックス */}
      {isImage && imageUrl && (
        <div className="space-y-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <MousePointerSquareDashed className="h-3.5 w-3.5" />
            <span>
              画像上をドラッグすると、手動で解析範囲を追加できます。ラベルをクリックで選択/解除。
            </span>
          </div>

          <div className="overflow-auto rounded-lg border bg-muted/20 p-2">
            <ImageAnnotator
              imageUrl={imageUrl}
              regions={regions}
              onToggle={toggleRegion}
              onAddManual={addManualRegion}
              onRemove={removeRegion}
            />
          </div>

          {/* 検出された表の一覧（チェックリスト） */}
          {regions.length > 0 && (
            <div className="space-y-2 rounded-lg border bg-card p-3">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                  <Table2 className="h-4 w-4" />
                  検出された表 ({regions.length})
                </span>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() =>
                      setRegions((prev) => prev.map((r) => ({ ...r, selected: true })))
                    }
                  >
                    全選択
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() =>
                      setRegions((prev) => prev.map((r) => ({ ...r, selected: false })))
                    }
                  >
                    全解除
                  </Button>
                </div>
              </div>
              <ul className="space-y-1">
                {regions.map((region, index) => (
                  <li key={region.id}>
                    <label className="flex cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted/50">
                      <input
                        type="checkbox"
                        checked={region.selected}
                        onChange={() => toggleRegion(region.id)}
                        className="mt-0.5 h-4 w-4 accent-primary"
                      />
                      <span className="flex-1">
                        <span className="font-medium text-foreground">
                          {index + 1}. {region.label}
                        </span>
                        {region.source === "manual" && (
                          <span className="ml-1.5 rounded bg-chart-2/20 px-1 text-[10px] text-chart-2">
                            手動
                          </span>
                        )}
                        {region.description && (
                          <span className="block text-xs text-muted-foreground">
                            {region.description}
                          </span>
                        )}
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 解析実行 */}
          <Button
            onClick={analyzeSelected}
            disabled={selectedRegions.length === 0 || status === "analyzing" || status === "detecting"}
            className="w-full gap-2"
          >
            {status === "analyzing" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Brain className="h-4 w-4" />
            )}
            選択した表を解析 ({selectedRegions.length})
          </Button>
        </div>
      )}
    </div>
  );
}

function getStatusInfo(
  status: ProcessingStatus,
  error: string | null,
  progress: { current: number; total: number }
) {
  switch (status) {
    case "idle":
      return {
        icon: null,
        text: "ファイルをアップロードしてください",
        color: "text-muted-foreground",
      };
    case "detecting":
      return {
        icon: <ScanSearch className="h-5 w-5 animate-pulse" />,
        text: "表を検出中...",
        color: "text-primary",
      };
    case "detected":
      return {
        icon: <CheckCircle className="h-5 w-5" />,
        text: "表を検出しました。解析する表を選択してください",
        color: "text-green-600",
      };
    case "analyzing":
      return {
        icon: <Brain className="h-5 w-5 animate-pulse" />,
        text: `AI解析中... (${progress.current}/${progress.total})`,
        color: "text-primary",
      };
    case "complete":
      return {
        icon: <CheckCircle className="h-5 w-5" />,
        text: "解析完了。データ一覧に追加しました",
        color: "text-green-600",
      };
    case "error":
      return {
        icon: <AlertCircle className="h-5 w-5" />,
        text: error || "エラーが発生しました",
        color: "text-destructive",
      };
  }
}

// ---- ユーティリティ ----

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

// 正規化ボックスに従って画像を切り出し、PNGのbase64(プレフィックス無し)を返す
function cropRegion(img: HTMLImageElement, box: BoxRect): string {
  const sx = Math.round(box.x * img.naturalWidth);
  const sy = Math.round(box.y * img.naturalHeight);
  const sw = Math.max(1, Math.round(box.width * img.naturalWidth));
  const sh = Math.max(1, Math.round(box.height * img.naturalHeight));

  const canvas = document.createElement("canvas");
  canvas.width = sw;
  canvas.height = sh;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("キャンバスの作成に失敗しました");

  // 背景を白で塗ってから描画（透過対策）
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, sw, sh);
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);

  const dataUrl = canvas.toDataURL("image/png");
  return dataUrl.split(",")[1] ?? "";
}
