import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuestSession";

export async function putRedditCommunityRedditCommunityGuestsRedditCommunityGuestIdSessionsId(props: {
  redditCommunityGuestId: string & tags.Format<"uuid">;
  id: string & tags.Format<"uuid">;
  body: IRedditCommunityGuestSession.IUpdate;
}): Promise<IRedditCommunityGuestSession> {
  const existing =
    await MyGlobal.prisma.reddit_community_guest_sessions.findFirst({
      where: {
        id: props.id,
        reddit_community_guest_id: props.redditCommunityGuestId,
      },
    });

  if (!existing) {
    throw new HttpException("Guest session not found", 404);
  }

  const updated = await MyGlobal.prisma.reddit_community_guest_sessions.update({
    where: {
      id: props.id,
    },
    data: {
      ip:
        props.body.ip === undefined
          ? existing.ip === null
            ? undefined
            : existing.ip
          : props.body.ip === null
            ? undefined
            : props.body.ip,
      href: props.body.href,
      referrer: props.body.referrer,
      expired_at:
        props.body.expires_at === undefined
          ? existing.expired_at === null
            ? undefined
            : toISOStringSafe(existing.expired_at)
          : props.body.expires_at === null
            ? undefined
            : toISOStringSafe(props.body.expires_at),
      created_at:
        props.body.created_at === undefined
          ? existing.created_at === null
            ? undefined
            : toISOStringSafe(existing.created_at)
          : props.body.created_at === null
            ? undefined
            : toISOStringSafe(props.body.created_at),
    },
  });

  return {
    id: updated.id,
    redditCommunityGuestId: updated.reddit_community_guest_id,
    ip: updated.ip === null ? null : (updated.ip ?? undefined),
    url: updated.href === null ? null : (updated.href ?? undefined),
    referrer:
      updated.referrer === null ? null : (updated.referrer ?? undefined),
    createdAt: toISOStringSafe(updated.created_at),
    expiresAt:
      updated.expired_at === null ? null : toISOStringSafe(updated.expired_at),
    lastAccessedAt: null,
  };
}
