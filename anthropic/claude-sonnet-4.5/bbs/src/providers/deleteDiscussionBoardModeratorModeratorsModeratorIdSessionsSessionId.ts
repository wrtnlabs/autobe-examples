import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function deleteDiscussionBoardModeratorModeratorsModeratorIdSessionsSessionId(props: {
  moderator: ModeratorPayload;
  moderatorId: string & tags.Format<"uuid">;
  sessionId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify the authenticated moderator matches the moderatorId parameter
  if (props.moderator.id !== props.moderatorId) {
    throw new HttpException("You can only delete your own sessions", 403);
  }

  // Find the session to verify it exists and belongs to the moderator
  const session =
    await MyGlobal.prisma.discussion_board_moderator_sessions.findUnique({
      where: {
        id: props.sessionId,
      },
    });

  // If session doesn't exist, return 404
  if (session === null) {
    throw new HttpException("Session not found", 404);
  }

  // Verify the session belongs to the moderator
  if (session.discussion_board_moderator_id !== props.moderatorId) {
    throw new HttpException("You can only delete your own sessions", 403);
  }

  // Check if session is already expired
  if (session.expired_at !== null) {
    throw new HttpException("Session is already expired", 400);
  }

  // Delete the session from the database
  await MyGlobal.prisma.discussion_board_moderator_sessions.delete({
    where: {
      id: props.sessionId,
    },
  });
}
