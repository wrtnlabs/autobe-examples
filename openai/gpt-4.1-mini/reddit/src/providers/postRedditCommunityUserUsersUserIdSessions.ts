import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserSession";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function postRedditCommunityUserUsersUserIdSessions(props: {
  user: UserPayload;
  userId: string & tags.Format<"uuid">;
  body: IRedditCommunityUserSession.ICreate;
}): Promise<IRedditCommunityUserSession> {
  const { user, userId, body } = props;

  const now = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.reddit_community_user_sessions.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      reddit_community_user_id: userId,
      ip: body.ip,
      href: body.href,
      referrer: body.referrer,
      created_at: now,
    },
  });

  return {
    id: created.id,
    reddit_community_user_id: created.reddit_community_user_id,
    ip: created.ip,
    href: created.href,
    referrer: created.referrer,
    created_at: toISOStringSafe(created.created_at),
    updated_at: now,
    expired_at:
      created.expired_at !== null && created.expired_at !== undefined
        ? toISOStringSafe(created.expired_at)
        : null,
  };
}
