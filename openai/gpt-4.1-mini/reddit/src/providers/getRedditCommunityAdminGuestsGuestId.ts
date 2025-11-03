import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";
import { IRedditCommunityGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuestSession";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getRedditCommunityAdminGuestsGuestId(props: {
  admin: AdminPayload;
  guestId: string & tags.Format<"uuid">;
}): Promise<IRedditCommunityGuest> {
  const guest = await MyGlobal.prisma.reddit_community_guest.findUniqueOrThrow({
    where: { id: props.guestId },
    include: { reddit_community_guest_sessions: true },
  });

  return {
    id: guest.id,
    created_at: toISOStringSafe(guest.created_at),
    reddit_community_guest_sessions: guest.reddit_community_guest_sessions?.map(
      (session) => ({
        id: session.id,
        reddit_community_guest_id: session.reddit_community_guest_id,
        ip: session.ip,
        href: session.href,
        referrer: session.referrer,
        created_at: toISOStringSafe(session.created_at),
        expired_at: session.expired_at
          ? toISOStringSafe(session.expired_at)
          : null,
      }),
    ),
  };
}
