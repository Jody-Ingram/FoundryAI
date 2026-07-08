import { fetchMessages, getRoomKey, methodNotAllowed, sendJson, verifyRoom } from "./_lib.js";

export default async function handler(req, res) {
  if (req.method !== "GET") return methodNotAllowed(res, ["GET"]);

  try {
    const url = new URL(req.url, "http://localhost");
    const roomId = url.searchParams.get("room") || "";
    const accessKey = getRoomKey(req);
    const room = await verifyRoom(roomId, accessKey);

    if (!room) return sendJson(res, 403, { error: "This room link is invalid or no longer accessible." });

    const rawAfter = url.searchParams.get("after");
    let after = null;
    if (rawAfter) {
      const parsed = new Date(rawAfter);
      if (!Number.isNaN(parsed.getTime())) after = parsed.toISOString();
    }

    let messages = await fetchMessages(roomId, {
      limit: after ? 100 : 75,
      ascending: Boolean(after),
      after,
    });

    if (!after) messages = messages.reverse();

    return sendJson(res, 200, {
      room: { id: room.id, title: room.title, created_at: room.created_at },
      messages,
    });
  } catch (error) {
    console.error("Fetch messages failed", error);
    return sendJson(res, 500, { error: "Could not load messages." });
  }
}
