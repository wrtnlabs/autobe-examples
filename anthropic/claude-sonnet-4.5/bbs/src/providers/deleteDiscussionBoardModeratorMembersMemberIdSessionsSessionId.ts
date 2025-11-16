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
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function deleteDiscussionBoardModeratorMembersMemberIdSessionsSessionId(props: {
  moderator: ModeratorPayload;
  memberId: string & tags.Format<"uuid">;
  sessionId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardMemberSession> {
  const session =
    await MyGlobal.prisma.discussion_board_member_sessions.findFirst({
      where: {
        id: props.sessionId,
        discussion_board_member_id: props.memberId,
      },
    });

  if (!session) {
    throw new HttpException("Session not found", 404);
  }

  const member = await MyGlobal.prisma.discussion_board_members.findUnique({
    where: {
      id: session.discussion_board_member_id,
    },
  });

  if (!member) {
    throw new HttpException("Member not found", 404);
  }

  await MyGlobal.prisma.discussion_board_member_sessions.delete({
    where: {
      id: props.sessionId,
    },
  });

  return {
    id: session.id,
    discussion_board_member_id: session.discussion_board_member_id,
    member: {
      id: member.id,
      username: member.username,
      email: member.email,
      status: member.status,
      email_verified: member.email_verified,
      created_at: toISOStringSafe(member.created_at),
    },
    ip: session.ip,
    href: session.href,
    referrer: session.referrer,
    created_at: toISOStringSafe(session.created_at),
    expired_at: session.expired_at ? toISOStringSafe(session.expired_at) : null,
  };
}
