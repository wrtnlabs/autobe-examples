import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserSession";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putCommunityPlatformAdminUsersUserIdSessionsSessionId(props: {
  admin: AdminPayload;
  userId: string & tags.Format<"uuid">;
  sessionId: string & tags.Format<"uuid">;
  body: ICommunityPlatformUserSession.IUpdate;
}): Promise<ICommunityPlatformUserSession> {
  const session =
    await MyGlobal.prisma.community_platform_user_sessions.findFirst({
      where: {
        id: props.sessionId,
        community_platform_user_id: props.userId,
      },
    });
  if (!session) {
    throw new HttpException("Session not found", 404);
  }

  // Only update expired_at if provided
  const updateData =
    props.body.expired_at !== undefined
      ? { expired_at: props.body.expired_at }
      : {};

  const updated = await MyGlobal.prisma.community_platform_user_sessions.update(
    {
      where: { id: props.sessionId },
      data: updateData,
    },
  );

  return {
    id: updated.id,
    community_platform_user_id: updated.community_platform_user_id,
    ip: updated.ip,
    href: updated.href,
    referrer: updated.referrer,
    created_at: toISOStringSafe(updated.created_at),
    expired_at:
      updated.expired_at !== undefined && updated.expired_at !== null
        ? toISOStringSafe(updated.expired_at)
        : updated.expired_at,
  };
}
