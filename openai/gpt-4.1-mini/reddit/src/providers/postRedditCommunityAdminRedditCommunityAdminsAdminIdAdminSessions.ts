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

export async function postRedditCommunityAdminRedditCommunityAdminsAdminIdAdminSessions(props: {
  admin: AdminPayload;
  adminId: string & tags.Format<"uuid">;
  body: IRedditCommunityAdminSession.ICreate;
}): Promise<IRedditCommunityAdminSession> {
  const now = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.reddit_community_admin_sessions.create({
    data: {
      id: v4(),
      reddit_community_admin_id: props.adminId,
      ip: props.body.ip ?? null,
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: now,
      expired_at: props.body.expiredAt ?? null,
    },
  });

  return {
    id: created.id,
    adminId: created.reddit_community_admin_id,
    ip: created.ip ?? undefined,
    href: created.href,
    referrer: created.referrer,
    createdAt: toISOStringSafe(created.created_at),
    updatedAt: null,
    expiredAt: created.expired_at ? toISOStringSafe(created.expired_at) : null,
  };
}
