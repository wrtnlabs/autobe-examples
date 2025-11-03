import { ForbiddenException } from "@nestjs/common";

import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { AdminPayload } from "../../decorators/payload/AdminPayload";

/**
 * Verifies authentication and existence for Admin role.
 *
 * @param request Incoming HTTP request containing Bearer token
 * @returns Authenticated AdminPayload
 * @throws ForbiddenException if not an admin or not enrolled/active
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
  // Validate admin exists and is not soft-deleted or inactive
  const admin = await MyGlobal.prisma.shopping_admins.findFirst({
    where: {
      id: payload.id,
      deleted_at: null,
      status: "active"
    },
  });
  if (admin === null) {
    throw new ForbiddenException("You're not enrolled or not active");
  }
  return payload;
}
