"use client";

import { useState } from "react";
import { FileUpload } from "@/components/file-upload";
import { FilePreview } from "@/components/file-preview";
import { DocumentProcessor, type ExtractedData, type ProcessingStatus } from "@/components/document-processor";
import { DataForm, type FormData, extractedToFormData, emptyFormData } from "@/components/data-form";
import { EntryTable, type EntryRecord } from "@/components/entry-table";
import { ExportCsv } from "@/components/export-csv";

export default function TranscriptionTool() {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  const [formData, setFormData] = useState<FormData>(emptyFormData());
  const [entries, setEntries] = useState<EntryRecord[]>([]);
  const [processingStatus, setProcessingStatus] = useState<ProcessingStatus>("idle");

  const currentFile = selectedFiles[currentFileIndex] || null;

  const handleFilesSelect = (newFiles: File[]) => {
    setSelectedFiles((prev) => [...prev, ...newFiles]);
    // 新しいファイルが追加されたら、最初の新しいファイルを選択
    if (selectedFiles.length === 0) {
      setCurrentFileIndex(0);
      setFormData(emptyFormData());
    }
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    // 削除されたファイルより後ろにいる場合、インデックスを調整
    if (currentFileIndex >= index && currentFileIndex > 0) {
      setCurrentFileIndex(currentFileIndex - 1);
    }
    // 全てのファイルが削除された場合
    if (selectedFiles.length === 1) {
      setFormData(emptyFormData());
    }
  };

  const handleSelectFile = (index: number) => {
    setCurrentFileIndex(index);
    setFormData(emptyFormData());
  };

  const handleProcessingComplete = (data: ExtractedData) => {
    setFormData(extractedToFormData(data));
  };

  const handleAddEntry = () => {
    const hasData = formData.date || formData.companyName || formData.amount || formData.description;
    if (!hasData) return;

    const newEntry: EntryRecord = {
      id: crypto.randomUUID(),
      data: { ...formData },
      confirmed: false,
    };

    setEntries([...entries, newEntry]);
    setFormData(emptyFormData());
    
    // 次のファイルに進むか、処理済みファイルを削除
    if (currentFileIndex < selectedFiles.length - 1) {
      setCurrentFileIndex(currentFileIndex + 1);
    } else {
      // 全てのファイルを処理済み
      setSelectedFiles([]);
      setCurrentFileIndex(0);
    }
  };

  const handleConfirmEntry = (id: string) => {
    setEntries(
      entries.map((entry) =>
        entry.id === id ? { ...entry, confirmed: true } : entry
      )
    );
  };

  const handleUpdateEntry = (id: string, data: FormData) => {
    setEntries(
      entries.map((entry) =>
        entry.id === id ? { ...entry, data } : entry
      )
    );
  };

  const handleDeleteEntry = (id: string) => {
    setEntries(entries.filter((entry) => entry.id !== id));
  };

  const isProcessing = processingStatus === "ocr-processing" || processingStatus === "ai-analyzing";

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-xl font-bold text-foreground">転記補助ツール</h1>
          <p className="text-sm text-muted-foreground mt-1">
            画像/PDFをアップロード → 自動でOCR & AI解析 → 編集 → CSV出力
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <div className="grid gap-6 lg:grid-cols-2">
          {/* 左側: ファイルアップロード＆プレビュー */}
          <div className="space-y-6">
            {/* ファイルアップロード */}
            <div className="rounded-xl border bg-card p-5">
              <FileUpload
                selectedFiles={selectedFiles}
                onFilesSelect={handleFilesSelect}
                onRemoveFile={handleRemoveFile}
              />
            </div>

            {/* ファイル選択タブ（複数ファイルがある場合） */}
            {selectedFiles.length > 1 && (
              <div className="rounded-xl border bg-card p-5">
                <label className="text-sm font-semibold uppercase tracking-wide text-foreground block mb-3">
                  処理中のファイル ({currentFileIndex + 1}/{selectedFiles.length})
                </label>
                <div className="flex gap-2 flex-wrap">
                  {selectedFiles.map((file, index) => (
                    <button
                      key={`${file.name}-${index}`}
                      onClick={() => handleSelectFile(index)}
                      className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                        index === currentFileIndex
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-muted/50 text-foreground border-border hover:border-primary/50"
                      }`}
                    >
                      {index + 1}. {file.name.length > 15 ? file.name.slice(0, 12) + "..." : file.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* プレビューエリア */}
            <div className="rounded-xl border bg-card p-5">
              <label className="text-sm font-semibold uppercase tracking-wide text-foreground block mb-3">
                ファイルプレビュー
              </label>
              <div className="h-[400px]">
                <FilePreview file={currentFile} />
              </div>
            </div>

            {/* 自動処理ステータス */}
            <div className="rounded-xl border bg-card p-5">
              <DocumentProcessor
                file={currentFile}
                onProcessingComplete={handleProcessingComplete}
                onStatusChange={setProcessingStatus}
              />
            </div>
          </div>

          {/* 右側: データ入力＆テーブル */}
          <div className="space-y-6">
            {/* データ編集フォーム */}
            <div className="rounded-xl border bg-card p-5">
              <DataForm
                data={formData}
                onDataChange={setFormData}
                onAddEntry={handleAddEntry}
                disabled={isProcessing}
              />
            </div>

            {/* データテーブル */}
            <div className="rounded-xl border bg-card p-5">
              <EntryTable
                entries={entries}
                onDeleteEntry={handleDeleteEntry}
                onConfirmEntry={handleConfirmEntry}
                onUpdateEntry={handleUpdateEntry}
              />
            </div>

            {/* CSV出力 */}
            <div className="rounded-xl border bg-card p-5">
              <ExportCsv entries={entries} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
