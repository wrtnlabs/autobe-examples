import { ForbiddenException } from "@nestjs/common";
import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { MemberPayload } from "../../decorators/payload/MemberPayload";

export async function memberAuthorize(request: { headers: { authorization?: string } }): Promise<MemberPayload> {
  const payload = jwtAuthorize({ request }) as MemberPayload;

  if (payload.type !== "member") {
    throw new ForbiddenException(`You're not ${payload.type}`);
  }

  const session = await MyGlobal.prisma.discussion_board_member_sessions.findFirst({
    where: {
      id: payload.session_id,
      discussionBoardMember: {
        id: payload.id,
        deleted_at: null
      },
      expired_at: null
    }
  });

  if (session === null) {
    throw new ForbiddenException("Session is invalid or expired");
  }

  return payload;
}
