import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardRegisteredUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUserSession";
import { RegisteredUserPayload } from "../decorators/payload/RegisteredUserPayload";

export async function postDiscussionBoardRegisteredUserRegisteredUsersUserIdSessions(props: {
  registeredUser: RegisteredUserPayload;
  userId: string & tags.Format<"uuid">;
  body: IDiscussionBoardRegisteredUserSession.ICreate;
}): Promise<IDiscussionBoardRegisteredUserSession> {
  const user =
    await MyGlobal.prisma.discussion_board_registered_users.findUnique({
      where: { id: props.userId },
    });

  if (!user) {
    throw new HttpException("User not found", 404);
  }

  if (props.registeredUser.id !== props.userId) {
    throw new HttpException("Forbidden", 403);
  }

  const sessionId = v4() as string & tags.Format<"uuid">;

  const session =
    await MyGlobal.prisma.discussion_board_registered_user_sessions.create({
      data: {
        id: sessionId,
        registered_user_id: props.userId,
        ip: "127.0.0.1",
        referrer: "https://example.com",
        href: "https://example.com",
        created_at: toISOStringSafe(new Date()),
        expired_at: toISOStringSafe(
          new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        ),
      },
    });

  return {
    id: session.id,
    userId: session.registered_user_id,
    createdAt: toISOStringSafe(session.created_at),
    lastActivity: toISOStringSafe(session.created_at),
    status: "active",
  };
}
