import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { useApplicationByToken, useUpdateApplication, useSubmitApplication, useUploadDocument } from "@/hooks/use-applications";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Check, Upload, FileText, ChevronRight, ChevronLeft, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

// Simple stepper component
function Stepper({ currentStep, steps }: { currentStep: number; steps: string[] }) {
  return (
    <div className="w-full mb-8">
      <div className="flex justify-between relative z-0">
        <div className="absolute top-1/2 left-0 w-full h-1 bg-muted -z-10 -translate-y-1/2 rounded-full" />
        <div 
          className="absolute top-1/2 left-0 h-1 bg-primary -z-10 -translate-y-1/2 rounded-full transition-all duration-500 ease-in-out"
          style={{ width: `${(currentStep / (steps.length - 1)) * 100}%` }}
        />
        {steps.map((step, idx) => {
          const isCompleted = idx < currentStep;
          const isCurrent = idx === currentStep;
          return (
            <div key={idx} className="flex flex-col items-center gap-2">
              <div 
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center border-2 bg-background font-bold transition-all duration-300",
                  isCompleted ? "border-primary bg-primary text-primary-foreground" :
                  isCurrent ? "border-primary text-primary shadow-lg scale-110" : "border-muted text-muted-foreground"
                )}
              >
                {isCompleted ? <Check className="w-5 h-5" /> : idx + 1}
              </div>
              <span className={cn(
                "text-xs font-medium hidden sm:block", 
                isCurrent ? "text-primary" : "text-muted-foreground"
              )}>
                {step}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function WizardPage() {
  const [, params] = useRoute("/apply/:token");
  const token = params?.token || "";
  const [, setLocation] = useLocation();
  const { data: application, isLoading } = useApplicationByToken(token);
  const { mutate: updateApp, isPending: isUpdating } = useUpdateApplication(token);
  const { mutate: submitApp, isPending: isSubmitting } = useSubmitApplication(token);
  const { mutate: uploadDoc, isPending: isUploading } = useUploadDocument(token);
  const { toast } = useToast();

  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState<any>({});

  // Sync form data when app loads
  useEffect(() => {
    if (application) {
      setFormData({
        addressLine1: application.addressLine1 || "",
        city: application.city || "",
        state: application.state || "",
        zip: application.zip || "",
        applicantPhone: application.applicantPhone || "",
        householdSize: application.householdSize || "",
        annualIncomeCents: application.annualIncomeCents ? application.annualIncomeCents / 100 : "",
      });
      
      // If already submitted, redirect to status
      if (application.status !== "Draft" && application.status !== "NeedsInfo") {
        setLocation(`/status/${token}`);
      }
    }
  }, [application, token, setLocation]);

  if (isLoading || !application) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  const handleNext = () => {
    // Basic validation
    if (step === 0 && (!formData.addressLine1 || !formData.city || !formData.state || !formData.zip)) {
      toast({ title: "Please fill in all address fields", variant: "destructive" });
      return;
    }
    if (step === 1 && !formData.householdSize) {
      toast({ title: "Please enter household size", variant: "destructive" });
      return;
    }
    if (step === 2 && !formData.annualIncomeCents) {
      toast({ title: "Please enter annual income", variant: "destructive" });
      return;
    }

    // Save current state
    const updates = { ...formData };
    if (updates.householdSize) updates.householdSize = Number(updates.householdSize);
    if (updates.annualIncomeCents) updates.annualIncomeCents = Math.round(Number(updates.annualIncomeCents) * 100);

    updateApp(updates, {
      onSuccess: () => setStep(s => s + 1),
    });
  };

  const handleSubmit = () => {
    submitApp(undefined, {
      onSuccess: () => setLocation(`/status/${token}`),
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const data = new FormData();
      data.append("file", file);
      uploadDoc(data);
    }
  };

  const steps = ["Contact Info", "Household", "Income", "Documents", "Review"];

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-display font-bold mb-2">Application for {application.program?.name}</h1>
        <p className="text-muted-foreground">ID: #{application.id}</p>
      </div>

      <Stepper currentStep={step} steps={steps} />

      <Card className="shadow-lg border-t-4 border-t-primary min-h-[400px] flex flex-col">
        <CardHeader>
          <CardTitle className="text-2xl">{steps[step]}</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 space-y-6">
          {/* Step 0: Contact Info */}
          {step === 0 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="grid gap-2">
                <Label>Address Line 1</Label>
                <Input 
                  value={formData.addressLine1} 
                  onChange={e => setFormData({...formData, addressLine1: e.target.value})} 
                  placeholder="123 Main St"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>City</Label>
                  <Input 
                    value={formData.city} 
                    onChange={e => setFormData({...formData, city: e.target.value})} 
                    placeholder="New York"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>State</Label>
                  <Input 
                    value={formData.state} 
                    onChange={e => setFormData({...formData, state: e.target.value})} 
                    placeholder="NY"
                    maxLength={2}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>ZIP Code</Label>
                  <Input 
                    value={formData.zip} 
                    onChange={e => setFormData({...formData, zip: e.target.value})} 
                    placeholder="10001"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Phone Number</Label>
                  <Input 
                    value={formData.applicantPhone} 
                    onChange={e => setFormData({...formData, applicantPhone: e.target.value})} 
                    placeholder="(555) 555-5555"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 1: Household */}
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="grid gap-2">
                <Label>Household Size</Label>
                <Input 
                  type="number" 
                  min="1"
                  value={formData.householdSize} 
                  onChange={e => setFormData({...formData, householdSize: e.target.value})} 
                  placeholder="e.g. 4"
                  className="text-lg p-6"
                />
                <p className="text-sm text-muted-foreground">Include yourself, spouse, and dependents.</p>
              </div>
            </div>
          )}

          {/* Step 2: Income */}
          {step === 2 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
               <div className="grid gap-2">
                <Label>Total Annual Income ($)</Label>
                <Input 
                  type="number" 
                  min="0"
                  step="0.01"
                  value={formData.annualIncomeCents} 
                  onChange={e => setFormData({...formData, annualIncomeCents: e.target.value})} 
                  placeholder="e.g. 45000"
                  className="text-lg p-6 font-mono"
                />
                <p className="text-sm text-muted-foreground">Gross income before taxes for all household members.</p>
              </div>
            </div>
          )}

          {/* Step 3: Documents */}
          {step === 3 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center bg-muted/5 hover:bg-muted/10 transition-colors">
                <input 
                  type="file" 
                  id="file-upload" 
                  className="hidden" 
                  onChange={handleFileChange}
                  disabled={isUploading}
                />
                <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center gap-2">
                  <div className="p-4 bg-primary/10 rounded-full">
                    {isUploading ? <Loader2 className="w-8 h-8 animate-spin text-primary" /> : <Upload className="w-8 h-8 text-primary" />}
                  </div>
                  <span className="font-semibold text-lg">Click to upload documents</span>
                  <span className="text-sm text-muted-foreground">PDF, JPG, PNG up to 10MB</span>
                </label>
              </div>

              {application.documents && application.documents.length > 0 && (
                <div className="space-y-2 mt-4">
                  <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Uploaded Files</h4>
                  {application.documents.map((doc: any) => (
                    <div key={doc.id} className="flex items-center p-3 bg-card border rounded-md shadow-sm">
                      <FileText className="w-5 h-5 text-blue-500 mr-3" />
                      <span className="flex-1 truncate font-medium">{doc.filename}</span>
                      <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                        {(doc.sizeBytes / 1024).toFixed(1)} KB
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 4: Review */}
          {step === 4 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="bg-primary/5 p-4 rounded-lg border border-primary/10 flex gap-3">
                <AlertCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <p className="text-sm">Please review your information carefully. Falsifying information may result in disqualification.</p>
              </div>

              <div className="grid grid-cols-2 gap-y-4 text-sm">
                <div className="text-muted-foreground">Name</div>
                <div className="font-medium text-right">{application.applicantName}</div>
                
                <div className="text-muted-foreground">Email</div>
                <div className="font-medium text-right">{application.applicantEmail}</div>
                
                <div className="text-muted-foreground">Address</div>
                <div className="font-medium text-right">{formData.addressLine1}, {formData.city}, {formData.state} {formData.zip}</div>
                
                <div className="text-muted-foreground">Household Size</div>
                <div className="font-medium text-right">{formData.householdSize} members</div>
                
                <div className="text-muted-foreground">Annual Income</div>
                <div className="font-medium text-right font-mono">${Number(formData.annualIncomeCents).toLocaleString()}</div>
                
                <div className="text-muted-foreground">Documents</div>
                <div className="font-medium text-right">{application.documents?.length || 0} files attached</div>
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-between border-t bg-muted/5 p-6">
          <Button 
            variant="outline" 
            onClick={() => setStep(s => Math.max(0, s - 1))}
            disabled={step === 0 || isUpdating}
          >
            <ChevronLeft className="mr-2 h-4 w-4" /> Back
          </Button>

          {step < steps.length - 1 ? (
            <Button onClick={handleNext} disabled={isUpdating}>
              {isUpdating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Next Step <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={isSubmitting} className="bg-green-600 hover:bg-green-700">
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
              Submit Application
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
