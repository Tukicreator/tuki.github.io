"use client";

import { useState } from "react";
import { FileUpload } from "@/components/file-upload";
import { FilePreview } from "@/components/file-preview";
import { DocumentProcessor, type ExtractedData, type ProcessingStatus } from "@/components/document-processor";
import { DataForm, type FormData, extractedToFormData, emptyFormData } from "@/components/data-form";
import { EntryTable, type EntryRecord } from "@/components/entry-table";
import { ExportCsv } from "@/components/export-csv";

export default function TranscriptionTool() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [formData, setFormData] = useState<FormData>(emptyFormData());
  const [entries, setEntries] = useState<EntryRecord[]>([]);
  const [processingStatus, setProcessingStatus] = useState<ProcessingStatus>("idle");

  const handleFileSelect = (file: File | null) => {
    setSelectedFile(file);
    if (file) {
      // 新しいファイルを選択したらフォームをリセット
      setFormData(emptyFormData());
    }
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
    setSelectedFile(null);
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
                selectedFile={selectedFile}
                onFileSelect={handleFileSelect}
              />
            </div>

            {/* プレビューエリア */}
            <div className="rounded-xl border bg-card p-5">
              <label className="text-sm font-semibold uppercase tracking-wide text-foreground block mb-3">
                ファイルプレビュー
              </label>
              <div className="h-[400px]">
                <FilePreview file={selectedFile} />
              </div>
            </div>

            {/* 自動処理ステータス */}
            <div className="rounded-xl border bg-card p-5">
              <DocumentProcessor
                file={selectedFile}
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
