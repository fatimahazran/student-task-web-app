// Shared helpers for the Supabase Edge Functions.
// These functions replace Firebase Cloud Functions: they verify the caller's
// Firebase ID token, then read/write Firestore with a service account
// (which, like the Admin SDK, bypasses Firestore Security Rules).
import {
  createRemoteJWKSet,
  importPKCS8,
  jwtVerify,
  SignJWT,
} from "npm:jose@5.9.6";

// ---------- Errors / responses ----------

export class HttpError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
  }
}

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Wraps a handler with CORS, POST-only, auth, JSON parsing and error handling.
export function serveTask(
  handler: (uid: string, data: Record<string, unknown>) => Promise<unknown>,
) {
  Deno.serve(async (req) => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
    try {
      if (req.method !== "POST") {
        throw new HttpError(405, "method-not-allowed", "Use POST.");
      }
      const uid = await verifyFirebaseUser(req);
      const data = await req.json().catch(() => ({}));
      return json(200, await handler(uid, data ?? {}));
    } catch (err) {
      if (err instanceof HttpError) {
        return json(err.status, { error: err.code, message: err.message });
      }
      console.error(err);
      return json(500, { error: "internal", message: "Something went wrong." });
    }
  });
}

// ---------- Service account ----------

type ServiceAccount = { project_id: string; client_email: string; private_key: string };

let cachedAccount: ServiceAccount | null = null;

// Loaded on first use so a bad secret shows up as a logged 500, not a crashed worker.
function getServiceAccount(): ServiceAccount {
  if (!cachedAccount) {
    const parsed = JSON.parse(Deno.env.get("FIREBASE_SERVICE_ACCOUNT") ?? "null");
    if (!parsed?.project_id || !parsed?.client_email || !parsed?.private_key) {
      throw new Error("FIREBASE_SERVICE_ACCOUNT secret is missing or invalid.");
    }
    cachedAccount = parsed;
  }
  return cachedAccount!;
}

// ---------- Verify the Firebase ID token (request.auth equivalent) ----------

const firebaseKeys = createRemoteJWKSet(
  new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"),
);

async function verifyFirebaseUser(req: Request): Promise<string> {
  const header = req.headers.get("Authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) throw new HttpError(401, "unauthenticated", "Please login first.");
  const projectId = getServiceAccount().project_id;
  try {
    const { payload } = await jwtVerify(token, firebaseKeys, {
      issuer: `https://securetoken.google.com/${projectId}`,
      audience: projectId,
    });
    if (typeof payload.sub !== "string" || !payload.sub) throw new Error("no sub");
    return payload.sub; // the verified Firebase UID
  } catch {
    throw new HttpError(401, "unauthenticated", "Please login first.");
  }
}

// ---------- Google access token for Firestore REST ----------

let cachedToken: { value: string; expires: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expires > Date.now() + 60_000) return cachedToken.value;

  const serviceAccount = getServiceAccount();
  const key = await importPKCS8(serviceAccount.private_key, "RS256");
  const assertion = await new SignJWT({ scope: "https://www.googleapis.com/auth/datastore" })
    .setProtectedHeader({ alg: "RS256" })
    .setIssuer(serviceAccount.client_email)
    .setAudience("https://oauth2.googleapis.com/token")
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(key);

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  if (!res.ok) throw new Error(`Token exchange failed: ${await res.text()}`);
  const body = await res.json();
  cachedToken = { value: body.access_token, expires: Date.now() + body.expires_in * 1000 };
  return cachedToken.value;
}

// ---------- Firestore REST helpers ----------

const API = "https://firestore.googleapis.com/v1";
const dbPath = () => `projects/${getServiceAccount().project_id}/databases/(default)/documents`;

async function firestore(path: string, init: RequestInit = {}) {
  const res = await fetch(`${API}/${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${await getAccessToken()}`,
      "Content-Type": "application/json",
    },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Firestore error ${res.status}: ${await res.text()}`);
  return res.json();
}

export function taskPath(taskId: string) {
  return `${dbPath()}/tasks/${taskId}`;
}

// Firestore auto-ID style: 20 random alphanumeric characters.
export function newTaskId() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = crypto.getRandomValues(new Uint8Array(20));
  return Array.from(bytes, (b) => chars[b % chars.length]).join("");
}

export function commit(writes: unknown[]) {
  return firestore(`${dbPath()}:commit`, { method: "POST", body: JSON.stringify({ writes }) });
}

// Validate taskId and confirm the task belongs to uid.
export async function getOwnedTask(uid: string, taskId: unknown) {
  // Firestore IDs can't contain "/"; rejecting it also blocks path tricks.
  if (typeof taskId !== "string" || !taskId.trim() || taskId.includes("/") || taskId.length > 1500) {
    throw new HttpError(400, "invalid-argument", "Invalid task ID.");
  }
  const doc = await firestore(taskPath(taskId));
  // Same error for "missing" and "not yours" so other users' IDs aren't revealed.
  if (!doc || doc.fields?.uid?.stringValue !== uid) {
    throw new HttpError(404, "not-found", "Task not found.");
  }
  return {
    name: doc.name as string,
    updateTime: doc.updateTime as string,
    completed: doc.fields?.completed?.booleanValue === true,
  };
}
