"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Crop, Loader2, ScanSearch, X } from "lucide-react";

interface RegionSelectorProps {
  file: File | null;
  // 選択領域（または全体）を切り出した画像ファイルを返す
  onRegionConfirmed: (croppedFile: File) => void;
  disabled?: boolean;
}

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function RegionSelector({
  file,
  onRegionConfirmed,
  disabled,
}: RegionSelectorProps) {
  // 自然解像度で描画したソースキャンバス（切り出しの元）
  const sourceCanvasRef = useRef<HTMLCanvasElement | null>(null);
  // 表示用キャンバス
  const displayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  // 表示サイズと自然サイズの比率（display = natural * scale）
  const scaleRef = useRef(1);
  const [displaySize, setDisplaySize] = useState({ w: 0, h: 0 });

  // ドラッグ中の状態
  const dragStart = useRef<{ x: number; y: number } | null>(null);
  const [selection, setSelection] = useState<Rect | null>(null);

  // ソース画像/PDFをオフスクリーンキャンバスへ描画
  useEffect(() => {
    let cancelled = false;
    setSelection(null);
    setReady(false);
    setError(null);

    if (!file) {
      sourceCanvasRef.current = null;
      return;
    }

    const load = async () => {
      setLoading(true);
      try {
        const canvas = document.createElement("canvas");

        if (file.type.startsWith("image/")) {
          const img = new Image();
          img.crossOrigin = "anonymous";
          const url = URL.createObjectURL(file);
          await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = () => reject(new Error("画像の読み込みに失敗しました"));
            img.src = url;
          });
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          canvas.getContext("2d")!.drawImage(img, 0, 0);
          URL.revokeObjectURL(url);
        } else if (file.type === "application/pdf") {
          const pdfjs = await import("pdfjs-dist");
          // Turbopack/webpack でバンドルされる worker を指定
          pdfjs.GlobalWorkerOptions.workerSrc = new URL(
            "pdfjs-dist/build/pdf.worker.min.mjs",
            import.meta.url
          ).toString();

          const buffer = await file.arrayBuffer();
          const pdf = await pdfjs.getDocument({ data: buffer }).promise;
          const page = await pdf.getPage(1);
          // 解像度確保のため scale 2 で描画
          const viewport = page.getViewport({ scale: 2 });
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          await page.render({
            canvas,
            canvasContext: canvas.getContext("2d")!,
            viewport,
          } as any).promise;
        } else {
          throw new Error("対応していないファイル形式です");
        }

        if (cancelled) return;
        sourceCanvasRef.current = canvas;
        setReady(true);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "読み込みに失敗しました");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [file]);

  // 表示サイズを算出（コンテナ幅に合わせ、アスペクト比維持）
  const computeDisplaySize = useCallback(() => {
    const source = sourceCanvasRef.current;
    const wrapper = wrapperRef.current;
    if (!source || !wrapper) return;

    const maxW = wrapper.clientWidth;
    const maxH = 380; // プレビュー領域の高さ上限
    const ratio = source.height / source.width;

    let w = maxW;
    let h = w * ratio;
    if (h > maxH) {
      h = maxH;
      w = h / ratio;
    }
    scaleRef.current = w / source.width;
    setDisplaySize({ w: Math.round(w), h: Math.round(h) });
  }, []);

  useEffect(() => {
    if (!ready) return;
    computeDisplaySize();
    const onResize = () => computeDisplaySize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [ready, computeDisplaySize]);

  // 表示キャンバスの再描画（画像 + 選択オーバーレイ）
  const redraw = useCallback(() => {
    const display = displayCanvasRef.current;
    const source = sourceCanvasRef.current;
    if (!display || !source || displaySize.w === 0) return;

    const ctx = display.getContext("2d")!;
    const { w: W, h: H } = displaySize;
    display.width = W;
    display.height = H;

    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(source, 0, 0, W, H);

    if (selection && (selection.w > 2 || selection.h > 2)) {
      const r = normalizeRect(selection);
      // 選択範囲外を暗くする
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(0, 0, W, r.y); // 上
      ctx.fillRect(0, r.y + r.h, W, H - (r.y + r.h)); // 下
      ctx.fillRect(0, r.y, r.x, r.h); // 左
      ctx.fillRect(r.x + r.w, r.y, W - (r.x + r.w), r.h); // 右
      // 選択枠
      ctx.strokeStyle = "hsl(var(--primary))";
      ctx.lineWidth = 2;
      ctx.strokeRect(r.x, r.y, r.w, r.h);
    }
  }, [displaySize, selection]);

  useEffect(() => {
    redraw();
  }, [redraw]);

  // ポインタ座標を表示キャンバス内座標へ変換
  const getPos = (e: React.PointerEvent) => {
    const rect = displayCanvasRef.current!.getBoundingClientRect();
    return {
      x: clamp(e.clientX - rect.left, 0, displaySize.w),
      y: clamp(e.clientY - rect.top, 0, displaySize.h),
    };
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (disabled || !ready) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    const p = getPos(e);
    dragStart.current = p;
    setSelection({ x: p.x, y: p.y, w: 0, h: 0 });
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragStart.current) return;
    const p = getPos(e);
    setSelection({
      x: dragStart.current.x,
      y: dragStart.current.y,
      w: p.x - dragStart.current.x,
      h: p.y - dragStart.current.y,
    });
  };

  const handlePointerUp = () => {
    dragStart.current = null;
  };

  const hasSelection =
    !!selection && Math.abs(selection.w) > 8 && Math.abs(selection.h) > 8;

  // 選択領域（またはソース全体）を切り出して画像ファイル化
  const cropAndConfirm = useCallback(
    (whole: boolean) => {
      const source = sourceCanvasRef.current;
      if (!source) return;
      const scale = scaleRef.current;

      let sx = 0;
      let sy = 0;
      let sw = source.width;
      let sh = source.height;

      if (!whole && selection) {
        const r = normalizeRect(selection);
        // 表示座標 → 自然座標
        sx = Math.round(r.x / scale);
        sy = Math.round(r.y / scale);
        sw = Math.round(r.w / scale);
        sh = Math.round(r.h / scale);
      }

      if (sw < 1 || sh < 1) return;

      const out = document.createElement("canvas");
      out.width = sw;
      out.height = sh;
      const octx = out.getContext("2d")!;
      // 背景を白で塗り、透過PDF等でも視認性を確保
      octx.fillStyle = "#ffffff";
      octx.fillRect(0, 0, sw, sh);
      octx.drawImage(source, sx, sy, sw, sh, 0, 0, sw, sh);

      out.toBlob((blob) => {
        if (!blob) return;
        const cropped = new File([blob], "selected-region.png", {
          type: "image/png",
        });
        onRegionConfirmed(cropped);
      }, "image/png");
    },
    [selection, onRegionConfirmed]
  );

  if (!file) {
    return (
      <div className="h-full flex items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/30">
        <p className="text-muted-foreground text-center px-4">
          ファイルをアップロードすると
          <br />
          ここで解析範囲を選択できます
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div
        ref={wrapperRef}
        className="relative flex items-center justify-center rounded-lg border bg-muted/20 overflow-hidden"
        style={{ minHeight: 200 }}
      >
        {loading && (
          <div className="flex items-center gap-2 py-16 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">プレビューを準備中...</span>
          </div>
        )}
        {error && !loading && (
          <p className="py-16 text-sm text-destructive px-4 text-center">{error}</p>
        )}
        {ready && !error && (
          <canvas
            ref={displayCanvasRef}
            width={displaySize.w}
            height={displaySize.h}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            className="touch-none cursor-crosshair"
            style={{ width: displaySize.w, height: displaySize.h }}
          />
        )}
      </div>

      {ready && !error && (
        <>
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Crop className="h-4 w-4" />
            解析したい範囲をドラッグして四角で囲んでください
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={!hasSelection || disabled}
              onClick={() => cropAndConfirm(false)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ScanSearch className="h-4 w-4" />
              選択範囲を解析
            </button>
            <button
              type="button"
              disabled={!hasSelection}
              onClick={() => setSelection(null)}
              className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
            >
              <X className="h-4 w-4" />
              選択をクリア
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={() => cropAndConfirm(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
            >
              全体を解析
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function normalizeRect(r: Rect): Rect {
  return {
    x: r.w < 0 ? r.x + r.w : r.x,
    y: r.h < 0 ? r.y + r.h : r.y,
    w: Math.abs(r.w),
    h: Math.abs(r.h),
  };
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}
