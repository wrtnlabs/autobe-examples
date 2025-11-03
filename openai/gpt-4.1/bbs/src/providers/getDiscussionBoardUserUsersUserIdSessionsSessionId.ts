import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSession";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function getDiscussionBoardUserUsersUserIdSessionsSessionId(props: {
  user: UserPayload;
  userId: string & tags.Format<"uuid">;
  sessionId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardUserSession> {
  const { user, userId, sessionId } = props;
  // Only allow the authenticated user to access their own session
  if (user.id !== userId) {
    throw new HttpException(
      "Forbidden: Cannot access another user's session",
      403,
    );
  }
  // Fetch the session for this user and session id
  const session =
    await MyGlobal.prisma.discussion_board_user_sessions.findFirst({
      where: {
        id: sessionId,
        discussion_board_user_id: userId,
      },
    });
  if (!session) {
    throw new HttpException("Session not found", 404);
  }
  return {
    id: session.id,
    discussion_board_user_id: session.discussion_board_user_id,
    ip: session.ip,
    href: session.href,
    referrer: session.referrer,
    created_at: toISOStringSafe(session.created_at),
    expired_at:
      session.expired_at !== null && session.expired_at !== undefined
        ? toISOStringSafe(session.expired_at)
        : undefined,
  };
}
