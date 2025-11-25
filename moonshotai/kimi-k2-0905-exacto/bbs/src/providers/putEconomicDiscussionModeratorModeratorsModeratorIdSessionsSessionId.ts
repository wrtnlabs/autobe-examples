import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconomicDiscussionModeratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionModeratorSession";
import { IEconomicDiscussionModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionModerator";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function putEconomicDiscussionModeratorModeratorsModeratorIdSessionsSessionId(props: {
  moderator: ModeratorPayload;
  moderatorId: string & tags.Format<"uuid">;
  sessionId: string & tags.Format<"uuid">;
  body: IEconomicDiscussionModeratorSession.IUpdate;
}): Promise<IEconomicDiscussionModeratorSession> {
  // Verify session exists and belongs to the moderator
  const existingSession =
    await MyGlobal.prisma.economic_discussion_moderator_sessions.findUnique({
      where: { id: props.sessionId },
    });

  if (!existingSession) {
    throw new HttpException("Session not found", 404);
  }

  // Verify the moderatorId in path matches the session's moderator
  if (props.moderatorId !== existingSession.economic_discussion_moderator_id) {
    throw new HttpException(
      "Forbidden - cannot update another moderator's session",
      403,
    );
  }

  // Verify the requesting moderator owns this session
  if (props.moderator.id !== existingSession.economic_discussion_moderator_id) {
    throw new HttpException(
      "Forbidden - session does not belong to requesting moderator",
      403,
    );
  }

  // Build update data with only provided fields
  const updateData: Record<string, unknown> = {};

  if (props.body.ip !== undefined) {
    updateData.ip = props.body.ip;
  }
  if (props.body.href !== undefined) {
    updateData.href = props.body.href;
  }
  if (props.body.referrer !== undefined) {
    updateData.referrer = props.body.referrer;
  }

  // Update the session with provided fields
  const updated =
    await MyGlobal.prisma.economic_discussion_moderator_sessions.update({
      where: { id: props.sessionId },
      data: updateData,
    });

  // Get moderator information
  const moderator =
    await MyGlobal.prisma.economic_discussion_moderators.findUnique({
      where: { id: updated.economic_discussion_moderator_id },
    });

  if (!moderator) {
    throw new HttpException("Moderator not found", 404);
  }

  // Return complete session data
  return {
    id: updated.id,
    ip: updated.ip,
    href: updated.href,
    referrer: updated.referrer ?? undefined,
    created_at: toISOStringSafe(updated.created_at),
    expired_at: updated.expired_at
      ? toISOStringSafe(updated.expired_at)
      : undefined,
    moderator: {
      id: moderator.id,
      username: moderator.username,
      email_verified: moderator.email_verified,
      two_factor_enabled: moderator.two_factor_enabled,
      moderation_level: moderator.moderation_level,
      created_at: toISOStringSafe(moderator.created_at),
    },
  };
}
