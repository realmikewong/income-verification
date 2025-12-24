import { useState } from "react";
import { Loader2, Trash2, Plus } from "lucide-react";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useIncomeLimits, useCreateIncomeLimit, useUpdateIncomeLimit, useDeleteIncomeLimit } from "@/hooks/use-programs";
import { useToast } from "@/hooks/use-toast";

interface IncomeLimitsEditorProps {
  programId: number;
}

export function IncomeLimitsEditor({ programId }: IncomeLimitsEditorProps) {
  const { data: limits, isLoading } = useIncomeLimits(programId);
  const { mutate: createLimit, isPending: isCreating } = useCreateIncomeLimit();
  const { mutate: updateLimit, isPending: isUpdating } = useUpdateIncomeLimit();
  const { mutate: deleteLimit } = useDeleteIncomeLimit();
  const { toast } = useToast();

  const [editingCell, setEditingCell] = useState<{
    limitId: number;
    field: string;
    value: string;
  } | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [limitToDelete, setLimitToDelete] = useState<number | null>(null);
  const [newLimit, setNewLimit] = useState({
    householdSize: "",
    limitCents: "",
    versionLabel: "2024-V1",
  });

  const handleCellClick = (limitId: number, field: string, currentValue: any) => {
    setEditingCell({
      limitId,
      field,
      value: field === "limitCents" ? (currentValue / 100).toString() : currentValue.toString(),
    });
  };

  const handleCellBlur = () => {
    if (!editingCell) return;

    const limit = limits?.find((l) => l.id === editingCell.limitId);
    if (!limit) return;

    let updates: any = {};
    if (editingCell.field === "limitCents") {
      const dollars = parseFloat(editingCell.value);
      if (isNaN(dollars) || dollars < 0) {
        toast({ title: "Invalid amount", description: "Please enter a valid dollar amount", variant: "destructive" });
        setEditingCell(null);
        return;
      }
      updates.limitCents = Math.round(dollars * 100);
    } else if (editingCell.field === "householdSize") {
      const size = parseInt(editingCell.value);
      if (isNaN(size) || size < 1) {
        toast({ title: "Invalid household size", description: "Please enter a valid household size", variant: "destructive" });
        setEditingCell(null);
        return;
      }
      updates.householdSize = size;
    } else {
      updates[editingCell.field] = editingCell.value;
    }

    updateLimit({
      programId,
      limitId: editingCell.limitId,
      updates,
    });

    setEditingCell(null);
  };

  const handleCellKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleCellBlur();
    } else if (e.key === "Escape") {
      setEditingCell(null);
    }
  };

  const handleAddLimit = () => {
    const householdSize = parseInt(newLimit.householdSize);
    const dollars = parseFloat(newLimit.limitCents);

    if (isNaN(householdSize) || householdSize < 1) {
      toast({ title: "Invalid household size", description: "Please enter a valid household size", variant: "destructive" });
      return;
    }

    if (isNaN(dollars) || dollars < 0) {
      toast({ title: "Invalid amount", description: "Please enter a valid dollar amount", variant: "destructive" });
      return;
    }

    createLimit({
      programId,
      data: {
        householdSize,
        limitCents: Math.round(dollars * 100),
        versionLabel: newLimit.versionLabel,
      },
    }, {
      onSuccess: () => {
        setNewLimit({ householdSize: "", limitCents: "", versionLabel: "2024-V1" });
      },
    });
  };

  const confirmDelete = (limitId: number) => {
    setLimitToDelete(limitId);
    setDeleteDialogOpen(true);
  };

  const handleDelete = () => {
    if (limitToDelete) {
      deleteLimit({ programId, limitId: limitToDelete });
      setDeleteDialogOpen(false);
      setLimitToDelete(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  const sortedLimits = [...(limits || [])].sort((a, b) => a.householdSize - b.householdSize);

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Household Size</TableHead>
            <TableHead>Income Limit ($)</TableHead>
            <TableHead>Version</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedLimits.map((limit) => (
            <TableRow key={limit.id}>
              <TableCell
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => handleCellClick(limit.id, "householdSize", limit.householdSize)}
              >
                {editingCell?.limitId === limit.id && editingCell.field === "householdSize" ? (
                  <Input
                    type="number"
                    value={editingCell.value}
                    onChange={(e) => setEditingCell({ ...editingCell, value: e.target.value })}
                    onBlur={handleCellBlur}
                    onKeyDown={handleCellKeyDown}
                    autoFocus
                    className="h-8"
                  />
                ) : (
                  limit.householdSize
                )}
              </TableCell>
              <TableCell
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => handleCellClick(limit.id, "limitCents", limit.limitCents)}
              >
                {editingCell?.limitId === limit.id && editingCell.field === "limitCents" ? (
                  <Input
                    type="number"
                    step="0.01"
                    value={editingCell.value}
                    onChange={(e) => setEditingCell({ ...editingCell, value: e.target.value })}
                    onBlur={handleCellBlur}
                    onKeyDown={handleCellKeyDown}
                    autoFocus
                    className="h-8"
                  />
                ) : (
                  `$${(limit.limitCents / 100).toLocaleString()}`
                )}
              </TableCell>
              <TableCell
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => handleCellClick(limit.id, "versionLabel", limit.versionLabel)}
              >
                {editingCell?.limitId === limit.id && editingCell.field === "versionLabel" ? (
                  <Input
                    value={editingCell.value}
                    onChange={(e) => setEditingCell({ ...editingCell, value: e.target.value })}
                    onBlur={handleCellBlur}
                    onKeyDown={handleCellKeyDown}
                    autoFocus
                    className="h-8"
                  />
                ) : (
                  limit.versionLabel
                )}
              </TableCell>
              <TableCell className="text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => confirmDelete(limit.id)}
                >
                  <Trash2 className="h-4 w-4 text-red-600" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {/* Add New Row */}
          <TableRow className="bg-muted/20">
            <TableCell>
              <Input
                type="number"
                placeholder="Size"
                value={newLimit.householdSize}
                onChange={(e) => setNewLimit({ ...newLimit, householdSize: e.target.value })}
                className="h-8"
              />
            </TableCell>
            <TableCell>
              <Input
                type="number"
                step="0.01"
                placeholder="Amount"
                value={newLimit.limitCents}
                onChange={(e) => setNewLimit({ ...newLimit, limitCents: e.target.value })}
                className="h-8"
              />
            </TableCell>
            <TableCell>
              <Input
                placeholder="Version"
                value={newLimit.versionLabel}
                onChange={(e) => setNewLimit({ ...newLimit, versionLabel: e.target.value })}
                className="h-8"
              />
            </TableCell>
            <TableCell className="text-right">
              <Button
                size="sm"
                onClick={handleAddLimit}
                disabled={isCreating}
              >
                {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
                Add
              </Button>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Income Limit?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this income limit. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
