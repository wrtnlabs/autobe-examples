import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuestSession";

export async function postRedditCommunityRedditCommunityGuestsRedditCommunityGuestIdSessions(props: {
  redditCommunityGuestId: string & tags.Format<"uuid">;
  body: IRedditCommunityGuestSession.ICreate;
}): Promise<IRedditCommunityGuestSession> {
  const guest = await MyGlobal.prisma.reddit_community_guests.findUnique({
    where: { id: props.redditCommunityGuestId },
    select: { id: true },
  });

  if (!guest) throw new HttpException("Guest user not found", 404);

  const session = await MyGlobal.prisma.reddit_community_guest_sessions.create({
    data: {
      id: v4(),
      reddit_community_guest_id: props.redditCommunityGuestId,
      ip: props.body.ip ?? "",
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: props.body.created_at
        ? toISOStringSafe(props.body.created_at)
        : toISOStringSafe(new Date()),
      expired_at: props.body.expires_at
        ? toISOStringSafe(props.body.expires_at)
        : null,
    },
  });

  return {
    id: session.id,
    redditCommunityGuestId: session.reddit_community_guest_id,
    ip: session.ip ?? undefined,
    url: session.href ?? null,
    referrer: session.referrer ?? null,
    createdAt: toISOStringSafe(session.created_at),
    expiresAt: session.expired_at ? toISOStringSafe(session.expired_at) : null,
    lastAccessedAt: null,
  };
}
