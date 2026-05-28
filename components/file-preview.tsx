"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

interface FilePreviewProps {
  file: File | null;
}

export function FilePreview({ file }: FilePreviewProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }

    if (file.type.startsWith("image/")) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }

    setPreviewUrl(null);
  }, [file]);

  if (!file) {
    return (
      <div className="h-full flex items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/30">
        <p className="text-muted-foreground text-center px-4">
          ファイルをアップロードすると
          <br />
          ここにプレビューが表示されます
        </p>
      </div>
    );
  }

  if (file.type === "application/pdf") {
    return (
      <div className="h-full flex flex-col items-center justify-center rounded-lg border bg-card p-4">
        <div className="text-6xl mb-4">📄</div>
        <p className="font-medium text-foreground text-center">{file.name}</p>
        <p className="text-sm text-muted-foreground mt-1">
          PDFプレビューは非対応です
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          ファイルを別ウィンドウで開いて確認してください
        </p>
      </div>
    );
  }

  if (previewUrl) {
    return (
      <div className="relative h-full rounded-lg border bg-card overflow-hidden">
        <Image
          src={previewUrl}
          alt="アップロードされたファイルのプレビュー"
          fill
          className="object-contain p-2"
        />
      </div>
    );
  }

  return null;
}
