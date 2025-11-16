import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityRegisteredUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityRegisteredUserSession";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putRedditCommunityAdminRedditCommunityRegisteredUsersIdRegisteredUserSessionsSessionId(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
  sessionId: string & tags.Format<"uuid">;
  body: IRedditCommunityRegisteredUserSession.IUpdate;
}): Promise<IRedditCommunityRegisteredUserSession> {
  const existing =
    await MyGlobal.prisma.reddit_community_registered_user_sessions.findUnique({
      where: { id: props.sessionId },
    });

  if (!existing) {
    throw new HttpException("Session not found", 404);
  }

  const updated =
    await MyGlobal.prisma.reddit_community_registered_user_sessions.update({
      where: { id: props.sessionId },
      data: {
        expired_at:
          props.body.expiresAt === undefined
            ? existing.expired_at
            : (props.body.expiresAt ?? undefined),
        ip:
          props.body.ipAddress === undefined
            ? existing.ip
            : (props.body.ipAddress ?? undefined),
        referrer:
          props.body.referer === undefined
            ? existing.referrer
            : (props.body.referer ?? undefined),
        // updated_at property removed as it does not exist in update input
      },
    });

  return {
    id: updated.id,
    user_id:
      updated.reddit_community_registered_user_id satisfies string as string,
    token: "" as string & tags.Format<"uuid">,
    expires_at:
      updated.expired_at !== null && updated.expired_at !== undefined
        ? toISOStringSafe(updated.expired_at)
        : null,
    created_at: toISOStringSafe(updated.created_at),
    last_active: null,
    ip: updated.ip ?? null,
    user_agent: null,
    referrer: updated.referrer ?? null,
    is_active: true,
  } satisfies IRedditCommunityRegisteredUserSession;
}
