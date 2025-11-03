import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuestSession";

export async function getRedditCommunityGuestsGuestIdSessionsSessionId(props: {
  guestId: string & tags.Format<"uuid">;
  sessionId: string & tags.Format<"uuid">;
}): Promise<IRedditCommunityGuestSession> {
  const { guestId, sessionId } = props;
  const session =
    await MyGlobal.prisma.reddit_community_guest_sessions.findFirstOrThrow({
      where: {
        id: sessionId,
        reddit_community_guest_id: guestId,
      },
    });

  return {
    id: session.id,
    reddit_community_guest_id: session.reddit_community_guest_id,
    ip: session.ip,
    href: session.href,
    referrer: session.referrer,
    created_at: toISOStringSafe(session.created_at),
    expired_at: session.expired_at ? toISOStringSafe(session.expired_at) : null,
  };
}
