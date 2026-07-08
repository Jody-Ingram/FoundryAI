import crypto from "node:crypto";
import { hashRoomKey, methodNotAllowed, sendJson, supabaseRequest } from "./_lib.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return methodNotAllowed(res, ["POST"]);

  try {
    const roomId = crypto.randomUUID();
    const accessKey = crypto.randomBytes(24).toString("base64url");
    const accessHash = hashRoomKey(accessKey);

    const { data } = await supabaseRequest("rooms", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        id: roomId,
        access_hash: accessHash,
        title: "Shared AI Room",
      }),
    });

    const room = Array.isArray(data) ? data[0] : null;
    return sendJson(res, 201, {
      roomId,
      accessKey,
      title: room?.title || "Shared AI Room",
    });
  } catch (error) {
    console.error("Create room failed", error);
    return sendJson(res, 500, { error: "Could not create the room. Check the server configuration." });
  }
}
