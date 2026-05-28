"use client";

import { Check, Pencil, Trash2, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { FormData } from "@/components/data-form";

export interface EntryRecord {
  id: string;
  data: FormData;
  confirmed: boolean;
}

interface EntryTableProps {
  entries: EntryRecord[];
  onDeleteEntry: (id: string) => void;
  onConfirmEntry: (id: string) => void;
  onUpdateEntry: (id: string, data: FormData) => void;
}

const columns = [
  { key: "date", label: "日付" },
  { key: "companyName", label: "会社名/店舗名" },
  { key: "amount", label: "金額" },
  { key: "description", label: "内容" },
] as const;

export function EntryTable({
  entries,
  onDeleteEntry,
  onConfirmEntry,
  onUpdateEntry,
}: EntryTableProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<FormData | null>(null);

  const handleStartEdit = (entry: EntryRecord) => {
    setEditingId(entry.id);
    setEditData({ ...entry.data });
  };

  const handleSaveEdit = (id: string) => {
    if (editData) {
      onUpdateEntry(id, editData);
    }
    setEditingId(null);
    setEditData(null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditData(null);
  };

  const pendingEntries = entries.filter((e) => !e.confirmed);
  const confirmedEntries = entries.filter((e) => e.confirmed);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <label className="text-sm font-semibold uppercase tracking-wide text-foreground">
            登録データ一覧
          </label>
          <p className="text-sm text-muted-foreground">
            確定済みデータはCSV出力可能です
          </p>
        </div>
        <span className="text-sm text-muted-foreground">
          確認待ち {pendingEntries.length} 件 / 確定 {confirmedEntries.length} 件
        </span>
      </div>

      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-12 text-center">#</TableHead>
                <TableHead className="w-20 text-center">状態</TableHead>
                {columns.map((col) => (
                  <TableHead key={col.key} className="font-semibold">
                    {col.label}
                  </TableHead>
                ))}
                <TableHead className="w-28 text-center">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.length + 3}
                    className="h-24 text-center text-muted-foreground"
                  >
                    まだデータがありません。ファイルをアップロードすると自動で解析されます。
                  </TableCell>
                </TableRow>
              ) : (
                entries.map((entry, index) => (
                  <TableRow
                    key={entry.id}
                    className={
                      entry.confirmed
                        ? "bg-primary/5"
                        : "bg-amber-50 dark:bg-amber-950/20"
                    }
                  >
                    <TableCell className="text-center text-muted-foreground">
                      {index + 1}
                    </TableCell>
                    <TableCell className="text-center">
                      {entry.confirmed ? (
                        <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                          確定
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                          確認待ち
                        </span>
                      )}
                    </TableCell>
                    {columns.map((col) => (
                      <TableCell key={col.key}>
                        {editingId === entry.id && editData ? (
                          <Input
                            value={editData[col.key]}
                            onChange={(e) =>
                              setEditData({ ...editData, [col.key]: e.target.value })
                            }
                            className="h-8"
                          />
                        ) : (
                          entry.data[col.key] || "-"
                        )}
                      </TableCell>
                    ))}
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        {editingId === entry.id ? (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleSaveEdit(entry.id)}
                              className="h-8 w-8 text-primary hover:text-primary"
                            >
                              <Check className="h-4 w-4" />
                              <span className="sr-only">保存</span>
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={handleCancelEdit}
                              className="h-8 w-8 text-muted-foreground"
                            >
                              <X className="h-4 w-4" />
                              <span className="sr-only">キャンセル</span>
                            </Button>
                          </>
                        ) : (
                          <>
                            {!entry.confirmed && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => onConfirmEntry(entry.id)}
                                className="h-8 w-8 text-primary hover:text-primary"
                                title="確定する"
                              >
                                <Check className="h-4 w-4" />
                                <span className="sr-only">確定</span>
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleStartEdit(entry)}
                              className="h-8 w-8 text-muted-foreground hover:text-foreground"
                              title="編集"
                            >
                              <Pencil className="h-4 w-4" />
                              <span className="sr-only">編集</span>
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => onDeleteEntry(entry.id)}
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              title="削除"
                            >
                              <Trash2 className="h-4 w-4" />
                              <span className="sr-only">削除</span>
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {pendingEntries.length > 0 && (
        <div className="flex justify-end">
          <Button
            onClick={() => pendingEntries.forEach((e) => onConfirmEntry(e.id))}
            className="gap-2"
          >
            <Check className="h-4 w-4" />
            すべて確定する
          </Button>
        </div>
      )}
    </div>
  );
}
