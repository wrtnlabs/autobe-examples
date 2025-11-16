import { ForbiddenException } from "@nestjs/common";

import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { AdminPayload } from "../../decorators/payload/AdminPayload";

/**
 * Authenticate and authorize Shopping Mall Admin user from JWT token.
 *
 * Verifies JWT, role, and database record for admin status and active/valid account state.
 * Throws ForbiddenException on any failure. Returns AdminPayload for authorized admin.
 */
export async function adminAuthorize(request: {
  headers: { authorization?: string };
}): Promise<AdminPayload> {
  // Decode JWT and validate role
  const payload: AdminPayload = jwtAuthorize({ request }) as AdminPayload;

  if (payload.type !== "admin") {
    throw new ForbiddenException(`You're not ${payload.type}`);
  }
  // payload.id is shopping_mall_admins.id (top-level admin PK)
  // Validate admin exists and is active (status, is_email_verified, etc.)
  const admin = await MyGlobal.prisma.shopping_mall_admins.findFirst({
    where: {
      id: payload.id,
      is_email_verified: true,
      status: "active",
    },
  });

  if (admin === null) {
    throw new ForbiddenException("You're not enrolled or not active");
  }

  return payload;
}
