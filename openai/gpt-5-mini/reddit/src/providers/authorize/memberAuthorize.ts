// File path: src/providers/authorize/memberAuthorize.ts
import { ForbiddenException } from "@nestjs/common";

import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { MemberPayload } from "../../decorators/payload/MemberPayload";

/**
 * Verify JWT and ensure the authenticated actor is an active member.
 */
export async function memberAuthorize(request: {
  headers: {
    authorization?: string;
  };
}): Promise<MemberPayload> {
  const payload = jwtAuthorize({ request }) as MemberPayload;

  if (payload.type !== "member") {
    throw new ForbiddenException(`You're not ${payload.type}`);
  }

  // payload.id contains top-level user table ID
  // The members table references the top-level user via user_id
  const member = await MyGlobal.prisma.community_portal_members.findFirst({
    where: {
      user_id: payload.id,
      is_suspended: false,
      user: {
        deleted_at: null,
      },
    },
  });

  if (member === null) {
    throw new ForbiddenException("You're not enrolled or your account is suspended/removed");
  }

  return payload;
}
