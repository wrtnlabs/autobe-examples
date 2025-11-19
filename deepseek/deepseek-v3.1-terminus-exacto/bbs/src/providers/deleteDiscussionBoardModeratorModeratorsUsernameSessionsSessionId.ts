import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardModeratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModeratorSession";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function deleteDiscussionBoardModeratorModeratorsUsernameSessionsSessionId(props: {
  moderator: ModeratorPayload;
  username: string;
  sessionId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardModeratorSession> {
  // Verify the target moderator exists
  const targetModerator =
    await MyGlobal.prisma.discussion_board_moderators.findFirst({
      where: {
        username: props.username,
        deleted_at: null,
      },
    });

  if (!targetModerator) {
    throw new HttpException(
      `Moderator with username '${props.username}' not found`,
      404,
    );
  }

  // Verify the session exists and belongs to the target moderator
  const session =
    await MyGlobal.prisma.discussion_board_moderator_sessions.findFirst({
      where: {
        id: props.sessionId,
        discussion_board_moderator_id: targetModerator.id,
        deleted_at: null,
      },
    });

  if (!session) {
    throw new HttpException(
      `Session '${props.sessionId}' not found for moderator '${props.username}'`,
      404,
    );
  }

  // Perform hard deletion of the session
  const deletedSession =
    await MyGlobal.prisma.discussion_board_moderator_sessions.delete({
      where: {
        id: props.sessionId,
      },
    });

  // Return the deleted session with proper type conversion
  return {
    id: deletedSession.id,
    discussion_board_moderator_id: deletedSession.discussion_board_moderator_id,
    ip: deletedSession.ip,
    href: deletedSession.href,
    referrer: deletedSession.referrer,
    created_at: toISOStringSafe(deletedSession.created_at),
    updated_at: toISOStringSafe(deletedSession.updated_at),
    expired_at: deletedSession.expired_at
      ? toISOStringSafe(deletedSession.expired_at)
      : undefined,
    deleted_at: deletedSession.deleted_at
      ? toISOStringSafe(deletedSession.deleted_at)
      : undefined,
  };
}
