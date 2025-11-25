import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function deleteEconomicDiscussionModeratorModeratorsModeratorIdSessionsSessionId(props: {
  moderator: ModeratorPayload;
  moderatorId: string & tags.Format<"uuid">;
  sessionId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify that the requesting moderator is the same as the target moderator
  if (props.moderator.id !== props.moderatorId) {
    throw new HttpException("You can only terminate your own sessions", 403);
  }

  // Find the session to verify it exists and belongs to this moderator
  const session =
    await MyGlobal.prisma.economic_discussion_moderator_sessions.findUnique({
      where: { id: props.sessionId },
    });

  if (!session) {
    throw new HttpException("Session not found", 404);
  }

  // Verify the session belongs to the target moderator
  if (session.economic_discussion_moderator_id !== props.moderatorId) {
    throw new HttpException("Session does not belong to this moderator", 403);
  }

  // Mark the session as expired (soft delete for audit compliance)
  await MyGlobal.prisma.economic_discussion_moderator_sessions.update({
    where: { id: props.sessionId },
    data: {
      expired_at: toISOStringSafe(new Date()),
    },
  });
}
