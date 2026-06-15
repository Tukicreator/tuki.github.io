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

// 1行分のデータ。列名(動的)をキーとした値のマップ
export interface EntryRecord {
  id: string;
  cells: Record<string, string>;
}

interface EntryTableProps {
  columns: string[];
  entries: EntryRecord[];
  onDeleteEntry: (id: string) => void;
  onUpdateEntry: (id: string, cells: Record<string, string>) => void;
}

export function EntryTable({
  columns,
  entries,
  onDeleteEntry,
  onUpdateEntry,
}: EntryTableProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Record<string, string> | null>(null);

  const handleStartEdit = (entry: EntryRecord) => {
    setEditingId(entry.id);
    setEditData({ ...entry.cells });
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

  const hasColumns = columns.length > 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <label className="text-sm font-semibold uppercase tracking-wide text-foreground">
            登録データ一覧
          </label>
          <p className="text-sm text-muted-foreground">
            AIが抽出したデータが自動で追加されます
          </p>
        </div>
        <span className="text-sm text-muted-foreground">{entries.length} 件</span>
      </div>

      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-12 text-center">#</TableHead>
                {hasColumns ? (
                  columns.map((col) => (
                    <TableHead key={col} className="font-semibold whitespace-nowrap">
                      {col}
                    </TableHead>
                  ))
                ) : (
                  <TableHead className="font-semibold">データ</TableHead>
                )}
                <TableHead className="w-24 text-center">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={(hasColumns ? columns.length : 1) + 2}
                    className="h-24 text-center text-muted-foreground"
                  >
                    まだデータがありません。ファイルをアップロードすると自動で解析されます。
                  </TableCell>
                </TableRow>
              ) : (
                entries.map((entry, index) => (
                  <TableRow key={entry.id}>
                    <TableCell className="text-center text-muted-foreground">
                      {index + 1}
                    </TableCell>
                    {columns.map((col) => (
                      <TableCell key={col} className="whitespace-nowrap">
                        {editingId === entry.id && editData ? (
                          <Input
                            value={editData[col] ?? ""}
                            onChange={(e) =>
                              setEditData({ ...editData, [col]: e.target.value })
                            }
                            className="h-8 min-w-24"
                          />
                        ) : (
                          entry.cells[col] || "-"
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
    </div>
  );
}
