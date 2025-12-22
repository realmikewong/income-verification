import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api, buildUrl } from "@shared/routes";
import { z } from "zod";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import session from "express-session";
import { randomBytes, scrypt, timingSafeEqual } from "crypto";
import { promisify } from "util";
import multer from "multer";
import path from "path";
import fs from "fs";
import express from "express";
import { applicationStatuses, systemResults } from "@shared/schema";

const scryptAsync = promisify(scrypt);

// --- AUTH HELPER FUNCTIONS ---
async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePassword(stored: string, supplied: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

// --- FILE UPLOAD SETUP ---
const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storageConfig = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});
const upload = multer({ storage: storageConfig });

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // --- SESSION & PASSPORT ---
  app.use(
    session({
      store: storage.sessionStore,
      secret: process.env.SESSION_SECRET || "secret",
      resave: false,
      saveUninitialized: false,
    })
  );
  
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(
      { usernameField: "email" },
      async (email, password, done) => {
        try {
          const user = await storage.getUserByEmail(email);
          if (!user) return done(null, false, { message: "Incorrect email." });
          
          const isValid = await comparePassword(user.passwordHash, password);
          if (!isValid) return done(null, false, { message: "Incorrect password." });
          
          return done(null, user);
        } catch (err) {
          return done(err);
        }
      }
    )
  );

  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });

  // --- SEEDING ---
  await seedDatabase();

  // --- SERVE UPLOADS ---
  app.use('/uploads', express.static(uploadDir));

  // --- API ROUTES ---

  // Auth
  app.post(api.auth.login.path, passport.authenticate("local"), (req, res) => {
    res.json(req.user);
  });

  app.post(api.auth.logout.path, (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get(api.auth.me.path, (req, res) => {
    if (req.isAuthenticated()) {
      res.json(req.user);
    } else {
      res.json(null);
    }
  });

  // Programs
  app.get(api.programs.list.path, async (req, res) => {
    const programs = await storage.getPrograms();
    res.json(programs);
  });

  app.post(api.programs.create.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const program = await storage.createProgram(req.body);
    res.status(201).json(program);
  });
  
  app.get(api.programs.get.path, async (req, res) => {
    const program = await storage.getProgram(Number(req.params.id));
    if (!program) return res.sendStatus(404);
    res.json(program);
  });

  // Limits
  app.get(api.incomeLimits.list.path, async (req, res) => {
    const limits = await storage.getIncomeLimits(Number(req.params.id));
    res.json(limits);
  });
  
  app.post(api.incomeLimits.create.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const limit = await storage.createIncomeLimit({
      ...req.body,
      programId: Number(req.params.id)
    });
    res.status(201).json(limit);
  });

  // Applications (Public)
  app.post(api.applications.start.path, async (req, res) => {
    const token = randomBytes(16).toString("hex");
    const input = api.applications.start.input.parse(req.body);
    
    // Create Draft
    const app = await storage.createApplication({
      programId: input.programId,
      applicantName: input.applicantName,
      applicantEmail: input.applicantEmail,
      applicantToken: token,
      status: "Draft",
      systemResult: "NeedsReview", // Default until submitted
    });

    // Log magic link for "email sending" MVP
    console.log(`[EMAIL MOCK] Magic Link for ${input.applicantEmail}: /apply/${token}`);

    res.status(201).json({ token, id: app.id });
  });

  app.get(api.applications.getByToken.path, async (req, res) => {
    const app = await storage.getApplicationByToken(req.params.token);
    if (!app) return res.sendStatus(404);
    
    const documents = await storage.getDocuments(app.id);
    const activityEvents = await storage.getActivityEvents(app.id);
    
    res.json({ ...app, documents, activityEvents });
  });

  app.patch(api.applications.updateByToken.path, async (req, res) => {
    const app = await storage.getApplicationByToken(req.params.token);
    if (!app) return res.sendStatus(404);
    
    // Only allow updates if not final? For MVP allow updates if Draft or NeedsInfo
    if (app.status !== "Draft" && app.status !== "NeedsInfo") {
      return res.status(403).json({ message: "Cannot edit submitted application" });
    }

    const updated = await storage.updateApplication(app.id, req.body);
    res.json(updated);
  });

  app.post('/api/applications/by-token/:token/upload', upload.single('file'), async (req, res) => {
    const app = await storage.getApplicationByToken(req.params.token);
    if (!app || !req.file) return res.sendStatus(400);

    const doc = await storage.createDocument({
      applicationId: app.id,
      filename: req.file.originalname,
      path: req.file.path,
      mimeType: req.file.mimetype,
      sizeBytes: req.file.size
    });

    res.json(doc);
  });

  app.post(api.applications.submitByToken.path, async (req, res) => {
    const app = await storage.getApplicationByToken(req.params.token);
    if (!app) return res.sendStatus(404);

    // Calculate Eligibility
    let result: typeof systemResults[number] = "NeedsReview";
    let computedLimitCents = null;
    let ruleVersion = null;

    if (app.householdSize && app.annualIncomeCents !== null) {
      const limit = await storage.getIncomeLimitForHousehold(app.programId, app.householdSize);
      if (limit) {
        computedLimitCents = limit.limitCents;
        ruleVersion = limit.versionLabel;
        
        if (app.annualIncomeCents <= limit.limitCents) {
           // For MVP, if income is under limit, assume eligible (reviewer checks docs)
           result = "Eligible";
        } else {
           result = "NotEligible";
        }
      }
    }

    const updated = await storage.updateApplication(app.id, {
      status: "Submitted",
      submittedAt: new Date(),
      systemResult: result,
      computedLimitCents,
      ruleVersion
    });

    await storage.createActivityEvent({
      applicationId: app.id,
      type: "System",
      message: `Application submitted. System calculation: ${result}`,
      createdByUserId: null
    });

    res.json(updated);
  });

  // Applications (Reviewer)
  app.get(api.applications.list.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const filters = {
      status: req.query.status as string,
      programId: req.query.programId ? Number(req.query.programId) : undefined,
      search: req.query.search as string
    };
    
    const apps = await storage.getApplications(filters);
    
    // Enrich with program data
    const enriched = await Promise.all(apps.map(async (a) => {
      const program = await storage.getProgram(a.programId);
      return { ...a, program: program! };
    }));
    
    res.json(enriched);
  });

  app.get(api.applications.get.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const app = await storage.getApplication(Number(req.params.id));
    if (!app) return res.sendStatus(404);
    
    const documents = await storage.getDocuments(app.id);
    const activityEvents = await storage.getActivityEvents(app.id);
    const program = await storage.getProgram(app.programId);
    
    // Get full user info for events
    const eventsWithUsers = await Promise.all(activityEvents.map(async (ev) => {
      let user = null;
      if (ev.createdByUserId) {
        user = await storage.getUser(ev.createdByUserId);
      }
      return { ...ev, user };
    }));

    // Get the limit snapshot used
    let incomeLimitSnapshot = null;
    if (app.householdSize) {
        incomeLimitSnapshot = await storage.getIncomeLimitForHousehold(app.programId, app.householdSize);
    }

    res.json({ 
      ...app, 
      documents, 
      activityEvents: eventsWithUsers, 
      program: program!,
      incomeLimitSnapshot 
    });
  });

  app.post(api.applications.decision.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user as any;
    const { status, note } = req.body;
    
    const app = await storage.getApplication(Number(req.params.id));
    if (!app) return res.sendStatus(404);
    
    await storage.updateApplication(app.id, {
      status: status,
      reviewedBy: user.id
    });
    
    await storage.createActivityEvent({
      applicationId: app.id,
      type: status === "NeedsInfo" ? "RequestInfo" : "StatusChange",
      message: `Status changed to ${status}. Note: ${note}`,
      createdByUserId: user.id
    });
    
    if (status === "NeedsInfo") {
        console.log(`[EMAIL MOCK] Request Info sent to ${app.applicantEmail}. Link: /apply/${app.applicantToken}`);
    }
    
    const updated = await storage.getApplication(app.id);
    res.json(updated);
  });

  // Exports
  app.get(api.exports.applications.path, async (req, res) => {
     if (!req.isAuthenticated()) return res.sendStatus(401);
     
     // Simple CSV generation
     const apps = await storage.getApplications();
     const csvRows = [
       ['ID', 'Applicant', 'Email', 'Program ID', 'Status', 'System Result', 'Income', 'Household Size', 'Submitted At'].join(',')
     ];
     
     apps.forEach(a => {
       csvRows.push([
         a.id,
         `"${a.applicantName}"`,
         a.applicantEmail,
         a.programId,
         a.status,
         a.systemResult || '',
         a.annualIncomeCents ? (a.annualIncomeCents / 100).toFixed(2) : '',
         a.householdSize || '',
         a.submittedAt ? new Date(a.submittedAt).toISOString() : ''
       ].join(','));
     });
     
     res.setHeader('Content-Type', 'text/csv');
     res.setHeader('Content-Disposition', 'attachment; filename="applications.csv"');
     res.send(csvRows.join('\n'));
  });

  return httpServer;
}

// --- SEED FUNCTION ---
async function seedDatabase() {
  const existingUsers = await storage.getUserByEmail("admin@example.com");
  if (!existingUsers) {
    const passwordHash = await hashPassword("admin123");
    await storage.createUser({
      email: "admin@example.com",
      passwordHash,
      role: "Admin"
    });
    console.log("Seeded Admin User");
  }

  const existingPrograms = await storage.getPrograms();
  if (existingPrograms.length === 0) {
    const program = await storage.createProgram({
      name: "Example Rebate Program",
      regionLabel: "Statewide",
      effectiveStart: new Date(),
    });
    
    // Seed Limits
    // Household Size 1-6
    const baseLimit = 3000000; // $30,000
    for (let i = 1; i <= 6; i++) {
        await storage.createIncomeLimit({
            programId: program.id,
            householdSize: i,
            limitCents: baseLimit + (i * 500000), // + $5,000 per person
            versionLabel: "2024-V1"
        });
    }
    console.log("Seeded Program & Limits");
  }
}
