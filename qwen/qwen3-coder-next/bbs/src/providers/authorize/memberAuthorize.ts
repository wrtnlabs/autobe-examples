import { ForbiddenException, UnauthorizedException } from "@nestjs/common";
import { MyGlobal } from "../../MyGlobal";
import { MemberPayload } from "../../decorators/payload/MemberPayload";
import { jwtAuthorize } from "./jwtAuthorize";

export async function memberAuthorize(request: {
  headers: { authorization?: string };
}): Promise<MemberPayload> {
  const payload: MemberPayload = jwtAuthorize({ request }) as MemberPayload;

  if (payload.type !== "member") {
    throw new ForbiddenException("Access denied: not a member");
  }

  // Check if MyGlobal.prisma is available
  if (!MyGlobal?.prisma) {
    throw new UnauthorizedException("Database not initialized");
  }

  const member = await MyGlobal.prisma.discussion_board_members.findFirst({
    where: {
      id: payload.id,
      deleted_at: null,
    },
  });

  if (!member) {
    throw new ForbiddenException("Member not found or account deleted");
  }

  return payload;
}
