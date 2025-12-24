import { useState } from "react";
import { usePrograms, useProgram, useCreateProgram, useUpdateProgram } from "@/hooks/use-programs";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { programFormSchema, residenceTypeOptions, propertyTypeOptions } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Plus, Calendar, Edit } from "lucide-react";
import { format } from "date-fns";
import { MultiSelect } from "@/components/multi-select";
import { ZipCodeInput } from "@/components/zip-code-input";
import { IncomeLimitsEditor } from "@/components/income-limits-editor";

export default function ReviewerPrograms() {
  const { data: programs, isLoading } = usePrograms();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedProgramId, setSelectedProgramId] = useState<number | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-display font-bold">Programs</h1>
          <p className="text-muted-foreground">Manage benefit programs and eligibility rules.</p>
        </div>
        <CreateProgramDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} />
      </div>

      <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-[80px]">ID</TableHead>
              <TableHead>Program Name</TableHead>
              <TableHead>Region</TableHead>
              <TableHead>Effective Dates</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : programs?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                  No programs found. Create your first program to get started.
                </TableCell>
              </TableRow>
            ) : (
              programs?.map((program) => (
                <TableRow
                  key={program.id}
                  className="hover:bg-muted/5 cursor-pointer"
                  onClick={() => setSelectedProgramId(program.id)}
                >
                  <TableCell className="font-mono text-muted-foreground">#{program.id}</TableCell>
                  <TableCell className="font-medium">{program.name}</TableCell>
                  <TableCell>{program.regionLabel}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(program.effectiveStart), "MMM d, yyyy")}
                    {program.effectiveEnd && ` - ${format(new Date(program.effectiveEnd), "MMM d, yyyy")}`}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedProgramId(program.id);
                      }}
                    >
                      <Edit className="h-4 w-4 mr-1" /> Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <ProgramDetailSheet
        programId={selectedProgramId}
        open={!!selectedProgramId}
        onClose={() => setSelectedProgramId(null)}
      />
    </div>
  );
}

function CreateProgramDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { mutate: createProgram, isPending } = useCreateProgram();
  const form = useForm<z.infer<typeof programFormSchema>>({
    resolver: zodResolver(programFormSchema),
    defaultValues: {
      name: "",
      regionLabel: "",
      effectiveStart: new Date(),
      residenceTypes: [],
      propertyTypes: [],
      documentRequirements: [],
      eligibilityCriteria: "",
      allowedZipCodes: [],
    },
  });

  const onSubmit = (data: z.infer<typeof programFormSchema>) => {
    // Transform arrays to JSON strings for API
    const payload = {
      ...data,
      residenceTypes: JSON.stringify(data.residenceTypes),
      propertyTypes: JSON.stringify(data.propertyTypes),
      documentRequirements: JSON.stringify(data.documentRequirements),
      allowedZipCodes: JSON.stringify(data.allowedZipCodes),
    };

    createProgram(payload, {
      onSuccess: () => {
        onOpenChange(false);
        form.reset();
      },
    });
  };

  // Watch document requirements for tag input
  const [newDoc, setNewDoc] = useState("");
  const currentDocs = form.watch("documentRequirements");

  const addDocument = () => {
    if (newDoc.trim() && !currentDocs.includes(newDoc.trim())) {
      form.setValue("documentRequirements", [...currentDocs, newDoc.trim()]);
      setNewDoc("");
    }
  };

  const removeDocument = (doc: string) => {
    form.setValue(
      "documentRequirements",
      currentDocs.filter((d) => d !== doc)
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" /> New Program
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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

            <div className="grid grid-cols-2 gap-4">
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

              <FormField
                control={form.control}
                name="effectiveEnd"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Effective End Date (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        value={field.value ? format(field.value, "yyyy-MM-dd") : ""}
                        onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : null)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="residenceTypes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Residence Types</FormLabel>
                  <FormControl>
                    <MultiSelect
                      options={residenceTypeOptions}
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Select residence types..."
                    />
                  </FormControl>
                  <FormDescription>Select all applicable residence types</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="propertyTypes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Property Types</FormLabel>
                  <FormControl>
                    <MultiSelect
                      options={propertyTypeOptions}
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Select property types..."
                    />
                  </FormControl>
                  <FormDescription>Select all applicable property types</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="documentRequirements"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Document Requirements</FormLabel>
                  <FormControl>
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <Input
                          placeholder="e.g., Proof of Income"
                          value={newDoc}
                          onChange={(e) => setNewDoc(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              addDocument();
                            }
                          }}
                        />
                        <Button type="button" onClick={addDocument} variant="outline">
                          Add
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {field.value.map((doc) => (
                          <div
                            key={doc}
                            className="flex items-center gap-1 bg-secondary text-secondary-foreground px-2 py-1 rounded-md text-sm"
                          >
                            {doc}
                            <button type="button" onClick={() => removeDocument(doc)} className="ml-1">
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </FormControl>
                  <FormDescription>Add required documents for this program</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="allowedZipCodes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Allowed ZIP Codes</FormLabel>
                  <FormControl>
                    <ZipCodeInput value={field.value} onChange={field.onChange} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="eligibilityCriteria"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Eligibility Criteria (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Additional eligibility requirements..."
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>Free-form text describing additional eligibility rules</FormDescription>
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

function ProgramDetailSheet({ programId, open, onClose }: { programId: number | null; open: boolean; onClose: () => void }) {
  const { data: program, isLoading } = useProgram(programId || 0);
  const { mutate: updateProgram, isPending } = useUpdateProgram();

  const form = useForm<z.infer<typeof programFormSchema>>({
    resolver: zodResolver(programFormSchema),
  });

  // Update form when program data loads
  useState(() => {
    if (program) {
      form.reset({
        name: program.name,
        regionLabel: program.regionLabel,
        effectiveStart: new Date(program.effectiveStart),
        effectiveEnd: program.effectiveEnd ? new Date(program.effectiveEnd) : null,
        residenceTypes: JSON.parse(program.residenceTypes || "[]"),
        propertyTypes: JSON.parse(program.propertyTypes || "[]"),
        documentRequirements: JSON.parse(program.documentRequirements || "[]"),
        allowedZipCodes: JSON.parse(program.allowedZipCodes || "[]"),
        eligibilityCriteria: program.eligibilityCriteria || "",
      });
    }
  });

  const onSubmit = (data: z.infer<typeof programFormSchema>) => {
    if (!programId) return;

    const payload = {
      ...data,
      residenceTypes: JSON.stringify(data.residenceTypes),
      propertyTypes: JSON.stringify(data.propertyTypes),
      documentRequirements: JSON.stringify(data.documentRequirements),
      allowedZipCodes: JSON.stringify(data.allowedZipCodes),
    };

    updateProgram({ id: programId, data: payload });
  };

  // Document management for edit form
  const [newDoc, setNewDoc] = useState("");
  const currentDocs = form.watch("documentRequirements") || [];

  const addDocument = () => {
    if (newDoc.trim() && !currentDocs.includes(newDoc.trim())) {
      form.setValue("documentRequirements", [...currentDocs, newDoc.trim()]);
      setNewDoc("");
    }
  };

  const removeDocument = (doc: string) => {
    form.setValue(
      "documentRequirements",
      currentDocs.filter((d) => d !== doc)
    );
  };

  if (!open || !programId) return null;

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-2xl p-0 flex flex-col h-full bg-background overflow-hidden">
        {isLoading || !program ? (
          <div className="h-full flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <>
            <div className="px-6 py-4 border-b">
              <SheetTitle className="text-xl">Edit Program</SheetTitle>
              <p className="text-sm text-muted-foreground">#{program.id} - {program.name}</p>
            </div>

            <Tabs defaultValue="details" className="flex-1 flex flex-col overflow-hidden">
              <div className="px-6 pt-4">
                <TabsList className="w-full">
                  <TabsTrigger value="details" className="flex-1">
                    Details
                  </TabsTrigger>
                  <TabsTrigger value="limits" className="flex-1">
                    Income Limits
                  </TabsTrigger>
                </TabsList>
              </div>

              <ScrollArea className="flex-1">
                <div className="px-6 py-6">
                  <TabsContent value="details" className="space-y-4 mt-0">
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                          control={form.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Program Name</FormLabel>
                              <FormControl>
                                <Input {...field} />
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
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="effectiveStart"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Effective Start</FormLabel>
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

                          <FormField
                            control={form.control}
                            name="effectiveEnd"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Effective End</FormLabel>
                                <FormControl>
                                  <Input
                                    type="date"
                                    value={field.value ? format(field.value, "yyyy-MM-dd") : ""}
                                    onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : null)}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <FormField
                          control={form.control}
                          name="residenceTypes"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Residence Types</FormLabel>
                              <FormControl>
                                <MultiSelect
                                  options={residenceTypeOptions}
                                  value={field.value}
                                  onChange={field.onChange}
                                  placeholder="Select residence types..."
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="propertyTypes"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Property Types</FormLabel>
                              <FormControl>
                                <MultiSelect
                                  options={propertyTypeOptions}
                                  value={field.value}
                                  onChange={field.onChange}
                                  placeholder="Select property types..."
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="documentRequirements"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Document Requirements</FormLabel>
                              <FormControl>
                                <div className="space-y-2">
                                  <div className="flex gap-2">
                                    <Input
                                      placeholder="e.g., Proof of Income"
                                      value={newDoc}
                                      onChange={(e) => setNewDoc(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                          e.preventDefault();
                                          addDocument();
                                        }
                                      }}
                                    />
                                    <Button type="button" onClick={addDocument} variant="outline">
                                      Add
                                    </Button>
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    {field.value.map((doc) => (
                                      <div
                                        key={doc}
                                        className="flex items-center gap-1 bg-secondary text-secondary-foreground px-2 py-1 rounded-md text-sm"
                                      >
                                        {doc}
                                        <button type="button" onClick={() => removeDocument(doc)} className="ml-1">
                                          ×
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="allowedZipCodes"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Allowed ZIP Codes</FormLabel>
                              <FormControl>
                                <ZipCodeInput value={field.value} onChange={field.onChange} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="eligibilityCriteria"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Eligibility Criteria</FormLabel>
                              <FormControl>
                                <Textarea placeholder="Additional eligibility requirements..." className="min-h-[100px]" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <Button type="submit" className="w-full" disabled={isPending}>
                          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Save Changes
                        </Button>
                      </form>
                    </Form>
                  </TabsContent>

                  <TabsContent value="limits" className="mt-0">
                    <IncomeLimitsEditor programId={programId} />
                  </TabsContent>
                </div>
              </ScrollArea>
            </Tabs>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
