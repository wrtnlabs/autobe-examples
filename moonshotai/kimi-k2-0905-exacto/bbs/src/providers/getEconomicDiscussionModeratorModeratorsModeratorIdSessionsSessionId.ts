import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconomicDiscussionModeratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionModeratorSession";
import { IEconomicDiscussionModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionModerator";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function getEconomicDiscussionModeratorModeratorsModeratorIdSessionsSessionId(props: {
  moderator: ModeratorPayload;
  moderatorId: string & tags.Format<"uuid">;
  sessionId: string & tags.Format<"uuid">;
}): Promise<IEconomicDiscussionModeratorSession> {
  // Verify that the requesting moderator owns the session they're trying to access
  if (props.moderator.id !== props.moderatorId) {
    throw new HttpException(
      "Access denied: You can only access your own sessions",
      403,
    );
  }

  // Fetch the session with moderator information
  const session =
    await MyGlobal.prisma.economic_discussion_moderator_sessions.findUnique({
      where: {
        id: props.sessionId,
      },
      include: {
        moderator: true,
      },
    });

  if (!session) {
    throw new HttpException("Session not found", 404);
  }

  // Verify the session belongs to the correct moderator
  if (session.economic_discussion_moderator_id !== props.moderatorId) {
    throw new HttpException("Session does not belong to this moderator", 404);
  }

  return {
    id: session.id,
    ip: session.ip,
    href: session.href,
    referrer: session.referrer,
    created_at: toISOStringSafe(session.created_at),
    expired_at: session.expired_at
      ? toISOStringSafe(session.expired_at)
      : undefined,
    moderator: {
      id: session.moderator.id,
      username: session.moderator.username,
      email_verified: session.moderator.email_verified,
      two_factor_enabled: session.moderator.two_factor_enabled,
      moderation_level: session.moderator.moderation_level,
      created_at: toISOStringSafe(session.moderator.created_at),
    },
  };
}
