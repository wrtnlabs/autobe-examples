import { ForbiddenException } from "@nestjs/common";

import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { AdminPayload } from "../../decorators/payload/AdminPayload";

/**
 * Provider function to authenticate and authorize a platform administrator.
 * Verifies JWT token, role type, and active status of the admin account.
 * Throws ForbiddenException on any mismatch, ensuring only active admins proceed.
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

  // Verify existence and enablement of admin with matching UUID
  const admin = await MyGlobal.prisma.todo_list_admins.findFirst({
    where: {
      id: payload.id,
      disabled_at: null
    },
  });

  if (admin === null) {
    throw new ForbiddenException("You're not enrolled or admin account is disabled.");
  }

  return payload;
}
