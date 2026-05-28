"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { EntryRecord } from "@/components/entry-table";

interface ExportCsvProps {
  entries: EntryRecord[];
}

export function ExportCsv({ entries }: ExportCsvProps) {
  const confirmedEntries = entries.filter((e) => e.confirmed);

  const handleExport = () => {
    if (confirmedEntries.length === 0) return;

    const columns = ["日付", "会社名/店舗名", "金額", "内容"];
    const keys = ["date", "companyName", "amount", "description"] as const;

    // CSVヘッダー
    const header = columns.join(",");

    // CSVデータ行
    const rows = confirmedEntries.map((entry) =>
      keys
        .map((key) => {
          const value = entry.data[key] || "";
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
    a.download = `転記データ_${new Date().toISOString().split("T")[0]}.csv`;
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
          確定済みデータをCSVファイルとしてダウンロード
        </p>
      </div>
      <Button
        onClick={handleExport}
        disabled={confirmedEntries.length === 0}
        className="w-full"
        size="lg"
      >
        <Download className="h-4 w-4 mr-2" />
        CSVをダウンロード（{confirmedEntries.length}件）
      </Button>
    </div>
  );
}
