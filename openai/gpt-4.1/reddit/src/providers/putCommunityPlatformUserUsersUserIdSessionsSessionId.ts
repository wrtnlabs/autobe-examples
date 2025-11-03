import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserSession";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function putCommunityPlatformUserUsersUserIdSessionsSessionId(props: {
  user: UserPayload;
  userId: string & tags.Format<"uuid">;
  sessionId: string & tags.Format<"uuid">;
  body: ICommunityPlatformUserSession.IUpdate;
}): Promise<ICommunityPlatformUserSession> {
  // 1. Fetch the session, ensure sessionId matches userId (auth check)
  const session =
    await MyGlobal.prisma.community_platform_user_sessions.findFirst({
      where: {
        id: props.sessionId,
        community_platform_user_id: props.userId,
      },
    });
  if (!session) {
    throw new HttpException("Session not found or not owned by user", 404);
  }
  // 2. If session already expired, reject
  if (session.expired_at !== null) {
    throw new HttpException("Session is already expired", 400);
  }
  // 3. Prepare update for expired_at if provided
  const updateData: { expired_at?: string | null } = {};
  if (props.body.expired_at !== undefined) {
    updateData.expired_at = props.body.expired_at;
  }
  const updated = await MyGlobal.prisma.community_platform_user_sessions.update(
    {
      where: { id: props.sessionId },
      data: updateData,
    },
  );
  // 4. Map all fields, converting dates
  return {
    id: updated.id,
    community_platform_user_id: updated.community_platform_user_id,
    ip: updated.ip,
    href: updated.href,
    referrer: updated.referrer,
    created_at: toISOStringSafe(updated.created_at),
    expired_at:
      updated.expired_at === null ? null : toISOStringSafe(updated.expired_at),
  };
}
