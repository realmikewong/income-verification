import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";
import type { z } from "zod";

export function useApplications(params?: { status?: string; programId?: string; search?: string }) {
  const queryParams = new URLSearchParams();
  if (params?.status) queryParams.append("status", params.status);
  if (params?.programId) queryParams.append("programId", params.programId);
  if (params?.search) queryParams.append("search", params.search);

  return useQuery({
    queryKey: [api.applications.list.path, params],
    queryFn: async () => {
      const url = `${api.applications.list.path}?${queryParams.toString()}`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch applications");
      return api.applications.list.responses[200].parse(await res.json());
    },
  });
}

export function useApplication(id: number) {
  return useQuery({
    queryKey: [api.applications.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.applications.get.path, { id });
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch application");
      return api.applications.get.responses[200].parse(await res.json());
    },
    enabled: !!id,
  });
}

export function useApplicationByToken(token: string) {
  return useQuery({
    queryKey: [api.applications.getByToken.path, token],
    queryFn: async () => {
      const url = buildUrl(api.applications.getByToken.path, { token });
      const res = await fetch(url);
      if (!res.ok) throw new Error("Invalid or expired token");
      return api.applications.getByToken.responses[200].parse(await res.json());
    },
    enabled: !!token,
    retry: false,
  });
}

export function useStartApplication() {
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (data: z.infer<typeof api.applications.start.input>) => {
      const res = await fetch(api.applications.start.path, {
        method: api.applications.start.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to start application");
      return api.applications.start.responses[201].parse(await res.json());
    },
    onError: (error) => {
      toast({
        title: "Error starting application",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useUpdateApplication(token: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (updates: z.infer<typeof api.applications.updateByToken.input>) => {
      const url = buildUrl(api.applications.updateByToken.path, { token });
      const res = await fetch(url, {
        method: api.applications.updateByToken.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error("Failed to save changes");
      return api.applications.updateByToken.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.applications.getByToken.path, token] });
    },
    onError: () => {
      toast({
        title: "Failed to save",
        description: "Your changes could not be saved automatically.",
        variant: "destructive",
      });
    },
  });
}

export function useSubmitApplication(token: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async () => {
      const url = buildUrl(api.applications.submitByToken.path, { token });
      const res = await fetch(url, { method: api.applications.submitByToken.method });
      if (!res.ok) throw new Error("Failed to submit application");
      return api.applications.submitByToken.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.applications.getByToken.path, token] });
      toast({
        title: "Application Submitted",
        description: "We have received your application for review.",
      });
    },
    onError: (error) => {
      toast({
        title: "Submission failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useApplicationDecision() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: z.infer<typeof api.applications.decision.input> }) => {
      const url = buildUrl(api.applications.decision.path, { id });
      const res = await fetch(url, {
        method: api.applications.decision.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to submit decision");
      return api.applications.decision.responses[200].parse(await res.json());
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: [api.applications.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.applications.get.path, id] });
      toast({
        title: "Decision recorded",
        description: "The application status has been updated.",
      });
    },
  });
}

export function useUploadDocument(token: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (formData: FormData) => {
      // NOTE: This endpoint is manually handled in express as it's multipart/form-data
      // We assume endpoint exists as implied by instructions, though not explicitly in routes.ts manifest
      // Using a convention based URL
      const url = `/api/applications/by-token/${token}/upload`;
      const res = await fetch(url, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Upload failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.applications.getByToken.path, token] });
      toast({
        title: "Document uploaded",
        description: "File successfully attached to your application.",
      });
    },
    onError: () => {
      toast({
        title: "Upload failed",
        description: "Please try again with a valid file.",
        variant: "destructive",
      });
    },
  });
}
