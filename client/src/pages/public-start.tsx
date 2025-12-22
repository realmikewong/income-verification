import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { usePrograms } from "@/hooks/use-programs";
import { useStartApplication } from "@/hooks/use-applications";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { startApplicationSchema } from "@shared/routes";
import { Loader2, ArrowRight, ShieldCheck } from "lucide-react";

export default function StartPage() {
  const [, setLocation] = useLocation();
  const { data: programs, isLoading: loadingPrograms } = usePrograms();
  const { mutate: startApp, isPending } = useStartApplication();

  const form = useForm<z.infer<typeof startApplicationSchema>>({
    resolver: zodResolver(startApplicationSchema),
    defaultValues: {
      applicantName: "",
      applicantEmail: "",
    },
  });

  const onSubmit = (data: z.infer<typeof startApplicationSchema>) => {
    startApp(data, {
      onSuccess: (res) => {
        // Redirect to the wizard with the token
        setLocation(`/apply/${res.token}`);
      },
    });
  };

  return (
    <div className="max-w-xl mx-auto">
      <div className="text-center mb-10 space-y-4">
        <div className="inline-flex items-center justify-center p-3 bg-primary/10 rounded-full mb-4">
          <ShieldCheck className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-4xl md:text-5xl font-display font-bold text-foreground">
          Check Eligibility
        </h1>
        <p className="text-xl text-muted-foreground">
          Select a program and start your application securely.
        </p>
      </div>

      <Card className="shadow-xl border-t-4 border-t-primary">
        <CardHeader>
          <CardTitle>Start New Application</CardTitle>
          <CardDescription>
            Enter your basic details to begin the verification process.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="programId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Select Program</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value?.toString()}
                      disabled={loadingPrograms}
                    >
                      <FormControl>
                        <SelectTrigger className="h-12 text-base">
                          <SelectValue placeholder="Choose a program..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {loadingPrograms ? (
                          <div className="p-2 text-sm text-muted-foreground flex items-center justify-center">
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading programs...
                          </div>
                        ) : (
                          programs?.map((program) => (
                            <SelectItem key={program.id} value={program.id.toString()}>
                              {program.name} ({program.regionLabel})
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-6 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="applicantName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John Doe" className="h-12" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="applicantEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="john@example.com" className="h-12" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Button 
                type="submit" 
                size="lg" 
                className="w-full text-lg h-14" 
                disabled={isPending}
              >
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Starting...
                  </>
                ) : (
                  <>
                    Begin Application <ArrowRight className="ml-2 h-5 w-5" />
                  </>
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
