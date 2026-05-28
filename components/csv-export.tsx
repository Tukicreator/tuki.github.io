"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DataEntry } from "@/components/data-table";

interface CsvExportProps {
  entries: DataEntry[];
  columns: string[];
}

export function CsvExport({ entries, columns }: CsvExportProps) {
  const handleExport = () => {
    if (entries.length === 0 || columns.length === 0) return;

    // CSVヘッダー
    const header = columns.join(",");

    // CSVデータ行
    const rows = entries.map((entry) =>
      columns
        .map((col) => {
          const value = entry.data[col] || "";
          // カンマや改行を含む場合はダブルクォートで囲む
          if (value.includes(",") || value.includes("\n") || value.includes('"')) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        })
        .join(",")
    );

    const csv = [header, ...rows].join("\n");

    // BOMを追加してExcelで文字化けしないようにする
    const bom = new Uint8Array([0xef, 0xbb, 0xbf]);
    const blob = new Blob([bom, csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `data_${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const isDisabled = entries.length === 0 || columns.length === 0;

  return (
    <div className="space-y-3">
      <label className="text-sm font-semibold uppercase tracking-wide text-foreground">
        ステップ4: CSVを出力
      </label>
      <p className="text-sm text-muted-foreground">
        入力したデータをCSVファイルとしてダウンロードできます
      </p>
      <Button
        onClick={handleExport}
        disabled={isDisabled}
        className="w-full"
        size="lg"
      >
        <Download className="h-4 w-4 mr-2" />
        CSVをダウンロード（{entries.length}件）
      </Button>
    </div>
  );
}
