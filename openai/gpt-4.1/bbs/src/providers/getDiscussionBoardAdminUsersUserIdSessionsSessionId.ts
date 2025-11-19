import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSession";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getDiscussionBoardAdminUsersUserIdSessionsSessionId(props: {
  admin: AdminPayload;
  userId: string & tags.Format<"uuid">;
  sessionId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardUserSession> {
  const session =
    await MyGlobal.prisma.discussion_board_user_sessions.findFirst({
      where: {
        id: props.sessionId,
        user_id: props.userId,
      },
    });
  if (!session) {
    throw new HttpException("Session not found for user.", 404);
  }
  const user = await MyGlobal.prisma.discussion_board_users.findUnique({
    where: { id: props.userId },
  });
  if (!user) {
    throw new HttpException("User not found.", 404);
  }
  return {
    id: session.id,
    user: {
      id: user.id,
      email: user.email,
      created_at: toISOStringSafe(user.created_at),
      updated_at: toISOStringSafe(user.updated_at),
      deleted_at:
        typeof user.deleted_at === "undefined" || user.deleted_at === null
          ? undefined
          : toISOStringSafe(user.deleted_at),
    },
    ip: session.ip,
    href: session.href,
    referrer: session.referrer,
    created_at: toISOStringSafe(session.created_at),
    expired_at:
      typeof session.expired_at === "undefined" || session.expired_at === null
        ? undefined
        : toISOStringSafe(session.expired_at),
  };
}
