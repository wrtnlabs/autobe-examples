import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformModeratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModeratorSession";
import { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

export async function getCommunityPlatformAdministratorModeratorsModeratorIdSessionsSessionId(props: {
  administrator: AdministratorPayload;
  moderatorId: string & tags.Format<"uuid">;
  sessionId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformModeratorSession> {
  const session =
    await MyGlobal.prisma.community_platform_moderator_sessions.findFirst({
      where: {
        id: props.sessionId,
        community_platform_moderator_id: props.moderatorId,
      },
    });
  if (!session) {
    throw new HttpException("Moderator session not found", 404);
  }
  const moderator =
    await MyGlobal.prisma.community_platform_moderators.findFirst({
      where: {
        id: props.moderatorId,
        deleted_at: null,
        status: "active",
      },
    });
  if (!moderator) {
    throw new HttpException("Moderator not found or is inactive/deleted", 404);
  }
  return {
    id: session.id,
    community_platform_moderator_id: session.community_platform_moderator_id,
    ip: session.ip,
    href: session.href,
    referrer: session.referrer,
    created_at: toISOStringSafe(session.created_at),
    expired_at: session.expired_at
      ? toISOStringSafe(session.expired_at)
      : undefined,
    moderator: {
      id: moderator.id,
    },
  };
}
