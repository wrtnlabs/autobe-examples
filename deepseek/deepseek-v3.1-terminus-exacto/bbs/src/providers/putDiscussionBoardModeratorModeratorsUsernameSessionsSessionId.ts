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

export async function putDiscussionBoardModeratorModeratorsUsernameSessionsSessionId(props: {
  moderator: ModeratorPayload;
  username: string;
  sessionId: string & tags.Format<"uuid">;
  body: IDiscussionBoardModeratorSession.IUpdate;
}): Promise<IDiscussionBoardModeratorSession> {
  // First verify the moderator exists and matches the username
  const moderator = await MyGlobal.prisma.discussion_board_moderators.findFirst(
    {
      where: {
        id: props.moderator.id,
        deleted_at: null,
      },
    },
  );

  if (!moderator) {
    throw new HttpException("Moderator not found", 404);
  }

  // Verify username matches (case-insensitive comparison)
  if (moderator.username.toLowerCase() !== props.username.toLowerCase()) {
    throw new HttpException("Moderator username mismatch", 403);
  }

  // Find the session and verify it belongs to this moderator
  const session =
    await MyGlobal.prisma.discussion_board_moderator_sessions.findFirst({
      where: {
        id: props.sessionId,
        discussion_board_moderator_id: props.moderator.id,
        deleted_at: null,
      },
    });

  if (!session) {
    throw new HttpException("Session not found", 404);
  }

  // Prepare update data with proper date handling
  const updateData: Prisma.discussion_board_moderator_sessionsUpdateInput = {
    updated_at: toISOStringSafe(new Date()),
  };

  // Only update expired_at if provided
  if (props.body.expired_at !== undefined) {
    updateData.expired_at = props.body.expired_at
      ? new Date(props.body.expired_at)
      : null;
  }

  // Update the session
  const updatedSession =
    await MyGlobal.prisma.discussion_board_moderator_sessions.update({
      where: { id: props.sessionId },
      data: updateData,
    });

  // Convert to API response format with proper null/undefined handling
  return {
    id: updatedSession.id,
    discussion_board_moderator_id: updatedSession.discussion_board_moderator_id,
    ip: updatedSession.ip,
    href: updatedSession.href,
    referrer: updatedSession.referrer,
    created_at: toISOStringSafe(updatedSession.created_at),
    updated_at: toISOStringSafe(updatedSession.updated_at),
    expired_at: updatedSession.expired_at
      ? toISOStringSafe(updatedSession.expired_at)
      : undefined,
    deleted_at: updatedSession.deleted_at
      ? toISOStringSafe(updatedSession.deleted_at)
      : undefined,
  };
}
