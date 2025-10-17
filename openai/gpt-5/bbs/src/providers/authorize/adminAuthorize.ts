// File path: src/providers/authorize/adminAuthorize.ts
import { ForbiddenException } from "@nestjs/common";

import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize"; // CORRECT: same directory
import { AdminPayload } from "../../decorators/payload/AdminPayload";

/**
 * Authenticate request as Admin.
 *
 * - Verifies JWT using shared jwtAuthorize
 * - Ensures payload.type is "admin"
 * - Confirms active admin assignment in DB
 * - Applies soft-deletion guards on role and user rows
 * - Enforces 2FA when admin assignment requires it
 */
export async function adminAuthorize(request: {
  headers: { authorization?: string };
}): Promise<AdminPayload> {
  const payload: AdminPayload = jwtAuthorize({ request }) as AdminPayload;

  if (payload.type !== "admin")
    throw new ForbiddenException(`You're not ${payload.type}`);

  // payload.id ALWAYS is top-level user id (econ_discuss_users.id)
  const admin = await MyGlobal.prisma.econ_discuss_admins.findFirst({
    where: {
      user_id: payload.id,
      deleted_at: null,
      // Guard linked user row
      user: {
        is: {
          deleted_at: null,
        },
      },
      // If 2FA is enforced for this admin assignment, the user must have MFA enabled
      OR: [
        { enforced_2fa: false },
        {
          AND: [
            { enforced_2fa: true },
            { user: { is: { mfa_enabled: true } } },
          ],
        },
      ],
    },
  });

  if (admin === null)
    throw new ForbiddenException("You're not enrolled");

  return payload;
}
