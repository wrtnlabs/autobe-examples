import { ForbiddenException } from "@nestjs/common";

import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { MemberPayload } from "../../decorators/payload/MemberPayload";

/**
 * Authenticates and authorizes a Member.
 *
 * @param request - HTTP request containing authorization header
 * @returns {Promise<MemberPayload>} - The authorized member payload
 * @throws {ForbiddenException} - If role does not match or member is not valid
 */
export async function memberAuthorize(request: {
  headers: {
    authorization?: string;
  };
}): Promise<MemberPayload> {
  const payload: MemberPayload = jwtAuthorize({ request }) as MemberPayload;

  if (payload.type !== "member") {
    throw new ForbiddenException(`You're not ${payload.type}`);
  }

  // payload.id is always the top-level member id
  // Check for deleted (deleted_at=null) and status (active only)
  const member = await MyGlobal.prisma.community_platform_members.findFirst({
    where: {
      id: payload.id,
      deleted_at: null,
      status: "active",
    },
  });

  if (member === null) {
    throw new ForbiddenException("You're not enrolled");
  }

  return payload;
}