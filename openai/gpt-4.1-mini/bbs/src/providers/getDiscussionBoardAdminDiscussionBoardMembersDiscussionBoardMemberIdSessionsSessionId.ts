import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardMemberSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberSessions";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getDiscussionBoardAdminDiscussionBoardMembersDiscussionBoardMemberIdSessionsSessionId(props: {
  admin: AdminPayload;
  discussionBoardMemberId: string & tags.Format<"uuid">;
  sessionId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardMemberSessions> {
  const session =
    await MyGlobal.prisma.discussion_board_member_sessions.findUnique({
      where: { id: props.sessionId },
    });

  if (
    !session ||
    session.discussion_board_member_id !== props.discussionBoardMemberId
  ) {
    throw new HttpException("Session not found", 404);
  }

  return {
    id: session.id,
    discussion_board_member_id: session.discussion_board_member_id,
    ip: session.ip,
    href: session.href,
    referrer: session.referrer,
    created_at: toISOStringSafe(session.created_at),
    expired_at:
      session.expired_at === null ? null : toISOStringSafe(session.expired_at),
  };
}
