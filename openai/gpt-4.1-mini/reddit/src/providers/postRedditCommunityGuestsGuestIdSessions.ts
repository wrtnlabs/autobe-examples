import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuestSession";

export async function postRedditCommunityGuestsGuestIdSessions(props: {
  guestId: string & tags.Format<"uuid">;
  body: IRedditCommunityGuestSession.ICreate;
}): Promise<IRedditCommunityGuestSession> {
  const created = await MyGlobal.prisma.reddit_community_guest_sessions.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      reddit_community_guest_id: props.guestId,
      ip: props.body.ip,
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: toISOStringSafe(props.body.created_at),
      expired_at: props.body.expired_at
        ? toISOStringSafe(props.body.expired_at)
        : null,
    },
  });

  return {
    id: created.id,
    reddit_community_guest_id: created.reddit_community_guest_id,
    ip: created.ip,
    href: created.href,
    referrer: created.referrer,
    created_at: toISOStringSafe(created.created_at),
    expired_at: created.expired_at ? toISOStringSafe(created.expired_at) : null,
  };
}
