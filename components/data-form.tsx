"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { ExtractedData } from "@/components/document-processor";

export interface FormData {
  date: string;
  companyName: string;
  amount: string;
  description: string;
}

interface DataFormProps {
  data: FormData;
  onDataChange: (data: FormData) => void;
  onAddEntry: () => void;
  disabled?: boolean;
}

export function DataForm({ data, onDataChange, onAddEntry, disabled }: DataFormProps) {
  const handleChange = (field: keyof FormData, value: string) => {
    onDataChange({ ...data, field: value });
  };

  const hasData = data.date || data.companyName || data.amount || data.description;

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-semibold uppercase tracking-wide text-foreground">
          抽出データ編集
        </label>
        <p className="text-sm text-muted-foreground">
          AI解析結果を確認・編集してください
        </p>
      </div>

      <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
        <div className="space-y-1.5">
          <Label htmlFor="date" className="text-sm font-medium">
            日付
          </Label>
          <Input
            id="date"
            value={data.date}
            onChange={(e) => onDataChange({ ...data, date: e.target.value })}
            placeholder="例: 2024/01/15"
            disabled={disabled}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="companyName" className="text-sm font-medium">
            会社名 / 店舗名
          </Label>
          <Input
            id="companyName"
            value={data.companyName}
            onChange={(e) => onDataChange({ ...data, companyName: e.target.value })}
            placeholder="例: 株式会社サンプル"
            disabled={disabled}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="amount" className="text-sm font-medium">
            金額
          </Label>
          <Input
            id="amount"
            value={data.amount}
            onChange={(e) => onDataChange({ ...data, amount: e.target.value })}
            placeholder="例: ¥10,000"
            disabled={disabled}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="description" className="text-sm font-medium">
            内容
          </Label>
          <Input
            id="description"
            value={data.description}
            onChange={(e) => onDataChange({ ...data, description: e.target.value })}
            placeholder="例: 消耗品費"
            disabled={disabled}
          />
        </div>

        <Button 
          onClick={onAddEntry} 
          className="w-full mt-4"
          disabled={disabled || !hasData}
        >
          データを追加
        </Button>
      </div>
    </div>
  );
}

// ExtractedDataからFormDataへの変換ヘルパー
export function extractedToFormData(extracted: ExtractedData): FormData {
  return {
    date: extracted.date || "",
    companyName: extracted.companyName || "",
    amount: extracted.amount || "",
    description: extracted.description || "",
  };
}

// 空のFormDataを作成
export function emptyFormData(): FormData {
  return {
    date: "",
    companyName: "",
    amount: "",
    description: "",
  };
}
