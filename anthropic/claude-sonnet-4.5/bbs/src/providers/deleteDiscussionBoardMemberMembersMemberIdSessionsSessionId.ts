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

export async function deleteDiscussionBoardMemberMembersMemberIdSessionsSessionId(props: {
  member: MemberPayload;
  memberId: string & tags.Format<"uuid">;
  sessionId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardMemberSession> {
  const session =
    await MyGlobal.prisma.discussion_board_member_sessions.findUnique({
      where: {
        id: props.sessionId,
      },
      include: {
        member: true,
      },
    });

  if (!session) {
    throw new HttpException("Session not found", 404);
  }

  if (session.discussion_board_member_id !== props.memberId) {
    throw new HttpException(
      "Session does not belong to the specified member",
      400,
    );
  }

  if (session.discussion_board_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }

  const deleted = await MyGlobal.prisma.discussion_board_member_sessions.delete(
    {
      where: {
        id: props.sessionId,
      },
      include: {
        member: true,
      },
    },
  );

  return {
    id: deleted.id,
    discussion_board_member_id: deleted.discussion_board_member_id,
    member: {
      id: deleted.member.id,
      username: deleted.member.username,
      email: deleted.member.email,
      status: deleted.member.status,
      email_verified: deleted.member.email_verified,
      created_at: toISOStringSafe(deleted.member.created_at),
    },
    ip: deleted.ip,
    href: deleted.href,
    referrer: deleted.referrer,
    created_at: toISOStringSafe(deleted.created_at),
    expired_at:
      deleted.expired_at === null
        ? undefined
        : toISOStringSafe(deleted.expired_at),
  };
}
