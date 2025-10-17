// File path: src/providers/authorize/moderatorAuthorize.ts
import { ForbiddenException } from "@nestjs/common";

import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize"; // ← CORRECT: Same directory import
import { ModeratorPayload } from "../../decorators/payload/ModeratorPayload";

/**
 * Authenticate and authorize a moderator via JWT and DB verification.
 *
 * Steps:
 * - Verify JWT using shared jwtAuthorize
 * - Ensure payload.type is "moderator"
 * - Confirm active moderator assignment exists for the top-level user
 * - Validate base user record is active and email-verified
 */
export async function moderatorAuthorize(request: {
  headers: { authorization?: string };
}): Promise<ModeratorPayload> {
  const payload: ModeratorPayload = jwtAuthorize({ request }) as ModeratorPayload;

  if (payload.type !== "moderator")
    throw new ForbiddenException("You're not moderator");

  // payload.id ALWAYS holds top-level econ_discuss_users.id
  const moderator = await MyGlobal.prisma.econ_discuss_moderators.findFirst({
    where: {
      user_id: payload.id, // role table extends user via FK
      deleted_at: null, // role assignment must be active
      user: {
        is: {
          deleted_at: null, // base user must be active
          email_verified: true,
        },
      },
    },
  });

  if (moderator === null)
    throw new ForbiddenException("You're not enrolled");

  return payload;
}
