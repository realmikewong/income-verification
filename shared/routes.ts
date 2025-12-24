import { z } from 'zod';
import { 
  insertUserSchema, 
  insertProgramSchema, 
  insertIncomeLimitSchema, 
  insertApplicationSchema,
  users,
  programs,
  incomeLimits,
  applications,
  documents,
  activityEvents,
  userRoles,
  applicationStatuses,
  systemResults
} from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
  unauthorized: z.object({
    message: z.string(),
  }),
};

// Custom Inputs
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export const startApplicationSchema = z.object({
  programId: z.coerce.number(),
  applicantName: z.string().min(1, "Name is required"),
  applicantEmail: z.string().email("Invalid email address"),
});

export const updateApplicationSchema = insertApplicationSchema.partial();

export const submitDecisionSchema = z.object({
  status: z.enum(["Approved", "Denied", "NeedsInfo"]),
  note: z.string().min(1, "Note is required"),
});

export const validateZipSchema = z.object({
  programId: z.number(),
  zipCode: z.string(),
});

export const api = {
  auth: {
    login: {
      method: 'POST' as const,
      path: '/api/auth/login',
      input: loginSchema,
      responses: {
        200: z.custom<typeof users.$inferSelect>(), // Returns user info (minus password)
        401: errorSchemas.unauthorized,
      }
    },
    logout: {
      method: 'POST' as const,
      path: '/api/auth/logout',
      responses: {
        200: z.void(),
      }
    },
    me: { // To check current session
      method: 'GET' as const,
      path: '/api/auth/me',
      responses: {
        200: z.custom<typeof users.$inferSelect | null>(),
      }
    }
  },
  programs: {
    list: {
      method: 'GET' as const,
      path: '/api/programs',
      responses: {
        200: z.array(z.custom<typeof programs.$inferSelect>()),
      }
    },
    create: {
      method: 'POST' as const,
      path: '/api/programs',
      input: insertProgramSchema,
      responses: {
        201: z.custom<typeof programs.$inferSelect>(),
      }
    },
    get: {
      method: 'GET' as const,
      path: '/api/programs/:id',
      responses: {
        200: z.custom<typeof programs.$inferSelect>(),
        404: errorSchemas.notFound,
      }
    },
    update: {
      method: 'PATCH' as const,
      path: '/api/programs/:id',
      input: insertProgramSchema.partial(),
      responses: {
        200: z.custom<typeof programs.$inferSelect>(),
        404: errorSchemas.notFound,
      }
    },
    validateZip: {
      method: 'POST' as const,
      path: '/api/programs/validate-zip',
      input: validateZipSchema,
      responses: {
        200: z.object({ valid: z.boolean(), message: z.string().nullable() }),
      }
    },
  },
  incomeLimits: {
    list: {
      method: 'GET' as const,
      path: '/api/programs/:id/limits',
      responses: {
        200: z.array(z.custom<typeof incomeLimits.$inferSelect>()),
      }
    },
    create: { // Can be used to seed/add limits
      method: 'POST' as const,
      path: '/api/programs/:id/limits',
      input: insertIncomeLimitSchema.omit({ programId: true }),
      responses: {
        201: z.custom<typeof incomeLimits.$inferSelect>(),
      }
    },
    update: {
      method: 'PATCH' as const,
      path: '/api/programs/:id/limits/:limitId',
      input: insertIncomeLimitSchema.partial().omit({ programId: true }),
      responses: {
        200: z.custom<typeof incomeLimits.$inferSelect>(),
        404: errorSchemas.notFound,
      }
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/programs/:id/limits/:limitId',
      responses: {
        204: z.void(),
      }
    },
  },
  applications: {
    // Public Applicant Routes
    start: {
      method: 'POST' as const,
      path: '/api/applications/start',
      input: startApplicationSchema,
      responses: {
        201: z.object({ token: z.string(), id: z.number() }), // Return token to redirect
      }
    },
    getByToken: {
      method: 'GET' as const,
      path: '/api/applications/by-token/:token',
      responses: {
        200: z.custom<typeof applications.$inferSelect & { documents: typeof documents.$inferSelect[], activityEvents: typeof activityEvents.$inferSelect[] }>(),
        404: errorSchemas.notFound,
      }
    },
    updateByToken: {
      method: 'PATCH' as const,
      path: '/api/applications/by-token/:token',
      input: updateApplicationSchema,
      responses: {
        200: z.custom<typeof applications.$inferSelect>(),
      }
    },
    submitByToken: {
      method: 'POST' as const,
      path: '/api/applications/by-token/:token/submit',
      responses: {
        200: z.custom<typeof applications.$inferSelect>(), // Returns updated status and system result
      }
    },
    
    // Reviewer Routes
    list: {
      method: 'GET' as const,
      path: '/api/applications',
      input: z.object({
        status: z.enum(applicationStatuses).optional(),
        programId: z.string().optional(),
        search: z.string().optional(),
      }).optional(),
      responses: {
        200: z.array(z.custom<typeof applications.$inferSelect & { program: typeof programs.$inferSelect }>()),
      }
    },
    get: {
      method: 'GET' as const,
      path: '/api/applications/:id',
      responses: {
        200: z.custom<typeof applications.$inferSelect & { 
          documents: typeof documents.$inferSelect[], 
          activityEvents: (typeof activityEvents.$inferSelect & { user: typeof users.$inferSelect | null })[],
          program: typeof programs.$inferSelect,
          incomeLimitSnapshot: typeof incomeLimits.$inferSelect | null
        }>(),
        404: errorSchemas.notFound,
      }
    },
    decision: {
      method: 'POST' as const,
      path: '/api/applications/:id/decision',
      input: submitDecisionSchema,
      responses: {
        200: z.custom<typeof applications.$inferSelect>(),
      }
    }
  },
  exports: {
    applications: {
      method: 'GET' as const,
      path: '/api/exports/applications',
      responses: {
        200: z.any(), // CSV blob
      }
    }
  }
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
