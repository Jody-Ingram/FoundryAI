import crypto from "node:crypto";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.end(JSON.stringify(payload));
}

export function methodNotAllowed(res, allowed) {
  res.setHeader("Allow", allowed.join(", "));
  return sendJson(res, 405, { error: "Method not allowed." });
}

export function isUuid(value) {
  return typeof value === "string" && UUID_RE.test(value);
}

export function parseBody(req) {
  if (!req.body) return {};
  if (typeof req.body === "object") return req.body;
  try {
    return JSON.parse(req.body);
  } catch {
    return {};
  }
}

export function cleanText(value, maxLength) {
  if (typeof value !== "string") return "";
  return value.replace(/\u0000/g, "").trim().slice(0, maxLength);
}

export function cleanName(value) {
  return cleanText(value, 40).replace(/\s+/g, " ");
}

export function getRoomKey(req) {
  const value = req.headers["x-room-key"];
  return Array.isArray(value) ? value[0] : value || "";
}

export function hashRoomKey(value) {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

function safeHashCompare(expectedHex, actualHex) {
  if (!expectedHex || !actualHex || expectedHex.length !== actualHex.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(expectedHex, "hex"), Buffer.from(actualHex, "hex"));
  } catch {
    return false;
  }
}

function requireSupabaseConfig() {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Server database configuration is missing.");
  }
  return { url, key };
}

export async function supabaseRequest(path, options = {}) {
  const { url, key } = requireSupabaseConfig();
  const response = await fetch(`${url}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  const raw = await response.text();
  let data = null;
  if (raw) {
    try {
      data = JSON.parse(raw);
    } catch {
      data = raw;
    }
  }

  if (!response.ok) {
    const detail = typeof data === "object" && data ? data.message || data.hint || data.details : data;
    throw new Error(`Database request failed (${response.status})${detail ? `: ${detail}` : ""}`);
  }

  return { data, response };
}

export async function verifyRoom(roomId, accessKey) {
  if (!isUuid(roomId) || typeof accessKey !== "string" || accessKey.length < 20 || accessKey.length > 200) {
    return null;
  }

  const params = new URLSearchParams({
    select: "id,title,access_hash,created_at",
    id: `eq.${roomId}`,
    limit: "1",
  });
  const { data } = await supabaseRequest(`rooms?${params.toString()}`);
  const room = Array.isArray(data) ? data[0] : null;
  if (!room) return null;

  const actualHash = hashRoomKey(accessKey);
  if (!safeHashCompare(room.access_hash, actualHash)) return null;

  return room;
}

export async function fetchMessages(roomId, { limit = 30, ascending = true, after = null } = {}) {
  const params = new URLSearchParams({
    select: "id,room_id,sender_id,display_name,sender_type,body,reply_to,created_at",
    room_id: `eq.${roomId}`,
    order: `created_at.${ascending ? "asc" : "desc"}`,
    limit: String(Math.min(Math.max(limit, 1), 100)),
  });
  if (after) params.set("created_at", `gte.${after}`);
  const { data } = await supabaseRequest(`messages?${params.toString()}`);
  return Array.isArray(data) ? data : [];
}

export async function findMessageById(roomId, messageId) {
  const params = new URLSearchParams({
    select: "id,room_id,sender_id,display_name,sender_type,body,reply_to,created_at",
    room_id: `eq.${roomId}`,
    id: `eq.${messageId}`,
    limit: "1",
  });
  const { data } = await supabaseRequest(`messages?${params.toString()}`);
  return Array.isArray(data) ? data[0] || null : null;
}

export async function findBotReply(roomId, replyTo) {
  const params = new URLSearchParams({
    select: "id,room_id,sender_id,display_name,sender_type,body,reply_to,created_at",
    room_id: `eq.${roomId}`,
    reply_to: `eq.${replyTo}`,
    sender_type: "eq.bot",
    limit: "1",
  });
  const { data } = await supabaseRequest(`messages?${params.toString()}`);
  return Array.isArray(data) ? data[0] || null : null;
}

export function publicMessage(message) {
  if (!message) return null;
  return {
    id: message.id,
    room_id: message.room_id,
    sender_id: message.sender_id,
    display_name: message.display_name,
    sender_type: message.sender_type,
    body: message.body,
    reply_to: message.reply_to,
    created_at: message.created_at,
  };
}
