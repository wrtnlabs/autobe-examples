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

export async function postRedditCommunityAdminAdminsAdminIdSessions(props: {
  admin: AdminPayload;
  adminId: string & tags.Format<"uuid">;
  body: IRedditCommunityAdminSession.ICreate;
}): Promise<IRedditCommunityAdminSession> {
  const newId = v4();
  const created = await MyGlobal.prisma.reddit_community_admin_sessions.create({
    data: {
      id: newId,
      reddit_community_admin_id: props.adminId,
      ip: props.body.ip,
      href: props.body.href,
      referrer: props.body.referrer,
      expired_at: props.body.expired_at ?? null,
      created_at: toISOStringSafe(new Date()),
    },
  });

  return {
    id: created.id,
    reddit_community_admin_id: created.reddit_community_admin_id,
    ip: created.ip,
    href: created.href,
    referrer: created.referrer,
    created_at: toISOStringSafe(created.created_at),
    expired_at: created.expired_at ? toISOStringSafe(created.expired_at) : null,
  };
}
