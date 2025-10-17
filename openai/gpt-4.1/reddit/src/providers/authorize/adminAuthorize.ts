import { ForbiddenException } from "@nestjs/common";

import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { AdminPayload } from "../../decorators/payload/AdminPayload";

/**
 * Provider function for authenticating platform administrators (admins).
 * Verifies JWT, role, and ensures the admin account is valid and active.
 *
 * @param request HTTP request object with headers
 * @returns AdminPayload
 * @throws ForbiddenException if authentication fails or account inactive
 */
export async function adminAuthorize(request: {
  headers: {
    authorization?: string;
  };
}): Promise<AdminPayload> {
  const payload: AdminPayload = jwtAuthorize({ request }) as AdminPayload;

  if (payload.type !== "admin") {
    throw new ForbiddenException(`You're not ${payload.type}`);
  }

  // Admin is top-level: use id directly
  const admin = await MyGlobal.prisma.community_platform_admins.findFirst({
    where: {
      id: payload.id,
      deleted_at: null,
      status: "active"
    },
  });

  if (admin === null) {
    throw new ForbiddenException("You're not enrolled or not active admin");
  }

  return payload;
}
