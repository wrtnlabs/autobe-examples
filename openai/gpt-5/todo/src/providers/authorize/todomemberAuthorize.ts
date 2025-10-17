// File path: src/providers/authorize/todomemberAuthorize.ts
import { ForbiddenException } from "@nestjs/common";

import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize"; // ← CRITICAL: Same directory import
import { TodomemberPayload } from "../../decorators/payload/TodomemberPayload";

/**
 * Authenticate request as a Todo Member.
 *
 * - Validates Bearer token via shared jwtAuthorize.
 * - Ensures the payload.type discriminator equals "todomember".
 * - Confirms the member exists and is active (deleted_at IS NULL).
 * - Returns the JWT payload as the authenticated principal.
 */
export async function todomemberAuthorize(request: {
  headers: { authorization?: string };
}): Promise<TodomemberPayload> {
  // Verify and parse JWT
  const payload: TodomemberPayload = jwtAuthorize({ request }) as TodomemberPayload;

  // Role check
  if (payload.type !== "todomember")
    throw new ForbiddenException(`You're not ${payload.type}`);

  // Database verification (standalone role table)
  const member = await MyGlobal.prisma.todo_list_todo_members.findFirst({
    where: {
      id: payload.id, // payload.id is the top-level user id for this role
      deleted_at: null, // ensure active (not soft-deleted)
    },
  });

  if (member === null) throw new ForbiddenException("You're not enrolled");

  return payload;
}
