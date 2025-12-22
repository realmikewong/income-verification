import { useState } from "react";
import { usePrograms, useCreateProgram } from "@/hooks/use-programs";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertProgramSchema } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Loader2, Plus, Calendar } from "lucide-react";
import { format } from "date-fns";

export default function ReviewerPrograms() {
  const { data: programs, isLoading } = usePrograms();
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-display font-bold">Programs</h1>
          <p className="text-muted-foreground">Manage benefit programs and eligibility rules.</p>
        </div>
        <CreateProgramDialog open={open} onOpenChange={setOpen} />
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          <div className="col-span-full flex justify-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          programs?.map((program) => (
            <Card key={program.id} className="hover:shadow-md transition-shadow cursor-pointer border-t-4 border-t-blue-500">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle>{program.name}</CardTitle>
                </div>
                <CardDescription>{program.regionLabel}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center text-sm text-muted-foreground gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>Effective: {format(new Date(program.effectiveStart), "MMM d, yyyy")}</span>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

function CreateProgramDialog({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) {
  const { mutate: createProgram, isPending } = useCreateProgram();
  const form = useForm<z.infer<typeof insertProgramSchema>>({
    resolver: zodResolver(insertProgramSchema),
    defaultValues: {
      name: "",
      regionLabel: "",
      effectiveStart: new Date(), // This will need to be handled carefully with forms, z.coerce.date()
    },
  });

  const onSubmit = (data: z.infer<typeof insertProgramSchema>) => {
    createProgram(data, {
      onSuccess: () => {
        onOpenChange(false);
        form.reset();
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button><Plus className="mr-2 h-4 w-4" /> New Program</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Program</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Program Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Energy Assistance 2024" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="regionLabel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Region / State</FormLabel>
                  <FormControl>
                    <Input placeholder="California" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="effectiveStart"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Effective Start Date</FormLabel>
                  <FormControl>
                    <Input 
                      type="date" 
                      value={field.value ? format(field.value, "yyyy-MM-dd") : ""}
                      onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : undefined)} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Program
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
