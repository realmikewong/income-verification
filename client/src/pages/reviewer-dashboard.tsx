import { useState } from "react";
import { useApplications, useApplication, useApplicationDecision } from "@/hooks/use-applications";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Search, Filter, FileText, CheckCircle, XCircle, AlertCircle, Calendar } from "lucide-react";
import { format } from "date-fns";
import { applicationStatuses } from "@shared/schema";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    Draft: "bg-gray-100 text-gray-700 hover:bg-gray-200",
    Submitted: "bg-blue-100 text-blue-700 hover:bg-blue-200",
    NeedsInfo: "bg-yellow-100 text-yellow-700 hover:bg-yellow-200",
    Approved: "bg-green-100 text-green-700 hover:bg-green-200",
    Denied: "bg-red-100 text-red-700 hover:bg-red-200",
  };
  return <Badge className={styles[status] || ""} variant="outline">{status}</Badge>;
}

export default function ReviewerDashboard() {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("Submitted");
  const [search, setSearch] = useState("");
  
  const { data: applications, isLoading } = useApplications({ 
    status: filterStatus === "All" ? undefined : filterStatus, 
    search 
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-display font-bold">Applications</h1>
        <div className="flex gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search applicant..." 
              className="pl-9" 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[140px]">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Statuses</SelectItem>
              {applicationStatuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-[80px]">ID</TableHead>
              <TableHead>Applicant</TableHead>
              <TableHead>Program</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>System Result</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-10">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : applications?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                  No applications found matching your criteria.
                </TableCell>
              </TableRow>
            ) : (
              applications?.map((app) => (
                <TableRow key={app.id} className="hover:bg-muted/5 cursor-pointer" onClick={() => setSelectedId(app.id)}>
                  <TableCell className="font-mono text-muted-foreground">#{app.id}</TableCell>
                  <TableCell className="font-medium">
                    {app.applicantName}
                    <div className="text-xs text-muted-foreground">{app.applicantEmail}</div>
                  </TableCell>
                  <TableCell>{app.program.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {app.submittedAt ? format(new Date(app.submittedAt), "MMM d, yyyy") : "Draft"}
                  </TableCell>
                  <TableCell>
                    {app.systemResult === "Eligible" ? (
                      <span className="text-green-600 flex items-center gap-1 text-xs font-semibold"><CheckCircle className="w-3 h-3" /> Eligible</span>
                    ) : app.systemResult === "NotEligible" ? (
                      <span className="text-red-600 flex items-center gap-1 text-xs font-semibold"><XCircle className="w-3 h-3" /> Not Eligible</span>
                    ) : (
                      <span className="text-muted-foreground text-xs">-</span>
                    )}
                  </TableCell>
                  <TableCell><StatusBadge status={app.status} /></TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setSelectedId(app.id); }}>View</Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <ApplicationDetailSheet 
        id={selectedId} 
        open={!!selectedId} 
        onClose={() => setSelectedId(null)} 
      />
    </div>
  );
}

function ApplicationDetailSheet({ id, open, onClose }: { id: number | null, open: boolean, onClose: () => void }) {
  const { data: app, isLoading } = useApplication(id || 0);
  const { mutate: submitDecision, isPending } = useApplicationDecision();
  
  const [decisionNote, setDecisionNote] = useState("");
  const [decisionType, setDecisionType] = useState<"Approved" | "Denied" | "NeedsInfo" | null>(null);

  if (!open) return null;

  const handleDecision = () => {
    if (id && decisionType) {
      submitDecision(
        { id, data: { status: decisionType, note: decisionNote } }, 
        { onSuccess: () => { setDecisionType(null); onClose(); } }
      );
    }
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-xl p-0 flex flex-col h-full bg-background">
        {isLoading || !app ? (
          <div className="h-full flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <>
            <div className="px-6 py-4 border-b">
              <div className="flex items-center justify-between mb-2">
                <StatusBadge status={app.status} />
                <span className="text-sm text-muted-foreground font-mono">#{app.id}</span>
              </div>
              <SheetTitle className="text-xl">{app.applicantName}</SheetTitle>
              <SheetDescription>{app.program.name}</SheetDescription>
            </div>

            <ScrollArea className="flex-1">
              <div className="px-6 py-6">
                <Tabs defaultValue="overview" className="w-full">
                  <TabsList className="w-full mb-6">
                    <TabsTrigger value="overview" className="flex-1">Overview</TabsTrigger>
                    <TabsTrigger value="documents" className="flex-1">Documents ({app.documents.length})</TabsTrigger>
                    <TabsTrigger value="activity" className="flex-1">History</TabsTrigger>
                  </TabsList>

                  <TabsContent value="overview" className="space-y-6">
                    {/* Eligibility Card */}
                    <div className="bg-muted/30 p-4 rounded-lg border">
                      <h3 className="font-semibold mb-3 flex items-center gap-2">
                        System Calculation
                        {app.systemResult === "Eligible" && <Badge className="bg-green-100 text-green-700">Eligible</Badge>}
                        {app.systemResult === "NotEligible" && <Badge className="bg-red-100 text-red-700">Not Eligible</Badge>}
                      </h3>
                      <div className="grid grid-cols-2 gap-y-2 text-sm">
                        <span className="text-muted-foreground">Household Size:</span>
                        <span className="font-medium text-right">{app.householdSize}</span>
                        
                        <span className="text-muted-foreground">Annual Income:</span>
                        <span className="font-medium text-right font-mono">${(app.annualIncomeCents! / 100).toLocaleString()}</span>
                        
                        <div className="col-span-2 my-1 border-t border-dashed" />
                        
                        <span className="text-muted-foreground">Income Limit:</span>
                        <span className="font-medium text-right font-mono text-muted-foreground">
                          ${app.computedLimitCents ? (app.computedLimitCents / 100).toLocaleString() : "N/A"}
                        </span>
                      </div>
                    </div>

                    {/* Applicant Details */}
                    <div>
                      <h3 className="font-semibold mb-3">Contact Information</h3>
                      <dl className="grid grid-cols-1 gap-2 text-sm">
                        <div className="flex justify-between py-2 border-b">
                          <dt className="text-muted-foreground">Email</dt>
                          <dd className="font-medium">{app.applicantEmail}</dd>
                        </div>
                        <div className="flex justify-between py-2 border-b">
                          <dt className="text-muted-foreground">Phone</dt>
                          <dd className="font-medium">{app.applicantPhone || "N/A"}</dd>
                        </div>
                        <div className="flex justify-between py-2 border-b">
                          <dt className="text-muted-foreground">Address</dt>
                          <dd className="font-medium text-right max-w-[200px]">
                            {app.addressLine1}<br/>
                            {app.city}, {app.state} {app.zip}
                          </dd>
                        </div>
                      </dl>
                    </div>
                  </TabsContent>

                  <TabsContent value="documents" className="space-y-4">
                    {app.documents.length === 0 ? (
                      <div className="text-center py-10 text-muted-foreground bg-muted/20 rounded-lg border border-dashed">
                        No documents uploaded yet.
                      </div>
                    ) : (
                      app.documents.map((doc) => (
                        <div key={doc.id} className="flex items-center justify-between p-3 bg-card border rounded-lg hover:bg-muted/50 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 bg-blue-50 text-blue-600 rounded flex items-center justify-center">
                              <FileText className="w-5 h-5" />
                            </div>
                            <div>
                              <p className="font-medium text-sm">{doc.filename}</p>
                              <p className="text-xs text-muted-foreground">{format(new Date(doc.uploadedAt!), "MMM d, h:mm a")}</p>
                            </div>
                          </div>
                          <Button variant="ghost" size="sm" asChild>
                            <a href={doc.path} target="_blank" rel="noreferrer">View</a>
                          </Button>
                        </div>
                      ))
                    )}
                  </TabsContent>

                  <TabsContent value="activity">
                    <div className="space-y-6 pl-2 relative border-l border-muted ml-2">
                      {app.activityEvents.map((event) => (
                        <div key={event.id} className="relative pl-6">
                          <div className="absolute -left-[5px] top-1.5 h-2.5 w-2.5 rounded-full bg-primary border-2 border-background" />
                          <p className="text-sm font-medium">{event.message}</p>
                          <div className="flex gap-2 text-xs text-muted-foreground mt-1">
                            <span>{format(new Date(event.createdAt!), "MMM d, h:mm a")}</span>
                            {event.user && <span>by {event.user.email}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </ScrollArea>

            <SheetFooter className="p-4 border-t bg-muted/10 grid grid-cols-3 gap-2 sm:space-x-0">
               {/* Decision Dialogs */}
               <Dialog open={decisionType !== null} onOpenChange={(open) => !open && setDecisionType(null)}>
                 <DialogContent>
                   <DialogHeader>
                     <DialogTitle>Confirm {decisionType} Decision</DialogTitle>
                     <DialogDescription>
                       Add a note for the record. This will be visible in the history.
                     </DialogDescription>
                   </DialogHeader>
                   <Textarea 
                     value={decisionNote} 
                     onChange={(e) => setDecisionNote(e.target.value)} 
                     placeholder="Enter reason or notes here..." 
                     className="min-h-[100px]"
                   />
                   <DialogFooter>
                     <Button variant="outline" onClick={() => setDecisionType(null)}>Cancel</Button>
                     <Button 
                       onClick={handleDecision} 
                       disabled={!decisionNote.trim() || isPending}
                       className={
                        decisionType === "Approved" ? "bg-green-600 hover:bg-green-700" :
                        decisionType === "Denied" ? "bg-red-600 hover:bg-red-700" :
                        "bg-yellow-600 hover:bg-yellow-700"
                       }
                      >
                       {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                       Confirm {decisionType}
                     </Button>
                   </DialogFooter>
                 </DialogContent>
               </Dialog>

               <Button 
                 variant="outline" 
                 className="border-green-200 text-green-700 hover:bg-green-50 hover:text-green-800"
                 onClick={() => setDecisionType("Approved")}
               >
                 <CheckCircle className="mr-2 h-4 w-4" /> Approve
               </Button>
               <Button 
                 variant="outline" 
                 className="border-yellow-200 text-yellow-700 hover:bg-yellow-50 hover:text-yellow-800"
                 onClick={() => setDecisionType("NeedsInfo")}
               >
                 <AlertCircle className="mr-2 h-4 w-4" /> Request Info
               </Button>
               <Button 
                 variant="outline" 
                 className="border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
                 onClick={() => setDecisionType("Denied")}
               >
                 <XCircle className="mr-2 h-4 w-4" /> Deny
               </Button>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
