import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityRegisteredUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityRegisteredUserSession";
import { RegisteredUserPayload } from "../decorators/payload/RegisteredUserPayload";

export async function putRedditCommunityRegisteredUserRedditCommunityRegisteredUsersIdRegisteredUserSessionsSessionId(props: {
  registeredUser: RegisteredUserPayload;
  id: string & tags.Format<"uuid">;
  sessionId: string & tags.Format<"uuid">;
  body: IRedditCommunityRegisteredUserSession.IUpdate;
}): Promise<IRedditCommunityRegisteredUserSession> {
  const session =
    await MyGlobal.prisma.reddit_community_registered_user_sessions.findUnique({
      where: {
        id: props.sessionId,
        reddit_community_registered_user_id: props.id,
      },
    });

  if (!session) {
    throw new HttpException("Registered user session not found", 404);
  }

  const updated =
    await MyGlobal.prisma.reddit_community_registered_user_sessions.update({
      where: { id: props.sessionId },
      data: {
        expired_at: props.body.expiresAt ?? undefined,
        ip: props.body.ipAddress ?? undefined,
        referrer: props.body.referer ?? undefined,
      },
    });

  return {
    id: updated.id,
    user_id: updated.reddit_community_registered_user_id,
    token: "",
    expires_at: updated.expired_at ? toISOStringSafe(updated.expired_at) : null,
    created_at: toISOStringSafe(updated.created_at),
    last_active: null,
    ip: updated.ip ?? null,
    user_agent: null,
    referrer: updated.referrer ?? null,
    is_active: false,
  };
}
