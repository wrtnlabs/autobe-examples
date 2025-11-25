import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdminSession";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function postRedditCommunityAdminRedditCommunityAdminsRedditCommunityAdminIdSessions(props: {
  admin: AdminPayload;
  redditCommunityAdminId: string & tags.Format<"uuid">;
  body: IRedditCommunityAdminSession.ICreate;
}): Promise<IRedditCommunityAdminSession> {
  const createdAt = toISOStringSafe(new Date());

  const redditCommunityAdminId = props.redditCommunityAdminId;

  // ip is optional nullable string for API, but Prisma requires non-null string
  const ipForDb = props.body.ip ?? "";

  const href = props.body.href;
  const referrer = props.body.referrer;

  // expired_at nullable date-time string
  const expiredAt = props.body.expired_at ?? null;

  const created = await MyGlobal.prisma.reddit_community_admin_sessions.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      reddit_community_admin_id: redditCommunityAdminId,
      ip: ipForDb,
      href: href,
      referrer: referrer,
      created_at: createdAt,
      expired_at: expiredAt,
    },
  });

  return {
    id: created.id as string & tags.Format<"uuid">,
    redditCommunityAdminId: created.reddit_community_admin_id as string &
      tags.Format<"uuid">,
    ip: created.ip === "" ? (void 0 as never) : created.ip,
    href: created.href,
    referrer: created.referrer,
    createdAt: toISOStringSafe(created.created_at),
    expiredAt:
      created.expired_at === null ? null : toISOStringSafe(created.expired_at),
  };
}
