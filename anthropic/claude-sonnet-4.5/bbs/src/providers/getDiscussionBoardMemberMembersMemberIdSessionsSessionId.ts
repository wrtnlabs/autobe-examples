import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberSession";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function getDiscussionBoardMemberMembersMemberIdSessionsSessionId(props: {
  member: MemberPayload;
  memberId: string & tags.Format<"uuid">;
  sessionId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardMemberSession> {
  if (props.member.id !== props.memberId) {
    throw new HttpException(
      "You can only access your own session details",
      403,
    );
  }

  const session =
    await MyGlobal.prisma.discussion_board_member_sessions.findFirst({
      where: {
        id: props.sessionId,
        discussion_board_member_id: props.memberId,
      },
      include: {
        member: true,
      },
    });

  if (!session) {
    throw new HttpException("Session not found", 404);
  }

  return {
    id: session.id,
    discussion_board_member_id: session.discussion_board_member_id,
    member: {
      id: session.member.id,
      username: session.member.username,
      email: session.member.email,
      status: session.member.status,
      email_verified: session.member.email_verified,
      created_at: toISOStringSafe(session.member.created_at),
    },
    ip: session.ip,
    href: session.href,
    referrer: session.referrer,
    created_at: toISOStringSafe(session.created_at),
    expired_at: session.expired_at ? toISOStringSafe(session.expired_at) : null,
  };
}
