// File path: src/providers/authorize/adminuserAuthorize.ts
import { ForbiddenException, UnauthorizedException } from "@nestjs/common";

import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize"; // MUST be same directory import
import { AdminuserPayload } from "../../decorators/payload/AdminuserPayload";

/**
 * Authenticate and authorize an Adminuser via JWT and DB verification.
 *
 * - Verifies JWT using shared jwtAuthorize()
 * - Ensures payload.type === "adminuser"
 * - Confirms an active admin assignment exists in community_platform_admin_users
 *   referencing the top-level user (community_platform_users) via
 *   community_platform_user_id and validation columns.
 */
export async function adminuserAuthorize(request: {
  headers: { authorization?: string };
}): Promise<AdminuserPayload> {
  const payload = jwtAuthorize({ request }) as AdminuserPayload;

  if (!payload || typeof payload.id !== "string")
    throw new UnauthorizedException("Invalid token payload");

  if (payload.type !== "adminuser")
    throw new ForbiddenException(`You're not ${payload.type}`);

  // payload.id contains top-level user table ID
  const admin = await MyGlobal.prisma.community_platform_admin_users.findFirst({
    where: {
      community_platform_user_id: payload.id, // role table extends users via FK
      revoked_at: null,
      deleted_at: null,
      user: { is: { deleted_at: null } }, // ensure top-level user is active
    },
  });

  if (admin === null)
    throw new ForbiddenException("You're not enrolled");

  return payload;
}
