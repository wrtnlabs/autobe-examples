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
  if (props.member.id !== props.memberId) {
    throw new HttpException("You can only delete your own sessions", 403);
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

  const now = new Date();
  const updatedSession =
    await MyGlobal.prisma.discussion_board_member_sessions.update({
      where: { id: props.sessionId },
      data: { expired_at: now },
      include: { member: true },
    });

  return {
    id: updatedSession.id as string & tags.Format<"uuid">,
    discussion_board_member_id:
      updatedSession.discussion_board_member_id as string & tags.Format<"uuid">,
    member: {
      id: updatedSession.member.id as string & tags.Format<"uuid">,
      username: updatedSession.member.username,
      display_name: updatedSession.member.display_name ?? undefined,
    },
    created_at: toISOStringSafe(updatedSession.created_at) as string &
      tags.Format<"date-time">,
    expired_at: updatedSession.expired_at
      ? (toISOStringSafe(updatedSession.expired_at) as string &
          tags.Format<"date-time">)
      : undefined,
    ip: updatedSession.ip,
    href: updatedSession.href as string & tags.Format<"uri">,
    referrer: updatedSession.referrer as string & tags.Format<"uri">,
  };
}
