"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface DataField {
  id: string;
  label: string;
  value: string;
}

export interface PendingEntry {
  id: string;
  data: Record<string, string>;
  confirmed: boolean;
}

interface DataEntryFormProps {
  fields: DataField[];
  onFieldsChange: (fields: DataField[]) => void;
  onAddPending: () => void;
}

export function DataEntryForm({
  fields,
  onFieldsChange,
  onAddPending,
}: DataEntryFormProps) {
  const [newFieldLabel, setNewFieldLabel] = useState("");

  const handleAddField = () => {
    if (!newFieldLabel.trim()) return;
    const newField: DataField = {
      id: crypto.randomUUID(),
      label: newFieldLabel.trim(),
      value: "",
    };
    onFieldsChange([...fields, newField]);
    setNewFieldLabel("");
  };

  const handleFieldChange = (id: string, value: string) => {
    onFieldsChange(
      fields.map((field) => (field.id === id ? { ...field, value } : field))
    );
  };

  const handleRemoveField = (id: string) => {
    onFieldsChange(fields.filter((field) => field.id !== id));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddField();
    }
  };

  return (
    <div className="space-y-4">
      <label className="text-sm font-semibold uppercase tracking-wide text-foreground">
        ステップ2: 項目を入力
      </label>
      <p className="text-sm text-muted-foreground">
        転記したいデータを入力してください
      </p>

      {/* 項目追加 */}
      <div className="flex gap-2">
        <Input
          placeholder="新しい項目名を入力..."
          value={newFieldLabel}
          onChange={(e) => setNewFieldLabel(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1"
        />
        <Button onClick={handleAddField} variant="outline" size="icon">
          <Plus className="h-4 w-4" />
          <span className="sr-only">項目を追加</span>
        </Button>
      </div>

      {/* 入力フォーム */}
      {fields.length > 0 && (
        <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
          {fields.map((field) => (
            <div key={field.id} className="flex items-end gap-2">
              <div className="flex-1 space-y-1.5">
                <Label htmlFor={field.id} className="text-sm font-medium">
                  {field.label}
                </Label>
                <Input
                  id={field.id}
                  value={field.value}
                  onChange={(e) => handleFieldChange(field.id, e.target.value)}
                  placeholder={`${field.label}を入力...`}
                />
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleRemoveField(field.id)}
                className="text-muted-foreground hover:text-destructive"
              >
                削除
              </Button>
            </div>
          ))}

          <Button onClick={onAddPending} className="w-full mt-4">
            確認へ進む
          </Button>
        </div>
      )}

      {fields.length === 0 && (
        <div className="rounded-lg border-2 border-dashed border-border p-6 text-center">
          <p className="text-muted-foreground">
            上の入力欄から項目を追加してください
          </p>
        </div>
      )}
    </div>
  );
}
