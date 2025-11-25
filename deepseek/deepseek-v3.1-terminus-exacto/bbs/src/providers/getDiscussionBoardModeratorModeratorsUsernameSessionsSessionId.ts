import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardModeratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModeratorSession";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function getDiscussionBoardModeratorModeratorsUsernameSessionsSessionId(props: {
  moderator: ModeratorPayload;
  username: string;
  sessionId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardModeratorSession> {
  // First verify the target moderator exists and matches the username
  const targetModerator =
    await MyGlobal.prisma.discussion_board_moderators.findFirst({
      where: {
        username: props.username,
        deleted_at: null,
      },
    });

  if (!targetModerator) {
    throw new HttpException("Moderator not found", 404);
  }

  // Verify the requesting moderator has access to this moderator's sessions
  // For security, moderators can only access their own sessions unless they have higher privileges
  if (props.moderator.id !== targetModerator.id) {
    throw new HttpException("Access denied", 403);
  }

  // Retrieve the specific session
  const session =
    await MyGlobal.prisma.discussion_board_moderator_sessions.findFirst({
      where: {
        id: props.sessionId,
        discussion_board_moderator_id: targetModerator.id,
        deleted_at: null,
      },
    });

  if (!session) {
    throw new HttpException("Session not found", 404);
  }

  // Convert and return the session data
  return {
    id: session.id,
    discussion_board_moderator_id: session.discussion_board_moderator_id,
    ip: session.ip,
    href: session.href,
    referrer: session.referrer,
    created_at: toISOStringSafe(session.created_at),
    updated_at: toISOStringSafe(session.updated_at),
    expired_at: session.expired_at
      ? toISOStringSafe(session.expired_at)
      : undefined,
    deleted_at: session.deleted_at
      ? toISOStringSafe(session.deleted_at)
      : undefined,
  };
}
