import { ForbiddenException } from "@nestjs/common";
import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { MemberPayload } from "../../decorators/payload/MemberPayload";

export async function memberAuthorize(request: {
  headers: { authorization?: string };
}): Promise<MemberPayload> {
  const payload: MemberPayload = jwtAuthorize({ request }) as MemberPayload;

  if (payload.type !== "member") {
    throw new ForbiddenException(`You're not ${payload.type}`);
  }

  // Query member to verify existence and status
  const member = await MyGlobal.prisma.discussion_board_members.findFirst({
    where: {
      id: payload.id, // Members are standalone, use id directly
      is_banned: false, // Member must not be banned
      deleted_at: null, // Member must not be deleted (soft-delete check)
    },
  });

  if (member === null) {
    throw new ForbiddenException("You're not enrolled or your account is suspended");
  }

  return payload;
}