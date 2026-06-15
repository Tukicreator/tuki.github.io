"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { EntryRecord } from "@/components/entry-table";

interface ExportCsvProps {
  columns: string[];
  entries: EntryRecord[];
}

function escapeCsv(value: string): string {
  if (value.includes(",") || value.includes("\n") || value.includes('"')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function ExportCsv({ columns, entries }: ExportCsvProps) {
  const handleExport = () => {
    if (entries.length === 0 || columns.length === 0) return;

    // CSVヘッダー（AIが判定した列名）
    const header = columns.map(escapeCsv).join(",");

    // CSVデータ行
    const rows = entries.map((entry) =>
      columns.map((col) => escapeCsv(entry.cells[col] || "")).join(",")
    );

    const csv = [header, ...rows].join("\n");

    // BOMを追加してExcelで文字化けしないようにする
    const bom = new Uint8Array([0xef, 0xbb, 0xbf]);
    const blob = new Blob([bom, csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `抽出データ_${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="text-sm font-semibold uppercase tracking-wide text-foreground">
          CSV出力
        </label>
        <p className="text-sm text-muted-foreground">
          一覧のデータをCSVファイルとしてダウンロード
        </p>
      </div>
      <Button
        onClick={handleExport}
        disabled={entries.length === 0}
        className="w-full"
        size="lg"
      >
        <Download className="h-4 w-4 mr-2" />
        CSVをダウンロード（{entries.length}件）
      </Button>
    </div>
  );
}
