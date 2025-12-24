import { useState, KeyboardEvent } from "react";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ZipCodeInputProps {
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function ZipCodeInput({
  value,
  onChange,
  placeholder = "Enter ZIP codes (5 digits each)...",
  disabled = false,
}: ZipCodeInputProps) {
  const [inputValue, setInputValue] = useState("");
  const [error, setError] = useState("");

  const addZipCode = (zip: string) => {
    const trimmedZip = zip.trim();

    // Validate ZIP code
    if (!/^\d{5}$/.test(trimmedZip)) {
      setError("ZIP code must be exactly 5 digits");
      return;
    }

    // Check for duplicates
    if (value.includes(trimmedZip)) {
      setError("ZIP code already added");
      return;
    }

    onChange([...value, trimmedZip]);
    setInputValue("");
    setError("");
  };

  const removeZipCode = (zipToRemove: string) => {
    onChange(value.filter((zip) => zip !== zipToRemove));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      if (inputValue.trim()) {
        addZipCode(inputValue);
      }
    } else if (e.key === "Backspace" && !inputValue && value.length > 0) {
      // Remove last ZIP if backspace pressed with empty input
      removeZipCode(value[value.length - 1]);
    }
  };

  const handleBlur = () => {
    if (inputValue.trim()) {
      addZipCode(inputValue);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2 p-2 border rounded-md min-h-[42px] bg-background">
        {value.map((zip) => (
          <Badge key={zip} variant="secondary" className="gap-1">
            {zip}
            {!disabled && (
              <button
                type="button"
                onClick={() => removeZipCode(zip)}
                className="ml-1 hover:bg-muted rounded-full"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </Badge>
        ))}
        <Input
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setError("");
          }}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          placeholder={value.length === 0 ? placeholder : ""}
          disabled={disabled}
          className={cn(
            "flex-1 min-w-[120px] border-none shadow-none focus-visible:ring-0 px-0",
            error && "text-red-500"
          )}
          maxLength={5}
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <p className="text-xs text-muted-foreground">
        Press Enter or comma after each ZIP code. Leave empty to allow all ZIP codes.
      </p>
    </div>
  );
}
