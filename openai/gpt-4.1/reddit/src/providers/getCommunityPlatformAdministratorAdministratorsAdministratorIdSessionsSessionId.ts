import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformAdministratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministratorSession";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

export async function getCommunityPlatformAdministratorAdministratorsAdministratorIdSessionsSessionId(props: {
  administrator: AdministratorPayload;
  administratorId: string & tags.Format<"uuid">;
  sessionId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformAdministratorSession> {
  const session =
    await MyGlobal.prisma.community_platform_administrator_sessions.findFirst({
      where: {
        id: props.sessionId,
        community_platform_administrator_id: props.administratorId,
      },
    });

  if (!session) {
    throw new HttpException("Session not found", 404);
  }

  return {
    id: session.id,
    community_platform_administrator_id:
      session.community_platform_administrator_id,
    ip: session.ip,
    href: session.href,
    referrer: session.referrer,
    created_at: toISOStringSafe(session.created_at),
    expired_at:
      session.expired_at === null || typeof session.expired_at === "undefined"
        ? session.expired_at
        : toISOStringSafe(session.expired_at),
  };
}
