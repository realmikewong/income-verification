import { db } from "./db";
import { 
  users, programs, incomeLimits, applications, documents, activityEvents,
  type User, type Program, type IncomeLimit, type Application, type Document, type ActivityEvent,
  type InsertUser, type InsertProgram, type InsertIncomeLimit, type InsertApplication, type InsertDocument, type InsertActivityEvent
} from "@shared/schema";
import { eq, desc, and, like } from "drizzle-orm";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

export interface IStorage {
  // User/Auth
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Programs
  getPrograms(): Promise<Program[]>;
  getProgram(id: number): Promise<Program | undefined>;
  createProgram(program: InsertProgram): Promise<Program>;
  
  // Limits
  getIncomeLimits(programId: number): Promise<IncomeLimit[]>;
  createIncomeLimit(limit: InsertIncomeLimit): Promise<IncomeLimit>;
  getIncomeLimitForHousehold(programId: number, size: number): Promise<IncomeLimit | undefined>;
  
  // Applications
  createApplication(app: InsertApplication): Promise<Application>;
  getApplicationByToken(token: string): Promise<Application | undefined>;
  getApplication(id: number): Promise<Application | undefined>;
  getApplications(filters?: { status?: string, programId?: number, search?: string }): Promise<Application[]>;
  updateApplication(id: number, updates: Partial<Application>): Promise<Application>;
  
  // Documents
  createDocument(doc: InsertDocument): Promise<Document>;
  getDocuments(applicationId: number): Promise<Document[]>;
  
  // Activity
  createActivityEvent(event: InsertActivityEvent): Promise<ActivityEvent>;
  getActivityEvents(applicationId: number): Promise<ActivityEvent[]>;
  
  sessionStore: session.Store;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000,
    });
  }

  // Users
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await db.insert(users).values(user).returning();
    return newUser;
  }

  // Programs
  async getPrograms(): Promise<Program[]> {
    return await db.select().from(programs).orderBy(desc(programs.createdAt));
  }

  async getProgram(id: number): Promise<Program | undefined> {
    const [program] = await db.select().from(programs).where(eq(programs.id, id));
    return program;
  }

  async createProgram(program: InsertProgram): Promise<Program> {
    const [newProgram] = await db.insert(programs).values(program).returning();
    return newProgram;
  }

  // Limits
  async getIncomeLimits(programId: number): Promise<IncomeLimit[]> {
    return await db.select().from(incomeLimits).where(eq(incomeLimits.programId, programId));
  }

  async createIncomeLimit(limit: InsertIncomeLimit): Promise<IncomeLimit> {
    const [newLimit] = await db.insert(incomeLimits).values(limit).returning();
    return newLimit;
  }

  async getIncomeLimitForHousehold(programId: number, size: number): Promise<IncomeLimit | undefined> {
    // Find exact match or closest logic? Requirement says "lookup by householdSize". 
    // Assuming 1-to-1 mapping for MVP.
    const [limit] = await db.select()
      .from(incomeLimits)
      .where(and(eq(incomeLimits.programId, programId), eq(incomeLimits.householdSize, size)));
    return limit;
  }

  // Applications
  async createApplication(app: InsertApplication): Promise<Application> {
    const [newApp] = await db.insert(applications).values(app).returning();
    return newApp;
  }

  async getApplicationByToken(token: string): Promise<Application | undefined> {
    const [app] = await db.select().from(applications).where(eq(applications.applicantToken, token));
    return app;
  }

  async getApplication(id: number): Promise<Application | undefined> {
    const [app] = await db.select().from(applications).where(eq(applications.id, id));
    return app;
  }

  async getApplications(filters?: { status?: string, programId?: number, search?: string }): Promise<Application[]> {
    let query = db.select().from(applications).orderBy(desc(applications.submittedAt));
    
    const conditions = [];
    if (filters?.status) conditions.push(eq(applications.status, filters.status as any));
    if (filters?.programId) conditions.push(eq(applications.programId, filters.programId));
    if (filters?.search) {
      conditions.push(like(applications.applicantName, `%${filters.search}%`));
    }
    
    if (conditions.length > 0) {
      // @ts-ignore - Drizzle and logic helper typing
      query = query.where(and(...conditions));
    }
    
    return await query;
  }

  async updateApplication(id: number, updates: Partial<Application>): Promise<Application> {
    const [updated] = await db.update(applications)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(applications.id, id))
      .returning();
    return updated;
  }

  // Documents
  async createDocument(doc: InsertDocument): Promise<Document> {
    const [newDoc] = await db.insert(documents).values(doc).returning();
    return newDoc;
  }

  async getDocuments(applicationId: number): Promise<Document[]> {
    return await db.select().from(documents).where(eq(documents.applicationId, applicationId));
  }

  // Activity
  async createActivityEvent(event: InsertActivityEvent): Promise<ActivityEvent> {
    const [newEvent] = await db.insert(activityEvents).values(event).returning();
    return newEvent;
  }

  async getActivityEvents(applicationId: number): Promise<ActivityEvent[]> {
    return await db.select()
      .from(activityEvents)
      .where(eq(activityEvents.applicationId, applicationId))
      .orderBy(desc(activityEvents.createdAt));
  }
}

export const storage = new DatabaseStorage();
