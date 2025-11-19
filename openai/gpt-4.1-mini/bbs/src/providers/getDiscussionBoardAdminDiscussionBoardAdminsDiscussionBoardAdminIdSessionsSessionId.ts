import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminSession";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getDiscussionBoardAdminDiscussionBoardAdminsDiscussionBoardAdminIdSessionsSessionId(props: {
  admin: AdminPayload;
  discussionBoardAdminId: string & tags.Format<"uuid">;
  sessionId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardAdminSession> {
  const session =
    await MyGlobal.prisma.discussion_board_admin_sessions.findUnique({
      where: { id: props.sessionId },
    });

  if (
    !session ||
    session.discussion_board_admin_id !== props.discussionBoardAdminId
  ) {
    throw new HttpException("Session not found", 404);
  }

  return {
    id: session.id,
    discussion_board_admin_id: session.discussion_board_admin_id,
    ip: session.ip,
    href: session.href,
    referrer: session.referrer,
    created_at: toISOStringSafe(session.created_at),
    expired_at: session.expired_at ? toISOStringSafe(session.expired_at) : null,
  };
}
