"use client";

import { useState } from "react";
import { FileUpload } from "@/components/file-upload";
import {
  TableDetector,
  type ExtractedTable,
  type ProcessingStatus,
} from "@/components/table-detector";
import { EntryTable, type EntryRecord } from "@/components/entry-table";
import { ExportCsv } from "@/components/export-csv";

export default function DataExtractionTool() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [columns, setColumns] = useState<string[]>([]);
  const [entries, setEntries] = useState<EntryRecord[]>([]);
  const [processingStatus, setProcessingStatus] = useState<ProcessingStatus>("idle");

  const handleFileSelect = (file: File | null) => {
    setSelectedFile(file);
  };

  // AI解析完了時: 抽出された表データを必ず一覧へ追加する
  const handleProcessingComplete = (table: ExtractedTable) => {
    if (!table || !Array.isArray(table.columns) || table.columns.length === 0) {
      return;
    }

    // 既存の列と統合（新しい列があれば末尾に追加）
    setColumns((prev) => {
      const merged = [...prev];
      for (const col of table.columns) {
        if (!merged.includes(col)) merged.push(col);
      }
      return merged;
    });

    // 抽出された各行をエントリーとして追加
    const newEntries: EntryRecord[] = (table.rows || []).map((row) => {
      const cells: Record<string, string> = {};
      table.columns.forEach((col, i) => {
        cells[col] = row[i] ?? "";
      });
      return { id: crypto.randomUUID(), cells };
    });

    setEntries((prev) => [...prev, ...newEntries]);
  };

  const handleUpdateEntry = (id: string, cells: Record<string, string>) => {
    setEntries((prev) =>
      prev.map((entry) => (entry.id === id ? { ...entry, cells } : entry))
    );
  };

  const handleDeleteEntry = (id: string) => {
    setEntries((prev) => prev.filter((entry) => entry.id !== id));
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-xl font-bold text-foreground">数字データ抽出ツール</h1>
          <p className="text-sm text-muted-foreground mt-1">
            画像をアップロード → 表を自動検出 → 解析したい表を選択 → 選択分だけAI解析 → 一覧に追加 → CSV出力
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <div className="grid gap-6 lg:grid-cols-2">
          {/* 左側: ファイルアップロード＆表検出/解析 */}
          <div className="space-y-6">
            {/* ファイルアップロード */}
            <div className="rounded-xl border bg-card p-5">
              <FileUpload selectedFile={selectedFile} onFileSelect={handleFileSelect} />
            </div>

            {/* 表検出・選択・解析 */}
            <div className="rounded-xl border bg-card p-5">
              <TableDetector
                file={selectedFile}
                onProcessingComplete={handleProcessingComplete}
                onStatusChange={setProcessingStatus}
              />
            </div>
          </div>

          {/* 右側: データ一覧＆CSV出力 */}
          <div className="space-y-6">
            {/* データテーブル */}
            <div className="rounded-xl border bg-card p-5">
              <EntryTable
                columns={columns}
                entries={entries}
                onDeleteEntry={handleDeleteEntry}
                onUpdateEntry={handleUpdateEntry}
              />
            </div>

            {/* CSV出力 */}
            <div className="rounded-xl border bg-card p-5">
              <ExportCsv columns={columns} entries={entries} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
