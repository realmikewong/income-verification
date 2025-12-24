import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";

interface MultiSelectProps {
  options: readonly string[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function MultiSelect({
  options,
  value,
  onChange,
  placeholder = "Select items...",
  disabled = false,
}: MultiSelectProps) {
  const [open, setOpen] = useState(false);

  const toggleOption = (option: string) => {
    const newValue = value.includes(option)
      ? value.filter((v) => v !== option)
      : [...value, option];
    onChange(newValue);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={disabled}
        >
          <div className="flex gap-1 flex-wrap">
            {value.length > 0 ? (
              value.map((item) => (
                <Badge key={item} variant="secondary" className="mr-1">
                  {item}
                </Badge>
              ))
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <div className="max-h-64 overflow-auto p-1">
          {options.map((option) => {
            const isSelected = value.includes(option);
            return (
              <div
                key={option}
                className={cn(
                  "flex items-center gap-2 px-2 py-1.5 rounded-sm cursor-pointer hover:bg-accent",
                  isSelected && "bg-accent"
                )}
                onClick={() => toggleOption(option)}
              >
                <div
                  className={cn(
                    "flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                    isSelected
                      ? "bg-primary text-primary-foreground"
                      : "opacity-50"
                  )}
                >
                  {isSelected && <Check className="h-3 w-3" />}
                </div>
                <span className="text-sm">{option}</span>
              </div>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
