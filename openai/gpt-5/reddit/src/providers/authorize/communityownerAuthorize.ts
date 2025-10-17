import { ForbiddenException } from "@nestjs/common";

import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize"; // MUST be same directory import
import { CommunityownerPayload } from "../../decorators/payload/CommunityownerPayload";

/**
 * Authenticate Community Owner role.
 *
 * - Verifies JWT via jwtAuthorize.
 * - Ensures payload.type === "communityowner".
 * - Confirms active ownership assignment tied to top-level user (payload.id).
 * - Filters out soft-deleted or revoked records.
 */
export async function communityownerAuthorize(request: {
  headers: { authorization?: string };
}): Promise<CommunityownerPayload> {
  const payload: CommunityownerPayload = jwtAuthorize({ request }) as CommunityownerPayload;

  if (payload.type !== "communityowner")
    throw new ForbiddenException(`You're not ${payload.type}`);

  // payload.id refers to community_platform_users.id (top-level user)
  const owner = await MyGlobal.prisma.community_platform_community_owners.findFirst({
    where: {
      community_platform_user_id: payload.id,
      revoked_at: null,
      deleted_at: null,
      user: { is: { deleted_at: null } },
    },
  });

  if (owner === null)
    throw new ForbiddenException("You're not enrolled");

  return payload;
}
