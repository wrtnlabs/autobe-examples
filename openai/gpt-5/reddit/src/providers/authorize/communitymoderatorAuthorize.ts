// File path: src/providers/authorize/communitymoderatorAuthorize.ts
import { ForbiddenException } from "@nestjs/common";

import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize"; // ← CRITICAL: Same directory import
import { CommunitymoderatorPayload } from "../../decorators/payload/CommunitymoderatorPayload";

/**
 * Authenticate request as a Community Moderator.
 *
 * - Verifies JWT using shared jwtAuthorize()
 * - Ensures payload.type === "communityModerator"
 * - Confirms active moderator assignment exists for the top-level user id
 * - Applies validation filters on authorization model (revoked_at/deleted_at)
 */
export async function communitymoderatorAuthorize(request: {
  headers: { authorization?: string };
}): Promise<CommunitymoderatorPayload> {
  const payload: CommunitymoderatorPayload =
    jwtAuthorize({ request }) as CommunitymoderatorPayload;

  if (payload.type !== "communityModerator")
    throw new ForbiddenException("You're not communityModerator");

  // payload.id is ALWAYS the top-level user table ID
  const moderator = await MyGlobal.prisma.community_platform_community_moderators.findFirst({
    where: {
      community_platform_user_id: payload.id, // FK to top-level user
      revoked_at: null,                       // still active
      deleted_at: null,                       // not soft-deleted
      user: { is: { deleted_at: null } },     // linked user not soft-deleted
    },
  });

  if (moderator === null)
    throw new ForbiddenException("You're not enrolled");

  return payload;
}
