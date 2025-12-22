import { pgTable, text, serial, integer, boolean, timestamp, date, uniqueIndex } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// --- ENUMS ---
export const userRoles = ["Admin", "Reviewer"] as const;
export const applicationStatuses = ["Draft", "Submitted", "NeedsInfo", "Approved", "Denied"] as const;
export const systemResults = ["Eligible", "NotEligible", "NeedsReview"] as const;
export const activityTypes = ["Note", "System", "RequestInfo", "StatusChange"] as const;

// --- TABLES ---

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role", { enum: userRoles }).notNull().default("Reviewer"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const programs = pgTable("programs", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  regionLabel: text("region_label").notNull(),
  effectiveStart: timestamp("effective_start").notNull(),
  effectiveEnd: timestamp("effective_end"), // Nullable
  createdAt: timestamp("created_at").defaultNow(),
});

export const incomeLimits = pgTable("income_limits", {
  id: serial("id").primaryKey(),
  programId: integer("program_id").notNull(),
  householdSize: integer("household_size").notNull(),
  limitCents: integer("limit_cents").notNull(),
  versionLabel: text("version_label").notNull(), // e.g., "2024-V1"
  createdAt: timestamp("created_at").defaultNow(),
});

export const applications = pgTable("applications", {
  id: serial("id").primaryKey(),
  programId: integer("program_id").notNull(),
  
  // Applicant Info
  applicantName: text("applicant_name").notNull(),
  applicantEmail: text("applicant_email").notNull(),
  applicantPhone: text("applicant_phone"),
  applicantToken: text("applicant_token").notNull().unique(),
  
  // Address
  addressLine1: text("address_line1"),
  city: text("city"),
  state: text("state"),
  zip: text("zip"),
  
  // Financials
  householdSize: integer("household_size"),
  annualIncomeCents: integer("annual_income_cents"),
  
  // System Calculation
  computedLimitCents: integer("computed_limit_cents"),
  systemResult: text("system_result", { enum: systemResults }), // Nullable initially
  ruleVersion: text("rule_version"),
  
  // Status
  status: text("status", { enum: applicationStatuses }).notNull().default("Draft"),
  submittedAt: timestamp("submitted_at"),
  reviewedBy: integer("reviewed_by"), // FK to users
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  applicationId: integer("application_id").notNull(),
  filename: text("filename").notNull(),
  path: text("path").notNull(),
  mimeType: text("mime_type").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
});

export const activityEvents = pgTable("activity_events", {
  id: serial("id").primaryKey(),
  applicationId: integer("application_id").notNull(),
  type: text("type", { enum: activityTypes }).notNull(),
  message: text("message").notNull(),
  createdByUserId: integer("created_by_user_id"), // Null for system events
  createdAt: timestamp("created_at").defaultNow(),
});

// --- RELATIONS ---

export const programsRelations = relations(programs, ({ many }) => ({
  incomeLimits: many(incomeLimits),
  applications: many(applications),
}));

export const incomeLimitsRelations = relations(incomeLimits, ({ one }) => ({
  program: one(programs, {
    fields: [incomeLimits.programId],
    references: [programs.id],
  }),
}));

export const applicationsRelations = relations(applications, ({ one, many }) => ({
  program: one(programs, {
    fields: [applications.programId],
    references: [programs.id],
  }),
  documents: many(documents),
  activityEvents: many(activityEvents),
  reviewer: one(users, {
    fields: [applications.reviewedBy],
    references: [users.id],
  }),
}));

export const documentsRelations = relations(documents, ({ one }) => ({
  application: one(applications, {
    fields: [documents.applicationId],
    references: [applications.id],
  }),
}));

export const activityEventsRelations = relations(activityEvents, ({ one }) => ({
  application: one(applications, {
    fields: [activityEvents.applicationId],
    references: [applications.id],
  }),
  user: one(users, {
    fields: [activityEvents.createdByUserId],
    references: [users.id],
  }),
}));

// --- SCHEMAS ---

export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertProgramSchema = createInsertSchema(programs).omit({ id: true, createdAt: true });
export const insertIncomeLimitSchema = createInsertSchema(incomeLimits).omit({ id: true, createdAt: true });
export const insertApplicationSchema = createInsertSchema(applications).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true,
  applicantToken: true, // Generated by server
  systemResult: true,   // Computed by server
  computedLimitCents: true, // Computed by server
  ruleVersion: true,    // Computed by server
  submittedAt: true     // Set by server on submit
});
export const insertDocumentSchema = createInsertSchema(documents).omit({ id: true, uploadedAt: true });
export const insertActivityEventSchema = createInsertSchema(activityEvents).omit({ id: true, createdAt: true });

// --- TYPES ---

export type User = typeof users.$inferSelect;
export type Program = typeof programs.$inferSelect;
export type IncomeLimit = typeof incomeLimits.$inferSelect;
export type Application = typeof applications.$inferSelect;
export type Document = typeof documents.$inferSelect;
export type ActivityEvent = typeof activityEvents.$inferSelect;
