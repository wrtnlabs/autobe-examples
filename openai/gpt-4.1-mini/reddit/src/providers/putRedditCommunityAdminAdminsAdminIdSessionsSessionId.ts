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

export async function putRedditCommunityAdminAdminsAdminIdSessionsSessionId(props: {
  admin: AdminPayload;
  adminId: string & tags.Format<"uuid">;
  sessionId: string & tags.Format<"uuid">;
  body: IRedditCommunityAdminSession.IUpdate;
}): Promise<IRedditCommunityAdminSession> {
  const { adminId, sessionId, body } = props;

  const updated = await MyGlobal.prisma.reddit_community_admin_sessions.update({
    where: {
      id: sessionId,
      reddit_community_admin_id: adminId,
    },
    data: {
      ip: body.ip ?? undefined,
      href: body.href ?? undefined,
      referrer: body.referrer ?? undefined,
      expired_at: body.expired_at ?? undefined,
    },
  });

  return {
    id: updated.id,
    reddit_community_admin_id: updated.reddit_community_admin_id,
    ip: updated.ip,
    href: updated.href,
    referrer: updated.referrer,
    created_at: toISOStringSafe(updated.created_at),
    expired_at: updated.expired_at ? toISOStringSafe(updated.expired_at) : null,
  };
}
