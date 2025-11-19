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

export async function putDiscussionBoardAdminUsersUserIdSessionsSessionId(props: {
  admin: AdminPayload;
  userId: string & tags.Format<"uuid">;
  sessionId: string & tags.Format<"uuid">;
  body: IDiscussionBoardUserSession.IUpdate;
}): Promise<IDiscussionBoardUserSession> {
  const session =
    await MyGlobal.prisma.discussion_board_user_sessions.findUnique({
      where: { id: props.sessionId },
    });
  if (!session || session.user_id !== props.userId) {
    throw new HttpException("Session not found for this user.", 404);
  }
  const updated = await MyGlobal.prisma.discussion_board_user_sessions.update({
    where: { id: props.sessionId },
    data: { expired_at: props.body.expired_at },
  });
  const user = await MyGlobal.prisma.discussion_board_users.findUnique({
    where: { id: session.user_id },
  });
  if (!user) {
    throw new HttpException("User not found.", 404);
  }
  return {
    id: updated.id,
    user: {
      id: user.id,
      email: user.email,
      created_at: toISOStringSafe(user.created_at),
      updated_at: toISOStringSafe(user.updated_at),
      deleted_at: user.deleted_at
        ? toISOStringSafe(user.deleted_at)
        : undefined,
    },
    ip: updated.ip,
    href: updated.href,
    referrer: updated.referrer,
    created_at: toISOStringSafe(updated.created_at),
    expired_at: updated.expired_at
      ? toISOStringSafe(updated.expired_at)
      : undefined,
  };
}
