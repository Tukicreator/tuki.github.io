"use client";

import { useEffect, useState, useRef } from "react";

interface FilePreviewProps {
  file: File | null;
}

export function FilePreview({ file }: FilePreviewProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      setPdfUrl(null);
      return;
    }

    const url = URL.createObjectURL(file);

    if (file.type.startsWith("image/")) {
      setPreviewUrl(url);
      setPdfUrl(null);
    } else if (file.type === "application/pdf") {
      setPdfUrl(url);
      setPreviewUrl(null);
    }

    return () => URL.revokeObjectURL(url);
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

  if (pdfUrl) {
    return (
      <div ref={containerRef} className="h-full rounded-lg border bg-card overflow-hidden">
        <iframe
          src={`${pdfUrl}#view=FitH`}
          className="w-full h-full"
          title="PDFプレビュー"
        />
      </div>
    );
  }

  if (previewUrl) {
    return (
      <div className="relative h-full rounded-lg border bg-card overflow-hidden">
        <img
          src={previewUrl}
          alt="アップロードされたファイルのプレビュー"
          className="w-full h-full object-contain p-2"
        />
      </div>
    );
  }

  return null;
}
