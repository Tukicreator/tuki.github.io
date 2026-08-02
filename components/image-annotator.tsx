"use client";

import { useRef, useState, type MouseEvent } from "react";
import { X } from "lucide-react";

// 正規化座標(0〜1)のバウンディングボックス
export interface BoxRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

// 検出された、または手動で追加された表領域
export interface TableRegion {
  id: string;
  label: string;
  description?: string;
  box: BoxRect;
  source: "auto" | "manual";
  selected: boolean;
}

interface ImageAnnotatorProps {
  imageUrl: string;
  regions: TableRegion[];
  onToggle: (id: string) => void;
  onAddManual: (box: BoxRect) => void;
  onRemove: (id: string) => void;
}

const MIN_SIZE = 0.02; // これより小さいドラッグは無視

export function ImageAnnotator({
  imageUrl,
  regions,
  onToggle,
  onAddManual,
  onRemove,
}: ImageAnnotatorProps) {
  const surfaceRef = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState<BoxRect | null>(null);
  const dragStart = useRef<{ x: number; y: number } | null>(null);

  const getRelativePos = (e: MouseEvent) => {
    const rect = surfaceRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    return {
      x: Math.min(1, Math.max(0, x)),
      y: Math.min(1, Math.max(0, y)),
    };
  };

  const handleMouseDown = (e: MouseEvent) => {
    // 既存ボックス上のUI操作と混同しないよう、サーフェス自体のクリックのみ開始
    if (e.target !== surfaceRef.current) return;
    const pos = getRelativePos(e);
    dragStart.current = pos;
    setDraft({ x: pos.x, y: pos.y, width: 0, height: 0 });
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!dragStart.current) return;
    const pos = getRelativePos(e);
    const start = dragStart.current;
    setDraft({
      x: Math.min(start.x, pos.x),
      y: Math.min(start.y, pos.y),
      width: Math.abs(pos.x - start.x),
      height: Math.abs(pos.y - start.y),
    });
  };

  const handleMouseUp = () => {
    if (draft && draft.width > MIN_SIZE && draft.height > MIN_SIZE) {
      onAddManual(draft);
    }
    setDraft(null);
    dragStart.current = null;
  };

  return (
    <div className="relative inline-block max-w-full select-none">
      {/* 基準画像 */}
      <img
        src={imageUrl || "/placeholder.svg"}
        alt="解析対象のドキュメント"
        className="block max-w-full h-auto rounded-lg"
        draggable={false}
      />

      {/* 描画・オーバーレイ用サーフェス */}
      <div
        ref={surfaceRef}
        className="absolute inset-0 cursor-crosshair"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* 検出済み・手動追加の領域 */}
        {regions.map((region, index) => {
          const { box } = region;
          const isManual = region.source === "manual";
          return (
            <div
              key={region.id}
              className={`absolute rounded-md border-2 transition-colors ${
                region.selected
                  ? isManual
                    ? "border-chart-2 bg-chart-2/15"
                    : "border-primary bg-primary/15"
                  : "border-muted-foreground/50 bg-muted-foreground/5 border-dashed"
              }`}
              style={{
                left: `${box.x * 100}%`,
                top: `${box.y * 100}%`,
                width: `${box.width * 100}%`,
                height: `${box.height * 100}%`,
              }}
              onMouseDown={(e) => e.stopPropagation()}
            >
              {/* ラベル & 選択チェック */}
              <button
                type="button"
                onClick={() => onToggle(region.id)}
                className={`absolute -top-3 left-1 flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium leading-none shadow-sm ${
                  region.selected
                    ? isManual
                      ? "bg-chart-2 text-background"
                      : "bg-primary text-primary-foreground"
                    : "bg-card text-muted-foreground border"
                }`}
                title="クリックで選択/解除"
              >
                <span
                  className={`flex h-3 w-3 items-center justify-center rounded-[3px] border ${
                    region.selected
                      ? "border-background/70 bg-background/20"
                      : "border-muted-foreground/60"
                  }`}
                >
                  {region.selected ? "✓" : ""}
                </span>
                <span className="max-w-32 truncate">
                  {index + 1}. {region.label}
                </span>
              </button>

              {/* 手動領域は削除可能 */}
              {isManual && (
                <button
                  type="button"
                  onClick={() => onRemove(region.id)}
                  className="absolute -top-3 -right-2 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-background shadow-sm"
                  title="この領域を削除"
                >
                  <X className="h-2.5 w-2.5" />
                  <span className="sr-only">領域を削除</span>
                </button>
              )}
            </div>
          );
        })}

        {/* ドラッグ中のプレビュー */}
        {draft && (
          <div
            className="absolute rounded-md border-2 border-chart-2 border-dashed bg-chart-2/10"
            style={{
              left: `${draft.x * 100}%`,
              top: `${draft.y * 100}%`,
              width: `${draft.width * 100}%`,
              height: `${draft.height * 100}%`,
            }}
          />
        )}
      </div>
    </div>
  );
}
