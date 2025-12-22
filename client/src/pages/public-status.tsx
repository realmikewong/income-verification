import { useRoute } from "wouter";
import { useApplicationByToken } from "@/hooks/use-applications";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, XCircle, Clock, AlertTriangle, FileText, ArrowLeft } from "lucide-react";
import { Link } from "wouter";

export default function StatusPage() {
  const [, params] = useRoute("/status/:token");
  const token = params?.token || "";
  const { data: application, isLoading } = useApplicationByToken(token);

  if (isLoading || !application) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  const statusConfig = {
    Draft: { icon: FileText, color: "bg-gray-100 text-gray-700", label: "Draft" },
    Submitted: { icon: Clock, color: "bg-blue-100 text-blue-700", label: "Under Review" },
    NeedsInfo: { icon: AlertTriangle, color: "bg-yellow-100 text-yellow-700", label: "Action Required" },
    Approved: { icon: CheckCircle2, color: "bg-green-100 text-green-700", label: "Approved" },
    Denied: { icon: XCircle, color: "bg-red-100 text-red-700", label: "Denied" },
  };

  const currentStatus = statusConfig[application.status as keyof typeof statusConfig] || statusConfig.Draft;
  const StatusIcon = currentStatus.icon;

  return (
    <div className="max-w-xl mx-auto py-10">
      <Card className="shadow-xl overflow-hidden">
        <div className={`h-2 w-full ${currentStatus.color.split(" ")[0].replace("100", "500")}`} />
        <CardHeader className="text-center pb-8">
          <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4 ${currentStatus.color}`}>
            <StatusIcon className="w-8 h-8" />
          </div>
          <CardTitle className="text-3xl font-display">Application Status</CardTitle>
          <CardDescription className="text-lg mt-2">
            ID: #{application.id} &bull; {application.program?.name}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col items-center p-6 bg-muted/20 rounded-lg border">
            <span className="text-muted-foreground uppercase text-xs tracking-wider font-semibold mb-1">Current Status</span>
            <span className={`text-xl font-bold px-4 py-1 rounded-full ${currentStatus.color}`}>
              {currentStatus.label}
            </span>
          </div>

          <div className="space-y-4">
            {application.status === "NeedsInfo" && (
              <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-md">
                <h4 className="font-semibold text-yellow-800 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" /> Additional Information Needed
                </h4>
                <p className="text-sm text-yellow-700 mt-1">
                  The reviewer has requested more information. Please update your documents.
                </p>
                <Link href={`/apply/${token}`}>
                  <Button className="w-full mt-3" variant="outline">
                    Update Application
                  </Button>
                </Link>
              </div>
            )}

            {application.status === "Approved" && (
              <div className="text-center space-y-2">
                <p>Congratulations! You are eligible for this program.</p>
                <p className="text-sm text-muted-foreground">You will receive an email with next steps shortly.</p>
              </div>
            )}

            {application.status === "Draft" && (
              <Link href={`/apply/${token}`}>
                <Button className="w-full">Continue Application</Button>
              </Link>
            )}
          </div>
          
          <div className="pt-6 border-t text-center">
            <Link href="/" className="text-sm text-primary hover:underline flex items-center justify-center gap-1">
              <ArrowLeft className="w-4 h-4" /> Back to Home
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
