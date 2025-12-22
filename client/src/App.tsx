import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { AppLayout, PublicLayout } from "@/components/layout-shell";

// Pages
import StartPage from "@/pages/public-start";
import WizardPage from "@/pages/public-wizard";
import StatusPage from "@/pages/public-status";
import ReviewerLogin from "@/pages/reviewer-login";
import ReviewerDashboard from "@/pages/reviewer-dashboard";
import ReviewerPrograms from "@/pages/reviewer-programs";

function Router() {
  return (
    <Switch>
      {/* Public Applicant Routes */}
      <Route path="/">
        <PublicLayout><StartPage /></PublicLayout>
      </Route>
      <Route path="/start">
        <PublicLayout><StartPage /></PublicLayout>
      </Route>
      <Route path="/apply/:token">
        <PublicLayout><WizardPage /></PublicLayout>
      </Route>
      <Route path="/status/:token">
        <PublicLayout><StatusPage /></PublicLayout>
      </Route>

      {/* Reviewer / Admin Routes */}
      <Route path="/app/login" component={ReviewerLogin} />
      
      <Route path="/app/applications">
        <AppLayout><ReviewerDashboard /></AppLayout>
      </Route>
      <Route path="/app/programs">
        <AppLayout><ReviewerPrograms /></AppLayout>
      </Route>

      {/* Fallback */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
