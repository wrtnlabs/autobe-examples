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

export async function putRedditCommunityUserUsersUserIdSessionsSessionId(props: {
  user: UserPayload;
  userId: string & tags.Format<"uuid">;
  sessionId: string & tags.Format<"uuid">;
  body: IRedditCommunityUserSession.IUpdate;
}): Promise<IRedditCommunityUserSession> {
  const { user, userId, sessionId, body } = props;

  const existingSession =
    await MyGlobal.prisma.reddit_community_user_sessions.findUniqueOrThrow({
      where: { id: sessionId },
    });

  if (existingSession.reddit_community_user_id !== user.id) {
    throw new HttpException(
      "Unauthorized: this session does not belong to the user",
      403,
    );
  }

  const updated = await MyGlobal.prisma.reddit_community_user_sessions.update({
    where: { id: sessionId },
    data: {
      ip: body.ip ?? undefined,
      href: body.href ?? undefined,
      referrer: body.referrer ?? undefined,
      expired_at:
        body.expired_at === null ? null : (body.expired_at ?? undefined),
    },
    select: {
      id: true,
      reddit_community_user_id: true,
      ip: true,
      href: true,
      referrer: true,
      created_at: true,
      expired_at: true,
    },
  });

  return {
    id: updated.id,
    reddit_community_user_id: updated.reddit_community_user_id,
    ip: updated.ip,
    href: updated.href,
    referrer: updated.referrer,
    created_at: toISOStringSafe(updated.created_at),
    expired_at:
      updated.expired_at === null
        ? null
        : updated.expired_at === undefined
          ? undefined
          : toISOStringSafe(updated.expired_at),
    updated_at: toISOStringSafe(new Date()),
  };
}
