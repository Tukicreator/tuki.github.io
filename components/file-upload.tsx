"use client";

import { useCallback, useState } from "react";
import { Upload, FileImage, FileText, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileUploadProps {
  onFileSelect: (file: File | null) => void;
  selectedFile: File | null;
}

export function FileUpload({ onFileSelect, selectedFile }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file && isValidFile(file)) {
        onFileSelect(file);
      }
    },
    [onFileSelect]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && isValidFile(file)) {
        onFileSelect(file);
      }
    },
    [onFileSelect]
  );

  const isValidFile = (file: File) => {
    const validTypes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "application/pdf",
    ];
    return validTypes.includes(file.type);
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith("image/")) {
      return <FileImage className="h-8 w-8 text-primary" />;
    }
    return <FileText className="h-8 w-8 text-primary" />;
  };

  return (
    <div className="space-y-3">
      <label className="text-sm font-semibold uppercase tracking-wide text-foreground">
        ステップ1: ファイルをアップロード
      </label>
      <p className="text-sm text-muted-foreground">
        画像（JPG, PNG, GIF, WebP）またはPDFファイルをアップロードしてください
      </p>

      {selectedFile ? (
        <div className="flex items-center gap-4 rounded-lg border-2 border-primary/30 bg-card p-4">
          {getFileIcon(selectedFile.type)}
          <div className="flex-1 min-w-0">
            <p className="truncate font-medium text-foreground">
              {selectedFile.name}
            </p>
            <p className="text-sm text-muted-foreground">
              {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
            </p>
          </div>
          <button
            onClick={() => onFileSelect(null)}
            className="rounded-full p-1 hover:bg-muted transition-colors"
            aria-label="ファイルを削除"
          >
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>
      ) : (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            "relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-all cursor-pointer",
            isDragging
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/50 hover:bg-muted/50"
          )}
        >
          <input
            type="file"
            accept="image/*,.pdf"
            onChange={handleFileInput}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            aria-label="ファイルを選択"
          />
          <Upload className="h-10 w-10 text-muted-foreground mb-3" />
          <p className="font-medium text-foreground">
            ドラッグ＆ドロップ または クリックして選択
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            対応形式: JPG, PNG, GIF, WebP, PDF
          </p>
        </div>
      )}
    </div>
  );
}
