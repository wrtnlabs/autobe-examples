import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuestSession";

export async function getRedditCommunityRedditCommunityGuestsRedditCommunityGuestIdSessionsId(props: {
  redditCommunityGuestId: string & tags.Format<"uuid">;
  id: string & tags.Format<"uuid">;
}): Promise<IRedditCommunityGuestSession> {
  const session =
    await MyGlobal.prisma.reddit_community_guest_sessions.findFirst({
      where: {
        id: props.id,
        reddit_community_guest_id: props.redditCommunityGuestId,
      },
    });

  if (!session) {
    throw new HttpException("Guest session not found", 404);
  }

  return {
    id: session.id,
    redditCommunityGuestId: session.reddit_community_guest_id,
    ip: session.ip ?? null,
    url: session.href ?? null,
    referrer: session.referrer ?? null,
    createdAt: toISOStringSafe(session.created_at),
    expiresAt: session.expired_at ? toISOStringSafe(session.expired_at) : null,
  };
}
