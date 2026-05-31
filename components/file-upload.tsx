"use client";

import { useCallback, useState } from "react";
import { Upload, FileImage, FileText, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileUploadProps {
  onFilesSelect: (files: File[]) => void;
  selectedFiles: File[];
  currentIndex: number;
  onSelectFile: (index: number) => void;
  onRemoveFile: (index: number) => void;
}

export function FileUpload({ 
  onFilesSelect, 
  selectedFiles, 
  currentIndex,
  onSelectFile,
  onRemoveFile 
}: FileUploadProps) {
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
      const files = Array.from(e.dataTransfer.files).filter(isValidFile);
      if (files.length > 0) {
        onFilesSelect(files);
      }
    },
    [onFilesSelect]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []).filter(isValidFile);
      if (files.length > 0) {
        onFilesSelect(files);
      }
      // Reset input value to allow selecting the same files again
      e.target.value = "";
    },
    [onFilesSelect]
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
      return <FileImage className="h-5 w-5 text-primary" />;
    }
    return <FileText className="h-5 w-5 text-primary" />;
  };

  return (
    <div className="space-y-3">
      <label className="text-sm font-semibold uppercase tracking-wide text-foreground">
        ステップ1: ファイルをアップロード
      </label>
      <p className="text-sm text-muted-foreground">
        画像（JPG, PNG, GIF, WebP）またはPDFファイルを複数アップロードできます
      </p>

      {/* ドロップゾーン */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-all cursor-pointer",
          isDragging
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/50 hover:bg-muted/50"
        )}
      >
        <input
          type="file"
          accept="image/*,.pdf"
          multiple
          onChange={handleFileInput}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          aria-label="ファイルを選択"
        />
        <Upload className="h-8 w-8 text-muted-foreground mb-2" />
        <p className="font-medium text-foreground text-sm">
          ドラッグ＆ドロップ または クリックして選択
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          対応形式: JPG, PNG, GIF, WebP, PDF（複数選択可）
        </p>
      </div>

      {/* ファイル一覧 */}
      {selectedFiles.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">
              アップロード済み: {selectedFiles.length}件
            </span>
          </div>
          <div className="max-h-48 overflow-auto space-y-1.5">
            {selectedFiles.map((file, index) => (
              <div
                key={`${file.name}-${index}`}
                className={cn(
                  "flex items-center gap-3 rounded-lg border p-2.5 cursor-pointer transition-all",
                  index === currentIndex
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/30 hover:bg-muted/30"
                )}
                onClick={() => onSelectFile(index)}
              >
                {getFileIcon(file.type)}
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {file.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                {index === currentIndex && (
                  <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded">
                    処理中
                  </span>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveFile(index);
                  }}
                  className="rounded-full p-1 hover:bg-muted transition-colors"
                  aria-label="ファイルを削除"
                >
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
