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

export async function putRedditCommunityAdminRedditCommunityAdminsIdAdminSessionsSessionId(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
  sessionId: string & tags.Format<"uuid">;
  body: IRedditCommunityAdminSession.IUpdate;
}): Promise<IRedditCommunityAdminSession> {
  const existingSession =
    await MyGlobal.prisma.reddit_community_admin_sessions.findFirst({
      where: {
        id: props.sessionId,
        reddit_community_admin_id: props.id,
      },
    });

  if (!existingSession) {
    throw new HttpException("Admin session not found", 404);
  }

  const updated = await MyGlobal.prisma.reddit_community_admin_sessions.update({
    where: { id: props.sessionId },
    data: {
      ip: props.body.ip ?? undefined,
      href: props.body.href ?? existingSession.href,
      referrer: props.body.referrer ?? existingSession.referrer,
      expired_at: props.body.expiredAt ?? existingSession.expired_at,
    },
  });

  return {
    id: updated.id satisfies string as string,
    adminId: props.id satisfies string as string,
    ip: updated.ip ?? undefined,
    href: updated.href,
    referrer: updated.referrer,
    createdAt: toISOStringSafe(updated.created_at),
    updatedAt: null,
    expiredAt: updated.expired_at ? toISOStringSafe(updated.expired_at) : null,
  } satisfies IRedditCommunityAdminSession;
}
