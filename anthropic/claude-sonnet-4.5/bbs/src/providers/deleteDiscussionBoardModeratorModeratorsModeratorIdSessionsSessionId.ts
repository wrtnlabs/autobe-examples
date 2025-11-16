import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardModeratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModeratorSession";
import { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function deleteDiscussionBoardModeratorModeratorsModeratorIdSessionsSessionId(props: {
  moderator: ModeratorPayload;
  moderatorId: string & tags.Format<"uuid">;
  sessionId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardModeratorSession> {
  if (props.moderator.id !== props.moderatorId) {
    throw new HttpException("You can only delete your own sessions", 403);
  }

  const session =
    await MyGlobal.prisma.discussion_board_moderator_sessions.findUnique({
      where: { id: props.sessionId },
      include: {
        moderator: true,
      },
    });

  if (!session) {
    throw new HttpException("Session not found", 404);
  }

  if (session.discussion_board_moderator_id !== props.moderatorId) {
    throw new HttpException(
      "This session does not belong to the specified moderator",
      403,
    );
  }

  await MyGlobal.prisma.discussion_board_moderator_sessions.delete({
    where: { id: props.sessionId },
  });

  return {
    id: session.id,
    discussion_board_moderator_id: session.discussion_board_moderator_id,
    ip: session.ip,
    href: session.href,
    referrer: session.referrer,
    created_at: toISOStringSafe(session.created_at),
    expired_at:
      session.expired_at === null
        ? undefined
        : toISOStringSafe(session.expired_at),
    moderator: {
      id: session.moderator.id,
      email: session.moderator.email,
      username: session.moderator.username,
      created_at: toISOStringSafe(session.moderator.created_at),
      updated_at: toISOStringSafe(session.moderator.updated_at),
    },
  };
}
