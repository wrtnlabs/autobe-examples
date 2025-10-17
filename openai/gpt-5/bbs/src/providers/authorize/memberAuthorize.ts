// File path: src/providers/authorize/memberAuthorize.ts
import { ForbiddenException } from "@nestjs/common";

import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize"; // ← Must be same directory
import { MemberPayload } from "../../decorators/payload/MemberPayload";

/**
 * Authenticate and authorize a Member user via JWT.
 *
 * - Verifies JWT using shared jwtAuthorize
 * - Ensures payload.type === "member"
 * - Confirms the member role exists and is active for the top-level user
 * - Also ensures the top-level user record is active
 */
export async function memberAuthorize(request: {
  headers: {
    authorization?: string;
  };
}): Promise<MemberPayload> {
  const payload: MemberPayload = jwtAuthorize({ request }) as MemberPayload;

  if (payload.type !== "member")
    throw new ForbiddenException(`You're not ${payload.type}`);

  // payload.id ALWAYS refers to the top-level user table primary key (econ_discuss_users.id)
  const member = await MyGlobal.prisma.econ_discuss_members.findFirst({
    where: {
      user_id: payload.id, // Role table extends top-level users via foreign key
      deleted_at: null, // role assignment must be active
      user: {
        is: { deleted_at: null }, // top-level user must be active
      },
    },
  });

  if (member === null) {
    throw new ForbiddenException("You're not enrolled");
  }

  return payload;
}
