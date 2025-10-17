// File path: src/providers/authorize/visitorAuthorize.ts
import { ForbiddenException } from "@nestjs/common";

import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize"; // ← CORRECT: Same directory import
import { VisitorPayload } from "../../decorators/payload/VisitorPayload";

/**
 * Authenticate and authorize a Visitor role using JWT.
 *
 * - Verifies JWT via shared jwtAuthorize()
 * - Ensures payload.type === "visitor"
 * - Confirms role assignment exists and is active in DB
 * - Validates top-level user record is active (not soft-deleted)
 */
export async function visitorAuthorize(request: {
  headers: { authorization?: string };
}): Promise<VisitorPayload> {
  const payload: VisitorPayload = jwtAuthorize({ request }) as VisitorPayload;

  if (payload.type !== "visitor")
    throw new ForbiddenException("You're not visitor");

  // payload.id is ALWAYS the top-level user table ID (econ_discuss_users.id)
  // Role table extends the user table via foreign key `user_id`
  const visitor = await MyGlobal.prisma.econ_discuss_visitors.findFirst({
    where: {
      user_id: payload.id,
      deleted_at: null, // role assignment must be active
      user: {
        is: { deleted_at: null }, // top-level user must be active
      },
    },
  });

  if (visitor === null)
    throw new ForbiddenException("You're not enrolled");

  return payload;
}
