import { ForbiddenException } from "@nestjs/common";

import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { MemberPayload } from "../../decorators/payload/MemberPayload";

/**
 * Authorizes a request as a discussion board member.
 * Verifies JWT, ensures correct role, and checks active member record.
 * Throws ForbiddenException if unauthorized or soft-deleted.
 *
 * @param request HTTP request containing bearer authorization header
 * @returns MemberPayload containing top-level member id and role type
 */
export async function memberAuthorize(request: {
  headers: { authorization?: string };
}): Promise<MemberPayload> {
  const payload: MemberPayload = jwtAuthorize({ request }) as MemberPayload;

  if (payload.type !== "member") {
    throw new ForbiddenException(`You're not ${payload.type}`);
  }

  // The member's top-level table is 'discussion_board_members', so use payload.id as id
  const member = await MyGlobal.prisma.discussion_board_members.findFirst({
    where: {
      id: payload.id,
      deleted_at: null, // Must not be soft-deleted
    },
  });

  if (member === null) {
    throw new ForbiddenException("You're not enrolled");
  }

  return payload;
}
