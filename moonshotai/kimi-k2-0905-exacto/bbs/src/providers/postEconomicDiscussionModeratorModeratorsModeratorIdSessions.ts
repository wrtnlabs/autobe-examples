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

export async function postEconomicDiscussionModeratorModeratorsModeratorIdSessions(props: {
  moderator: ModeratorPayload;
  moderatorId: string & tags.Format<"uuid">;
  body: IEconomicDiscussionModeratorSession.ICreate;
}): Promise<IEconomicDiscussionModeratorSession> {
  // Verify moderator exists
  const moderator =
    await MyGlobal.prisma.economic_discussion_moderators.findUnique({
      where: { id: props.moderatorId },
    });

  if (!moderator) {
    throw new HttpException("Moderator not found", 404);
  }

  // Create session with 24 hour expiration for administrative access
  const session =
    await MyGlobal.prisma.economic_discussion_moderator_sessions.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        moderator: {
          connect: { id: props.moderatorId },
        },
        ip: props.body.ip,
        href: props.body.href,
        referrer: props.body.referrer ?? null,
        created_at: new Date(),
        expired_at: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
      },
    });

  return {
    id: session.id,
    moderator: {
      id: moderator.id,
      username: moderator.username,
      email_verified: moderator.email_verified,
      two_factor_enabled: moderator.two_factor_enabled,
      moderation_level: moderator.moderation_level,
      created_at: toISOStringSafe(moderator.created_at),
    },
    created_at: toISOStringSafe(session.created_at),
    expired_at: toISOStringSafe(session.expired_at ?? new Date()), // Handle potential null
    href: session.href,
    ip: session.ip,
    referrer: session.referrer,
  };
}
