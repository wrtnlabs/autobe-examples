// File path: src/providers/authorize/memberuserAuthorize.ts
import { ForbiddenException } from "@nestjs/common";

import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize"; // ← MUST be same directory
import { MemberuserPayload } from "../../decorators/payload/MemberuserPayload";

/**
 * Authenticate request as a member user.
 * - Verifies JWT using shared jwtAuthorize
 * - Ensures payload.type === "memberuser"
 * - Confirms membership exists and is active (not soft-deleted)
 * - Returns the JWT payload when valid
 */
export async function memberuserAuthorize(request: {
  headers: { authorization?: string };
}): Promise<MemberuserPayload> {
  const payload: MemberuserPayload = jwtAuthorize({ request }) as MemberuserPayload;

  if (payload.type !== "memberuser")
    throw new ForbiddenException(`You're not ${payload.type}`);

  // payload.id contains top-level community_platform_users.id
  const member = await MyGlobal.prisma.community_platform_member_users.findFirst({
    where: {
      community_platform_user_id: payload.id, // role table FK to user
      deleted_at: null, // ensure membership record is active
      user: { deleted_at: null }, // ensure top-level user is active
    },
  });

  if (member === null) throw new ForbiddenException("You're not enrolled");

  return payload;
}
