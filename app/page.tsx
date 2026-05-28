"use client";

import { useState } from "react";
import { FileUpload } from "@/components/file-upload";
import { FilePreview } from "@/components/file-preview";
import { DataEntryForm, type DataField } from "@/components/data-entry-form";
import { DataTable, type DataEntry } from "@/components/data-table";
import { CsvExport } from "@/components/csv-export";
import { OcrExtractor } from "@/components/ocr-extractor";

export default function TranscriptionTool() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fields, setFields] = useState<DataField[]>([]);
  const [entries, setEntries] = useState<DataEntry[]>([]);
  const [extractedText, setExtractedText] = useState("");

  const handleAddPending = () => {
    // 少なくとも1つのフィールドに値がある場合のみ追加
    const hasValue = fields.some((field) => field.value.trim() !== "");
    if (!hasValue) return;

    const newEntry: DataEntry = {
      id: crypto.randomUUID(),
      data: fields.reduce(
        (acc, field) => {
          acc[field.label] = field.value;
          return acc;
        },
        {} as Record<string, string>
      ),
      confirmed: false,
    };

    setEntries([...entries, newEntry]);

    // 値をクリア（ラベルは保持）
    setFields(fields.map((field) => ({ ...field, value: "" })));
  };

  const handleConfirmEntry = (id: string) => {
    setEntries(
      entries.map((entry) =>
        entry.id === id ? { ...entry, confirmed: true } : entry
      )
    );
  };

  const handleUpdateEntry = (id: string, data: Record<string, string>) => {
    setEntries(
      entries.map((entry) => (entry.id === id ? { ...entry, data } : entry))
    );
  };

  const handleDeleteEntry = (id: string) => {
    setEntries(entries.filter((entry) => entry.id !== id));
  };

  const columns = fields.map((field) => field.label);
  const confirmedEntries = entries.filter((e) => e.confirmed);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-xl font-bold text-foreground">転記補助ツール</h1>
          <p className="text-sm text-muted-foreground mt-1">
            画像/PDFを見ながらデータを入力し、CSVで出力
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <div className="grid gap-6 lg:grid-cols-2">
          {/* 左側: ファイルアップロード＆プレビュー */}
          <div className="space-y-6">
            <div className="rounded-xl border bg-card p-5">
              <FileUpload
                selectedFile={selectedFile}
                onFileSelect={setSelectedFile}
              />
            </div>

            {/* プレビューエリア */}
            <div className="rounded-xl border bg-card p-5">
              <label className="text-sm font-semibold uppercase tracking-wide text-foreground block mb-3">
                ファイルプレビュー
              </label>
              <div className="aspect-[4/3] lg:aspect-auto lg:h-[400px]">
                <FilePreview file={selectedFile} />
              </div>
            </div>

            {/* OCR機能 */}
            <div className="rounded-xl border bg-card p-5">
              <OcrExtractor
                file={selectedFile}
                onExtractedText={setExtractedText}
                fields={fields}
                onFieldsChange={setFields}
              />
            </div>
          </div>

          {/* 右側: データ入力＆テーブル */}
          <div className="space-y-6">
            <div className="rounded-xl border bg-card p-5">
              <DataEntryForm
                fields={fields}
                onFieldsChange={setFields}
                onAddPending={handleAddPending}
              />
            </div>

            <div className="rounded-xl border bg-card p-5">
              <DataTable
                entries={entries}
                columns={columns}
                onDeleteEntry={handleDeleteEntry}
                onConfirmEntry={handleConfirmEntry}
                onUpdateEntry={handleUpdateEntry}
              />
            </div>

            <div className="rounded-xl border bg-card p-5">
              <CsvExport entries={confirmedEntries} columns={columns} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
