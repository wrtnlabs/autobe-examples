import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdminSession";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getRedditCommunityAdminRedditCommunityAdminsRedditCommunityAdminIdSessionsId(props: {
  admin: AdminPayload;
  redditCommunityAdminId: string & tags.Format<"uuid">;
  id: string & tags.Format<"uuid">;
}): Promise<IRedditCommunityAdminSession> {
  const session =
    await MyGlobal.prisma.reddit_community_admin_sessions.findFirst({
      where: {
        id: props.id,
        reddit_community_admin_id: props.redditCommunityAdminId,
      },
    });

  if (session === null) {
    throw new HttpException("Admin session not found", 404);
  }

  return {
    id: session.id,
    redditCommunityAdminId: session.reddit_community_admin_id,
    ip: session.ip,
    href: session.href,
    referrer: session.referrer,
    createdAt: toISOStringSafe(session.created_at),
    expiredAt:
      session.expired_at === null ? null : toISOStringSafe(session.expired_at),
  };
}
