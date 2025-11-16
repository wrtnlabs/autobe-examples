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

export async function postRedditCommunityAdminRedditCommunityRegisteredUsersIdRegisteredUserSessions(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
  body: IRedditCommunityRegisteredUserSession.ICreate;
}): Promise<IRedditCommunityRegisteredUserSession> {
  const created =
    await MyGlobal.prisma.reddit_community_registered_user_sessions.create({
      data: {
        id: v4() satisfies string as string,
        reddit_community_registered_user_id: props.id,
        token: props.body.sessionToken,
        expires_at: props.body.expiresAt,
        ip: props.body.ipAddress ?? undefined,
        user_agent: props.body.userAgent ?? undefined,
        referrer: props.body.referer,
        is_active: true,
        created_at: new Date(),
      },
    });

  return {
    id: created.id satisfies string as string & tags.Format<"uuid">,
    user_id:
      created.reddit_community_registered_user_id satisfies string as string &
        tags.Format<"uuid">,
    token: props.body.sessionToken,
    expires_at: created.expired_at ? toISOStringSafe(created.expired_at) : null,
    created_at: toISOStringSafe(created.created_at),
    last_active: null,
    ip: created.ip ?? undefined,
    user_agent: props.body.userAgent ?? undefined,
    referrer: created.referrer,
    is_active: true,
  };
}
