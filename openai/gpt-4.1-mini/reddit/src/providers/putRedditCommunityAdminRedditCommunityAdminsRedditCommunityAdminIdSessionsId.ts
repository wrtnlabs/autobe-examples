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

export async function putRedditCommunityAdminRedditCommunityAdminsRedditCommunityAdminIdSessionsId(props: {
  admin: AdminPayload;
  redditCommunityAdminId: string & tags.Format<"uuid">;
  id: string & tags.Format<"uuid">;
  body: IRedditCommunityAdminSession.IUpdate;
}): Promise<IRedditCommunityAdminSession> {
  const existing =
    await MyGlobal.prisma.reddit_community_admin_sessions.findUnique({
      where: {
        reddit_community_admin_id: props.redditCommunityAdminId,
        id: props.id,
      },
    });

  if (!existing) {
    throw new HttpException("Admin session not found", 404);
  }

  const updated = await MyGlobal.prisma.reddit_community_admin_sessions.update({
    where: {
      reddit_community_admin_id: props.redditCommunityAdminId,
      id: props.id,
    },
    data: {
      ip:
        props.body.ip === undefined
          ? (existing.ip ?? undefined)
          : (props.body.ip ?? undefined),
      href: props.body.href,
      referrer: props.body.referrer,
      expired_at: props.body.expired_at,
    },
  });

  return {
    id: updated.id,
    redditCommunityAdminId: updated.reddit_community_admin_id satisfies string &
      tags.Format<"uuid"> as string & tags.Format<"uuid">,
    ip:
      updated.ip !== null && updated.ip !== undefined
        ? (updated.ip satisfies string as string)
        : "",
    href: updated.href,
    referrer: updated.referrer,
    createdAt: toISOStringSafe(updated.created_at) satisfies string &
      tags.Format<"date-time"> as string & tags.Format<"date-time">,
    expiredAt:
      updated.expired_at === null
        ? null
        : (toISOStringSafe(updated.expired_at) satisfies string &
            tags.Format<"date-time">),
  };
}
