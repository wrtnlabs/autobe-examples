// File path: src/providers/authorize/verifiedexpertAuthorize.ts
import { ForbiddenException } from "@nestjs/common";

import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize"; // CRITICAL: same directory import
import { VerifiedexpertPayload } from "../../decorators/payload/VerifiedexpertPayload";

/**
 * Authenticate and authorize a Verified Expert user.
 *
 * - Verifies JWT using the shared jwtAuthorize function
 * - Ensures the payload.type is "verifiedExpert"
 * - Confirms an active, non-deleted verified expert assignment exists for the user
 * - Validates top-level user record is active and email-verified
 *
 * Notes on ID semantics:
 * - payload.id ALWAYS contains the top-level econ_discuss_users.id
 * - Since the role table extends users via user_id, query with where: { user_id: payload.id }
 */
export async function verifiedexpertAuthorize(request: {
  headers: {
    authorization?: string;
  };
}): Promise<VerifiedexpertPayload> {
  const payload: VerifiedexpertPayload = jwtAuthorize({ request }) as VerifiedexpertPayload;

  if (payload.type !== "verifiedExpert") {
    throw new ForbiddenException(`You're not ${payload.type}`);
  }

  const now = new Date();
  const verified = await MyGlobal.prisma.econ_discuss_verified_experts.findFirst({
    where: {
      user_id: payload.id,
      deleted_at: null,
      OR: [
        { badge_valid_until: null },
        { badge_valid_until: { gt: now } },
      ],
      user: {
        is: {
          deleted_at: null,
          email_verified: true,
        },
      },
    },
  });

  if (verified === null) {
    throw new ForbiddenException("You're not enrolled");
  }

  return payload;
}
