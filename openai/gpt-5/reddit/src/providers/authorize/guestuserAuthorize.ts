// File path: src/providers/authorize/guestuserAuthorize.ts
import { ForbiddenException } from "@nestjs/common";

import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize"; // ← CORRECT: Same directory import
import { GuestuserPayload } from "../../decorators/payload/GuestuserPayload";

/**
 * Authenticate request as a guestuser using JWT and database verification.
 * - Verifies JWT via shared jwtAuthorize()
 * - Ensures payload.type === "guestuser"
 * - Confirms the user has an active guest assignment
 */
export async function guestuserAuthorize(request: {
  headers: { authorization?: string };
}): Promise<GuestuserPayload> {
  // Verify JWT and parse payload
  const payload: GuestuserPayload = jwtAuthorize({ request }) as GuestuserPayload;

  // Role discriminator check
  if (payload.type !== "guestuser")
    throw new ForbiddenException("You're not guestuser");

  // payload.id ALWAYS contains the top-level user table ID
  // guest role extends the top-level user, so query by foreign key
  const guest = await MyGlobal.prisma.community_platform_guest_users.findFirst({
    where: {
      community_platform_user_id: payload.id,
      revoked_at: null,
      deleted_at: null,
      user: { is: { deleted_at: null } },
    },
  });

  if (guest === null) throw new ForbiddenException("You're not enrolled");

  // Return the authenticated payload
  return payload;
}
