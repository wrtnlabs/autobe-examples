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

export async function getDiscussionBoardModeratorModeratorsModeratorIdSessionsSessionId(props: {
  moderator: ModeratorPayload;
  moderatorId: string & tags.Format<"uuid">;
  sessionId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardModeratorSession> {
  if (props.moderator.id !== props.moderatorId) {
    throw new HttpException(
      "Forbidden: You can only access your own sessions",
      403,
    );
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
      "Forbidden: This session does not belong to you",
      403,
    );
  }

  return {
    id: session.id as string & tags.Format<"uuid">,
    discussion_board_moderator_id:
      session.discussion_board_moderator_id as string & tags.Format<"uuid">,
    ip: session.ip,
    href: session.href,
    referrer: session.referrer,
    created_at: toISOStringSafe(session.created_at),
    expired_at: session.expired_at ? toISOStringSafe(session.expired_at) : null,
    moderator: {
      id: session.moderator.id as string & tags.Format<"uuid">,
      email: session.moderator.email as string & tags.Format<"email">,
      username: session.moderator.username,
      created_at: toISOStringSafe(session.moderator.created_at),
      updated_at: toISOStringSafe(session.moderator.updated_at),
    },
  };
}
