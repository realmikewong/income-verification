import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";
import type { z } from "zod";

export function usePrograms() {
  return useQuery({
    queryKey: [api.programs.list.path],
    queryFn: async () => {
      const res = await fetch(api.programs.list.path);
      if (!res.ok) throw new Error("Failed to fetch programs");
      return api.programs.list.responses[200].parse(await res.json());
    },
  });
}

export function useProgram(id: number) {
  return useQuery({
    queryKey: [api.programs.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.programs.get.path, { id });
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch program");
      return api.programs.get.responses[200].parse(await res.json());
    },
    enabled: !!id,
  });
}

export function useCreateProgram() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: z.infer<typeof api.programs.create.input>) => {
      const res = await fetch(api.programs.create.path, {
        method: api.programs.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create program");
      return api.programs.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.programs.list.path] });
      toast({
        title: "Program Created",
        description: "New program has been added successfully.",
      });
    },
  });
}

export function useUpdateProgram() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const url = buildUrl(api.programs.update.path, { id });
      const res = await fetch(url, {
        method: api.programs.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update program");
      return api.programs.update.responses[200].parse(await res.json());
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: [api.programs.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.programs.get.path, id] });
      toast({
        title: "Program Updated",
        description: "Changes saved successfully.",
      });
    },
  });
}

export function useIncomeLimits(programId: number) {
  return useQuery({
    queryKey: [api.incomeLimits.list.path, programId],
    queryFn: async () => {
      const url = buildUrl(api.incomeLimits.list.path, { id: programId });
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch limits");
      return api.incomeLimits.list.responses[200].parse(await res.json());
    },
    enabled: !!programId,
  });
}

export function useCreateIncomeLimit() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ programId, data }: { programId: number; data: any }) => {
      const url = buildUrl(api.incomeLimits.create.path, { id: programId });
      const res = await fetch(url, {
        method: api.incomeLimits.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create income limit");
      return api.incomeLimits.create.responses[201].parse(await res.json());
    },
    onSuccess: (_, { programId }) => {
      queryClient.invalidateQueries({ queryKey: [api.incomeLimits.list.path, programId] });
      toast({
        title: "Income Limit Added",
        description: "New income limit has been created.",
      });
    },
  });
}

export function useUpdateIncomeLimit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ programId, limitId, updates }: { programId: number; limitId: number; updates: any }) => {
      const url = buildUrl(api.incomeLimits.update.path, { id: programId, limitId });
      const res = await fetch(url, {
        method: api.incomeLimits.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update income limit");
      return api.incomeLimits.update.responses[200].parse(await res.json());
    },
    onSuccess: (_, { programId }) => {
      queryClient.invalidateQueries({ queryKey: [api.incomeLimits.list.path, programId] });
    },
  });
}

export function useDeleteIncomeLimit() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ programId, limitId }: { programId: number; limitId: number }) => {
      const url = buildUrl(api.incomeLimits.delete.path, { id: programId, limitId });
      const res = await fetch(url, {
        method: api.incomeLimits.delete.method,
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete income limit");
    },
    onSuccess: (_, { programId }) => {
      queryClient.invalidateQueries({ queryKey: [api.incomeLimits.list.path, programId] });
      toast({
        title: "Income Limit Deleted",
        description: "The income limit has been removed.",
      });
    },
  });
}
