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
    throw new HttpException("Session not found", 404);
  }

  if (session.expired_at !== null) {
    throw new HttpException("Session is already expired", 400);
  }

  const nowString = toISOStringSafe(new Date());
  const updated = await MyGlobal.prisma.discussion_board_member_sessions.update(
    {
      where: {
        id: props.sessionId,
      },
      data: {
        expired_at: nowString,
      },
      include: {
        member: true,
      },
    },
  );

  return {
    id: updated.id,
    discussion_board_member_id: updated.discussion_board_member_id,
    member: {
      id: updated.member.id,
      username: updated.member.username,
      display_name:
        updated.member.display_name === null
          ? undefined
          : updated.member.display_name,
    },
    created_at: toISOStringSafe(updated.created_at),
    expired_at: updated.expired_at
      ? toISOStringSafe(updated.expired_at)
      : undefined,
    ip: updated.ip,
    href: updated.href,
    referrer: updated.referrer,
  };
}
