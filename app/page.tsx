"use client";

import { useState } from "react";
import { FileUpload } from "@/components/file-upload";
import { FilePreview } from "@/components/file-preview";
import {
  DocumentProcessor,
  type ExtractedTable,
  type ProcessingStatus,
} from "@/components/document-processor";
import { EntryTable, type EntryRecord } from "@/components/entry-table";
import { ExportCsv } from "@/components/export-csv";

export default function DataExtractionTool() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [columns, setColumns] = useState<string[]>([]);
  const [entries, setEntries] = useState<EntryRecord[]>([]);
  const [unclassified, setUnclassified] = useState<string[]>([]);
  const [processingStatus, setProcessingStatus] = useState<ProcessingStatus>("idle");

  const handleFileSelect = (file: File | null) => {
    setSelectedFile(file);
  };

  // 解析完了時: 組み立てた表データを必ず一覧へ追加する
  const handleProcessingComplete = (table: ExtractedTable) => {
    if (!table) return;

    const tableColumns = Array.isArray(table.columns) ? table.columns : [];

    // 既存の列と統合（新しい列があれば末尾に追加）
    if (tableColumns.length > 0) {
      setColumns((prev) => {
        const merged = [...prev];
        for (const col of tableColumns) {
          if (!merged.includes(col)) merged.push(col);
        }
        return merged;
      });

      // 組み立てた各行をエントリーとして追加
      const newEntries: EntryRecord[] = (table.rows || []).map((row) => {
        const cells: Record<string, string> = {};
        tableColumns.forEach((col, i) => {
          cells[col] = row[i] ?? "";
        });
        return { id: crypto.randomUUID(), cells };
      });

      setEntries((prev) => [...prev, ...newEntries]);
    }

    // 表に入れられなかったデータは未分類として蓄積
    if (Array.isArray(table.unclassified) && table.unclassified.length > 0) {
      setUnclassified((prev) => [...prev, ...table.unclassified]);
    }

    setSelectedFile(null);
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
            画像/PDFをアップロード → AIが列名を自動判定して表データを抽出 → 一覧に追加 → CSV出力
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
              <FileUpload selectedFile={selectedFile} onFileSelect={handleFileSelect} />
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

            {/* 未分類データ */}
            {unclassified.length > 0 && (
              <div className="rounded-xl border bg-card p-5">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <label className="text-sm font-semibold uppercase tracking-wide text-foreground">
                      未分類データ
                    </label>
                    <p className="text-sm text-muted-foreground">
                      表に割り当てられなかった項目です
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setUnclassified([])}
                    className="text-sm text-muted-foreground hover:text-destructive"
                  >
                    クリア
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {unclassified.map((item, i) => (
                    <span
                      key={`${item}-${i}`}
                      className="inline-flex items-center rounded-md border bg-muted/40 px-2 py-1 text-xs text-foreground"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            )}

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
